<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/WonderlandEngine/api/blob/master/img/wle-logo-horizontal-reversed-dark.png?raw=true">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/WonderlandEngine/api/blob/master/img/wle-logo-horizontal-reversed-light.png?raw=true">
  <source srcset="https://github.com/WonderlandEngine/api/blob/master/img/wle-logo-horizontal-reversed-light.png?raw=true">
  <img alt="Wonderland Engine Logo">
</picture>

# Wonderland Engine API

The bindings between Wonderland Engine's WebAssembly runtime and custom JavaScript
or TypeScript components.

Learn more about Wonderland Engine at [https://wonderlandengine.com](https://wonderlandengine.com).

## Usage

Wonderland Engine projects usually come with this package pre-installed.
Install via `npm` or `yarn`:

```sh
npm i --save @wonderlandengine/api
# or:
yarn add @wonderlandengine/api
```

To update the API to the latest version use
```
npm i --save @wonderlandengine/api@latest
```

### Writing a Custom Component

**JavaScript**

```js
import {Component, Property} from '@wonderlandengine/api';

class Forward extends Component {
    static TypeName = 'forward';
    static Properties = {
        speed: Property.float(1.5)
    };

    _forward = new Float32Array(3);

    update(dt) {
        this.object.getForward(this._forward);
        this._forward[0] *= this.speed;
        this._forward[1] *= this.speed;
        this._forward[2] *= this.speed;
        this.object.translate(this._forward);
    }
}
```

**TypeScript**

```ts
import {Component} from '@wonderlandengine/api';
import {Component} from '@wonderlandengine/api/decorators.js';

class Forward extends Component {
    static TypeName = 'forward';

    @property.float(1.5)
    speed!: number;

    _forward = new Float32Array(3);

    update(dt) {
        this.object.getForward(this._forward);
        this._forward[0] *= this.speed;
        this._forward[1] *= this.speed;
        this._forward[2] *= this.speed;
        this.object.translate(this._forward);
    }
}
```

For more information, please refer to the [JavaScript Quick Start Guide](https://wonderlandengine.com/getting-started/quick-start-js).

### For Library Maintainers

To ensure the user of your library can use a range of API versions with your library,
use `"peerDepenedencies"` in your `package.json`:

```json
"peerDependencies": {
    "@wonderlandengine/api": ">= 1.0.0 < 2"
},
```

Which signals that your package works with any API version `>= 1.0.0` (choose whichever
version has all the features you need) until `2.0.0`.

Also see the [Writing JavaScript Libraries Tutorial](https://wonderlandengine.com/tutorials/writing-js-library/).

## Contributing

### Installation

Make sure to install dependencies first:
```sh
npm i
```

### Build

To build the TypeScript, use one of:
```sh
npm run build
npm run build:watch
```

### Test

To run the tests, use one of:
```sh
npm run test
npm run test:watch
```

## API <> Runtime Versioning

The Wonderland Engine Runtime is compatible on all patch versions of the API, but the
major and minor versions are required to match. Example: you will be able to use
Wonderland Editor 1.0.4 with API version 1.0.0 or 1.0.9 for example, but probably not
with API 1.1.0.

## License

Wonderland Engine API TypeScript and JavaScript code is released under MIT license.
The runtime and editor are licensed under the [Wonderland Engine EULA](https://wonderlandengine.com/eula)
