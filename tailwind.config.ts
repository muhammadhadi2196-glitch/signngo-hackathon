import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        brand: {
          dark: "#0F172A",
          accent: "#2563EB",
          "accent-hover": "#1D4ED8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
