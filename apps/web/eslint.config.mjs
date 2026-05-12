import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([globalIgnores(["**/.next/", "**/node_modules/", "**/next-env.d.ts"]), {
    extends: [...nextCoreWebVitals],

    rules: {
        "@next/next/no-img-element": "warn",
        "react/no-unescaped-entities": "warn",
        "react-hooks/exhaustive-deps": "warn",
        "react-hooks/rules-of-hooks": "error",
    },
}]);