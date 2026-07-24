# Interactive Series Production Studio

## Scope

The Interactive Series Production Studio extends the existing Series Book Studio. It does not replace series planning, linked books, publication readiness, public projection, POP, entitlement, or signed-data-pack issuance. Its records are private production data stored in normalized local SQLite tables.

The hierarchy is:

```text
Series
  Season
    Episode
      Chapter
        Scene
          Story block
            Entity links / dialogue metadata
```

Deleting a series or episode safely cascades into its production children. Season references remain restrictive where deleting the season would orphan episodes or chapters. Assets and characters use restrictive deletion when possessions or scene links would be damaged.

## Staff permissions

`SeriesStaffAssignment` grants one role at series, season, episode, chapter, or scene scope. `SeriesPermissionGrant` can explicitly allow or deny a named permission for that assignment. Permissions cover create, edit, delete, approve, publish, staff management, lock, and comment.

Roles are owner, lead writer, co-writer, editor, story architect, character director, asset manager, cover designer, continuity editor, publisher, and viewer. Role permissions are defaults; an explicit grant wins. A series assignment applies to descendants, while narrower assignments require the target or an ancestor match.

Every production mutation is expected to call `assertSeriesPermission` before its repository operation. The UI also hides unavailable actions, but UI visibility is not the authorization boundary. The first local user opening a legacy series with no assignments becomes its offline owner so existing projects remain usable.

## Chapters, scenes, and story blocks

Chapters and scenes have stable IDs, order indexes, editorial status, timestamps, and uniqueness constraints for chapter/scene numbering within their parent. Scene fields store purpose, synopsis, opening, conflict, turning point, outcome, location, cast/assets/possessions, story date/time, weather, and archive state.

Story content is not one JSON document. Each block is a row in `series_story_blocks`, ordered within a scene. Supported block types are headings, paragraphs, dialogue, narration, quote, image, caption, list, table, scene break, character/location/object entry, and internal note.

Blocks support HTML drag reordering, arrow reordering, duplication, deletion, movement, autosave, visible unsaved/saving/error state, retry, last-saved time, and revision capture. `series_story_block_links` provides character, actor, asset, possession, location, and relationship chips. Clicking a chip opens the entity inspector.

Internal notes are explicitly filtered by `publicStoryBlocks` and are never projected to the Reader or public Firestore documents.

## Characters versus actors

`SeriesCharacter` is fictional. It may reference an existing Book character through `sourceBookCharacterId`, avoiding unnecessary duplicates. `SeriesActor` represents a performer and remains separate from character identity.

`CharacterActorAssignment` supports primary, young/older version, voice, stunt, and replacement performers. Optional season and episode scopes allow casting changes without replacing the character. Continuity checks detect one actor playing conflicting characters in the same scene.

## Assets and possessions

`SeriesAsset` represents production/story objects, images, costumes, vehicles, weapons, documents, buildings, businesses, animals, symbols, and other tracked items. It records owner, custodian, acquisition, loss/destruction, first appearance, file reference, and continuity notes.

`CharacterPossession` records owned, borrowed, transferred, lost, or destroyed state separately from the asset. Transfers require explicit user confirmation in the UI and a second transfer is rejected transactionally. Dialogue never changes possession implicitly; callers must pass through an explicit confirmation boundary.

## Relationships

The existing normalized series relationship table is extended with trust level, conflict level, active state, betrayal, reconciliation, start/end episode, and timestamps. Types include family, friend, enemy, business, romantic, mentor, employee/employer, rival, and unknown.

Active relationships with an end episode generate a warning; the engine never edits the relationship.

## Scene canvas

Desktop uses three columns:

- left: series/season/episode/chapter/scene tree;
- centre: rich block canvas and tab-specific workspace;
- right: scene and linked-entity inspector.

Mobile stacks the views, hides horizontal overflow, and provides explicit Series Tree / Back to workspace controls. The bottom production boundary bar remains visible and reports publishable versus internal blocks.

## Continuity engine

`generateProductionContinuityWarnings` is pure and read-only. It detects:

- character appearance after recorded death;
- lost or destroyed asset use;
- asset use without an active possessor in the scene;
- actor conflicts within a scene;
- duplicate scene numbers;
- scene dates out of order;
- expected-location mismatches;
- contradictory relationship end state;
- duplicate possession transfers;
- cover actor/character mismatch;
- episodes missing required characters.

Warnings include stable codes and entity/scene references. They never rewrite story content, scene metadata, possession state, or casting.

## Cover workflow

`series_cover_projects` stores series, season, episode, book-front/back, library thumbnail, marketing poster, and social-card designs. A project can include background asset, gradient, title/subtitle, badges, author, actor/character images, publisher mark, price, release date, template, preview, and editorial status.

Cover records reference production entities but do not overwrite Book cover data until an explicitly authorized integration step.

## Editorial workflow

Chapters, scenes, covers, and review records use draft, in-progress, submitted, changes-requested, approved, locked, and published states. Reviews record assignment, requester, reviewer, note, and timestamps. Comments are normalized, support mentions and resolution, and remain private.

Scene and story-block updates write immutable revision snapshots with monotonically increasing entity revision numbers. Locked scenes reject ordinary edits. Unlocking or overriding a lock requires an authorized workflow action rather than direct content mutation.

## SQLite persistence

Migration version 4 creates:

- `series_staff_assignments`, `series_permissions`;
- `series_chapters`, `series_scenes`;
- `series_story_blocks`, `series_story_block_links`;
- `series_characters`, `series_actors`, `series_character_actor_assignments`;
- `series_assets`, `series_character_possessions`;
- `series_scene_characters`, `series_scene_assets`, `series_dialogue_blocks`;
- `series_editorial_reviews`, `series_comments`, `series_revision_history`;
- `series_cover_projects`.

The existing relationship table gains production continuity columns. All migrations run transactionally and idempotently. Since backup exports the complete SQLite database, production tables are automatically retained and restored.

## Publishing and privacy boundaries

Production records are never spread into public output. The public-series projector keeps its explicit safe-field whitelist and receives only SeriesProject/Season/Episode/Book inputs. It does not query production tables.

Private production data includes staff identity, assignments, internal notes, comments, revisions, actor contact notes, unfinished scenes, asset custody, continuity findings, editorial decisions, and cover work files. These must not enter:

- `publicSeries` Firestore documents;
- unsigned or signed Reader book payloads unless deliberately incorporated into the final Book manuscript;
- public Storage paths;
- catalogue, POP, entitlement, or package metadata.

The browser still cannot sign packages. Signed v3 issuance remains a protected backend responsibility, and `verifyImportedBookDataPack` remains mandatory before SQLite Reader import.
