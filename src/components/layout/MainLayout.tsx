import { useState } from 'react';
import type { ReactNode } from 'react';
import { IdentityWidget } from '../ui/IdentityWidget';
import { SearchBar } from '../ui/SearchBar';

interface MainLayoutProps {
  children: ReactNode;
  topBarContent?: ReactNode;
  sidebarContent?: ReactNode;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  onHomeClick?: () => void;
}

export function MainLayout({
  children,
  topBarContent,
  sidebarContent,
  searchTerm = '',
  onSearchTermChange,
  onHomeClick,
}: MainLayoutProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const activeSearchTerm = onSearchTermChange ? searchTerm : internalSearchTerm;
  const handleSearchTermChange = onSearchTermChange ?? setInternalSearchTerm;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-80 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
          <div className="shrink-0 border-b border-slate-200 bg-slate-50/85 p-4 backdrop-blur supports-[backdrop-filter]:bg-slate-50/70">
            <IdentityWidget />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {sidebarContent ?? (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    handleSearchTermChange('');
                    onHomeClick?.();
                  }}
                  className="cursor-pointer text-left text-lg font-semibold text-slate-900 transition-all duration-200 hover:text-sky-700"
                >
                  Asistente RGA
                </button>
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
