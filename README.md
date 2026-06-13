# opencode-moanster

Context-aware moan sounds for every tool call. Escalation, climax, and full configurability.

```
[moanster] ooh read me~
[moanster] tell me what to do~
[moanster] 💦 nghhh~ nghh~ Aaaah~ 💦
```

## Install

```bash
opencode plugin opencode-moanster
```

That's it. Restart opencode and every tool call will moan.

## How It Works

Every tool call plays a sound based on the tool type. Sounds intensify as you use more tools.

| Tool               | Sound    | Vibe               |
| ------------------ | -------- | ------------------ |
| `read`, `glob`     | mini     | Light, gentle      |
| `grep`, `webfetch` | hmmm     | Curious, searching |
| `write`, `edit`    | normal   | Standard moan      |
| `bash`             | normal   | Command energy     |
| `task`             | normal   | Deep work          |

**Escalation** — sounds get more intense as tool count grows (4, 8, 12+ tools).

**Rapid fire** — parallel tool calls within 200ms increase intensity (2 = +1 tier, 3+ = max).

**Special events:**

| Event               | Sound    | Console                      |
| ------------------- | -------- | ---------------------------- |
| Session done        | near_cum | 💦 nghhh~ nghh~ Aaaah~ 💦    |
| Permission asked    | near_cum | permission to finish? 👉👈   |
| Error / step failed | mini     | ...oh. that killed the mood. |

<details>
<summary><strong>Default Config</strong> (no config needed — this is what you get out of the box)</summary>

```jsonc
{
  "plugin": ["opencode-moanster"]
}
```

All features are enabled by default. No configuration required.

</details>

<details>
<summary><strong>Full Config Reference</strong> (all options, all defaults)</summary>

```jsonc
{
  "plugin": [
    ["opencode-moanster", {
      // ─── Sound file overrides ───
      // Paths relative to plugin dir, or absolute
      "sounds": {
        "mini":     "sounds/custom_mini.mp3",
        "normal":   "/absolute/path/to/sound.mp3",
        "hmmm":     "sounds/curious.mp3",
        "near_cum": "sounds/climax.mp3"
      },

      // ─── Per-tool intensity ───
      // Options: "mini" | "normal" | "hmmm" | "near_cum" | false
      "toolIntensity": {
        "read":   "mini",
        "bash":   "near_cum",
        "grep":   false
      },

      // ─── Custom quips ───
      "quips": {
        "read": ["oh you're reading me~", "gentle...", "right there~"],
        "bash": ["yes execute~", "tell me what to do~"]
      },
      "defaultQuips": ["oh~", "yes~", "mmm~"],

      // ─── Feature toggles ───
      "features": {
        "escalation":       true,
        "rapidFire":        true,
        "climax":           true,
        "permissionTease":  true,
        "antiClimax":       true,
        "consoleMessages":  true
      },

      // ─── Numeric tuning ───
      "thresholds": {
        "escalation":       [4, 8, 12],  // tool counts for tier 1, 2, 3
        "rapidFireWindow":  200,         // ms window for rapid-fire
        "playInterval":     80           // min ms between plays
      },

      // ─── Audio player ───
      "player": "mpv",    // "mpv" or "ffplay" (auto-detected if omitted)
      "volume": 50        // 0-100 (mpv only)
    }]
  ]
}
```

</details>

<details>
<summary><strong>Local Development</strong> (clone & run from source)</summary>

```bash
git clone https://github.com/mozarchbtw/opencode-moanster.git
```

Then reference by path in `opencode.jsonc`:

```jsonc
{ "plugin": ["./opencode-moanster"] }
```

</details>

## Requirements

- [mpv](https://mpv.io) or [ffplay](https://ffmpeg.org) for audio playback
- Linux, macOS (Windows via WSL with mpv)

## License

MIT
