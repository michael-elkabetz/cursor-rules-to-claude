import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

export async function findRuleFiles(rulesDir: string): Promise<string[]> {
    return glob('**/*', { cwd: rulesDir, nodir: true });
}

export function readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
}

export function writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
}

export function concatenateRules(rulesDir: string, ruleFiles: string[]): string {
    let allRulesContent = '';
    for (const file of ruleFiles) {
        const filePath = path.join(rulesDir, file);
        try {
            const content = readFile(filePath);
            allRulesContent += `\n\n--- FILE: ${file} ---\n\n`;
            allRulesContent += content;
        } catch (error) {
            // Ignore error
        }
    }
    return allRulesContent;
}
