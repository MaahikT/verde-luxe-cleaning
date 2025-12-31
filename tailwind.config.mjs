/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
        serif: ["Roboto Slab", "serif"],
        heading: ["Roboto Slab", "serif"],
        body: ["Roboto", "sans-serif"],
        opensans: ["Open Sans", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#163022",
          dark: "#0d1f16",
          light: "#EDEAE1",
        },
        gray: {
          bg: "#f6f3f2",
          text: "#7d8393",
        },
      },
    },
  },
};
