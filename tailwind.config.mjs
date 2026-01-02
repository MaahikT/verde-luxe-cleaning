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

        brand: {
          white: "#FFFFFF",
          black: "#201F23",
          purple: "#E3E4EA",
          red: "#98140B",
          grey: {
            DEFAULT: "#596269",
            dark: "#45515C",
            light: "#8F8E96",
          },
          "green-dark": "#4C6C5A",
          "green-soft": "#E6EFEA",
          "green-medium": "#A4C8AE",
          beige: "#E5D6B8",
          tosca: "#C1D8DA",
          bg: {
            DEFAULT: "#EAE9E3",
            light: "#E7EEE9",
          },
          "accent-green": "#395917",
          border: "#E6E6E6",
        },
      },
    },
  },
};
