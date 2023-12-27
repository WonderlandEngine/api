import {expect} from '@esm-bundle/chai';

import {init, reset, WL} from './setup.js';
import {Object3D, TextComponent} from '..';

before(init);
beforeEach(reset);

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
        await WL.scene.load('test/resources/projects/LanguageSwitching.bin');

        expect(WL.scene.children).to.have.a.lengthOf(2);

        const textObject = WL.scene.children[1];
        expect(textObject).to.not.be.null;
        const text = textObject.getComponent(TextComponent)!;
        expect(text).to.not.be.null;

        expect(WL.i18n.language).to.equal('en');
        expect(WL.i18n.languageIndex(WL.i18n.language!)).to.equal(0);

        const englishTranslation = WL.i18n.translate('48-text-0');
        expect(englishTranslation).to.equal('Hello Wonderland!');

        expect(text.text).to.equal(englishTranslation);

        /** We have to wait for the language switch to make sure the language bin was loaded */
        const promise = WL.i18n.onLanguageChanged.promise();

        WL.i18n.language = 'nl';
        expect(WL.i18n.language).to.equal('nl');

        const data = await promise;

        expect(data[0]).to.equal(0);
        expect(data[1]).to.equal(1);

        const dutchTranslation = WL.i18n.translate('48-text-0');
        expect(dutchTranslation).to.equal('Hallo Wonderland!');
        expect(text.text).to.equal(dutchTranslation);
    });
});
