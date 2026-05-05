import type { KnowledgeEntry } from '../../types';

interface ResultCardProps {
  entry: KnowledgeEntry;
}

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

export function ResultCard({ entry }: ResultCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            {entry.categoria}
          </span>
          <h3 className="text-xl font-semibold text-slate-900">{entry.titulo}</h3>
        </div>

        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
          {entry.id}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{entry.contenido}</p>

      {entry.pasos?.length ? (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-800">Pasos</h4>
          <ol className="mt-2 space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {entry.pasos.map((step) => (
              <li key={step} className="list-decimal">
                {step}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {entry.comandos?.length ? (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-800">Comandos utiles</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.comandos.map((command) => (
              <button
                key={`${entry.id}-${command.label}`}
                type="button"
                onClick={() => copyToClipboard(command.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                Copiar {command.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
