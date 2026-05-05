import type { KnowledgeCategory } from '../types';

export const categoryColors: Record<KnowledgeCategory, string> = {
  Entorno: 'blue',
  Batch: 'emerald',
  UML: 'amber',
  UI: 'indigo',
  General: 'indigo',
  Seguros: 'rose',
};

export const categoryThemes: Record<
  KnowledgeCategory,
  {
    cardAccent: string;
    badge: string;
    chip: string;
    button: string;
  }
> = {
  Entorno: {
    cardAccent: 'border-l-blue-500',
    badge: 'bg-blue-50 text-blue-700',
    chip:
      'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800',
    button:
      'hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800',
  },
  Batch: {
    cardAccent: 'border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700',
    chip:
      'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800',
    button:
      'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800',
  },
  UML: {
    cardAccent: 'border-l-amber-500',
    badge: 'bg-amber-50 text-amber-700',
    chip:
      'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800',
    button:
      'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800',
  },
  UI: {
    cardAccent: 'border-l-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700',
    chip:
      'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800',
    button:
      'hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800',
  },
  General: {
    cardAccent: 'border-l-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700',
    chip:
      'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800',
    button:
      'hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800',
  },
  Seguros: {
    cardAccent: 'border-l-rose-500',
    badge: 'bg-rose-50 text-rose-700',
    chip:
      'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800',
    button:
      'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800',
  },
};
