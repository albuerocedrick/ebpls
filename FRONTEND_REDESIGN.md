# Frontend Redesign — Neutral Zinc Design Language

A presentation-only pass across the public site, the auth screens, the shared UI
primitives, and the applicant / BPLO / barangay portals. **No business logic,
API contract, or database schema was changed.** Where a React correctness bug
was sitting in a file we were already editing, it was fixed and is called out
below.

- **Scope:** 55 files changed, 9 new files, 5 deleted.
- **Verification:** `npm run build` passes; ESLint clean on every file touched;
  80 automated browser checks via a Chrome DevTools Protocol harness.
- **Status:** uncommitted on the working tree.

---

## 1. Why this was needed

The app had three competing visual systems running at once:

| System | Where | Symptoms |
| --- | --- | --- |
| Violet-tinted CSS tokens | `assets/index.css` | every inherited text colour was slightly purple |
| Tailwind `gray-*` utilities | most screens | cool grey, clashing with the violet |
| Hue-coded status colours | badges, banners, timelines | blue / emerald / amber / red scattered per component |

Radii were equally inconsistent — `rounded-lg`, `rounded-xl`, `rounded-2xl`, and
`rounded-3xl` all appeared on sibling cards.

### The root cause we found

`src/assets/index.css` defined the entire token ramp at **hue 250, saturation
20%** — a violet bias:

```css
/* before */
--color-surface: 250 20% 98%;
--color-text:    250 20% 12%;
--color-border:  250 15% 86%;
```

Every element inheriting `--color-text` painted `rgb(27, 24, 37)` rather than a
neutral grey. **No amount of per-component class work could have fixed this** —
the harness kept reporting a non-neutral palette on pages whose markup was
already fully converted. Repointing the tokens at Tailwind's `zinc` ramp fixed
it globally:

```css
/* after */
--color-surface: 0 0% 98%;    /* zinc-50  #FAFAFA */
--color-text:    240 6% 10%;  /* zinc-900 #18181B */
--color-border:  240 6% 90%;  /* zinc-200 #E4E4E7 */
```

---

## 2. The design tokens

Anyone adding a screen should follow these.

**Colour — zinc only.** No blue, emerald, amber, or red anywhere in the UI.
Emphasis is carried by **fill weight**, not hue: hairline border → light fill →
solid `zinc-900`.

**Radii — two steps only.**
- `rounded-lg` (1rem) — cards, panels, modals
- `rounded-md` (0.5rem) — buttons, inputs, chips, icon boxes
- `rounded-full` — avatars and count bubbles only

Anything between `17px` and `500px` is a leftover and the harness fails on it.

**Borders.** `border-zinc-200` hairlines. Never a shadow where a hairline will do.

**Type.**
- Headings: `font-semibold tracking-tight`, never `font-bold` / `font-extrabold`
- Eyebrows and labels: `font-mono` uppercase at `text-[10px]`, `tracking-[0.12em]`–`[0.2em]`
- Numbers: `font-mono tabular-nums` so columns of figures align

**Motion.** `transition-colors duration-200 ease-out`, always with a
`motion-reduce:transition-none` guard.

**Focus.** `focus-visible:ring-2 focus-visible:ring-zinc-900` with
`ring-offset-2`. Inputs instead darken their border to `zinc-900` — a ring on a
field competes with the field's own outline.

---

## 3. What changed, by area

### 3.1 Design tokens — `src/assets/index.css`

Repointed `--color-surface`, `--color-surface-tint`, `--color-text`,
`--color-text-muted`, `--color-border`, `--color-border-dark` at the zinc ramp.
Single highest-leverage change in the whole pass.

### 3.2 Landing page

Navbar inverts dark → white on scroll. Full-bleed hero. Anchor links land 7px
under the sticky header. Zero horizontal overflow at 1440 and 390. Wordmark now
reads **BOSS** rather than "Liliw e-BPLS".

`Requirements.jsx` was rebuilt as a **working checklist** rather than a static
list: real `<input type="checkbox">` inside a `<label>` (`sr-only` + a
`peer-checked` custom box, so it stays keyboard-accessible), a per-column
`N of 5 READY` count in tabular figures, a hairline progress rail,
`localStorage` persistence under `ebpls:requirements-ready`, and a reset control
that only appears once something is ticked.

