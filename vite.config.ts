/* eslint-disable import/no-default-export */
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const releaseTag = env.RELEASE_TAG || "dist";

  return {
    plugins: [tsconfigPaths(), react()],
    build: {
      outDir: releaseTag,
      emptyOutDir: true,
    },
  };
});
