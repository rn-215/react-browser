import {
    Component,
    OnInit,
} from '@angular/core';
import { Router } from '@angular/router';

import { Angulartics2 } from 'angulartics2';

import { CryptoService } from 'jslib/abstractions/crypto.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { UserService } from 'jslib/abstractions/user.service';

import { LockComponent as BaseLockComponent } from 'jslib/angular/components/lock.component';

@Component({
    selector: 'app-lock',
    templateUrl: 'lock.component.html',
})
export class LockComponent extends BaseLockComponent implements OnInit {
    constructor(router: Router, analytics: Angulartics2,
        i18nService: I18nService,
        platformUtilsService: PlatformUtilsService, messagingService: MessagingService,
        userService: UserService, cryptoService: CryptoService) {
        super(router, analytics, i18nService, platformUtilsService, messagingService, userService, cryptoService);
        this.successRoute = '/tabs/current';
    }

    ngOnInit() {
        window.setTimeout(() => {
            document.getElementById('masterPassword').focus();
        }, 100);
    }
}
