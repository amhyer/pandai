# Bundled Geist fonts

These are the Latin, normal-style, variable-weight (100–900) WOFF2 fonts shipped by:

- `@fontsource-variable/geist@5.3.0`, `files/geist-latin-wght-normal.woff2`
- `@fontsource-variable/geist-mono@5.3.0`, `files/geist-mono-latin-wght-normal.woff2`

Source packages: https://www.npmjs.com/package/@fontsource-variable/geist and https://www.npmjs.com/package/@fontsource-variable/geist-mono.

Both are distributed under the SIL Open Font License 1.1; the original license files are included alongside the fonts. These font files are unmodified.

`src/app/layout.tsx` loads them through `next/font/local`. This preserves the existing Geist styling and CSS variables while eliminating Google Fonts requests during build and runtime. The npm packages are not runtime dependencies, and no download step is required to build the app.
