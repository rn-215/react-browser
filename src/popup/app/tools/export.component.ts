import * as angular from 'angular';
import * as papa from 'papaparse';
import * as template from './export.component.html';

import { BrowserApi } from '../../../browser/browserApi';

import { CipherType } from 'jslib/enums/cipherType';

import { CipherService } from 'jslib/abstractions/cipher.service';
import { CryptoService } from 'jslib/abstractions/crypto.service';
import { FolderService } from 'jslib/abstractions/folder.service';
import { UserService } from 'jslib/abstractions/user.service';
import { UtilsService } from 'jslib/abstractions/utils.service';

export class ExportController {
    i18n: any;
    masterPassword: string;

    constructor(private $state: any, private cryptoService: CryptoService,
        private toastr: any, private utilsService: UtilsService, private $analytics: any,
        private i18nService: any, private folderService: FolderService, private cipherService: CipherService,
        private $window: ng.IWindowService, private userService: UserService) {
        this.i18n = i18nService;
    }

    $onInit() {
        document.getElementById('master-password').focus();
    }

    async submit() {
        if (this.masterPassword == null || this.masterPassword === '') {
            this.toastr.error(this.i18nService.invalidMasterPassword, this.i18nService.errorsOccurred);
            return;
        }

        const email = await this.userService.getEmail();
        const key = this.cryptoService.makeKey(this.masterPassword, email);
        const keyHash = await this.cryptoService.hashPassword(this.masterPassword, key);
        const storedKeyHash = await this.cryptoService.getKeyHash();

        if (storedKeyHash != null && keyHash != null && storedKeyHash === keyHash) {
            const csv = await this.getCsv();
            this.$analytics.eventTrack('Exported Data');
            this.downloadFile(csv);
        } else {
            this.toastr.error(this.i18n.invalidMasterPassword, this.i18n.errorsOccurred);
        }
    }

    private async checkPassword() {
        const email = await this.userService.getEmail();
        const key = this.cryptoService.makeKey(this.masterPassword, email);
        const keyHash = await this.cryptoService.hashPassword(this.masterPassword, key);
        const storedKeyHash = await this.cryptoService.getKeyHash();
        if (storedKeyHash == null || keyHash == null || storedKeyHash !== keyHash) {
            throw new Error('Invalid password.');
        }
    }

    private async getCsv(): Promise<string> {
        let decFolders: any[] = [];
        let decCiphers: any[] = [];
        const promises = [];

        promises.push(this.folderService.getAllDecrypted().then((folders: any[]) => {
            decFolders = folders;
        }));

        promises.push(this.cipherService.getAllDecrypted().then((ciphers: any[]) => {
            decCiphers = ciphers;
        }));

        await Promise.all(promises);

        const foldersMap = new Map<string, any>();
        for (const f of decFolders) {
            foldersMap.set(f.id, f);
        }

        const exportCiphers = [];
        for (const c of decCiphers) {
            // only export logins and secure notes
            if (c.type !== CipherType.Login && c.type !== CipherType.SecureNote) {
                continue;
            }

            const cipher: any = {
                folder: c.folderId && foldersMap.has(c.folderId) ? foldersMap.get(c.folderId).name : null,
                favorite: c.favorite ? 1 : null,
                type: null,
                name: c.name,
                notes: c.notes,
                fields: null,
                // Login props
                login_uri: null,
                login_username: null,
                login_password: null,
                login_totp: null,
            };

            if (c.fields) {
                for (const f of c.fields) {
                    if (!cipher.fields) {
                        cipher.fields = '';
                    } else {
                        cipher.fields += '\n';
                    }

                    cipher.fields += ((f.name || '') + ': ' + f.value);
                }
            }

            switch (c.type) {
                case CipherType.Login:
                    cipher.type = 'login';
                    cipher.login_uri = c.login.uri;
                    cipher.login_username = c.login.username;
                    cipher.login_password = c.login.password;
                    cipher.login_totp = c.login.totp;
                    break;
                case CipherType.SecureNote:
                    cipher.type = 'note';
                    break;
                default:
                    continue;
            }

            exportCiphers.push(cipher);
        }

        const csv = papa.unparse(exportCiphers);
        return csv;
    }

    private downloadFile(csv: string): void {
        const csvBlob = new Blob([csv], { type: 'text/plain' });
        const fileName = this.makeFileName();
        BrowserApi.downloadFile(this.$window, csvBlob, fileName);
    }

    private makeFileName(): string {
        const now = new Date();
        const dateString =
            now.getFullYear() + '' + this.padNumber(now.getMonth() + 1, 2) + '' + this.padNumber(now.getDate(), 2) +
            this.padNumber(now.getHours(), 2) + '' + this.padNumber(now.getMinutes(), 2) +
            this.padNumber(now.getSeconds(), 2);

        return 'bitwarden_export_' + dateString + '.csv';
    }

    private padNumber(num: number, width: number, padCharacter: string = '0'): string {
        const numString = num.toString();
        return numString.length >= width ? numString :
            new Array(width - numString.length + 1).join(padCharacter) + numString;
    }
}

export const ExportComponent = {
    bindings: {},
    controller: ExportController,
    template: template,
};
