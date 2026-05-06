import { useMemo, useState } from 'react';
import type { KnowledgeEntry } from '../../types';

interface SidebarUtilitiesProps {
  onRestoreEntry: (entryId: string) => void;
  trashEntries: KnowledgeEntry[];
}

type ExpandedTool = 'json' | 'sql' | null;

const sqlKeywords = [
  'SELECT',
  'FROM',
  'WHERE',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'JOIN',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'LIMIT',
  'AND',
  'OR',
];

const formatJsonInput = (rawValue: string) => {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return '';
  }

  const normalizedValue = trimmedValue
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    .replace(/'([^']*)'\s*:/g, '"$1":');

  return JSON.stringify(JSON.parse(normalizedValue), null, 2);
};

const formatSqlInput = (rawValue: string) => {
  const compactValue = rawValue.replace(/\s+/g, ' ').trim();
  if (!compactValue) {
    return '';
  }

  let formattedValue = compactValue;

  sqlKeywords.forEach((keyword) => {
    const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    formattedValue = formattedValue.replace(pattern, `\n${keyword}`);
  });

  return formattedValue
    .trim()
    .replace(/\n(AND|OR)\b/g, '\n  $1')
    .replace(/\n(VALUES|SET)\b/g, '\n$1')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

export function SidebarUtilities({
  onRestoreEntry,
  trashEntries,
}: SidebarUtilitiesProps) {
  const [expandedTool, setExpandedTool] = useState<ExpandedTool>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [sqlInput, setSqlInput] = useState('');

  const jsonResult = useMemo(() => {
    if (!jsonInput.trim()) {
      return {
        error: '',
        value: '',
      };
    }

    try {
      return {
        error: '',
        value: formatJsonInput(jsonInput),
      };
    } catch {
      return {
        error:
          'No se pudo interpretar el JSON con las reglas basicas de limpieza.',
        value: '',
      };
    }
  }, [jsonInput]);

  const formattedSql = useMemo(() => formatSqlInput(sqlInput), [sqlInput]);
  const trashHasItems = trashEntries.length > 0;

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              DevTools
            </h3>
          </div>

          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  JSON Formatter
                </p>
                <button
                  type="button"
                  onClick={() => setExpandedTool('json')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  title="Expandir JSON Formatter"
                  aria-label="Expandir JSON Formatter"
                >
                  ⤢
                </button>
              </div>
              <textarea
                value={jsonInput}
                onChange={(event) => setJsonInput(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
                placeholder='{"clave":"valor"}'
              />
              {jsonResult.error ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {jsonResult.error}
                </p>
              ) : jsonResult.value ? (
                <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {jsonResult.value}
                </pre>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  SQL Beautifier
                </p>
                <button
                  type="button"
                  onClick={() => setExpandedTool('sql')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  title="Expandir SQL Beautifier"
                  aria-label="Expandir SQL Beautifier"
                >
                  ⤢
                </button>
              </div>
              <textarea
                value={sqlInput}
                onChange={(event) => setSqlInput(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
                placeholder="select * from tabla where id = 1"
              />
              {formattedSql ? (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {formattedSql}
                </pre>
              ) : null}
            </div>
          </div>
        </section>

        <section
          className={`rounded-2xl border p-3 ${
            trashHasItems
              ? 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20'
              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`text-xs font-bold uppercase tracking-[0.2em] ${
                trashHasItems
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              Papelera
            </h3>
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                trashHasItems
                  ? 'bg-red-100 text-red-500 dark:bg-red-950/50 dark:text-red-400'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              {trashEntries.length}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {trashEntries.length ? (
              trashEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-red-100 bg-white p-2.5 dark:border-red-900/40 dark:bg-slate-950/60"
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {entry.titulo}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-red-500 dark:text-red-400">
                    {entry.categoria}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRestoreEntry(entry.id)}
                    className="mt-2 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:text-red-700 dark:border-red-900/40 dark:bg-slate-900 dark:text-red-300"
                  >
                    Restaurar
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                No hay fichas borradas.
              </p>
            )}
          </div>
        </section>
      </div>

      {expandedTool ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/65 p-4">
          <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {expandedTool === 'json' ? 'JSON Formatter' : 'SQL Beautifier'}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Editor ampliado para trabajar con volumenes largos de datos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExpandedTool(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Cerrar
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-2">
              <div className="min-h-0 border-r border-slate-200 p-5 dark:border-slate-800">
                <textarea
                  value={expandedTool === 'json' ? jsonInput : sqlInput}
                  onChange={(event) =>
                    expandedTool === 'json'
                      ? setJsonInput(event.target.value)
                      : setSqlInput(event.target.value)
                  }
                  className="h-full min-h-[320px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder={
                    expandedTool === 'json'
                      ? '{"clave":"valor"}'
                      : 'select * from tabla where id = 1'
                  }
                />
              </div>

              <div className="min-h-0 overflow-y-auto p-5">
                {expandedTool === 'json' ? (
                  jsonResult.error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                      {jsonResult.error}
                    </div>
                  ) : (
                    <pre className="h-full min-h-[320px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {jsonResult.value || 'La vista formateada aparecera aqui.'}
                    </pre>
                  )
                ) : (
                  <pre className="h-full min-h-[320px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {formattedSql || 'La vista formateada aparecera aqui.'}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
