/* eslint-disable import/no-default-export */
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const releaseTag = env.RELEASE_TAG || "dist";
  const basePath = env.BASE_PATH || "/";

  return {
    plugins: [tsconfigPaths(), react()],
    build: {
      outDir: releaseTag,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // Split large third-party libraries into separate cacheable chunks.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            charts: ["recharts"],
            state: ["xstate", "@xstate/react", "zustand", "zod"],
          },
        },
      },
    },
    base: basePath,
  };
});
