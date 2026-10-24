import { defineConfig } from "vitest/config";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

// The project's .env files, later ones winning as in Next.js (.env.local over
// .env), so a script sees what the app sees and ANTHROPIC_API_KEY can live in
// .env.local. Parsed with Node's own reader rather than adding a dependency.
const env = Object.assign(
  {},
  ...[".env", ".env.local"]
    .filter((file) => existsSync(file))
    .map((file) => parseEnv(readFileSync(file, "utf8")))
);

// One-off scripts that need the "@/" paths (e.g. the listener check, #151).
// Kept apart from vitest.config.ts so they never run with the test suite —
// some call paid APIs.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["scripts/**/*.run.ts"],
    env,
  },
});
