import { globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const eslintConfig = [
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  ...tseslint.configs.recommended,
  nextPlugin.flatConfig.recommended,
  nextPlugin.flatConfig.coreWebVitals,
];

export default eslintConfig;
