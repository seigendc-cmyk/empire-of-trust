/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        graphite: "#202124",
        steel: "#3d464f",
        paper: "#f5f2ea",
        signal: "#b8924b",
        ember: "#8e3b2f",
        ledger: "#2f6f63"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "ui-serif", "serif"]
      }
    }
  },
  plugins: []
};
