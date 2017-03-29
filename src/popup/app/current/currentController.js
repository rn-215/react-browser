angular
    .module('bit.current')

    .controller('currentController', function ($scope, loginService, utilsService, toastr, $q, $window, $state, $timeout,
        autofillService, $analytics, i18nService) {
        $scope.i18n = i18nService;

        var pageDetails = [],
            tabId = null,
            url = null,
            domain = null,
            canAutofill = false;

        $scope.logins = [];
        $scope.loaded = false;

        $scope.$on('$viewContentLoaded', function () {
            $timeout(loadVault, 100);
        });

        function loadVault() {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length > 0) {
                    url = tabs[0].url;
                    tabId = tabs[0].id;
                }
                else {
                    $scope.loaded = true;
                    $scope.$apply();
                    return;
                }

                domain = utilsService.getDomain(url);
                if (!domain) {
                    $scope.loaded = true;
                    $scope.$apply();
                    return;
                }

                chrome.tabs.sendMessage(tabId, { command: 'collectPageDetails', tabId: tabId }, function () {
                    canAutofill = true;
                });

                $q.when(loginService.getAllDecryptedForDomain(domain)).then(function (logins) {
                    $scope.loaded = true;
                    $scope.logins = logins;
                });
            });
        }

        $scope.clipboardError = function (e, password) {
            toastr.info(i18n.browserNotSupportClipboard);
        };

        $scope.clipboardSuccess = function (e, type) {
            e.clearSelection();
            toastr.info(type + i18nService.valueCopied);
            $analytics.eventTrack('Copied ' + (type === i18nService.username ? 'Username' : 'Password'));
        };

        $scope.addLogin = function () {
            $state.go('addLogin', {
                animation: 'in-slide-up',
                name: domain,
                uri: url,
                from: 'current'
            });
        };

        $scope.fillLogin = function (login) {
            var didAutofill = false;

            if (login && canAutofill && pageDetails && pageDetails.length) {
                for (var i = 0; i < pageDetails.length; i++) {
                    if (pageDetails[i].tabId !== tabId) {
                        continue;
                    }

                    var fillScript = autofillService.generateFillScript(pageDetails[i].details, login.username, login.password);
                    if (tabId && fillScript && fillScript.script && fillScript.script.length) {
                        didAutofill = true;
                        $analytics.eventTrack('Autofilled');
                        chrome.tabs.sendMessage(tabId, {
                            command: 'fillForm',
                            fillScript: fillScript
                        }, {
                            frameId: pageDetails[i].frameId
                        }, $window.close);
                    }
                }
            }

            if (!didAutofill) {
                $analytics.eventTrack('Autofilled Error');
                toastr.error(i18nService.autofillError);
            }
        };

        $scope.viewLogin = function (login, e) {
            e.stopPropagation();

            $state.go('viewLogin', {
                loginId: login.id,
                animation: 'in-slide-up',
                from: 'current'
            });
        };

        $scope.$on('syncCompleted', function (event, successfully) {
            if ($scope.loaded) {
                setTimeout(loadVault, 500);
            }
        });

        $scope.$on('collectPageDetailsResponse', function (event, details) {
            pageDetails.push(details);
        });
    });
