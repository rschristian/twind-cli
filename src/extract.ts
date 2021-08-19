import { promises as fs } from 'fs';

function extractRulesFromString(content: string): string[] {
    let rules = new Set<string>();
    for (const match of content.matchAll(/class="([^"]*)"/g)) {
        rules.add(match[1]);
    }
    return [...rules];
}

export async function extractContentAndRulesFromFile(
    file: string,
): Promise<{ content: string; rules: string[] }> {
    try {
        const content = await fs.readFile(file, 'utf-8');
        return { content, rules: extractRulesFromString(content) };
    } catch (error) {
        // TODO log error
        // @ts-ignore
        return {};
    }
}
