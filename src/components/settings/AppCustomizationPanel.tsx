import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AppLogo } from '../ui/AppLogo';
import type {
  AppCustomizationSettings,
  AppDiagnosticsSnapshot,
  ExternalToolLink,
} from '../../types';

interface AppCustomizationPanelProps {
  customization: AppCustomizationSettings;
  diagnostics: AppDiagnosticsSnapshot;
  onCancel: () => void;
  onSave: (nextCustomization: AppCustomizationSettings) => void;
}

const createToolDraft = (index: number): ExternalToolLink => ({
  id: `external-tool-draft-${index + 1}`,
  name: '',
  url: '',
});

export function AppCustomizationPanel({
  customization,
  diagnostics,
  onCancel,
  onSave,
}: AppCustomizationPanelProps) {
  const [formState, setFormState] = useState<AppCustomizationSettings>(customization);

  useEffect(() => {
    setFormState(customization);
  }, [customization]);

  const updateField = (
    field: keyof AppCustomizationSettings,
    value: string | ExternalToolLink[],
  ) => {
    setFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  };

  const updateExternalTool = (
    toolId: string,
    field: keyof Pick<ExternalToolLink, 'name' | 'url'>,
    value: string,
  ) => {
    updateField(
      'externalTools',
      formState.externalTools.map((tool) =>
        tool.id === toolId ? { ...tool, [field]: value } : tool,
      ),
    );
  };

  const handleAddTool = () => {
    updateField('externalTools', [
      ...formState.externalTools,
      createToolDraft(formState.externalTools.length),
    ]);
  };

  const handleRemoveTool = (toolId: string) => {
    updateField(
      'externalTools',
      formState.externalTools.length === 1
        ? [createToolDraft(0)]
        : formState.externalTools.filter((tool) => tool.id !== toolId),
    );
  };

  const handleIconFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });

    updateField('appIconDataUrl', dataUrl);
    event.target.value = '';
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...formState,
      externalTools: formState.externalTools.map((tool, index) => ({
        id: tool.id.trim() || `external-tool-${index + 1}`,
        name: tool.name.trim() || `Enlace ${index + 1}`,
        url: tool.url.trim() || '#',
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="hero-shell rounded-[2rem] border border-slate-200 p-5 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
              Configuración general
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Personaliza la experiencia general
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Desde aquí puedes ajustar el nombre de la aplicación, los textos
              principales, el recordatorio destacado, el contenido del lateral y
              el icono, sin sobrecargar la interfaz con controles dispersos.
            </p>
          </div>

          <div className="soft-subpanel rounded-3xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
              Vista previa
            </p>
            <div className="mt-3 flex items-center gap-3">
              <AppLogo
                appIconDataUrl={formState.appIconDataUrl}
                appName={formState.appName}
                className="h-14 w-14"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900 dark:text-white">
                  {formState.appName || 'Nombre de la aplicación'}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-300">
                  {formState.heroTitle || 'Título principal'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="sidebar-panel rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Branding y portada
            </h3>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Nombre de la aplicación
                <input
                  value={formState.appName}
                  onChange={(event) => updateField('appName', event.target.value)}
                  className="themed-field w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950/90 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Título principal
                <input
                  value={formState.heroTitle}
                  onChange={(event) => updateField('heroTitle', event.target.value)}
                  className="themed-field w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950/90 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Descripción principal
                <textarea
                  value={formState.heroDescription}
                  onChange={(event) =>
                    updateField('heroDescription', event.target.value)
                  }
                  rows={4}
                  className="themed-field w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-3 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950/90 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Recordatorio principal
                <textarea
                  value={formState.reminderText}
                  onChange={(event) =>
                    updateField('reminderText', event.target.value)
                  }
                  rows={3}
                  className="themed-field w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-3 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950/90 dark:text-white"
                />
              </label>
            </div>
          </div>

          <div className="sidebar-panel rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Herramientas del menú lateral
              </h3>
              <button
                type="button"
                onClick={handleAddTool}
                  className="rounded-xl border border-emerald-500/60 bg-emerald-500/12 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-500/18 dark:text-emerald-300"
              >
                Añadir acceso
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {formState.externalTools.map((tool, index) => (
                <div
                  key={tool.id}
                  className="soft-subpanel grid gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]"
                >
                  <input
                    value={tool.name}
                    onChange={(event) =>
                      updateExternalTool(tool.id, 'name', event.target.value)
                    }
                    className="themed-field rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-white"
                    placeholder={`Nombre del enlace ${index + 1}`}
                  />
                  <input
                    value={tool.url}
                    onChange={(event) =>
                      updateExternalTool(tool.id, 'url', event.target.value)
                    }
                    className="themed-field rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-white"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTool(tool.id)}
                    className="rounded-xl border border-rose-500/60 bg-rose-500/12 px-3 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:border-rose-500 hover:bg-rose-500/18 dark:text-rose-300"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="sidebar-panel rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Diagnóstico rápido
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Resumen del estado operativo actual, la sincronización del manual y
              la salud general de la sesión.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="soft-subpanel rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  Servidor
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {diagnostics.serverStatusLabel}
                </p>
              </div>
              <div className="soft-subpanel rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  Guardado
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {diagnostics.saveStatusLabel}
                </p>
              </div>
              <div className="soft-subpanel rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  Origen de datos
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {diagnostics.dataOriginLabel}
                </p>
              </div>
              <div className="soft-subpanel rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  Revisión activa
                </p>
                <p className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-slate-100">
                  {diagnostics.revisionLabel}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                  Manual
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {diagnostics.categoriesCount} secciones
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {diagnostics.entriesCount} fichas
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {diagnostics.templatesCount} plantillas
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {diagnostics.trashCount} en papelera
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                  Historial
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {diagnostics.undoDepth} acciones para deshacer
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {diagnostics.redoDepth} acciones para rehacer
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                  Huella
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {diagnostics.approximateSizeKb} KB aprox.
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  Último guardado: {diagnostics.lastSavedAt || 'sin registro'}
                </p>
                <p
                  className={`text-sm ${
                    diagnostics.hasSaveConflict
                      ? 'text-rose-600 dark:text-rose-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {diagnostics.hasSaveConflict
                    ? 'Hay conflicto con otra instancia'
                    : 'Sin conflictos activos'}
                </p>
              </div>
            </div>
          </div>

          <div className="sidebar-panel rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Icono de la aplicación
            </h3>
            <div className="mt-4 flex flex-col gap-4">
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-700 transition-colors hover:border-sky-500 hover:bg-sky-500/15 dark:text-sky-300">
                Subir icono
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIconFileChange}
                  className="hidden"
                />
              </label>
              <input
                value={formState.appIconDataUrl}
                onChange={(event) =>
                  updateField('appIconDataUrl', event.target.value)
                }
                className="themed-field w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950/90 dark:text-white"
                placeholder="O pega aquí una URL o Data URL del icono"
              />
              <button
                type="button"
                onClick={() => updateField('appIconDataUrl', '')}
                className="sidebar-soft-button w-fit rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                Quitar icono
              </button>
            </div>
          </div>

          <div className="sidebar-panel rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Textos del menu lateral
            </h3>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Título de herramientas externas
                <input
                  value={formState.externalToolsTitle}
                  onChange={(event) =>
                    updateField('externalToolsTitle', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Título del bloque de escritorio
                <input
                  value={formState.sidebarIdentityTitle}
                  onChange={(event) =>
                    updateField('sidebarIdentityTitle', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Texto de usuarios por compania
                <input
                  value={formState.companyUsersLabel}
                  onChange={(event) =>
                    updateField('companyUsersLabel', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Título de Global RGA
                <input
                  value={formState.globalRgaTitle}
                  onChange={(event) =>
                    updateField('globalRgaTitle', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Etiqueta de usuario
                <input
                  value={formState.globalUserLabel}
                  onChange={(event) =>
                    updateField('globalUserLabel', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Etiqueta de password
                <input
                  value={formState.globalPasswordLabel}
                  onChange={(event) =>
                    updateField('globalPasswordLabel', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Título de DevTools
                <input
                  value={formState.devToolsSectionTitle}
                  onChange={(event) =>
                    updateField('devToolsSectionTitle', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Título de Backup
                <input
                  value={formState.backupSectionTitle}
                  onChange={(event) =>
                    updateField('backupSectionTitle', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Título de Papelera
                <input
                  value={formState.trashSectionTitle}
                  onChange={(event) =>
                    updateField('trashSectionTitle', event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-2xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700"
        >
          Guardar cambios
        </button>
      </div>
    </form>
  );
}
