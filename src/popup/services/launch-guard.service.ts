import { BrowserApi } from '../../browser/browserApi';

import { Injectable } from '@angular/core';
import {
    CanActivate,
    Router,
} from '@angular/router';

import { CryptoService } from 'jslib/abstractions/crypto.service';
import { UserService } from 'jslib/abstractions/user.service';

@Injectable()
export class LaunchGuardService implements CanActivate {
    constructor(private cryptoService: CryptoService, private userService: UserService, private router: Router) { }

    async canActivate() {
        const bg = BrowserApi.getBackgroundPage();
        if (bg == null) {
            // tslint:disable-next-line
            console.log('Background page is null.');
            // tslint:disable-next-line
            console.log(bg);
            this.router.navigate(['private-mode']);
            return false;
        }

        const isAuthed = await this.userService.isAuthenticated();
        if (!isAuthed) {
            return true;
        }

        const hasKey = await this.cryptoService.hasKey();
        if (!hasKey) {
            this.router.navigate(['lock']);
        } else {
            this.router.navigate(['tabs/current']);
        }

        return false;
    }
}
