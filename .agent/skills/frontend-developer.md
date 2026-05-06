---
name: ebpls-frontend
description: Defines strict development rules for the eBPLS React.js + Tailwind CSS frontend. Use this skill when building the UAF wizard, Cashier POS, Leaflet maps, and applying UI/UX and Performance policies.
---

# Frontend Framework Rules
* Use React.js + Tailwind CSS with Zustand for state management[cite: 2].
* **Module UI Requirements:** The Applicant interface must be mobile-first[cite: 2]. The Treasury interface must be a Desktop POS-like panel with high contrast[cite: 2].
* **Map Integration:** Use Leaflet.js + OpenStreetMap for the interactive business location pinning[cite: 2].

# POLICY: Performance-First Development
* **Memoization:** Use `useMemo` for expensive derived values. Use `useCallback` to cache event handler references. Do not memoize by default.
* **Render Hygiene:** Never use `Array.sort()`, `JSON.parse()`, or DOM queries directly in the render body.
* **Waterfall Prevention:** Never trigger a fetch inside a `useEffect` that depends on the result of another fetch. Use React Query or SWR.

# POLICY: Anti-Generic UI/UX Design Enforcement
* **FORBIDDEN: Nested/Double-Layer Cards.** Never nest a card inside a card with similar backgrounds. Inner elements must have a distinctly different surface (e.g., tinted block).
* **FORBIDDEN: Invisible Borders.** Border color lightness must be at least 10% darker than the background color. 
* **FORBIDDEN: Emoji Icons.** Use Lucide, Heroicons, or Radix Icons. Never use emojis (✅ 🛡️) in UI.
* **FORBIDDEN: Em Dashes in UI.** Do not use "—" in interface labels. Use colons or structural layout.
* **FORBIDDEN: Generic Color Abuse (60-30-10 Rule).** 60% dominant neutral (canvas), 30% secondary neutral/tint, 10% full-saturation brand accent (CTAs only). No rainbow grids.
* **FORBIDDEN: Poor Gradients.** Use 1-2 colors max. Hue shift must be within 40 degrees on the color wheel.
* **REQUIRED: Subtle Shadows.** Apply `--shadow-sm` at rest, `--shadow-md` on hover. Never use completely flat cards or aggressively dark shadows (`rgba(0,0,0,0.4)`).
* **REQUIRED: Border Radius Nesting Rule.** Outer container radius = Inner element radius + the padding gap between them.
* **REQUIRED: Minimum Animation.** Base UI elements must use CSS transitions for color, background-color, border-color, shadow, and transform. Hover states must scale/translate slightly.
* **REQUIRED: Global Token System.** All sizes, radius, colors, and shadows must be referenced from `:root` CSS variables. No inline magic numbers.