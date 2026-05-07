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

export interface ExternalToolLink {
  id: string;
  name: string;
  url: string;
}

export interface AppCustomizationSettings {
  appIconDataUrl: string;
  appName: string;
  backupSectionTitle: string;
  companyUsersLabel: string;
  devToolsSectionTitle: string;
  externalTools: ExternalToolLink[];
  externalToolsTitle: string;
  globalPasswordLabel: string;
  globalRgaTitle: string;
  globalUserLabel: string;
  heroDescription: string;
  heroTitle: string;
  reminderText: string;
  sidebarIdentityTitle: string;
  trashSectionTitle: string;
}

export interface AppSettings {
  customization: AppCustomizationSettings;
  darkMode: boolean;
}

export interface EntryTemplate {
  id: string;
  name: string;
  titulo: string;
  categoria?: KnowledgeCategory;
  contenido: string;
  pasos?: string[];
  comandos?: CommandOption[];
  tags: string[];
  updatedAt?: string;
}

export interface ManualData {
  categories: CategoryDefinition[];
  entries: KnowledgeEntry[];
  settings: AppSettings;
  templates: EntryTemplate[];
  trash: KnowledgeEntry[];
}

export interface ManualBackupPayload {
  data: ManualData | KnowledgeEntry[];
  fecha_creacion: string;
  total_entradas: number;
  version_asistente: string;
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
  isPinned?: boolean;
  pasos?: string[];
  comandos?: CommandOption[];
  tags: string[];
  updatedAt?: string;
}
