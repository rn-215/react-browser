import { CipherType } from '../../../enums/cipherType.enum';

import { UtilsService } from '../../../services/abstractions/utils.service';
import * as template from './current.component.html';

class CurrentController {
    i18n: any;
    pageDetails: any = [];
    loaded: boolean = false;
    otherCiphers: any = [];
    loginCiphers: any = [];
    url: any;
    domain: any;
    canAutofill: boolean = false;
    searchText: string = null;
    inSidebar: boolean = false;
    disableSearch: boolean = false;

    constructor($scope: any, private cipherService: any, private utilsService: UtilsService, private toastr: any,
        private $window: any, private $state: any, private $timeout: any, private autofillService: any,
        private $analytics: any, private i18nService: any, private $filter: any) {
        this.i18n = i18nService;
        this.inSidebar = utilsService.inSidebar($window);
        this.disableSearch = utilsService.isEdge();

        document.getElementById('search').focus();

        $scope.$on('syncCompleted', (event: any, successfully: boolean) => {
            if (this.loaded) {
                $timeout(this.loadVault.bind(this), 500);
            }
        });

        $scope.$on('collectPageDetailsResponse', (event: any, details: any) => {
            this.pageDetails.push(details);
        });
    }

    $onInit() {
        this.loadVault();
    }

    refresh() {
        this.loadVault();
    }

    addCipher() {
        this.$state.go('addCipher', {
            animation: 'in-slide-up',
            name: this.domain,
            uri: this.url,
            from: 'current',
        });
    }

    viewCipher(cipher: any) {
        this.$state.go('viewCipher', {
            cipherId: cipher.id,
            animation: 'in-slide-up',
            from: 'current',
        });
    }

    fillCipher(cipher: any) {
        if (!this.canAutofill) {
            this.$analytics.eventTrack('Autofilled Error');
            this.toastr.error(this.i18nService.autofillError);
        }

        this.autofillService.doAutoFill({
            cipher,
            pageDetails: this.pageDetails,
            fromBackground: false,
        }).then((totpCode: string) => {
            this.$analytics.eventTrack('Autofilled');
            if (totpCode && this.utilsService.isFirefox()) {
                this.utilsService.copyToClipboard(totpCode, document);
            }
            if (this.utilsService.inPopup(this.$window)) {
                this.$window.close();
            }
        }).catch(() => {
            this.$analytics.eventTrack('Autofilled Error');
            this.toastr.error(this.i18nService.autofillError);
        });
    }

    searchVault() {
        this.$state.go('tabs.vault', {
            searchText: this.searchText,
        });
    }

    private loadVault() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
            if (tabs.length > 0) {
                this.url = tabs[0].url;
            } else {
                this.$timeout(() => {
                    this.loaded = true;
                });
                return;
            }

            this.domain = this.utilsService.getDomain(this.url);

            chrome.tabs.sendMessage(tabs[0].id, {
                command: 'collectPageDetails',
                tab: tabs[0],
                sender: 'currentController',
            }, () => {
                this.canAutofill = true;
            });

            const otherTypes = [
                CipherType.Card,
                CipherType.Identity,
            ];

            this.cipherService.getAllDecryptedForDomain(this.domain, otherTypes).then((ciphers: any[]) => {
                const loginCiphers: any = [];
                const otherCiphers: any = [];

                ciphers.forEach((cipher) => {
                    if (cipher.type === CipherType.Login) {
                        loginCiphers.push(cipher);
                    } else {
                        otherCiphers.push(cipher);
                    }
                });

                this.$timeout(() => {
                    this.loginCiphers = this.$filter('orderBy')(
                        loginCiphers,
                        [this.sortUriMatch, this.sortLastUsed, 'name', 'subTitle'],
                    );
                    this.otherCiphers = this.$filter('orderBy')(otherCiphers, [this.sortLastUsed, 'name', 'subTitle']);
                    this.loaded = true;
                });
            });
        });
    }

    private sortUriMatch(cipher: any) {
        // exact matches should sort earlier.
        return this.url && this.url.startsWith(cipher.uri) ? 0 : 1;
    }

    private sortLastUsed(cipher: any) {
        return cipher.localData && cipher.localData.lastUsedDate ? -1 * cipher.localData.lastUsedDate : 0;
    }
}

export const CurrentComponent = {
    bindings: {},
    controller: CurrentController,
    template,
};
