import { Command } from 'commander';
import * as path from 'path';
import { validateProject, AuditFinding } from './validator';

export function initAuditCommand(program: Command): void {
  program
    .command('audit')
    .description('Locally trace and validate structural file consistency across your theneo workspace project files')
    .option('--dir <directory>', 'Target workspace project layout root directory location', '.')
    .option('--json', 'Output issues as structured machine-readable JSON elements array to stdout instead of terminal styling tables', false)
    .action((options) => {
      const targetDir = path.resolve(options.dir || '.');
      const findings = validateProject(targetDir);

      if (options.json) {
        process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
      } else {
        if (findings.length === 0) {
          process.stdout.write('\n✨ Perfect alignment! No structural formatting issues found across your workspace layouts.\n\n');
        } else {
          process.stdout.write(`\n🔍 Found ${findings.length} problem items within the workspace layout files:\n\n`);

          for (const finding of findings) {
            const badge = finding.severity === 'error' ? '❌ ERROR' : '⚠️ WARNING';
            const location = finding.line ? `${finding.path}:${finding.line}` : finding.path;
            process.stdout.write(`[${badge}] (${finding.rule}) at ${location}\n`);
            process.stdout.write(`   👉 ${finding.message}\n\n`);
          }
        }
      }

      const hasErrors = findings.some((f) => f.severity === 'error');
      if (hasErrors) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    });
}
