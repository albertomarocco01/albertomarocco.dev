import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Delivery vehicle for the Tarassaco experiment — already ported into
    // src/app/(immersive)/xperiments/tarassaco. Kept as an archive, not built.
    "src/Merge Designs/**",
  ]),
]);

export default eslintConfig;
