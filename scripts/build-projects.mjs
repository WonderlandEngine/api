#!/usr/bin/env node

/* This script is used to build the Wonderland Engine test projects
 * located in test/projects/ */

import {spawn} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import {basename, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

if (!process.argv[2]) {
    console.error('WonderlandEditor executable not provided');
    console.error('Usage: npm run test:build -- path/to/wonderlandengine');
    process.exit(1);
}

const scriptPath = dirname(fileURLToPath(import.meta.url));
const paths = {
    editor: resolve(process.argv[2]),
    test: resolve(scriptPath, '..', 'test'),
    projects: resolve(scriptPath, '..', 'test', 'projects'),
    output: resolve(scriptPath, '..', 'test', 'resources', 'projects'),
};

let commands = [];
try {
    /* Read each project's directory. This doesn't recursively search for projects
     * on purpose, but instead search only the first layer of directories. */
    const wlps = await readdir(paths.projects, {withFileTypes: true}).then((dirs) => {
        const promises = dirs
            .filter((dir) => dir.isDirectory())
            .map((dir) => {
                const path = resolve(dir.path, dir.name);
                return readdir(path).then((files) =>
                    files.filter((f) => f.endsWith('.wlp')).map((f) => resolve(path, f))
                );
            });
        return Promise.all(promises).then((data) => data.flat());
    });
    commands = wlps.map((path) => ({path, filename: basename(path), logs: []}));
} catch (e) {
    console.error('Failed to search for .wlp files in test/projects/, reason:', e);
    process.exit(1);
}

const promises = [];
for (const command of commands) {
    promises.push(
        new Promise((res, rej) => {
            const cmd = spawn(paths.editor, [
                '--project',
                command.path,
                '--windowless',
                '--package',
                '--preferences',
                `${paths.projects}/preferences.json`,
                '--output',
                paths.output,
            ]);
            cmd.stderr.on('data', (data) => {
                command.logs.push(data);
            });
            cmd.stdout.on('data', (data) => {
                command.logs.push(data);
            });
            cmd.on('error', rej);
            cmd.on('close', res);
            cmd.on('exit', res);
        }).then(() => {
            console.log(`================ ${command.filename} ================`);
            console.log(command.logs.join(''));
            command.logs.length = 0;
        })
    );
}

let failed = false;
const results = await Promise.allSettled(promises);
for (let i = 0; i < results.length; ++i) {
    const result = results[i];
    if (result.status !== 'fulfilled') {
        console.error('Failed to run editor command, reason: ', result.reason.message);
        failed = true;
        continue;
    }
    if (!result.value) continue;

    const cmd = commands[i];
    console.error(`Project '${cmd.filename}' failed with exit code '${result.value}'`);
    failed = true;
}

process.exit(failed ? 1 : 0);
