import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts",
      // Immutable scripts from the historical audit, not application tooling.
      "docs/origens/**", "docs/evidencias-performance-2026-10-12/**/*.cjs"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
    },
  },
);
