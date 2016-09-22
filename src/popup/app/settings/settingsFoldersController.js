﻿angular
    .module('bit.settings')

    .controller('settingsFoldersController', function ($scope, folderService, $q, $state) {
        $scope.loaded = false;

        load();
        function load() {
            var foldersPromise = $q.when(folderService.getAllDecrypted());
            foldersPromise.then(function (folders) {
                if (folders.length > 0 && folders[0].id === null) {
                    // remove the "none" folder
                    $scope.folders = folders.slice(1);
                }
                else {
                    $scope.folders = folders;
                }

                $scope.loaded = true;
            });
        }

        $scope.editFolder = function (folder) {
            $state.go('editFolder', {
                folderId: folder.id,
                animation: 'in-slide-up'
            });
        };
    });
