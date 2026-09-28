# Frame Templates 2 (for the QRWho Android app)

Second collection of artistic **frame artwork** for composing QR codes into beautiful cards.
**Not used by the web app** — these are source assets for the Android app.

Same construction spec as `frame-templates/`:

- **2048×2048 PNG** (print-quality, lossless)
- Ornate border occupying roughly the **outer 25–30%** of the canvas, on all four sides and corners
- The **center is a completely flat, empty dark area** — place the QR code there
- Category: **Soft, Seasonal & Celebration** (batch 1 of 2)

## Suggested composition

1. Draw the QR itself (dark modules on a light card) as a rounded square in the **center ~55–65%** of the frame.
2. Use the frame's **center color** (table below) as the QR card's surround/padding color so the card blends seamlessly into the frame's empty middle.
3. Keep a quiet zone of at least 4 modules around the QR; never let the ornament touch the modules.

## Batch 1 — Soft, Seasonal & Celebration

| File | Style | Center color (use as card surround) |
|---|---|---|
| `pastel-dream.png` | Pastel clouds, crescent moons, rainbows & stars | `#271531` |
| `tropical-paradise.png` | Palm leaves, hibiscus & parrot feathers | `#05201F` |
| `autumn-harvest.png` | Maple leaves, acorns, wheat & pumpkins | `#1E0D02` |
| `moonlit-zodiac.png` | Crescent moons, suns & zodiac star charts | `#0F0C2A` |
| `wedding-rose.png` | Blush roses, pearl strands & crystal drops | `#23181C` |
| `music-groove.png` | Vinyl records, notes & sound waves | `#0A0512` |
| `travel-wonders.png` | Hot air balloons, compasses & landmarks | `#031124` |
| `halloween-night.png` | Pumpkins, bats, cobwebs & candy corn | `#160423` |
| `christmas-frost.png` | Holly, baubles, snowflakes & candy canes | `#09190F` |
| `zen-mandala.png` | Mandalas, lotus geometry & mala beads | `#0E0925` |

Each frame's middle was verified to be a flat, decoration-free fill (pixel stddev < 0.7), so content placed there never collides with the ornament.
