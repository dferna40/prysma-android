import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent, CSSProperties } from 'react';
import { AppCustomizationPanel } from './components/settings/AppCustomizationPanel';
import { MainLayout } from './components/layout/MainLayout';
import { AppLogo } from './components/ui/AppLogo';
import { MarkdownRenderer } from './components/ui/MarkdownRenderer';
import { ResultCard } from './components/ui/ResultCard';
import { SidebarUtilities } from './components/ui/SidebarUtilities';
import { defaultAppCustomization, normalizeCustomization } from './constants/appCustomization';
import {
  categoryColorOptions,
  getCategoryColorHex,
  getCategoryTheme,
} from './constants/categoryColors';
import manualEntries from './data/manual.json';
import { useSearch } from './hooks/useSearch';
import type {
  AppSettings,
  AppCustomizationSettings,
  CategoryColorKey,
  CategoryDefinition,
  CommandOption,
  CommandOverridesByEntry,
  EntryTemplate,
  KnowledgeEntry,
  ManualBackupPayload,
  ManualData,
} from './types';

const STORAGE_KEY = 'knowledge-manual-state-v2';
const LEGACY_COMMAND_STORAGE_KEY = 'result-card-command-overrides';
const ASSISTANT_VERSION = '1.0.0';
const defaultSettings: AppSettings = {
  customization: defaultAppCustomization,
  darkMode: false,
};

const defaultCategoryMetadata: Record<
  string,
  { color: CategoryColorKey; description: string }
> = {
  Entorno: {
    color: 'blue',
    description: 'Accesos remotos, puertos y rutas de configuracion local.',
  },
  Accesos: {
    color: 'violet',
    description: 'Credenciales de correo, SSH, Oracle y portales corporativos.',
  },
  Batch: {
    color: 'emerald',
    description: 'Procesos, tablas de configuracion y comandos SQL.',
  },
  UML: {
    color: 'amber',
    description: 'Protocolos de diseno, MagicDraw y bloqueos en SVN.',
  },
  UI: {
    color: 'indigo',
    description: 'Arquitectura de capas NPA, literales y componentes.',
  },
  General: {
    color: 'teal',
    description: 'Guias de iTeams, gestion de tags y despliegues.',
  },
  Seguros: {
    color: 'rose',
    description: 'Glosario de negocio y conceptos especificos de RGA.',
  },
};

const getCurrentIsoDate = () => new Date().toISOString();

interface EntryFormState {
  categoryColor: CategoryColorKey;
  categoryDescription: string;
  categoryLocked: boolean;
  categoria: string;
  comandos: CommandOption[];
  contenido: string;
  id: string;
  pasos: string;
  tags: string;
  titulo: string;
}

interface CategoryFormState {
  color: CategoryColorKey;
  description: string;
  name: string;
}

interface TemplateFormState {
  categoria: string;
  comandos: CommandOption[];
  contenido: string;
  id: string;
  name: string;
  pasos: string;
  tags: string;
  titulo: string;
}

interface ToolbarAction {
  buttonLabel: string;
  icon: string;
  label: string;
  onClick: () => void;
}

interface SaveToastState {
  message: string;
  tone: 'error' | 'success';
}

type SaveSyncState = 'error' | 'idle' | 'pending' | 'saved' | 'saving';

type ServerHealthState = 'checking' | 'offline' | 'online';

interface CategoryDeleteConfirmationState {
  categoryName: string;
  entryCount: number;
}

interface PdfCodeSegment {
  color: [number, number, number];
  fontStyle: 'bold' | 'normal';
  text: string;
}

interface PdfInlineSegment {
  href?: string;
  text: string;
  type: 'link' | 'text';
}

interface PdfListItem {
  indentLevel: number;
  marker: string;
  text: string;
}

interface PdfTableRow {
  cells: string[];
}

type PdfContentBlock =
  | { content: string; type: 'text' }
  | { content: string; language?: string; type: 'code' }
  | { content: string; depth: number; type: 'heading' }
  | { items: PdfListItem[]; type: 'list' }
  | { size: 'paragraph'; type: 'spacer' }
  | { rows: PdfTableRow[]; type: 'table' };

type ModalState =
  | {
      entryId?: string;
      lockedCategory?: string;
      mode: 'create' | 'edit';
      type: 'entry';
    }
  | { categoryName?: string; mode: 'create' | 'edit'; type: 'category' }
  | { mode: 'create' | 'edit'; templateId?: string; type: 'template' }
  | null;

const getDefaultCategoryDefinition = (name: string): CategoryDefinition => {
  const trimmedName = name.trim();
  const fallbackMetadata = defaultCategoryMetadata[trimmedName];

  return {
    name: trimmedName,
    description:
      fallbackMetadata?.description ||
      `Documentacion y procedimientos relacionados con ${trimmedName}.`,
    color: fallbackMetadata?.color ?? 'slate',
  };
};

const normalizeEntry = (entry: KnowledgeEntry): KnowledgeEntry => ({
  ...entry,
  categoria: entry.categoria.trim(),
  comandos:
    entry.comandos
      ?.map((command) => ({
        label: command.label.trim(),
        value: command.value,
      }))
      .filter((command) => command.label.length > 0) ?? [],
  isPinned: Boolean(entry.isPinned),
  pasos: entry.pasos?.map((step) => step.trim()).filter(Boolean) ?? [],
  tags: entry.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
  updatedAt: entry.updatedAt || getCurrentIsoDate(),
});

const normalizeTemplate = (template: EntryTemplate): EntryTemplate => ({
  ...template,
  categoria: template.categoria?.trim() || undefined,
  comandos:
    template.comandos
      ?.map((command) => ({
        label: command.label.trim(),
        value: command.value,
      }))
      .filter((command) => command.label.length > 0) ?? [],
  name: template.name.trim(),
  pasos: template.pasos?.map((step) => step.trim()).filter(Boolean) ?? [],
  tags: template.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean) ?? [],
  titulo: template.titulo.trim(),
  updatedAt: template.updatedAt || getCurrentIsoDate(),
});

const deriveCategories = (
  entries: KnowledgeEntry[],
  categorySeed: CategoryDefinition[] = [],
) => {
  const categoryMap = new Map<string, CategoryDefinition>();

  categorySeed.forEach((category) => {
    const trimmedName = category.name.trim();
    if (!trimmedName) {
      return;
    }

    categoryMap.set(trimmedName.toLowerCase(), {
      ...getDefaultCategoryDefinition(trimmedName),
      ...category,
      name: trimmedName,
      description:
        category.description?.trim() ||
        getDefaultCategoryDefinition(trimmedName).description,
    });
  });

  entries.forEach((entry) => {
    const trimmedName = entry.categoria.trim();
    const key = trimmedName.toLowerCase();

    if (!categoryMap.has(key)) {
      categoryMap.set(key, getDefaultCategoryDefinition(trimmedName));
    }
  });

  return Array.from(categoryMap.values());
};

const applyLegacyCommandOverrides = (
  entries: KnowledgeEntry[],
  overrides: CommandOverridesByEntry,
) =>
  entries.map((entry) => {
    const entryOverrides = overrides[entry.id];

    if (!entryOverrides?.length || !entry.comandos?.length) {
      return entry;
    }

    const overrideMap = new Map(
      entryOverrides.map((commandOverride) => [
        commandOverride.label,
        commandOverride.value,
      ]),
    );

    return {
      ...entry,
      comandos: entry.comandos.map((command) => ({
        ...command,
        value: overrideMap.get(command.label) ?? command.value,
      })),
    };
  });

const normalizeManualData = (source: unknown): ManualData => {
  if (Array.isArray(source)) {
    const entries = source.map((entry) => normalizeEntry(entry as KnowledgeEntry));

    return {
      categories: deriveCategories(entries),
      entries,
      settings: defaultSettings,
      templates: [],
      trash: [],
    };
  }

  if (source && typeof source === 'object') {
    const candidate = source as Partial<ManualData>;
    const entries = Array.isArray(candidate.entries)
      ? candidate.entries.map((entry) => normalizeEntry(entry))
      : [];
    const categories = Array.isArray(candidate.categories)
      ? deriveCategories(entries, candidate.categories)
      : deriveCategories(entries);
    const templates = Array.isArray(candidate.templates)
      ? candidate.templates.map((template) => normalizeTemplate(template))
      : [];

    return {
      categories,
      entries,
      settings: {
        ...defaultSettings,
        ...(candidate.settings ?? {}),
        customization: normalizeCustomization(candidate.settings?.customization),
      },
      templates,
      trash: Array.isArray(candidate.trash)
        ? candidate.trash.map((entry) => normalizeEntry(entry))
        : [],
    };
  }

  return {
    categories: [],
    entries: [],
    settings: defaultSettings,
    templates: [],
    trash: [],
  };
};

const extractManualImportSource = (source: unknown) => {
  if (source && typeof source === 'object' && 'data' in source) {
    const backupCandidate = source as Partial<ManualBackupPayload>;

    if (backupCandidate.data) {
      return backupCandidate.data;
    }
  }

  return source;
};

const readStoredManualData = (): ManualData => {
  const baseManual = normalizeManualData(manualEntries);

  if (typeof window === 'undefined') {
    return baseManual;
  }

  try {
    const rawManual = window.localStorage.getItem(STORAGE_KEY);
    if (rawManual) {
      return normalizeManualData(JSON.parse(rawManual));
    }

    const rawLegacyOverrides = window.localStorage.getItem(
      LEGACY_COMMAND_STORAGE_KEY,
    );
    if (!rawLegacyOverrides) {
      return baseManual;
    }

    const legacyOverrides = JSON.parse(rawLegacyOverrides) as CommandOverridesByEntry;

    return {
      ...baseManual,
      entries: applyLegacyCommandOverrides(baseManual.entries, legacyOverrides),
      settings: baseManual.settings,
      trash: baseManual.trash,
    };
  } catch {
    return baseManual;
  }
};

const areEntriesEqual = (
  firstEntries: KnowledgeEntry[],
  secondEntries: KnowledgeEntry[],
) => JSON.stringify(firstEntries) === JSON.stringify(secondEntries);

const persistManualData = (manualData: ManualData) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Recordatorio: Si se desarrolla un microservicio Java para centralizar estos Health Checks o gestionar la persistencia de la papelera, utilizar estrictamente try-catch-resources para el cierre seguro de flujos y sockets.
  // Recordatorio: Para cualquier proceso en Java que gestione la lectura o escritura de estos archivos de backup o metadatos de fichas, es obligatorio utilizar try-catch-resources para el cierre seguro de flujos de datos.
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(manualData));
};

const splitLines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeTags = (value: string) =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

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

