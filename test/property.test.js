import {expect, use} from '@esm-bundle/chai';
import {chaiAlmost} from './chai/almost.js';

import {init, reset} from './setup.js';
import {Component, Type, Property} from '../dist';
import {property} from '../dist/decorators.js';

use(chaiAlmost());

before(init);
beforeEach(reset);

function decorateProperty(decorator, target, key) {
    const proto = target.prototype;
    decorator(proto, key);
};

describe('Properties', function() {

    describe('Component Instantiation', function() {

        const testProperties = {
            propBool: {name: 'Bool', default: true},
            propInt: {name: 'Int', default: 12},
            propFloat: {name: 'Float', default: 3.75},
            propString: {name: 'String', default: 'hello'},
            propEnum: {name: 'Enum', default: 'snake', values: ['serpent', 'snake']},
            propObject: {name: 'Object', default: null},
            propMesh: {name: 'Mesh', default: null},
            propTexture: {name: 'Texture', default: null},
            propMaterial: {name: 'Material', default: null},
            propAnimation: {name: 'Animation', default: null},
            propSkin: {name: 'Skin', default: null},
            propColor: {name: 'Color', default: [1, 0, 0.5, 0.75]},
        };

        it('with defaults', function() {
            class LiteralWithDefaults extends Component {
                static TypeName = 'literal-no-defaults';
                static Properties = {};
            }
            class FunctorWithDefaults extends Component {
                static TypeName = 'functor-with-defaults';
                static Properties = {};
            }
            class DecoratorWithDefaults extends Component {
                static TypeName = 'decorator-with-defaults';
                static Properties = {};
            }
            for(const name in testProperties) {
                const definition = testProperties[name];
                LiteralWithDefaults.Properties[name] = {
                    type: Type[definition.name],
                    default: definition.default,
                    values: definition.values
                };
                const type = definition.name.toLowerCase();
                const functor = Property[type];
                expect(functor).to.be.instanceOf(Function);

                const decorator = property[type];
                expect(decorator).to.be.instanceOf(Function);

                const defaults = Array.isArray(definition.default) ? definition.default : [definition.default];
                const args = definition.values ? [definition.values, ...defaults] : [...defaults];
                FunctorWithDefaults.Properties[name] = functor(...args);
                decorateProperty(decorator(...args), DecoratorWithDefaults, name);
            }

            const classes = [LiteralWithDefaults, FunctorWithDefaults, DecoratorWithDefaults]
            for(const compClass of classes) {
                /* Registering twice should not overwrite already set-up defaults. */
                WL.registerComponent(compClass.TypeName, compClass.Properties, {});
                WL.registerComponent(compClass);
            }

            const obj = WL.scene.addObject();
            for(const compClass of classes) {
                const instances = [obj.addComponent(compClass.TypeName), obj.addComponent(compClass)];
                for(const instance of instances) {
                    const message = instance.constructor.name;
                    expect(instance.propBool).to.equal(true, message);
                    expect(instance.propInt).to.equal(12, message);
                    expect(instance.propFloat).to.equal(3.75, message);
                    expect(instance.propString).to.equal('hello', message);
                    expect(instance.propEnum).to.equal(1, message);
                    expect(instance.propObject).to.equal(null, message);
                    expect(instance.propMesh).to.equal(null, message);
                    expect(instance.propTexture).to.equal(null, message);
                    expect(instance.propMaterial).to.equal(null, message);
                    expect(instance.propAnimation).to.equal(null, message);
                    expect(instance.propSkin).to.equal(null, message);
                    expect(instance.propColor).to.deep.equal([1, 0, 0.5, 0.75], message);
                }
            }
        });

        it('without defaults', function() {
            class LiteralNoDefaults extends Component {
                static TypeName = 'literal-with-defaults';
                static Properties = {};
            }
            class FunctorNoDefaults extends Component {
                static TypeName = 'functor-no-defaults';
                static Properties = {};
            }
            class DecoratorNoDefaults extends Component {
                static TypeName = 'decorator-no-defaults';
                static Properties = {};
            }
            for(const name in testProperties) {
                const definition = testProperties[name];
                LiteralNoDefaults.Properties[name] = {
                    type: Type[definition.name],
                    values: definition.values
                };
                const type = definition.name.toLowerCase();

                const functor = Property[type];
                expect(functor).to.be.instanceOf(Function);
                const decorator = property[type];
                expect(decorator).to.be.instanceOf(Function);

                const args = definition.values ? [definition.values] : [];
                FunctorNoDefaults.Properties[name] = functor(...args);
                decorateProperty(decorator(...args), DecoratorNoDefaults, name);
            }

            const classes = [LiteralNoDefaults, FunctorNoDefaults, DecoratorNoDefaults]
            for(const compClass of classes) {
                /* Registering twice should not overwrite already set-up defaults. */
                WL.registerComponent(compClass.TypeName, compClass.Properties, {});
                WL.registerComponent(compClass);
            }

            const obj = WL.scene.addObject();
            for(const compClass of classes) {
                const instances = [obj.addComponent(compClass.TypeName), obj.addComponent(compClass)];
                for(const instance of instances) {
                    expect(instance.propBool).to.equal(false);
                    expect(instance.propInt).to.equal(0);
                    expect(instance.propFloat).to.equal(0.0);
                    expect(instance.propString).to.equal('');
                    expect(instance.propEnum).to.equal(0);
                    expect(instance.propEnumNoValues).to.equal(undefined);
                    expect(instance.propEnumEmptyValues).to.equal(undefined);
                    expect(instance.propObject).to.equal(null);
                    expect(instance.propMesh).to.equal(null);
                    expect(instance.propTexture).to.equal(null);
                    expect(instance.propMaterial).to.equal(null);
                    expect(instance.propAnimation).to.equal(null);
                    expect(instance.propSkin).to.equal(null);
                    expect(instance.propColor).to.deep.equal([0, 0, 0, 1]);
                }
            }
        });

    });

});
