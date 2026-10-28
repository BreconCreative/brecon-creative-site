# Geist subsets

Small WOFF2 subsets of Geist and Geist Mono arrows (such as →), cut from the `geist` npm package 1.8.2
(SIL Open Font License, see OFL.txt). The Fontsource Latin files leave arrows out. Glyph widths were checked
identical to the TTFs uploaded in Webflow. The head code loads them only on pages that use an arrow.

Made with `pyftsubset Geist-Variable.ttf --unicodes=<range> --flavor=woff2 --layout-features='*'`.
