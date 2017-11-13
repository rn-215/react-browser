angular
    .module('bit.global')

    .controller('mainController', function ($scope, $transitions, $state, authService, toastr, i18nService, $analytics, utilsService,
        $window) {
        var self = this;
        self.animation = '';
        self.xsBody = $window.screen.availHeight < 600;
        self.smBody = !self.xsBody && $window.screen.availHeight <= 800;
        self.disableSearch = utilsService && utilsService.isEdge();
        self.inSidebar = utilsService && utilsService.inSidebar($window);

        $transitions.onSuccess({}, function(transition) {
            const toParams = transition.params("to");

            if (toParams.animation) {
                self.animation = toParams.animation;
                return;
            } else {
                self.animation = '';
            }
        });

        self.expandVault = function (e) {
            $analytics.eventTrack('Expand Vault');

            var href = $window.location.href;
            if (utilsService.isEdge()) {
                var popupIndex = href.indexOf('/popup/');
                if (popupIndex > -1) {
                    href = href.substring(popupIndex);
                }
            }

            if (chrome.windows.create) {
                if (href.indexOf('?uilocation=') > -1) {
                    href = href.replace('uilocation=popup', 'uilocation=popout').replace('uilocation=tab', 'uilocation=popout')
                        .replace('uilocation=sidebar', 'uilocation=popout');
                }
                else {
                    var hrefParts = href.split('#');
                    href = hrefParts[0] + '?uilocation=popout' + (hrefParts.length > 0 ? '#' + hrefParts[1] : '');
                }

                var bodyRect = document.querySelector('body').getBoundingClientRect();
                chrome.windows.create({
                    url: href,
                    type: 'popup',
                    width: bodyRect.width + 60,
                    height: bodyRect.height
                });

                if (utilsService.inPopup($window)) {
                    $window.close();
                }
            }
            else {
                href = href.replace('uilocation=popup', 'uilocation=tab').replace('uilocation=popout', 'uilocation=tab')
                    .replace('uilocation=sidebar', 'uilocation=tab');
                chrome.tabs.create({
                    url: href
                });
            }
        };

        chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
            if (msg.command === 'syncCompleted') {
                $scope.$broadcast('syncCompleted', msg.successfully);
            }
            else if (msg.command === 'syncStarted') {
                $scope.$broadcast('syncStarted');
            }
            else if (msg.command === 'doneLoggingOut') {
                authService.logOut(function () {
                    $analytics.eventTrack('Logged Out');
                    if (msg.expired) {
                        toastr.warning(i18nService.loginExpired, i18nService.loggedOut);
                    }
                    $state.go('home');
                });
            }
            else if (msg.command === 'collectPageDetailsResponse' && msg.sender === 'currentController') {
                $scope.$broadcast('collectPageDetailsResponse', {
                    frameId: sender.frameId,
                    tab: msg.tab,
                    details: msg.details
                });
            }
        });
    });
