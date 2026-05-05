import { useMemo, useState } from 'react';

const PREFIXES = ['/cmd', '/env', '/db', '/uml', '/task'];

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Busca por título, tag o usa prefijos…',
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const showPrefixMenu = isFocused && value.trim().startsWith('/');

  const filteredPrefixes = useMemo(() => {
    const normalizedValue = value.trim().toLowerCase();

    return PREFIXES.filter((prefix) =>
      prefix.toLowerCase().startsWith(normalizedValue),
    );
  }, [value]);

  return (
    <div className="relative w-full max-w-lg">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
        <span className="text-slate-400" aria-hidden="true">
          🔍
        </span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 100)}
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          placeholder={placeholder}
        />
      </div>

      {showPrefixMenu && filteredPrefixes.length > 0 ? (
        <div className="absolute mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Prefijos sugeridos
          </p>
          <ul className="space-y-1">
            {filteredPrefixes.map((prefix) => (
              <li key={prefix}>
                <button
                  type="button"
                  onClick={() => onChange(`${prefix} `)}
                  className="w-full rounded-lg px-2 py-1 text-left text-sm text-slate-700 transition-all duration-200 hover:bg-slate-100"
                >
                  {prefix}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