New sections: `AdvisoryBar`, `Assistance`, `LocalBusiness`, `ProcessTimeline`,
`Requirements`, `ServiceTasks`, `Updates`.
Removed: `AnnouncementsTicker`, `EventsSlider`, `Features`, `LiliwHeritage`.

### 3.3 Shared UI primitives — `components/ui/`

| File | Change |
| --- | --- |
| `Button.jsx` | `rounded-md`, `ring-2` focus, `active:scale-[0.98]` |
| `Input.jsx` | mono uppercase label; focus darkens the border instead of a 4px ring |
| `Card.jsx` | `rounded-lg`, `border-zinc-200`, `bg-surface` header/footer |
| `Select.jsx` | `rounded-md`, `zinc-900` selected row with a check |
| `Badge.jsx` | mono uppercase, zinc ramp with rings |
| `Modal.jsx` | `rounded-lg`, zinc borders |

> Restyling the primitives intentionally shifts **every** authenticated portal.
> This was a deliberate scope decision, not a side effect.

### 3.4 Auth screens

`AuthLayout` is a split screen: flat `zinc-950` panel on the left, form on the
right, wordmark pinned top and footer pinned bottom with the copy block
vertically centred between them.

`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifySuccess` all now
use a mono eyebrow, `text-xl font-semibold tracking-tight` heading, `rounded-md`
controls, and an outline secondary action. Success states use a small
`zinc-900` square with a white check instead of a green circle. Wordmark and
copy now say **BOSS**.

### 3.5 Applicant portal

`ApplicantLayout` header (now showing the **municipal seal** in place of an "eB"
monogram), `BottomNav` (hairline active indicator, mono tab labels), `Dashboard`,
`StatusTracker`, `UAFWizardScreen` stepper, all five UAF steps, `RetirementForm`,
`FeeSchedule`, and both payment result screens.

`StatusTracker`'s timeline now reads `zinc-900` filled → ringed → hairline
instead of emerald / blue / accent.

### 3.6 Shared components

- **`StatusBadge`** — progression by fill weight on a zinc ramp: `Draft` is a
  light hairline chip, `Completed` / `Issued` are solid `zinc-900`.
- **`ProcedureGuide`** and **`NotificationPopup`** — urgency is now a solid
  `zinc-900` panel plus a Lucide glyph and an eyebrow label, replacing
  blue / amber / green tinting. `NotificationPopup` gained an `emphasis` flag so
  "action required" notifications read heavier than status updates.
- **`DocumentUploadPanel`**, **`DraftResumePrompt`**, **`LogoutConfirmModal`**,
  **`NotificationBell`** — same tokens.

### 3.7 Portal shell — admin / BPLO / treasury / barangay

`Sidebar` is `bg-zinc-950` with a `border-zinc-800` right edge and `rounded-md`
rows. The active row is a filled `zinc-800` block with a **hairline white left
marker**, replacing a translucent `white/10` pill. Section labels are mono
uppercase. The brand block is exactly `--navbar-height` tall so it lines up with
the top bar, and the nav carries `pt-4` so the first item is no longer flush
against the brand hairline.

`Navbar` now starts *after* the sidebar on `lg`
(`lg:left-[var(--sidebar-width)]`) rather than spanning full width and
translucently overlapping the sidebar's own brand.

### 3.8 Admin screens

`AuditLogs` fully converted, including the **Immutable Log Record** modal:
`rounded-lg` panel, `bg-zinc-50` header with a mono eyebrow, a proper `X` icon
button, and before/after JSON in hairline-marked zinc blocks instead of
red/green tinted boxes.

### 3.9 BPLO and barangay dashboards

Stat cards now use the applicant dashboard's card shape: value and mono label on
the left, `rounded-md` bordered icon box on the right. On hover the border lifts,
the surface goes `zinc-50`, and the icon box inverts to solid `zinc-900`.

The BPLO status filter was a raw `<select>` with a blue focus ring — it now uses
the shared `Select`, so every dropdown in the app behaves identically.

