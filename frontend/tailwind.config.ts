import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4648d4",
        "primary-hover": "#3b3dc0",
        "primary-container": "#6063ee",
        "background-airy": "#f8faff",
        "surface-white": "#ffffff",
        "surface-container": "#efecf8",
        "surface-container-low": "#f5f2fe",
        "surface-container-high": "#e9e6f3",
        "surface-container-highest": "#e4e1ed",
        "outline-variant": "#c7c4d7",
        "on-surface": "#1b1b23",
        "on-surface-variant": "#464554",
        "gradient-start": "#a855f7",
        "gradient-end": "#6366f1",
        "tier-1-success": "#10b981",
        "tier-2-warning": "#f59e0b",
        "tier-3-danger": "#ef4444",
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
export default config;
