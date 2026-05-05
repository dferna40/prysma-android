import { useState } from 'react';
import type { ReactNode } from 'react';
import { SearchBar } from '../ui/SearchBar';

interface MainLayoutProps {
  children: ReactNode;
  topBarContent?: ReactNode;
  sidebarContent?: ReactNode;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
}

interface SidebarAccount {
  id: string;
  company: string;
  username: string;
  password: string;
}

const sidebarAccounts: SidebarAccount[] = [
  {
    id: 'onesait-rga',
    company: 'Onesait / RGA',
    username: 'testoip4',
    password: 'T3$t01p@2020',
  },
];

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export function MainLayout({
  children,
  topBarContent,
  sidebarContent,
  searchTerm = '',
  onSearchTermChange,
}: MainLayoutProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const activeSearchTerm = onSearchTermChange ? searchTerm : internalSearchTerm;
  const handleSearchTermChange = onSearchTermChange ?? setInternalSearchTerm;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-80 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
          <div className="shrink-0 border-b border-slate-200 bg-slate-50/85 p-4 backdrop-blur supports-[backdrop-filter]:bg-slate-50/70">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Accesos
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Usuarios disponibles
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  Siempre visible
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {sidebarAccounts.map((account) => (
                  <article
                    key={account.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {account.company}
                    </p>

                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                          Usuario
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-700">
                            {account.username}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(account.username)}
                            className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                          Clave
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-slate-700">
                            {account.password}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(account.password)}
                            className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {sidebarContent ?? (
              <div>
                <h2 className="text-lg font-semibold">Asistente RGA</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Navegacion del asistente de supervivencia.
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 min-h-16 border-b border-slate-200 bg-white/95 px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            {topBarContent ?? (
              <div className="flex h-full flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-72 flex-1 items-center gap-4">
                  <h1 className="text-base font-semibold md:text-lg">
                    Asistente de Supervivencia RGA
                  </h1>
                  <SearchBar
                    value={activeSearchTerm}
                    onChange={handleSearchTermChange}
                  />
                </div>
              </div>
            )}
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
