import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { PrintTemplate } from './components/ui/EntryPdfDocument';
import { MarkdownRenderer } from './components/ui/MarkdownRenderer';
import { ResultCard } from './components/ui/ResultCard';
import { SidebarUtilities } from './components/ui/SidebarUtilities';
import {
  categoryColorOptions,
  getCategoryColorHex,
  getCategoryTheme,
} from './constants/categoryColors';
import manualEntries from './data/manual.json';
import { useSearch } from './hooks/useSearch';
import type {
  AppSettings,
  CategoryColorKey,
  CategoryDefinition,
  CommandOption,
  CommandOverridesByEntry,
  KnowledgeEntry,
  ManualData,
} from './types';

const STORAGE_KEY = 'knowledge-manual-state-v2';
const LEGACY_COMMAND_STORAGE_KEY = 'result-card-command-overrides';
const defaultSettings: AppSettings = {
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

interface ToolbarAction {
  label: string;
  onClick: () => void;
}

type ModalState =
  | {
      entryId?: string;
      lockedCategory?: string;
      mode: 'create' | 'edit';
      type: 'entry';
    }
  | { categoryName?: string; mode: 'create' | 'edit'; type: 'category' }
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
  pasos: entry.pasos?.map((step) => step.trim()).filter(Boolean) ?? [],
  tags: entry.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
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

    return {
      categories,
      entries,
      settings: {
        ...defaultSettings,
        ...(candidate.settings ?? {}),
      },
      trash: Array.isArray(candidate.trash)
        ? candidate.trash.map((entry) => normalizeEntry(entry))
        : [],
    };
  }

  return {
    categories: [],
    entries: [],
    settings: defaultSettings,
    trash: [],
  };
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

const persistManualData = (manualData: ManualData) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Recordatorio: Si se desarrolla un microservicio Java para centralizar estos Health Checks o gestionar la persistencia de la papelera, utilizar estrictamente try-catch-resources para el cierre seguro de flujos y sockets.
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(manualData));
};

const splitLines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

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

