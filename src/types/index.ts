export type KnowledgeCategory = string;

export type CategoryColorKey =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'indigo'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'orange'
  | 'teal'
  | 'slate';

export interface CommandOption {
  label: string;
  value: string;
}

export interface CategoryDefinition {
  name: string;
  description: string;
  color: CategoryColorKey;
}

export interface ManualData {
  categories: CategoryDefinition[];
  entries: KnowledgeEntry[];
}

export interface CommandOverride {
  label: string;
  value: string;
}

export type CommandOverridesByEntry = Record<string, CommandOverride[]>;

export interface KnowledgeEntry {
  id: string;
  titulo: string;
  categoria: KnowledgeCategory;
  contenido: string;
  pasos?: string[];
  comandos?: CommandOption[];
  tags: string[];
}
