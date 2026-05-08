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

const matchesPrefixQuery = (
  entry: KnowledgeEntry,
  query: string,
  predicate: (entry: KnowledgeEntry) => boolean,
) => {
  if (!predicate(entry)) {
    return false;
  }

  if (!query) {
    return true;
  }

  return buildEntrySearchBlob(entry).includes(query);
};

export function useSearch(
  entries: KnowledgeEntry[],
  rawSearchTerm: string,
  activeCategoryFilter?: string,
  activeTagFilters: string[] = [],
) {
  return useMemo(() => {
    const term = normalize(rawSearchTerm);
    const normalizedCategoryFilter = normalize(activeCategoryFilter ?? '');
    const normalizedTagFilters = activeTagFilters
      .map((tag) => normalize(tag))
      .filter(Boolean);
    let filteredEntries = entries;

    if (normalizedCategoryFilter) {
      filteredEntries = filteredEntries.filter(
        (entry) => normalize(entry.categoria) === normalizedCategoryFilter,
      );
    }

    if (normalizedTagFilters.length) {
      filteredEntries = filteredEntries.filter((entry) =>
        normalizedTagFilters.every((activeTag) =>
          entry.tags.some((tag) => normalize(tag) === activeTag),
        ),
      );
    }

    if (!term) {
      return filteredEntries;
    }

    if (term.startsWith('/cmd')) {
      const cmdQuery = normalize(term.replace('/cmd', ''));

      return filteredEntries.filter((entry) =>
        matchesPrefixQuery(
          entry,
          cmdQuery,
          (candidateEntry) =>
            (candidateEntry.categoria === 'Batch' ||
              candidateEntry.categoria === 'General') &&
            Boolean(candidateEntry.comandos?.length),
        ),
      );
    }

    if (term.startsWith('/env')) {
      const envQuery = normalize(term.replace('/env', ''));

      return filteredEntries.filter((entry) =>
        matchesPrefixQuery(entry, envQuery, (candidateEntry) => candidateEntry.categoria === 'Entorno'),
      );
    }

    if (term.startsWith('/db')) {
      const dbQuery = normalize(term.replace('/db', ''));

      return filteredEntries.filter((entry) =>
        matchesPrefixQuery(
          entry,
          dbQuery,
          (candidateEntry) =>
            candidateEntry.categoria === 'Batch' ||
            candidateEntry.comandos?.some((command) =>
              /sql|oracle|tabla|query|select|insert|update|delete/i.test(
                `${command.label} ${command.value}`,
              ),
            ) === true ||
            /sql|oracle|tabla|bbdd|base de datos|query/i.test(
              buildEntrySearchBlob(candidateEntry),
            ),
        ),
      );
    }

    if (term.startsWith('/uml')) {
      const umlQuery = normalize(term.replace('/uml', ''));

      return filteredEntries.filter((entry) =>
        matchesPrefixQuery(entry, umlQuery, (candidateEntry) => candidateEntry.categoria === 'UML'),
      );
    }

    if (term.startsWith('/task')) {
      const taskQuery = normalize(term.replace('/task', ''));

      return filteredEntries.filter((entry) =>
        matchesPrefixQuery(
          entry,
          taskQuery,
          (candidateEntry) =>
            Boolean(candidateEntry.pasos?.length) ||
            /\bpaso\b|\btarea\b|\bprocedimiento\b|\bchecklist\b/i.test(
              buildEntrySearchBlob(candidateEntry),
            ),
        ),
      );
    }

    return filteredEntries.filter((entry) => buildEntrySearchBlob(entry).includes(term));
  }, [activeCategoryFilter, activeTagFilters, entries, rawSearchTerm]);
}
