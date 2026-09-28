# App Logos — asset manifest for the Android app

78 transparent-background PNGs — **59 brand logos + 19 flower stickers** — for the Beacon
Android app. This folder is the source of truth for asset names.

**Status:** the pixel files are not in the repo yet. The chat attachment pipeline has
failed to deliver the PNG bytes twice (`/home/user/uploads/` never materialized in the
workspace), so this manifest is built from direct visual identification of the 78 images.
The moment the bytes arrive (re-attach / download URL / GitHub upload) the files will be
copied in **byte-identical (lossless, alpha preserved)** under the target names below,
verified against the visual signatures, and a contact sheet will be added.

## Matching rule (when the pixel files land)

Row order follows the attachment order of the re-send message; the “Saved name” column is
the original upload filename. **The visual signature is authoritative** — if a pixel file
disagrees with row order, match it by signature (color/shape) and this table will be
corrected in the same commit.

## 1 · Social & messaging

| Target file | Identification | Visual signature | Saved name |
|---|---|---|---|
| `linkedin.png` | LinkedIn (certain) | blue rounded square, white “in” | `4.png` |
| `icon-02-dark-mascot.png` | unknown dark mascot/face (likely Yik Yak / imo) | black silhouette, two eyes + smile, horned top | `2.png` |
| `instagram.png` | Instagram (certain) | pink-purple-orange gradient camera | `3.png` |
| `twitter.png` | Twitter (pre-X bird) | light-blue bird | `6.png` |
| `telegram.png` | Telegram (certain) | blue circle, white paper plane | `1.png` |
| `icon-06-mark-dark.png` | unknown mark (circle + stem + square, key/pan-like) — dark variant | black rounded square, white frame, circle+bar+square | `5.png` |
| `discord.png` | Discord (certain) | periwinkle blob face, two dark eyes | `7.png` |
| `vk.png` | VK (certain) | bright-blue rounded square, white “vk” | `8.png` |
| `tumblr.png` | Tumblr (certain) | navy square, black “t” | `10.png` |
| `twitch.png` | Twitch (certain) | purple outlined speech mark, two bars | `9.png` |
| `viber.png` | Viber (certain) | purple bubble, white phone | `12.png` |
| `icon-12-color-blobs.png` | unknown multi-color blob ring (likely Google Photos) | cyan/green/crimson/yellow pinwheel of blobs | `11.png` |
| `paypal.png` | PayPal (certain) | two-tone blue double P | `13.png` |
| `binance.png` | Binance (certain) | yellow diamond grid | `14.png` |
| `icon-15-blue-ring.png` | unknown blue ring “O” with center dot + tail | blue circle, white ring, blue core | `16.png` |
| `icon-16-blue-m.png` | unknown (likely Waze / Meetup / Mixi) | blue rounded square, white circle with “m” wave | `15.png` |
| `skype.png` | Skype classic (likely) | periwinkle rounded square, white “S” | `17.png` |
| `duolingo.png` | Duolingo (certain) | green circle, owl | `18.png` |
| `icon-19-mark-light.png` | unknown mark (pair of `icon-06`) — light variant | white rounded square, black circle+bar+square | `20.png` |
| `icon-20-green-up.png` | likely Upwork | green lowercase “up” | `19.png` |

## 2 · Tech, stores & platforms

| Target file | Identification | Visual signature | Saved name |
|---|---|---|---|
| `app-store.png` | App Store (certain) | blue-gradient rounded square, white “A” | `22.png` |
| `icon-22-teal-tag.png` | unknown (teal price tag + asterisk) | teal tag, dark asterisk + dot | `21.png` |
| `icon-23-orange-swoosh.png` | unknown orange swoosh (likely Audible-class) | orange brushstroke loop | `23.png` |
| `icon-24-orange-e.png` | very likely Etsy | bold orange “E” | `1 (1).png` |
| `chrome.png` | Chrome (certain) | red/yellow/green circle, blue core | `2 (1).png` |
| `shopify.png` | Shopify (certain) | green shopping bag, white “S” | `3 (1).png` |
| `google-meet.png` | Google Meet (certain) | multicolor camera mark | `4 (1).png` |
| `zoom.png` | Zoom (certain) | blue circle, white video camera | `5 (1).png` |
| `icon-29-black-bubble.png` | unknown dark chat mark | black speech bubble, two bars | `11 (1).png` |
| `xbox.png` | Xbox (certain) | green circle, X blades | `8 (1).png` |

