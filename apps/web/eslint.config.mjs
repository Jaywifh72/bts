import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// eslint-plugin-react@7.37.5 — the latest published — calls APIs that
// ESLint 10 removed (`context.getFilename()` etc.). It crashes on the
// rules `react/display-name`, `react/no-unescaped-entities`,
// `react/prop-types`, and several others when they hit
// `usedPropTypesInstructions` via `Components.componentRule`. Disable the
// react/* rules from the recommended preset here until upstream ships a
// fix. `react-hooks` is on a working version via pnpm.overrides
// (^7.1.1) — those rules stay on.
//
// Pin React version so the plugin's broken auto-detection is bypassed
// for any rule that survives.
//
// Settings tracked at https://github.com/jsx-eslint/eslint-plugin-react/issues
// (search for ESLint 10 support).

const DISABLED_REACT_RULES = [
    "react/display-name",
    "react/jsx-key",
    "react/jsx-no-comment-textnodes",
    "react/jsx-no-duplicate-props",
    "react/jsx-no-target-blank",
    "react/jsx-no-undef",
    "react/jsx-uses-react",
    "react/jsx-uses-vars",
    "react/no-children-prop",
    "react/no-danger-with-children",
    "react/no-deprecated",
    "react/no-direct-mutation-state",
    "react/no-find-dom-node",
    "react/no-is-mounted",
    "react/no-render-return-value",
    "react/no-string-refs",
    "react/no-unescaped-entities",
    "react/no-unknown-property",
    "react/prop-types",
    "react/react-in-jsx-scope",
    "react/require-render-return",
];

const disableBroken = Object.fromEntries(DISABLED_REACT_RULES.map((r) => [r, "off"]));

export default defineConfig([
    globalIgnores(["**/.next/", "**/node_modules/", "**/next-env.d.ts"]),
    {
        extends: [...nextCoreWebVitals],

        settings: {
            react: { version: "19.2.6" },
        },

        rules: {
            "@next/next/no-img-element": "warn",
            "react-hooks/exhaustive-deps": "warn",
            "react-hooks/rules-of-hooks": "error",
            // New in react-hooks@7. All real violations were fixed; the
            // two remaining sites carry inline eslint-disable comments
            // with rationale (server-component Date.now, fetch-loading
            // state). Now strict.
            "react-hooks/set-state-in-effect": "error",
            "react-hooks/static-components": "error",
            "react-hooks/purity": "error",
            ...disableBroken,
        },
    },
]);