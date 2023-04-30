import radixColors from "@radix-ui/colors";
import tailwindScrollbar from "tailwind-scrollbar";
import defaultTheme from "tailwindcss/defaultTheme";

const radixColorOptions = {
  // semantic colors
  colorMappings: {
    gray: "sandDark",
    red: "tomatoDark",
    orange: "orangeDark",
    yellow: "yellowDark",
    green: "grassDark",
  },
  stepMappings: {
    // background
    "bg-1": 1,
    "bg-2": 2,
    // element background
    "el-bg": 3,
    "el-bg-hover": 4,
    "el-bg-active": 5,
    "border-dim": 6,
    border: 7,
    "border-hover": 8,
    solid: 9,
    "solid-hover": 10,
    "solid-active": 11,
    "text-dim": 11,
    text: 12,
  },
};

function toTailwindColor(radixColor) {
  const numberSteps = Object.fromEntries(
    Object.entries(radixColor).map(([k, v]) => [k.replace(/[^\d]+/, ""), v])
  );

  const steps = {};
  // prefer semantic colors
  for (const [k, v] of Object.entries(radixColorOptions.stepMappings)) {
    steps[k] = numberSteps[v];
  }
  // discourage the use of fallback colors
  for (const [k, v] of Object.entries(numberSteps)) {
    steps[`fallback-${k}`] = v;
  }
  return steps;
}

/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line import/no-default-export
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: ["'B612'", "sans-serif"],
      mono: ["'B612 Mono'", "monospace"],
    },
    fontSize: {
      sm: defaultTheme.fontSize["xl"],
      base: defaultTheme.fontSize["2xl"],
      lg: defaultTheme.fontSize["3xl"],
    },
    colors: {
      ...Object.fromEntries(
        Object.entries(radixColorOptions.colorMappings).map(
          ([name, radixName]) => [name, toTailwindColor(radixColors[radixName])]
        )
      ),
    },
    extend: {},
  },
  plugins: [tailwindScrollbar({ nocompatible: true })],
};
