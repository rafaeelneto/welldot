# FGDC Texture Patterns Reference

This document lists all texture patterns available in `FGDC_TEXTURES_OPTIONS` from `@welldot/core`. These codes follow the **FGDC (Federal Geographic Data Committee)** digital cartographic standard for geologic map symbolization.

Use a `code` value in the `texture` field of a `Lithology` record to assign a pattern to a depth interval.

```typescript
import { FGDC_TEXTURES_OPTIONS } from '@welldot/core';

// Find a texture by code
const limestone = FGDC_TEXTURES_OPTIONS.find(t => t.code === 627);
// { code: 627, label: 'Limestone' }

// Filter to only textures with a rendered image
const available = FGDC_TEXTURES_OPTIONS.filter(t => !t.pending);
```

> **Texture availability:** Some entries carry `pending: true`, meaning the SVG pattern image has not been implemented yet. Textures without this flag are fully rendered and ready to use. The flag is transitional and will be removed once all patterns are complete.
>
> Currently **120 of 282 textures** are available: all of Series 600 (84) and Series 700 (33), plus codes 120, 123, and 132 from Series 100.

---

## Series 100 — Surficial Patterns

| Code | Label | Status |
|------|-------|--------|
| 101 | Unconsolidated material | pending |
| 102 | Alluvium | pending |
| 103 | Terrace deposit | pending |
| 104 | Floodplain deposit | pending |
| 105 | Fan or pediment deposit | pending |
| 106 | Eolian sand | pending |
| 107 | Silt or loess | pending |
| 108 | Clay deposit | pending |
| 109 | Colluvium | pending |
| 110 | Gravel deposit | pending |
| 111 | Residual deposit | pending |
| 112 | Playa deposit | pending |
| 113 | Lacustrine deposit | pending |
| 114 | Marine deposit | pending |
| 115 | Beach or bar deposit | pending |
| 116 | Organic deposit or peat | pending |
| 117 | Swamp or marsh deposit | pending |
| 118 | Soil | pending |
| 119 | Fill or artificial deposit | pending |
| 120 | Surficial pattern 120 | available |
| 121 | Surficial pattern 121 | pending |
| 122 | Surficial pattern 122 | pending |
| 123 | Surficial pattern 123 | available |
| 124 | Surficial pattern 124 | pending |
| 125 | Surficial pattern 125 | pending |
| 126 | Surficial pattern 126 | pending |
| 127 | Surficial pattern 127 | pending |
| 128 | Surficial pattern 128 | pending |
| 129 | Surficial pattern 129 | pending |
| 130 | Surficial pattern 130 | pending |
| 131 | Surficial pattern 131 | pending |
| 132 | Surficial pattern 132 | available |
| 133 | Surficial pattern 133 | pending |
| 134 | Surficial pattern 134 | pending |
| 135 | Surficial pattern 135 | pending |
| 136 | Surficial pattern 136 | pending |
| 137 | Surficial pattern 137 | pending |

---

## Series 200 — Sedimentary Patterns

> All entries in this series are **pending** (no SVG images implemented yet).

| Code | Label |
|------|-------|
| 201 | Sedimentary pattern 201 |
| 202 | Sedimentary pattern 202 |
| 203 | Sedimentary pattern 203 |
| 204 | Sedimentary pattern 204 |
| 205 | Sedimentary pattern 205 |
| 206 | Sedimentary pattern 206 |
| 207 | Sedimentary pattern 207 |
| 208 | Sedimentary pattern 208 |
| 209 | Sedimentary pattern 209 |
| 210 | Sedimentary pattern 210 |
| 211 | Sedimentary pattern 211 |
| 212 | Sedimentary pattern 212 |
| 213 | Sedimentary pattern 213 |
| 214 | Sedimentary pattern 214 |
| 215 | Sedimentary pattern 215 |
| 216 | Sedimentary pattern 216 |
| 217 | Sedimentary pattern 217 |
| 218 | Sedimentary pattern 218 |
| 219 | Sedimentary pattern 219 |
| 220 | Sedimentary pattern 220 |
| 221 | Sedimentary pattern 221 |
| 222 | Sedimentary pattern 222 |
| 223 | Sedimentary pattern 223 |
| 224 | Sedimentary pattern 224 |
| 225 | Sedimentary pattern 225 |
| 226 | Sedimentary pattern 226 |
| 227 | Sedimentary pattern 227 |
| 228 | Sedimentary pattern 228 |
| 229 | Sedimentary pattern 229 |
| 230 | Sedimentary pattern 230 |
| 231 | Sedimentary pattern 231 |
| 232 | Sedimentary pattern 232 |
| 233 | Sedimentary pattern 233 |

