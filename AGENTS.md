<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project overview

This is the Next.js client for **ours.**, a private relationship dashboard for Trọng and Thanh. It uses the App Router, React client components, TypeScript, Leaflet, and JSON files for editable content. The UI supports English, Vietnamese, Japanese, Chinese, and German.

## Where things live

- `src/app/page.tsx`: application entry point.
- `src/app/layout.tsx`: document metadata and global stylesheet entry.
- `src/app/globals.css`: shared theme tokens, component styles, responsive layouts, and animations.
- `src/components/dashboard/ours-dashboard.tsx`: app shell, theme/language pickers, navigation, global dialogs, and memory actions. Keep feature content in its own panel component.
- `src/components/dashboard/home-panel.tsx`: relationship day counter, upcoming events, quotes, recent memories, and the home layout.
- `src/components/dashboard/location-map-card.tsx`: lazy-loaded Leaflet map and relationship location markers.
- `src/components/dashboard/random-date-panel.tsx`: date-idea filtering, location menu, daily non-repeating randomizer, and tick sound.
- `src/components/dashboard/memories-section.tsx`: memory carousel and full grid.
- `src/components/dashboard/letters-panel.tsx`: private letters, PIN gate, detail modal, and image viewer.
- `src/components/dashboard/whispers-panel.tsx`: private audio-message UI.
- `src/components/dashboard/music-player.tsx` and `music-context.tsx`: playlist controls and shared audio state.
- `src/components/dashboard/language-context.tsx`: supported locale strings and language state. Keep user-editable quote copy in `src/data/quotes.json`, not in this translation table.
- `src/app/api/`: server routes for music, letters, and whispers.
- `src/lib/`: small shared utilities and types such as locale-aware date formatting and memory records.
- `public/images/` and `public/audio/`: static media served by the app.

## Editable data

- `src/data/relationship.json`: names, relationship start date, map center/zoom/locations, and featured image path.
- `src/data/memories.json`: featured date and recent memory records.
- `src/data/random-dates.json`: date ideas, their supported locations, and image paths. Daily randomizer history is stored in browser localStorage and resets by local date.
- `src/data/quotes.json`: home-page quotes, grouped by display language.
- `src/data/upcoming-events.json`: upcoming relationship events.
- `src/data/welcome-modal.json`: welcome countdown enablement and target date/time.
- `src/data/letters.json`: private letter content and the PIN fallback. Do not copy private content into example files or client-side code.

Remove unused fields when editing data, and update consumers/types in the same change. Do not create example JSON files unless a real setup workflow needs them.

## Working conventions

- Keep feature logic in focused components; keep `ours-dashboard.tsx` as composition and shared app state rather than a catch-all.
- Use the existing language picker pattern (`theme-picker`, `theme-picker-menu`, `theme-picker-option`) for custom dropdowns. Avoid native `<select>` controls when consistent styling is required.
- Use `next/image` for content images where practical; give responsive images meaningful `sizes` and use `fill` only with a positioned container.
- Preserve Vietnamese combining marks. Normalize text with Unicode NFC when needed; never strip diacritics.
- Respect existing user/worktree changes. Never overwrite local secrets or private relationship content.
- Before changing Next.js APIs, read the matching guide under `node_modules/next/dist/docs/`.
- Validate with `npm run lint`, `npx tsc --noEmit`, and `npm run build` as applicable.
