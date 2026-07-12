import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["dist/**", "node_modules/**"],
    env: {
      QDRANT_URL: "http://localhost:6333",
    },
  },
});
