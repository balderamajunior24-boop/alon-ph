/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#ed5209",
          orange: "#f57922",
          coral: "#f26a2e",
          amber: "#f9a825",
          peach: "#ffe8d6",
          cream: "#fff7ef",
        },
        ink: "#23272b",
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
