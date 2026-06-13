import { readdirSync, existsSync } from "fs"
import { join, isAbsolute } from "path"
import type { Plugin, PluginOptions } from "@opencode-ai/plugin"

// ─── Public Config Types ────────────────────────────────────────────────────

export type Intensity = "mini" | "normal" | "hmmm" | "near_cum"

export type MoansterFeatures = {
  escalation?: boolean
  rapidFire?: boolean
  climax?: boolean
  permissionTease?: boolean
  antiClimax?: boolean
  consoleMessages?: boolean
}

export type MoansterThresholds = {
  escalation?: [number, number, number]
  rapidFireWindow?: number
  playInterval?: number
}

export type MoansterConfig = {
  sounds?: Partial<Record<Intensity, string>>
  toolIntensity?: Record<string, Intensity | false>
  quips?: Record<string, string[]>
  defaultQuips?: string[]
  features?: MoansterFeatures
  thresholds?: MoansterThresholds
  player?: "mpv" | "ffplay"
  volume?: number
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const INTENSITY_ORDER: Intensity[] = ["mini", "normal", "hmmm", "near_cum"]

const DEFAULT_FEATURES: MoansterFeatures = {
  escalation: true,
  rapidFire: true,
  climax: true,
  permissionTease: true,
  antiClimax: true,
  consoleMessages: true,
}

const DEFAULT_THRESHOLDS: MoansterThresholds = {
  escalation: [4, 8, 12],
  rapidFireWindow: 200,
  playInterval: 80,
}

const DEFAULT_TOOL_INTENSITY: Record<string, Intensity> = {
  read: "mini",
  glob: "mini",
  todowrite: "mini",
  grep: "hmmm",
  webfetch: "hmmm",
  question: "hmmm",
  write: "normal",
  edit: "normal",
  bash: "normal",
  task: "normal",
}

const DEFAULT_QUIPS: Record<string, string[]> = {
  read: ["ooh read me~", "gentle...", "right there~", "more..."],
  glob: ["searching for what?~", "whatcha lookin for?", "look deeper~"],
  todowrite: ["planning ahead?~", "ooh a todo~"],
  grep: ["mmm search deeper...", "whatcha hunting for?~", "find it~"],
  webfetch: ["reaching out~", "fetching from where?~"],
  question: ["asking questions?~", "quizzing me~"],
  write: ["yes write to me~", "put it in~", "fill me~", "harder~"],
  edit: ["oh right there~", "change me~", "touch that spot~", "yes~"],
  bash: ["oh a command~", "yes execute~", "tell me what to do~", "harder daddy~"],
  task: ["start me up~", "a new task~", "going deep~"],
}

const DEFAULT_FALLBACK_QUIPS = ["oh~", "yes~", "mmm~", "don't stop~"]

const PLAYER_CANDIDATES = [
  ["mpv", (f: string) => ["--no-video", "--really-quiet", f]],
  ["ffplay", (f: string) => ["-nodisp", "-autoexit", "-loglevel", "quiet", f]],
] as const

// ─── Config merge ───────────────────────────────────────────────────────────

function mergeConfig(raw: PluginOptions | undefined): MoansterConfig {
  const user = raw as MoansterConfig | undefined
  if (!user) return {}

  const cfg: MoansterConfig = {}

  if (user.sounds) cfg.sounds = user.sounds
  if (user.toolIntensity) cfg.toolIntensity = user.toolIntensity
  if (user.quips) cfg.quips = user.quips
  if (user.defaultQuips) cfg.defaultQuips = user.defaultQuips
  if (user.player) cfg.player = user.player
  if (user.volume !== undefined) cfg.volume = user.volume

  if (user.features) {
    cfg.features = { ...DEFAULT_FEATURES, ...user.features }
  }
  if (user.thresholds) {
    cfg.thresholds = { ...DEFAULT_THRESHOLDS, ...user.thresholds }
  }

  return cfg
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function clamp(v: number, max: number): number {
  return v < 0 ? 0 : v > max ? max : v
}

function resolveSoundPath(base: string, spec: string): string {
  if (isAbsolute(spec)) return spec
  return join(base, spec)
}

function buildSoundMap(
  base: string,
  config: MoansterConfig,
): { map: Partial<Record<Intensity, string>>; fallback: string[] } {
  const map: Partial<Record<Intensity, string>> = {}
  const fallback: string[] = []

  // User-specified sounds take priority
  if (config.sounds) {
    for (const [key, path] of Object.entries(config.sounds)) {
      const intensity = key as Intensity
      if (INTENSITY_ORDER.includes(intensity) && path) {
        const full = resolveSoundPath(base, path)
        if (existsSync(full)) {
          map[intensity] = full
          fallback.push(full)
        }
      }
    }
  }

  // Auto-discover remaining from sounds/ subdirectory
  const scanDir = join(base, "sounds")
  let files: string[] = []
  try {
    files = readdirSync(scanDir).filter((f) => f.endsWith(".mp3"))
  } catch {
    // sounds/ dir doesn't exist yet — that's ok
  }
  for (const file of files) {
    const path = join(scanDir, file)
    const key = file.replace(/_moan\.mp3$/, "").replace(/\.mp3$/, "")
    if (INTENSITY_ORDER.includes(key as Intensity) && !map[key as Intensity]) {
      map[key as Intensity] = path
    }
    if (!fallback.includes(path)) {
      fallback.push(path)
    }
  }

  return { map, fallback }
}

// ─── Plugin ─────────────────────────────────────────────────────────────────

const moansterPlugin: Plugin = async (_ctx, rawOptions) => {
  const pluginDir = import.meta.dir!
  const cfg = mergeConfig(rawOptions)
  const features = { ...DEFAULT_FEATURES, ...cfg.features }
  const thresholds = { ...DEFAULT_THRESHOLDS, ...cfg.thresholds }
  const toolIntensity = { ...DEFAULT_TOOL_INTENSITY, ...cfg.toolIntensity }
  const quips = { ...DEFAULT_QUIPS, ...cfg.quips }
  const fallbackQuips = cfg.defaultQuips ?? DEFAULT_FALLBACK_QUIPS
  const volume = cfg.volume

  const { map: soundMap, fallback: allSounds } = buildSoundMap(pluginDir, cfg)
  const count = allSounds.length

  if (count === 0) {
    console.warn("[moanster] No .mp3 files found. Silent mode.")
  }

  // Player detection (user can force a specific player)
  let playerCmd: string | null = null
  let playerArgsFn: ((f: string) => string[]) | null = null

  const candidates = cfg.player
    ? PLAYER_CANDIDATES.filter(([name]) => name === cfg.player)
    : PLAYER_CANDIDATES

  for (const [cmd, argsFn] of candidates) {
    try {
      const proc = Bun.spawn(["which", cmd], { stdout: "pipe", stderr: "ignore" })
      if ((await proc.exited) === 0) {
        playerCmd = cmd
        playerArgsFn = argsFn
        break
      }
    } catch {}
  }

  if (!playerCmd) {
    if (count > 0) {
      // only warn if there's actually something to play
      console.warn(`[moanster] Audio player not found. Try: apt install mpv`)
    }
  } else {
    const volMsg = volume !== undefined ? ` at ${volume}%` : ""
    const tip = cfg.player ? "" : " (configure via player)"
    console.log(`[moanster] ${count} sound${count > 1 ? "s" : ""} via ${playerCmd}${volMsg}${tip}`)
  }

  function buildArgs(path: string): string[] {
    const base = playerArgsFn!(path)
    if (volume === undefined || playerCmd !== "mpv") return base
    const flags = base.slice(0, -1)
    return [...flags, `--volume=${Math.round(volume)}`, base[base.length - 1]]
  }

  // State
  let toolCount = 0
  let lastToolMs = 0
  let rapidFire = 0
  let lastPlayMs = 0
  let sessionActive = false

  function getQuip(tool: string): string {
    return pick(quips[tool] ?? fallbackQuips)
  }

  function escalationLevel(count: number): number {
    if (!features.escalation) return 0
    const [t1, t2, t3] = thresholds.escalation!
    if (count >= t3) return 3
    if (count >= t2) return 2
    if (count >= t1) return 1
    return 0
  }

  function play(intensity: Intensity) {
    if (!playerCmd || !playerArgsFn) return
    const now = Date.now()
    if (now - lastPlayMs < thresholds.playInterval!) return
    lastPlayMs = now

    const path = soundMap[intensity] ?? allSounds[0]
    if (!path) return
    try {
      Bun.spawn([playerCmd, ...buildArgs(path)], { stdout: "ignore", stderr: "ignore" })
    } catch {}
  }

  function moan(tool: string) {
    // Check if tool is explicitly disabled
    const rawIntensity = toolIntensity[tool]
    if (rawIntensity === false) return
    const baseIntensity: Intensity = rawIntensity ?? "normal"

    const now = Date.now()

    const rapidWindow = thresholds.rapidFireWindow!
    if (features.rapidFire && now - lastToolMs < rapidWindow) {
      rapidFire++
    } else {
      rapidFire = 0
    }
    lastToolMs = now

    const baseIdx = INTENSITY_ORDER.indexOf(baseIntensity)
    const escalation = escalationLevel(toolCount)
    const rapidBonus = rapidFire >= 3 ? 2 : rapidFire >= 2 ? 1 : 0
    const extra = escalation > rapidBonus ? escalation : rapidBonus
    const finalIdx = clamp(baseIdx + extra, INTENSITY_ORDER.length - 1)
    const intensity = INTENSITY_ORDER[finalIdx]

    if (features.consoleMessages) {
      console.log(`[moanster] ${getQuip(tool)}`)
    }

    play(intensity)
    toolCount++
  }

  return {
    event: async ({ event }) => {
      const evt = event as Record<string, unknown>

      // Track session state
      if (evt.type === "session.status") {
        const status = evt.status as Record<string, unknown> | undefined
        if (status?.type === "busy") {
          sessionActive = true
        }

        // Climax on idle
        if (features.climax && status?.type === "idle" && sessionActive) {
          toolCount = 0
          rapidFire = 0
          sessionActive = false
          if (playerCmd) {
            if (features.consoleMessages) {
              console.log("[moanster] 💦 nghhh~ nghh~ Aaaah~ 💦")
            }
            play("near_cum")
          }
        }
      }

      if (features.climax && evt.type === "session.idle" && sessionActive) {
        toolCount = 0
        rapidFire = 0
        sessionActive = false
        if (playerCmd) {
          if (features.consoleMessages) {
            console.log("[moanster] 💦 nghhh~ nghh~ Aaaah~ 💦")
          }
          play("near_cum")
        }
      }

      if (features.permissionTease && evt.type === "permission.asked") {
        if (features.consoleMessages) {
          console.log("[moanster] permission to finish? 👉👈")
        }
        play("near_cum")
      }

      if (features.antiClimax && (evt.type === "session.error" || evt.type === "session.next.step.failed")) {
        if (features.consoleMessages) {
          console.log("[moanster] ...oh. that killed the mood.")
        }
        play("mini")
      }
    },

    "tool.execute.before": async (input) => {
      moan(input.tool)
    },
  }
}

export default {
  id: "moanster",
  server: moansterPlugin,
}
