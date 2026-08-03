/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,js,jsx,html,mdx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      /* Colors are defined in src/index.css @theme — that's the single source.
         Keep tailwind.config.js for non-color config only. */

      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
        xl: '1rem',
        full: '9999px',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.0' }],
        sm: ['0.875rem', { lineHeight: '1.2' }],
        base: ['1rem', { lineHeight: '1.5' }],
        lg: ['1.125rem', { lineHeight: '1.5' }],
        xl: ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.2' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      keyframes: {
        'caret-blink': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'caret-blink': 'caret-blink 1.0s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
