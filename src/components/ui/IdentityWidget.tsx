import { useState } from 'react';
import type { AppCustomizationSettings } from '../../types';

interface IdentityAccount {
  id: string;
  companyCode: string;
  username: string;
}

const globalRgaCredentials = {
  username: 'DavidFR_Ext@segurosrga.es',
  password: 'De$Minsait.Rg@',
};

const masterPassword = 'T3$t01p@2020';

const identityAccounts: IdentityAccount[] = [
  {
    id: 'company-01',
    companyCode: '01',
    username: 'testoip4',
  },
  {
    id: 'company-02',
    companyCode: '02',
    username: 'testoip3',
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

const maskedValue = '••••••••••••••••••••';

interface IdentityWidgetProps {
  customization: AppCustomizationSettings;
}

export function IdentityWidget({ customization }: IdentityWidgetProps) {
  const [isGlobalRgaVisible, setIsGlobalRgaVisible] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
          {customization.sidebarIdentityTitle}
        </p>

        <section className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
            <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm font-semibold tracking-[0.08em] text-slate-800 dark:bg-black dark:text-white">
              {masterPassword}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(masterPassword)}
              aria-label="Copiar clave maestra"
              title="Copiar clave maestra"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600 transition-all duration-200 hover:bg-sky-100 hover:text-sky-700 dark:bg-black dark:text-slate-200 dark:hover:text-white"
            >
              ⎘
            </button>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
              {customization.companyUsersLabel}
            </p>
            <div className="mt-2 space-y-2">
              {identityAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-sky-50 px-2 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                      {account.companyCode}
                    </span>
                    <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm font-medium text-slate-800 dark:bg-black dark:text-white">
                      {account.username}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(account.username)}
                    aria-label={`Copiar usuario ${account.username} de compania ${account.companyCode}`}
                    title="Copiar usuario"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600 transition-all duration-200 hover:bg-sky-100 hover:text-sky-700 dark:bg-black dark:text-slate-200 dark:hover:text-white"
                  >
                    ⎘
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
            {customization.globalRgaTitle}
          </p>
          <button
            type="button"
            onClick={() => setIsGlobalRgaVisible((currentValue) => !currentValue)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-black dark:text-slate-200 dark:hover:text-white"
          >
            {isGlobalRgaVisible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        <section className="mt-4 space-y-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
              {customization.globalUserLabel}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm font-medium text-slate-800 dark:bg-black dark:text-white">
                {isGlobalRgaVisible ? globalRgaCredentials.username : maskedValue}
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    isGlobalRgaVisible
                      ? globalRgaCredentials.username
                      : 'Credencial oculta',
                  )
                }
                aria-label="Copiar usuario Global RGA"
                title="Copiar usuario"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600 transition-all duration-200 hover:bg-violet-100 hover:text-violet-700 dark:bg-black dark:text-slate-200 dark:hover:text-white"
              >
                ⎘
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
              {customization.globalPasswordLabel}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm font-medium text-slate-800 dark:bg-black dark:text-white">
                {isGlobalRgaVisible ? globalRgaCredentials.password : maskedValue}
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    isGlobalRgaVisible
                      ? globalRgaCredentials.password
                      : 'Credencial oculta',
                  )
                }
                aria-label="Copiar password Global RGA"
                title="Copiar password"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600 transition-all duration-200 hover:bg-violet-100 hover:text-violet-700 dark:bg-black dark:text-slate-200 dark:hover:text-white"
              >
                ⎘
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
