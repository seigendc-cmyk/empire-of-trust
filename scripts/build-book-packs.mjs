import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceDir = path.resolve("data/books");
const outDir = path.resolve("dist/data-packs/books");

function checksum(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

async function main() {
  await mkdir(sourceDir, { recursive: true });
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(sourceDir)).filter((file) => file.endsWith(".json"));
  if (files.length === 0) {
    console.log("No book source files found in data/books.");
    return;
  }

  for (const file of files) {
    const source = JSON.parse(await readFile(path.join(sourceDir, file), "utf8"));
    const slug = source.slug || path.basename(file, ".json");
    const content = {
      book: {
        id: source.id || slug,
        slug,
        title: source.title,
        subtitle: source.subtitle || "",
        author: source.author || "Empire of Trust Studio",
        synopsis: source.synopsis || "",
        language: source.language || "en",
        coverImageUrl: source.coverImageUrl || "",
        requiredLicencePlan: source.requiredLicencePlan || "reader",
        status: source.status || "published",
        episodeIds: source.episodeIds || [],
        sortOrder: source.sortOrder || 0,
      },
      episodes: source.episodes || [],
    };
    const pack = {
      manifest: {
        packId: `EOT-BOOK-${slug}`,
        packType: "book",
        version: source.version || "1.0.0",
        title: content.book.title,
        slug,
        author: content.book.author,
        language: content.book.language,
        requiredLicencePlan: content.book.requiredLicencePlan,
        episodeCount: content.episodes.length,
        createdAt: new Date().toISOString(),
        checksumAlgorithm: "SHA-256",
        checksum: checksum(content),
        signature: "shell-generated-placeholder-signature",
      },
      content,
    };
    const outFile = path.join(outDir, `${pack.manifest.packId}-v${pack.manifest.version}.json`);
    await writeFile(outFile, `${JSON.stringify(pack, null, 2)}\n`);
    console.log(`Built ${outFile}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
