import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Node tests use the server marker's empty server entry; Next still enforces the production client boundary.
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname,"tests/server-only-shim.ts") } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
