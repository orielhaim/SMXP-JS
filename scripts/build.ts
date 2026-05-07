import { $ } from "bun";

await $`rm -rf dist`;

const result = await Bun.build({
  entrypoints: ["./src/index.ts", "./src/admin.ts", "./src/stream.ts"],
  outdir: "./dist",
  format: "esm",
  target: "browser",
  splitting: true,
  sourcemap: "linked",
  minify: true,
  external: ["ky", "eventsource-client"],
  naming: "[dir]/[name].[ext]",
});

if (!result.success) {
  console.error("❌ Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("✅ ESM build complete");

console.log("⏳ Generating type declarations...");

const tscResult = await $`tsc --emitDeclarationOnly --outDir dist --declaration --declarationMap`.quiet().nothrow();

if (tscResult.exitCode !== 0) {
  console.error("❌ Type generation failed:");
  console.error(tscResult.stdout.toString());
  process.exit(1);
}

await $`mv dist/src/* dist/`.quiet().catch(() => {});
await $`rm -rf dist/src`.quiet().catch(() => {});

console.log("✅ Type declarations complete");

const jsFiles = result.outputs.filter(o => !o.path.endsWith(".map"));
const totalSize = jsFiles.reduce((acc, o) => acc + o.size, 0);

console.log("");
console.log(`📦 ${(totalSize / 1024).toFixed(1)} KB total (${jsFiles.length} files, minified)`);
console.log("");
for (const output of jsFiles.sort((a, b) => a.path.localeCompare(b.path))) {
  const name = output.path.split(/[/\\]/).pop()!;
  const size = output.size < 1024 ? `${output.size} B` : `${(output.size / 1024).toFixed(1)} KB`;
  console.log(`   ${name.padEnd(20)} ${size}`);
}
