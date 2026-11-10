import { readFile, writeFile, mkdir, rm, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { minify } from "terser";

const sourcePath = new URL("../script.js", import.meta.url);
const outputPath = new URL("../dist/script.js", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const result = await minify({ "script.js": source }, {
  compress: true,
  mangle: { toplevel: true },
  format: { comments: false },
  sourceMap: false,
});

if (!result.code) throw new Error("Terser produced empty JavaScript.");
new Script(result.code, { filename: fileURLToPath(outputPath) });
await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
for (const file of ["index.html", "styles.css"]) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(`../dist/${file}`, import.meta.url));
}
await writeFile(outputPath, `${result.code}\n`);
await rm(new URL("../dist/script.js.map", import.meta.url), { force: true });

const before = Buffer.byteLength(source);
const after = Buffer.byteLength(`${result.code}\n`);
console.log(`dist/script.js: ${before} -> ${after} bytes (${((1 - after / before) * 100).toFixed(1)}% smaller)`);
