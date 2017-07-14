﻿function LockService(constantsService, cryptoService, folderService, loginService, setIcon, refreshBadgeAndMenu) {
    this.lastLockCheck = null;
    this.constantsService = constantsService;
    this.cryptoService = cryptoService;
    this.folderService = folderService;
    this.loginService = loginService;
    this.setIcon = setIcon;
    this.refreshBadgeAndMenu = refreshBadgeAndMenu;

    initLockService(this);
}

function initLockService(self) {
    checkLock();
    setInterval(checkLock, 10 * 1000); // check every 10 seconds

    function checkLock() {
        var now = new Date();
        if (self.lastLockCheck && (now - self.lastLockCheck) < 5000) {
            // can only check lock every 5 seconds
            return;
        }
        self.lastLockCheck = now;

        if (chrome.extension.getViews({ type: 'popup' }).length > 0) {
            // popup is open, do not lock
            return;
        }

        var lockOptionSeconds = null;
        self.cryptoService.getKey().then(function (key) {
            if (!key) {
                // no key so no need to lock
                return false;
            }

            return getLockOption();
        }).then(function (lockOption) {
            if (lockOption === false || lockOption < 0) {
                return;
            }

            lockOptionSeconds = lockOption * 60;
            return getLastActive();
        }).then(function (lastActive) {
            if (lockOptionSeconds === null) {
                return;
            }

            var diffSeconds = ((new Date()).getTime() - lastActive) / 1000;
            if (diffSeconds >= lockOptionSeconds) {
                // need to lock now
                return self.lock();
            }
        });
    }

    if (chrome.idle && chrome.idle.onStateChanged) {
        chrome.idle.onStateChanged.addListener(function (newState) {
            if (newState === 'locked') {
                getLockOption().then(function (lockOption) {
                    if (lockOption !== -2) {
                        return;
                    }

                    return self.lock();
                });
            }
        });
    }

    LockService.prototype.lock = function () {
        return Q.all([
            self.cryptoService.clearKey(),
            self.cryptoService.clearOrgKeys(true),
            self.cryptoService.clearPrivateKey(true),
            self.cryptoService.clearEncKey(true)
        ]).then(function () {
            self.setIcon();
            self.folderService.clearCache();
            self.loginService.clearCache();
            self.refreshBadgeAndMenu();
        });
    };

    function getLockOption() {
        var deferred = Q.defer();

        chrome.storage.local.get(self.constantsService.lockOptionKey, function (obj) {
            if (obj && obj[self.constantsService.lockOptionKey] === 0 || obj[self.constantsService.lockOptionKey]) {
                deferred.resolve(parseInt(obj[self.constantsService.lockOptionKey]));
            }
            else {
                deferred.reject();
            }
        });

        return deferred.promise;
    }

    function getLastActive() {
        var deferred = Q.defer();

        chrome.storage.local.get(self.constantsService.lastActiveKey, function (obj) {
            if (obj && obj[self.constantsService.lastActiveKey]) {
                deferred.resolve(obj[self.constantsService.lastActiveKey]);
            }
            else {
                deferred.reject();
            }
        });

        return deferred.promise;
    }

    function getIdleState(detectionInterval) {
        detectionInterval = detectionInterval || (60 * 5);
        var deferred = Q.defer();

        if (chrome.idle && chrome.idle.queryState) {
            chrome.idle.queryState(detectionInterval, function (state) {
                deferred.resolve(state);
            });
        }
        else {
            deferred.resolve('active');
        }

        return deferred.promise;
    }
}
