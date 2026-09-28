# Frame Templates (for the QRWho Android app)

Artistic decorative **frame artwork** for composing QR codes into beautiful cards.
**Not used by the web app** — these are source assets for the Android app.

## Spec

- **2048×2048 PNG** (print-quality, lossless)
- Ornate painterly border occupying roughly the **outer 25–30%** of the canvas, on all four sides and corners
- The **center is a completely flat, empty dark area** — place the QR code there
- Three categories: **glowing florals / botanical**, **geometric, cosmic & luxury**, and **world art, fantasy & retro**

## Suggested composition

1. Draw the QR itself (dark modules on a light card) as a rounded square in the **center ~55–65%** of the frame.
2. Use the frame's **center color** (tables below) as the QR card's surround/padding color so the card blends seamlessly into the frame's empty middle.
3. Keep a quiet zone of at least 4 modules around the QR; never let the ornament touch the modules.

## Batch 1 — Glowing Florals & Botanical

| File | Style | Center color (use as card surround) |
|---|---|---|
| `wisteria-glow.png` | Cascading purple wisteria, lavender sparkles | `#190E39` |
| `ember-roses.png` | Red & ember-orange roses, golden thorn vines | `#2A030A` |
| `coral-bloom.png` | Coral & salmon flowers, fine gold stems | `#1A1F23` |
| `frost-blue.png` | Glowing cyan star-flowers, fairy lights | `#011331` |
| `sakura-night.png` | Pink cherry blossoms, drifting petals | `#2B0A1E` |
| `golden-roses.png` | Golden roses, gold dust on near-black | `#0C0906` |
| `emerald-fern.png` | Emerald ferns, glowing orchids, fireflies | `#031B0F` |
| `silver-frost.png` | Silver snowflakes & frost flowers | `#07132D` |
| `violet-stars.png` | Violet cosmos, star sparkles | `#1C093A` |
| `golden-lotus.png` | Golden lotus & mandala accents | `#170F03` |

## Batch 2 — Geometric, Cosmic & Luxury

| File | Style | Center color (use as card surround) |
|---|---|---|
| `deco-gold.png` | Art deco gold fans & sunbursts on black | `#0C0B06` |
| `neon-grid.png` | Neon cyan/magenta circuit traces & tech brackets | `#020720` |
| `holo-chrome.png` | Iridescent holographic chrome ribbons | `#14141B` |
| `cosmic-nebula.png` | Purple-blue nebula clouds, stars, comets | `#06061F` |
| `mosaic-lapis.png` | Lapis/turquoise/gold zellige star geometry | `#041B2C` |
| `crystal-ice.png` | Faceted crystal prisms & gemstone shards | `#070729` |
| `pixel-voxel.png` | Colorful pixel-art voxel blocks (arcade) | `#0A0A10` |
| `stained-glass.png` | Jewel-tone stained glass gothic panes | `#0F0C13` |
| `aurora-night.png` | Aurora borealis ribbons & mountain silhouettes | `#050D26` |
| `marble-gold.png` | Black marble with flowing gold veins | `#0F0D0B` |

## Batch 3 — World Art, Fantasy & Retro

| File | Style | Center color (use as card surround) |
|---|---|---|
| `great-wave.png` | Ukiyo-e indigo waves & seigaiha scales | `#051431` |
| `aztec-sun.png` | Aztec/Mayan sun glyphs, stepped frets | `#0E0804` |
| `steampunk.png` | Brass gears, copper pipes, rivets | `#0E0A04` |
| `coral-reef.png` | Coral, seahorses, starfish & bubbles | `#011D33` |
| `vintage-glam.png` | Rose-gold filigree, pearls & crystals | `#240E16` |
| `groovy-70s.png` | Retro swirls, daisies & mushrooms | `#231509` |
| `kawaii-sweets.png` | Pastel candies, donuts, stars & clouds | `#2D1531` |
| `enchanted-forest.png` | Glowing mushrooms, lanterns & fireflies | `#051208` |
| `phoenix-fire.png` | Phoenix flame feathers & ember sparks | `#110805` |
| `festival-lights.png` | Paper lanterns, fairy lights & marigolds | `#0E0B20` |

Each frame's middle was verified to be a flat, decoration-free fill (pixel stddev < 0.7), so content placed there never collides with the ornament.
