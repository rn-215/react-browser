angular
    .module('bit.vault')

    .controller('vaultAddCipherController', function ($scope, $state, $stateParams, cipherService, folderService,
        cryptoService, toastr, popupUtilsService, $analytics, i18nService, constantsService, $timeout, auditService) {
        $scope.i18n = i18nService;
        $scope.constants = constantsService;
        $scope.addFieldType = constantsService.fieldType.text.toString();
        $scope.selectedType = constantsService.cipherType.login.toString();
        var from = $stateParams.from,
            folderId = $stateParams.folderId && $stateParams.folderId !== '0' ? $stateParams.folderId : null;

        $scope.cipher = {
            folderId: folderId,
            name: $stateParams.name,
            type: constantsService.cipherType.login,
            login: {
                uris: [{
                    uri: null,
                    match: null,
                    matchValue: null
                }]
            },
            identity: {},
            card: {},
            secureNote: {
                type: 0 // generic note
            }
        };

        if ($stateParams.uri) {
            $scope.cipher.login.uris[0].uri = $stateParams.uri;
        }

        if ($stateParams.cipher) {
            angular.extend($scope.cipher, $stateParams.cipher);
        }

        $timeout(function () {
            popupUtilsService.initListSectionItemListeners(document, angular);

            if (!$stateParams.cipher && $scope.cipher.name && $scope.cipher.login && $scope.cipher.login.uri) {
                document.getElementById('loginUsername').focus();
            }
            else {
                document.getElementById('name').focus();
            }
        }, 500);

        folderService.getAllDecrypted().then(function (folders) {
            $scope.folders = folders;
        });

        $scope.typeChanged = function () {
            $scope.cipher.type = parseInt($scope.selectedType);

            $timeout(function () {
                popupUtilsService.initListSectionItemListeners(document, angular);
            }, 500);
        };

        $scope.savePromise = null;
        $scope.save = function () {
            if (!$scope.cipher.name || $scope.cipher.name === '') {
                toastr.error(i18nService.nameRequired, i18nService.errorsOccurred);
                return;
            }

            $scope.savePromise = cipherService.encrypt($scope.cipher).then(function (cipherModel) {
                var cipher = new Cipher(cipherModel, true);
                return cipherService.saveWithServer(cipher);
            }).then(function (c) {
                $analytics.eventTrack('Added Cipher');
                toastr.success(i18nService.addedItem);
                $scope.close();
            });
        };

        $scope.close = function () {
            if (from === 'current') {
                $state.go('tabs.current', {
                    animation: 'out-slide-down'
                });
            }
            else if (from === 'grouping') {
                $state.go('viewGrouping', {
                    animation: 'out-slide-down'
                });
            }
            else {
                $state.go('tabs.vault', {
                    animation: 'out-slide-down'
                });
            }
        };

        $scope.showPassword = false;
        $scope.togglePassword = function () {
            $analytics.eventTrack('Toggled Password');
            $scope.showPassword = !$scope.showPassword;
        };

        $scope.checkPassword = function () {
            if (!$scope.cipher.login || !$scope.cipher.login.password || $scope.cipher.login.password === '') {
                return;
            }

            $analytics.eventTrack('Check Password');
            auditService.passwordLeaked($scope.cipher.login.password).then(function (matches) {
                if (matches != 0) {
                    toastr.error(i18nService.passwordExposed);
                } else {
                    toastr.success(i18nService.passwordSafe);
                }
            });
        };

        $scope.addUri = function () {
            if (!$scope.cipher.login) {
                return;
            }

            if (!$scope.cipher.login.uris) {
                $scope.cipher.login.uris = [];
            }

            $scope.cipher.login.uris.push({
                uri: null,
                match: null,
                matchValue: null
            });

            $timeout(function () {
                popupUtilsService.initListSectionItemListeners(document, angular);
            }, 500);
        };

        $scope.removeUri = function (uri) {
            if (!$scope.cipher.login || !$scope.cipher.login.uris) {
                return;
            }

            var index = $scope.cipher.login.uris.indexOf(uri);
            if (index > -1) {
                $scope.cipher.login.uris.splice(index, 1);
            }
        };

        $scope.uriMatchChanged = function (uri) {
            uri.showOptions = uri.showOptions == null ? true : uri.showOptions;
            if ((!uri.matchValue && uri.matchValue !== 0) || uri.matchValue === '') {
                uri.match = null;
            }
            else {
                uri.match = parseInt(uri.matchValue);
            }
        };

        $scope.toggleUriOptions = function (u) {
            u.showOptions = u.showOptions == null && u.match != null ? false : !u.showOptions;
        };

        $scope.addField = function (type) {
            if (!$scope.cipher.fields) {
                $scope.cipher.fields = [];
            }

            $scope.cipher.fields.push({
                type: parseInt(type),
                name: null,
                value: null
            });

            $timeout(function () {
                popupUtilsService.initListSectionItemListeners(document, angular);
            }, 500);
        };

        $scope.removeField = function (field) {
            var index = $scope.cipher.fields.indexOf(field);
            if (index > -1) {
                $scope.cipher.fields.splice(index, 1);
            }
        };

        $scope.generatePassword = function () {
            $analytics.eventTrack('Clicked Generate Password');
            $state.go('passwordGenerator', {
                animation: 'in-slide-up',
                addState: {
                    from: from,
                    cipher: $scope.cipher
                }
            });
        };
    });
