import {expect} from '@esm-bundle/chai';

import {init, projectURL, reset, WL} from './setup.js';
import {InMemoryLoadOptions, TextComponent} from '..';
import {fetchWithProgress} from '../src/utils/fetch.js';
import {TestComponentTranslate} from './projects/language-switching/js/test-component-translate.js';

before(init);
beforeEach(reset);

/* Use in-memory .bin as much as possible to speed up the tests. */
const bin: InMemoryLoadOptions = {buffer: null!, baseURL: projectURL('')};
try {
    bin.buffer = await fetchWithProgress(projectURL('LanguageSwitching.bin'));
} catch (e) {
    console.error('Failed to load required test scenes');
    throw e;
}

describe('I18N', function () {
    it('defaults', function () {
        const i18n = WL.i18n;

        const langCount = i18n.languageCount();
        expect(langCount).to.equal(0);

        const langIndex = i18n.languageIndex('non-existing-code');
        expect(langIndex).to.equal(-1);

        const translation = i18n.translate('non-existing-term');
        expect(translation).to.equal(null);

        const lang = i18n.language;
        expect(lang).to.equal(null);

        const langCode = i18n.languageCode(0);
        expect(langCode).to.equal(null);

        const langName = i18n.languageName(0);
        expect(langName).to.equal(null);

        expect(i18n.language).to.be.null;
    });

    it('language', async function () {
        WL.registerComponent(TestComponentTranslate);

        await WL.scene.load(bin);

        expect(WL.i18n.languageCount()).to.equal(2);
        expect(WL.i18n.language).to.equal('en');
        expect(WL.i18n.languageIndex(WL.i18n.language!)).to.equal(0);

        expect(WL.scene.children).to.have.a.lengthOf(5);

        const textObjects = WL.scene.findByNameDirect('Text');
        expect(textObjects).to.have.a.lengthOf(1);
        const text = textObjects[0].getComponent(TextComponent)!;
        expect(text).to.not.be.null;

        const jsObjects = WL.scene.findByNameDirect('JS');
        expect(jsObjects).to.have.a.lengthOf(1);
        const js = jsObjects[0].getComponent(TestComponentTranslate)!;
        expect(js).to.not.be.null;

        const mixedObjects = WL.scene.findByNameDirect('Mixed');
        expect(mixedObjects).to.have.a.lengthOf(1);
        const mixedText = mixedObjects[0].getComponent(TextComponent)!;
        expect(mixedText).to.not.be.null;
        const mixedJs = mixedObjects[0].getComponents(TestComponentTranslate)!;
        expect(mixedJs).to.have.a.lengthOf(2);

        const textUnchangedObjects = WL.scene.findByNameDirect('Text unchanged');
        expect(textUnchangedObjects).to.have.a.lengthOf(1);
        const textUnchanged = textUnchangedObjects[0].getComponent(TextComponent)!;
        expect(textUnchanged).to.not.be.null;

        /* Translation should be applied to inactive components */
        mixedText.active = false;
        /* Translation should not be applied to destroyed components */
        mixedJs[0].destroy();

        expect(WL.i18n.translate('48-text-0')).to.equal('Hello Wonderland!');
        expect(WL.i18n.translate('49-js-0-stringProp')).to.equal('Yahallo Wonderland!');
        expect(WL.i18n.translate('50-js-2-stringProp')).to.equal('First Wonderland!');
        expect(WL.i18n.translate('50-js-4-stringProp')).to.equal('Second Wonderland!');
        expect(WL.i18n.translate('50-text-1')).to.equal('Hi Wonderland?');
        expect(WL.i18n.translate('51-text-0')).to.equal('No translation');
        expect(WL.i18n.translate('projectName')).to.equal('LanguageSwitching');

        expect(text.text).to.equal('Hello Wonderland!');
        expect(js.stringProp).to.equal('Yahallo Wonderland!');
        expect(mixedText.text).to.equal('Hi Wonderland?');
        expect(mixedJs[1].stringProp).to.equal(
            mixedJs[1].floatProp > 0.0 ? 'Second Wonderland!' : 'First Wonderland!'
        );
        expect(textUnchanged.text).to.equal('No translation');

        /* We have to wait for the language switch to make sure the language bin was loaded */
        const promise = WL.i18n.onLanguageChanged.promise();

        WL.i18n.language = 'nl';
        expect(WL.i18n.language).to.equal('nl');
        expect(WL.i18n.languageIndex(WL.i18n.language!)).to.equal(1);

        const [oldLanguage, newLanguage] = await promise;

        expect(oldLanguage).to.equal(0);
        expect(newLanguage).to.equal(1);

        expect(WL.i18n.translate('48-text-0')).to.equal('Hallo Wonderland!');
        expect(WL.i18n.translate('49-js-0-stringProp')).to.equal('Yuhullo Wonderland!');
        expect(WL.i18n.translate('50-js-2-stringProp')).to.equal('Erst Wonderland!');
        expect(WL.i18n.translate('50-js-4-stringProp')).to.equal('Zweijt Wonderland!');
        expect(WL.i18n.translate('50-text-1')).to.equal('Hej Wynderland?');
        /* null in nl.json, no translation applied */
        expect(WL.i18n.translate('51-text-0')).to.equal('No translation');
        expect(WL.i18n.translate('projectName')).to.equal('LanguageSwitching but Dutch!');

        expect(text.text).to.equal('Hallo Wonderland!');
        expect(js.stringProp).to.equal('Yuhullo Wonderland!');
        expect(mixedText.text).to.equal('Hej Wynderland?');
        expect(mixedJs[1].stringProp).to.equal(
            mixedJs[1].floatProp > 0.0 ? 'Zweijt Wonderland!' : 'Erst Wonderland!'
        );
        expect(textUnchanged.text).to.equal('No translation');
    });

    it('language, unregistered component', async function () {
        await WL.scene.load(bin);

        expect(WL.i18n.language).to.equal('en');
        expect(WL.isRegistered(TestComponentTranslate)).to.be.false;

        const textObjects = WL.scene.findByNameDirect('Text');
        expect(textObjects).to.have.a.lengthOf(1);
        const text = textObjects[0].getComponent(TextComponent)!;
        expect(text).to.not.be.null;

        const jsObjects = WL.scene.findByNameDirect('JS');
        expect(jsObjects).to.have.a.lengthOf(1);
        const js = jsObjects[0].getComponent(TestComponentTranslate);
        expect(js).to.be.null;

        const promise = WL.i18n.onLanguageChanged.promise();

        WL.i18n.language = 'nl';

        const [oldLanguage, newLanguage] = await promise;

        expect(oldLanguage).to.equal(0);
        expect(newLanguage).to.equal(1);

        /* Translation using the term always works */
        expect(WL.i18n.translate('48-text-0')).to.equal('Hallo Wonderland!');
        expect(WL.i18n.translate('49-js-0-stringProp')).to.equal('Yuhullo Wonderland!');
        expect(WL.i18n.translate('projectName')).to.equal('LanguageSwitching but Dutch!');

        expect(text.text).to.equal('Hallo Wonderland!');
    });
});
