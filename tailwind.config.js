/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        primary: ['Montserrat', 'sans-serif'],
        mentor: ['Playfair Display', 'serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
      colors: {
        bg: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        border: 'var(--c-border)',
        'text-primary': 'var(--c-text-primary)',
        'text-secondary': 'var(--c-text-secondary)',
        'brand-deep': 'var(--c-brand-deep)',
        'brand-dark': 'var(--c-brand-dark)',
        'brand-medium': 'var(--c-brand-medium)',
        'brand-soft': 'var(--c-brand-soft)',
        success: '#16A34A',
        danger: '#DC2626',
        reserve: '#2563EB',
        credit: '#D97706',
        investment: '#7C3AED',
      },
      boxShadow: {
        soft: '0 4px 18px rgba(0, 0, 0, 0.08)',
        medium: '0 8px 30px rgba(0, 0, 0, 0.12)',
        'brand-glow': '0 4px 15px rgba(108, 59, 182, 0.3)',
        'success-glow': '0 4px 15px rgba(34, 197, 94, 0.3)',
        'danger-glow': '0 4px 15px rgba(239, 68, 68, 0.3)',
        'deep-glow': '0 4px 15px rgba(31, 15, 66, 0.3)',
        'white-glow': '0 8px 30px rgba(255, 255, 255, 0.25)',
        'dark-glow': '0 8px 30px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}