/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-bg) / <alpha-value>)",
        graphite: "rgb(var(--color-panel-muted) / <alpha-value>)",
        steel: "rgb(var(--color-border) / <alpha-value>)",
        paper: "rgb(var(--color-text) / <alpha-value>)",
        signal: "rgb(var(--color-accent) / <alpha-value>)",
        ember: "rgb(var(--color-danger) / <alpha-value>)",
        ledger: "rgb(var(--color-success) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "ui-serif", "serif"]
      }
    }
  },
  plugins: []
};
