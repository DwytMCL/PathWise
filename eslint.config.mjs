import { createRequire } from "node:module";

// Use the plugins already supplied by the project's Next ESLint package.
const require = createRequire(import.meta.url);
const fromNext = createRequire(require.resolve("eslint-config-next"));
const next = fromNext("@next/eslint-plugin-next");
const hooks = fromNext("eslint-plugin-react-hooks");
const accessibility = fromNext("eslint-plugin-jsx-a11y");

export default [
  { ignores: [".next/**", ".next-dev/**", "node_modules/**", "tmp/**", "output/**", "next-env.d.ts"] },
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: { parser: fromNext("@typescript-eslint/parser"), parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } } },
    plugins: { "@next/next": next, "react-hooks": hooks, "jsx-a11y": accessibility },
    rules: { ...next.configs.recommended.rules, ...next.configs["core-web-vitals"].rules, ...hooks.configs.recommended.rules, ...accessibility.configs.recommended.rules },
  },
];
