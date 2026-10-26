# Brecon Creative site script

The site-wide JavaScript for breconcreative.com (Webflow, Lumos, Barba page transitions).

## Files

- `src/brecon-site.js` is the readable version. Make changes here.
- `dist/brecon-site.min.js` is the compressed version the website loads. It is rebuilt from `src` for every release.

## How the website loads it

Webflow > Site settings > Custom code > Head code, after the line that loads the libraries:

```html
<script defer src="https://cdn.jsdelivr.net/gh/BreconCreative/brecon-creative-site@v1.0.0/dist/brecon-site.min.js"></script>
```

The libraries it needs (Barba, Lenis, GSAP with CustomEase and ScrollTrigger) load in the line above it, as one combined request.

## Releasing a change

1. Edit `src/brecon-site.js` and rebuild `dist/brecon-site.min.js`.
2. Commit and tag a new version, for example `v1.0.1`.
3. In Webflow, change the version number in the script link and publish to staging.
4. Test on staging. Publish to the live domain only once it is right.

The live site only changes when the version number in Webflow changes, so committing here never breaks the live site.

## Rolling back

Change the version number in Webflow back to the last good release and publish.

## Rules

- Never put passwords, API keys or private tokens in this repo. It is public, like any website's code.
- New features go in the function registry in the script, gated by a `data-` attribute, never as page-level embeds. Scripts inside a page do not run after a Barba page swap.
