/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', '"Satoshi"', "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#0b0b15",
        surface: "#11111f",
        accent: "#34d399",
      },
      boxShadow: {
        glass: "0 10px 40px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
