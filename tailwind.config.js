/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        background: { light: '#fcfcfc', dark: '#120d0e' },
        surface: { light: '#ffffff', dark: '#1d1718' },
        muted: { light: '#686e6e', dark: '#c7bdbf' },
        foreground: { light: '#131414', dark: '#fff7f7' },
        border: { light: '#d8dada', dark: '#403537' },
        primary: { light: '#9d0208', dark: '#ff6b6b' },
        danger: { light: '#b42318', dark: '#ff7b7b' },
        success: { light: '#067647', dark: '#75e0a7' },
      },
    },
  },
  plugins: [],
};
