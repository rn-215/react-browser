var isBackground = true;
var bg_loginsToAdd = [];
var bg_i18nService = new i18nService();
var bg_constantsService = new ConstantsService();
var bg_utilsService = new UtilsService();
var bg_cryptoService = new CryptoService(bg_constantsService);
var bg_tokenService = new TokenService();
var bg_appIdService = new AppIdService();
var bg_apiService = new ApiService(bg_tokenService, bg_appIdService, bg_utilsService, logout);
var bg_userService = new UserService(bg_tokenService, bg_apiService, bg_cryptoService);
var bg_settingsService = new SettingsService(bg_userService);
var bg_loginService = new LoginService(bg_cryptoService, bg_userService, bg_apiService, bg_settingsService);
var bg_folderService = new FolderService(bg_cryptoService, bg_userService, bg_apiService, bg_i18nService);
var bg_lockService = new LockService(bg_constantsService, bg_cryptoService, bg_folderService, bg_loginService, setIcon,
    refreshBadgeAndMenu);
var bg_syncService = new SyncService(bg_loginService, bg_folderService, bg_userService, bg_apiService, bg_settingsService,
    bg_cryptoService, logout);
var bg_autofillService = new AutofillService();
var bg_passwordGenerationService = new PasswordGenerationService();
var bg_totpService = new TotpService();

if (chrome.commands) {
    chrome.commands.onCommand.addListener(function (command) {
        if (command === 'generate_password') {
            ga('send', {
                hitType: 'event',
                eventAction: 'Generated Password From Command'
            });
            bg_passwordGenerationService.getOptions().then(function (options) {
                var password = bg_passwordGenerationService.generatePassword(options);
                copyToClipboard(password);
            });
        }
    });
}

var loginToAutoFill = null,
    pageDetailsToAutoFill = [],
    autofillTimeout = null,
    menuOptionsLoaded = [];

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.command === 'loggedIn' || msg.command === 'unlocked' || msg.command === 'locked') {
        setIcon();
        refreshBadgeAndMenu();
    }
    else if (msg.command === 'logout') {
        logout(msg.expired, function () { });
    }
    else if (msg.command === 'syncCompleted' && msg.successfully) {
        setTimeout(refreshBadgeAndMenu, 2000);
    }
    else if (msg.command === 'bgOpenOverlayPopup') {
        messageCurrentTab('openOverlayPopup', msg.data);
    }
    else if (msg.command === 'bgCloseOverlayPopup') {
        messageCurrentTab('closeOverlayPopup');
    }
    else if (msg.command === 'bgOpenNotificationBar') {
        messageTab(sender.tab.id, 'openNotificationBar', msg.data);
    }
    else if (msg.command === 'bgCloseNotificationBar') {
        messageTab(sender.tab.id, 'closeNotificationBar');
    }
    else if (msg.command === 'bgCollectPageDetails') {
        collectPageDetailsForContentScript(sender.tab);
    }
    else if (msg.command === 'bgAddLogin') {
        addLogin(msg.login, sender.tab);
    }
    else if (msg.command === 'bgAddClose') {
        removeAddLogin(sender.tab);
    }
    else if (msg.command === 'bgAddSave') {
        saveAddLogin(sender.tab);
    }
    else if (msg.command === 'bgNeverSave') {
        saveNever(sender.tab);
    }
    else if (msg.command === 'collectPageDetailsResponse') {
        if (msg.contentScript) {
            var forms = bg_autofillService.getFormsWithPasswordFields(msg.details);
            messageTab(msg.tabId, 'pageDetails', { details: msg.details, forms: forms });
        }
        else {
            clearTimeout(autofillTimeout);
            pageDetailsToAutoFill.push({ frameId: sender.frameId, tabId: msg.tabId, details: msg.details });
            autofillTimeout = setTimeout(autofillPage, 300);
        }
    } else if (msg.command === 'bgUpdateContextMenu') {
        refreshBadgeAndMenu();
    }
});

