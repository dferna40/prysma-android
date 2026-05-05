interface IdentityAccount {
  id: string;
  companyCode: string;
  username: string;
}

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

export function IdentityWidget() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Accesos
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Guia de acceso
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
          Visible
        </span>
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Acceso Maestro
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <span className="truncate text-sm font-semibold tracking-[0.08em] text-slate-800">
            {masterPassword}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(masterPassword)}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Copiar
          </button>
        </div>
      </section>

      <section className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Usuarios por Compania
        </p>
        <div className="mt-2 space-y-2">
          {identityAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-sky-50 px-2 text-[11px] font-semibold text-sky-700">
                  {account.companyCode}
                </span>
                <span className="truncate text-sm font-medium text-slate-800">
                  {account.username}
                </span>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(account.username)}
                aria-label={`Copiar usuario ${account.username} de compania ${account.companyCode}`}
                title="Copiar usuario"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-sm text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                ⧉
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
