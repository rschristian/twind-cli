import type { Stats } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import kleur from 'kleur';
import timeSpan from 'time-span';
import { minify } from 'html-minifier-terser';

import type { TW, Configuration, Mode } from 'twind';
import type { VirtualSheet } from 'twind/sheets';
import { create } from 'twind';
import { virtualSheet } from 'twind/sheets';

import { watch } from './watch';
import { extractContentAndRulesFromFile } from './extract';
import { findConfig, loadConfig as tryLoadConfig } from './config';

export interface RunOptions {
    output: string;
    config?: string;
    watch: boolean;
}

export async function run(input: string, options: RunOptions): Promise<void> {
    const configFile =
        (options.config && path.resolve('.', options.config)) || (await findConfig());

    // Track unknown rules
    const unknownRules = new Set<string>();
    const ignoreUnknownRules = (rule: string) => !unknownRules.has(rule);
    const mode: Mode = {
        unknown() {},
        report(info) {
            if (info.id == 'UNKNOWN_DIRECTIVE') {
                console.warn(kleur.yellow(`Unknown rule: ${info.rule}`));
                unknownRules.add(info.rule);
            }
        },
    };

    const watched = new Map<string, Stats>();
    const candidatesByFile = new Map<string, string[]>();
    let lastCandidates = new Set<string>(['' /* ensure an empty CSS may be generated */]);

    // The initial run is not counted -> -1, initialRun=0, first run=1
    let runCount = -1;

    const loadConfig = async (): Promise<{ sheet: VirtualSheet; tw: TW }> => {
        let config: Configuration & { purge?: string[] | { content?: string[] } } = {};

        if (configFile) {
            const configEndTime = timeSpan();

            config = await tryLoadConfig(configFile);

            console.debug(
                kleur.green(
                    `Loaded configuration from ${kleur.bold(
                        path.relative(process.cwd(), configFile),
                    )} in ${kleur.bold(configEndTime.rounded() + ' ms')}`,
                ),
            );
        }

        unknownRules.clear();
        lastCandidates = new Set<string>(['' /* ensure an empty CSS may be generated */]);

        const sheet = virtualSheet();

        return {
            sheet,
            tw: create({ ...config, sheet, mode, hash: false }).tw,
        };
    };

    let { sheet, tw } = await loadConfig();

    const outputFile = path.resolve('.', options.output);

    for await (const changes of watch(configFile ? [input, configFile] : [input], options.watch)) {
        runCount++;
        console.info(
            kleur.cyan(
                `Processing ${kleur.bold(changes.size)}${options.watch ? ' changed' : ''} file${
                    changes.size == 1 ? '' : 's'
                }`,
            ),
        );

        const endTime = timeSpan();
        const pendingDetections: Promise<unknown>[] = [];
        let hasChanged = false;
        let inputContent = '';
        for (const [file, stats] of changes.entries()) {
            if (file == configFile) {
                if (runCount) {
                    ({ sheet, tw } = await loadConfig());
                    hasChanged = true;
                }
            } else if (stats) {
                const watchedStats = watched.get(file);
                if (
                    !watchedStats ||
                    watchedStats.size !== stats.size ||
                    watchedStats.mtimeMs !== stats.mtimeMs ||
                    watchedStats.ino !== stats.ino
                ) {
                    pendingDetections.push(
                        extractContentAndRulesFromFile(file).then(({ content, rules }) => {
                            watched.set(file, stats);
                            inputContent = content;
                            candidatesByFile.set(file, rules);
                            if (!hasChanged) {
                                for (let index = rules.length; index--; ) {
                                    if (!lastCandidates.has(rules[index])) {
                                        hasChanged = true;
                                        break;
                                    }
                                }
                            }
                        }),
                    );
                }
            } else {
                watched.delete(file);
                candidatesByFile.delete(file);
                hasChanged = true;
            }
        }

        await Promise.all(pendingDetections);

        const nextCandidates = new Set<string>();
        const addCandidate = (candidate: string): void => {
            nextCandidates.add(candidate);
        };
        candidatesByFile.forEach((candidates) => {
            candidates.forEach(addCandidate);
        });

        console.debug(
            kleur.gray(
                `Extracted ${kleur.bold(nextCandidates.size)} candidate${
                    nextCandidates.size == 1 ? '' : 's'
                } from ${watched.size} file${watched.size == 1 ? '' : 's'} in ${kleur.bold(
                    endTime.rounded() + ' ms',
                )}`,
            ),
        );

        if (hasChanged || !equals(lastCandidates, nextCandidates)) {
            const twEndTime = timeSpan();
            sheet.reset();
            tw([...nextCandidates].filter(ignoreUnknownRules).sort().join(' '));
            console.debug(
                kleur.gray(
                    `Generated ${kleur.bold(sheet.target.length)} CSS rule${
                        sheet.target.length == 1 ? '' : 's'
                    } in ${kleur.bold(twEndTime.rounded() + ' ms')}`,
                ),
            );

            lastCandidates = nextCandidates;

            // Write to file
            await fs.mkdir(path.dirname(outputFile), { recursive: true });
            await fs.writeFile(
                outputFile,
                minify(
                    inputContent.replace(
                        '<style id="__twind"></style>',
                        `<style>${sheet.target.join('')}</style>`,
                    ),
                    {
                        minifyJS: true,
                        minifyCSS: true,
                        collapseWhitespace: true,
                    },
                ),
            );
            console.info(
                kleur.green(
                    `Finished ${kleur.bold(
                        path.relative(process.cwd(), outputFile),
                    )} in ${kleur.bold(endTime.rounded() + ' ms')}`,
                ),
            );
        } else {
            console.info(kleur.green().dim(`No new classes detected - skipped generating CSS`));
        }

        if (options.watch) {
            console.info('\n' + kleur.dim('Waiting for file changes...'));
        }
    }

    if (runCount < 0) {
        console.error(kleur.yellow(`No matching files found...`));
    }
}

function equals(a: Set<unknown>, b: Set<unknown>) {
    return a.size === b.size && every(b, (value: unknown) => a.has(value));
}

function every<T>(as: Iterable<T>, predicate: (value: T) => unknown): boolean {
    for (const a of as) {
        if (!predicate(a)) {
            return false;
        }
    }

    return true;
}
