# CSP Analysis: Why `unsafe-inline` and `unsafe-eval` Are Currently Required

## Current CSP Header (from `src/middleware.ts`)

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

---

## What Requires `unsafe-inline` in `script-src`

### 1. **Recharts** (`recharts` v2.x)
Recharts generates SVG charts and injects inline event handlers (`onclick`, `onmouseover`, etc.) into SVG elements at runtime. This is a known limitation — Recharts does not support nonce-based CSP. Every tooltip, click handler, and animation callback within the chart library uses inline script attributes on DOM elements.

### 2. **Framer Motion** (`framer-motion` v12.x)
Framer Motion uses inline styles extensively for animations and injects style strings directly into DOM nodes. While it primarily affects `style-src`, it also relies on the browser's ability to execute animation-related JavaScript that may be serialized inline by React's hydration process.

### 3. **`dangerouslySetInnerHTML` Usage (3 files)**
- **`src/components/ui/chart.tsx`** (line 83): The shadcn/ui chart component injects a `<style>` tag with dynamically generated CSS custom properties (`--color-*`). While this primarily affects `style-src`, the pattern of injecting raw HTML demonstrates the app's reliance on runtime-generated markup.
- **`src/components/views/ortu-new-views.tsx`** (line 1296): AI-generated recommendations rendered via `DOMPurify.sanitize()` into `dangerouslySetInnerHTML`. This is already mitigated with DOMPurify.
- **`src/components/views/siswa-ai-views.tsx`** (line 409): AI chat messages rendered with markdown → HTML via `DOMPurify.sanitize()`. Same mitigation.

### 4. **Next.js Development Mode**
Next.js in development mode injects the HMR (Hot Module Replacement) client script inline. While this doesn't apply to production builds, it contributes to the current need for `unsafe-inline` during development.

---

## What Requires `unsafe-eval` in `script-src`

### 1. **No Direct `eval()` Calls Found**
Searching the entire `src/` directory for `eval(` and `new Function(` yielded **zero results**. The application code itself does not call `eval()`.

### 2. **Recharts (Indirect)**
Recharts internally may use `eval()`-like patterns or dynamic code generation for certain chart computations and dynamic property access. This is a known issue reported against Recharts in CSP-strict environments.

### 3. **Next.js Build Output**
Next.js generates bundled JavaScript that may contain patterns requiring `eval`-equivalent functionality, particularly around dynamic imports and code splitting. The webpack/turbopack bundle can produce code that the browser interprets as needing eval-like capabilities.

---

## What Requires `unsafe-inline` in `style-src`

### 1. **shadcn/ui Theming via CSS Variables**
The shadcn/ui design system uses HSL CSS custom properties (`hsl(var(--background))`, etc.) defined in inline `<style>` tags. The `chart.tsx` component dynamically generates entire `<style>` blocks at runtime.

### 2. **Tailwind CSS Runtime Classes**
Tailwind CSS 4 generates utility classes at build time, but dynamic class composition (e.g., `bg-primary/50`, conditional classes via template literals) can result in styles that the Tailwind compiler can't statically extract. The `tailwind.config.ts` has no `safelist`, which is fine — but dynamic class names in JSX may still cause Tailwind to emit inline style fallbacks.

### 3. **Framer Motion Inline Styles**
Framer Motion sets `transform`, `opacity`, and other properties as inline styles on animated elements. This requires `style-src 'unsafe-inline'` unless all animation values are pre-declared in CSS.

### 4. **20+ Components with Inline `style` Objects**
At least 20 component files use React's `style={{...}}` prop for dynamic positioning, sizing, and theming. React compiles these to inline `style` attributes on DOM elements, requiring `style-src 'unsafe-inline'`.

---

## Is Nonce-Based CSP Feasible?

### `script-src` — Partially Feasible
- **Can be nonced**: Application-specific code bundled by Next.js can use nonces if the `<script nonce="...">` attribute is injected server-side. Next.js supports this via `headers()` in `next.config.js`.
- **Cannot be nonced ( blockers)**:
  - **Recharts**: Does not support nonce propagation to dynamically created elements. Would need to be replaced with a CSP-compatible chart library (e.g., ECharts with CSP mode, or hand-rolled SVG).
  - **Framer Motion**: Some animation paths may work with nonces, but edge cases with dynamic callbacks would break.

### `style-src` — Difficult
- The shadcn/ui chart component generates `<style>` tags with `dangerouslySetInnerHTML`. Noncing `<style>` tags is possible but requires refactoring the component to inject a nonce.
- 20+ components using inline `style={{}}` would need to be migrated to CSS classes. This is a significant refactor.
- **Hash-based CSP for styles** is more feasible than nonces here, but still requires tooling changes.

### `unsafe-eval` — Should Be Removable
- Since no direct `eval()` calls exist in the codebase, `unsafe-eval` could potentially be removed if the Recharts dependency is addressed. Testing would be required to confirm no indirect usage.

---

## Risk Assessment

| CSP Directive | Current Setting | Risk Level | Primary Cause |
|---|---|---|---|
| `script-src 'unsafe-inline'` | **HIGH** risk | Recharts, Next.js HMR | Enables XSS if any injection point exists |
| `script-src 'unsafe-eval'` | **MEDIUM** risk | Likely Recharts/Next.js bundler | Enables dynamic code execution |
| `style-src 'unsafe-inline'` | **LOW** risk | shadcn/ui, Framer Motion, inline styles | CSS injection possible but low exploit value |

### Key Findings
1. **`dangerouslySetInnerHTML` is already sanitized** with DOMPurify in 2 of 3 cases (AI content rendering). The chart.tsx usage injects CSS only, not scripts — lower risk.
2. **No inline event handlers** (`onclick`, `onchange`, `onsubmit`) were found in component JSX — all interaction is via React's synthetic event system, which is good.
3. **The `tailwind.config.ts` has no `safelist`**, which means no dynamic Tailwind classes require inline style fallbacks for that reason.
4. **The biggest blocker to tightening CSP is Recharts**. Replacing it or configuring it for strict CSP would be the highest-impact improvement.

### Recommended Path to Strict CSP
1. **Short term**: Keep current CSP. The DOMPurify sanitization on AI-rendered content mitigates the highest-risk vectors.
2. **Medium term**: Replace Recharts with a CSP-compatible library, then remove `unsafe-eval` and test removing `unsafe-inline` from `script-src`.
3. **Long term**: Refactor `chart.tsx` to use nonce-based `<style>` tags, migrate inline `style={{}}` to CSS classes, and implement full nonce-based CSP via Next.js headers.
