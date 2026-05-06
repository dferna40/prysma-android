import { useState } from 'react';
import type { ReactNode } from 'react';
import { IdentityWidget } from '../ui/IdentityWidget';
import { SearchBar } from '../ui/SearchBar';

const externalTools = [
  { name: 'Jira indra', url: 'https://jira.indra.es/secure/Dashboard.jspa' },
  {
    name: 'iTeams',
    url: 'http://10.22.206.214:8180/ione-gestion-configuracion/CULogin/LoginAceptar.do?&SESSION_CLIENT_STATE=1777993003974#',
  },
  {
    name: 'Escritorio onesait Local',
    url: 'http://localhost.npa.com:8080/npa-escritorio',
  },
  {
    name: 'Escritorio onesait int1',
    url: 'https://acdc-int1.caja.rural:8543/npa-escritorio',
  },
  {
    name: 'Escritorio onesait int2',
    url: 'https://acdc-int2.caja.rural:8543/npa-escritorio',
  },
  {
    name: 'Escritorio onesait uat',
    url: 'https://acdc-uat.caja.rural:8643/npa-escritorio',
  },
  {
    name: 'Escritorio onesait pre',
    url: 'https://acdc-pre.caja.rural:8443/npa-escritorio',
  },
  {
    name: 'Correo corporativo indra',
    url: 'https://outlook.cloud.microsoft/mail/',
  },
  {
    name: 'Correo corporativo Keapps',
    url: 'https://serviciodecorreo.es/?_task=mail&_mbox=INBOX',
  },
  { name: 'Word 365', url: 'https://word.cloud.microsoft/' },
  {
    name: 'Excel 365',
    url: 'https://excel.cloud.microsoft/?wdOrigin=OFFICECOM-WEB.APPGALLERY',
  },
  {
    name: 'Cezanne Keapps',
    url: 'https://w3.cezanneondemand.com/CezanneHR/-/KEAPPS/view/9ebaad0a-8ad5-4d97-b2f1-e5d179149a81?ce=3&et=4d8970cb-6164-4162-b780-4574ff852be1&n=6c5063b4-8307-4f55-b968-ddc3e36e154d',
  },
  { name: 'Wiki onesait general', url: '#' },
  { name: 'Wiki onesait 5.0', url: '#' },
];

// Para cualquier lógica Java que maneje peticiones de red desde este
// asistente, utiliza siempre try-catch-resources para garantizar la
// seguridad y el cierre de conexiones.

interface MainLayoutProps {
  children: ReactNode;
  headerActions?: ReactNode;
  topBarContent?: ReactNode;
  sidebarContent?: ReactNode;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  onHomeClick?: () => void;
}

export function MainLayout({
  children,
  headerActions,
  topBarContent,
  sidebarContent,
  searchTerm = '',
  onSearchTermChange,
  onHomeClick,
}: MainLayoutProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const activeSearchTerm = onSearchTermChange ? searchTerm : internalSearchTerm;
  const handleSearchTermChange = onSearchTermChange ?? setInternalSearchTerm;

  const closeSidebar = () => setIsSidebarOpen(false);
  const handleHomeNavigation = () => {
    handleSearchTermChange('');
    onHomeClick?.();
    closeSidebar();
  };

  const defaultSidebarContent = (
    <div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Herramientas Externas
        </p>
        <nav aria-label="Herramientas externas">
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {externalTools.map((tool) => (
              <li key={tool.name}>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeSidebar}
                  className="inline-flex items-start gap-2 text-[11px] leading-4 text-slate-600 transition-all duration-200 hover:text-sky-700"
                >
                  <span>{tool.name}</span>
                  <span aria-hidden="true" className="text-xs text-slate-400">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );

  const mobileSidebarPanel = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="bg-slate-50/85 p-4 backdrop-blur supports-[backdrop-filter]:bg-slate-50/70">
        <IdentityWidget />
      </div>

      <div className="border-t border-slate-100 p-4">
        {sidebarContent ?? defaultSidebarContent}
      </div>
    </div>
  );

  const desktopSidebarPanel = (
    <div className="flex flex-col">
      <div className="bg-slate-50/85 p-4 backdrop-blur supports-[backdrop-filter]:bg-slate-50/70">
        <IdentityWidget />
      </div>

      <div className="border-t border-slate-100 p-4">
        {sidebarContent ?? defaultSidebarContent}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <div
          className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity duration-200 sm:hidden ${
            isSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={closeSidebar}
          aria-hidden="true"
        />

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[88vw] max-w-80 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 sm:hidden ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Menu lateral movil"
          aria-hidden={!isSidebarOpen}
        >
          <div className="flex items-center justify-end border-b border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={closeSidebar}
              aria-label="Cerrar menu lateral"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-600 transition-all duration-200 hover:border-slate-300 hover:text-slate-900"
            >
              ×
            </button>
          </div>
          {mobileSidebarPanel}
        </aside>

        <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white sm:block">
          {desktopSidebarPanel}
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 min-h-16 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-6">
            {topBarContent ?? (
              <div className="flex h-full flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Abrir menu lateral"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 transition-all duration-200 hover:border-slate-300 hover:text-slate-900 sm:hidden"
                  >
                    ☰
                  </button>
                  <button
                    type="button"
                    onClick={handleHomeNavigation}
                    className="cursor-pointer text-left text-sm font-semibold text-slate-900 transition-all duration-200 hover:text-sky-700 sm:text-base md:text-lg"
                  >
                    Asistente Onesite RGA
                  </button>
                  <div className="min-w-0 flex-1">
                    <SearchBar
                      value={activeSearchTerm}
                      onChange={handleSearchTermChange}
                    />
                  </div>
                </div>

                {headerActions ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {headerActions}
                  </div>
                ) : null}
              </div>
            )}
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
