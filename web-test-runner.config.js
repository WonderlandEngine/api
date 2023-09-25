import {symlinkSync, existsSync, unlinkSync, lstatSync} from 'fs';
import {fileURLToPath} from 'url';
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

/* When running in docker on Ubuntu, headless set to `true` always forces the
 * browser to use the SwiftShader backend which we don't want.
 *
 * The 'new' mode also create animation loop issues, we do not use it. */
const headless = process.argv.indexOf('--no-headless') === -1;

/* Using a concurrency > 1 with `headless: false` will create focusing issues.
 * Some tests would be running in an unfocused tab, causing the
 * animation loop to be stuck (an so our job system). */
const concurrency = !headless ? 1 : null;

const Config = {
    nodeResolve: true,
    files: ['test/**/*.test.ts'],

    browsers: [
        chromeLauncher({
            launchOptions: {
                headless,
                devtools: false,
                args: ['--no-sandbox', '--use-gl=angle', '--ignore-gpu-blocklist']
            },
        }),
    ],

    /* Mocha configuration */
    testFramework: {
        config: {
            ui: 'bdd',
            timeout: '15000',
            allowUncaught: false,
        },
    },

    plugins: [
        esbuildPlugin({
            ts: true,
            tsconfig: fileURLToPath(new URL('./test/tsconfig.json', import.meta.url)),
        })
    ],
};

/* The test runner defaults to hardware threads divided by two.
 * We can't simply assign a random value. */
if (concurrency !== null) Config.concurrency = concurrency;

export default Config;