`SplitScreenVerifier`'s inline `StatusDropdown` was aligned to `Select`:
`rounded-md` trigger, border darkening to `zinc-900` when open, matching panel
shadow, `zinc-900` selected row with a check, and **Escape-to-close, which it
was missing**. Its flip-up logic now measures actual panel height instead of a
hardcoded `200px`.

---

## 4. Bugs found and fixed

These were pre-existing. They surfaced because we were reading the files
closely.

### Admin and BPLO pages were cut off on the left

`isSidebarOpen` in `UIStore.js` defaulted to `true` at every screen size. Below
`1024px` the sidebar renders as an overlay drawer, but the layouts were
unconditionally shifting content right by `--sidebar-width` (240px) through an
inline `marginLeft`. So on a narrow window the drawer **covered** the content
*and* the content was **pushed 240px right** — its left edge ran off screen.

```js
// before
isSidebarOpen: true,

// after
isSidebarOpen: typeof window === 'undefined' ? true : window.innerWidth >= 1024,
```

All four portal layouts also moved from an inline `marginLeft` to a
`lg:ml-[var(--sidebar-width)]` class, so below `lg` there is no offset at all.

### Mojibake in the auth panel

The em-dash and `©` in the left panel rendered as `â€"` and `Â©` — the file had
been written back as Windows-1252 at some point, double-encoding those glyphs.
They are now `&mdash;` and `&copy;` entities and the file is verified **pure
ASCII**, so an editor cannot re-corrupt them.

### An invisible photograph

The auth panel's municipal hall `<img>` sat at `-z-20` while the panel's own
`bg-zinc-950` painted over it — it never rendered. Removed it and both redundant
gradient overlays; the panel is now genuinely just a flat dark field.

### React correctness

- `ResetPassword` — read the Supabase hash token via a `useState` initialiser
  instead of `setState` inside an effect.
- `FeeSchedule`, `AuditLogs`, `bplo/Dashboard`, `ClearanceQueue` — fetches moved
  inside their effects with a `cancelled` guard, so no state is written
  synchronously in an effect body (`react-hooks/set-state-in-effect`).
- `bplo/Dashboard` — the "over 2 days old" marker called `Date.now()` during
  render. That timestamp is now captured into state when the queue loads
  (`react-hooks/purity`).
- Cleared unused `React` imports, unused catch bindings, and an unused
  `navigate` across every file touched.

### Auth layout alignment

Two separate problems, one per axis. Vertically, the copy sat 17px high because
a `flex-1` child centres against the space between its siblings, and the
wordmark row is 32px tall while the footer is ~15px — fixed with `min-h-8` on
the footer. Horizontally, `max-w-md` left the block 48px from the left but 109px
from the right; switched to `w-full` so the gutters are symmetric **and** the
copy's left edge still lines up with the wordmark and footer. Measured delta is
now `0px` on both axes.

---

## 5. Verification

No test runner or browser driver is installed, so we drove headless Chrome
directly over the **DevTools Protocol** using Node 22's global `WebSocket` and
`fetch` — zero new dependencies.

| Harness | Coverage | Result |
| --- | --- | --- |
| Landing + auth | palette neutrality, radius scale, overflow, mobile wordmark, focus neutrality, console errors — at 1440×900 and 390×844 | **26 / 26** |
| Portal shell | 16 routes (all admin, BPLO incl. split-screen verifier, treasury, barangay) × 1440 / 1024 / 390 | **48 / 48** |
| Auth geometry | copy-block centring at 1440 / 1280 / 1920 on `/login` and `/register` | **6 / 6** |

The palette check walks **every painted element** and reads its computed colour,
flagging any channel spread over 12 — a stray hue cannot hide in a class we
forgot to grep for.

### A false pass worth knowing about

The portal harness first reported **24/24 green**. Every one of those was
actually a redirect to `/login`: `apiClient` force-redirects on any 401, so a
faked token was not enough to reach the shell. Fixed by stubbing `/api/*` with
CDP `Fetch.fulfillRequest` **and** adding an assertion that the URL did not
change. A similar gap hid the auth misalignment for a round — the check only
measured the vertical axis and reported "centred" while the horizontal gutters
were off by 61px.

**Takeaway for the team:** a green check is only as good as its assertions.

---

## 6. Known gaps

Honest list of what is **not** done.

### Screens still on the old styling

