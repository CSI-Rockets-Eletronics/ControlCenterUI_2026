import autoprefixer from "autoprefixer";
import tailwind from "tailwindcss";

import tailwindConfig from "./tailwind.config.js";

// eslint-disable-next-line import/no-default-export
export default {
  plugins: [tailwind(tailwindConfig), autoprefixer],
};
