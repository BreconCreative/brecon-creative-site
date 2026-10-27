# Brecon Creative site script

The site-wide JavaScript for breconcreative.com (Webflow, Lumos, Barba page transitions).

## Files

- `src/brecon-site.js` is the readable version. Make changes here.
- `dist/brecon-site.min.js` is the compressed version the website loads. It is rebuilt from `src` for every release.
- `webflow/head.html` and `webflow/footer.html` are copies of the site-wide custom code in Webflow, kept for history. The site does not load them. Webflow holds the live version: update the copy here whenever it changes.

## How the website loads it

Webflow > Site settings > Custom code > Head code, after the line that loads the libraries:

```html
<script defer src="https://cdn.jsdelivr.net/gh/BreconCreative/brecon-creative-site@COMMIT_ID/dist/brecon-site.min.js"></script>
```

`COMMIT_ID` is the full ID of the commit being released (40 characters, shown on GitHub under each commit). A commit ID can never change, so a pinned link always serves exactly the same file.

The libraries it needs (Barba, Lenis, GSAP with CustomEase and ScrollTrigger) load in the line above it, as one combined request.

## Releasing a change

1. Edit `src/brecon-site.js` and rebuild `dist/brecon-site.min.js`.
2. Commit and push.
3. In Webflow, swap the commit ID in the script link for the new one and publish to staging.
4. Test on staging. Publish to the live domain only once it is right.

The live site only changes when the commit ID in Webflow changes, so committing here never breaks the live site.

## Rolling back

Put the previous commit ID back in the Webflow script link and publish. The commit history on GitHub lists every release.

## Why the head code stays in Webflow

It has to arrive inside the page. The early script and the critical styles (no white flash between pages, intro text hidden until it animates in) would flash or hold up the first paint if they loaded as separate files. Button Roll is a component, but a few of its styles stay in the head: the hover colour mixes (Webflow's style panel cannot store `color-mix()`), the Glass variant's frosted finish and the rule that hides the icon when the Icon switch is off.

## Rules

- Never put passwords, API keys or private tokens in this repo. It is public, like any website's code.
- New features go in the function registry in the script, gated by a `data-` attribute, never as page-level embeds. Scripts inside a page do not run after a Barba page swap.
