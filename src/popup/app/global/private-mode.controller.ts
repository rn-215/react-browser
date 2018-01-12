import { BrowserApi } from '../../../browser/browserApi';

export class PrivateModeController implements ng.IController {
    constructor($scope: any) {
        $scope.privateModeMessage = chrome.i18n.getMessage('privateModeMessage');
        $scope.learnMoreMessage = chrome.i18n.getMessage('learnMore');
        $scope.learnMore = () => {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/extension-wont-load-in-private-mode/');
        };
    }
}
