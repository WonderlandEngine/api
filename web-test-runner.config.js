import {symlinkSync, existsSync, unlinkSync, lstatSync, rmdirSync} from 'fs';
import { fileURLToPath } from 'url';
import {resolve} from 'path';

import {chromeLauncher} from '@web/test-runner';
import {esbuildPlugin} from '@web/dev-server-esbuild';

console.log(`[TestRunner]: Reading configuration file`);

const deployRoot = resolve(process.env['DEPLOY_FOLDER'] || '../../deploy/');

/* We need to relink every run in case the env var changed,
 * so first remove old link (or old deploy copy) */
if (existsSync('deploy') && lstatSync('deploy').isSymbolicLink()) {
    unlinkSync('deploy');
}
console.log(`[TestRunner]: Creating symlink 'deploy' to '${deployRoot}'`);
symlinkSync(deployRoot, 'deploy', 'junction');

export default {
    concurrency: 10,
    nodeResolve: true,
    files: ['test/**/*.test.js', 'test/**/*.test.ts'],

    browsers: [
        chromeLauncher({
            launchOptions: {args: ['--no-sandbox', '--use-gl=angle']},
        }),
    ],

    /* Mocha configuration */
    testFramework: {
        config: {
            ui: 'bdd',
            timeout: '15000',
        },
    },

    plugins: [
        esbuildPlugin({
            ts: true,
            tsconfig: fileURLToPath(new URL('./test/tsconfig.json', import.meta.url)),
        })
    ],
};
