import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nacar: {
          black: '#0b0b0f',
          red: '#d71920',
          gray: '#f4f4f5'
        }
      }
    }
  },
  plugins: []
};

export default config;
