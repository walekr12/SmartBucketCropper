/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 极客风格暗色主题
        'dark-bg': '#0d0d1a',
        'dark-card': '#1a1a2e',
        'dark-border': '#2a2a4a',
        'neon-blue': '#00d9ff',
        'neon-green': '#00ff88',
        'neon-purple': '#8b5cf6',
        'neon-pink': '#ff00aa',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00d9ff, 0 0 10px #00d9ff' },
          '100%': { boxShadow: '0 0 10px #00d9ff, 0 0 20px #00d9ff, 0 0 30px #00d9ff' },
        }
      }
    },
  },
  plugins: [],
}