setIcon();
function setIcon() {
    bg_userService.isAuthenticated(function (isAuthenticated) {
        bg_cryptoService.getKey().then(function (key) {
            var suffix = '';
            if (!isAuthenticated) {
                suffix = '_gray';
            }
            else if (!key) {
                suffix = '_locked';
            }

            chrome.browserAction.setIcon({
                path: {
                    '19': 'images/icon19' + suffix + '.png',
                    '38': 'images/icon38' + suffix + '.png',
                }
            });
        });
    });
}

if (chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(function (details) {
        ga('send', {
            hitType: 'event',
            eventAction: 'onInstalled ' + details.reason
        });

        if (details.reason === 'install') {
            chrome.tabs.create({ url: 'https://bitwarden.com/browser-start/' }, function (tab) { });
        }
    });
}

var buildingContextMenu = false;
function buildContextMenu(callback) {
    if (buildingContextMenu) {
        return;
    }
    buildingContextMenu = true;

    chrome.contextMenus.removeAll(function () {
        chrome.contextMenus.create({
            type: 'normal',
            id: 'root',
            contexts: ['all'],
            title: 'bitwarden'
        }, function () {
            chrome.contextMenus.create({
                type: 'normal',
                id: 'autofill',
                parentId: 'root',
                contexts: ['all'],
                title: bg_i18nService.autoFill
            }, function () {
                if (bg_utilsService.isFirefox()) {
                    // Firefox does not support writing to the clipboard from background
                    buildingContextMenu = false;
                    if (callback) {
                        callback();
                    }
                    return;
                }

                chrome.contextMenus.create({
                    type: 'normal',
                    id: 'copy-username',
                    parentId: 'root',
                    contexts: ['all'],
                    title: bg_i18nService.copyUsername
                }, function () {
                    chrome.contextMenus.create({
                        type: 'normal',
                        id: 'copy-password',
                        parentId: 'root',
                        contexts: ['all'],
                        title: bg_i18nService.copyPassword
                    }, function () {
                        chrome.contextMenus.create({
                            type: 'separator',
                            parentId: 'root'
                        });

                        chrome.contextMenus.create({
                            type: 'normal',
                            id: 'generate-password',
                            parentId: 'root',
                            contexts: ['all'],
                            title: bg_i18nService.generatePasswordCopied
                        }, function () {
                            buildingContextMenu = false;
                            if (callback) {
                                callback();
                            }
                        });
                    });
                });
            });
        });
    });
}

chrome.tabs.onActivated.addListener(function (activeInfo) {
    refreshBadgeAndMenu();
});

var onReplacedRan = false;
chrome.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
    if (onReplacedRan) {
        return;
    }
    onReplacedRan = true;
    checkbg_loginsToAdd();
    refreshBadgeAndMenu();
});

var onUpdatedRan = false;
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (onUpdatedRan) {
        return;
    }
    onUpdatedRan = true;
    checkbg_loginsToAdd();
    refreshBadgeAndMenu();
});

chrome.windows.onFocusChanged.addListener(function (windowId) {
    if (windowId === null || windowId < 0) {
        return;
    }

    refreshBadgeAndMenu();
});

function refreshBadgeAndMenu() {
    chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, function (tabs) {
        var tab = null;
        if (tabs.length > 0) {
            tab = tabs[0];
        }

        if (!tab) {
            return;
        }

        chrome.storage.local.get(bg_constantsService.disableContextMenuItemKey, function (obj) {
            if (!obj[bg_constantsService.disableContextMenuItemKey]) {
                buildContextMenu(function () {
                    contextMenuReady(tab, true);
                });
            }
            else {
                chrome.contextMenus.removeAll();
                contextMenuReady(tab, false);
            }
        });
    });
}

function contextMenuReady(tab, contextMenuEnabled) {
    loadMenuAndUpdateBadge(tab.url, tab.id, contextMenuEnabled);
    onUpdatedRan = onReplacedRan = false;
}

