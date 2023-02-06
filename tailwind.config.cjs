/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      black: "#000000",
      red: "#ff0000",
      orange: "#ff5c00",
      yellow: "#ffe600",
      green: "#00ac1c",
    },
    extend: {},
  },
  plugins: [],
};
