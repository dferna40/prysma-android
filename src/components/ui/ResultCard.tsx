import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getCategoryColorHex,
  getCategoryTheme,
} from '../../constants/categoryColors';
import { runtimeBridge } from '../../services/runtimeBridge';
import { copyTextToClipboard } from '../../utils/clipboard';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { CategoryColorKey, KnowledgeEntry } from '../../types';

interface ResultCardProps {
  activeTags?: string[];
  categoryColorKey?: CategoryColorKey;
  compact?: boolean;
  entry: KnowledgeEntry;
  onCommandSave: (
    entryId: string,
    commandLabel: string,
    nextValue: string,
  ) => void;
  onDeleteEntry?: (entryId: string) => void;
  onEditEntry?: (entry: KnowledgeEntry) => void;
  onExportPdf?: (entry: KnowledgeEntry) => void;
  onTagClick?: (tag: string) => void;
  onTogglePin?: (entryId: string) => void;
  pdfIsGenerating?: boolean;
}

const healthLabelPattern = /\b(url|endpoint|host)\b/i;
const sensitiveLabelPattern = /\b(password|pass|clave)\b/i;
type HealthCheckStatus = {
  detail?: string;
  state: 'checking' | 'healthy' | 'error';
};

// Recordatorio: Para cualquier proceso en Java que gestione la configuración de estos iconos o estados de usuario, es obligatorio utilizar try-catch-resources para el cierre seguro de flujos de datos.
const actionButtonBaseClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900';
const actionIconClass = 'icon-neon h-5 w-5';

const isHealthCheckLabel = (label: string) => healthLabelPattern.test(label);
const isSensitiveLabel = (label: string) => sensitiveLabelPattern.test(label);

const maskValue = (value: string) => '*'.repeat(Math.max(value.length, 8));
const isFieldVisible = (fieldKey: string, sensitive: boolean, hiddenFields: Record<string, boolean>) =>
  !sensitive || hiddenFields[fieldKey] === true;
const formatUpdatedAt = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-ES').format(date);
};

