import type { AppCustomizationSettings, ExternalToolLink } from '../types';

export const defaultExternalTools: ExternalToolLink[] = [
  { id: 'jira-indra', name: 'Jira Indra', url: 'https://jira.indra.es/secure/Dashboard.jspa' },
  {
    id: 'iteams',
    name: 'iTeams',
    url: 'http://10.22.206.214:8180/ione-gestion-configuracion/CULogin/LoginAceptar.do?&SESSION_CLIENT_STATE=1777993003974#',
  },
  {
    id: 'onesait-local',
    name: 'Escritorio Onesait Local',
    url: 'http://localhost.npa.com:8080/npa-escritorio',
  },
  {
    id: 'onesait-int1',
    name: 'Escritorio Onesait INT1',
    url: 'https://acdc-int1.caja.rural:8543/npa-escritorio',
  },
  {
    id: 'onesait-int2',
    name: 'Escritorio Onesait INT2',
    url: 'https://acdc-int2.caja.rural:8543/npa-escritorio',
  },
  {
    id: 'onesait-uat',
    name: 'Escritorio Onesait UAT',
    url: 'https://acdc-uat.caja.rural:8643/npa-escritorio',
  },
  {
    id: 'onesait-pre',
    name: 'Escritorio Onesait PRE',
    url: 'https://acdc-pre.caja.rural:8443/npa-escritorio',
  },
  {
    id: 'correo-indra',
    name: 'Correo corporativo Indra',
    url: 'https://outlook.cloud.microsoft/mail/',
  },
  {
    id: 'correo-keapps',
    name: 'Correo corporativo Keapps',
    url: 'https://serviciodecorreo.es/?_task=mail&_mbox=INBOX',
  },
  { id: 'word-365', name: 'Word 365', url: 'https://word.cloud.microsoft/' },
  {
    id: 'excel-365',
    name: 'Excel 365',
    url: 'https://excel.cloud.microsoft/?wdOrigin=OFFICECOM-WEB.APPGALLERY',
  },
  {
    id: 'cezanne-keapps',
    name: 'Cezanne Keapps',
    url: 'https://w3.cezanneondemand.com/CezanneHR/-/KEAPPS/view/9ebaad0a-8ad5-4d97-b2f1-e5d179149a81?ce=3&et=4d8970cb-6164-4162-b780-4574ff852be1&n=6c5063b4-8307-4f55-b968-ddc3e36e154d',
  },
  { id: 'wiki-onesait-general', name: 'Wiki Onesait general', url: '#' },
  { id: 'wiki-onesait-5', name: 'Wiki Onesait 5.0', url: '#' },
];

export const defaultAppCustomization: AppCustomizationSettings = {
  appIconDataUrl: '',
  appName: 'Asistente Onesite RGA',
  backupSectionTitle: 'Backup',
  companyUsersLabel: 'Usuarios por Compania',
  devToolsSectionTitle: 'DevTools',
  externalTools: defaultExternalTools,
  externalToolsTitle: 'Herramientas Externas',
  globalPasswordLabel: 'Password',
  globalRgaTitle: 'Global RGA',
  globalUserLabel: 'Usuario',
  heroDescription:
    'Tu centro de conocimiento inteligente: Organiza guias de trabajo, revisa el estado de tus sistemas y genera manuales profesionales listos para compartir.',
  heroTitle: 'Ecosistema de Conocimiento RGA',
  reminderText:
    'Para cualquier implementacion Java que gestione excepciones, utiliza siempre try-catch-resources para garantizar la seguridad del codigo.',
  sidebarIdentityTitle: 'Escritorio',
  trashSectionTitle: 'Papelera',
};

const normalizeExternalTool = (
  tool: Partial<ExternalToolLink> | undefined,
  index: number,
): ExternalToolLink => ({
  id: tool?.id?.trim() || `external-tool-${index + 1}`,
  name: tool?.name?.trim() || `Enlace ${index + 1}`,
  url: tool?.url?.trim() || '#',
});

export const normalizeCustomization = (
  customization: Partial<AppCustomizationSettings> | undefined,
): AppCustomizationSettings => {
  const mergedExternalTools = Array.isArray(customization?.externalTools)
    ? customization!.externalTools.map((tool, index) =>
        normalizeExternalTool(tool, index),
      )
    : defaultExternalTools;

  return {
    ...defaultAppCustomization,
    ...customization,
    externalTools: mergedExternalTools,
  };
};
