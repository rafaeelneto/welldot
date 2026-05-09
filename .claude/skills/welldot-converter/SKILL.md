---
name: welldot-converter
metadata:
  version: 1.0.0
description: >
  Converts water well reports (PDF, DOCX, image, text) into a valid `.well` JSON file
  for welldot.org and @welldot/core. Works with reports in any language (PT, EN, ES, etc.).

  TRIGGER WHEN: (1) user explicitly asks to convert/generate/import a .well file;
  (2) user mentions "welldot", "welldot.org" or "@welldot/core" with a document;
  (3) conversation involves well profile analysis or comparison and standardized .well
  format would be useful (e.g. comparing lithological profiles across multiple wells).

  DO NOT trigger just because a well file was uploaded — wait for explicit request or
  clear context that .well output is needed.

  Examples: "convert this report to .well", "generate .well from this log", "import to
  welldot", "compare these well profiles", "structure these reports for analysis".
---

# welldot-converter

Extracts data from a water well report (any format) and produces a valid `.well` JSON file
per the **welldot** spec (https://github.com/rafaeelneto/welldot) for upload to **welldot.org**
or use with `@welldot/core`.

---

## ⚠️ Source of truth: official docs

**Always fetch the latest docs before extracting or validating data.** The `.well` format
may evolve; anything in this SKILL.md is secondary to the live spec.

Required sources (web_fetch each session):

| Doc | URL |
|---|---|
| Main repo | https://github.com/rafaeelneto/welldot |
| Core README | https://github.com/rafaeelneto/welldot/blob/main/packages/core/README.md |
| Format spec | https://github.com/rafaeelneto/welldot/blob/main/packages/core/well-specifications.md |
| FGDC textures | https://github.com/rafaeelneto/welldot/blob/main/packages/core/fgdc-textures.md |

If this SKILL.md conflicts with the GitHub spec, **the GitHub spec wins**.

### Doc caching across files

When processing multiple files in one session (batch conversion, cross-well comparison),
reuse the already-fetched docs from context — **1 fetch per session is enough**.
Still do a quick sanity check before each extraction: confirm required fields and vocabulary
match what you read. Re-fetch if the session is long or you suspect spec changes.

---

## Language

**Preserve the source document's language** in all free-text fields (`description`, `obs`,
`geologic_unit`, `aquifer_unit`, names, etc.). Portuguese report → Portuguese output.
English report → English output. Only translate if the user explicitly asks.

---

## Metric fidelity — critical rule

**Transcribe only values explicitly stated in the document.** For every numeric field:

- Value present → transcribe precisely, converting units if needed
- Value absent → **omit the field entirely** — never estimate, infer, or approximate

Applies to: `lat`, `lng`, `elevation`, `from`, `to`, `diameter`, `screen_slot_mm`, `dip`,
`azimuth`, and all other numeric fields.

Accepted conversions (only when original unit is explicit in the document):
- ft → m: `× 0.3048` | in → mm: `× 25.4` | cm → mm: `× 10`
- DMS → decimal degrees: convert precisely
- SIRGAS 2000 UTM → WGS84 decimal: convert precisely or ask the user

---

## Input formats

| Format | How to read |
|---|---|
| PDF | Use `pdf-reading` skill; rasterize pages for scanned PDFs |
| DOCX | Use `file-reading` skill → docx extraction |
| Image (JPG/PNG/TIFF) | Pass as base64 to Anthropic vision API |
| Plain text / CSV | Read directly from context |

Check `/mnt/user-data/uploads/` for uploaded files.

---

## Step 1 — Fetch the latest docs

web_fetch the four URLs above. Pay attention to:
- Required fields per object type
- Allowed vocabularies (well_type, drilling_method, aquifer_unit, etc.)
- Any new fields or types added since this SKILL.md was written
- Available FGDC codes (Series 600 and 700 cover most well lithologies)

---

## Step 2 — Read the report file

Identify format and extract content:
- PDF → consult `/mnt/skills/public/pdf-reading/SKILL.md`
- DOCX → consult `/mnt/skills/public/file-reading/SKILL.md`
- Image → load as base64, send to Anthropic API with vision (Step 3)
- Multiple files → process each, merge results

---

## Step 3 — Extract well data via AI

Send extracted text (or image bytes) to the Anthropic API. Model must return **raw JSON only**
conforming to the `.well` spec fetched in Step 1.

### Extraction system prompt

