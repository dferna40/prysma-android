import { categoryColors, categoryThemes } from '../../constants/categoryColors';
import type { KnowledgeEntry } from '../../types';

interface ResultCardProps {
  entry: KnowledgeEntry;
}

const technicalTokenPattern =
  /([A-Za-z]:\\[^\s\n]+|\/[a-z]+|[A-Z_]{2,}(?:\.[A-Z_]+)?|SELECT\s+[^.\n;]+;?)/g;

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

const isTechnicalToken = (value: string) =>
  /^[A-Za-z]:\\[^\s\n]+$/.test(value) ||
  /^\/[a-z]+$/i.test(value) ||
  /^[A-Z_]{2,}(?:\.[A-Z_]+)?$/.test(value) ||
  /^SELECT\s+/i.test(value);

const renderTechnicalText = (text: string, keyPrefix: string) =>
  text.split(technicalTokenPattern).map((part, index) =>
    isTechnicalToken(part) ? (
      <code
        key={`${keyPrefix}-${index}`}
        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800"
      >
        {part}
      </code>
    ) : (
      <span key={`${keyPrefix}-${index}`}>{part}</span>
    ),
  );

export function ResultCard({ entry }: ResultCardProps) {
  const categoryStyle = categoryThemes[entry.categoria];
  const categoryColor = categoryColors[entry.categoria];

  return (
    <article
      className={`rounded-2xl border border-slate-100 border-l-4 bg-white p-5 shadow-sm ${categoryStyle.cardAccent}`}
      data-category-color={categoryColor}
    >
      {entry.categoria === 'UML' ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          ⚠️ PROTOCOLO CRÍTICO: ¿Has hecho el LOCK en SVN?
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${categoryStyle.badge}`}
          >
            {entry.categoria}
          </span>
          <h3 className="text-xl font-semibold text-slate-900">{entry.titulo}</h3>
        </div>

        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
          {entry.id}
        </span>
      </div>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {renderTechnicalText(entry.contenido, `${entry.id}-content`)}
      </div>

      {entry.pasos?.length ? (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-800">Pasos</h4>
          <ol className="mt-2 space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {entry.pasos.map((step, index) => (
              <li key={step} className="list-decimal">
                {renderTechnicalText(step, `${entry.id}-step-${index}`)}
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
                className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ${categoryStyle.button}`}
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
