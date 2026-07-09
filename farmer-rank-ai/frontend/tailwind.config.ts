import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B140F",        // near-black deep field green — the app background
        surface: "#121F19",    // card / panel surface
        surface2: "#1A2C22",   // raised surface (hover, nested cards)
        hairline: "#2A3D31",   // borders/dividers
        wheat: "#D4A64A",      // harvest-gold accent — primary
        wheatSoft: "#8A6B2E",  // muted gold for secondary labels
        ledger: "#4FD1C5",     // teal — used only for trust/score numerics
        paper: "#EDEAE0",      // primary text, warm off-white
        mute: "#8FA098",       // secondary text
        danger: "#E2725B",     // safety flags / blocked
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
