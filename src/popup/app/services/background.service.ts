import { Abstractions } from '@bitwarden/jslib';

function getBackgroundService<T>(service: string) {
    return (): T => {
        const page = chrome.extension.getBackgroundPage();
        return page ? page.bitwardenMain[service] as T : null;
    };
}

export const storageService = getBackgroundService<Abstractions.StorageService>('storageService');
export const tokenService = getBackgroundService<any>('tokenService');
export const cryptoService = getBackgroundService<any>('cryptoService');
export const userService = getBackgroundService<any>('userService');
export const apiService = getBackgroundService<any>('apiService');
export const folderService = getBackgroundService<any>('folderService');
export const cipherService = getBackgroundService<Abstractions.CryptoService>('cipherService');
export const syncService = getBackgroundService<any>('syncService');
export const autofillService = getBackgroundService<any>('autofillService');
export const passwordGenerationService = getBackgroundService<any>('passwordGenerationService');
export const platformUtilsService = getBackgroundService<Abstractions.PlatformUtilsService>('platformUtilsService');
export const utilsService = getBackgroundService<Abstractions.UtilsService>('utilsService');
export const appIdService = getBackgroundService<any>('appIdService');
export const i18nService = getBackgroundService<any>('i18nService');
export const constantsService = getBackgroundService<any>('constantsService');
export const settingsService = getBackgroundService<any>('settingsService');
export const lockService = getBackgroundService<any>('lockService');
export const totpService = getBackgroundService<any>('totpService');
export const environmentService = getBackgroundService<any>('environmentService');
export const collectionService = getBackgroundService<any>('collectionService');
