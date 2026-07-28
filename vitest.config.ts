import {fileURLToPath} from "node:url";
import {defineConfig} from "vitest/config";

// Pure unit tests. The use-case tests import real code from #server (the mapper),
// so we resolve the #server/#shared aliases here. Still no Nuxt runtime needed:
// the adapters (which use $fetch/useStorage) are never imported by these tests.
export default defineConfig({
    test: {
        include: ["test/**/*.test.ts"],
    },
    resolve: {
        alias: {
            "#server": fileURLToPath(new URL("./server", import.meta.url)),
            "#shared": fileURLToPath(new URL("./shared", import.meta.url)),
        },
    },
});
