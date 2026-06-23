export interface TabConfig {
  slug: string;
  name?: string;
}

export interface Section {
  slug: string;
  name?: string;
  children?: Section[];
}

export interface TheneoConfig {
  id?: string;
  name?: string;
  sections?: Section[];
  tabs?: TabConfig[];
}

export interface SectionMetadata {
  title?: string;
  slug?: string;
  endpoints?: {
    method?: string;
    path?: string;
  };
}

export interface AuditFinding {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  path?: string;
  line?: number;
}

export interface AuditOptions {
  dir: string;
  json: boolean;
}
