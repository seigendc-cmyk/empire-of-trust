# Book Pack Sources

Add one JSON file per book in this folder, then run:

```bash
npm run build:book-packs
```

Compiled packs are written to:

```text
dist/data-packs/books
```

Minimal source shape:

```json
{
  "slug": "book-one",
  "title": "Book One",
  "author": "Empire of Trust Studio",
  "version": "1.0.0",
  "requiredLicencePlan": "reader",
  "episodeIds": ["episode_id_1"],
  "episodes": []
}
```
