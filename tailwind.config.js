/* eslint-disable import/no-default-export */
/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "bdoGrotesk",
          '"bdoGrotesk Fallback"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        gray: {
          "bg-1": "rgb(var(--gray-bg-1) / <alpha-value>)",
          "bg-2": "rgb(var(--gray-bg-2) / <alpha-value>)",
          "el-bg": "rgb(var(--gray-el-bg) / <alpha-value>)",
          "el-bg-hover": "rgb(var(--gray-el-bg-hover) / <alpha-value>)",
          border: "rgb(var(--gray-border) / <alpha-value>)",
          "border-hover": "rgb(var(--gray-border-hover) / <alpha-value>)",
          solid: "rgb(var(--gray-solid) / <alpha-value>)",
          text: "rgb(var(--gray-text) / <alpha-value>)",
          "text-dim": "rgb(var(--gray-text-dim) / <alpha-value>)",
          section: "rgb(var(--gray-section) / <alpha-value>)",
        },
        blue: {
          bg: "rgb(var(--blue-bg) / <alpha-value>)",
          border: "rgb(var(--blue-border) / <alpha-value>)",
          solid: "rgb(var(--blue-solid) / <alpha-value>)",
          "solid-hover": "rgb(var(--blue-solid-hover) / <alpha-value>)",
          text: "rgb(var(--blue-text) / <alpha-value>)",
        },
        green: {
          bg: "rgb(var(--green-bg) / <alpha-value>)",
          border: "rgb(var(--green-border) / <alpha-value>)",
          solid: "rgb(var(--green-solid) / <alpha-value>)",
          "solid-hover": "rgb(var(--green-solid-hover) / <alpha-value>)",
          text: "rgb(var(--green-text) / <alpha-value>)",
        },
        red: {
          bg: "rgb(var(--red-bg) / <alpha-value>)",
          border: "rgb(var(--red-border) / <alpha-value>)",
          solid: "rgb(var(--red-solid) / <alpha-value>)",
          "solid-hover": "rgb(var(--red-solid-hover) / <alpha-value>)",
          text: "rgb(var(--red-text) / <alpha-value>)",
        },
        yellow: {
          bg: "rgb(var(--yellow-bg) / <alpha-value>)",
          border: "rgb(var(--yellow-border) / <alpha-value>)",
          solid: "rgb(var(--yellow-solid) / <alpha-value>)",
          "solid-hover": "rgb(var(--yellow-solid-hover) / <alpha-value>)",
          text: "rgb(var(--yellow-text) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