---

## Series 300 — Igneous Patterns

> All entries in this series are **pending** (no SVG images implemented yet).

| Code | Label |
|------|-------|
| 301 | Igneous pattern 301 |
| 302 | Igneous pattern 302 |
| 303 | Igneous pattern 303 |
| 304 | Igneous pattern 304 |
| 305 | Igneous pattern 305 |
| 306 | Igneous pattern 306 |
| 307 | Igneous pattern 307 |
| 308 | Igneous pattern 308 |
| 309 | Igneous pattern 309 |
| 310 | Igneous pattern 310 |
| 311 | Igneous pattern 311 |
| 312 | Igneous pattern 312 |
| 313 | Igneous pattern 313 |
| 314 | Igneous pattern 314 |
| 315 | Igneous pattern 315 |
| 316 | Igneous pattern 316 |
| 317 | Igneous pattern 317 |
| 318 | Igneous pattern 318 |
| 319 | Igneous pattern 319 |
| 320 | Igneous pattern 320 |
| 321 | Igneous pattern 321 |
| 322 | Igneous pattern 322 |
| 323 | Igneous pattern 323 |
| 324 | Igneous pattern 324 |
| 325 | Igneous pattern 325 |
| 326 | Igneous pattern 326 |
| 327 | Igneous pattern 327 |
| 328 | Igneous pattern 328 |
| 329 | Igneous pattern 329 |
| 330 | Igneous pattern 330 |
| 331 | Igneous pattern 331 |

---

## Series 400 — Miscellaneous and Metamorphic Patterns

> All entries in this series are **pending** (no SVG images implemented yet).

| Code | Label |
|------|-------|
| 401 | Miscellaneous pattern 401 |
| 402 | Miscellaneous pattern 402 |
| 403 | Miscellaneous pattern 403 |
| 404 | Miscellaneous pattern 404 |
| 405 | Miscellaneous pattern 405 |
| 406 | Miscellaneous pattern 406 |
| 407 | Miscellaneous pattern 407 |
| 408 | Miscellaneous pattern 408 |
| 409 | Miscellaneous pattern 409 |
| 410 | Miscellaneous pattern 410 |
| 411 | Miscellaneous pattern 411 |
| 412 | Miscellaneous pattern 412 |
| 413 | Miscellaneous pattern 413 |
| 414 | Miscellaneous pattern 414 |
| 415 | Miscellaneous pattern 415 |
| 416 | Miscellaneous pattern 416 |
| 417 | Miscellaneous pattern 417 |
| 418 | Miscellaneous pattern 418 |
| 419 | Miscellaneous pattern 419 |
| 420 | Miscellaneous pattern 420 |
| 421 | Miscellaneous pattern 421 |
| 422 | Miscellaneous pattern 422 |
| 423 | Miscellaneous pattern 423 |
| 424 | Miscellaneous pattern 424 |
| 425 | Miscellaneous pattern 425 |
| 426 | Miscellaneous pattern 426 |
| 427 | Miscellaneous pattern 427 |
| 428 | Miscellaneous pattern 428 |
| 429 | Miscellaneous pattern 429 |
| 430 | Miscellaneous pattern 430 |
| 431 | Miscellaneous pattern 431 |
| 432 | Miscellaneous pattern 432 |
| 433 | Miscellaneous pattern 433 |
| 434 | Miscellaneous pattern 434 |
| 435 | Miscellaneous pattern 435 |
| 436 | Miscellaneous pattern 436 |

