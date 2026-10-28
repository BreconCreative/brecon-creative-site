# Geist subsets

Small WOFF2 subsets of Geist and Geist Mono (SIL Open Font License, see OFL.txt) for the characters the
Fontsource Latin files leave out. The head code loads them only on pages that use those characters.

- `*-arrows-*`: arrows such as →, cut from the `geist` npm package 1.8.2.
- `*-extra-*`: every other glyph outside Latin and Latin Extended (Greek, Cyrillic, symbols).

Made with `pyftsubset Geist-Variable.ttf --unicodes=<range> --flavor=woff2 --layout-features='*'`.
