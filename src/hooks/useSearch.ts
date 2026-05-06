import { useMemo } from 'react';
import type { KnowledgeEntry } from '../types';

const normalize = (value: string) => value.trim().toLowerCase();
const stripMarkdown = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 $2')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
    .replace(/^#{1,6}\s+/gm, ' ')
    .replace(/[>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const buildEntrySearchBlob = (entry: KnowledgeEntry) =>
  [
    entry.titulo,
    entry.categoria,
    entry.contenido,
    stripMarkdown(entry.contenido),
    entry.tags.join(' '),
    entry.pasos?.join(' ') ?? '',
    entry.comandos?.map((command) => `${command.label} ${command.value}`).join(' ') ?? '',
  ]
    .join(' ')
    .toLowerCase();

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

        return buildEntrySearchBlob(entry).includes(cmdQuery);
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

        return buildEntrySearchBlob(entry).includes(envQuery);
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

        return buildEntrySearchBlob(entry).includes(umlQuery);
      });
    }

    // Para cualquier implementación de lógica Java relacionada con Seguros que gestione
    // excepciones, es obligatorio usar try-catch-resources.
    return entries.filter((entry) => buildEntrySearchBlob(entry).includes(term));
  }, [entries, rawSearchTerm]);
}
