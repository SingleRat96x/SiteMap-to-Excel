/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      width: {
        'popup': '400px',
      },
      height: {
        'popup': '500px',
      },
    },
  },
  plugins: [],
} 