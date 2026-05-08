import { useMemo, useState } from 'react';

const PREFIXES = [
  { description: 'Fichas con comandos reutilizables', value: '/cmd' },
  { description: 'Entornos, URLs, hosts y accesos tecnicos', value: '/env' },
  { description: 'SQL, tablas, Oracle y fichas de base de datos', value: '/db' },
  { description: 'Modelado, MagicDraw y protocolos UML', value: '/uml' },
  { description: 'Procedimientos, pasos y checklists', value: '/task' },
];

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Busca por titulo, tag o usa prefijos...',
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const showPrefixMenu = isFocused && value.trim().startsWith('/');

  const filteredPrefixes = useMemo(() => {
    const normalizedValue = value.trim().toLowerCase();

    return PREFIXES.filter((prefix) =>
      prefix.value.toLowerCase().startsWith(normalizedValue),
    );
  }, [value]);

  return (
    <div className="relative w-full max-w-lg">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-500/10">
        <span className="text-slate-500 dark:text-sky-300" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="m13 13 4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 100)}
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder={placeholder}
        />
      </div>

      {showPrefixMenu && filteredPrefixes.length > 0 ? (
        <div className="absolute mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Prefijos sugeridos
          </p>
          <ul className="space-y-1">
            {filteredPrefixes.map((prefix) => (
              <li key={prefix.value}>
                <button
                  type="button"
                  onClick={() => onChange(`${prefix.value} `)}
                  className="w-full rounded-lg px-2 py-1 text-left text-sm text-slate-800 transition-all duration-200 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="block font-medium">{prefix.value}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {prefix.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
