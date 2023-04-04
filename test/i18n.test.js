import { expect } from '@esm-bundle/chai';

import { init } from './setup.js';

before(init);

describe('I18N', function() {

    it('defaults', async function() {
        const langCount = WL.i18n.languageCount();
        expect(langCount).to.equal(0);

        const langIndex = WL.i18n.languageIndex("non-existing-code");
        expect(langIndex).to.equal(-1);

        const translation = WL.i18n.translate("non-existing-term");
        expect(translation).to.equal(null);

        const lang = WL.i18n.language;
        expect(lang).to.equal(null);

        const langCode = WL.i18n.languageCode(0);
        expect(langCode).to.equal(null);

        const langName = WL.i18n.languageName(0);
        expect(langName).to.equal(null);
    });

});
