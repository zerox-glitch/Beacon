# QRWho

QRWho — turn any picture into a working QR code. 152 presets, live
styling, scan-check, PNG export. Built with TanStack Start + Vite + Nitro,
React 19, Tailwind v4. All QR work happens in the browser (no database, no
auth required).

## Develop

```sh
npm install
npm run dev        # serves 0.0.0.0:8080
npm run typecheck  # tsc --noEmit
npm test           # node test runner suites
npm run build      # production build -> .vercel/output (Vercel Build Output API)
```

## Host it for free

The production build emits the **Vercel Build Output API** (`.vercel/output`),
so Vercel is the zero-config home for this app.

### Vercel (recommended, free Hobby plan)

The app lives at the repo root and `vercel.json` pins the build config
(Framework "Other", `npm run build`, and `outputDirectory: null` so Vercel
consumes the Build Output API in `.vercel/output` — leave the dashboard
Output Directory **empty/unset**).

1. Push this repo/branch to GitHub.
2. On vercel.com: **Add New → Project**, import the repo.
3. Set **Production Branch** to the branch that contains the app
   (e.g. `arena/01a0b73c-beacon`, or `main` after merging the PR), and make
   sure **Root Directory** is left unset (repo root).
4. Deploy — no environment variables needed (auth + database are off).

The free tier includes SSR serverless functions, HTTPS, CDN and preview
deployments (~100 GB bandwidth/month).

### Other free tiers (small config change)

- **Netlify (free)**: switch the Nitro preset in `vite.config.ts` to
  `netlify`, build command `npm run build`. Free tier: 100 GB bandwidth.
- **Cloudflare Pages (free)**: switch the Nitro preset to
  `cloudflare_module`. Free tier: unlimited bandwidth, 100k requests/day.
- **Render (free web service)**: needs a `node-server` preset and suffers
  cold starts — usable, not "perfect".
- **GitHub Pages**: static-only; this app is SSR — not suitable as-is.
