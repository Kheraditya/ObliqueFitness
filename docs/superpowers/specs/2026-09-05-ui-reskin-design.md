# UI Reskin: Match Hevy Reference — Design Spec

**Status**: Approved for planning
**Date**: 2026-09-05
**Type**: Bounded (restyle of existing screens; large surface area, executed with plan+SDD rigor for quality control)

## 1. Purpose

The app was built without its visual reference in context for most of its build (an image-attachment/summarization gap), so it drifted far from the Hevy design it was meant to follow. The user supplied 10 reference screenshots and asked for pixel-faithful matching. This spec captures the design tokens and shared components extracted from those screenshots, to be applied across every existing screen.

**Confirmed decisions** (from user Q&A):
- Home screen has no 1:1 Hevy reference in the 10 screenshots — apply the same visual language (dark cards, real icons, spacing) to the existing Home layout rather than inventing new content.
- Full reskin in one pass across every screen, not staged.

**One real bug found independent of the reference**: the bottom tab bar has no `tabBarIcon` configured at all (renders as broken "X" placeholders) and `@expo/vector-icons` isn't installed.

## 2. Design tokens (extracted from reference)

Existing `src/theme/index.ts` tokens (`colors.background` #000000, `colors.surface` #1C1C1E, `colors.accent` #0A84FF, `colors.textPrimary`/`textSecondary`, `spacing`, `radius`) already match the reference closely — no token value changes needed. What's missing is component coverage, not token values.

## 3. New/extended shared components

- **Tab bar icons**: `@expo/vector-icons`'s `Ionicons` (bundled with Expo, install via `npx expo install @expo/vector-icons`). Home tab = `home`/`home-outline`, Workout tab = `barbell`/`barbell-outline`, Profile tab = `person`/`person-outline`. Active tab gets a pill-shaped highlight behind the icon (`colors.surfaceElevated` background, `radius.full`), matching the reference's highlighted Workout/Profile tab icons.
- **`Button` extended**: new `variant="dark"` (solid `colors.surface` background, `colors.textPrimary` text, no border) and an optional `icon` prop (an Ionicons name, rendered left of the label) and `align` prop (`'center' | 'left'`, default `'center'`) for the "Start Empty Workout" / "+ Add Set" style (dark pill, leading icon, left-aligned text) as distinct from the existing `secondary` variant (transparent, blue text, centered — used for plain text links like "New Routine" is NOT this; re-examine: "New Routine"/"Explore" are 2-column dark cards, closer to a new `DashboardTile` primitive, not `Button`).
- **`DashboardTile`** (new component, `src/components/DashboardTile.tsx`): a dark (`colors.surface`) rounded (`radius.m`) card sized for a 2-column grid, icon (Ionicons) + label, tappable. Used for Workout tab's "New Routine"/"Explore" pair and Profile's "Statistics"/"Exercises"/"Measures"/"Calendar" 2x2 grid.
- **`PillTabs`** (new component, `src/components/PillTabs.tsx`): horizontal row of pill buttons, one active. Active = `colors.accent` fill + white text; inactive = `colors.surface` fill + `colors.textSecondary` text. Takes `options: {key, label}[]`, `value`, `onChange`. Used for: exercise Summary tab's metric switcher, Profile's Duration/Volume/Reps, Routine detail's Volume/Reps/Duration.
- **`ListItem`** (new component, `src/components/ListItem.tsx`): a row with an optional leading element (icon name OR image `uri`), a title, an optional gray subtitle, and an optional trailing element (`'chevron'` | a literal string value | nothing). Bottom border divider. Used for: exercise picker's exercise rows (thumbnail + name + muscle group + chevron), Measures' history rows (date + value, no icon/chevron), routine detail's exercise rows.

## 4. Screen-by-screen changes

Each screen keeps its existing data-fetching logic untouched — this is a presentation-layer reskin only, no behavior changes beyond what's specified.

1. **Tab bar** (`app/(member)/_layout.tsx`): add `tabBarIcon` per screen using `Ionicons`, add the active-pill background via `tabBarActiveBackgroundColor`-equivalent custom icon wrapper (React Navigation's bottom tabs don't support that prop directly — implement via a custom `tabBarIcon` that wraps the icon in a `View` with conditional background).
2. **Active Workout + SessionExerciseCard**: SET/KG/REPS column headers, numbered set badge (dark rounded square with the set number), bordered input boxes with visible `placeholderTextColor`, dark `Button` (`variant="dark"`, icon `add`) for "Add Set" instead of the current `secondary` variant.
3. **Workout tab**: "Start Empty Workout" → `Button variant="dark" icon="add" align="left"`. "New Routine"/"Explore" → `DashboardTile` pair. Routine cards keep their existing shape but the "Start Routine" button becomes full-width `Button variant="primary"` (already is) — main fix is the empty-workout button and the New Routine/Explore pair.
4. **Routine detail**: "Start Routine" stays `variant="primary"`, add `PillTabs` for the chart metric row (Volume/Reps/Duration — currently just a static chart, this is additive UI matching the reference; the chart itself can stay wired to volume-only data since that's the only computed metric, so Reps/Duration tabs can be presentational until a later phase adds those computations — note this explicitly, don't silently fake data). Exercise rows use `ListItem`.
5. **Exercise picker**: search bar and filter-chip styling already close to reference; convert the exercise list rows to `ListItem` (thumbnail image + name + muscle group + chevron).
6. **Exercise detail SummaryTab**: convert the PR rows (Heaviest Weight/Best 1RM/Best Set Volume/Best Session Volume) to `ListItem` with trailing value. Add `PillTabs` above the PR list for a metric switcher — presentational only (data underneath doesn't change), matching reference's segmented row; note as presentational, not a functional filter, since building per-metric chart filtering is out of scope for a visual reskin.
7. **Profile**: 2x2 dashboard grid → `DashboardTile`s (4 of them: Statistics, Exercises, Measures, Calendar — Calendar stays disabled). Keep the existing avatar-less simple header (no avatar upload feature exists — don't fake one).
8. **Statistics**: restyle existing heatmap+list wrapper spacing/headers to match card conventions; no new non-functional list items (adding disabled rows for unbuilt features like "Monthly Report" is scope creep beyond a visual reskin of what exists — explicitly deferred).
9. **Measures**: convert the history list to `ListItem` rows (date left, value right, no icon/chevron).
10. **Home**: restyle stat tiles using the same dark-card convention as `DashboardTile` (reusing the component where the shape fits), keep existing muscle-balance bar list.

## 5. Explicitly out of scope

- Any new data/computation (Reps/Duration chart metrics, avatar upload, Calendar screen, Monthly Report, Leaderboard Exercises, Set-count-per-muscle-group) — this is a visual reskin of screens that already exist, not new features.
- Anatomically detailed body illustrations replacing the existing stylized `MuscleHeatmap` SVG — that was a deliberate, already-reviewed scope decision from Phase 3; revisiting it is a separate, larger request the user hasn't made.
