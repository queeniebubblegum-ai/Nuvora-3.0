/** @type {import('tailwindcss').Config} */
/* Avenera — configuração isolada do protótipo Redesign v4 (Fase 1).
   Não substitui a configuração do app ativo. As cores apontam para variáveis
   definidas em input-v4.css (:root / .dark). */
module.exports = {
  darkMode: 'class',
  // Tailwind 3.4 selector scoping keeps V4 utilities out of rendered page DOM.
  important: '.nv-v4-scope',
  corePlugins: { preflight: false },
  content: [
    "./index.html",
    "./app-shell-v4.html",
    "./filtros-bar-v4.html",
    "./modal-transacao-v4.html",
    "./dashboard-v4.js",
    "./transacoes-v4.js",
    "./modal-transacao-v4.js"
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