const buildThemeVars = (colorKey: CategoryColorKey): CSSProperties => {
  const hex = getCategoryColorHex(colorKey);

  return {
    '--card-glow': hexToRgba(hex, 0.14),
    '--card-ring': hexToRgba(hex, 0.22),
    '--field-focus': hex,
    '--field-focus-glow': hexToRgba(hex, 0.16),
  } as CSSProperties;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const ensureUniqueEntryId = (
  candidateId: string,
  entries: KnowledgeEntry[],
  originalId?: string,
) => {
  const normalizedBase = slugify(candidateId) || 'nueva-entrada';
  let nextId = normalizedBase;
  let suffix = 2;

  while (
    entries.some((entry) => entry.id === nextId && entry.id !== originalId)
  ) {
    nextId = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  return nextId;
};

const buildEntryFormState = (
  entry?: KnowledgeEntry,
  category?: CategoryDefinition,
  categoryLocked = false,
): EntryFormState => ({
  categoryColor: category?.color ?? 'blue',
  categoryDescription: category?.description ?? '',
  categoryLocked,
  categoria: entry?.categoria ?? category?.name ?? '',
  comandos:
    entry?.comandos?.length
      ? entry.comandos.map((command) => ({ ...command }))
      : [{ label: '', value: '' }],
  contenido: entry?.contenido ?? '',
  id: entry?.id ?? '',
  pasos: entry?.pasos?.join('\n') ?? '',
  tags: entry?.tags?.join(', ') ?? '',
  titulo: entry?.titulo ?? '',
});

const buildCategoryFormState = (
  category?: CategoryDefinition,
): CategoryFormState => ({
  color: category?.color ?? 'blue',
  description: category?.description ?? '',
  name: category?.name ?? '',
});

const buildTemplateFormState = (
  template?: EntryTemplate,
  fallbackCategory = '',
): TemplateFormState => ({
  categoria: template?.categoria ?? fallbackCategory,
  comandos:
    template?.comandos?.length
      ? template.comandos.map((command) => ({ ...command }))
      : [{ label: '', value: '' }],
  contenido: template?.contenido ?? '',
  id: template?.id ?? '',
  name: template?.name ?? '',
  pasos: template?.pasos?.join('\n') ?? '',
  tags: template?.tags?.join(', ') ?? '',
  titulo: template?.titulo ?? '',
});

const applyTemplateToEntryForm = (
  currentForm: EntryFormState,
  template: EntryTemplate,
): EntryFormState => ({
  ...currentForm,
  categoria:
    currentForm.categoryLocked || currentForm.categoria.trim().length > 0
      ? currentForm.categoria
      : (template.categoria ?? currentForm.categoria),
  comandos:
    template.comandos?.length
      ? template.comandos.map((command) => ({ ...command }))
      : [{ label: '', value: '' }],
  contenido: template.contenido,
  pasos: template.pasos?.join('\n') ?? '',
  tags: template.tags.join(', '),
  titulo: template.titulo,
});

const updateContentSelection = (
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  setValue: (nextValue: string) => void,
  before: string,
  after = '',
  placeholder = '',
) => {
  if (!textarea) {
    setValue(`${currentValue}${before}${placeholder}${after}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = currentValue.slice(start, end);
  const nextText = selectedText || placeholder;
  const nextValue = `${currentValue.slice(0, start)}${before}${nextText}${after}${currentValue.slice(end)}`;
  setValue(nextValue);

  requestAnimationFrame(() => {
    textarea.focus();
    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + nextText.length;
    textarea.setSelectionRange(selectionStart, selectionEnd);
  });
};

const insertTextAtCursor = (
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  setValue: (nextValue: string) => void,
  textToInsert: string,
) => {
  if (!textarea) {
    setValue(`${currentValue}${textToInsert}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const nextValue = `${currentValue.slice(0, start)}${textToInsert}${currentValue.slice(end)}`;
  setValue(nextValue);

  requestAnimationFrame(() => {
    const nextCursorPosition = start + textToInsert.length;
    textarea.focus();
    textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
  });
};

const prefixSelectedLines = (
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  setValue: (nextValue: string) => void,
  prefixBuilder: (lineIndex: number) => string,
  placeholder: string,
) => {
  if (!textarea) {
    setValue(`${currentValue}${prefixBuilder(0)}${placeholder}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = currentValue.slice(start, end);

  if (!selectedText) {
    const insertedText = `${prefixBuilder(0)}${placeholder}`;
    const nextValue = `${currentValue.slice(0, start)}${insertedText}${currentValue.slice(end)}`;
    setValue(nextValue);

    requestAnimationFrame(() => {
      const nextCursorPosition = start + insertedText.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
    return;
  }

  const lines = selectedText.split('\n');
  const prefixedText = lines
    .map((line, lineIndex) => `${prefixBuilder(lineIndex)}${line}`)
    .join('\n');
  const nextValue = `${currentValue.slice(0, start)}${prefixedText}${currentValue.slice(end)}`;
  setValue(nextValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start, start + prefixedText.length);
  });
};

const indentSelectedLines = (
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  setValue: (nextValue: string) => void,
  indent = '\t',
) => {
  if (!textarea) {
    setValue(`${currentValue}${indent}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = currentValue.slice(start, end);

  if (!selectedText) {
    insertTextAtCursor(textarea, currentValue, setValue, indent);
    return;
  }

  const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = currentValue.indexOf('\n', end);
  const safeLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;
  const selectedBlock = currentValue.slice(lineStart, safeLineEnd);
  const indentedBlock = selectedBlock
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
  const nextValue = `${currentValue.slice(0, lineStart)}${indentedBlock}${currentValue.slice(safeLineEnd)}`;

  setValue(nextValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + indent.length, end + indent.length * selectedBlock.split('\n').length);
  });
};

const normalizeIndentation = (value: string) => value.replace(/\t/g, '    ');

const getIndentLevel = (value: string) => {
  const leadingWhitespace = value.match(/^\s*/)?.[0] ?? '';
  const normalizedLength = normalizeIndentation(leadingWhitespace).length;

  return Math.floor(normalizedLength / 4);
};

const stripLeadingWhitespace = (value: string) => value.replace(/^\s+/, '');

const normalizePdfText = (value: string) =>
  value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '- ')
    .trim();

const parsePdfInlineSegments = (value: string): PdfInlineSegment[] => {
  const segments: PdfInlineSegment[] = [];
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({
        text: value.slice(lastIndex, matchIndex),
        type: 'text',
      });
    }

    if (match[1] && match[2]) {
      segments.push({
        href: match[2],
        text: match[1],
        type: 'link',
      });
    } else if (match[3]) {
      segments.push({
        href: match[3],
        text: match[3],
        type: 'link',
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < value.length) {
    segments.push({
      text: value.slice(lastIndex),
      type: 'text',
    });
  }

  return segments.length
    ? segments
    : [
        {
          text: value,
          type: 'text',
        },
      ];
};

const parsePdfContentBlocks = (value: string): PdfContentBlock[] => {
  const blocks: PdfContentBlock[] = [];
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  let textBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let listBuffer: PdfListItem[] = [];
  let tableBuffer: string[] = [];
  let codeLanguage = '';
  let isInsideCodeBlock = false;
  const isMarkdownTableLine = (line: string) => {
    const trimmedLine = line.trim();
    return trimmedLine.includes('|') && trimmedLine.split('|').length >= 3;
  };
  const isMarkdownTableSeparator = (line: string) =>
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
  const parseTableRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => normalizePdfText(cell.trim()));
  const parseListLine = (line: string) => {
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
    if (bulletMatch) {
      return {
        indentLevel: getIndentLevel(bulletMatch[1]),
        marker: bulletMatch[2],
        text: normalizePdfText(bulletMatch[3]),
      };
    }

    const orderedMatch = line.match(/^(\s*)(\d+\.)\s+(.+)$/);
    if (orderedMatch) {
      return {
        indentLevel: getIndentLevel(orderedMatch[1]),
        marker: orderedMatch[2],
        text: normalizePdfText(orderedMatch[3]),
      };
    }

    return null;
  };
  const parseHeadingLine = (line: string) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (!headingMatch) {
      return null;
    }

    return {
      content: normalizePdfText(headingMatch[2]),
      depth: headingMatch[1].length,
      type: 'heading' as const,
    };
  };
  const pushParagraphSpacer = () => {
    const lastBlock = blocks[blocks.length - 1];

    if (!lastBlock || lastBlock.type === 'spacer') {
      return;
    }

    blocks.push({ size: 'paragraph', type: 'spacer' });
  };

  const flushTextBuffer = () => {
    if (!textBuffer.length) {
      return;
    }

    const normalizedText = normalizePdfText(textBuffer.join('\n'));
    if (normalizedText.trim()) {
      blocks.push({ content: normalizedText, type: 'text' });
    }

    textBuffer = [];
  };

  const flushListBuffer = () => {
    if (!listBuffer.length) {
      return;
    }

    blocks.push({
      items: listBuffer.filter((item) => item.text.trim().length > 0),
      type: 'list',
    });
    listBuffer = [];
  };

  const flushTableBuffer = () => {
    if (!tableBuffer.length) {
      return;
    }

    const rows = tableBuffer
      .filter((line) => !isMarkdownTableSeparator(line))
      .map((line) => ({ cells: parseTableRow(line) }))
      .filter((row) => row.cells.some((cell) => cell.length > 0));

    if (rows.length) {
      blocks.push({
        rows,
        type: 'table',
      });
    }

    tableBuffer = [];
  };

  const flushCodeBuffer = () => {
    const codeContent = codeBuffer.join('\n').replace(/\s+$/, '');
    if (codeContent.trim()) {
      blocks.push({
        content: codeContent,
        language: codeLanguage || undefined,
        type: 'code',
      });
    }

    codeBuffer = [];
    codeLanguage = '';
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('```')) {
      flushTextBuffer();
      flushListBuffer();
      flushTableBuffer();

      if (isInsideCodeBlock) {
        flushCodeBuffer();
        isInsideCodeBlock = false;
      } else {
        flushTextBuffer();
        isInsideCodeBlock = true;
        codeLanguage = trimmedLine.slice(3).trim();
      }

      return;
    }

    if (isInsideCodeBlock) {
      codeBuffer.push(line.replace(/\t/g, '  '));
      return;
    }

    if (!trimmedLine) {
      flushTextBuffer();
      flushListBuffer();
      flushTableBuffer();
      pushParagraphSpacer();
      return;
    }

    const parsedHeading = parseHeadingLine(line);
    if (parsedHeading) {
      flushTextBuffer();
      flushListBuffer();
      flushTableBuffer();
      blocks.push(parsedHeading);
      return;
    }

    const parsedListItem = parseListLine(line);
    if (parsedListItem) {
      flushTextBuffer();
      flushTableBuffer();
      listBuffer.push(parsedListItem);
      return;
    }

    if (listBuffer.length) {
      flushListBuffer();
    }

    if (isMarkdownTableLine(line)) {
      flushTextBuffer();
      tableBuffer.push(line);
      return;
    }

    if (tableBuffer.length) {
      flushTableBuffer();
    }

    textBuffer.push(line);
  });

  if (isInsideCodeBlock) {
    flushCodeBuffer();
  }

  flushTextBuffer();
  flushListBuffer();
  flushTableBuffer();

  return blocks;
};

const pdfCodeKeywords = new Set([
  'abstract',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extends',
  'false',
  'final',
  'finally',
  'float',
  'for',
  'if',
  'implements',
  'import',
  'instanceof',
  'int',
  'interface',
  'long',
  'native',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'record',
  'return',
  'short',
  'static',
  'strictfp',
  'super',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'true',
  'try',
  'var',
  'void',
  'volatile',
  'while',
]);

const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;

const resolvePdfImageUrl = (source: string) => {
  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  if (source.startsWith('/images/')) {
    return `http://localhost:3001${source}`;
  }

  if (source.startsWith('/')) {
    return `${window.location.origin}${source}`;
  }

  return source;
};

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No se pudo convertir la imagen a data URL.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Error leyendo la imagen.'));
    reader.readAsDataURL(blob);
  });

const loadImageDimensions = (dataUrl: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };
    image.onerror = () => reject(new Error('No se pudo cargar la imagen para el PDF.'));
    image.src = dataUrl;
  });

const resolvePdfImageAsset = async (source: string) => {
  const response = await fetch(resolvePdfImageUrl(source));

  if (!response.ok) {
    throw new Error(`No se pudo cargar la imagen ${source}.`);
  }

  // Si este flujo de lectura de imagenes se migra a Java, es obligatorio usar
  // try-catch-resources con FileInputStream u otros Streams para liberar los
  // recursos correctamente tras generar el PDF [cite: 2026-02-12].
  const blob = await response.blob();
  const dataUrl = await readBlobAsDataUrl(blob);
  const dimensions = await loadImageDimensions(dataUrl);

  return {
    dataUrl,
    ...dimensions,
  };
};

