angular
    .module('bit.vault')

    .controller('vaultEditCipherController', function ($scope, $state, $stateParams, cipherService, folderService,
        cryptoService, toastr, SweetAlert, platformUtilsService, $analytics, i18nService, constantsService, $timeout,
        popupUtilsService, auditService) {
        $timeout(function () {
            popupUtilsService.initListSectionItemListeners(document, angular);
            document.getElementById('name').focus();
        }, 500);

        $scope.i18n = i18nService;
        $scope.constants = constantsService;
        $scope.showAttachments = !platformUtilsService.isEdge();
        $scope.addFieldType = constantsService.fieldType.text.toString();
        $scope.selectedType = constantsService.cipherType.login.toString();
        var cipherId = $stateParams.cipherId;
        var fromView = $stateParams.fromView;
        var from = $stateParams.from;

        $scope.cipher = {
            folderId: null
        };

        if ($stateParams.cipher) {
            angular.extend($scope.cipher, $stateParams.cipher);
        }
        else {
            cipherService.get(cipherId).then(function (cipher) {
                return cipher.decrypt();
            }).then(function (model) {
                $scope.cipher = model;
            });
        }

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
                return cipherService.saveWithServer(cipher).then(function (c) {
                    $analytics.eventTrack('Edited Cipher');
                    toastr.success(i18nService.editedItem);
                    $scope.close();
                });
            });
        };

        $scope.delete = function () {
            SweetAlert.swal({
                title: i18nService.deleteItem,
                text: i18nService.deleteItemConfirmation,
                showCancelButton: true,
                confirmButtonText: i18nService.yes,
                cancelButtonText: i18nService.no
            }, function (confirmed) {
                if (confirmed) {
                    cipherService.deleteWithServer(cipherId).then(function () {
                        $analytics.eventTrack('Deleted Cipher');
                        toastr.success(i18nService.deletedItem);
                        $state.go('tabs.vault', {
                            animation: 'out-slide-down'
                        });
                    });
                }
            });
        };

        $scope.attachments = function () {
            $state.go('attachments', {
                id: cipherId,
                animation: 'in-slide-up',
                from: from,
                fromView: fromView
            });
        };

        $scope.close = function () {
            if (fromView) {
                $state.go('viewCipher', {
                    cipherId: cipherId,
                    animation: 'out-slide-down',
                    from: from
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
            if ($scope.cipher.login.password) {
                SweetAlert.swal({
                    title: i18nService.overwritePassword,
                    text: i18nService.overwritePasswordConfirmation,
                    showCancelButton: true,
                    confirmButtonText: i18nService.yes,
                    cancelButtonText: i18nService.no
                }, function (confirmed) {
                    if (confirmed) {
                        goPasswordGenerator();
                    }
                });
            }
            else {
                goPasswordGenerator();
            }

        };

        function goPasswordGenerator() {
            $analytics.eventTrack('Clicked Generate Password');
            $state.go('passwordGenerator', {
                animation: 'in-slide-up',
                editState: {
                    fromView: fromView,
                    cipherId: cipherId,
                    cipher: $scope.cipher,
                    from: from
                }
            });
        }
    });
