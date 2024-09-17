<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/WonderlandEngine/api/blob/master/img/wle-logo-horizontal-reversed-dark.png?raw=true">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/WonderlandEngine/api/blob/master/img/wle-logo-horizontal-reversed-light.png?raw=true">
  <source srcset="https://github.com/WonderlandEngine/api/blob/master/img/wle-logo-horizontal-reversed-light.png?raw=true">
  <img alt="Wonderland Engine Logo" src="https://github.com/WonderlandEngine/api/blob/master/img/wle-logo-horizontal-reversed-light.png?raw=true">
</picture>

# End-to-End Testing

## Test Projects

Some tests use projects as inputs, e.g.,
* `animation.tests.ts`
* `component.tests.ts`
* `mesh.tests.ts`
* `scene.test.ts`
* `scene-gltf.test.ts`

Those projects are required to be built before the tests can run.

First reach the `test` folder:

```sh
cd ./test
```

You can then build all projects using:

```sh
npm run build -- path/to/wonderlandeditor-binary
```

Each projects `deploy/` will be copied into `test/resources/projects`.

## Running

To run all the end-to-end tests from the api root, use:

```sh
npm run test:e2e -- --deploy path/to/wonderland/deploy
```

It's required to pass the Wonderland Editor deploy folder as a CLI argument using
the `--deploy` argument.

If no such flag is passed, the test framework will assume
that the deploy folder is located in `../../deploy`.

`npm run test:e2e` is a shortcut for:

```sh
cd test-2e2
npm run test
```

## Test File

To run the tests in a file, use:

```sh
npm run test:e2e -- [PATH] --deploy path/to/wonderland/deploy
```

Example with the component file:

```sh
npm run test:e2e -- component.test.ts --deploy path/to/wonderland/deploy
```

> Note: Since test:e2e forwards the npm script to the test package,
> paths are relative to the test folder, and not to the api root.

### Watch

It's possible to watch one/multiple test(s) using `--watch`:

```sh
npm run test:e2e -- --deploy path/to/wonderland/deploy --watch
```

### Grep

The runner uses Mocha, which supports filtering tests using [regexp](https://mochajs.org/api/mocha#grep).

You can provide a regexp using `--grep` or `-g`:

```sh
npm run test:e2e -- -g 'MeshComponent'
```

The `grep` flag can be mixed with the positional file argument:

```sh
npm run test:e2e -- component.test.ts -g 'MeshComponent'
```

This command will only run the tests matching the "MeshComponent" string in the `test/component.test.ts` file.

## License

Wonderland Engine API TypeScript and JavaScript code is released under MIT license.
The runtime and editor are licensed under the [Wonderland Engine EULA](https://wonderlandengine.com/eula)
