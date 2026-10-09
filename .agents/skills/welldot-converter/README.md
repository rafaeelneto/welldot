# welldot-converter

An [Agent Skill](https://agentskills.io) that converts water well reports into `.well` JSON
(welldot spec v2). `SKILL.md` is the whole skill — there is no Claude-specific version and no
per-vendor copy to keep in sync.

```
.agents/skills/welldot-converter/
├── SKILL.md                  # the procedure
├── README.md                 # this file
└── references/
    └── well-spec.md          # full offline copy of the .well v2 spec
```

`.claude/skills/welldot-converter` is a symlink to this directory.

---

## Why it lives in `.agents/skills/`

`.agents/skills/` is the vendor-neutral discovery path for Agent Skills. Putting the skill here
means every skills-capable client finds it with no configuration:

| Client                              | Discovery path                                                              |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Codex CLI, ChatGPT desktop, IDE ext | `.agents/skills/` (walks up to repo root), `~/.agents/skills`               |
| Gemini CLI                          | `.agents/skills/` or `.gemini/skills/`, `~/.agents/skills`                  |
| Cursor                              | `.agents/skills/`, `.cursor/skills/`, and `.claude/skills/` for back-compat |
| Claude Code / Claude.ai             | `.claude/skills/` (the symlink)                                             |

`.claude/skills/` is now a legacy location — Cursor reads it as a compatibility shim and Codex
does not read it at all, which is why the real directory moved and a symlink stayed behind.

**Setup for all of the above: none.** Clone the repo and the skill is available. The agent
activates it on the trigger conditions in the `description` frontmatter.

---

## Fallback: ChatGPT web/mobile and Gemini Gems

These two do not load skill folders — ChatGPT web requires skills packaged as plugins, and
Gemini Gems have no skills mechanism at all. Wire them up by hand:

**ChatGPT** — create a Project, upload `SKILL.md` and `references/well-spec.md` to the project's
files, paste the block below into Project instructions.

**Gemini** — create a Gem, add the same two files as Gem knowledge, paste the same block into
the Gem's instructions.

The block restates the rules that must survive a bad run: both products routinely skip knowledge
files on the same turn a document is attached, and the failure mode is a confident, invalid
`.well` file.

```text
You convert water well reports into .well JSON files (welldot spec v2).

Your knowledge files contain SKILL.md — the full procedure — and well-spec.md, the complete
v2 spec. Read SKILL.md and follow it exactly for every conversion. well-spec.md is the field
reference; consult it whenever you are unsure about a field, and prefer it over your own
recollection of the format.

These rules are non-negotiable and apply even if you have not read the knowledge files yet:

1. Never estimate a number. If the report doesn't state a value, omit the field. This covers
   depths, diameters, coordinates, elevation, screen slot, flow rates, dip, azimuth —
   everything numeric. No inferred values, no plausible defaults, no interpolated readings.
2. Preserve the report's own language and wording in every free-text field. A Portuguese
   report produces Portuguese output. Stay near-verbatim; never summarize away a measurement,
   material, brand, or qualifier.
3. well_case[].type, well_screen[].type and reduction[].type are FREE TEXT, not enums.
   Transcribe what the report says. Do not map them onto steel/pvc/wire_wound/bridge_slot or
   any other vocabulary.
4. hole_fill[].type is a real enum: exactly "gravel_pack" or "seal". The material detail goes
   in hole_fill[].description.
5. lithology[].texture is REQUIRED on every entry and is an object, not a string:
   {"code": 607, "vocabulary": "fgdc"}. Prefer FGDC Series 600 and 700 codes.
6. Every datetime in hydrodynamic_events, aquifer_analysis and history_logs is RFC 3339 WITH a
   UTC offset. Never emit a naked timestamp.
7. Top level uses location {lat, lng, elevation?}, not flat lat/lng. Set "version": 2.
8. well_depth is the CURRENT/USABLE depth and is usually absent. A report's single total-depth
   figure belongs in bore_hole[].to only — never copy it into both.

Ask before guessing. Missing borehole diameter, ambiguous depth figures, UTM coordinates, and
undated maintenance entries are questions for the user, not blanks for you to fill.

Finish by summarizing which sections you found, which fields you deliberately left out, any
free-text type field you kept as the report's own wording, and whether you used the live spec
or the bundled well-spec.md.
```

Re-upload `SKILL.md` after editing it — these copies do not track the repo. The instruction
block only needs changing if a _non-negotiable_ rule changes.

---

## Editing the skill

Validate frontmatter against the spec after any change:

```bash
uvx --from skills-ref agentskills validate .agents/skills/welldot-converter
```

Spec constraints worth remembering: `name` must match the directory name, `description` caps at
1024 characters, `metadata` values must be strings, and the `SKILL.md` body should stay under
500 lines — push detailed reference material into `references/` instead, where agents load it
only on demand.

> **Note on the spec URLs in `SKILL.md`:** they point at `github.com/rafaeelneto/welldot`, while
> the git remote is `rafaeelneto/well-profiler`. They resolve today only through GitHub's rename
> redirect — that stops working if a repo named `welldot` is ever created under the account.
