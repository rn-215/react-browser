import { I18nService as I18nServiceAbstraction } from 'jslib/abstractions/i18n.service';

// First locale is the default (English)
const SupportedTranslationLocales = [
    'en', 'cs', 'da', 'de', 'es', 'et', 'fi', 'fr', 'hr', 'hu', 'id', 'it', 'ja',
    'nb', 'nl', 'pl', 'pt-BR', 'pt-PT', 'ro', 'ru', 'sk', 'sv', 'tr', 'uk', 'vi',
    'zh-CN', 'zh-TW',
];

export default class I18nService implements I18nServiceAbstraction {
    defaultMessages: any = {};
    localeMessages: any = {};
    locale: string;
    translationLocale: string;
    collator: Intl.Collator;
    inited: boolean;

    constructor(private systemLanguage: string, private localesDirectory: string) { }

    async init(locale?: string) {
        if (this.inited) {
            throw new Error('i18n already initialized.');
        }

        this.inited = true;
        this.locale = this.translationLocale = locale != null ? locale : this.systemLanguage;
        this.collator = new Intl.Collator(this.locale);

        if (SupportedTranslationLocales.indexOf(this.translationLocale) === -1) {
            this.translationLocale = this.translationLocale.slice(0, 2);

            if (SupportedTranslationLocales.indexOf(this.translationLocale) === -1) {
                this.translationLocale = SupportedTranslationLocales[0];
            }
        }

        if (this.localesDirectory != null) {
            await this.loadMessages(this.localesDirectory, this.translationLocale, this.localeMessages);
            if (this.translationLocale !== SupportedTranslationLocales[0]) {
                await this.loadMessages(this.localesDirectory, SupportedTranslationLocales[0], this.defaultMessages);
            }
        }
    }

    t(id: string, p1?: string, p2?: string, p3?: string): string {
        return this.translate(id, p1, p2, p3);
    }

    translate(id: string, p1?: string, p2?: string, p3?: string): string {
        if (this.localesDirectory == null) {
            const placeholders: string[] = [];
            if (p1 != null) {
                placeholders.push(p1);
            }
            if (p2 != null) {
                placeholders.push(p2);
            }
            if (p3 != null) {
                placeholders.push(p3);
            }

            if (placeholders.length) {
                return chrome.i18n.getMessage(id, placeholders);
            } else {
                return chrome.i18n.getMessage(id);
            }
        }

        let result: string;
        if (this.localeMessages.hasOwnProperty(id) && this.localeMessages[id]) {
            result = this.localeMessages[id];
        } else if (this.defaultMessages.hasOwnProperty(id) && this.defaultMessages[id]) {
            result = this.defaultMessages[id];
        } else {
            result = '';
        }

        if (result !== '') {
            if (p1 != null) {
                result = result.split('__$1__').join(p1);
            }
            if (p2 != null) {
                result = result.split('__$2__').join(p2);
            }
            if (p3 != null) {
                result = result.split('__$3__').join(p3);
            }
        }

        return result;
    }

    private async loadMessages(localesDir: string, locale: string, messagesObj: any): Promise<any> {
        const formattedLocale = locale.replace('-', '_');
        const file = await fetch(localesDir + formattedLocale + '/messages.json');
        const locales = await file.json();
        for (const prop in locales) {
            if (!locales.hasOwnProperty(prop)) {
                continue;
            }
            messagesObj[prop] = locales[prop].message;

            if (locales[prop].placeholders) {
                for (const placeProp in locales[prop].placeholders) {
                    if (!locales[prop].placeholders.hasOwnProperty(placeProp) ||
                        !locales[prop].placeholders[placeProp].content) {
                        continue;
                    }

                    const replaceToken = '\\$' + placeProp.toUpperCase() + '\\$';
                    let replaceContent = locales[prop].placeholders[placeProp].content;
                    if (replaceContent === '$1' || replaceContent === '$2' || replaceContent === '$3') {
                        replaceContent = '__' + replaceContent + '__';
                    }
                    messagesObj[prop] = messagesObj[prop].replace(new RegExp(replaceToken, 'g'), replaceContent);
                }
            }
        }
    }

}
