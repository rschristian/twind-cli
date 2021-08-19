import path from 'path';

import type { Configuration } from 'twind';
import locatePath from 'locate-path';
import kleur from 'kleur';

const TWIND_CONFIG_FILES = ['twind.config.ts', 'twind.config.mjs', 'twind.config.js'];

export async function findConfig(): Promise<string | undefined> {
    return locatePath(
        [
            ...TWIND_CONFIG_FILES,
            ...TWIND_CONFIG_FILES.map((file) => path.join('src', file)),
            ...TWIND_CONFIG_FILES.map((file) => path.join('pages', file)),
            ...TWIND_CONFIG_FILES.map((file) => path.join('docs', file)),
        ].map((file) => path.resolve(process.cwd(), file)),
    );
}

async function loadFile<T>(file: string): Promise<T> {
    const cwd = process.cwd();
    const moduleId = path.resolve(cwd, file);

    try {
        return (await import(moduleId)) as T;
    } catch (error) {
        console.error(
            kleur.red(
                `Failed to to load ${kleur.bold(path.relative(cwd, moduleId))}: ${error.message}`,
            ),
        );

        return {} as T;
    }
}

type TConfiguration = Configuration & { purge?: string[] | { content?: string[] } };

export async function loadConfig(configFile: string): Promise<TConfiguration> {
    return (await loadFile<{ default: Configuration } & Configuration>(configFile)).default;
}
