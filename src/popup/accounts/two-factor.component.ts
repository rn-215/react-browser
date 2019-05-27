import {
    ChangeDetectorRef,
    Component,
    NgZone,
} from '@angular/core';

import { Router } from '@angular/router';

import { BrowserApi } from '../../browser/browserApi';

import { TwoFactorProviderType } from 'jslib/enums/twoFactorProviderType';

import { ApiService } from 'jslib/abstractions/api.service';
import { AuthService } from 'jslib/abstractions/auth.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { SyncService } from 'jslib/abstractions/sync.service';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

import { TwoFactorComponent as BaseTwoFactorComponent } from 'jslib/angular/components/two-factor.component';

import { PopupUtilsService } from '../services/popup-utils.service';

const BroadcasterSubscriptionId = 'TwoFactorComponent';

@Component({
    selector: 'app-two-factor',
    templateUrl: 'two-factor.component.html',
})
export class TwoFactorComponent extends BaseTwoFactorComponent {
    showNewWindowMessage = false;

    constructor(authService: AuthService, router: Router,
        i18nService: I18nService, apiService: ApiService,
        platformUtilsService: PlatformUtilsService, syncService: SyncService,
        environmentService: EnvironmentService, private ngZone: NgZone,
        private broadcasterService: BroadcasterService, private changeDetectorRef: ChangeDetectorRef,
        private popupUtilsService: PopupUtilsService) {
        super(authService, router, i18nService, apiService, platformUtilsService, window, environmentService);
        super.onSuccessfulLogin = () => {
            return syncService.fullSync(true);
        };
        super.successRoute = '/tabs/vault';
    }

    async ngOnInit() {
        this.broadcasterService.subscribe(BroadcasterSubscriptionId, (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case '2faPageResponse':
                        if (message.type === 'duo') {
                            this.token = message.data.sigValue;
                            this.submitWithTab(message.webExtSender.tab);
                        }
                    default:
                        break;
                }

                this.changeDetectorRef.detectChanges();
            });
        });

        const isSafari = this.platformUtilsService.isSafari();
        this.showNewWindowMessage = isSafari;
        await super.ngOnInit();

        if (this.selectedProviderType == null) {
            return;
        }

        if (!isSafari && this.selectedProviderType === TwoFactorProviderType.Email &&
            this.popupUtilsService.inPopup(window)) {
            const confirmed = await this.platformUtilsService.showDialog(this.i18nService.t('popup2faCloseMessage'),
                null, this.i18nService.t('yes'), this.i18nService.t('no'));
            if (confirmed) {
                this.popupUtilsService.popOut(window);
            }
        }

        const isDuo = this.selectedProviderType === TwoFactorProviderType.Duo ||
            this.selectedProviderType === TwoFactorProviderType.OrganizationDuo;
        if (!isSafari || !isDuo) {
            return;
        }

        const params = this.authService.twoFactorProvidersData.get(this.selectedProviderType);
        const tab = BrowserApi.createNewTab(BrowserApi.getAssetUrl('2fa/index.html'));
        const tabToSend = BrowserApi.makeTabObject(tab);
        window.setTimeout(() => {
            BrowserApi.tabSendMessage(tabToSend, {
                command: '2faPageData',
                data: {
                    type: 'duo',
                    host: params.Host,
                    signature: params.Signature,
                },
            });
        }, 500);
    }

    ngOnDestroy() {
        this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
        super.ngOnDestroy();
    }

    anotherMethod() {
        this.router.navigate(['2fa-options']);
    }

    async submitWithTab(sendSuccessToTab: any) {
        await super.submit();
        if (sendSuccessToTab != null) {
            window.setTimeout(() => {
                BrowserApi.tabSendMessage(sendSuccessToTab, {
                    command: '2faPageData',
                    data: { type: 'success' },
                });
            }, 1000);
        }
    }
}
