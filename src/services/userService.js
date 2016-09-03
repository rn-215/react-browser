﻿function UserService(tokenService, apiService) {
    this.tokenService = tokenService;
    this.apiService = apiService;
};

!function () {
    var _userProfile = null;

    UserService.prototype.getUserId = function (callback) {
        this.getUserProfile(function (profile) {
            callback(profile.id);
        });
    };

    UserService.prototype.getUserProfile = function (callback) {
        if (!callback || typeof callback !== 'function') {
            throw 'callback function required';
        }

        if (_userProfile) {
            callback(_userProfile);
            return;
        }

        this.setUserProfile(null, function () {
            callback(_userProfile);
        });
    };

    UserService.prototype.setUserProfile = function (profile, callback) {
        if (!callback || typeof callback !== 'function') {
            throw 'callback function required';
        }

        this.tokenService.getToken(function (token) {
            if (!token) {
                return;
            }

            var decodedToken = this.tokenService.decodeToken(token);
            var twoFactor = decodedToken.authmethod === "TwoFactor";

            _userProfile = {
                id: decodedToken.nameid,
                email: decodedToken.email,
                twoFactor: twoFactor
            };

            if (!twoFactor && profile) {
                loadProfile(profile, callback);
            }
            else if (!twoFactor && !profile) {
                this.apiService.getProfile(function (response) {
                    loadProfile(response, callback);
                });
            }
        });

        function loadProfile(profile, callback) {
            _userProfile.extended = {
                name: profile.name,
                twoFactorEnabled: profile.twoFactorEnabled,
                culture: profile.culture
            };

            callback();
        }
    };

    UserService.prototype.clearUserProfile = function () {
        _userProfile = null;
    };

    UserService.prototype.isAuthenticated = function (callback) {
        if (!callback || typeof callback !== 'function') {
            throw 'callback function required';
        }

        this.getUserProfile(function (profile) {
            callback(profile !== null && !profile.twoFactor);
        });
    };

    UserService.prototype.isTwoFactorAuthenticated = function (callback) {
        if (!callback || typeof callback !== 'function') {
            throw 'callback function required';
        }

        this.getUserProfile(function (profile) {
            callback(profile !== null && profile.twoFactor);
        });
    };
}();