function loadMenuAndUpdateBadge(url, tabId, contextMenuEnabled) {
    if (!url) {
        return;
    }

    var tabDomain = bg_utilsService.getDomain(url);
    if (!tabDomain) {
        return;
    }

    chrome.browserAction.setBadgeBackgroundColor({ color: '#294e5f' });

    menuOptionsLoaded = [];
    bg_loginService.getAllDecryptedForDomain(tabDomain).then(function (logins) {
        sortLogins(logins);

        if (contextMenuEnabled) {
            for (var i = 0; i < logins.length; i++) {
                loadLoginContextMenuOptions(logins[i]);
            }
        }

        if (logins.length > 0 && logins.length < 9) {
            chrome.browserAction.setBadgeText({
                text: logins.length.toString(),
                tabId: tabId
            });
        }
        else if (logins.length > 0) {
            chrome.browserAction.setBadgeText({
                text: '9+',
                tabId: tabId
            });
        }
        else {
            if (contextMenuEnabled) {
                loadNoLoginsContextMenuOptions(bg_i18nService.noMatchingLogins);
            }
            chrome.browserAction.setBadgeText({
                text: '',
                tabId: tabId
            });
        }
    }, function () {
        if (contextMenuEnabled) {
            loadNoLoginsContextMenuOptions(bg_i18nService.vaultLocked);
        }
        chrome.browserAction.setBadgeText({
            text: '',
            tabId: tabId
        });
    });
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === 'generate-password') {
        ga('send', {
            hitType: 'event',
            eventAction: 'Generated Password From Context Menu'
        });
        bg_passwordGenerationService.getOptions().then(function (options) {
            var password = bg_passwordGenerationService.generatePassword(options);
            copyToClipboard(password);
        });
    }
    else if (info.parentMenuItemId === 'autofill' || info.parentMenuItemId === 'copy-username' ||
        info.parentMenuItemId === 'copy-password') {
        var id = info.menuItemId.split('_')[1];
        if (id === 'noop') {
            return;
        }

        bg_loginService.getAllDecrypted().then(function (logins) {
            for (var i = 0; i < logins.length; i++) {
                if (logins[i].id === id) {
                    if (info.parentMenuItemId === 'autofill') {
                        ga('send', {
                            hitType: 'event',
                            eventAction: 'Autofilled From Context Menu'
                        });
                        startAutofillPage(logins[i]);
                    }
                    else if (info.parentMenuItemId === 'copy-username') {
                        ga('send', {
                            hitType: 'event',
                            eventAction: 'Copied Username From Context Menu'
                        });
                        copyToClipboard(logins[i].username);
                    }
                    else if (info.parentMenuItemId === 'copy-password') {
                        ga('send', {
                            hitType: 'event',
                            eventAction: 'Copied Password From Context Menu'
                        });
                        copyToClipboard(logins[i].password);
                    }
                    return;
                }
            }
        }, function () {

        });
    }
});

function messageCurrentTab(command, data) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tabId = null;
        if (tabs.length > 0) {
            tabId = tabs[0].id;
        }
        else {
            return;
        }

        messageTab(tabId, command, data);
    });
}

function messageTab(tabId, command, data, callback) {
    if (!tabId) {
        return;
    }

    var obj = {
        command: command
    };

    if (data) {
        obj.data = data;
    }

    chrome.tabs.sendMessage(tabId, obj, function () {
        if (callback) {
            callback();
        }
    });
}

function collectPageDetailsForContentScript(tab) {
    chrome.tabs.sendMessage(tab.id, { command: 'collectPageDetails', tabId: tab.id, contentScript: true }, function () {
    });
}

function addLogin(login, tab) {
    var loginDomain = bg_utilsService.getDomain(login.url);
    if (!loginDomain) {
        return;
    }

    bg_loginService.getAllDecryptedForDomain(loginDomain).then(function (logins) {
        var match = false;
        for (var i = 0; i < logins.length; i++) {
            if (logins[i].username === login.username) {
                match = true;
                break;
            }
        }

        if (!match) {
            // remove any old logins for this tab
            removeAddLogin(tab);

            bg_loginsToAdd.push({
                username: login.username,
                password: login.password,
                name: loginDomain,
                domain: loginDomain,
                uri: login.url,
                tabId: tab.id,
                expires: new Date((new Date()).getTime() + 30 * 60000) // 30 minutes
            });
            checkbg_loginsToAdd(tab);
        }
    });
}

