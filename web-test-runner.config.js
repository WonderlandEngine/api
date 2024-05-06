import {symlinkSync, existsSync, unlinkSync, lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

import {chromeLauncher} from '@web/test-runner';
import {esbuildPlugin} from '@web/dev-server-esbuild';

let args = null;
let positionals = null;
try {
    ({values: args, positionals: positionals} = parseArgs({
        options: {
            grep: {type: 'string', short: 'g'},
            watch: {type: 'boolean', short: 'w'},
            deploy: {type: 'string', short: 'd'},
            'no-headless': {type: 'boolean', default: false},
        },
        allowPositionals: true,
    }));
} catch (e) {
    console.error('Failed to parse command line arguments, reason:', e);
    process.exit(1);
}
args.deploy = args.deploy ?? process.env['DEPLOY_FOLDER'] ?? '../../deploy/';

/* We need to relink every run in case the env var changed,
 * so first remove old link (or old deploy copy) */
if (existsSync('deploy') && lstatSync('deploy').isSymbolicLink()) {
    unlinkSync('deploy');
}

const deployRoot = resolve(args.deploy);
if (!lstatSync(deployRoot, {throwIfNoEntry: false})?.isDirectory()) {
    console.error(`deploy folder '${deployRoot}' isn't a directory`);
    process.exit(1);
}

console.log(`Creating symlink 'deploy' to '${deployRoot}'`);
symlinkSync(deployRoot, 'deploy', 'junction');

/* When running in docker on Ubuntu, headless set to `true` always forces the
 * browser to use the SwiftShader backend which we don't want.
 *
 * The 'new' mode also create animation loop issues, we do not use it. */
const headless = !args['no-headless'];

const Config = {
    nodeResolve: true,
    files: positionals.length > 0 ? positionals : ['test/**/*.test.ts'],
    watch: args.watch,

    browsers: [
        chromeLauncher({
            launchOptions: {
                headless,
                devtools: false,
                args: ['--no-sandbox', '--use-gl=angle', '--ignore-gpu-blocklist']
            },
            createPage: async ({context}) => {
                /* By default, tests are run in separate pages, in the same browser context.
                 * However, the entire engine relies on RAF, which is throttled in inactive page.
                 *
                 * Running in an unfocused tab can cause the animation loop to be stuck (an so our job system).
                 *
                 * Creating one browser context per test allows to run tests concurrently without
                 * having focusing issues. */
                return (await context.browser().createIncognitoBrowserContext()).newPage();
            },
        }),
    ],

    /* Mocha configuration */
    testFramework: {
        config: {
            ui: 'bdd',
            timeout: '15000',
            allowUncaught: false,
            grep: args.grep
        },
    },

    plugins: [
        esbuildPlugin({
            ts: true,
            tsconfig: fileURLToPath(new URL('./test/tsconfig.json', import.meta.url)),
        })
    ],
};

export default Config;