export const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
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
  const [formError, setFormError] = useState('');
  const [activeToolbarActionId, setActiveToolbarActionId] = useState('');
  const contentEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const pdfExportRef = useRef<HTMLDivElement | null>(null);
  const [exportEntryId, setExportEntryId] = useState('');

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
  const results = useSearch(manualData.entries, searchTerm);
  const hasSearchTerm = searchTerm.trim().length > 0;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const activeResultCategory = manualData.categories.find(
    (category) => category.name.toLowerCase() === normalizedSearchTerm,
  );
  const exportEntry = exportEntryId
    ? manualData.entries.find((entry) => entry.id === exportEntryId)
    : undefined;
  const exportCategory = exportEntry
    ? categoryMap.get(exportEntry.categoria.toLowerCase())
    : undefined;

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      manualData.settings.darkMode,
    );
  }, [manualData.settings.darkMode]);

  useEffect(() => {
    if (!exportEntry || !pdfExportRef.current || typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    const exportTimeout = window.setTimeout(async () => {
      try {
        const html2pdf = (await import('html2pdf.js')).default as any;
        const filename = `${slugify(exportEntry.categoria)}-${slugify(exportEntry.titulo)}.pdf`;
        const exportNode = pdfExportRef.current;

        if (!exportNode) {
          setExportEntryId('');
          return;
        }

        // Recordatorio: Para cualquier implementacion en Java que gestione la exportacion de esta documentacion tecnica, es obligatorio utilizar try-catch-resources para el cierre seguro de los flujos de archivos PDF.
        await html2pdf()
          .set({
            filename,
            html2canvas: {
              backgroundColor: '#ffffff',
              scale: 2,
              useCORS: true,
            },
            image: {
              quality: 0.98,
              type: 'jpeg',
            },
            jsPDF: {
              format: 'a4',
              orientation: 'portrait',
              unit: 'mm',
            },
            margin: [15, 15, 15, 15],
            pagebreak: {
              avoid: ['.pdf-avoid-break', 'pre', 'table', 'img'],
              mode: ['css', 'legacy'],
            },
          } as any)
          .from(exportNode)
          .save();
      } finally {
        if (!cancelled) {
          setExportEntryId('');
        }
      }
    }, 90);

    return () => {
      cancelled = true;
      window.clearTimeout(exportTimeout);
    };
  }, [exportEntry]);

  const openCreateEntryModal = (
    prefilledCategory?: string,
    categoryLocked = false,
  ) => {
    const categoryDefinition = prefilledCategory
      ? categoryMap.get(prefilledCategory.toLowerCase())
      : undefined;

    setEntryForm(
      buildEntryFormState(undefined, categoryDefinition, categoryLocked),
    );
    setEntryForm((current) => ({
      ...current,
      categoryLocked,
      categoria: prefilledCategory ?? current.categoria,
    }));
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
    setFormError('');
    setModalState({ entryId: entry.id, mode: 'edit', type: 'entry' });
  };

  const openCreateCategoryModal = () => {
    setCategoryForm(buildCategoryFormState());
    setFormError('');
    setModalState({ mode: 'create', type: 'category' });
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
    setFormError('');
  };

  const updateManualData = (
    updater: (currentManualData: ManualData) => ManualData,
  ) => {
    setManualData((currentManualData) => {
      const nextManualData = normalizeManualData(updater(currentManualData));
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
        };
      }),
    }));
  };

  const handleExportEntryPdf = (entry: KnowledgeEntry) => {
    setExportEntryId(entry.id);
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
    const isNewCategory = !existingCategory;

    if (isNewCategory && !entryForm.categoryDescription.trim()) {
      setFormError(
        'Las categorias nuevas necesitan una descripcion para el bloque de la Home.',
      );
      return;
    }

    updateManualData((currentManualData) => {
      const originalId =
        modalState?.type === 'entry' && modalState.mode === 'edit'
          ? modalState.entryId
          : undefined;
      const nextId = ensureUniqueEntryId(
        entryForm.id || `${trimmedCategory}-${trimmedTitle}`,
        currentManualData.entries,
        originalId,
      );
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
            ? entryForm.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            : Array.from(
                new Set(
                  [trimmedCategory, trimmedTitle]
                    .flatMap((value) => value.split(/\s+/))
                    .map((value) => value.toLowerCase()),
                ),
              ),
        titulo: trimmedTitle,
      };

      const nextEntries =
        modalState?.type === 'entry' && modalState.mode === 'edit'
          ? currentManualData.entries.map((entry) =>
              entry.id === modalState.entryId ? nextEntry : entry,
            )
          : [...currentManualData.entries, nextEntry];

      const nextCategories = isNewCategory
        ? [
            ...currentManualData.categories,
            {
              color: entryForm.categoryColor,
              description: entryForm.categoryDescription.trim(),
              name: trimmedCategory,
            },
          ]
        : currentManualData.categories;

      return {
        ...currentManualData,
        categories: deriveCategories(nextEntries, nextCategories),
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

  const handleDeleteEntry = (entryId: string) => {
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

  const handleExport = () => {
    const exportPayload = manualData;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'manual_actualizado.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    window.alert(
      'Guia: mueve el archivo descargado a src/data/, renombralo como manual.json y machaca el archivo original para convertirlo en la nueva base del asistente.',
    );
  };

  const activeEntryCategory = entryForm.categoria.trim()
    ? categoryMap.get(entryForm.categoria.trim().toLowerCase())
    : undefined;
  const isCreatingNewCategory =
    entryForm.categoria.trim().length > 0 && !activeEntryCategory;
  const entryEditorColorKey = (
    entryForm.categoryColor ||
    activeEntryCategory?.color ||
    'blue'
  ) as CategoryColorKey;
  const entryThemeVars = buildThemeVars(entryEditorColorKey);
  const categoryThemeVars = buildThemeVars(categoryForm?.color ?? 'blue');
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
      label: '> Código',
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
      label: 'Lista',
      onClick: () =>
        updateContentSelection(
          contentEditorRef.current,
          entryForm.contenido,
          (nextValue) =>
            setEntryForm((current) => ({ ...current, contenido: nextValue })),
          '- ',
          '',
          'Elemento de lista',
        ),
    },
    {
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
      onRestoreEntry={handleRestoreEntry}
      trashEntries={manualData.trash}
    />
  );

  const headerActions = (
    <>
      <button
        type="button"
        onClick={toggleDarkMode}
        aria-label={
          manualData.settings.darkMode ? 'Activar modo claro' : 'Activar modo oscuro'
        }
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        {manualData.settings.darkMode ? 'Sol' : 'Luna'}
      </button>
      <button
        type="button"
        onClick={handleExport}
        className="rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        Exportar Manual Actualizado
      </button>
    </>
  );

  return (
    <>
      <MainLayout
        headerActions={headerActions}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onHomeClick={() => setSearchTerm('')}
        sidebarContent={sidebarContent}
      >
        <section className="space-y-5 sm:space-y-6">
          {hasSearchTerm ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    Resultados
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {results.length} coincidencia{results.length === 1 ? '' : 's'} para{' '}
                    <span className="font-medium text-slate-800 dark:text-slate-100">"{searchTerm}"</span>.
                  </p>
                </div>

                {activeResultCategory ? (
                  <button
                    type="button"
                    onClick={() =>
                      openCreateEntryModal(activeResultCategory.name, true)
                    }
                    className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                  >
                    Añadir Ficha a {activeResultCategory.name}
                  </button>
                ) : null}
              </div>

              {results.length ? (
                <div className="grid gap-4">
                  {results.map((entry) => {
                    const category = categoryMap.get(entry.categoria.toLowerCase());

                    return (
                      <ResultCard
                        key={entry.id}
                        categoryColorKey={category?.color}
                        entry={entry}
                        onCommandSave={handleCommandSave}
                        onDeleteEntry={handleDeleteEntry}
                        onEditEntry={openEditEntryModal}
                        onExportPdf={handleExportEntryPdf}
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
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Ecosistema de Conocimiento RGA
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-200 sm:text-lg">
                    Centro de mando dinamico para documentacion viva, protocolos
                    de actuacion y credenciales tecnicas del equipo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateCategoryModal}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  Nueva Sección
                </button>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <span className="text-lg leading-none" aria-hidden="true">
                  *
                </span>
                <p className="font-medium leading-6">
                  Recordatorio: Para cualquier implementacion Java que gestione
                  excepciones, utiliza siempre <code>try-catch-resources</code>{' '}
                  para garantizar la seguridad del codigo.
                </p>
              </div>

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
                          onClick={() => setSearchTerm(category.name)}
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
                            className="icon-neon h-4 w-4"
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
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleEntrySave}
                    className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
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

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          Categoria
                          <input
                            list="existing-categories"
                            value={entryForm.categoria}
                            onChange={(event) =>
                              setEntryForm((current) => ({
                                ...current,
                                categoria: event.target.value,
                              }))
                            }
                            disabled={entryForm.categoryLocked}
                            className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
                            placeholder="Ej. BBDD"
                          />
                          <datalist id="existing-categories">
                            {manualData.categories.map((category) => (
                              <option key={category.name} value={category.name} />
                            ))}
                          </datalist>
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
                            placeholder="tag1, tag2, tag3"
                          />
                        </label>
                      </div>

                      {entryForm.categoryLocked && activeEntryCategory ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          La nueva ficha se añadira dentro de la seccion{' '}
                          <span className="font-semibold text-slate-900">
                            {activeEntryCategory.name}
                          </span>
                          . Para cambiarla, vuelve a la Home y entra desde otra seccion.
                        </div>
                      ) : isCreatingNewCategory ? (
                        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[minmax(0,1fr)_180px]">
                          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            Descripcion de la seccion
                            <input
                              value={entryForm.categoryDescription}
                              onChange={(event) =>
                                setEntryForm((current) => ({
                                  ...current,
                                  categoryDescription: event.target.value,
                                }))
                              }
                              className="themed-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                              placeholder="Resumen corto para el bloque de la Home"
                            />
                          </label>

                          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            Color de la seccion
                            <select
                              value={entryForm.categoryColor}
                              onChange={(event) =>
                                setEntryForm((current) => ({
                                  ...current,
                                  categoryColor: event.target.value as CategoryColorKey,
                                }))
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
                        </div>
                      ) : activeEntryCategory ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          La ficha se guardara dentro de la seccion{' '}
                          <span className="font-semibold text-slate-900">
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
                          const toolbarMeta = [
                            { icon: 'B', label: 'Negrita' },
                            { icon: '<>', label: 'Codigo' },
                            { icon: '[]', label: 'Imagen' },
                            { icon: '•', label: 'Lista' },
                            { icon: '::', label: 'Tabla' },
                          ][index] ?? { icon: '+', label: action.label };
                          const isActive = activeToolbarActionId === `${index}`;

                          return (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => handleToolbarActionClick(index, action)}
                            aria-label={`Insertar ${toolbarMeta.label}`}
                            title={`Insertar ${toolbarMeta.label}`}
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
                              {toolbarMeta.icon}
                            </span>
                            <span>{toolbarMeta.label}</span>
                          </button>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Documento Markdown
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-300">
                            Soporta codigo, tablas, acordeones por encabezado e imagenes locales en `/public/images/`
                          </p>
                        </div>
                        <textarea
                          ref={contentEditorRef}
                          value={entryForm.contenido}
                          onChange={(event) =>
                            setEntryForm((current) => ({
                              ...current,
                              contenido: event.target.value,
                            }))
                          }
                          className="themed-field min-h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                          >
                            Anadir fila
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
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
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
                                className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[140px_minmax(0,1fr)]"
                              >
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  {command.label || 'Etiqueta'}
                                </span>
                                <code className="overflow-x-auto whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
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
          ) : (
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
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCategorySave}
                    className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {exportEntry ? (
        <div className="pointer-events-none fixed left-[-20000px] top-0 z-[-1]">
          <PrintTemplate
            category={exportCategory}
            containerRef={(node) => {
              pdfExportRef.current = node;
            }}
            entry={exportEntry}
          />
        </div>
      ) : null}
    </>
  );
};
