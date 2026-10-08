import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "playwright-report/**", "test-results/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["*.config.ts", "playwright.config.ts", "eslint.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
