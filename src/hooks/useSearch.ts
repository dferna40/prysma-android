import { useMemo } from 'react';
import type { KnowledgeEntry } from '../types';

const normalize = (value: string) => value.trim().toLowerCase();

export function useSearch(entries: KnowledgeEntry[], rawSearchTerm: string) {
  return useMemo(() => {
    const term = normalize(rawSearchTerm);

    if (!term) {
      return entries;
    }

    if (term.startsWith('/cmd')) {
      const cmdQuery = normalize(term.replace('/cmd', ''));

      return entries.filter((entry) => {
        const validCategory =
          entry.categoria === 'Batch' || entry.categoria === 'General';
        const hasCommands = Boolean(entry.comandos?.length);

        if (!validCategory || !hasCommands) {
          return false;
        }

        if (!cmdQuery) {
          return true;
        }

        return (
          entry.titulo.toLowerCase().includes(cmdQuery) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(cmdQuery)) ||
          entry.comandos?.some(
            (command) =>
              command.label.toLowerCase().includes(cmdQuery) ||
              command.value.toLowerCase().includes(cmdQuery),
          )
        );
      });
    }

    if (term.startsWith('/env')) {
      const envQuery = normalize(term.replace('/env', ''));

      return entries.filter((entry) => {
        if (entry.categoria !== 'Entorno') {
          return false;
        }

        if (!envQuery) {
          return true;
        }

        return (
          entry.titulo.toLowerCase().includes(envQuery) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(envQuery))
        );
      });
    }

    if (term.startsWith('/uml')) {
      const umlQuery = normalize(term.replace('/uml', ''));

      return entries.filter((entry) => {
        if (entry.categoria !== 'UML') {
          return false;
        }

        if (!umlQuery) {
          return true;
        }

        return (
          entry.titulo.toLowerCase().includes(umlQuery) ||
          entry.contenido.toLowerCase().includes(umlQuery) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(umlQuery)) ||
          entry.pasos?.some((step) => step.toLowerCase().includes(umlQuery))
        );
      });
    }

    // Para cualquier implementación de lógica Java relacionada con Seguros que gestione
    // excepciones, es obligatorio usar try-catch-resources.
    return entries.filter(
      (entry) =>
        entry.titulo.toLowerCase().includes(term) ||
        entry.categoria.toLowerCase().includes(term) ||
        entry.contenido.toLowerCase().includes(term) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(term)) ||
        entry.pasos?.some((step) => step.toLowerCase().includes(term)) ||
        entry.comandos?.some(
          (command) =>
            command.label.toLowerCase().includes(term) ||
            command.value.toLowerCase().includes(term),
        ),
    );
  }, [entries, rawSearchTerm]);
}
