﻿angular
    .module('bit.settings')

    .controller('settingsSyncController', function ($scope, syncService, toastr, $analytics) {
        $scope.lastSync = '--';
        $scope.loading = false;
        setLastSync();

        $scope.sync = function () {
            $scope.loading = true;
            syncService.fullSync(function () {
                $analytics.eventTrack('Synced Full');
                $scope.loading = false;
                toastr.success('Syncing complete');
                setLastSync();
            });
        };

        function setLastSync() {
            syncService.getLastSync(function (lastSync) {
                if (lastSync) {
                    $scope.lastSync = lastSync.toLocaleDateString() + ' ' + lastSync.toLocaleTimeString();
                }
                else {
                    $scope.lastSync = 'Never';
                }
            });
        }
    });