## 3 · Flower stickers — set A (3D emoji style)

| Target file | Identification | Visual signature | Saved name |
|---|---|---|---|
| `flower-sunflowers-1.png` | Sunflowers | two yellow blooms, green stems | `12 (1).png` |
| `flower-sunflowers-2.png` | Sunflowers — duplicate copy | identical to above | `4 (2).png` |
| `flower-pink-blossom.png` | pink blossoms w/ tall leaf (likely oleander/mandevilla) | two pink five-petal flowers, long pointed leaf | `2 (2).png` |
| `flower-cherry-blossom.png` | Cherry blossom branch | white-pink blossoms + buds on brown branch | `1 (2).png` |
| `flower-lavender.png` | Lavender | two purple flower spikes | `3 (2).png` |

## 4 · Social & community — set B

| Target file | Identification | Visual signature | Saved name |
|---|---|---|---|
| `facebook.png` | Facebook (certain) | blue circle, white “f” | `1 (3).png` |
| `tiktok.png` | TikTok (certain) | black note, cyan + crimson offset | `2 (3).png` |
| `whatsapp.png` | WhatsApp (certain) | green circle, white phone, white ring | `3 (3).png` |
| `snapchat.png` | Snapchat (certain) | white ghost | `4 (3).png` |
| `wechat.png` | WeChat (certain) | green rounded square, two white bubbles with eyes | `7 (1).png` |
| `quora.png` | Quora (certain) | red square, white “Q” | `8 (2).png` |
| `reddit.png` | Reddit (certain) | orange circle, white Snoo | `6 (1).png` |
| `icon-43-blue-dashed-bubble.png` | unknown chat app (likely GroupMe / TextNow-class) | blue speech circle with dashed outline | `5 (2).png` |
| `line.png` | LINE (certain) | green rounded square, white bubble, “LINE” | `2 (4).png` |
| `messenger.png` | Messenger (certain) | pink-purple-blue gradient bubble, white bolt | `1 (4).png` |
| `pinterest.png` | Pinterest (certain) | red circle, white “P” | `3 (4).png` |
| `icon-47-purple-m.png` | unknown (likely Mastodon / Meetup) | purple dome “m” with three legs | `5 (3).png` |
| `google.png` | Google “G” (certain) | multicolor G | `11 (2).png` |

## 5 · Media, gaming & shopping

| Target file | Identification | Visual signature | Saved name |
|---|---|---|---|
| `icon-49-mark-dark-square.png` | unknown mark (pair of `icon-06`) — black square variant | black square, white outline, circle+bar+square | `8 (3).png` |
| `icon-50-headphones-dark.png` | unknown headphones brand (likely Beats/Sony-class) — dark variant | white over-ear headphones on black | `10 (1).png` |
| `icon-51-navy-b.png` | unknown (navy “B.” + cyan dot) | navy rounded square, white B, cyan dot | `6 (2).png` |
| `icon-52-red-burst.png` | likely Yelp | red pinwheel of rounded blades | `4 (4).png` |
| `icon-53-pink-f.png` | unknown (likely Foursquare / Flipboard-class) | hot-pink “F” outline in bubble/tag frame | `5 (4).png` |
| `icon-54-headphones-light.png` | unknown headphones (pair of `icon-50`) — light variant | black headphones on white rounded square | `2 (5).png` |
| `google-play.png` | Google Play (certain) | multicolor play triangle | `2 (6).png` |
| `amazon.png` | Amazon (certain) | black wordmark + orange smile | `4 (5).png` |
| `microsoft-store.png` | Microsoft Store (certain) | blue bag, four colored squares | `1 (5).png` |
| `icon-58-red-bag.png` | likely Shopee | orange/red bag, white smile handle | `3 (5).png` |
| `icon-59-pink-g.png` | likely Groupon (or Gumtree) | pink circle, black “G” | `5 (5).png` |
| `icon-60-green-video.png` | likely FaceTime (green video-call app) | green rounded square, white video camera | `1 (6).png` |
| `teams.png` | Microsoft Teams (certain) | purple “T” block + people | `2 (7).png` |
| `icon-62-blue-s.png` | likely Skype (modern) or Shazam | blue cloud shape, white “S” | `3 (6).png` |
| `playstation.png` | PlayStation (certain) | blue PS logo | `4 (6).png` |
| `steam.png` | Steam (certain) | dark circle, white piston mark | `12 (2).png` |

