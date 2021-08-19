#!/usr/bin/env node
import { version } from '../package.json';
import sade from 'sade';
import { run } from './run';

sade('twind <input>', true)
    .version(version)
    .option('-o, --output', 'Set output html file path', 'output.html')
    .option(
        '-c, --config',
        'Set config file path  (default {.,src,pages,docs}/twind.config.{[m]js,ts})',
    )
    .option('-w, --watch', 'Watch for changes', true)
    .action(async (input, opts) => {
        try {
            await run(input, opts);
        } catch (error) {
            console.error(error.stack || error.message);
            process.exit(1);
        }
    })
    .parse(process.argv);
