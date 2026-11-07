# French Lake Build Co. — website

Marketing site for French Lake Build Co., built from the Claude Design handoff (`design_handoff_flbc_website`).

- **Stack:** [Astro](https://astro.build) (static output) + plain CSS, self-hosted fonts (Marcellus, Mulish)
- **Hosting:** Cloudflare Workers static assets (fully static, free plan)
- **Inquiry form:** Buildertrend lead capture form, embedded
- **Pages:** `/` · `/our-work` · `/process` · `/start-a-project` (+ `404`)

## Run it locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # serve the built site
```

Node 22 recommended (pinned in `.node-version`, which Cloudflare's build uses).

## Deploy (Cloudflare)

The site is a Cloudflare Worker named `flbc-website`, connected to this GitHub repository. Every push to `main` builds (`npm run build`) and publishes automatically.

- **Settings:** `wrangler.jsonc` points Cloudflare at the built `dist/` folder, serves clean URLs (`/our-work`) and shows `404.html` for unknown pages. Keep `"name"` matching the Worker's name in Cloudflare.
- **Headers:** security headers and long-term caching for `/_astro/*` are in `public/_headers`.
- **Test with Cloudflare's runtime locally:** `npm run build` then `npx wrangler dev`.
- **Custom domain:** in Cloudflare, open the `flbc-website` Worker → **Settings → Domains & Routes → Add → Custom domain**, and add `frenchlakebuild.com` and `www.frenchlakebuild.com`. The domain's DNS must be on Cloudflare first. When moving DNS from Squarespace, keep the Google Workspace email records (MX, SPF TXT, `google._domainkey` TXT) and delete the Squarespace placeholder records.

## How the inquiry form works

The "Project inquiry" form on Home and Start a Project is **Buildertrend's lead capture form**, embedded in an iframe (`src/components/BuildertrendForm.astro`). Each submission goes straight into Buildertrend as a lead, with photos. Buildertrend handles validation, spam protection (Google reCAPTCHA) and new-lead notifications.

- **Fields, labels, required settings and dropdown options are managed in Buildertrend**, not in this code. Photos are intentionally required, so the team can assess a project before the first call.
- The form is served from buildertrend.net, so its inner styling can't be changed from this site. The panel around it (heading, photo note, fallback phone/email line) is ours.
- `btClientContactForm.js` from Buildertrend resizes the iframe to fit the form.
- If Buildertrend gives you new embed code (for example after regenerating it), replace `BT_FORM_URL` in `BuildertrendForm.astro`.

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
- [ ] Send a test inquiry with photos and confirm it shows up as a lead in Buildertrend
- [x] Connect frenchlakebuild.com to the Cloudflare Worker (email records confirmed intact); www redirects to the bare domain; Always Use HTTPS on
- [x] Delete the old Netlify site
- [x] `site` in `astro.config.mjs` is set to `https://frenchlakebuild.com`
- [ ] Re-enable DNSSEC: turn it on in Cloudflare first (DNS → Settings), then add the DS record at Squarespace
