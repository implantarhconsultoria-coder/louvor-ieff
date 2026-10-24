/**
 * Creates a standalone HTML/CSS/JS bundle for Capacitor 8 from the original
 * Next.js 14 application, WITHOUT editing the production website code.
 *
 * Dynamic song URLs -> query parameter routes, server API -> existing Vercel.
 * The real app contents (not server.url) are copied inside each native bundle.
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { convertDetailPage, convertLinks, convertServerRequests } from "./transform.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const stage = join(root, ".mobile-stage");
const stageRead = (path) => readFile(join(stage, path), "utf8");
const stageWrite = (path, text) => writeFile(join(stage, path), text, "utf8");

if (!existsSync(join(root, "node_modules", "next"))) {
  throw new Error("Run npm ci in the original repository root first.");
}
await rm(stage, { force: true, recursive: true });
await mkdir(stage, { recursive: true });
for (const item of [
  "src", "package.json", "package-lock.json", "tsconfig.json",
  "tailwind.config.ts", "postcss.config.mjs", ".eslintrc.json"
]) {
  await cp(join(root, item), join(stage, item), { recursive: true });
}
if (existsSync(join(root, "public"))) {
  await cp(join(root, "public"), join(stage, "public"), { recursive: true });
}

const detail = await stageRead("src/app/musica/[id]/page.tsx");
const cifra = await stageRead("src/app/musica/[id]/cifra/page.tsx");
// Can't statically enumerate new song IDs; use query routes instead.
await rm(join(stage, "src/app/musica/[id]"), { recursive: true });
await mkdir(join(stage, "src/app/musica/cifra"), { recursive: true });
await stageWrite("src/app/musica/page.tsx", convertLinks(convertDetailPage(detail, "musica")));
await stageWrite("src/app/musica/cifra/page.tsx", convertLinks(convertDetailPage(cifra, "cifra")));

// Keep proprietary API credentials on Vercel, not in the distributable app.
await rm(join(stage, "src/app/api"), { recursive: true });
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (path.endsWith(".tsx")) {
      let value = await readFile(path, "utf8");
      value = convertLinks(value);
      if (path.endsWith(join("programacao", "page.tsx"))) {
        value = convertServerRequests(value);
      }
      await writeFile(path, value, "utf8");
    }
  }
};
await walk(join(stage, "src"));
await stageWrite("next.config.mjs",
  "const nextConfig = { output: 'export', trailingSlash: true, images: { unoptimized: true } };\nexport default nextConfig;\n"
);

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const build = spawnSync(cmd, ["next", "build", ".mobile-stage"], {
  cwd: root, stdio: "inherit", env: process.env
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status || 1);
for (const file of [
  "index.html", "programacao/index.html",
  "musica/index.html", "musica/cifra/index.html"
]) {
  if (!existsSync(join(stage, "out", file))) {
    throw new Error("Incomplete static export: " + file);
  }
}
console.log("LOUVOR IEFF web bundle ready at .mobile-stage/out");
