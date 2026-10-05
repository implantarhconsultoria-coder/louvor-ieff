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
        deep: "#050507",
        graphite: "#09090D",
        card: "#101016",
        elevated: "#16161F",
        neon: {
          purple: "#A855F7",
          pink: "#EC4899",
          cyan: "#22D3EE",
          violet: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        phone: "430px",
      },
      boxShadow: {
        neon: "0 0 24px rgba(168, 85, 247, 0.3)",
        "neon-pink": "0 0 24px rgba(236, 72, 153, 0.3)",
        "neon-cyan": "0 0 24px rgba(34, 211, 238, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
