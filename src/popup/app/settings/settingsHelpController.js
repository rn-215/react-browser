﻿angular
    .module('bit.settings')

    .controller('settingsHelpController', function ($scope, $analytics) {
        $scope.email = function () {
            $analytics.eventTrack('Selected Help Email');
            chrome.tabs.create({ url: 'mailto:hello@bitwarden.com' });
        };

        $scope.website = function () {
            $analytics.eventTrack('Selected Help Website');
            chrome.tabs.create({ url: 'https://bitwarden.com/contact/' });
        };

        $scope.bug = function () {
            $analytics.eventTrack('Selected Help Bug Report');
            chrome.tabs.create({ url: 'https://github.com/bitwarden/browser' });
        };
    });