---

## Series 500 — Glacial and Periglacial Patterns

> All entries in this series are **pending** (no SVG images implemented yet).

| Code | Label |
|------|-------|
| 521 | Glacial pattern 521 |
| 522 | Glacial pattern 522 |
| 523 | Glacial pattern 523 |
| 524 | Glacial pattern 524 |
| 530 | Glacial pattern 530 |
| 531 | Glacial pattern 531 |
| 532 | Glacial pattern 532 |
| 533 | Glacial pattern 533 |
| 534 | Glacial pattern 534 |
| 535 | Glacial pattern 535 |
| 536 | Glacial pattern 536 |
| 537 | Glacial pattern 537 |
| 538 | Glacial pattern 538 |
| 580 | Glacial pattern 580 |
| 581 | Glacial pattern 581 |
| 582 | Glacial pattern 582 |
| 583 | Glacial pattern 583 |
| 584 | Glacial pattern 584 |
| 585 | Glacial pattern 585 |
| 586 | Glacial pattern 586 |
| 587 | Glacial pattern 587 |
| 588 | Glacial pattern 588 |
| 589 | Glacial pattern 589 |
| 591 | Periglacial pattern 591 |
| 592 | Periglacial pattern 592 |
| 593 | Periglacial pattern 593 |
| 594 | Periglacial pattern 594 |
| 595 | Periglacial pattern 595 |

---

## Series 600 — Sedimentary Lithology Patterns

These are the most commonly used codes for well lithology logging. They represent specific rock and sediment types encountered in boreholes.

| Code | Label |
|------|-------|
| 601 | Gravel or conglomerate (1st option) |
| 602 | Gravel or conglomerate (2nd option) |
| 603 | Crossbedded gravel or conglomerate |
| 605 | Breccia (1st option) |
| 606 | Breccia (2nd option) |
| 607 | Massive sand or sandstone |
| 608 | Bedded sand or sandstone |
| 609 | Crossbedded sand or sandstone (1st option) |
| 610 | Crossbedded sand or sandstone (2nd option) |
| 611 | Ripple-bedded sand or sandstone |
| 612 | Argillaceous or shaly sandstone |
| 613 | Calcareous sandstone |
| 614 | Dolomitic sandstone |
| 616 | Silt, siltstone, or shaly silt |
| 617 | Calcareous siltstone |
| 618 | Dolomitic siltstone |
| 619 | Sandy or silty shale |
| 620 | Clay or clay shale |
| 621 | Cherty shale |
| 622 | Dolomitic shale |
| 623 | Calcareous shale or marl |
| 624 | Carbonaceous shale |
| 625 | Oil shale |
| 626 | Chalk |
| 627 | Limestone |
| 628 | Clastic limestone |
| 629 | Fossiliferous clastic limestone |
| 630 | Nodular or irregularly bedded limestone |
| 631 | Limestone, irregular (burrow?) fillings of saccharoidal dolomite |
| 632 | Crossbedded limestone |
| 633 | Cherty crossbedded limestone |
| 634 | Cherty and sandy crossbedded clastic limestone |
| 635 | Oolitic limestone |
| 636 | Sandy limestone |
| 637 | Silty limestone |
| 638 | Argillaceous or shaly limestone |
| 639 | Cherty limestone (1st option) |
| 640 | Cherty limestone (2nd option) |
| 641 | Dolomitic limestone, limy dolostone, or limy dolomite |
| 642 | Dolostone or dolomite |
| 643 | Crossbedded dolostone or dolomite |
| 644 | Oolitic dolostone or dolomite |
| 645 | Sandy dolostone or dolomite |
| 646 | Silty dolostone or dolomite |
| 647 | Argillaceous or shaly dolostone or dolomite |
| 648 | Cherty dolostone or dolomite |
| 649 | Bedded chert (1st option) |
| 650 | Bedded chert (2nd option) |
| 651 | Fossiliferous bedded chert |
| 652 | Fossiliferous rock |
| 653 | Diatomaceous rock |
| 654 | Subgraywacke |
| 655 | Crossbedded subgraywacke |
| 656 | Ripple-bedded subgraywacke |
| 657 | Peat |
| 658 | Coal |
| 659 | Bony coal or impure coal |
| 660 | Underclay |
| 661 | Flint clay |
| 662 | Bentonite |
| 663 | Glauconite |
| 664 | Limonite |
| 665 | Siderite |
| 666 | Phosphatic-nodular rock |
| 667 | Gypsum |
| 668 | Salt |
| 669 | Interbedded sandstone and siltstone |
| 670 | Interbedded sandstone and shale |
| 671 | Interbedded ripple-bedded sandstone and shale |
| 672 | Interbedded shale and silty limestone (shale dominant) |
| 673 | Interbedded shale and limestone, shale dominant (1st option) |
| 674 | Interbedded shale and limestone, shale dominant (2nd option) |
| 675 | Interbedded calcareous shale and limestone (shale dominant) |
| 676 | Interbedded silty limestone and shale |
| 677 | Interbedded limestone and shale (1st option) |
| 678 | Interbedded limestone and shale (2nd option) |
| 679 | Interbedded limestone and shale (limestone dominant) |
| 680 | Interbedded limestone and calcareous shale |
| 681 | Till or diamicton (1st option) |
| 682 | Till or diamicton (2nd option) |
| 683 | Till or diamicton (3rd option) |
| 684 | Loess (1st option) |
| 685 | Loess (2nd option) |
| 686 | Loess (3rd option) |

