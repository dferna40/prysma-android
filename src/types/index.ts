export type KnowledgeCategory =
  | 'Entorno'
  | 'Batch'
  | 'UI'
  | 'UML'
  | 'General'
  | 'Seguros';

export interface CommandOption {
  label: string;
  value: string;
}

export interface KnowledgeEntry {
  id: string;
  titulo: string;
  categoria: KnowledgeCategory;
  contenido: string;
  pasos?: string[];
  comandos?: CommandOption[];
  tags: string[];
}
