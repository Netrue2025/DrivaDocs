import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf7",
          100: "#d5f4e8",
          200: "#afe8d5",
          300: "#7ad4ba",
          400: "#42b999",
          500: "#209d7e",
          600: "#167e68",
          700: "#146555",
          800: "#135046",
          900: "#113f38"
        },
        ink: "#17211d",
        road: "#f4b942"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(23, 33, 29, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
