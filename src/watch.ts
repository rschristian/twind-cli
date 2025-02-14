import type { Stats } from 'fs';
import path from 'path';

import chokidar from 'chokidar';
import pEvent from 'p-event';
import pDebounce from 'p-debounce';

export type WatchResult = Map<string, Stats | undefined>;

export function watch(globs: string[], watch: boolean): AsyncIterableIterator<WatchResult> {
    const cwd = process.cwd();

    const watcher = chokidar.watch(globs, {
        cwd,
        persistent: !!watch,
        ignoreInitial: false,
        alwaysStat: true,
        followSymlinks: true,
        awaitWriteFinish: {
            stabilityThreshold: 120,
            pollInterval: 20,
        },
    });

    let changed: WatchResult = new Map();
    let isDone = false;

    const nextQueue: {
        resolve: (x: IteratorResult<WatchResult>) => void;
        reject: (error: any) => void;
    }[] = [];

    let onReady: Promise<unknown> | null = pEvent(watcher, 'ready').then(async () => {
        if (!watch) {
            isDone = true;
            return watcher.close();
        }
    });

    const notify = pDebounce(() => {
        if (isDone || changed.size) {
            const next = nextQueue.shift();

            if (next) {
                next.resolve(
                    isDone && !changed.size
                        ? { done: true, value: undefined }
                        : { done: false, value: changed },
                );
                changed = new Map();
            }
        }
    }, 50);

    let pendingError: any;

    watcher
        .on('error', (error) => {
            const next = nextQueue.shift();
            if (next) {
                next.reject(error);
            } else {
                pendingError = error;
            }
        })
        .on('add', (file, stats) => {
            changed.set(path.resolve(cwd, file), stats);
            notify();
        })
        .on('change', (file, stats) => {
            changed.set(path.resolve(cwd, file), stats);
            notify();
        })
        .on('unlink', (file) => {
            changed.set(path.resolve(cwd, file), undefined);
            notify();
        });

    return {
        [Symbol.asyncIterator]() {
            return this;
        },
        async next() {
            if (pendingError) {
                throw pendingError;
            }

            if (onReady) {
                await onReady;
                onReady = null;
            }

            return new Promise((resolve, reject) => {
                nextQueue.push({ resolve, reject });
                notify();
            });
        },
        async return(value) {
            isDone = true;
            await watcher.close();
            return { done: true, value };
        },
        async throw(error) {
            isDone = true;
            await watcher.close();
            throw error;
        },
    };
}