## 6 · Flower stickers — set B (3D emoji style)

| Target file | Identification | Visual signature | Saved name |
|---|---|---|---|
| `flower-petunia.png` | Petunia-like purple trumpets | two purple-violet blooms, green stem | `20 (1).png` |
| `flower-periwinkle.png` | Periwinkle/vinca-like | two pale-blue five-petal flowers with glowing centers | `18 (1).png` |
| `flower-orchid.png` | Pink orchid branch | pink orchid blooms on green stem | `19 (1).png` |
| `flower-tulips.png` | Tulips | yellow + orange tulips | `17 (1).png` |
| `flower-lotus.png` | Lotus / water lily | pink lotus with lily pads | `16 (1).png` |
| `flower-calla-lily.png` | Calla lilies | two yellow callas with leaves | `15 (1).png` |
| `flower-red-ginger.png` | Red ginger | red spiky bloom, green leaves | `12 (3).png` |
| `flower-echinacea.png` | Echinacea / coneflowers | two pink daisies with orange cone centers | `11 (3).png` |
| `flower-dandelion.png` | Dandelion seed heads | two white puffs + floating seeds | `13 (1).png` |
| `flower-crocus.png` | Crocus | single purple bloom | `8 (4).png` |
| `flower-plumeria.png` | Plumeria / frangipani | cream-yellow bloom + leaves on branch | `9 (1).png` |
| `flower-gerbera.png` | Gerbera daisies | two pink gerberas | `10 (2).png` |
| `flower-dahlia.png` | Dahlia | peach dahlia with dark center | `5 (6).png` |
| `flower-78-unidentified.png` | to identify at landing (attach list has 78 rows; one sticker not distinctly previewed) | — | `6 (3).png` |

Count: 20 + 10 + 5 + 13 + 16 + 14 = **78 files**.

## Integration notes (Android)

- All files are **transparent PNGs** — keep the alpha channel (PNG-32 or lossless WebP;
  never flatten or convert to JPEG). Copies into this folder are byte-identical; no
  resizing or re-encoding is applied.
- Brand logos are trademarks of their respective owners, provided as UI assets for this
  app. Flower stickers are decorative.
- Suggested resource mapping: `linkedin.png` → `ic_linkedin`,
  `flower-sunflowers-1.png` → `sticker_sunflowers_1`, `icon-47-purple-m.png` →
  `icon_47` (rename once identified).
- A generated contact sheet will be added here (`contact-sheet.png`) so the full set can
  be eyeballed at a glance.

## How the pixel files will land (any one of these)

1. **Re-attach in chat** — `/home/user/uploads/` now pre-created to test the sync.
2. **Download URL** — any zip/folder link I can `curl` (Google Drive public link, etc.).
3. **GitHub web upload** — drag the PNGs into this `app-logos/` folder on branch
   `arena/01a0df09-beacon`; I will rename/verify from there.
4. **Rebuild from official sources** — official brand marks + generated flower stickers
   (style will differ from these 3D emoji stickers).
