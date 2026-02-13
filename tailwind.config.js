/** @type {import('tailwindcss').Config} */
export const config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // White/Gray backgrounds
        gray: {
          "bg-1": "#ffffff",
          "bg-2": "#f8f9fa",
          "el-bg": "#f1f3f5",
          "el-bg-hover": "#e9ecef",
          border: "#dee2e6",
          "border-hover": "#ced4da",
          solid: "#868e96",
          text: "#212529",
          "text-dim": "#495057",
        },
        // Bright Blue
        blue: {
          bg: "#e7f5ff",
          border: "#74c0fc",
          solid: "#228be6",
          "solid-hover": "#1c7ed6",
          text: "#1971c2",
        },
        // Bright Green
        green: {
          bg: "#d3f9d8",
          border: "#8ce99a",
          solid: "#37b24d",
          "solid-hover": "#2f9e44",
          text: "#2b8a3e",
        },
        // Bright Red
        red: {
          bg: "#ffe0e0",
          border: "#ffa8a8",
          solid: "#f03e3e",
          "solid-hover": "#e03131",
          text: "#c92a2a",
        },
        // Yellow for warnings
        yellow: {
          bg: "#fff3bf",
          border: "#ffd43b",
          solid: "#fab005",
          "solid-hover": "#f59f00",
          text: "#e67700",
        },
      },
    },
  },
  plugins: [],
};