const normalizeHealthTarget = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^(localhost|127\.0\.0\.1|\[::1\]|::1)(?::\d+)?(\/.*)?$/i.test(trimmedValue)) {
    return `http://${trimmedValue.replace(/^\[::1\]/i, '::1')}`;
  }

  if (/^[a-z0-9.-]+(?::\d+)?(\/.*)?$/i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  return null;
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalizedHex = hex.replace('#', '');
  const expandedHex =
    normalizedHex.length === 3
      ? normalizedHex
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalizedHex;

  const red = Number.parseInt(expandedHex.slice(0, 2), 16);
  const green = Number.parseInt(expandedHex.slice(2, 4), 16);
  const blue = Number.parseInt(expandedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getCommandValueTone = (value: string) => {
  const trimmedValue = value.trim();

  if (/^[A-Za-z]:\\|^\.\.?\\|^\//.test(trimmedValue) || /[\\/]/.test(trimmedValue)) {
    return 'dark:text-sky-300';
  }

  if (/\d/.test(trimmedValue) || /^[A-Za-z0-9_.:-]+$/.test(trimmedValue)) {
    return 'dark:text-emerald-400';
  }

  return 'dark:text-slate-100';
};

const shouldIgnoreCardClick = (
  target: EventTarget | null,
  currentTarget: EventTarget | null,
) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const interactiveAncestor = target.closest(
    'button, a, input, textarea, select, label, summary, [role="button"]',
  );

  return Boolean(interactiveAncestor && interactiveAncestor !== currentTarget);
};

export function ResultCard({
  activeTags = [],
  categoryColorKey = 'slate',
  compact = false,
  entry,
  onCommandSave,
  onDeleteEntry,
  onEditEntry,
  onExportPdf,
  onTagClick,
  onTogglePin,
  pdfIsGenerating = false,
}: ResultCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hiddenFields, setHiddenFields] = useState<Record<string, boolean>>({});
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [healthStatuses, setHealthStatuses] = useState<Record<string, HealthCheckStatus>>({});

  const categoryStyle = getCategoryTheme(categoryColorKey);
  const categoryColor = getCategoryColorHex(categoryColorKey);
  const formattedUpdatedAt = formatUpdatedAt(entry.updatedAt);
  const glowStyle = {
    '--card-glow': hexToRgba(categoryColor, 0.14),
    '--card-ring': hexToRgba(categoryColor, 0.22),
    '--icon-glow': hexToRgba(categoryColor, 0.4),
    '--section-gradient-accent': hexToRgba(categoryColor, 0.12),
    '--section-gradient-soft': hexToRgba(categoryColor, 0.06),
    '--section-gradient-border': hexToRgba(categoryColor, 0.24),
    '--section-gradient-highlight': hexToRgba(categoryColor, 0.18),
    '--section-pill-accent': hexToRgba(categoryColor, 0.16),
    '--section-pill-border': hexToRgba(categoryColor, 0.28),
  } as CSSProperties;

  // Recordatorio: Para cualquier logica Java que procese estos parametros de configuracion o acceso, es obligatorio el uso de try-catch-resources para la gestion de excepciones y cierre de flujos.

  const runHealthCheck = async (commandLabel: string, commandValue: string) => {
    const targetUrl = normalizeHealthTarget(commandValue);

    if (!targetUrl) {
      setHealthStatuses((current) => ({
        ...current,
        [commandLabel]: {
          detail: 'URL no valida',
          state: 'error',
        },
      }));
      return;
    }

    setHealthStatuses((current) => ({
      ...current,
      [commandLabel]: {
        detail: `Comprobando ${targetUrl}`,
        state: 'checking',
      },
    }));

    try {
      const result = await runtimeBridge.checkEndpoint(targetUrl);

      setHealthStatuses((current) => ({
        ...current,
        [commandLabel]: result.ok
          ? {
              detail: result.status
                ? `Activo (${result.status}${result.statusText ? ` ${result.statusText}` : ''})`
                : 'Activo',
              state: 'healthy',
            }
          : {
              detail:
                result.reason === 'unsupported-local-target'
                  ? 'No se valida localhost desde esta app'
                  : result.reason === 'request-failed'
                  ? 'No se pudo conectar'
                  : result.status
                  ? `Respondio ${result.status}${result.statusText ? ` ${result.statusText}` : ''}`
                    : 'Inaccesible',
              state: 'error',
            },
      }));
    } catch {
      setHealthStatuses((current) => ({
        ...current,
        [commandLabel]: {
          detail: 'No se pudo validar el endpoint',
          state: 'error',
        },
      }));
    }
  };

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

  const openEntryEditor = () => {
    onEditEntry?.(entry);
  };

  return (
    <article
      role={onEditEntry ? 'button' : undefined}
      tabIndex={onEditEntry ? 0 : undefined}
      onClick={(event) => {
        if (!onEditEntry || shouldIgnoreCardClick(event.target, event.currentTarget)) {
          return;
        }

        openEntryEditor();
      }}
      onKeyDown={(event) => {
        if (!onEditEntry || shouldIgnoreCardClick(event.target, event.currentTarget)) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openEntryEditor();
        }
      }}
      aria-label={onEditEntry ? `Editar ficha ${entry.titulo}` : undefined}
      className={`section-gradient-card neon-card w-full border border-slate-200 shadow-sm transition-all duration-200 ${
        onEditEntry ? 'cursor-pointer hover:border-sky-300 dark:hover:border-sky-500/40' : ''
      } ${
        compact
          ? 'rounded-[1.35rem] p-3.5 sm:p-4'
          : 'rounded-[1.6rem] p-4 sm:p-5'
      }`}
      data-category-color={categoryColor}
      style={glowStyle}
    >
      {entry.categoria === 'UML' ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          PROTOCOLO CRITICO: Has hecho el LOCK en SVN?
        </div>
      ) : null}

      <div className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between ${compact ? 'gap-2.5' : 'gap-3'}`}>
        <div className={`min-w-0 ${compact ? 'space-y-1.5' : 'space-y-2'}`}>
          <span
            className={`section-gradient-pill inline-flex rounded-full border font-semibold uppercase ${categoryStyle.badge} ${
              compact
                ? 'px-2.5 py-0.5 text-[10px] tracking-[0.14em]'
                : 'px-3 py-1 text-xs tracking-[0.16em]'
            }`}
          >
            {entry.categoria}
          </span>
          <h3 className={`font-semibold text-slate-900 dark:text-slate-100 ${
            compact ? 'text-base sm:text-lg leading-6' : 'text-lg sm:text-xl'
          }`}>
            {entry.titulo}
          </h3>
          {entry.tags.length ? (
            <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
              {(compact ? entry.tags.slice(0, 4) : entry.tags).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className={`inline-flex rounded-full border font-medium lowercase transition-colors ${
                    compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
                  } ${
                    activeTags.includes(tag.toLowerCase())
                      ? 'border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-400/70 dark:bg-sky-500/20 dark:text-sky-200'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-500/50 dark:hover:bg-sky-500/10 dark:hover:text-sky-300'
                  }`}
                  title={`Filtrar por tag ${tag}`}
                >
                  #{tag}
                </button>
              ))}
              {compact && entry.tags.length > 4 ? (
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  +{entry.tags.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 self-start">
          {onTogglePin ? (
            <button
              type="button"
              onClick={() => onTogglePin(entry.id)}
              aria-label={
                entry.isPinned
                  ? `Desanclar ficha ${entry.titulo}`
                  : `Anclar ficha ${entry.titulo}`
              }
              title={
                entry.isPinned
                  ? `Desanclar ficha ${entry.titulo}`
                  : `Anclar ficha ${entry.titulo}`
              }
              className={`${actionButtonBaseClass} ${
                entry.isPinned
                  ? 'text-amber-400 hover:border-amber-300 hover:text-amber-500 dark:text-amber-400 dark:hover:border-amber-400/50 dark:hover:text-amber-300'
                  : 'text-slate-400 hover:border-amber-300 hover:text-amber-500 dark:text-slate-400 dark:hover:border-amber-400/50 dark:hover:text-amber-300'
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill={entry.isPinned ? 'currentColor' : 'none'}
                className={actionIconClass}
              >
                <path
                  d="m10 2.7 2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.4-4.4 2.4.8-5L2.8 7.9l5-.7L10 2.7Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.4"
                />
              </svg>
            </button>
          ) : null}

          {onExportPdf ? (
            <button
              type="button"
              onClick={() => onExportPdf(entry)}
              aria-label={`Exportar PDF de ${entry.titulo}`}
              title={`Exportar PDF de ${entry.titulo}`}
              className={`${actionButtonBaseClass} text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className={`${actionIconClass} ${pdfIsGenerating ? 'animate-pulse' : ''}`}
              >
                <path
                  d="M6 2.5h5.5L16 7v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.5 2.5V7H16"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.1 12.1h5.8M7.1 14.6h4.6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}

          {onDeleteEntry ? (
            <button
              type="button"
              onClick={() => onDeleteEntry(entry.id)}
              aria-label={`Mover a papelera ${entry.titulo}`}
              title={`Mover a papelera ${entry.titulo}`}
              className={`${actionButtonBaseClass} text-red-500 hover:border-red-300 hover:text-red-600 dark:text-red-400 dark:hover:border-red-500/50 dark:hover:text-red-300`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M4.5 6h11M8 3.5h4m-6 2.5.6 9a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={
              isCollapsed
                ? `Expandir ficha ${entry.titulo}`
                : `Colapsar ficha ${entry.titulo}`
            }
            title={
              isCollapsed
                ? `Expandir ficha ${entry.titulo}`
                : `Colapsar ficha ${entry.titulo}`
            }
            className={`${actionButtonBaseClass} text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className={actionIconClass}
            >
              {isCollapsed ? (
                <path
                  d="M5 10h10M10 5v10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M5 10h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>

          <span className={`soft-subpanel w-fit rounded-lg border border-slate-200 font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400 ${
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}>
            {entry.id}
          </span>
        </div>
      </div>

      {isCollapsed ? (
        <div className={`soft-subpanel rounded-xl border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300 ${
          compact ? 'mt-3 px-3 py-2.5 text-[13px]' : 'mt-4 px-4 py-3 text-sm'
        }`}>
          <div className={`overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/30 ${
            compact ? 'max-h-24 p-2' : 'max-h-28 p-2.5'
          }`}>
            <div className="pointer-events-none text-sm leading-6 text-slate-600 dark:text-slate-300">
              <MarkdownRenderer content={entry.contenido} />
            </div>
          </div>
          <div className={`flex flex-wrap gap-2 font-medium text-slate-500 dark:text-slate-400 ${
            compact ? 'mt-2 text-[11px]' : 'mt-3 text-xs'
          }`}>
            {entry.pasos?.length ? <span>{entry.pasos.length} paso{entry.pasos.length === 1 ? '' : 's'}</span> : null}
            {entry.comandos?.length ? (
              <span>{entry.comandos.length} comando{entry.comandos.length === 1 ? '' : 's'}</span>
            ) : null}
          </div>
        </div>
      ) : null}
      {!isCollapsed ? (
        <>
          <div className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-200">
            <MarkdownRenderer content={entry.contenido} />
          </div>

          {entry.pasos?.length ? (
            <div className="mt-5">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Pasos
              </h4>
              <ol className="mt-2 space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-200">
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
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Comandos utiles
              </h4>
              <div className="mt-3 space-y-2">
                {entry.comandos.map((command, index) => {
                  const fieldKey = `${entry.id}-${command.label}-${index}`;
                  const sensitive = isSensitiveLabel(command.label);
                  const visible = isFieldVisible(fieldKey, sensitive, hiddenFields);
                  const isHidden = sensitive && !visible;
                  const isEditing = Boolean(editingFields[fieldKey]);
                  const draftValue = draftValues[fieldKey] ?? command.value;
                  const displayedValue = isHidden
                    ? maskValue(command.value)
                    : command.value;

                  return (
                    <div
                      key={fieldKey}
                      className="soft-subpanel grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700 sm:grid-cols-[minmax(96px,120px)_minmax(0,1fr)_auto] sm:items-center"
                    >
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">
                        {command.label}
                      </span>

                      <div
                        className={`min-w-0 rounded-lg border bg-white/75 px-2.5 py-2 font-mono text-xs text-slate-800 transition-all duration-200 dark:bg-slate-950/75 dark:text-slate-100 ${
                          isEditing ? 'shadow-sm' : 'border-slate-200 dark:border-slate-700'
                        }`}
                        style={
                          isEditing
                            ? {
                                borderColor: categoryColor,
                                boxShadow: `0 0 0 1px ${categoryColor}33, 0 0 0 4px ${hexToRgba(categoryColor, 0.14)}`,
                              }
                            : undefined
                        }
                      >
                        {isEditing ? (
                          <input
                            type={sensitive && !visible ? 'password' : 'text'}
                            value={draftValue}
                            onChange={(event) =>
                              setDraftValues((current) => ({
                                ...current,
                                [fieldKey]: event.target.value,
                              }))
                            }
                            className={`w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 ${getCommandValueTone(draftValue)}`}
                            aria-label={`Editar ${command.label}`}
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`block overflow-x-auto whitespace-nowrap text-slate-800 transition-all duration-200 ${getCommandValueTone(displayedValue)}`}
                            >
                              {displayedValue}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        {entry.categoria === 'Entorno' &&
                        isHealthCheckLabel(command.label) ? (
                          <button
                            type="button"
                            onClick={() => runHealthCheck(command.label, command.value)}
                            aria-label={`Comprobar ${command.label}`}
                            title={
                              healthStatuses[command.label]?.detail ??
                              (healthStatuses[command.label]?.state === 'healthy'
                                ? 'Activo'
                                : healthStatuses[command.label]?.state === 'error'
                                  ? 'Inaccesible'
                                  : healthStatuses[command.label]?.state === 'checking'
                                    ? 'Comprobando'
                                    : 'Lanzar health check')
                            }
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white transition-colors dark:bg-slate-950 ${
                              healthStatuses[command.label]?.state === 'healthy'
                                ? 'border-emerald-200 text-emerald-600 dark:border-emerald-900/40 dark:text-emerald-400'
                                : healthStatuses[command.label]?.state === 'error'
                                  ? 'border-red-200 text-red-600 dark:border-red-900/40 dark:text-red-400'
                                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 20 20"
                              fill="none"
                              className={`${actionIconClass} ${
                                healthStatuses[command.label]?.state === 'checking'
                                  ? 'animate-spin'
                                  : ''
                              }`}
                            >
                              <path
                                d="M16 10a6 6 0 1 1-1.3-3.8M16 4v4h-4"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        ) : null}

                        {sensitive ? (
                          <button
                            type="button"
                            onClick={() => toggleFieldVisibility(fieldKey)}
                            aria-label={isHidden ? 'Mostrar valor' : 'Ocultar valor'}
                            title={isHidden ? 'Mostrar valor' : 'Ocultar valor'}
                            className={`${actionButtonBaseClass} text-sky-500 hover:border-sky-300 hover:text-sky-600 dark:text-slate-200 dark:hover:border-sky-500/50 dark:hover:text-white`}
                          >
                            {isHidden ? (
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 20 20"
                                fill="none"
                                className={actionIconClass}
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
                                className={actionIconClass}
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
                              className={`${actionButtonBaseClass} text-emerald-500 hover:border-emerald-300 hover:text-emerald-600 dark:text-emerald-400 dark:hover:border-emerald-500/50 dark:hover:text-emerald-300`}
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 20 20"
                                fill="none"
                                className={actionIconClass}
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
                              className={`${actionButtonBaseClass} text-red-500 hover:border-red-300 hover:text-red-600 dark:text-red-400 dark:hover:border-red-500/50 dark:hover:text-red-300`}
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 20 20"
                                fill="none"
                                className={actionIconClass}
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
                              className={`${actionButtonBaseClass} text-blue-500 hover:border-blue-300 hover:text-blue-600 dark:text-blue-400 dark:hover:border-blue-500/50 dark:hover:text-blue-300`}
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 20 20"
                                fill="none"
                                className={actionIconClass}
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
                              onClick={() => copyTextToClipboard(command.value)}
                              aria-label={`Copiar ${command.label}`}
                              title={`Copiar ${command.label}`}
                              className={`${actionButtonBaseClass} text-blue-500 hover:border-blue-300 hover:text-blue-600 dark:text-blue-400 dark:hover:border-blue-500/50 dark:hover:text-blue-300`}
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 20 20"
                                fill="none"
                                className={actionIconClass}
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

          {formattedUpdatedAt ? (
            <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
              Actualizado el: {formattedUpdatedAt}
            </p>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
