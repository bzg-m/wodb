import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    plugins: { js, "simple-import-sort": simpleImportSort },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    // Import/style rules to keep imports tidy and stable in diffs.
    rules: {
      // Use the simple-import-sort plugin to keep import groups and
      // ordering consistent (one-per-line when many items are present).
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    }
  },
  tseslint.configs.recommended,
]);
