/** @type {import('tailwindcss').Config} */
/* Nuvora / Avenera — Redesign v4 (Fase 1)
   Substitui tailwind.config.js. As cores apontam para variáveis CSS definidas
   em input.css (:root / .dark), então o modo escuro funciona por troca de tema. */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],          // títulos / voz da Anora
        sans:    ['"Public Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        num:     ['Sora', 'Inter', 'system-ui', 'sans-serif'], // dinheiro (tabular)
        mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        page:      'var(--page)',
        surface:   'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border:    'var(--border)',
        text:      'var(--text)',
        muted:     'var(--muted)',
        'muted-2': 'var(--muted-2)',
        brand:     'var(--brand)',
        action:    'var(--action)',
        violet:    'var(--violet)',
        'violet-soft': 'var(--violet-soft)',
        success:   'var(--success)',
        'success-soft': 'var(--success-soft)',
        warning:   'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        danger:    'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        info:      'var(--info)',
        'info-soft': 'var(--info-soft)',
      },
      borderRadius: {
        'r1': 'var(--radius-1)',
        'r2': 'var(--radius-2)',
        'r3': 'var(--radius-3)',
        'r4': 'var(--radius-4)',
        'r5': 'var(--radius-5)',
        'pill': '999px',
      },
      boxShadow: {
        soft:     'var(--shadow-soft)',
        elevated: 'var(--elevated)',
        'action-glow': '0 6px 18px rgba(91,58,162,.35)',
      },
      maxWidth: {
        'shell': '1440px',
        'content': '1120px',
      },
      spacing: {
        '18': '4.5rem',
      }
    },
  },
  plugins: [],
}
