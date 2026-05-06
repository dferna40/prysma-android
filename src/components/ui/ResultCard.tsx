import { useState } from 'react';
import {
  getCategoryColorHex,
  getCategoryTheme,
} from '../../constants/categoryColors';
import type { CategoryColorKey, KnowledgeEntry } from '../../types';

interface ResultCardProps {
  categoryColorKey?: CategoryColorKey;
  entry: KnowledgeEntry;
  onCommandSave: (
    entryId: string,
    commandLabel: string,
    nextValue: string,
  ) => void;
  onEditEntry?: (entry: KnowledgeEntry) => void;
}

const technicalTokenPattern =
  /([A-Za-z]:\\[^\s\n]+|\/[a-z]+|[A-Z_]{2,}(?:\.[A-Z_]+)?|SELECT\s+[^.\n;]+;?)/g;

const sensitiveLabelPattern = /\b(password|pass|clave)\b/i;

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

const isSensitiveLabel = (label: string) => sensitiveLabelPattern.test(label);

const maskValue = (value: string) => '*'.repeat(Math.max(value.length, 8));

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

export function ResultCard({
  categoryColorKey = 'slate',
  entry,
  onCommandSave,
  onEditEntry,
}: ResultCardProps) {
  const [hiddenFields, setHiddenFields] = useState<Record<string, boolean>>({});
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const categoryStyle = getCategoryTheme(categoryColorKey);
  const categoryColor = getCategoryColorHex(categoryColorKey);

  // Recordatorio: Para cualquier lógica Java que procese estos parámetros de configuración o acceso, es obligatorio el uso de try-catch-resources para la gestión de excepciones y cierre de flujos.

  const toggleFieldVisibility = (fieldKey: string) => {
    setHiddenFields((current) => ({
      ...current,
      [fieldKey]: !current[fieldKey],
    }));
  };

  const startEditingField = (fieldKey: string, currentValue: string) => {
    setDraftValues((current) => ({
      ...current,
      [fieldKey]: currentValue,
    }));
    setEditingFields((current) => ({
      ...current,
      [fieldKey]: true,
    }));
  };

  const cancelEditingField = (fieldKey: string) => {
    setEditingFields((current) => ({
      ...current,
      [fieldKey]: false,
    }));
    setDraftValues((current) => {
      const nextDraftValues = { ...current };
      delete nextDraftValues[fieldKey];
      return nextDraftValues;
    });
  };

  const saveEditingField = (
    fieldKey: string,
    commandLabel: string,
    currentValue: string,
  ) => {
    const nextValue = draftValues[fieldKey] ?? currentValue;
    onCommandSave(entry.id, commandLabel, nextValue);
    setEditingFields((current) => ({
      ...current,
      [fieldKey]: false,
    }));
    setDraftValues((current) => {
      const nextDraftValues = { ...current };
      delete nextDraftValues[fieldKey];
      return nextDraftValues;
    });
  };

  return (
    <article
      className={`w-full rounded-2xl border border-slate-100 border-l-4 bg-white p-4 shadow-sm sm:p-5 ${categoryStyle.cardAccent}`}
      data-category-color={categoryColor}
    >
      {entry.categoria === 'UML' ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          ⚠️ PROTOCOLO CRÍTICO: ¿Has hecho el LOCK en SVN?
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${categoryStyle.badge}`}
          >
            {entry.categoria}
          </span>
          <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
            {entry.titulo}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-start">
          {onEditEntry ? (
            <button
              type="button"
              onClick={() => onEditEntry(entry)}
              aria-label={`Editar ficha ${entry.titulo}`}
              title={`Editar ficha ${entry.titulo}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="M3 14.5V17h2.5L15 7.5 12.5 5 3 14.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="m11.5 6 2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}

          <span className="w-fit rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
            {entry.id}
          </span>
        </div>
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
          <div className="mt-3 space-y-2">
            {entry.comandos.map((command, index) => {
              const fieldKey = `${entry.id}-${command.label}-${index}`;
              const sensitive = isSensitiveLabel(command.label);
              const isHidden = sensitive && hiddenFields[fieldKey];
              const isEditing = Boolean(editingFields[fieldKey]);
              const draftValue = draftValues[fieldKey] ?? command.value;
              const displayedValue = isHidden
                ? maskValue(command.value)
                : command.value;

              return (
                <div
                  key={fieldKey}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white/90 p-2.5 sm:grid-cols-[minmax(96px,120px)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="text-xs font-semibold text-slate-700">
                    {command.label}
                  </span>

                  <div
                    className={`min-w-0 rounded-lg border bg-slate-50 px-2.5 py-2 font-mono text-xs text-slate-800 transition-all duration-200 ${
                      isEditing ? 'shadow-sm' : 'border-slate-200'
                    }`}
                    style={
                      isEditing
                        ? {
                            borderColor: categoryColor,
                            boxShadow: `0 0 0 1px ${categoryColor}33`,
                          }
                        : undefined
                    }
                  >
                    {isEditing ? (
                      <input
                        type={sensitive && isHidden ? 'password' : 'text'}
                        value={draftValue}
                        onChange={(event) =>
                          setDraftValues((current) => ({
                            ...current,
                            [fieldKey]: event.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                        aria-label={`Editar ${command.label}`}
                        autoFocus
                      />
                    ) : (
                      <span className="block overflow-x-auto whitespace-nowrap transition-all duration-200">
                        {displayedValue}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    {sensitive ? (
                      <button
                        type="button"
                        onClick={() => toggleFieldVisibility(fieldKey)}
                        aria-label={isHidden ? 'Mostrar valor' : 'Ocultar valor'}
                        title={isHidden ? 'Mostrar valor' : 'Ocultar valor'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                      >
                        {isHidden ? (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="2.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </svg>
                        ) : (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              d="M3 3l14 14"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <path
                              d="M8.9 5.4A9.4 9.4 0 0 1 10 5c5 0 8 5 8 5a14.3 14.3 0 0 1-2.5 2.9M11.4 11.5A2.5 2.5 0 0 1 8.5 8.6M5.1 7.1A14.5 14.5 0 0 0 2 10s3 5 8 5c1.2 0 2.3-.3 3.3-.8"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    ) : null}

                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            saveEditingField(fieldKey, command.label, command.value)
                          }
                          aria-label={`Guardar ${command.label}`}
                          title={`Guardar ${command.label}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              d="m4 10 4 4 8-8"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => cancelEditingField(fieldKey)}
                          aria-label={`Cancelar edicion de ${command.label}`}
                          title={`Cancelar edicion de ${command.label}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              d="M5 5l10 10M15 5 5 15"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditingField(fieldKey, command.value)}
                          aria-label={`Editar ${command.label}`}
                          title={`Editar ${command.label}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <path
                              d="M3 14.5V17h2.5L15 7.5 12.5 5 3 14.5Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                            />
                            <path
                              d="m11.5 6 2.5 2.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(command.value)}
                          aria-label={`Copiar ${command.label}`}
                          title={`Copiar ${command.label}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                          >
                            <rect
                              x="7"
                              y="3"
                              width="9"
                              height="11"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M5 7H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}
