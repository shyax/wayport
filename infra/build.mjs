import { build } from "esbuild";
import { mkdirSync } from "fs";

const fns = ["sync-push", "sync-pull", "sync-delete"];

mkdirSync(".build", { recursive: true });

for (const fn of fns) {
  await build({
    entryPoints: [`lambda/${fn}.ts`],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: `.build/${fn}/index.js`,
    minify: true,
    sourcemap: true,
    external: ["@aws-sdk/*"],
  });
  console.log(`Built ${fn}`);
}
