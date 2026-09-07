/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        glass: "rgba(255,255,255,0.04)",
        "glass-border": "rgba(255,255,255,0.08)",
        "glass-card": "rgba(255,255,255,0.06)",
        "dark-bg": "#090d16",
        "dark-surface": "#0d1322",
      },
      fontFamily: {
        sans: ["Inter_400Regular", "system-ui", "sans-serif"],
        medium: ["Inter_500Medium", "sans-serif"],
        semibold: ["Inter_600SemiBold", "sans-serif"],
        bold: ["Inter_700Bold", "sans-serif"],
      },
    },
  },
  plugins: [],
};