```
You are a technical assistant specialized in water well data extraction.

Extract all available well data from the provided document and return ONLY a valid JSON object
conforming to the .well format specification v1:
https://github.com/rafaeelneto/welldot/blob/main/packages/core/well-specifications.md

No explanation, no markdown fences, no preamble — raw JSON only.

LANGUAGE: Preserve the source document's language in all free-text fields (description, obs,
geologic_unit, aquifer_unit, names). Do not translate unless explicitly requested.

METRIC FIDELITY (critical):
- Transcribe ONLY values explicitly in the document. If absent, OMIT the field. Never infer.
- Applies to: lat, lng, elevation, from, to, diameter, screen_slot_mm, dip, azimuth, all numerics.
- Unit conversions (only when source unit is explicit): ft→m ×0.3048, in→mm ×25.4, cm→mm ×10,
  DMS→decimal degrees (precise), SIRGAS UTM→WGS84 decimal (precise).
- Empty arrays for missing array fields: []. Omit cement_pad entirely if not in document.

FGDC TEXTURE — numeric codes only (integer, not string):
- Match geological description to best code from:
  https://github.com/rafaeelneto/welldot/blob/main/packages/core/fgdc-textures.md
- Prefer Series 600 (sedimentary) and 700 (metamorphic/igneous) — fully implemented.
  Avoid Series 100–500 (pending) unless only match.
- Common mappings (verify against full list):
  Sand/Areia=607, Gravel/Cascalho=601, Clay/Argila=620, Silt/Silte=616,
  Limestone/Calcário=627, Granite/Granito=718, Gneiss=708, Schist/Xisto=705,
  Quartzite/Quartzito=702, Basalt/Basalto=717, Sandstone/Arenito=607-608,
  Shale/Folhelho=619-620, Chalk=626, Coal/Carvão=658, Gypsum/Gesso=667

LITHOLOGY COLOR: geologically plausible CSS hex. Examples:
  clay=#8B7355, sand=#F5DEB3, granite=#A9A9A9, basalt=#696969,
  limestone=#FFFACD, gneiss=#B8860B, schist=#9E8B6E

VOCABULARY:
- well_type: tubular, artesian, hand_dug, horizontal, infiltration_gallery
- drilling_method: rotary, percussion, cable_tool, auger, diamond, air_rotary
- well_case type: steel, pvc, hdpe, fiberglass
- well_screen type: wire_wound, bridge_slot, louvered, pvc_slotted
- hole_fill type: gravel_pack | seal
- fracture required: depth, water_intake (bool), description, swarm (bool), azimuth, dip
- cave required: from, to, water_intake (bool), description

version: 1 (integer)
```

### API call

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: extractedText },
        // image: { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }
      ]
    }]
  })
});
const data = await response.json();
const raw = data.content.filter(b => b.type === "text").map(b => b.text).join("");
const wellData = JSON.parse(raw.replace(/```json|```/g, "").trim());
```

---

## Step 4 — Validate

1. `"version": 1` present
2. All required fields present per object type (per spec from Step 1)
3. Depth consistency: `from < to` for all interval objects
4. Diameter sanity: boreholes 100–600 mm typical; casings smaller than borehole
5. `fgdc_texture` is a numeric integer, not a string
6. No numeric field was estimated — if in doubt, remove and flag to user

---

## Step 5 — Save and present

Save to `/mnt/user-data/outputs/<well_name>.well` (sanitized from well name; default: `well.well`).

Present the file with a brief summary:
- Sections found: constructive (bore_hole, casing, screen, etc.) / geologic (lithology, fractures)
- Total depth
- Fields absent in the report (intentionally omitted) that may need manual completion

---

## Step 6 — Handle ambiguities

Ask targeted questions for missing critical data. Common gaps:

- **Borehole diameter** not stated (do not infer — ask)
- **Total depth** sometimes only in feet — confirm conversion
- **Screen slot** (`screen_slot_mm`) often missing in older reports
- **Coordinates** sometimes in UTM — ask for decimal degrees or convert
- **Driller name** often in header/stamp missed by text extraction

---

## Common report term lookup

| Section | PT terms | EN terms |
|---|---|---|
| Metadata | Nome do poço, empresa perfuradora, data de conclusão, cota | Well name, driller, completion date, elevation |
| Borehole | Perfuração, diâmetro de perfuração, profundidade total | Drilling, borehole diameter, total depth |
| Casing | Revestimento, tubo de aço/PVC | Casing, steel/PVC pipe |
| Reduction | Redutor, adaptador | Reducer, adapter |
| Screen | Filtro, seção filtrante, ranhura, wire-wound | Screen, slotted section, slot opening |
| Gravel pack | Pré-filtro, enrocamento, seixo | Gravel pack, filter gravel |
| Seal | Cimentação anular, bentonita, vedação | Annular seal, bentonite, cement |
| Cement pad | Laje de proteção, laje de concreto | Wellhead pad, concrete pad |
| Lithology | Perfil litológico, coluna geológica, camadas | Lithological profile, geologic column, layers |
| Fractures | Fraturas, zonas fraturadas | Fractures, fracture zones |
| Caves | Cavernas, zonas cavernosas | Caves, voids, cavities |

---

## Output filename

`<sanitized_well_name>.well`

Examples: "Poço PP-01" → `poco-pp-01.well` | "Well BH-3" → `well-bh-3.well` | unknown → `well.well`
