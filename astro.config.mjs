// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Production domain — used for canonical URLs and Open Graph tags.
  site: 'https://frenchlakebuild.com',
  trailingSlash: 'never',
  build: { format: 'file' }, // /our-work -> our-work.html (clean URLs on Netlify)
  image: {
    responsiveStyles: false,
  },
});
