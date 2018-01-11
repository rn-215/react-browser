import * as tldjs from 'tldjs';

import { DeviceType } from 'jslib/enums';

import { PlatformUtilsService } from 'jslib/abstractions';

const AnalyticsIds = {
    [DeviceType.Chrome]: 'UA-81915606-6',
    [DeviceType.Firefox]: 'UA-81915606-7',
    [DeviceType.Opera]: 'UA-81915606-8',
    [DeviceType.Edge]: 'UA-81915606-9',
    [DeviceType.Vivaldi]: 'UA-81915606-15',
    [DeviceType.Safari]: 'UA-81915606-16',
};

export default class BrowserPlatformUtilsService implements PlatformUtilsService {
    static getDomain(uriString: string): string {
        if (uriString == null) {
            return null;
        }

        uriString = uriString.trim();
        if (uriString === '') {
            return null;
        }

        if (uriString.startsWith('http://') || uriString.startsWith('https://')) {
            try {
                const url = new URL(uriString);

                if (url.hostname === 'localhost' || BrowserPlatformUtilsService.validIpAddress(url.hostname)) {
                    return url.hostname;
                }

                const urlDomain = tldjs.getDomain(url.hostname);
                return urlDomain != null ? urlDomain : url.hostname;
            } catch (e) { }
        }

        const domain = tldjs.getDomain(uriString);
        if (domain != null) {
            return domain;
        }

        return null;
    }

    private static validIpAddress(ipString: string): boolean {
        // tslint:disable-next-line
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ipString);
    }

    private deviceCache: DeviceType = null;
    private analyticsIdCache: string = null;

    getDevice(): DeviceType {
        if (this.deviceCache) {
            return this.deviceCache;
        }

        if (navigator.userAgent.indexOf('Firefox') !== -1 || navigator.userAgent.indexOf('Gecko/') !== -1) {
            this.deviceCache = DeviceType.Firefox;
        } else if ((!!(window as any).opr && !!opr.addons) || !!(window as any).opera ||
            navigator.userAgent.indexOf(' OPR/') >= 0) {
            this.deviceCache = DeviceType.Opera;
        } else if (navigator.userAgent.indexOf(' Edge/') !== -1) {
            this.deviceCache = DeviceType.Edge;
        } else if (navigator.userAgent.indexOf(' Vivaldi/') !== -1) {
            this.deviceCache = DeviceType.Vivaldi;
        } else if (navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1) {
            this.deviceCache = DeviceType.Safari;
        } else if ((window as any).chrome) {
            this.deviceCache = DeviceType.Chrome;
        }

        return this.deviceCache;
    }

    getDeviceString(): string {
        return DeviceType[this.getDevice()].toLowerCase();
    }

    isFirefox(): boolean {
        return this.getDevice() === DeviceType.Firefox;
    }

    isChrome(): boolean {
        return this.getDevice() === DeviceType.Chrome;
    }

    isEdge(): boolean {
        return this.getDevice() === DeviceType.Edge;
    }

    isOpera(): boolean {
        return this.getDevice() === DeviceType.Opera;
    }

    isVivaldi(): boolean {
        return this.getDevice() === DeviceType.Vivaldi;
    }

    isSafari(): boolean {
        return this.getDevice() === DeviceType.Safari;
    }

    analyticsId(): string {
        if (this.analyticsIdCache) {
            return this.analyticsIdCache;
        }

        this.analyticsIdCache = AnalyticsIds[this.getDevice()];
        return this.analyticsIdCache;
    }

    getDomain(uriString: string): string {
        return BrowserPlatformUtilsService.getDomain(uriString);
    }

    isViewOpen(): boolean {
        const popupOpen = chrome.extension.getViews({ type: 'popup' }).length > 0;
        if (popupOpen) {
            return true;
        }

        const sidebarView = this.sidebarViewName();
        const sidebarOpen = sidebarView != null && chrome.extension.getViews({ type: sidebarView }).length > 0;
        if (sidebarOpen) {
            return true;
        }

        const tabOpen = chrome.extension.getViews({ type: 'tab' }).length > 0;
        return tabOpen;
    }

    private sidebarViewName(): string {
        if ((window as any).chrome.sidebarAction && this.isFirefox()) {
            return 'sidebar';
        } else if (this.isOpera() && (typeof opr !== 'undefined') && opr.sidebarAction) {
            return 'sidebar_panel';
        }

        return null;
    }
}
