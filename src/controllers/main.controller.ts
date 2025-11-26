import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { createAIService } from '../services/ai.service';
import { findRuleFiles, readFile, writeFile, concatenateRules } from '../utils/file.utils';

const RULES_DIR = path.join(__dirname, '../../rules');
const INSTRUCTIONS_FILE = path.join(__dirname, '../../system_prompt.txt');
const OUTPUT_DIR = path.join(__dirname, '../../output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'CLAUDE.md');
const CONCATENATED_RULES_FILE = path.join(OUTPUT_DIR, 'all_rules.txt');

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

export async function run() {
    try {
        const { service, vendor, model, maxTokens } = createAIService();
        const vendorDisplay = vendor === 'openai' ? 'OpenAI' : 'Anthropic';
        
        console.log(chalk.bold.cyan('\n=== Configuration ==='));
        console.log(chalk.cyan(`AI Vendor: ${vendorDisplay}`));
        console.log(chalk.cyan(`Model: ${model}`));
        console.log(chalk.cyan(`Max Tokens: ${maxTokens}`));
        console.log(chalk.cyan('=====================\n'));

        console.log(chalk.bold.blue('[Step 1/6] Finding rule files'));
        const ruleFiles = await findRuleFiles(RULES_DIR);

        if (ruleFiles.length === 0) {
            console.warn(chalk.yellow('No rule files found in rules directory.'));
        } else {
            console.log(chalk.green(`✓ Found ${ruleFiles.length} rule files\n`));
        }

        console.log(chalk.bold.blue('[Step 2/6] Concatenating rules'));
        const allRulesContent = concatenateRules(RULES_DIR, ruleFiles);
        console.log(chalk.green('✓ Rules concatenated\n'));

        console.log(chalk.bold.blue('[Step 3/6] Saving concatenated rules'));
        writeFile(CONCATENATED_RULES_FILE, allRulesContent);
        console.log(chalk.green(`✓ Saved to ${CONCATENATED_RULES_FILE}\n`));

        console.log(chalk.bold.blue('[Step 4/6] Reading instructions'));
        const systemPrompt = readFile(INSTRUCTIONS_FILE);
        console.log(chalk.green('✓ Instructions loaded\n'));

        console.log(chalk.bold.blue('[Step 5/6] Token Calculation'));
        const userPrompt = `Here are all the cursor rules from the repository. Please aggregate them into a single CLAUDE.md file following the system instructions.\n\n${allRulesContent}`;
        
        try {
            const tokenCount = await service.countTokens(systemPrompt, userPrompt, model);
            console.log(chalk.cyan(`Total Input Tokens: ${tokenCount}`));
            console.log(chalk.cyan(`Concatenated Rules File: ${CONCATENATED_RULES_FILE}`));
            console.log(chalk.green('✓ Token calculation complete\n'));
        } catch (error) {
            console.error(chalk.red('✗ Error calculating tokens:'), error);
            process.exit(1);
        }

        const force = process.argv.includes('--force');

        if (!force) {
            console.log(chalk.bold.blue('[Step 6/6] AI Analysis'));
            const answer = await askQuestion(chalk.yellow('Do you want to proceed with sending this request? (y/N): '));
            if (answer.toLowerCase() !== 'y') {
                console.log(chalk.red('Aborted by user.'));
                process.exit(0);
            }
        } else {
            console.log(chalk.bold.blue('[Step 6/6] AI Analysis'));
            console.log(chalk.yellow('Force flag detected. Proceeding without user confirmation.'));
        }

        console.log(chalk.magenta(`Sending request to ${vendorDisplay}...`));
        const content = await service.generateResponse(systemPrompt, userPrompt, model, maxTokens);
        console.log(chalk.green('✓ Response received'));

        console.log(chalk.blue(`Writing output to ${OUTPUT_FILE}...`));
        writeFile(OUTPUT_FILE, content);
        console.log(chalk.green(`✓ CLAUDE.md saved to ${OUTPUT_FILE}`));
        
        console.log(chalk.bold.green('\n✓ All steps completed successfully!\n'));

    } catch (error: any) {
        console.error(chalk.red('\n✗ Error:'), error.message);
        process.exit(1);
    }
}
