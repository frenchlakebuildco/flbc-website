# French Lake Build Co. — website

Marketing site for French Lake Build Co., built from the Claude Design handoff (`design_handoff_flbc_website`).

- **Stack:** [Astro](https://astro.build) (static output) + plain CSS, self-hosted fonts (Marcellus, Mulish)
- **Hosting:** Netlify (static site + one serverless function for the inquiry form)
- **Pages:** `/` · `/our-work` · `/process` · `/start-a-project` (+ `404`)

## Run it locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # serve the built site
```

Node 20+ required (Netlify builds with Node 22).

## Deploy to Netlify

1. Push this folder to a GitHub repository.
2. In Netlify: **Add new site → Import an existing project**, pick the repo. Build settings come from `netlify.toml` (build `npm run build`, publish `dist`, functions `netlify/functions`).
3. Add environment variables (**Site configuration → Environment variables**), see `.env.example`:
   | Variable | Required | Notes |
   |---|---|---|
   | `RESEND_API_KEY` | yes | From [resend.com](https://resend.com) (free tier is plenty). |
   | `INQUIRY_FROM` | yes* | e.g. `French Lake Build Co. <website@frenchlakebuild.com>`. Verify `frenchlakebuild.com` in Resend (adds a few DNS records). |
   | `INQUIRY_TO` | no | Defaults to `hello@frenchlakebuild.com`. |
   | `PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | no | Cloudflare Turnstile spam check. Leave blank to rely on the honeypot + rate limit. |
4. Point the `frenchlakebuild.com` domain at Netlify (**Domain management**).
5. Send a test inquiry with a couple of photos and confirm it arrives.

## How the inquiry form works

- Shared component: `src/components/InquiryForm.astro` (Home and Start a Project use slightly different copy, per the design).
- Client logic: `src/scripts/inquiry.ts`, which handles inline validation (`aria-describedby` errors), drag-and-drop photos with thumbnails and remove buttons, a 10-photo / 10 MB-per-photo limit, and "Sending…" / success / failure states.
- Photos are **downscaled in the browser** (max 2000px JPEG) before upload so 10 phone photos fit within Netlify's ~6 MB function request limit. HEIC files that the browser can't decode are sent as-is.
- Server: `netlify/functions/inquiry.mjs` (served at `POST /api/inquiry`) re-validates everything, then emails the submission via Resend with photos attached and `Reply-To` set to the homeowner.
- Spam protection: hidden honeypot field, Netlify rate limit (5 per minute per IP), optional Turnstile.

## Editing content

| What | Where |
|---|---|
| Colors, type scale, buttons | `src/styles/global.css` |
| Header / utility bar / mobile menu | `src/components/Header.astro` |
| Footer | `src/components/Footer.astro` |
| Page copy | `src/pages/*.astro` |
| Gallery photos, order and alt text | `src/lib/work.ts` + `src/assets/work/` |

To add a photo: drop `work-35.jpg` into `src/assets/work/` and add `[35, 'Alt text']` to the list in `src/lib/work.ts`. Astro generates the responsive WebP/JPG sizes at build time.

## Phase 2: Meet the Team

On hold (see `MEET_THE_TEAM_LATER.md` in the design handoff). When it's ready: add `src/pages/meet-the-team.astro`, add the nav link in `Header.astro` (between Process and Start a project) and the footer "Firm" link in `Footer.astro`, and add the URL to `public/sitemap.xml`.

## Before launch

- [x] Success-message copy approved: "Thank you — we’ll be in touch within one business day."
- [ ] Set environment variables and verify the sender domain in Resend
- [ ] Send a test inquiry with photos
- [ ] Connect the domain; `site` in `astro.config.mjs` is set to `https://frenchlakebuild.com`