var lastCleanupLoginCheck = null;
cleanupbg_loginsToAdd();
setInterval(cleanupbg_loginsToAdd, 2 * 60 * 1000); // check every 2 minutes
function cleanupbg_loginsToAdd() {
    var now = new Date();
    if (lastCleanupLoginCheck && (now - lastCleanupLoginCheck) < 10000) {
        // can only check cleanup every 10 seconds
        return;
    }
    lastCleanupLoginCheck = now;

    for (var i = bg_loginsToAdd.length - 1; i >= 0; i--) {
        if (bg_loginsToAdd[i].expires < now) {
            bg_loginsToAdd.splice(i, 1);
        }
    }
}

function removeAddLogin(tab) {
    for (var i = bg_loginsToAdd.length - 1; i >= 0; i--) {
        if (bg_loginsToAdd[i].tabId === tab.id) {
            bg_loginsToAdd.splice(i, 1);
        }
    }
}

function saveAddLogin(tab) {
    for (var i = bg_loginsToAdd.length - 1; i >= 0; i--) {
        if (bg_loginsToAdd[i].tabId === tab.id) {
            var loginToAdd = bg_loginsToAdd[i];

            var tabDomain = bg_utilsService.getDomain(tab.url);
            if (tabDomain && tabDomain === loginToAdd.domain) {
                bg_loginsToAdd.splice(i, 1);
                bg_loginService.encrypt({
                    id: null,
                    folderId: null,
                    favorite: false,
                    name: loginToAdd.name,
                    uri: loginToAdd.uri,
                    username: loginToAdd.username,
                    password: loginToAdd.password,
                    notes: null
                }).then(function (loginModel) {
                    var login = new Login(loginModel, true);
                    bg_loginService.saveWithServer(login).then(function (login) {
                        ga('send', {
                            hitType: 'event',
                            eventAction: 'Added Login from Notification Bar'
                        });
                    });
                });
                messageTab(tab.id, 'closeNotificationBar');
            }
        }
    }
}

function saveNever(tab) {
    for (var i = bg_loginsToAdd.length - 1; i >= 0; i--) {
        if (bg_loginsToAdd[i].tabId === tab.id) {
            var loginToAdd = bg_loginsToAdd[i];

            var tabDomain = bg_utilsService.getDomain(tab.url);
            if (tabDomain && tabDomain === loginToAdd.domain) {
                bg_loginsToAdd.splice(i, 1);
                var hostname = bg_utilsService.getHostname(tab.url);
                bg_loginService.saveNeverDomain(hostname);
                messageTab(tab.id, 'closeNotificationBar');
            }
        }
    }
}

function checkbg_loginsToAdd(tab, callback) {
    if (!bg_loginsToAdd.length) {
        if (callback) {
            callback();
        }
        return;
    }

    if (tab) {
        check();
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
            tab = tabs[0];
            check();
        }
    });

    function check() {
        if (!tab) {
            if (callback) {
                callback();
            }
            return;
        }

        var tabDomain = bg_utilsService.getDomain(tab.url);
        if (!tabDomain) {
            if (callback) {
                callback();
            }
            return;
        }

        for (var i = 0; i < bg_loginsToAdd.length; i++) {
            if (bg_loginsToAdd[i].tabId === tab.id && bg_loginsToAdd[i].domain === tabDomain) {
                messageTab(tab.id, 'openNotificationBar', {
                    type: 'add'
                }, function () {
                    if (callback) {
                        callback();
                    }
                });
                break;
            }
        }
    }
}

function startAutofillPage(login) {
    loginToAutoFill = login;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tabId = null;
        if (tabs.length > 0) {
            tabId = tabs[0].id;
        }
        else {
            return;
        }

        if (!tabId) {
            return;
        }

        chrome.tabs.sendMessage(tabId, { command: 'collectPageDetails', tabId: tabId }, function () {
        });
    });
}

function autofillPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tabId = null;
        if (tabs.length > 0) {
            tabId = tabs[0].id;
        }
        else {
            return;
        }

        if (!tabId) {
            return;
        }

        if (loginToAutoFill && pageDetailsToAutoFill && pageDetailsToAutoFill.length) {
            for (var i = 0; i < pageDetailsToAutoFill.length; i++) {
                // make sure we're still on correct tab
                if (pageDetailsToAutoFill[i].tabId !== tabId) {
                    continue;
                }

                var fillScript = bg_autofillService.generateFillScript(pageDetailsToAutoFill[i].details,
                    loginToAutoFill.username, loginToAutoFill.password);
                if (tabId && fillScript && fillScript.script && fillScript.script.length) {
                    chrome.tabs.sendMessage(tabId, {
                        command: 'fillForm',
                        fillScript: fillScript
                    }, {
                            frameId: pageDetailsToAutoFill[i].frameId
                        });
                }
            }
        }

        // reset
        loginToAutoFill = null;
        pageDetailsToAutoFill = [];
    });
}

function sortLogins(logins) {
    logins.sort(function (a, b) {
        var nameA = (a.name + '_' + a.username).toUpperCase();
        var nameB = (b.name + '_' + b.username).toUpperCase();

        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        return 0;
    });
}

function loadLoginContextMenuOptions(login) {
    var title = login.name + (login.username && login.username !== '' ? ' (' + login.username + ')' : '');
    loadContextMenuOptions(title, login.id, login);
}

function loadNoLoginsContextMenuOptions(noLoginsMessage) {
    loadContextMenuOptions(noLoginsMessage, 'noop', null);
}

function loadContextMenuOptions(title, idSuffix, login) {
    if (menuOptionsLoaded.indexOf(idSuffix) > -1) {
        return;
    }
    menuOptionsLoaded.push(idSuffix);

    if (!login || (login.password && login.password !== '')) {
        chrome.contextMenus.create({
            type: 'normal',
            id: 'autofill_' + idSuffix,
            parentId: 'autofill',
            contexts: ['all'],
            title: title
        });
    }

    if (bg_utilsService.isFirefox()) {
        // Firefox does not support writing to the clipboard from background
        return;
    }

    if (!login || (login.username && login.username !== '')) {
        chrome.contextMenus.create({
            type: 'normal',
            id: 'copy-username_' + idSuffix,
            parentId: 'copy-username',
            contexts: ['all'],
            title: title
        });
    }

    if (!login || (login.password && login.password !== '')) {
        chrome.contextMenus.create({
            type: 'normal',
            id: 'copy-password_' + idSuffix,
            parentId: 'copy-password',
            contexts: ['all'],
            title: title
        });
    }
}

// TODO: Fix callback hell by moving to promises
function logout(expired, callback) {
    bg_userService.getUserId(function (userId) {
        bg_syncService.setLastSync(new Date(0), function () {
            bg_settingsService.clear(function () {
                bg_tokenService.clearToken(function () {
                    bg_cryptoService.clearKeys(function () {
                        bg_userService.clear(function () {
                            bg_loginService.clear(userId, function () {
                                bg_folderService.clear(userId, function () {
                                    chrome.runtime.sendMessage({
                                        command: 'doneLoggingOut', expired: expired
                                    });
                                    setIcon();
                                    refreshBadgeAndMenu();
                                    callback();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function copyToClipboard(text) {
    if (window.clipboardData && window.clipboardData.setData) {
        // IE specific code path to prevent textarea being shown while dialog is visible.
        return clipboardData.setData('Text', text);
    }
    else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        var textarea = document.createElement('textarea');
        textarea.textContent = text;
        // Prevent scrolling to bottom of page in MS Edge.
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            // Security exception may be thrown by some browsers.
            return document.execCommand('copy');
        }
        catch (ex) {
            console.warn('Copy to clipboard failed.', ex);
            return false;
        }
        finally {
            document.body.removeChild(textarea);
        }
    }
}

// Sync polling

var lastSyncCheck = null;
fullSync(true);
setInterval(fullSync, 5 * 60 * 1000); // check every 5 minutes
var syncInternal = 6 * 60 * 60 * 1000; // 6 hours

function fullSync(override) {
    var now = new Date();
    if (lastSyncCheck && (now - lastSyncCheck) < 10000) {
        // can only check sync every 10 seconds
        return;
    }
    lastSyncCheck = now;

    override = override || false;
    bg_syncService.getLastSync(function (lastSync) {
        if (override || !lastSync || (now - lastSync) >= syncInternal) {
            bg_syncService.fullSync(override || false, function () {
            });
        }
    });
}
