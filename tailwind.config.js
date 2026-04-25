/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        border: 'var(--border)',
        'border-soft': 'var(--border-soft)',
        accent: 'var(--accent)',
        'accent-dark': 'var(--accent-dark)',
        'accent-soft-bg': 'var(--accent-soft-bg)',
        'accent-soft-border': 'var(--accent-soft-border)',
        warn: 'var(--warn)',
        'warn-soft-bg': 'var(--warn-soft-bg)',
        'warn-soft-border': 'var(--warn-soft-border)',
        amber: 'var(--amber)',
        'amber-soft-bg': 'var(--amber-soft-bg)',
        'amber-soft-border': 'var(--amber-soft-border)',
        'role-admin': 'var(--role-admin)',
        'role-operador': 'var(--role-operador)',
        'role-financeiro': 'var(--role-financeiro)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
};
