# Series Book Studio Architecture

## Purpose

Series Book Studio is a full-page planning and production workspace inside Book Publishing Studio. It coordinates seasons and episodes while keeping each manuscript as a normal `Book`. The normalized series records are authoritative for planning; `BookSeriesConfig` remains a compatibility and Reader projection.

## Domain Model

- `SeriesProject` owns identity, foundation, Story Bible summary, structure targets, release model, and asset references.
- `SeriesSeason` owns season-level dramatic structure and release planning.
- `SeriesEpisode` owns episode planning, deadlines, ordering, status, and an optional logical `linkedBookId`.
- `SeriesStoryArc` references an existing Book character by ID and stores series participation and transformation.
- `SeriesTimelineEvent` stores story order, optional season/episode links, characters, location, consequences, and continuity notes.
- `SeriesContinuityRule` stores explicit canon without changing manuscript content.
- `SeriesLocation` and `SeriesObject` are normalized Story Bible entities with logical links to characters, episodes, and assets.
- `SeriesRelationship` stores character-to-character state and changes without copying character records.
- `EpisodeProductionChecklist` records editorial, commercial, signing-review, and publication gates.

All lifecycle and publication statuses are TypeScript string unions. JSON columns are used only for bounded lists such as IDs or milestones; the series aggregate is never stored as a single JSON document.

## Database Tables

Migration version 3 creates:

- `series_projects`
- `series_seasons`
- `series_episodes`
- `series_story_arcs`
- `series_timeline_events`
- `series_continuity_rules`
- `series_locations`
- `series_objects`
- `series_relationships`
- `series_episode_checklists`

`PRAGMA foreign_keys = ON` is enabled before migrations and writes. Series-owned records cascade when the series is explicitly deleted. Season deletion is restricted while episodes exist. Checklist deletion follows its episode. Book, character, chapter, and asset references are logical references because those records can outlive a series plan.

The database enforces unique season numbers per series and unique episode numbers per season. Reordering updates explicit `order_index` values in one transaction.

## Lifecycle

1. The seven-step creation workspace gathers identity, foundation, structure, Story Bible, cast links, release strategy, and review data.
2. `createSeriesWithStructure` inserts the project, planned seasons, episodes, and checklists in one SQLite transaction.
3. Editors plan episodes with debounced autosave, a visible dirty/saving/error state, explicit retry, and last-saved time.
4. Production checklists and readiness gates track content, commercial, security, and published states separately.
5. Publishing remains an existing Book Studio and data-pack workflow.

## Linked Books

`createLinkedBookFromEpisode` creates a normal local `Book` and links it in the same transaction. The book includes:

- projected series, season, and episode metadata;
- a "Previously On" chapter;
- an episode manuscript chapter;
- a next-episode teaser chapter.

Linking an existing book updates its compatibility `BookSeriesConfig` and the episode link transactionally. Unlinking clears only `linkedBookId`; it never deletes the book. Studio actions navigate to the existing manuscript, covers, publishing/pricing, or marketing tab.

## Deletion Rules

- Series deletion requires an explicit confirmation argument and deletes only series-owned records.
- Empty seasons require confirmation and can be deleted.
- Seasons with episodes cannot be deleted.
- Episodes require confirmation and cannot be deleted while a book is linked.
- Unlinking a book never deletes or archives it.
- Continuity warnings never mutate content.

## Legacy Conversion

Legacy `BookSeriesConfig` is never auto-converted. "Convert Current Book Series Settings" requires user confirmation, creates or selects a project, creates the required season and episode, links the current book, copies recap and teaser values, and records `legacyConvertedAt`.

The old metadata is preserved and augmented with normalized IDs so older Reader packages remain compatible.

## Continuity Engine

The deterministic continuity pass currently checks:

- duplicate season or in-season episode numbering;
- episodes linked to missing seasons;
- missing recaps after episode one;
- teasers without a following episode;
- release dates that conflict with planned order;
- timeline appearances after a recorded death;
- contradictory relationship states.

Explicit continuity rules are shown alongside generated warnings. The engine is advisory and never edits manuscripts.

## Readiness Calculation

Content readiness requires a linked manuscript, title, chapter, core metadata, required recap/teaser, and editorial reviews. Commercial readiness requires cover, pricing, and marketing completion. Security readiness requires a reviewed signing gate and confirmed issuance availability.

The browser does not claim that it signed a package. Actual signed data-pack issuance remains in the established publishing flow.

## Reader Integration

The Reader uses only series metadata from the active book and other books already present in the reader's permitted library. It can show:

- series title, season, and episode;
- "Previously On" recap and next teaser;
- available episode progress;
- previous and next downloaded episodes;
- a locked/unavailable next episode and permitted release hint.

The Reader does not query publisher-side series planning tables, so unpublished synopsis, deadlines, continuity notes, and private manuscripts are not exposed.

## Backup and Recovery

Backups export the complete SQLite database, so all normalized series tables are included automatically. Restore, emergency backup, corruption recovery, and IndexedDB storage use the existing database-wide mechanisms without special series handling.

## Limitations

- Characters are created and owned in Book Studio; Series Studio links those IDs rather than introducing a duplicate character store.
- Asset IDs reference the existing asset model. Asset upload and transformation remain in Book Studio.
- Calendar planning is currently a deadline-oriented list; external calendar synchronization is out of scope.
- Automated continuity checks cannot replace editorial canon review.
- Series records are local SQLite data until a dedicated publisher synchronization contract is introduced.

## Future AI Assistance Boundaries

Future AI tools may suggest outlines, recaps, teasers, arc milestones, scheduling options, or possible continuity conflicts. They must not:

- silently rewrite canon or manuscripts;
- mark legal, commercial, signing, or publication gates complete;
- claim to sign data packs;
- publish or delete content without explicit user action;
- expose private planning data to Reader packages.
