import { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { ResultCard } from './components/ui/ResultCard';
import manualEntries from './data/manual.json';
import { useSearch } from './hooks/useSearch';
import type { KnowledgeCategory, KnowledgeEntry } from './types';

export const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const entries = manualEntries as KnowledgeEntry[];
  const results = useSearch(entries, searchTerm);
  const categories = Array.from(
    new Set(entries.map((entry) => entry.categoria)),
  ) as KnowledgeCategory[];
  const hasSearchTerm = searchTerm.trim().length > 0;

  return (
    <MainLayout searchTerm={searchTerm} onSearchTermChange={setSearchTerm}>
      <section className="space-y-6">
        {hasSearchTerm ? (
          <>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Resultados
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {results.length} coincidencia{results.length === 1 ? '' : 's'} para{' '}
                <span className="font-medium text-slate-800">"{searchTerm}"</span>.
              </p>
            </div>

            {results.length ? (
              <div className="grid gap-4">
                {results.map((entry) => (
                  <ResultCard key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">
                  No hemos encontrado resultados
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Prueba con otra palabra clave o usa prefijos como <code>/env</code> o{' '}
                  <code>/cmd</code>.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              Escribe algo para empezar...
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Puedes buscar por titulo, categoria, contenido, tags o usar prefijos
              para ir mas rapido a entorno, comandos o batch.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </MainLayout>
  );
};
