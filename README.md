# LifeMaxxing

A cinematic, local-first personal operating system covering physique, looks, wealth, mind, social, and software projects. No accounts, no paid APIs. Everything stays on your device in IndexedDB.

## Run (Windows, macOS, Linux)

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

On Android, run `npm run dev -- --host` and open the printed network URL on your phone. Data lives per-browser, per-origin.

Production build: `npm run build && npm run preview`.

> The port is pinned to **5173**. IndexedDB is scoped per origin, so a changed port means an empty vault. Use **Settings → Export backup** regularly.

## What's inside

| Screen | Purpose |
|---|---|
| Home | Cinematic hero, 30-day objective, ≤3 daily priorities from the strategy engine, quick capture |
| PhysiqueMaxxing | Daily body log (weight/sleep/water/protein/kcal), workouts, trend charts |
| LooksMaxxing | Routines with 14-day check grid, standardized progress photos, before/after compare |
| WealthMaxxing | Actual ledger, forecasts (kept separate), FI path, skills, income projects |
| MindMaxxing | Missions with mandatory 5–15 min first action, steps, focus sessions, interruption log, blocker patterns, reading |
| SocialMaxxing | Self-chosen challenges, interaction log, initiative strip |
| Project Lab | Idea → prototype → active → shipped in one record; milestones, blockers, experiments, notes, linked missions |
| Evolution | Dated photo/milestone timeline, side-by-side and slider compare, weekly highlights |
| Progression | Levels, titles, skill trees, weekly challenges, personal milestones, weekly review, XP rules + ledger |
| Settings | Edit every onboarding choice, hero photo, JSON backup export/validated import, delete-all |

## Design rules encoded in the logic

- **XP is derived, not stored** (`src/lib/xp.ts`). Each reward is keyed by record id, so it pays once. Deleting or un-completing a record removes its XP. No streaks, no decay, no penalties.
- **Strategy engine** (`src/lib/strategy.ts`) is plain scoring rules. Every recommendation lists why it was picked and one immediate action. Inputs: importance, deadlines, area priority, postponements, energy, time budget, workload, neglected areas, open blockers.
- **Actual vs forecast money** never share a list or a chart series.
- No attractiveness scoring and no diagnoses. Photos are shown unaltered in compare mode.
- All imagery is generated SVG (`src/components/Plate.tsx`). There are no external assets. You can set your own hero photo locally.

## Tests

```bash
npm test   # node --test on the XP + strategy engines
```

## Data model and migrations

Types: `src/lib/types.ts`. Persistence: `src/lib/db.ts`. One `kv` store holds the state document and one `photos` store holds compressed JPEG blobs. When the state shape changes, bump `SCHEMA_VERSION` and append a function to `MIGRATIONS`. Backups go through the same migration path.
