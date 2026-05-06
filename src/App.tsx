import { useMemo, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { ResultCard } from './components/ui/ResultCard';
import {
  categoryColorOptions,
  getCategoryTheme,
} from './constants/categoryColors';
import manualEntries from './data/manual.json';
import { useSearch } from './hooks/useSearch';
import type {
  CategoryColorKey,
  CategoryDefinition,
  CommandOption,
  CommandOverridesByEntry,
  KnowledgeEntry,
  ManualData,
} from './types';

const STORAGE_KEY = 'knowledge-manual-state-v2';
const LEGACY_COMMAND_STORAGE_KEY = 'result-card-command-overrides';

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

type ModalState =
  | { entryId?: string; mode: 'create' | 'edit'; type: 'entry' }
  | { categoryName: string; type: 'category' }
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
    };
  }

  return {
    categories: [],
    entries: [],
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
    };
  } catch {
    return baseManual;
  }
};

const persistManualData = (manualData: ManualData) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Cualquier lógica de persistencia en servidor Java para esta jerarquía dinámica debe usar try-catch-resources para el manejo de excepciones de E/S.
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(manualData));
};

const splitLines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

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
): EntryFormState => ({
  categoryColor: category?.color ?? 'blue',
  categoryDescription: category?.description ?? '',
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
  category: CategoryDefinition,
): CategoryFormState => ({
  color: category.color,
  description: category.description,
  name: category.name,
});

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

  const openCreateEntryModal = (prefilledCategory?: string) => {
    const categoryDefinition = prefilledCategory
      ? categoryMap.get(prefilledCategory.toLowerCase())
      : undefined;

    setEntryForm(buildEntryFormState(undefined, categoryDefinition));
    setEntryForm((current) => ({
      ...current,
      categoria: prefilledCategory ?? current.categoria,
    }));
    setFormError('');
    setModalState({ mode: 'create', type: 'entry' });
  };

  const openEditEntryModal = (entry: KnowledgeEntry) => {
    const categoryDefinition = categoryMap.get(entry.categoria.toLowerCase());
    setEntryForm(buildEntryFormState(entry, categoryDefinition));
    setFormError('');
    setModalState({ entryId: entry.id, mode: 'edit', type: 'entry' });
  };

  const openCategoryModal = (categoryName: string) => {
    const category = categoryMap.get(categoryName.toLowerCase());
    if (!category) {
      return;
    }

    setCategoryForm(buildCategoryFormState(category));
    setFormError('');
    setModalState({ categoryName, type: 'category' });
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
        category.name.toLowerCase() !== currentCategoryName.toLowerCase(),
    );

    if (duplicateCategory) {
      setFormError(
        'Ya existe una seccion con ese nombre. Usa otro nombre o edita la existente.',
      );
      return;
    }

    updateManualData((currentManualData) => {
      const nextEntries = currentManualData.entries.map((entry) =>
        entry.categoria.toLowerCase() === currentCategoryName.toLowerCase()
          ? { ...entry, categoria: trimmedName }
          : entry,
      );

      const nextCategories = currentManualData.categories.map((category) =>
        category.name.toLowerCase() === currentCategoryName.toLowerCase()
          ? {
              color: categoryForm.color,
              description: categoryForm.description.trim(),
              name: trimmedName,
            }
          : category,
      );

      return {
        categories: deriveCategories(nextEntries, nextCategories),
        entries: nextEntries,
      };
    });

    closeModal();
  };

  const handleExport = () => {
    const exportPayload = {
      categories: manualData.categories,
      entries: manualData.entries,
    };
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
      'Guia: mueve el archivo descargado a src/data/ y renombralo como manual.json para convertirlo en la nueva base del asistente.',
    );
  };

  const activeEntryCategory = entryForm.categoria.trim()
    ? categoryMap.get(entryForm.categoria.trim().toLowerCase())
    : undefined;
  const isCreatingNewCategory =
    entryForm.categoria.trim().length > 0 && !activeEntryCategory;

  const headerActions = (
    <>
      <button
        type="button"
        onClick={() => openCreateEntryModal()}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
      >
        Gestion de conocimiento
      </button>
      <button
        type="button"
        onClick={handleExport}
        className="rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
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
      >
        <section className="space-y-5 sm:space-y-6">
          {hasSearchTerm ? (
            <>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Resultados
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {results.length} coincidencia{results.length === 1 ? '' : 's'} para{' '}
                  <span className="font-medium text-slate-800">"{searchTerm}"</span>.
                </p>
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
                        onEditEntry={openEditEntryModal}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center shadow-sm sm:px-6 sm:py-10">
                  <h3 className="text-lg font-semibold text-slate-900">
                    No hemos encontrado resultados
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Prueba con otra palabra clave, una categoria o usa prefijos
                    como <code>/env</code> o <code>/cmd</code>.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="animate-fade-in rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    Ecosistema de Conocimiento RGA
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                    Centro de mando dinamico para documentacion viva, protocolos
                    de actuacion y credenciales tecnicas del equipo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openCreateEntryModal()}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                >
                  Nueva subseccion
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
                      className={`rounded-2xl border p-4 transition-all duration-200 ${theme.chip}`}
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
                          <span className="mt-2 block text-[11px] leading-5 text-slate-500 sm:text-xs sm:leading-5">
                            {category.description}
                          </span>
                          <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.16em] text-current/80">
                            {entryCount} ficha{entryCount === 1 ? '' : 's'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openCategoryModal(category.name)}
                          aria-label={`Editar seccion ${category.name}`}
                          title={`Editar seccion ${category.name}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-white/70 text-current transition-colors hover:bg-white"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {modalState.type === 'entry'
                    ? modalState.mode === 'create'
                      ? 'Gestion de conocimiento'
                      : 'Editar ficha'
                    : 'Editar seccion'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {modalState.type === 'entry'
                    ? 'Define categoria, contenido, pasos y comandos desde un unico formulario.'
                    : 'Actualiza el nombre, la descripcion y el color de la seccion.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar modal"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
              {modalState.type === 'entry' ? (
                <>
                  <section className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Seccion principal
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Elige una categoria existente o escribe una nueva para
                        crear un bloque dinamico en la Home.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm font-medium text-slate-700">
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
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                          placeholder="Ej. BBDD"
                        />
                        <datalist id="existing-categories">
                          {manualData.categories.map((category) => (
                            <option key={category.name} value={category.name} />
                          ))}
                        </datalist>
                      </label>

                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        ID de la ficha
                        <input
                          value={entryForm.id}
                          onChange={(event) =>
                            setEntryForm((current) => ({
                              ...current,
                              id: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                          placeholder="Se genera automaticamente si lo dejas vacio"
                        />
                      </label>
                    </div>

                    {isCreatingNewCategory ? (
                      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_180px]">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                          Descripcion de la seccion
                          <input
                            value={entryForm.categoryDescription}
                            onChange={(event) =>
                              setEntryForm((current) => ({
                                ...current,
                                categoryDescription: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                            placeholder="Resumen corto para el bloque de la Home"
                          />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                          Color de la seccion
                          <select
                            value={entryForm.categoryColor}
                            onChange={(event) =>
                              setEntryForm((current) => ({
                                ...current,
                                categoryColor: event.target.value as CategoryColorKey,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
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
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        La ficha se guardara dentro de la seccion{' '}
                        <span className="font-semibold text-slate-900">
                          {activeEntryCategory.name}
                        </span>
                        , con la descripcion actual de la Home.
                      </div>
                    ) : null}
                  </section>

                  <section className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Subseccion
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Completa la ficha con su contenido operativo.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        Titulo
                        <input
                          value={entryForm.titulo}
                          onChange={(event) =>
                            setEntryForm((current) => ({
                              ...current,
                              titulo: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium text-slate-700">
                        Tags
                        <input
                          value={entryForm.tags}
                          onChange={(event) =>
                            setEntryForm((current) => ({
                              ...current,
                              tags: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                          placeholder="tag1, tag2, tag3"
                        />
                      </label>
                    </div>

                    <label className="block space-y-2 text-sm font-medium text-slate-700">
                      Contenido
                      <textarea
                        value={entryForm.contenido}
                        onChange={(event) =>
                          setEntryForm((current) => ({
                            ...current,
                            contenido: event.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <label className="block space-y-2 text-sm font-medium text-slate-700">
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
                        className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                        placeholder="Un paso por linea"
                      />
                    </label>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-700">
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
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                        >
                          Anadir fila
                        </button>
                      </div>

                      <div className="space-y-3">
                        {entryForm.comandos.map((command, index) => (
                          <div
                            key={`${index}-${command.label}`}
                            className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[180px_minmax(0,1fr)_auto]"
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
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
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
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
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
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              ) : categoryForm ? (
                <section className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Nombre de la seccion
                    <input
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm((current) =>
                          current
                            ? { ...current, name: event.target.value }
                            : current,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Color
                    <select
                      value={categoryForm.color}
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    >
                      {categoryColorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                    Descripcion de la Home
                    <textarea
                      value={categoryForm.description}
                      onChange={(event) =>
                        setCategoryForm((current) =>
                          current
                            ? { ...current, description: event.target.value }
                            : current,
                        )
                      }
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                    />
                  </label>
                </section>
              ) : null}

              {formError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={
                  modalState.type === 'entry' ? handleEntrySave : handleCategorySave
                }
                className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
