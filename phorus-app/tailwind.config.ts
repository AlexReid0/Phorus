import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-green': '#0a1f0a',
        'mint': '#a8f5d0',
        'mint-dark': '#7dd3a0',
        'card-bg': 'rgba(10, 31, 10, 0.8)',
        'border-mint': 'rgba(168, 245, 208, 0.2)',
      },
      fontFamily: {
        'serif': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'serif-light': '300',
      },
    },
  },
  plugins: [],
}
export default config
