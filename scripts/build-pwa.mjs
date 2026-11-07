import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? walk(path.join(folder, e.name))
          : [path.join(folder, e.name)],
      ),
    )
  ).flat();
}
const files = (await walk(".next/static"))
  .filter((p) => /\.(js|css)$/.test(p) && !p.includes("/app/api/"))
  .sort();
const assets = files.map(
  (p) => "/" + p.replace(/^\.next/, "_next").replaceAll("\\", "/"),
);
const id = createHash("sha256")
  .update(await readFile(".next/BUILD_ID"))
  .update(JSON.stringify(assets))
  .digest("hex")
  .slice(0, 16);
await writeFile(
  "public/offline-assets.json",
  JSON.stringify({ build: id, assets }),
);
await writeFile(
  "public/sw.js",
  (await readFile("scripts/service-worker.template.js", "utf8")).replaceAll(
    "__BUILD__",
    id,
  ),
);
console.log(`PWA: ${assets.length} public code assets, cache ${id}`);
