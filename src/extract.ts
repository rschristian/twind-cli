import { promises as fs } from 'fs';
// @ts-ignore
import { process } from 'babel-plugin-tailwind-grouping';

function extractRulesFromString(content: string): { content: string, rules: string[] } {
    let rules = new Set<string>();
    for (const match of content.matchAll(/class="([^"]*)"/g)) {
        if (match[1].includes('(')) {
            const processed = process(match[1]);
            content = content.replace(
                match[0],
                `class="${processed}"`,
            );
            rules.add(processed);
        } else rules.add(match[1]);
    }
    return { content, rules: [...rules] };
}

export async function extractContentAndRulesFromFile(
    file: string,
): Promise<{ content: string; rules: string[] }> {
    try {
        const content = await fs.readFile(file, 'utf-8');
        return extractRulesFromString(content);
    } catch (error) {
        // TODO log error
        // @ts-ignore
        return {};
    }
}
