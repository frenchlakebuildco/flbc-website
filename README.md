# French Lake Build Co. — website

Marketing site for French Lake Build Co., built from the Claude Design handoff (`design_handoff_flbc_website`).

- **Stack:** [Astro](https://astro.build) (static output) + plain CSS, self-hosted fonts (Marcellus, Mulish)
- **Hosting:** Netlify (fully static)
- **Inquiry form:** Buildertrend lead capture form, embedded
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
2. In Netlify: **Add new site → Import an existing project**, pick the repo. Build settings come from `netlify.toml` (build `npm run build`, publish `dist`). No environment variables are needed.
3. Point the `frenchlakebuild.com` domain at Netlify (**Domain management**) and make sure **Visitor access** is public.

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
- [ ] Make Visitor access public in Netlify
- [ ] Connect the domain; `site` in `astro.config.mjs` is set to `https://frenchlakebuild.com`
