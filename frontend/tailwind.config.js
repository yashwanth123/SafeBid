/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1B4332",
          50: "#E8F5EE",
          100: "#D8F3DC",
          200: "#95D5B2",
          300: "#52B788",
          400: "#40916C",
          500: "#2D6A4F",
          600: "#1B4332",
          700: "#132E22",
          800: "#0B1D16",
        },
        clay: "#C45C26",
        paper: "#F6F1E7",
        ink: "#14201A",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        lift: "0 18px 40px -24px rgba(27, 67, 50, 0.45)",
      },
    },
  },
  plugins: [],
};
