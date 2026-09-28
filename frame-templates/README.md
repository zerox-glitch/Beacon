# Frame Templates (for the QRWho Android app)

Artistic decorative **frame artwork** for composing QR codes into beautiful cards.
**Not used by the web app** — these are source assets for the Android app.

## Spec

- **2048×2048 PNG** (print-quality, lossless)
- Ornate painterly border occupying roughly the **outer 25–30%** of the canvas, on all four sides and corners
- The **center is a completely flat, empty dark area** — place the QR code there
- Style: dark backgrounds with **glowing floral / botanical** ornament (wisteria, roses, cherry blossom, frost, lotus…)

## Suggested composition

1. Draw the QR itself (dark modules on a light card) as a rounded square in the **center ~55–65%** of the frame.
2. Use the frame's **center color** (table below) as the QR card's surround/padding color so the card blends seamlessly into the frame's empty middle.
3. Keep a quiet zone of at least 4 modules around the QR; never let the ornament touch the modules.

## Manifest

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

Each frame's middle was verified to be a flat, decoration-free fill (pixel stddev < 0.7), so content placed there never collides with the ornament.