The shell around them is consistent and their dropdowns use the shared `Select`,
but their own cards and tables still use `gray-*` and `rounded-3xl`:

| Screen | Occurrences |
| --- | --- |
| `admin/AdminDashboard` | 45 |
| `admin/ApplicationExplorer` | 36 |
| `treasury/RetirementAssess` | 36 |
| `admin/MasterData` | 34 |
| `barangay/ClearanceQueue` (list rows / modal) | 34 |
| `admin/EmailLogs` | 31 |
| `bplo/RetirementQueue` | 31 |
| `treasury/CashierPOS` | 27 |
| `treasury/AssessmentGrid` | 25 |
| `admin/UsersManagement` | 25 |
| `admin/DocumentBuilder` | 23 |
| `bplo/CompletedQueue` | 21 |
| `treasury/AssessmentQueue` | 19 |

### Pre-existing lint errors we did not touch

`InteractiveLocationPin`, `NotificationBell` (three `react-hooks/purity` from
`Date.now()` in `formatRelativeTime`), `NotificationPopup`, plus the same
`set-state-in-effect` in each screen listed above. Fixing them changes
behaviour, so they were left alone deliberately.

### Not verified against real data

The portal harness stubbed `/api/*` with empty arrays, so **every portal page
was verified in its empty state only**. Geometry is confirmed; these layouts
have not been seen with real rows in them.

### Content and data

- The barangay dashboard's two counters both read `filteredClearances.length`,
  so they always show the same number. Pre-existing; needs a decision on what
  "action needed" should count.
- Placeholder figures in `LocalBusiness` (`1,400+ / 33 / 24hrs`) and the
  `AdvisoryBar` renewal dates need BPLO confirmation.
- Migrations `036_fee_schedule` → `041_cert_ready_notification` are unapplied.
  `npm run db:push` writes to the shared Supabase project, so it needs sign-off
  before anyone runs it. Until then the fee schedule may render its empty state.
- `ebpls-server/.env` mail keys were not inspected.

---

## 7. Running it

```bash
# API — port 5000
cd ebpls-server
npm start

# Frontend — port 5173
cd ebpls-frontend
npm run dev
```

Then: <http://localhost:5173/>

| Route | What to look at |
| --- | --- |
| `/` | landing page, navbar dark → white on scroll |
| `/login`, `/register` | auth split screen; resize past 1024px to see the panel hand off to the mobile wordmark |
| `/applicant/dashboard` | action cards, municipal seal in the header |
| `/applicant/status` | zinc timeline, status badges |
| `/bplo/dashboard` | stat cards with hover, status filter dropdown |
| `/bplo/verify/:appNo` | split-screen verifier, inline status dropdowns |
| `/admin/audit-logs` | table plus the Immutable Log Record modal |
| `/barangay/queue` | stat cards, filter dropdowns |

Worth checking specifically: **tab through the login form** — inputs darken their
border rather than drawing a blue ring, and buttons take a `zinc-900` ring. That
was previously an accent-blue ring from the global `*:focus-visible` rule.

---

## 8. Working notes

Practical things learned that will save the next person time.

- **The `.env` files were never read** and no secrets appear in any diff.
- The editor tool rejects very large single writes. Sequential line-number
  inserts drift against stale numbers and corrupt files. For a large rewrite,
  write numbered chunks then concatenate.
- PowerShell will silently write files as Windows-1252. Any file with non-ASCII
  glyphs is at risk — prefer JSX entities (`&mdash;`, `&copy;`) in JSX text.
- All harness scratch directories (`.tmpcheck`, `.tmpshell`, `.tmpalign`,
  `.tmpdiag`, `.tmpauth`) and their Chrome profiles have been deleted, and the
  harness Chrome processes killed.

---

## 9. Suggested next steps

1. Convert the 13 remaining screens in §6 — mechanical now that the tokens and
   primitives are settled.
2. Re-run the portal harness against a seeded database so the layouts are
   verified with real rows, not just empty states.
3. Decide what the barangay "action needed" counter should measure.
4. Get BPLO sign-off on the placeholder figures, then apply migrations 036–041.
5. Address the pre-existing `set-state-in-effect` and `purity` errors as a
   separate, behaviour-aware pass.



