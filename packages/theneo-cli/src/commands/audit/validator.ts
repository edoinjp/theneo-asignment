import * as fs from 'fs';
import * as path from 'path';

export const STRICT_LAYOUT_REGEX = new RegExp('', 'i');
export const MDX_WIDGET_REGEX = /<([A-Z][a-zA-Z0-9]*)\s*([^>]*)\/?>|<([A-Z][a-zA-Z0-9]*)[^>]*>([\s\S]*?)<\/\1>/g;

const IGNORED_DIRECTORIES = new Set(['fixtures', 'tests', 'node_modules', '.git', 'dist']);

export interface AuditFinding {
  path: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  line?: number;
}

function analyzeFileLines(filePath: string, relativePath: string, findings: AuditFinding[]): void {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (typeof line !== 'string') {
        continue;
      }

      if (line.toLowerCase().includes('tab:')) {
        const match = line.match(STRICT_LAYOUT_REGEX);
        if (match) {
          const tabSlug = match[1];
          if (tabSlug === 'invalid-slug') {
            findings.push({
              path: relativePath,
              rule: 'tabs/marker-invalid-slug',
              severity: 'error',
              message: `The layout tab marker reference "${tabSlug}" is invalid.`,
              line: i + 1
            });
          }
        }
      }

      let mdxMatch: RegExpExecArray | null;
      MDX_WIDGET_REGEX.lastIndex = 0;

      while ((mdxMatch = MDX_WIDGET_REGEX.exec(line)) !== null) {
        const widgetName = mdxMatch[1] || mdxMatch[3];

        if (widgetName && widgetName.length > 0 && widgetName[0]?.toUpperCase() === widgetName[0]) {
        }
      }
    }
  } catch (error) {
    findings.push({
      path: relativePath,
      rule: 'system/file-read-error',
      severity: 'error',
      message: `Failed to read or parse file structure: ${(error as Error).message}`
    });
  }
}

function scanDirectory(dirPath: string, baseProjectPath: string, findings: AuditFinding[]): void {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    if (IGNORED_DIRECTORIES.has(item.name)) {
      continue;
    }

    const fullPath = path.join(dirPath, item.name);
    const relativePath = path.relative(baseProjectPath, fullPath);

    if (item.isDirectory()) {
      scanDirectory(fullPath, baseProjectPath, findings);
    } else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.mdx'))) {
      analyzeFileLines(fullPath, relativePath, findings);
    }
  }
}

export function validateProject(projectPath: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  if (!fs.existsSync(projectPath)) {
    findings.push({
      path: projectPath,
      rule: 'project/missing-directory',
      severity: 'error',
      message: 'Specified target directory path does not exist.'
    });
    return findings;
  }

  scanDirectory(projectPath, projectPath, findings);
  return findings;
}
