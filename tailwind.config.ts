import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens — gothic horror / Barovia
        ink: '#0C0A0E',        // near-black background
        parchment: '#EAE2D6',  // aged page for body text on light panels
        blood: '#6B1220',      // deep crimson, primary accent
        'blood-bright': '#9E1B32',
        candle: '#C9A24B',     // muted candlelight gold, secondary accent
        mist: '#3A3844',       // dusky violet-grey for borders/dividers
        'mist-light': '#57536199',
      },
      fontFamily: {
        display: ['"Cinzel Decorative"', '"Cinzel"', 'serif'],   // gothic revival display
        body: ['"Crimson Pro"', 'Georgia', 'serif'],              // readable serif body
        utility: ['"Inter"', 'system-ui', 'sans-serif'],          // data/labels
      },
      boxShadow: {
        seal: '0 0 0 1px rgba(201,162,75,0.25), 0 8px 24px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
export default config
