import {
    ChangeDetectorRef,
    Component,
    NgZone,
} from '@angular/core';

import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { TwoFactorProviderType } from 'jslib-common/enums/twoFactorProviderType';

import { ApiService } from 'jslib-common/abstractions/api.service';
import { AuthService } from 'jslib-common/abstractions/auth.service';
import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';
import { SyncService } from 'jslib-common/abstractions/sync.service';
import { UserService } from 'jslib-common/abstractions/user.service';

import { BroadcasterService } from 'jslib-angular/services/broadcaster.service';

import { TwoFactorComponent as BaseTwoFactorComponent } from 'jslib-angular/components/two-factor.component';

import { PopupUtilsService } from '../services/popup-utils.service';

import { BrowserApi } from '../../browser/browserApi';

const BroadcasterSubscriptionId = 'TwoFactorComponent';

@Component({
    selector: 'app-two-factor',
    templateUrl: 'two-factor.component.html',
})
export class TwoFactorComponent extends BaseTwoFactorComponent {
    showNewWindowMessage = false;

    constructor(authService: AuthService, router: Router,
        i18nService: I18nService, apiService: ApiService,
        platformUtilsService: PlatformUtilsService, private syncService: SyncService,
        environmentService: EnvironmentService, private ngZone: NgZone,
        private broadcasterService: BroadcasterService, private changeDetectorRef: ChangeDetectorRef,
        private popupUtilsService: PopupUtilsService, stateService: StateService,
        storageService: StorageService, route: ActivatedRoute, private messagingService: MessagingService,
        private userService: UserService) {
        super(authService, router, i18nService, apiService, platformUtilsService, window, environmentService,
            stateService, storageService, route);
        super.onSuccessfulLogin = async () => {
            return syncService.fullSync(true).then(async () => {
                if (await this.userService.getForcePasswordReset()) {
                    this.router.navigate(['update-temp-password']);
                }
            });
        };
        super.successRoute = '/tabs/vault';
        this.webAuthnNewTab = this.platformUtilsService.isFirefox() || this.platformUtilsService.isSafari();
    }

    async ngOnInit() {
        if (this.route.snapshot.paramMap.has('webAuthnResponse')) {
            // WebAuthn fallback response
            this.selectedProviderType = TwoFactorProviderType.WebAuthn;
            this.token = this.route.snapshot.paramMap.get('webAuthnResponse');
            super.onSuccessfulLogin = async () => {
                this.syncService.fullSync(true);
                this.messagingService.send('reloadPopup');
                window.close();
            };
            this.remember = this.route.snapshot.paramMap.get('remember') === 'true';
            await this.doSubmit();
            return;
        }

        await super.ngOnInit();
        if (this.selectedProviderType == null) {
            return;
        }

        // WebAuthn prompt appears inside the popup on linux, and requires a larger popup width
        // than usual to avoid cutting off the dialog.
        if (this.selectedProviderType === TwoFactorProviderType.WebAuthn && await this.isLinux()) {
            document.body.classList.add('linux-webauthn');
        }

        if (this.selectedProviderType === TwoFactorProviderType.Email &&
            this.popupUtilsService.inPopup(window)) {
            const confirmed = await this.platformUtilsService.showDialog(this.i18nService.t('popup2faCloseMessage'),
                null, this.i18nService.t('yes'), this.i18nService.t('no'));
            if (confirmed) {
                this.popupUtilsService.popOut(window);
            }
        }

        const queryParamsSub = this.route.queryParams.subscribe(async qParams => {
            if (qParams.sso === 'true') {
                super.onSuccessfulLogin = () => {
                    BrowserApi.reloadOpenWindows();
                    const thisWindow = window.open('', '_self');
                    thisWindow.close();
                    return this.syncService.fullSync(true);
                };
                if (queryParamsSub != null) {
                    queryParamsSub.unsubscribe();
                }
            }
        });
    }

    async ngOnDestroy() {
        this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);

        if (this.selectedProviderType === TwoFactorProviderType.WebAuthn && await this.isLinux()) {
            document.body.classList.remove('linux-webauthn');
        }
        super.ngOnDestroy();
    }

    anotherMethod() {
        this.router.navigate(['2fa-options']);
    }

    async isLinux() {
        return (await BrowserApi.getPlatformInfo()).os === 'linux';
    }
}