---

## Series 700 — Metamorphic and Igneous Lithology Patterns

| Code | Label |
|------|-------|
| 701 | Metamorphism |
| 702 | Quartzite |
| 703 | Slate |
| 704 | Schistose or gneissoid granite |
| 705 | Schist |
| 706 | Contorted schist |
| 707 | Schist and gneiss |
| 708 | Gneiss |
| 709 | Contorted gneiss |
| 710 | Soapstone, talc, or serpentinite |
| 711 | Tuffaceous rock |
| 712 | Crystal tuff |
| 713 | Devitrified tuff |
| 714 | Volcanic breccia and tuff |
| 715 | Volcanic breccia or agglomerate |
| 716 | Zeolitic rock |
| 717 | Basaltic flows |
| 718 | Granite (1st option) |
| 719 | Granite (2nd option) |
| 720 | Banded igneous rock |
| 721 | Igneous rock (1st option) |
| 722 | Igneous rock (2nd option) |
| 723 | Igneous rock (3rd option) |
| 724 | Igneous rock (4th option) |
| 725 | Igneous rock (5th option) |
| 726 | Igneous rock (6th option) |
| 727 | Igneous rock (7th option) |
| 728 | Igneous rock (8th option) |
| 729 | Porphyritic rock (1st option) |
| 730 | Porphyritic rock (2nd option) |
| 731 | Vitrophyre |
| 732 | Quartz |
| 733 | Ore |

---

## Summary

| Series | Category | Total | Available | Pending |
|--------|----------|-------|-----------|---------|
| 100 | Surficial | 37 | 3 | 34 |
| 200 | Sedimentary | 33 | 0 | 33 |
| 300 | Igneous | 31 | 0 | 31 |
| 400 | Miscellaneous / Metamorphic | 36 | 0 | 36 |
| 500 | Glacial / Periglacial | 28 | 0 | 28 |
| 600 | Sedimentary Lithology | 84 | 84 | 0 |
| 700 | Metamorphic / Igneous Lithology | 33 | 33 | 0 |
| **Total** | | **282** | **120** | **162** |

---

*Source: FGDC Digital Cartographic Standard for Geologic Map Symbolization (FGDC-STD-013-2006), Chapter 25 — Lithology.*
