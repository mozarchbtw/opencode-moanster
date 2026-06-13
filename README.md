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

Or add it to `opencode.jsonc`:

```jsonc
{ "plugin": ["opencode-moanster"] }
```

## Quick Start (local dev)

Clone the repo and reference it by path:

```jsonc
{ "plugin": ["./path/to/opencode-moanster"] }
```

## How It Works

Every tool call fires the `tool.execute.before` hook — the plugin plays a random MP3 based on the tool type and how many tools have been called so far.

| Tool               | Base Sound | Vibe              |
| ------------------ | ---------- | ----------------- |
| `read`, `glob`     | mini       | Light, gentle     |
| `grep`, `webfetch` | hmmm       | Curious, searching|
| `write`, `edit`    | normal     | Standard moan     |
| `bash`             | normal     | Command energy    |
| `task`             | normal     | Deep work         |

### Escalation

As tool count increases, sounds intensify. Default tiers:

| Tools Called | Intensity Boost |
| ------------ | --------------- |
| 0-3          | None            |
| 4-7          | +1 tier         |
| 8-11         | +2 tiers        |
| 12+          | Maximum         |

### Special Events

| Event                  | Sound    | Console                         |
| ---------------------- | -------- | ------------------------------- |
| Session idle (done)    | near_cum | 💦 nghhh~ nghh~ Aaaah~ 💦       |
| Permission asked       | near_cum | permission to finish? 👉👈      |
| Error / step failed    | mini     | ...oh. that killed the mood.    |

### Rapid Fire

Parallel tool calls within 200ms increase intensity rapidly — 2 calls = +1 tier, 3+ calls = max.

## Configuration

Everything is optional. All features are enabled by default.

```jsonc
{
  "plugin": [
    ["opencode-moanster", {
      // ─── Sound file overrides ───
      "sounds": {
        "mini":     "sounds/custom_mini.mp3",
        "normal":   "/absolute/path/to/sound.mp3",
        "hmmm":     "sounds/curious.mp3",
        "near_cum": "sounds/climax.mp3"
      },

      // ─── Per-tool intensity (false to mute a tool) ───
      "toolIntensity": {
        "read":   "mini",
        "bash":   "near_cum",
        "grep":   false
      },

      // ─── Custom console quips ───
      "quips": {
        "read": ["oh you're reading me~", "gentle...", "right there~"],
        "bash": ["yes execute~", "tell me what to do~"]
      },
      "defaultQuips": ["oh~", "yes~", "mmm~"],

      // ─── Feature toggles ───
      "features": {
        "escalation":       true,   // intensify as tool count grows
        "rapidFire":        true,   // intensify on rapid successive calls
        "climax":           true,   // 💦 on session idle
        "permissionTease":  true,   // moan on permission requests
        "antiClimax":       true,   // deflated moan on errors
        "consoleMessages":  true    // print quips to console
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

## Sound Files

The plugin auto-discovers MP3 files from its `sounds/` directory. Files named `mini_moan.mp3`, `normal_moan.mp3`, `hmmm_moan.mp3`, and `near_cum.mp3` are mapped automatically to their respective intensity levels.

Drop in your own files with matching names, or override paths via the `sounds` config.

## File Structure

```
opencode-moanster/
├── index.ts            # Plugin source
├── package.json        # npm package manifest
├── README.md           # This file
├── LICENSE             # MIT
├── opencode.jsonc      # Example config (for local testing)
└── sounds/
    ├── hmmm_moan.mp3
    ├── mini_moan.mp3
    ├── near_cum.mp3
    └── normal_moan.mp3
```

## Requirements

- [mpv](https://mpv.io) or [ffplay](https://ffmpeg.org) for audio playback
- Linux, macOS (Windows support via WSL with mpv)

## License

MIT