export const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState('');
  const [activeView, setActiveView] = useState<'home' | 'settings'>('home');
  const [manualData, setManualData] = useState<ManualData>(() =>
    readStoredManualData(),
  );
  const [modalState, setModalState] = useState<ModalState>(null);
  const [entryForm, setEntryForm] = useState<EntryFormState>(() =>
    buildEntryFormState(),
  );
  const [categoryForm, setCategoryForm] = useState<CategoryFormState | null>(
    null,
  );
  const [templateForm, setTemplateForm] = useState<TemplateFormState | null>(
    null,
  );
  const [formError, setFormError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [activeToolbarActionId, setActiveToolbarActionId] = useState('');
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const contentEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const [deleteConfirmationEntryId, setDeleteConfirmationEntryId] = useState('');
  const [deleteConfirmationCategory, setDeleteConfirmationCategory] =
    useState<CategoryDeleteConfirmationState | null>(null);
  const [exportEntryId, setExportEntryId] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [saveToast, setSaveToast] = useState<SaveToastState | null>(null);
  const [saveSyncState, setSaveSyncState] = useState<SaveSyncState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [serverHealthState, setServerHealthState] =
    useState<ServerHealthState>('checking');
  const shouldPersistToServerRef = useRef(false);
  const customization = manualData.settings.customization;

  const categoryMap = useMemo(
    () =>
      new Map(
        manualData.categories.map((category) => [
          category.name.toLowerCase(),
          category,
        ]),
      ),
    [manualData.categories],
  );
  const results = useSearch(
    manualData.entries,
    debouncedSearchTerm,
    activeCategoryFilter,
    activeTagFilter,
  );
  const sortPinnedEntries = (entries: KnowledgeEntry[]) =>
    [...entries].sort((firstEntry, secondEntry) => {
      if (firstEntry.isPinned !== secondEntry.isPinned) {
        return firstEntry.isPinned ? -1 : 1;
      }

      return (
        new Date(secondEntry.updatedAt ?? 0).getTime() -
        new Date(firstEntry.updatedAt ?? 0).getTime()
      );
    });
  const sortedResults = useMemo(() => sortPinnedEntries(results), [results]);
  const quickAccessEntries = useMemo(
    () => sortPinnedEntries(manualData.entries.filter((entry) => entry.isPinned)),
    [manualData.entries],
  );
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    activeCategoryFilter.trim().length > 0 ||
    activeTagFilter.trim().length > 0;
  const activeResultCategory = activeCategoryFilter
    ? categoryMap.get(activeCategoryFilter.toLowerCase())
    : undefined;
  const deleteConfirmationEntry = deleteConfirmationEntryId
    ? manualData.entries.find((entry) => entry.id === deleteConfirmationEntryId)
    : undefined;

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      manualData.settings.darkMode,
    );
  }, [manualData.settings.darkMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (!saveToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveToast(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveToast]);

  useEffect(() => {
    let isCancelled = false;

    const checkServerHealth = async () => {
      try {
        const response = await fetch('http://localhost:3001/health');

        if (!response.ok) {
          throw new Error('Servidor no disponible');
        }

        if (!isCancelled) {
          setServerHealthState('online');
        }
      } catch {
        if (!isCancelled) {
          setServerHealthState('offline');
        }
      }
    };

    void checkServerHealth();

    const intervalId = window.setInterval(() => {
      void checkServerHealth();
    }, 20000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!shouldPersistToServerRef.current) {
      return;
    }

    shouldPersistToServerRef.current = false;

    let isCancelled = false;
    const timeoutId = window.setTimeout(() => {

    const persistManualOnServer = async () => {
      setSaveSyncState('saving');
      try {
        const response = await fetch('http://localhost:3001/save-manual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(manualData.entries),
        });

        if (!response.ok) {
          throw new Error('La respuesta del servidor no fue valida.');
        }

        if (!isCancelled) {
          setServerHealthState('online');
          setSaveSyncState('saved');
          setLastSavedAt(
            new Intl.DateTimeFormat('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date()),
          );
          setSaveToast({
            message: 'Cambios guardados permanentemente en el archivo.',
            tone: 'success',
          });
        }
      } catch {
        if (!isCancelled) {
          setServerHealthState('offline');
          setSaveSyncState('error');
          setSaveToast({
            message:
              'Error de conexión con el servidor. Por favor, descarga el JSON manualmente para no perder los cambios.',
            tone: 'error',
          });
        }
      }
    };

    void persistManualOnServer();
    }, 800);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [manualData.entries]);

  const openCreateEntryModal = (
    prefilledCategory?: string,
    categoryLocked = false,
  ) => {
    const fallbackCategory = manualData.categories[0]?.name ?? '';
    const nextCategory = prefilledCategory ?? fallbackCategory;
    const categoryDefinition = nextCategory
      ? categoryMap.get(nextCategory.toLowerCase())
      : undefined;

    setEntryForm(
      buildEntryFormState(undefined, categoryDefinition, categoryLocked),
    );
    setEntryForm((current) => ({
      ...current,
      categoryLocked,
      categoria: nextCategory || current.categoria,
    }));
    setSelectedTemplateId('');
    setFormError('');
    setModalState({
      lockedCategory: categoryLocked ? prefilledCategory : undefined,
      mode: 'create',
      type: 'entry',
    });
  };

  const openEditEntryModal = (entry: KnowledgeEntry) => {
    const categoryDefinition = categoryMap.get(entry.categoria.toLowerCase());
    setEntryForm(buildEntryFormState(entry, categoryDefinition, false));
    setSelectedTemplateId('');
    setFormError('');
    setModalState({ entryId: entry.id, mode: 'edit', type: 'entry' });
  };

  const openCreateCategoryModal = () => {
    setCategoryForm(buildCategoryFormState());
    setFormError('');
    setModalState({ mode: 'create', type: 'category' });
  };

  const openCreateTemplateModal = () => {
    setTemplateForm(buildTemplateFormState(undefined, manualData.categories[0]?.name ?? ''));
    setFormError('');
    setModalState({ mode: 'create', type: 'template' });
  };

  const openEditTemplateModal = (template: EntryTemplate) => {
    setTemplateForm(buildTemplateFormState(template));
    setFormError('');
    setModalState({ mode: 'edit', templateId: template.id, type: 'template' });
  };

  const openCategoryModal = (categoryName: string) => {
    const category = categoryMap.get(categoryName.toLowerCase());
    if (!category) {
      return;
    }

    setCategoryForm(buildCategoryFormState(category));
    setFormError('');
    setModalState({ categoryName, mode: 'edit', type: 'category' });
  };

  const closeModal = () => {
    setModalState(null);
    setCategoryForm(null);
    setTemplateForm(null);
    setSelectedTemplateId('');
    setFormError('');
  };

  const updateManualData = (
    updater: (currentManualData: ManualData) => ManualData,
  ) => {
    setManualData((currentManualData) => {
      const nextManualData = normalizeManualData(updater(currentManualData));
      const entriesChanged = !areEntriesEqual(
        currentManualData.entries,
        nextManualData.entries,
      );
      shouldPersistToServerRef.current = entriesChanged;
      if (entriesChanged) {
        setSaveSyncState('pending');
      }
      persistManualData(nextManualData);
      return nextManualData;
    });
  };

  const toggleDarkMode = () => {
    updateManualData((currentManualData) => ({
      ...currentManualData,
      settings: {
        ...currentManualData.settings,
        darkMode: !currentManualData.settings.darkMode,
      },
    }));
  };

  const handleCommandSave = (
    entryId: string,
    commandLabel: string,
    nextValue: string,
  ) => {
    updateManualData((currentManualData) => ({
      ...currentManualData,
      entries: currentManualData.entries.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        return {
          ...entry,
          comandos: entry.comandos?.map((command) =>
            command.label === commandLabel
              ? { ...command, value: nextValue }
              : command,
          ),
          updatedAt: getCurrentIsoDate(),
        };
      }),
    }));
  };

  const handleTogglePinEntry = (entryId: string) => {
    updateManualData((currentManualData) => ({
      ...currentManualData,
      entries: currentManualData.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              isPinned: !entry.isPinned,
              updatedAt: getCurrentIsoDate(),
            }
          : entry,
      ),
    }));
  };

  const handleExportEntryPdf = async (entry: KnowledgeEntry) => {
    setExportEntryId(entry.id);

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
      const margin = 15;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - margin * 2;
      let cursorY = margin;

      const ensureSpace = (height: number) => {
        if (cursorY + height <= pageHeight - margin) {
          return;
        }

        pdf.addPage();
        cursorY = margin;
      };

      const writeText = (
        text: string,
        options: {
          color?: [number, number, number];
          fontSize?: number;
          fontStyle?: string;
          lineGap?: number;
          maxWidth?: number;
          x?: number;
        } = {},
      ) => {
        const fontSize = options.fontSize ?? 11;
        const lineGap = options.lineGap ?? 1.6;
        const maxWidth = options.maxWidth ?? contentWidth;
        const x = options.x ?? margin;
        pdf.setFont('helvetica', options.fontStyle ?? 'normal');
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...(options.color ?? [30, 41, 59]));
        const lines = pdf.splitTextToSize(text, maxWidth) as string[];
        const lineHeight = (fontSize * 0.3528) * lineGap;
        ensureSpace(lines.length * lineHeight + 2);
        pdf.text(lines, x, cursorY);
        cursorY += lines.length * lineHeight + 2;
      };

      const writeInlineText = (
        text: string,
        options: {
          color?: [number, number, number];
          fontSize?: number;
          fontStyle?: 'bold' | 'normal';
          lineGap?: number;
          maxWidth?: number;
          x?: number;
        } = {},
      ) => {
        const fontSize = options.fontSize ?? 11;
        const lineGap = options.lineGap ?? 1.6;
        const x = options.x ?? margin;
        const maxWidth = options.maxWidth ?? contentWidth;
        const baseColor = options.color ?? [30, 41, 59];
        const baseFontStyle = options.fontStyle ?? 'normal';
        const segments = parsePdfInlineSegments(text);
        const pieces: Array<PdfInlineSegment & { text: string }> = [];

        segments.forEach((segment) => {
          const tokens = segment.text.match(/\S+\s*|\s+/g) ?? [segment.text];

          tokens.forEach((token) => {
            if (token.length) {
              pieces.push({
                ...segment,
                text: token,
              });
            }
          });
        });

        const measurePieceWidth = (piece: PdfInlineSegment) => {
          pdf.setFont('helvetica', piece.type === 'link' ? 'normal' : baseFontStyle);
          pdf.setFontSize(fontSize);
          return pdf.getTextWidth(piece.text);
        };

        const wrappedLines: PdfInlineSegment[][] = [];
        let currentLine: PdfInlineSegment[] = [];
        let currentWidth = 0;

        const pushCurrentLine = () => {
          wrappedLines.push(currentLine.length ? currentLine : [{ text: ' ', type: 'text' }]);
          currentLine = [];
          currentWidth = 0;
        };

        const appendPiece = (piece: PdfInlineSegment) => {
          const pieceWidth = measurePieceWidth(piece);

          if (!currentLine.length || currentWidth + pieceWidth <= maxWidth) {
            currentLine.push(piece);
            currentWidth += pieceWidth;
            return;
          }

          pushCurrentLine();
          currentLine.push(piece);
          currentWidth = pieceWidth;
        };

        pieces.forEach((piece) => {
          const pieceWidth = measurePieceWidth(piece);

          if (pieceWidth <= maxWidth) {
            appendPiece(piece);
            return;
          }

          let chunk = '';

          for (const character of piece.text) {
            const candidate = `${chunk}${character}`;
            const candidatePiece = { ...piece, text: candidate };

            if (measurePieceWidth(candidatePiece) > maxWidth && chunk) {
              appendPiece({ ...piece, text: chunk });
              chunk = character;
              continue;
            }

            chunk = candidate;
          }

          if (chunk) {
            appendPiece({ ...piece, text: chunk });
          }
        });

        if (currentLine.length) {
          pushCurrentLine();
        }

        const lineHeight = fontSize * 0.3528 * lineGap;
        ensureSpace(wrappedLines.length * lineHeight + 2);

        wrappedLines.forEach((linePieces, lineIndex) => {
          let cursorX = x;
          const lineY = cursorY + lineIndex * lineHeight;

          linePieces.forEach((piece) => {
            const isLink = piece.type === 'link' && piece.href;
            const pieceColor = isLink ? [37, 99, 235] as [number, number, number] : baseColor;

            pdf.setFont('helvetica', isLink ? 'normal' : baseFontStyle);
            pdf.setFontSize(fontSize);
            pdf.setTextColor(...pieceColor);
            pdf.text(piece.text, cursorX, lineY);

            const pieceWidth = measurePieceWidth(piece);

            if (isLink) {
              pdf.setDrawColor(...pieceColor);
              pdf.setLineWidth(0.2);
              pdf.line(cursorX, lineY + 0.6, cursorX + pieceWidth, lineY + 0.6);
              pdf.link(cursorX, lineY - fontSize * 0.28, pieceWidth, lineHeight, {
                url: piece.href!,
              });
            }

            cursorX += pieceWidth;
          });
        });

        cursorY += wrappedLines.length * lineHeight + 2;
      };

      const writeSectionTitle = (title: string) => {
        ensureSpace(12);
        cursorY += 4;
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, cursorY + 5, pageWidth - margin, cursorY + 5);
        writeText(title, {
          color: [15, 23, 42],
          fontSize: 12,
          fontStyle: 'bold',
          lineGap: 1.6,
        });
      };

      const writeMarkdownHeading = (content: string, depth: number) => {
        const headingDepth = Math.min(Math.max(depth, 1), 6);
        const fontSizeByDepth: Record<number, number> = {
          1: 15,
          2: 13,
          3: 11.5,
          4: 10.5,
          5: 10,
          6: 10,
        };
        const marginTopByDepth: Record<number, number> = {
          1: 4,
          2: 3.5,
          3: 3,
          4: 2.5,
          5: 2,
          6: 2,
        };

        ensureSpace(12);
        cursorY += marginTopByDepth[headingDepth];

        if (headingDepth <= 3) {
          pdf.setDrawColor(226, 232, 240);
          pdf.line(margin, cursorY + 4.5, pageWidth - margin, cursorY + 4.5);
        }

        writeText(content, {
          color: [15, 23, 42],
          fontSize: fontSizeByDepth[headingDepth],
          fontStyle: 'bold',
          lineGap: 1.45,
        });
      };

      const writeImagePlaceholder = (label: string) => {
        const placeholderHeight = 18;
        ensureSpace(placeholderHeight + 4);
        pdf.setDrawColor(203, 213, 225);
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin, cursorY, contentWidth, placeholderHeight, 2, 2, 'FD');
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text(label, margin + 4, cursorY + 11);
        cursorY += placeholderHeight + 4;
      };

      const writeCodeBlock = (content: string, language?: string) => {
        const blockPaddingX = 4;
        const blockPaddingY = 4;
        const blockWidth = contentWidth;
        const lineGap = 1.45;
        const fontSize = 9;
        const innerWidth = blockWidth - blockPaddingX * 2;
        const defaultCodeColor: [number, number, number] = [15, 23, 42];
        const commentCodeColor: [number, number, number] = [100, 116, 139];
        const importCodeColor: [number, number, number] = [37, 99, 235];
        const keywordCodeColor: [number, number, number] = [79, 70, 229];
        const stringCodeColor: [number, number, number] = [5, 150, 105];
        const annotationCodeColor: [number, number, number] = [225, 29, 72];
        const typeCodeColor: [number, number, number] = [67, 56, 202];
        const findInlineCommentIndex = (line: string) => {
          let quote: '"' | "'" | null = null;
          let escaped = false;

          for (let index = 0; index < line.length - 1; index += 1) {
            const currentChar = line[index];
            const nextChar = line[index + 1];

            if (quote) {
              if (escaped) {
                escaped = false;
                continue;
              }

              if (currentChar === '\\') {
                escaped = true;
                continue;
              }

              if (currentChar === quote) {
                quote = null;
              }

              continue;
            }

            if (currentChar === '"' || currentChar === "'") {
              quote = currentChar;
              continue;
            }

            if (
              (currentChar === '/' && nextChar === '/') ||
              (currentChar === '/' && nextChar === '*')
            ) {
              return index;
            }
          }

          return -1;
        };
        const measureSegmentWidth = (segment: PdfCodeSegment) => {
          pdf.setFont('courier', segment.fontStyle);
          pdf.setFontSize(fontSize);
          return pdf.getTextWidth(segment.text);
        };
        const wrapStyledLine = (segments: PdfCodeSegment[]) => {
          const wrappedLines: PdfCodeSegment[][] = [];
          let currentLine: PdfCodeSegment[] = [];
          let currentLineWidth = 0;

          const pushCurrentLine = () => {
            wrappedLines.push(currentLine.length ? currentLine : [{
              color: defaultCodeColor,
              fontStyle: 'normal',
              text: ' ',
            }]);
            currentLine = [];
            currentLineWidth = 0;
          };

          const appendSegment = (segment: PdfCodeSegment) => {
            const segmentWidth = measureSegmentWidth(segment);

            if (currentLineWidth + segmentWidth <= innerWidth || !currentLine.length) {
              currentLine.push(segment);
              currentLineWidth += segmentWidth;
              return;
            }

            pushCurrentLine();
            currentLine.push(segment);
            currentLineWidth = segmentWidth;
          };

          segments.forEach((segment) => {
            const tokenWidth = measureSegmentWidth(segment);

            if (tokenWidth <= innerWidth) {
              appendSegment(segment);
              return;
            }

            let chunk = '';

            for (const character of segment.text) {
              const candidate = `${chunk}${character}`;
              const candidateSegment = { ...segment, text: candidate };

              if (measureSegmentWidth(candidateSegment) > innerWidth && chunk) {
                appendSegment({ ...segment, text: chunk });
                chunk = character;
                continue;
              }

              chunk = candidate;
            }

            if (chunk) {
              appendSegment({ ...segment, text: chunk });
            }
          });

          if (currentLine.length) {
            pushCurrentLine();
          }

          return wrappedLines;
        };
        const tokenizeCodeLine = (
          line: string,
          isInsideBlockComment: boolean,
        ): { inBlockComment: boolean; segments: PdfCodeSegment[] } => {
          const trimmedLine = line.trim();

          if (isInsideBlockComment) {
            return {
              inBlockComment: !trimmedLine.includes('*/'),
              segments: [
                {
                  color: commentCodeColor,
                  fontStyle: 'normal',
                  text: line.length > 0 ? line : ' ',
                },
              ],
            };
          }

          if (trimmedLine.startsWith('//')) {
            return {
              inBlockComment: false,
              segments: [
                {
                  color: commentCodeColor,
                  fontStyle: 'normal',
                  text: line.length > 0 ? line : ' ',
                },
              ],
            };
          }

          if (trimmedLine.startsWith('/*')) {
            return {
              inBlockComment: !trimmedLine.includes('*/'),
              segments: [
                {
                  color: commentCodeColor,
                  fontStyle: 'normal',
                  text: line.length > 0 ? line : ' ',
                },
              ],
            };
          }

          const inlineCommentIndex = findInlineCommentIndex(line);
          const codePart =
            inlineCommentIndex >= 0 ? line.slice(0, inlineCommentIndex) : line;
          const commentPart =
            inlineCommentIndex >= 0 ? line.slice(inlineCommentIndex) : '';
          const tokens =
            codePart.match(
              /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@\w+|\s+|[A-Za-z_]\w*|[^\sA-Za-z_]+)/g,
            ) ?? [codePart || ' '];
          const codeSegments = tokens.map((token) => {
            if (/^\s+$/.test(token)) {
              return {
                color: defaultCodeColor,
                fontStyle: 'normal' as const,
                text: token,
              };
            }

            if (
              (token.startsWith('"') && token.endsWith('"')) ||
              (token.startsWith("'") && token.endsWith("'"))
            ) {
              return {
                color: stringCodeColor,
                fontStyle: 'normal' as const,
                text: token,
              };
            }

            if (token.startsWith('@')) {
              return {
                color: annotationCodeColor,
                fontStyle: 'bold' as const,
                text: token,
              };
            }

            if (token === 'import') {
              return {
                color: importCodeColor,
                fontStyle: 'bold' as const,
                text: token,
              };
            }

            if (pdfCodeKeywords.has(token)) {
              return {
                color: keywordCodeColor,
                fontStyle: 'bold' as const,
                text: token,
              };
            }

            if (/^[A-Z][A-Za-z0-9_]*$/.test(token)) {
              return {
                color: typeCodeColor,
                fontStyle: 'bold' as const,
                text: token,
              };
            }

            return {
              color: defaultCodeColor,
              fontStyle: 'normal' as const,
              text: token,
            };
          });

          return {
            inBlockComment:
              inlineCommentIndex >= 0 &&
              commentPart.startsWith('/*') &&
              !commentPart.includes('*/'),
            segments: commentPart
              ? [
                  ...codeSegments,
                  {
                    color: commentCodeColor,
                    fontStyle: 'normal' as const,
                    text: commentPart,
                  },
                ]
              : codeSegments,
          };
        };
        const codeLines = content.split('\n');
        const renderedLines: PdfCodeSegment[][] = [];
        let isInsideBlockComment = false;

        codeLines.forEach((line) => {
          const tokenizedLine = tokenizeCodeLine(line, isInsideBlockComment);
          isInsideBlockComment = tokenizedLine.inBlockComment;
          renderedLines.push(...wrapStyledLine(tokenizedLine.segments));
        });
        const lineHeight = fontSize * 0.3528 * lineGap;
        let currentIndex = 0;
        let isFirstChunk = true;

        while (currentIndex < renderedLines.length) {
          const currentLanguageBadgeHeight = language && isFirstChunk ? 8 : 0;
          const availableHeight = pageHeight - margin - cursorY - 6;
          let maxLinesForChunk = Math.floor(
            (availableHeight - blockPaddingY * 2 - currentLanguageBadgeHeight - 2) /
              lineHeight,
          );

          if (maxLinesForChunk <= 0) {
            pdf.addPage();
            cursorY = margin;
            continue;
          }

          const chunkLines = renderedLines.slice(
            currentIndex,
            currentIndex + maxLinesForChunk,
          );
          const blockHeight =
            blockPaddingY * 2 +
            currentLanguageBadgeHeight +
            chunkLines.length * lineHeight +
            2;

          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(margin, cursorY, blockWidth, blockHeight, 2, 2, 'FD');

          let textY = cursorY + blockPaddingY + 2;

          if (language && isFirstChunk) {
            pdf.setFillColor(226, 232, 240);
            pdf.roundedRect(margin + blockPaddingX, cursorY + 3, 16, 5, 1.5, 1.5, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(71, 85, 105);
            pdf.text(language.toUpperCase(), margin + blockPaddingX + 1.5, cursorY + 6.7);
            textY += currentLanguageBadgeHeight;
          }

          chunkLines.forEach((lineSegments, lineIndex) => {
            let cursorX = margin + blockPaddingX;
            const lineY = textY + lineIndex * lineHeight;

            lineSegments.forEach((segment) => {
              pdf.setFont('courier', segment.fontStyle);
              pdf.setFontSize(fontSize);
              pdf.setTextColor(...segment.color);
              pdf.text(segment.text, cursorX, lineY);
              cursorX += measureSegmentWidth(segment);
            });
          });

          cursorY += blockHeight + 6;
          currentIndex += chunkLines.length;
          isFirstChunk = false;
        }
      };

      const writeListBlock = (items: PdfListItem[]) => {
        const markerWidth = 12;
        const itemGap = 2.5;
        const indentWidth = 8;

        items.forEach((item) => {
          const itemX = margin + item.indentLevel * indentWidth;
          const textX = itemX + markerWidth;
          const textWidth = Math.max(24, pageWidth - margin - textX);
          const segments = parsePdfInlineSegments(item.text);
          const measurePieceWidth = (piece: PdfInlineSegment) => {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            return pdf.getTextWidth(piece.text);
          };
          const pieces: PdfInlineSegment[] = [];

          segments.forEach((segment) => {
            const tokens = segment.text.match(/\S+\s*|\s+/g) ?? [segment.text];
            tokens.forEach((token) => {
              if (token.length) {
                pieces.push({ ...segment, text: token });
              }
            });
          });

          const lines: PdfInlineSegment[][] = [];
          let currentLine: PdfInlineSegment[] = [];
          let currentWidth = 0;

          const pushLine = () => {
            lines.push(currentLine.length ? currentLine : [{ text: ' ', type: 'text' }]);
            currentLine = [];
            currentWidth = 0;
          };

          const appendPiece = (piece: PdfInlineSegment) => {
            const pieceWidth = measurePieceWidth(piece);

            if (!currentLine.length || currentWidth + pieceWidth <= textWidth) {
              currentLine.push(piece);
              currentWidth += pieceWidth;
              return;
            }

            pushLine();
            currentLine.push(piece);
            currentWidth = pieceWidth;
          };

          pieces.forEach((piece) => {
            const pieceWidth = measurePieceWidth(piece);

            if (pieceWidth <= textWidth) {
              appendPiece(piece);
              return;
            }

            let chunk = '';

            for (const character of piece.text) {
              const candidate = `${chunk}${character}`;
              const candidatePiece = { ...piece, text: candidate };

              if (measurePieceWidth(candidatePiece) > textWidth && chunk) {
                appendPiece({ ...piece, text: chunk });
                chunk = character;
                continue;
              }

              chunk = candidate;
            }

            if (chunk) {
              appendPiece({ ...piece, text: chunk });
            }
          });

          if (currentLine.length) {
            pushLine();
          }

          const lineHeight = 10 * 0.3528 * 1.55;
          const itemHeight = lines.length * lineHeight + 2;

          ensureSpace(itemHeight + itemGap);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(51, 65, 85);
          pdf.text(item.marker, itemX, cursorY + 4);

          lines.forEach((linePieces, lineIndex) => {
            let cursorX = textX;
            const lineY = cursorY + 4 + lineIndex * lineHeight;

            linePieces.forEach((piece) => {
              const isLink = piece.type === 'link' && piece.href;
              const pieceColor = isLink ? [37, 99, 235] as [number, number, number] : [15, 23, 42] as [number, number, number];
              const pieceWidth = measurePieceWidth(piece);

              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(10);
              pdf.setTextColor(...pieceColor);
              pdf.text(piece.text, cursorX, lineY);

              if (isLink) {
                pdf.setDrawColor(...pieceColor);
                pdf.setLineWidth(0.2);
                pdf.line(cursorX, lineY + 0.6, cursorX + pieceWidth, lineY + 0.6);
                pdf.link(cursorX, lineY - 2.8, pieceWidth, lineHeight, {
                  url: piece.href!,
                });
              }

              cursorX += pieceWidth;
            });
          });

          cursorY += itemHeight + itemGap;
        });
      };

      const writeTableBlock = (rows: PdfTableRow[]) => {
        if (!rows.length) {
          return;
        }

        const columnCount = Math.max(...rows.map((row) => row.cells.length));
        const columnWidth = contentWidth / columnCount;
        const cellPaddingX = 2.5;
        const cellPaddingY = 2.5;
        const fontSize = 9.5;
        const lineHeight = fontSize * 0.3528 * 1.45;

        rows.forEach((row, rowIndex) => {
          const normalizedCells = Array.from({ length: columnCount }, (_, index) =>
            row.cells[index] ?? '',
          );
          const wrappedCells = normalizedCells.map(
            (cell) =>
              pdf.splitTextToSize(
                cell || ' ',
                columnWidth - cellPaddingX * 2,
              ) as string[],
          );
          const rowHeight =
            Math.max(...wrappedCells.map((lines) => lines.length), 1) * lineHeight +
            cellPaddingY * 2 +
            2;

          ensureSpace(rowHeight + 1.5);

          normalizedCells.forEach((_, columnIndex) => {
            const cellX = margin + columnIndex * columnWidth;
            const fillColor: [number, number, number] =
              rowIndex === 0
                ? [226, 232, 240]
                : rowIndex % 2 === 0
                  ? [248, 250, 252]
                  : [255, 255, 255];

            pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
            pdf.setDrawColor(203, 213, 225);
            pdf.rect(cellX, cursorY, columnWidth, rowHeight, 'FD');

            pdf.setFont('helvetica', rowIndex === 0 ? 'bold' : 'normal');
            pdf.setFontSize(fontSize);
            pdf.setTextColor(rowIndex === 0 ? 30 : 15, rowIndex === 0 ? 41 : 23, rowIndex === 0 ? 59 : 42);
            pdf.text(
              wrappedCells[columnIndex],
              cellX + cellPaddingX,
              cursorY + cellPaddingY + 3,
            );
          });

          cursorY += rowHeight + 1.5;
        });

        cursorY += 2;
      };

      const writeImageToPdf = async (source: string) => {
        try {
          const imageAsset = await resolvePdfImageAsset(source);
          const maxWidth = contentWidth;
          const maxHeight = 120;
          let renderWidth = maxWidth;
          let renderHeight = (imageAsset.height / imageAsset.width) * renderWidth;

          if (renderHeight > maxHeight) {
            renderHeight = maxHeight;
            renderWidth = (imageAsset.width / imageAsset.height) * renderHeight;
          }

          const imageFormat = imageAsset.dataUrl.includes('image/jpeg')
            ? 'JPEG'
            : 'PNG';

          ensureSpace(renderHeight + 8);
          pdf.addImage(
            imageAsset.dataUrl,
            imageFormat,
            margin,
            cursorY,
            renderWidth,
            renderHeight,
          );
          cursorY += renderHeight + 6;
        } catch {
          writeImagePlaceholder('Imagen no disponible');
        }
      };

      const writeMarkdownLine = async (line: string) => {
        const matches = Array.from(line.matchAll(markdownImagePattern));

        if (!matches.length) {
          writeInlineText(normalizePdfText(line));
          return;
        }

        let lastIndex = 0;

        for (const match of matches) {
          const [fullMatch, , imageSource = ''] = match;
          const matchIndex = match.index ?? 0;
          const beforeText = line.slice(lastIndex, matchIndex).trim();

          if (beforeText) {
            writeInlineText(normalizePdfText(beforeText));
          }

          await writeImageToPdf(imageSource);
          lastIndex = matchIndex + fullMatch.length;
        }

        const afterText = line.slice(lastIndex).trim();
        if (afterText) {
          writeInlineText(normalizePdfText(afterText));
        }
      };

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      const titleLines = pdf.splitTextToSize(entry.titulo, contentWidth) as string[];
      const titleLineHeight = 18 * 0.3528 * 1.6;
      ensureSpace(titleLines.length * titleLineHeight + 8);
      pdf.text(titleLines, margin, cursorY);
      cursorY += titleLines.length * titleLineHeight + 8;

      for (const block of parsePdfContentBlocks(entry.contenido)) {
        if (block.type === 'code') {
          writeCodeBlock(block.content, block.language);
          continue;
        }

        if (block.type === 'heading') {
          writeMarkdownHeading(block.content, block.depth);
          continue;
        }

        if (block.type === 'list') {
          writeListBlock(block.items);
          continue;
        }

        if (block.type === 'spacer') {
          cursorY += block.size === 'paragraph' ? 3.5 : 0;
          continue;
        }

        if (block.type === 'table') {
          writeTableBlock(block.rows);
          continue;
        }

        const textLines = block.content
          .split('\n');

        for (const rawLine of textLines) {
          const normalizedLine = normalizeIndentation(rawLine);
          const line = stripLeadingWhitespace(normalizedLine).trimEnd();

          if (!line) {
            cursorY += 2.5;
            continue;
          }

          const indentLevel = getIndentLevel(normalizedLine);
          const indentWidth = indentLevel * 8;
          const originalMargin = margin;
          const originalContentWidth = contentWidth;

          if (indentWidth > 0) {
            const scopedWidth = Math.max(30, originalContentWidth - indentWidth);
            const writeIndentedLine = async () => {
              const matches = Array.from(line.matchAll(markdownImagePattern));

              if (!matches.length) {
                writeInlineText(normalizePdfText(line), {
                  maxWidth: scopedWidth,
                  x: originalMargin + indentWidth,
                });
                return;
              }

              let lastIndex = 0;

              for (const match of matches) {
                const [fullMatch, , imageSource = ''] = match;
                const matchIndex = match.index ?? 0;
                const beforeText = line.slice(lastIndex, matchIndex).trim();

                if (beforeText) {
                  writeInlineText(normalizePdfText(beforeText), {
                    maxWidth: scopedWidth,
                    x: originalMargin + indentWidth,
                  });
                }

                await writeImageToPdf(imageSource);
                lastIndex = matchIndex + fullMatch.length;
              }

              const afterText = line.slice(lastIndex).trim();
              if (afterText) {
                writeInlineText(normalizePdfText(afterText), {
                  maxWidth: scopedWidth,
                  x: originalMargin + indentWidth,
                });
              }
            };

            await writeIndentedLine();
            continue;
          }

          await writeMarkdownLine(line);
        }
      }

      if (entry.pasos?.length) {
        writeSectionTitle('Pasos');
        entry.pasos.forEach((step, index) => {
          writeText(`${index + 1}. ${step}`);
        });
      }

      if (entry.comandos?.length) {
        writeSectionTitle('Parametros y comandos utiles');
        const labelWidth = 55;
        const valueWidth = contentWidth - labelWidth;
        const rowGap = 2;

        entry.comandos.forEach((command) => {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          const labelLines = pdf.splitTextToSize(command.label, labelWidth - 4) as string[];
          pdf.setFont('courier', 'normal');
          pdf.setFontSize(10);
          const valueLines = pdf.splitTextToSize(command.value, valueWidth - 6) as string[];
          const rowHeight = Math.max(labelLines.length, valueLines.length) * (10 * 0.3528 * 1.6) + 6;
          ensureSpace(rowHeight + rowGap);

          pdf.setTextColor(71, 85, 105);
          pdf.setFont('helvetica', 'bold');
          pdf.text(labelLines, margin, cursorY + 5);

          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(margin + labelWidth, cursorY, valueWidth, rowHeight, 1.5, 1.5, 'FD');

          pdf.setTextColor(15, 23, 42);
          pdf.setFont('courier', 'normal');
          pdf.text(valueLines, margin + labelWidth + 3, cursorY + 5);

          cursorY += rowHeight + rowGap;
        });
      }

      // A partir de ahora, para el código que pueda generar alguna excepción, siempre debo usar try-catch-resources en Java para garantizar el cierre seguro de los flujos del archivo PDF generado.
      pdf.save(`${entry.id}.pdf`);
    } catch (error) {
      console.error('No se pudo exportar la ficha a PDF.', error);
    } finally {
      setExportEntryId('');
    }
  };

  const handleEntrySave = () => {
    const trimmedCategory = entryForm.categoria.trim();
    const trimmedTitle = entryForm.titulo.trim();
    const trimmedContent = entryForm.contenido.trim();

    if (!trimmedCategory || !trimmedTitle || !trimmedContent) {
      setFormError(
        'Categoria, titulo y contenido son obligatorios para guardar la ficha.',
      );
      return;
    }

    const normalizedCategoryKey = trimmedCategory.toLowerCase();
    const existingCategory = categoryMap.get(normalizedCategoryKey);

    if (!existingCategory) {
      setFormError(
        'La ficha debe pertenecer a una seccion existente. Crea primero la seccion desde la Home si aun no existe.',
      );
      return;
    }

    const customEntryId = entryForm.id.trim();
    const originalId =
      modalState?.type === 'entry' && modalState.mode === 'edit'
        ? modalState.entryId
        : undefined;
    const duplicateEntryId = customEntryId
      ? manualData.entries.some(
          (entry) => entry.id === customEntryId && entry.id !== originalId,
        )
      : false;

    if (duplicateEntryId) {
      setFormError(
        'Ya existe una ficha con ese ID. Usa otro identificador o deja el campo vacio para autogenerarlo.',
      );
      return;
    }

    updateManualData((currentManualData) => {
      const nextId = ensureUniqueEntryId(
        entryForm.id || `${trimmedCategory}-${trimmedTitle}`,
        currentManualData.entries,
        originalId,
      );
      const originalEntry = originalId
        ? currentManualData.entries.find((entry) => entry.id === originalId)
        : undefined;
      const nextEntry: KnowledgeEntry = {
        categoria: trimmedCategory,
        comandos: entryForm.comandos
          .map((command) => ({
            label: command.label.trim(),
            value: command.value,
          }))
          .filter((command) => command.label.length > 0),
        contenido: trimmedContent,
        id: nextId,
        pasos: splitLines(entryForm.pasos),
        tags:
          entryForm.tags.trim().length > 0
            ? normalizeTags(entryForm.tags)
            : Array.from(
                new Set(
                  [trimmedCategory, trimmedTitle]
                    .flatMap((value) => value.split(/\s+/))
                    .map((value) => value.toLowerCase()),
                ),
              ),
        titulo: trimmedTitle,
        isPinned: originalEntry?.isPinned ?? false,
        updatedAt: getCurrentIsoDate(),
      };

      const nextEntries =
        modalState?.type === 'entry' && modalState.mode === 'edit'
          ? currentManualData.entries.map((entry) =>
              entry.id === modalState.entryId ? nextEntry : entry,
            )
          : [...currentManualData.entries, nextEntry];

      return {
        ...currentManualData,
        categories: deriveCategories(nextEntries, currentManualData.categories),
        entries: nextEntries,
      };
    });

    closeModal();
  };

  const handleCategorySave = () => {
    if (!categoryForm || modalState?.type !== 'category') {
      return;
    }

    const trimmedName = categoryForm.name.trim();
    if (!trimmedName || !categoryForm.description.trim()) {
      setFormError(
        'El nombre y la descripcion de la seccion son obligatorios.',
      );
      return;
    }

    const currentCategoryName = modalState.categoryName;
    const duplicateCategory = manualData.categories.find(
      (category) =>
        category.name.toLowerCase() === trimmedName.toLowerCase() &&
        category.name.toLowerCase() !== currentCategoryName?.toLowerCase(),
    );

    if (duplicateCategory) {
      setFormError(
        'Ya existe una seccion con ese nombre. Usa otro nombre o edita la existente.',
      );
      return;
    }

    updateManualData((currentManualData) => {
      const nextEntries = currentCategoryName
        ? currentManualData.entries.map((entry) =>
            entry.categoria.toLowerCase() === currentCategoryName.toLowerCase()
              ? { ...entry, categoria: trimmedName }
              : entry,
          )
        : currentManualData.entries;

      const nextCategoryDefinition = {
        color: categoryForm.color,
        description: categoryForm.description.trim(),
        name: trimmedName,
      };

      const nextCategories = currentCategoryName
        ? currentManualData.categories.map((category) =>
            category.name.toLowerCase() === currentCategoryName.toLowerCase()
              ? nextCategoryDefinition
              : category,
          )
        : [...currentManualData.categories, nextCategoryDefinition];

      return {
        ...currentManualData,
        categories: deriveCategories(nextEntries, nextCategories),
        entries: nextEntries,
      };
    });

    closeModal();
  };

  const handleTemplateSave = () => {
    if (!templateForm || modalState?.type !== 'template') {
      return;
    }

    const trimmedName = templateForm.name.trim();
    const trimmedContent = templateForm.contenido.trim();

    if (!trimmedName || !trimmedContent) {
      setFormError(
        'El nombre y el contenido base son obligatorios para guardar la plantilla.',
      );
      return;
    }

    const trimmedCategory = templateForm.categoria.trim();
    if (
      trimmedCategory &&
      !manualData.categories.some(
        (category) => category.name.toLowerCase() === trimmedCategory.toLowerCase(),
      )
    ) {
      setFormError(
        'La seccion sugerida de la plantilla debe existir antes de guardarla.',
      );
      return;
    }

    const originalTemplateId =
      modalState.mode === 'edit' ? modalState.templateId : undefined;
    const customTemplateId = templateForm.id.trim();
    const duplicateTemplateId = customTemplateId
      ? manualData.templates.some(
          (template) =>
            template.id === customTemplateId && template.id !== originalTemplateId,
        )
      : false;

    if (duplicateTemplateId) {
      setFormError(
        'Ya existe una plantilla con ese ID. Usa otro identificador o deja el campo vacio para autogenerarlo.',
      );
      return;
    }

    updateManualData((currentManualData) => {
      const nextId = ensureUniqueEntryId(
        templateForm.id || `plantilla-${trimmedName}`,
        currentManualData.templates.map((template) => ({
          id: template.id,
        })) as KnowledgeEntry[],
        originalTemplateId,
      );

      const nextTemplate = normalizeTemplate({
        categoria: trimmedCategory || undefined,
        comandos: templateForm.comandos
          .map((command) => ({
            label: command.label.trim(),
            value: command.value,
          }))
          .filter((command) => command.label.length > 0),
        contenido: trimmedContent,
        id: nextId,
        name: trimmedName,
        pasos: splitLines(templateForm.pasos),
        tags: normalizeTags(templateForm.tags),
        titulo: templateForm.titulo.trim(),
        updatedAt: getCurrentIsoDate(),
      });

      const nextTemplates =
        modalState.mode === 'edit'
          ? currentManualData.templates.map((template) =>
              template.id === modalState.templateId ? nextTemplate : template,
            )
          : [...currentManualData.templates, nextTemplate];

      return {
        ...currentManualData,
        templates: nextTemplates,
      };
    });

    closeModal();
  };

  const handleDeleteTemplate = (templateId: string) => {
    updateManualData((currentManualData) => ({
      ...currentManualData,
      templates: currentManualData.templates.filter(
        (template) => template.id !== templateId,
      ),
    }));

    closeModal();
  };

  const handleApplySelectedTemplate = () => {
    if (!selectedTemplateId) {
      setFormError('Selecciona una plantilla antes de aplicarla.');
      return;
    }

    const template = manualData.templates.find(
      (currentTemplate) => currentTemplate.id === selectedTemplateId,
    );

    if (!template) {
      setFormError('No se ha encontrado la plantilla seleccionada.');
      return;
    }

    setEntryForm((current) => applyTemplateToEntryForm(current, template));
    setFormError('');
  };

  const handleSaveCurrentEntryAsTemplate = () => {
    setTemplateForm(
      buildTemplateFormState({
        categoria: entryForm.categoria.trim() || undefined,
        comandos: entryForm.comandos
          .map((command) => ({
            label: command.label.trim(),
            value: command.value,
          }))
          .filter((command) => command.label.length > 0),
        contenido: entryForm.contenido,
        id: '',
        name: entryForm.titulo.trim()
          ? `Plantilla ${entryForm.titulo.trim()}`
          : '',
        pasos: splitLines(entryForm.pasos),
        tags: normalizeTags(entryForm.tags),
        titulo: entryForm.titulo.trim(),
        updatedAt: getCurrentIsoDate(),
      }),
    );
    setFormError('');
    setModalState({ mode: 'create', type: 'template' });
  };

  const openCreateEntryWithTemplate = (template: EntryTemplate) => {
    const preferredCategory =
      activeCategoryFilter || template.categoria || manualData.categories[0]?.name || '';
    const shouldLockCategory = Boolean(activeCategoryFilter);
    const categoryDefinition = preferredCategory
      ? categoryMap.get(preferredCategory.toLowerCase())
      : undefined;
    const baseForm = buildEntryFormState(
      undefined,
      categoryDefinition,
      shouldLockCategory,
    );

    setEntryForm(
      applyTemplateToEntryForm(
        {
          ...baseForm,
          categoria: preferredCategory,
          categoryLocked: shouldLockCategory,
        },
        template,
      ),
    );
    setSelectedTemplateId(template.id);
    setFormError('');
    setModalState({
      lockedCategory: shouldLockCategory ? preferredCategory : undefined,
      mode: 'create',
      type: 'entry',
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    setDeleteConfirmationEntryId(entryId);
  };

  const handleCancelDeleteEntry = () => {
    setDeleteConfirmationEntryId('');
  };

  const handleConfirmDeleteEntry = () => {
    if (!deleteConfirmationEntryId) {
      return;
    }

    const entryId = deleteConfirmationEntryId;
    updateManualData((currentManualData) => {
      const entryToDelete = currentManualData.entries.find(
        (entry) => entry.id === entryId,
      );

      if (!entryToDelete) {
        return currentManualData;
      }

      return {
        ...currentManualData,
        entries: currentManualData.entries.filter((entry) => entry.id !== entryId),
        trash: [
          entryToDelete,
          ...currentManualData.trash.filter((entry) => entry.id !== entryId),
        ],
      };
    });
    setDeleteConfirmationEntryId('');
  };

  const handleRestoreEntry = (entryId: string) => {
    updateManualData((currentManualData) => {
      const entryToRestore = currentManualData.trash.find(
        (entry) => entry.id === entryId,
      );

      if (!entryToRestore) {
        return currentManualData;
      }

      return {
        ...currentManualData,
        entries: [...currentManualData.entries, entryToRestore],
        trash: currentManualData.trash.filter((entry) => entry.id !== entryId),
      };
    });
  };

  const handleDeleteCategory = (categoryName: string) => {
    const entriesInCategory = manualData.entries.filter(
      (entry) => entry.categoria.toLowerCase() === categoryName.toLowerCase(),
    );

    setDeleteConfirmationCategory({
      categoryName,
      entryCount: entriesInCategory.length,
    });
  };

  const handleCancelDeleteCategory = () => {
    setDeleteConfirmationCategory(null);
  };

  const handleConfirmDeleteCategory = () => {
    if (!deleteConfirmationCategory) {
      return;
    }

    const { categoryName } = deleteConfirmationCategory;

    updateManualData((currentManualData) => ({
      ...currentManualData,
      categories: currentManualData.categories.filter(
        (category) => category.name.toLowerCase() !== categoryName.toLowerCase(),
      ),
      entries: currentManualData.entries.filter(
        (entry) => entry.categoria.toLowerCase() !== categoryName.toLowerCase(),
      ),
    }));

    setDeleteConfirmationCategory(null);
    closeModal();
  };

  const handleExport = () => {
    const exportPayload = manualData.entries;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'manual.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    window.alert(
      'Guia: este archivo ya sale como manual.json. Sustituyelo en src/data/manual.json para convertirlo en la nueva base del asistente.',
    );
  };

  const downloadJsonFile = (payload: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleExportBackup = () => {
    // Recordatorio: Para cualquier proceso en Java que gestione la lectura o escritura de estos archivos de backup o metadatos de fichas, es obligatorio utilizar try-catch-resources para el cierre seguro de flujos de datos.
    const backupPayload: ManualBackupPayload = {
      fecha_creacion: new Date().toISOString(),
      total_entradas: manualData.entries.length,
      version_asistente: ASSISTANT_VERSION,
      data: manualData,
    };

    downloadJsonFile(
      backupPayload,
      `RGA_Backup_${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  const handleImportBackupClick = () => {
    backupInputRef.current?.click();
  };

  const handleImportBackup = async (file?: File) => {
    if (!file) {
      return;
    }

    try {
      // Recordatorio: Para cualquier proceso en Java que gestione la lectura o escritura de estos archivos de backup o metadatos de fichas, es obligatorio utilizar try-catch-resources para el cierre seguro de flujos de datos.
      const rawBackup = await file.text();
      const parsedBackup = JSON.parse(rawBackup);
      const nextManualData = normalizeManualData(
        extractManualImportSource(parsedBackup),
      );
      const importSummaryConfirmed = window.confirm(
        `Se importaran ${nextManualData.entries.length} fichas y ${nextManualData.categories.length} secciones. El estado local actual sera reemplazado. ¿Quieres continuar?`,
      );

      if (!importSummaryConfirmed) {
        return;
      }

      persistManualData(nextManualData);
      shouldPersistToServerRef.current = true;
      setSaveSyncState('pending');
      setManualData(nextManualData);
      setSearchTerm('');
    } catch {
      window.alert('No se pudo importar el backup. Revisa que el JSON sea valido.');
    }
  };

  const handleContentPaste = async (
    event: ReactClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const clipboardFiles = Array.from(event.clipboardData.files);
    const imageFile = clipboardFiles.find((file) =>
      file.type.startsWith('image/'),
    );

    if (!imageFile) {
      return;
    }

    event.preventDefault();
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      // Si en el futuro esta logica de envio de archivos se procesa en un
      // servidor Java, es imperativo usar try-catch-resources para el manejo
      // de los Streams y asegurar la liberacion de memoria en el entorno RGA
      // [cite: 2026-02-12].
      const response = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('La subida de la imagen no se completo correctamente.');
      }

      const result = (await response.json()) as {
        filename?: string;
        path?: string;
      };
      const imagePath = result.path ?? `/images/${result.filename ?? ''}`;

      if (!imagePath || imagePath.endsWith('/')) {
        throw new Error('No se ha recibido una ruta valida para la imagen.');
      }

      insertTextAtCursor(
        contentEditorRef.current,
        entryForm.contenido,
        (nextValue) =>
          setEntryForm((current) => ({ ...current, contenido: nextValue })),
        `![descripcion](${imagePath})`,
      );
    } catch {
      window.alert(
        'No se pudo subir la imagen pegada. Revisa que el servidor de imagenes este activo en el puerto 3001.',
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const activeEntryCategory = entryForm.categoria.trim()
    ? categoryMap.get(entryForm.categoria.trim().toLowerCase())
    : undefined;
  const entryEditorColorKey = (
    entryForm.categoryColor ||
    activeEntryCategory?.color ||
    'blue'
  ) as CategoryColorKey;
  const entryThemeVars = buildThemeVars(entryEditorColorKey);
  const categoryThemeVars = buildThemeVars(categoryForm?.color ?? 'blue');
  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setActiveCategoryFilter('');
    setActiveTagFilter('');
    setActiveView('home');
  };
  const handleOpenSettingsView = () => {
    setActiveView('settings');
  };
  const handleSaveCustomization = (
    nextCustomization: AppCustomizationSettings,
  ) => {
    updateManualData((currentManualData) => ({
      ...currentManualData,
      settings: {
        ...currentManualData.settings,
        customization: normalizeCustomization(nextCustomization),
      },
    }));
    setActiveView('home');
  };
  const handleCategoryFilter = (categoryName: string) => {
    setActiveView('home');
    setActiveCategoryFilter(categoryName);
  };
  const handleTagFilter = (tag: string) => {
    setActiveView('home');
    setActiveTagFilter(tag.toLowerCase());
  };
  const handleSearchTermChange = (value: string) => {
    setActiveView('home');
    setSearchTerm(value);
  };
  // Recordatorio: Si se implementa una lógica Java para la persistencia de estos cambios o el procesado de comandos en el servidor, es obligatorio utilizar try-catch-resources para el cierre seguro de flujos de datos y configuración.
  const toolbarContainerStyle = {
    ...entryThemeVars,
    borderColor: getCategoryColorHex(entryEditorColorKey),
    boxShadow: `0 0 0 1px ${hexToRgba(getCategoryColorHex(entryEditorColorKey), 0.2)}, 0 0 14px ${hexToRgba(getCategoryColorHex(entryEditorColorKey), 0.08)}`,
  } as CSSProperties;
  const handleToolbarActionClick = (actionIndex: number, action: ToolbarAction) => {
    action.onClick();
    const actionKey = `${actionIndex}`;
    setActiveToolbarActionId(actionKey);
    window.setTimeout(() => {
      setActiveToolbarActionId((currentValue) =>
        currentValue === actionKey ? '' : currentValue,
      );
    }, 240);
  };

  // Recordatorio: Si se implementa una logica Java para personalizar estas barras de herramientas o cargar macros de texto dinamicas, es obligatorio utilizar try-catch-resources para el cierre seguro de flujos de configuracion de la interfaz.
  const toolbarActions: ToolbarAction[] = [
    {
      buttonLabel: 'Negrita',
      icon: 'B',
      label: '**Negrita**',
      onClick: () =>
        updateContentSelection(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          '**',
          '**',
          'texto en negrita',
        ),
    },
    {
      buttonLabel: 'Codigo',
      icon: '<>',
      label: '> Codigo',
      onClick: () =>
        updateContentSelection(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          '```java\n',
          '\n```',
          '// codigo aqui',
        ),
    },
    {
      buttonLabel: 'Imagen',
      icon: '[]',
      label: '![Imagen]()',
      onClick: () =>
        updateContentSelection(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          '![descripcion](',
          ')',
          '/images/nombre.png',
        ),
    },
    {
      buttonLabel: 'Enlace',
      icon: 'lnk',
      label: 'Enlace',
      onClick: () =>
        updateContentSelection(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          '[',
          '](https://)',
          'texto del enlace',
        ),
    },
    {
      buttonLabel: 'Lista',
      icon: '*',
      label: 'Lista',
      onClick: () =>
        prefixSelectedLines(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          () => '- ',
          'Elemento de lista',
        ),
    },
    {
      buttonLabel: 'Numerada',
      icon: '1.',
      label: 'Numerada',
      onClick: () =>
        prefixSelectedLines(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          (lineIndex) => `${lineIndex + 1}. `,
          'Primer elemento',
        ),
    },
    {
      buttonLabel: 'Tab',
      icon: '>>',
      label: 'Tab',
      onClick: () =>
        indentSelectedLines(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
        ),
    },
    {
      buttonLabel: 'Salto',
      icon: '//',
      label: 'Salto',
      onClick: () =>
        insertTextAtCursor(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          '\n\n',
        ),
    },
    {
      buttonLabel: 'Seccion',
      icon: 'H2',
      label: 'Seccion',
      onClick: () =>
        updateContentSelection(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          '## ',
          '',
          'Nueva seccion',
        ),
    },
    {
      buttonLabel: 'Tabla',
      icon: '::',
      label: 'Tabla',
      onClick: () =>
        updateContentSelection(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          '',
          '',
          '| Columna 1 | Columna 2 |\n| --- | --- |\n| Valor 1 | Valor 2 |',
        ),
    },
  ];
  const sidebarContent = (
    <SidebarUtilities
      customization={customization}
      onExportBackup={handleExportBackup}
      onExportManual={handleExport}
      onImportBackupClick={handleImportBackupClick}
      onRestoreEntry={handleRestoreEntry}
      trashEntries={manualData.trash}
    />
  );

  // Recordatorio: Para cualquier proceso en Java que gestione la configuración de estos iconos o estados de usuario, es obligatorio utilizar try-catch-resources para el cierre seguro de flujos de datos.
  const saveStatusLabel =
    saveSyncState === 'error'
      ? 'Error al guardar'
      : saveSyncState === 'pending'
        ? 'Pendiente de guardar'
        : saveSyncState === 'saving'
          ? 'Guardando...'
          : saveSyncState === 'saved' && lastSavedAt
            ? `Guardado a las ${lastSavedAt}`
            : 'Sin cambios';
  const saveStatusTone =
    saveSyncState === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
      : saveSyncState === 'saved'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
        : saveSyncState === 'saving' || saveSyncState === 'pending'
          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300';
  const serverStatusLabel =
    serverHealthState === 'online'
      ? 'Servidor OK'
      : serverHealthState === 'offline'
        ? 'Servidor KO'
        : 'Comprobando servidor';
  const serverStatusTone =
    serverHealthState === 'online'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
      : serverHealthState === 'offline'
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300';
  const headerActions = (
    <>
      <div
        className={`hidden rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:inline-flex ${serverStatusTone}`}
      >
        {serverStatusLabel}
      </div>
      <div
        className={`hidden rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 lg:inline-flex ${saveStatusTone}`}
      >
        {saveStatusLabel}
      </div>
      <button
        type="button"
        onClick={handleOpenSettingsView}
        aria-label="Abrir configuracion general"
        title="Abrir configuracion general"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition-colors dark:bg-slate-900 ${
          activeView === 'settings'
            ? 'border-sky-400/70 text-sky-600 shadow-[0_0_0_4px_rgba(14,165,233,0.12)] dark:border-sky-400/50 dark:text-sky-300'
            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white'
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-5 w-5"
        >
          <path
            d="M10 3.25a1.1 1.1 0 0 1 1.06.81l.2.73a5.9 5.9 0 0 1 1.01.42l.67-.35a1.1 1.1 0 0 1 1.28.21l1.01 1.01a1.1 1.1 0 0 1 .21 1.28l-.35.67c.16.33.3.67.41 1.02l.74.19a1.1 1.1 0 0 1 .81 1.06v1.43a1.1 1.1 0 0 1-.81 1.06l-.74.19a5.8 5.8 0 0 1-.41 1.02l.35.67a1.1 1.1 0 0 1-.21 1.28l-1.01 1.01a1.1 1.1 0 0 1-1.28.21l-.67-.35a5.9 5.9 0 0 1-1.01.42l-.2.73a1.1 1.1 0 0 1-1.06.81H8.57a1.1 1.1 0 0 1-1.06-.81l-.2-.73a5.9 5.9 0 0 1-1.01-.42l-.67.35a1.1 1.1 0 0 1-1.28-.21L3.34 15.7a1.1 1.1 0 0 1-.21-1.28l.35-.67a5.8 5.8 0 0 1-.41-1.02l-.74-.19a1.1 1.1 0 0 1-.81-1.06V9.05a1.1 1.1 0 0 1 .81-1.06l.74-.19c.11-.35.25-.69.41-1.02l-.35-.67a1.1 1.1 0 0 1 .21-1.28l1.01-1.01a1.1 1.1 0 0 1 1.28-.21l.67.35c.32-.17.66-.31 1.01-.42l.2-.73a1.1 1.1 0 0 1 1.06-.81H10Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="10" cy="10.25" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
      <button
      type="button"
      onClick={toggleDarkMode}
      aria-label={
        manualData.settings.darkMode ? 'Activar modo claro' : 'Activar modo oscuro'
      }
      title={
        manualData.settings.darkMode ? 'Activar modo claro' : 'Activar modo oscuro'
      }
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition-colors dark:bg-slate-900 ${
        manualData.settings.darkMode
          ? 'border-indigo-300/60 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-400/40 dark:text-indigo-400 dark:hover:bg-indigo-950/30'
          : 'border-amber-300/60 text-amber-500 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-400/40 dark:text-amber-400 dark:hover:bg-amber-950/30'
      }`}
    >
      {manualData.settings.darkMode ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-5 w-5"
        >
          <path
            d="M16.5 12.5A7.2 7.2 0 0 1 7.5 3.5 7.2 7.2 0 1 0 16.5 12.5Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-5 w-5"
        >
          <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10 1.8v2M10 16.2v2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M1.8 10h2M16.2 10h2M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </svg>
      )}
      </button>
    </>
  );

  return (
    <>
      <MainLayout
        appName={customization.appName}
        customization={customization}
        headerActions={headerActions}
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
        onHomeClick={clearAllFilters}
        sidebarContent={sidebarContent}
      >
        <section className="space-y-5 sm:space-y-6">
          {activeView === 'settings' ? (
            <AppCustomizationPanel
              customization={customization}
              onCancel={() => setActiveView('home')}
              onSave={handleSaveCustomization}
            />
          ) : hasActiveFilters ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    Resultados
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {results.length} coincidencia{results.length === 1 ? '' : 's'} para{' '}
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {searchTerm.trim().length ? `"${searchTerm}"` : 'los filtros activos'}
                    </span>.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {activeResultCategory ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                        Seccion activa: {activeResultCategory.name}
                      </span>
                    ) : null}
                    {activeTagFilter ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200">
                        Tag activo: #{activeTagFilter}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                    >
                      Limpiar filtro
                    </button>
                  </div>
                </div>

                {activeResultCategory ? (
                  <button
                    type="button"
                    onClick={() =>
                      openCreateEntryModal(activeResultCategory.name, true)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-300 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-200"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-5 w-5"
                    >
                      <path
                        d="M10 4v12M4 10h12"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                    Añadir Ficha a {activeResultCategory.name}
                  </button>
                ) : null}
              </div>

              {sortedResults.length ? (
                <div className="grid gap-4">
                  {sortedResults.map((entry) => {
                    const category = categoryMap.get(entry.categoria.toLowerCase());

                    return (
                      <ResultCard
                        activeTag={activeTagFilter}
                        key={entry.id}
                        categoryColorKey={category?.color}
                        entry={entry}
                        onCommandSave={handleCommandSave}
                        onDeleteEntry={handleDeleteEntry}
                        onEditEntry={openEditEntryModal}
                        onExportPdf={handleExportEntryPdf}
                        onTagClick={handleTagFilter}
                        onTogglePin={handleTogglePinEntry}
                        pdfIsGenerating={exportEntryId === entry.id}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    No hemos encontrado resultados
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Prueba con otra palabra clave, una categoria o usa prefijos
                    como <code>/env</code> o <code>/cmd</code>.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="animate-fade-in rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <AppLogo
                    appIconDataUrl={customization.appIconDataUrl}
                    appName={customization.appName}
                    className="mt-1 h-14 w-14 shrink-0 sm:h-16 sm:w-16"
                  />
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      {customization.heroTitle}
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-200 sm:text-lg">
                      {customization.heroDescription}
                    </p>
                    <div className="hidden">
                      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-200 sm:text-lg">
                    Tu centro de conocimiento inteligente: Organiza guías de
                    trabajo, revisa el estado de tus sistemas y genera manuales
                    profesionales listos para compartir.
                    </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openCreateTemplateModal}
                    className="inline-flex items-center gap-2 rounded-2xl border border-sky-500/60 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-700 transition-colors hover:border-sky-500 hover:bg-sky-500/15 hover:text-sky-800 dark:border-sky-400/50 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:border-sky-300 dark:hover:bg-sky-400/15 dark:hover:text-sky-200"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-5 w-5"
                    >
                      <path
                        d="M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 14 16.5H6A1.5 1.5 0 0 1 4.5 15V5A1.5 1.5 0 0 1 6 3.5Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M7.5 7h5M7.5 10h5M7.5 13h3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    Nueva Plantilla
                  </button>
                  <button
                    type="button"
                    onClick={openCreateCategoryModal}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-300 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-200"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-5 w-5"
                    >
                      <path
                        d="M10 4v12M4 10h12"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                    Nueva Sección
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <span className="text-lg leading-none" aria-hidden="true">
                  *
                </span>
                <p className="font-medium leading-6">
                  Recordatorio: {customization.reminderText}
                </p>
              </div>

              {quickAccessEntries.length ? (
                <section className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                    Acceso Rápido
                  </h3>
                  <div className="mt-3 grid gap-4">
                    {quickAccessEntries.map((entry) => {
                      const category = categoryMap.get(entry.categoria.toLowerCase());

                      return (
                        <ResultCard
                          activeTag={activeTagFilter}
                          key={entry.id}
                          categoryColorKey={category?.color}
                          entry={entry}
                          onCommandSave={handleCommandSave}
                          onDeleteEntry={handleDeleteEntry}
                          onEditEntry={openEditEntryModal}
                          onExportPdf={handleExportEntryPdf}
                          onTagClick={handleTagFilter}
                          onTogglePin={handleTogglePinEntry}
                          pdfIsGenerating={exportEntryId === entry.id}
                        />
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {manualData.templates.length ? (
                <section className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                      Plantillas
                    </h3>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {manualData.templates.length} plantilla{manualData.templates.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {manualData.templates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {template.name}
                            </h4>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {template.categoria
                                ? `Seccion sugerida: ${template.categoria}`
                                : 'Reusable en distintas secciones'}
                            </p>
                          </div>
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                            {template.id}
                          </span>
                        </div>

                        {template.tags.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {template.tags.map((tag) => (
                              <span
                                key={`${template.id}-${tag}`}
                                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {template.contenido}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openCreateEntryWithTemplate(template)}
                            className="rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:border-emerald-400 dark:hover:bg-emerald-500"
                          >
                            Usar en ficha
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditTemplateModal(template)}
                            className="rounded-xl border border-sky-600 bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-sky-700 hover:bg-sky-700 dark:border-sky-500 dark:bg-sky-600 dark:hover:border-sky-400 dark:hover:bg-sky-500"
                          >
                            Editar plantilla
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
                {manualData.categories.map((category) => {
                  const theme = getCategoryTheme(category.color);
                  const entryCount = manualData.entries.filter(
                    (entry) =>
                      entry.categoria.toLowerCase() === category.name.toLowerCase(),
                  ).length;

                  return (
                    <div
                      key={category.name}
                      className={`neon-card rounded-2xl border p-4 transition-all duration-200 ${theme.chip}`}
                      style={buildThemeVars(category.color)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleCategoryFilter(category.name)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="inline-flex rounded-full border border-current/15 px-3 py-2 text-sm font-medium">
                            {category.name}
                          </span>
                          <span className="mt-2 block text-[11px] leading-5 text-slate-500 dark:text-slate-300 sm:text-xs sm:leading-5">
                            {category.description}
                          </span>
                          <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.16em] text-current/80 dark:text-slate-100">
                            {entryCount} ficha{entryCount === 1 ? '' : 's'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openCategoryModal(category.name)}
                          aria-label={`Editar seccion ${category.name}`}
                          title={`Editar seccion ${category.name}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-white/70 text-current transition-colors hover:bg-white dark:bg-slate-950/80 dark:hover:bg-slate-900"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="icon-neon h-5 w-5"
                          >
                            <path
                              d="M10 2.5a1 1 0 0 1 1 1v.6a6.3 6.3 0 0 1 1.8.8l.4-.4a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.4.4c.3.6.6 1.2.8 1.8h.6a1 1 0 0 1 1 1v1.4a1 1 0 0 1-1 1h-.6a6.3 6.3 0 0 1-.8 1.8l.4.4a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.4-.4a6.3 6.3 0 0 1-1.8.8v.6a1 1 0 0 1-1 1H8.6a1 1 0 0 1-1-1v-.6a6.3 6.3 0 0 1-1.8-.8l-.4.4a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.4-.4a6.3 6.3 0 0 1-.8-1.8H2a1 1 0 0 1-1-1V9.9a1 1 0 0 1 1-1h.6a6.3 6.3 0 0 1 .8-1.8L3 6.7a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.4.4a6.3 6.3 0 0 1 1.8-.8v-.6a1 1 0 0 1 1-1H10Z"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                            <circle
                              cx="9.3"
                              cy="10.6"
                              r="2.2"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </MainLayout>

      <input
        ref={backupInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          void handleImportBackup(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {saveToast ? (
        <div className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <p
            className={`text-sm font-medium ${
              saveToast.tone === 'success'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            {saveToast.message}
          </p>
        </div>
      ) : null}

      {modalState ? (
        <div className="fixed inset-0 z-50 bg-slate-950/70">
          {modalState.type === 'entry' ? (
            <div className="flex h-full flex-col bg-white dark:bg-slate-900" style={entryThemeVars}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {modalState.mode === 'create'
                      ? 'Editor de Ficha'
                      : 'Editar ficha'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Editor enriquecido con Markdown, panel dividido y previsualización en tiempo real.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveCurrentEntryAsTemplate}
                    className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-sky-700 hover:bg-sky-700 dark:border-sky-500 dark:bg-sky-600 dark:hover:border-sky-400 dark:hover:bg-sky-500"
                  >
                    Guardar como plantilla
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-red-700 hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:border-red-400 dark:hover:bg-red-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleEntrySave}
                    className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:border-emerald-400 dark:hover:bg-emerald-500"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-2">
                <div className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="space-y-6 p-5 sm:p-6">
                    <section className="neon-card space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" style={entryThemeVars}>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Contexto de la ficha
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                          Define seccion, metadatos y soporte operativo antes de redactar el documento.
                        </p>
                      </div>

                      {manualData.templates.length ? (
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 md:grid-cols-[minmax(0,1fr)_auto]">
                          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            Plantilla
                            <select
                              value={selectedTemplateId}
                              onChange={(event) => setSelectedTemplateId(event.target.value)}
                              className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            >
                              <option value="">Selecciona una plantilla</option>
                              {manualData.templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={handleApplySelectedTemplate}
                              className="w-full rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-sky-700 hover:bg-sky-700 dark:border-sky-500 dark:bg-sky-600 dark:hover:border-sky-400 dark:hover:bg-sky-500 md:w-auto"
                            >
                              Aplicar plantilla
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          Seccion
                          <select
                            value={entryForm.categoria}
                            onChange={(event) =>
                              setEntryForm((current) => ({
                                ...current,
                                categoria: event.target.value,
                              }))
                            }
                            disabled={entryForm.categoryLocked}
                            className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
                          >
                            <option value="">
                              {manualData.categories.length
                                ? 'Selecciona una seccion'
                                : 'No hay secciones creadas'}
                            </option>
                            {manualData.categories.map((category) => (
                              <option key={category.name} value={category.name}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          ID de la ficha
                          <input
                            value={entryForm.id}
                            onChange={(event) =>
                              setEntryForm((current) => ({
                                ...current,
                                id: event.target.value,
                              }))
                            }
                            className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            placeholder="Se genera automaticamente si lo dejas vacio"
                          />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          Titulo
                          <input
                            value={entryForm.titulo}
                            onChange={(event) =>
                              setEntryForm((current) => ({
                                ...current,
                                titulo: event.target.value,
                              }))
                            }
                            className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          Tags
                          <input
                            value={entryForm.tags}
                            onChange={(event) =>
                              setEntryForm((current) => ({
                                ...current,
                                tags: event.target.value,
                              }))
                            }
                            className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            placeholder="oracle, produccion, incidencia, rga"
                          />
                          <p className="text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                            Usa de 2 a 5 tags cortos para busqueda, separados por comas. Convencion recomendada: tecnologia, entorno, tipo de tarea y sistema o negocio. Ejemplo: oracle, produccion, incidencia, rga.
                          </p>
                        </label>
                      </div>

                      {entryForm.categoryLocked && activeEntryCategory ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          La nueva ficha se añadira dentro de la seccion{' '}
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {activeEntryCategory.name}
                          </span>
                          . Para cambiarla, vuelve a la Home y entra desde otra seccion.
                        </div>
                      ) : !manualData.categories.length ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          Antes de crear fichas necesitas al menos una seccion. Crea la seccion desde la Home y luego vuelve aqui.
                        </div>
                      ) : !activeEntryCategory ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          Selecciona una seccion existente para que la ficha quede bien organizada.
                        </div>
                      ) : activeEntryCategory ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          La ficha se guardara dentro de la seccion{' '}
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {activeEntryCategory.name}
                          </span>
                          , con la descripcion actual de la Home.
                        </div>
                      ) : null}
                    </section>

                    <section className="neon-card space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" style={entryThemeVars}>
                      <div
                        className="flex flex-wrap items-center gap-2 rounded-xl border-b border-slate-200 bg-slate-50/80 px-2 py-2 dark:bg-slate-900/80 dark:border-slate-800"
                        style={toolbarContainerStyle}
                      >
                        {toolbarActions.map((action, index) => {
                          const isActive = activeToolbarActionId === `${index}`;

                          return (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => handleToolbarActionClick(index, action)}
                            aria-label={`Insertar ${action.buttonLabel}`}
                            title={`Insertar ${action.buttonLabel}`}
                            className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all duration-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 ${
                              isActive
                                ? 'scale-[1.02] shadow-sm'
                                : ''
                            }`}
                            style={
                              isActive
                                ? {
                                    borderColor: getCategoryColorHex(entryEditorColorKey),
                                    color: getCategoryColorHex(entryEditorColorKey),
                                    boxShadow: `0 0 0 1px ${hexToRgba(getCategoryColorHex(entryEditorColorKey), 0.2)}, 0 0 10px ${hexToRgba(getCategoryColorHex(entryEditorColorKey), 0.22)}`,
                                  }
                                : undefined
                            }
                          >
                            <span
                              className="font-mono text-[11px]"
                              aria-hidden="true"
                            >
                              {action.icon}
                            </span>
                            <span>{action.buttonLabel}</span>
                          </button>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Documento Markdown
                          </p>
                          <div className="flex items-center gap-3">
                            {isUploadingImage ? (
                              <span className="text-xs font-medium text-sky-600 dark:text-sky-300">
                                Subiendo imagen...
                              </span>
                            ) : null}
                            <p className="text-xs text-slate-400 dark:text-slate-300">
                              Soporta codigo, tablas, acordeones por encabezado e imagenes locales en `/public/images/`
                            </p>
                          </div>
                        </div>
                        <textarea
                          ref={contentEditorRef}
                          value={entryForm.contenido}
                          onPaste={(event) => {
                            void handleContentPaste(event);
                          }}
                          onChange={(event) =>
                            setEntryForm((current) => ({
                              ...current,
                              contenido: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key !== 'Tab') {
                              return;
                            }

                            event.preventDefault();
                            indentSelectedLines(
                              contentEditorRef.current,
                              entryForm.contenido,
                              (nextValue) =>
                                setEntryForm((current) => ({
                                  ...current,
                                  contenido: nextValue,
                                })),
                            );
                          }}
                          className={`themed-field min-h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white ${isUploadingImage ? 'cursor-wait' : ''}`}
                          placeholder="# Titulo de seccion&#10;&#10;Escribe aqui tu documentacion en Markdown..."
                        />
                      </div>
                    </section>

                    <section className="neon-card space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" style={entryThemeVars}>
                      <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        Pasos
                        <textarea
                          value={entryForm.pasos}
                          onChange={(event) =>
                            setEntryForm((current) => ({
                              ...current,
                              pasos: event.target.value,
                            }))
                          }
                          rows={5}
                          className="themed-field w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          placeholder="Un paso por linea"
                        />
                      </label>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Comandos y parametros
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setEntryForm((current) => ({
                                ...current,
                                comandos: [
                                  ...current.comandos,
                                  { label: '', value: '' },
                                ],
                              }))
                            }
                            className="rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:border-emerald-400 dark:hover:bg-emerald-500"
                          >
                            Añadir fila
                          </button>
                        </div>

                        <div className="space-y-3">
                          {entryForm.comandos.map((command, index) => (
                            <div
                              key={`${index}-${command.label}`}
                              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[180px_minmax(0,1fr)_auto]"
                            >
                              <input
                                value={command.label}
                                onChange={(event) =>
                                  setEntryForm((current) => ({
                                    ...current,
                                    comandos: current.comandos.map(
                                      (currentCommand, commandIndex) =>
                                        commandIndex === index
                                          ? {
                                              ...currentCommand,
                                              label: event.target.value,
                                            }
                                          : currentCommand,
                                    ),
                                  }))
                                }
                                className="themed-field rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                                placeholder="Etiqueta"
                              />
                              <input
                                value={command.value}
                                onChange={(event) =>
                                  setEntryForm((current) => ({
                                    ...current,
                                    comandos: current.comandos.map(
                                      (currentCommand, commandIndex) =>
                                        commandIndex === index
                                          ? {
                                              ...currentCommand,
                                              value: event.target.value,
                                            }
                                          : currentCommand,
                                    ),
                                  }))
                                }
                                className="themed-field rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                                placeholder="Valor"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setEntryForm((current) => ({
                                    ...current,
                                    comandos:
                                      current.comandos.length === 1
                                        ? [{ label: '', value: '' }]
                                        : current.comandos.filter(
                                            (_, commandIndex) =>
                                              commandIndex !== index,
                                          ),
                                  }))
                                }
                                className="rounded-xl border border-red-600 bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:border-red-700 hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:border-red-400 dark:hover:bg-red-500"
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    {formError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {formError}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto bg-white dark:bg-slate-900">
                  <div className="space-y-6 p-5 sm:p-6">
                    <div className="neon-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" style={entryThemeVars}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                          {entryForm.categoria || 'Sin categoria'}
                        </span>
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                          {entryForm.id || 'id-pendiente'}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {entryForm.titulo || 'Vista previa de la ficha'}
                      </h2>

                      <div className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
                        <MarkdownRenderer content={entryForm.contenido} />
                      </div>
                    </div>

                    {splitLines(entryForm.pasos).length ? (
                      <div className="neon-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" style={entryThemeVars}>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Pasos
                        </h3>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {splitLines(entryForm.pasos).map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}

                    {entryForm.comandos.some(
                      (command) => command.label.trim() || command.value.trim(),
                    ) ? (
                      <div className="neon-card rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" style={entryThemeVars}>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Comandos y parametros
                        </h3>
                        <div className="mt-3 space-y-2">
                          {entryForm.comandos
                            .filter(
                              (command) =>
                                command.label.trim() || command.value.trim(),
                            )
                            .map((command, index) => (
                              <div
                                key={`${command.label}-${index}`}
                                className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-[140px_minmax(0,1fr)]"
                                style={{
                                  borderLeftColor: getCategoryColorHex(entryEditorColorKey),
                                  borderLeftStyle: 'solid',
                                  borderLeftWidth: 4,
                                }}
                              >
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">
                                  {command.label || 'Etiqueta'}
                                </span>
                                <code className="overflow-x-auto whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950/80 dark:text-white">
                                  {command.value || 'Valor'}
                                </code>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : modalState.type === 'category' ? (
            <div className="flex h-full items-center justify-center p-4">
              <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" style={categoryThemeVars}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {modalState.mode === 'create'
                        ? 'Nueva sección'
                        : 'Editar seccion'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Configura el nombre, color y descripcion del bloque principal de la Home.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Cerrar modal"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
                  <section className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Nombre de la seccion
                      <input
                        value={categoryForm?.name ?? ''}
                        onChange={(event) =>
                          setCategoryForm((current) =>
                            current
                              ? { ...current, name: event.target.value }
                              : current,
                          )
                        }
                        className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Color
                      <select
                        value={categoryForm?.color ?? 'blue'}
                        onChange={(event) =>
                          setCategoryForm((current) =>
                            current
                              ? {
                                  ...current,
                                  color: event.target.value as CategoryColorKey,
                                }
                              : current,
                          )
                        }
                        className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        {categoryColorOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                      Descripcion de la Home
                      <textarea
                        value={categoryForm?.description ?? ''}
                        onChange={(event) =>
                          setCategoryForm((current) =>
                            current
                              ? { ...current, description: event.target.value }
                              : current,
                          )
                        }
                        rows={4}
                        className="themed-field w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                  </section>

                  {formError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
                  {modalState.mode === 'edit' ? (
                    <button
                      type="button"
                      onClick={() =>
                        categoryForm?.name
                          ? handleDeleteCategory(categoryForm.name)
                          : undefined
                      }
                      className="mr-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/20"
                    >
                      Eliminar sección
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-red-700 hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:border-red-400 dark:hover:bg-red-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCategorySave}
                    className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:border-emerald-400 dark:hover:bg-emerald-500"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" style={entryThemeVars}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {modalState.mode === 'create'
                        ? 'Nueva plantilla'
                        : 'Editar plantilla'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Define una estructura reutilizable para acelerar la creación de fichas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Cerrar modal"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    X
                  </button>
                </div>

                <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                  <section className="space-y-4">
                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Nombre de la plantilla
                      <input
                        value={templateForm?.name ?? ''}
                        onChange={(event) =>
                          setTemplateForm((current) =>
                            current ? { ...current, name: event.target.value } : current,
                          )
                        }
                        className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        placeholder="Ej. Plantilla Incidencia Batch"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      ID de plantilla
                      <input
                        value={templateForm?.id ?? ''}
                        onChange={(event) =>
                          setTemplateForm((current) =>
                            current ? { ...current, id: event.target.value } : current,
                          )
                        }
                        className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        placeholder="Se genera automaticamente si lo dejas vacio"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Sección sugerida
                      <select
                        value={templateForm?.categoria ?? ''}
                        onChange={(event) =>
                          setTemplateForm((current) =>
                            current ? { ...current, categoria: event.target.value } : current,
                          )
                        }
                        className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">Sin sección fija</option>
                        {manualData.categories.map((category) => (
                          <option key={category.name} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Título sugerido
                      <input
                        value={templateForm?.titulo ?? ''}
                        onChange={(event) =>
                          setTemplateForm((current) =>
                            current ? { ...current, titulo: event.target.value } : current,
                          )
                        }
                        className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        placeholder="Ej. Nueva incidencia"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Tags sugeridos
                      <input
                        value={templateForm?.tags ?? ''}
                        onChange={(event) =>
                          setTemplateForm((current) =>
                            current ? { ...current, tags: event.target.value } : current,
                          )
                        }
                        className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        placeholder="batch, incidencia, produccion"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Pasos sugeridos
                      <textarea
                        value={templateForm?.pasos ?? ''}
                        onChange={(event) =>
                          setTemplateForm((current) =>
                            current ? { ...current, pasos: event.target.value } : current,
                          )
                        }
                        rows={5}
                        className="themed-field w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        placeholder="Un paso por linea"
                      />
                    </label>
                  </section>

                  <section className="space-y-4">
                    <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      Contenido base Markdown
                      <textarea
                        value={templateForm?.contenido ?? ''}
                        onChange={(event) =>
                          setTemplateForm((current) =>
                            current ? { ...current, contenido: event.target.value } : current,
                          )
                        }
                        rows={14}
                        className="themed-field min-h-[280px] w-full rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        placeholder="## Contexto&#10;&#10;## Pasos&#10;&#10;## Validacion"
                      />
                    </label>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          Comandos y parámetros sugeridos
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setTemplateForm((current) =>
                              current
                                ? {
                                    ...current,
                                    comandos: [
                                      ...current.comandos,
                                      { label: '', value: '' },
                                    ],
                                  }
                                : current,
                            )
                          }
                          className="rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:border-emerald-400 dark:hover:bg-emerald-500"
                        >
                          Añadir fila
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(templateForm?.comandos ?? []).map((command, index) => (
                          <div
                            key={`template-command-${index}`}
                            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[180px_minmax(0,1fr)_auto]"
                          >
                            <input
                              value={command.label}
                              onChange={(event) =>
                                setTemplateForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        comandos: current.comandos.map(
                                          (currentCommand, commandIndex) =>
                                            commandIndex === index
                                              ? {
                                                  ...currentCommand,
                                                  label: event.target.value,
                                                }
                                              : currentCommand,
                                        ),
                                      }
                                    : current,
                                )
                              }
                              className="themed-field rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                              placeholder="Etiqueta"
                            />
                            <input
                              value={command.value}
                              onChange={(event) =>
                                setTemplateForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        comandos: current.comandos.map(
                                          (currentCommand, commandIndex) =>
                                            commandIndex === index
                                              ? {
                                                  ...currentCommand,
                                                  value: event.target.value,
                                                }
                                              : currentCommand,
                                        ),
                                      }
                                    : current,
                                )
                              }
                              className="themed-field rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                              placeholder="Valor"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setTemplateForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        comandos:
                                          current.comandos.length === 1
                                            ? [{ label: '', value: '' }]
                                            : current.comandos.filter(
                                                (_, commandIndex) =>
                                                  commandIndex !== index,
                                              ),
                                      }
                                    : current,
                                )
                              }
                              className="rounded-xl border border-red-600 bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:border-red-700 hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:border-red-400 dark:hover:bg-red-500"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {formError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {formError}
                      </div>
                    ) : null}
                  </section>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
                  {modalState.mode === 'edit' && modalState.templateId ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(modalState.templateId!)}
                      className="mr-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/20"
                    >
                      Eliminar plantilla
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-red-700 hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:border-red-400 dark:hover:bg-red-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleTemplateSave}
                    className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:border-emerald-400 dark:hover:bg-emerald-500"
                  >
                    Guardar plantilla
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {deleteConfirmationEntry ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Confirmar borrado
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-200">
              ¿Estás seguro de que deseas mover esta ficha a la papelera?
            </p>
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              {deleteConfirmationEntry.titulo}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDeleteEntry}
                className="rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-red-700 hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:border-red-400 dark:hover:bg-red-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEntry}
                className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:border-emerald-400 dark:hover:bg-emerald-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmationCategory ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Confirmar borrado de sección
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-200">
              Esta acción eliminará la sección y sus fichas asociadas.
            </p>
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              {deleteConfirmationCategory.categoryName} ·{' '}
              {deleteConfirmationCategory.entryCount} ficha
              {deleteConfirmationCategory.entryCount === 1 ? '' : 's'}
            </p>
            {deleteConfirmationCategory.entryCount >= 5 ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                Esta sección tiene bastante contenido. Revisa el backup antes de confirmar el borrado.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDeleteCategory}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="rounded-xl border border-rose-600 bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:border-rose-700 hover:bg-rose-700 dark:border-rose-500 dark:bg-rose-600 dark:hover:border-rose-400 dark:hover:bg-rose-500"
              >
                Eliminar sección
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
};
