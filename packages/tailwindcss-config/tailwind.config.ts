import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      keyframes: {
        /** Tab group switcher: one-time bulk-import staggered row reveal */
        switcherRowImport: {
          '0%': { opacity: '0', transform: 'translateY(-0.65rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'switcher-row-import': 'switcherRowImport 0.38s ease-out both',
      },
    },
  },
  plugins: [],
} as Omit<Config, 'content'>
