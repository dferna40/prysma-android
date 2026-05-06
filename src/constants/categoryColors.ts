import type { CategoryColorKey } from '../types';

interface CategoryTheme {
  badge: string;
  button: string;
  cardAccent: string;
  chip: string;
  hex: string;
}

export const categoryColorOptions: Array<{
  label: string;
  value: CategoryColorKey;
}> = [
  { label: 'Azul', value: 'blue' },
  { label: 'Esmeralda', value: 'emerald' },
  { label: 'Ambar', value: 'amber' },
  { label: 'Indigo', value: 'indigo' },
  { label: 'Rosa', value: 'rose' },
  { label: 'Violeta', value: 'violet' },
  { label: 'Cian', value: 'cyan' },
  { label: 'Naranja', value: 'orange' },
  { label: 'Teal', value: 'teal' },
  { label: 'Slate', value: 'slate' },
];

const categoryThemesByColor: Record<CategoryColorKey, CategoryTheme> = {
  blue: {
    badge: 'bg-blue-50 text-blue-700',
    button: 'hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800',
    cardAccent: 'border-l-blue-500',
    chip:
      'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800',
    hex: '#3b82f6',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700',
    button:
      'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800',
    cardAccent: 'border-l-emerald-500',
    chip:
      'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800',
    hex: '#10b981',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700',
    button: 'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800',
    cardAccent: 'border-l-amber-500',
    chip:
      'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800',
    hex: '#f59e0b',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700',
    button: 'hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800',
    cardAccent: 'border-l-indigo-500',
    chip:
      'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800',
    hex: '#6366f1',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700',
    button: 'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800',
    cardAccent: 'border-l-rose-500',
    chip:
      'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800',
    hex: '#f43f5e',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700',
    button:
      'hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800',
    cardAccent: 'border-l-violet-500',
    chip:
      'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100 hover:text-violet-800',
    hex: '#8b5cf6',
  },
  cyan: {
    badge: 'bg-cyan-50 text-cyan-700',
    button: 'hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800',
    cardAccent: 'border-l-cyan-500',
    chip:
      'border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100 hover:text-cyan-800',
    hex: '#06b6d4',
  },
  orange: {
    badge: 'bg-orange-50 text-orange-700',
    button:
      'hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800',
    cardAccent: 'border-l-orange-500',
    chip:
      'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100 hover:text-orange-800',
    hex: '#f97316',
  },
  teal: {
    badge: 'bg-teal-50 text-teal-700',
    button: 'hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800',
    cardAccent: 'border-l-teal-500',
    chip:
      'border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-300 hover:bg-teal-100 hover:text-teal-800',
    hex: '#14b8a6',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700',
    button: 'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800',
    cardAccent: 'border-l-slate-500',
    chip:
      'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200 hover:text-slate-800',
    hex: '#64748b',
  },
};

export const getCategoryTheme = (color: CategoryColorKey = 'slate') =>
  categoryThemesByColor[color] ?? categoryThemesByColor.slate;

export const getCategoryColorHex = (color: CategoryColorKey = 'slate') =>
  getCategoryTheme(color).hex;
