﻿function AutofillService(utilsService, totpService, tokenService, cipherService, constantsService) {
    this.utilsService = utilsService;
    this.totpService = totpService;
    this.tokenService = tokenService;
    this.cipherService = cipherService;
    this.constantsService = constantsService;

    initAutofill();
}

function initAutofill() {
    // Add other languages to this array
    var usernameFieldNames = ['username', 'user name', 'email', 'email address', 'e-mail', 'e-mail address',
        'userid', 'user id'];

    AutofillService.prototype.getFormsWithPasswordFields = function (pageDetails) {
        var passwordFields = [],
            formData = [];

        passwordFields = loadPasswordFields(pageDetails, true);
        if (passwordFields.length) {
            for (var formKey in pageDetails.forms) {
                for (var i = 0; i < passwordFields.length; i++) {
                    var pf = passwordFields[i];
                    if (formKey === pf.form) {
                        var uf = findUsernameField(pageDetails, pf, false, false);
                        if (!uf) {
                            // not able to find any viewable username fields. maybe there are some "hidden" ones?
                            uf = findUsernameField(pageDetails, pf, true, false);
                        }

                        formData.push({
                            form: pageDetails.forms[formKey],
                            password: pf,
                            username: uf
                        });
                        break;
                    }
                }
            }
        }

        return formData;
    };

    AutofillService.prototype.doAutoFill = function (options) {
        var deferred = Q.defer();
        var self = this,
            totpPromise = null;

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var tab = null;
            if (tabs.length > 0) {
                tab = tabs[0];
            }
            else {
                deferred.reject();
                return;
            }

            if (!tab || !options.cipher || !options.pageDetails || !options.pageDetails.length) {
                deferred.reject();
                return;
            }

            var didAutofill = false;
            for (var i = 0; i < options.pageDetails.length; i++) {
                // make sure we're still on correct tab
                if (options.pageDetails[i].tab.id !== tab.id || options.pageDetails[i].tab.url !== tab.url) {
                    continue;
                }

                var fillScript = generateFillScript(self, options.pageDetails[i].details, {
                    skipUsernameOnlyFill: options.skipUsernameOnlyFill || false,
                    cipher: options.cipher
                });
                if (!fillScript || !fillScript.script || !fillScript.script.length) {
                    continue;
                }

                didAutofill = true;
                if (!options.skipLastUsed) {
                    self.cipherService.updateLastUsedDate(options.cipher.id);
                }

                chrome.tabs.sendMessage(tab.id, {
                    command: 'fillForm',
                    fillScript: fillScript
                }, { frameId: options.pageDetails[i].frameId });

                if (options.cipher.type !== self.constantsService.cipherType.login || totpPromise ||
                    (options.fromBackground && self.utilsService.isFirefox()) || options.skipTotp ||
                    !options.cipher.login.totp || !self.tokenService.getPremium()) {
                    continue;
                }

                totpPromise = self.totpService.isAutoCopyEnabled().then(function (enabled) {
                    if (enabled) {
                        /* jshint ignore:start */
                        return self.totpService.getCode(options.cipher.login.totp);
                        /* jshint ignore:end */
                    }

                    return null;
                }).then(function (code) {
                    if (code) {
                        /* jshint ignore:start */
                        self.utilsService.copyToClipboard(code);
                        /* jshint ignore:end */
                    }

                    return code;
                });
            }

            if (didAutofill) {
                if (totpPromise) {
                    totpPromise.then(function (totpCode) {
                        deferred.resolve(totpCode);
                    });
                }
                else {
                    deferred.resolve();
                }
            }
            else {
                deferred.reject();
            }
        });

        return deferred.promise;
    };

    AutofillService.prototype.doAutoFillForLastUsedLogin = function (pageDetails, fromCommand) {
        var self = this;

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var tab = null;
            if (tabs.length > 0) {
                tab = tabs[0];
            }

            if (!tab || !tab.url) {
                return;
            }

            var tabDomain = self.utilsService.getDomain(tab.url);
            if (!tabDomain) {
                return;
            }

            self.cipherService.getLastUsedForDomain(tabDomain).then(function (cipher) {
                if (!cipher) {
                    return;
                }

                self.doAutoFill({
                    cipher: cipher,
                    pageDetails: pageDetails,
                    fromBackground: true,
                    skipTotp: !fromCommand,
                    skipLastUsed: true,
                    skipUsernameOnlyFill: !fromCommand
                });
            });
        });
    };

    function generateFillScript(self, pageDetails, options) {
        if (!pageDetails || !options.cipher) {
            return null;
        }

        var fillScript = {
            documentUUID: pageDetails.documentUUID,
            script: [],
            autosubmit: null,
            properties: {},
            options: {},
            metadata: {}
        };

        var filledFields = {},
            i = 0,
            fields = options.cipher.fields;

        if (fields && fields.length) {
            var fieldNames = [];

            for (i = 0; i < fields.length; i++) {
                if (fields[i].name && fields[i].name !== '') {
                    fieldNames.push(fields[i].name.toLowerCase());
                }
                else {
                    fieldNames.push(null);
                }
            }

            for (i = 0; i < pageDetails.fields.length; i++) {
                var field = pageDetails.fields[i];
                if (filledFields.hasOwnProperty(field.opid) || !field.viewable) {
                    continue;
                }

                var matchingIndex = findMatchingFieldIndex(field, fieldNames);
                if (matchingIndex > -1) {
                    filledFields[field.opid] = field;
                    fillScript.script.push(['click_on_opid', field.opid]);
                    fillScript.script.push(['fill_by_opid', field.opid, fields[matchingIndex].value]);
                }
            }
        }

        switch (options.cipher.type) {
            case self.constantsService.cipherType.login:
                fillScript = generateLoginFillScript(fillScript, pageDetails, filledFields, options);
                break;
            case self.constantsService.cipherType.card:
                fillScript = generateLoginFillScript(fillScript, pageDetails, filledFields, options);
                break;
            case self.constantsService.cipherType.identity:
                fillScript = generateLoginFillScript(fillScript, pageDetails, filledFields, options);
                break;
            default:
                return null;
        }

        return fillScript;
    }

    function generateLoginFillScript(fillScript, pageDetails, filledFields, options) {
        if (!options.cipher.login) {
            return null;
        }

        var passwordFields = [],
            passwords = [],
            usernames = [],
            pf = null,
            username = null,
            i = 0,
            login = options.cipher.login;

        if (!login.password || login.password === '') {
            // No password for this login. Maybe they just wanted to auto-fill some custom fields?
            fillScript = setFillScriptForFocus(filledFields, fillScript);
            return fillScript;
        }

        passwordFields = loadPasswordFields(pageDetails, false);
        if (!passwordFields.length) {
            // not able to find any viewable password fields. maybe there are some "hidden" ones?
            passwordFields = loadPasswordFields(pageDetails, true);
        }

        for (var formKey in pageDetails.forms) {
            var passwordFieldsForForm = [];
            for (i = 0; i < passwordFields.length; i++) {
                if (formKey === passwordFields[i].form) {
                    passwordFieldsForForm.push(passwordFields[i]);
                }
            }

            for (i = 0; i < passwordFieldsForForm.length; i++) {
                pf = passwordFieldsForForm[i];
                passwords.push(pf);

                if (login.username) {
                    username = findUsernameField(pageDetails, pf, false, false);

                    if (!username) {
                        // not able to find any viewable username fields. maybe there are some "hidden" ones?
                        username = findUsernameField(pageDetails, pf, true, false);
                    }

                    if (username) {
                        usernames.push(username);
                    }
                }
            }
        }

        if (passwordFields.length && !passwords.length) {
            // The page does not have any forms with password fields. Use the first password field on the page and the
            // input field just before it as the username.

            pf = passwordFields[0];
            passwords.push(pf);

            if (login.username && pf.elementNumber > 0) {
                username = findUsernameField(pageDetails, pf, false, true);

                if (!username) {
                    // not able to find any viewable username fields. maybe there are some "hidden" ones?
                    username = findUsernameField(pageDetails, pf, true, true);
                }

                if (username) {
                    usernames.push(username);
                }
            }
        }

        if (!passwordFields.length && !options.skipUsernameOnlyFill) {
            // No password fields on this page. Let's try to just fuzzy fill the username.
            for (i = 0; i < pageDetails.fields.length; i++) {
                var f = pageDetails.fields[i];
                if (f.viewable && (f.type === 'text' || f.type === 'email' || f.type === 'tel') &&
                    fieldIsFuzzyMatch(f, usernameFieldNames)) {
                    usernames.push(f);
                }
            }
        }

        for (i = 0; i < usernames.length; i++) {
            if (filledFields.hasOwnProperty(usernames[i].opid)) {
                continue;
            }

            filledFields[usernames[i].opid] = usernames[i];
            fillScript.script.push(['click_on_opid', usernames[i].opid]);
            fillScript.script.push(['fill_by_opid', usernames[i].opid, login.username]);
        }

        for (i = 0; i < passwords.length; i++) {
            if (filledFields.hasOwnProperty(passwords[i].opid)) {
                continue;
            }

            filledFields[passwords[i].opid] = passwords[i];
            fillScript.script.push(['click_on_opid', passwords[i].opid]);
            fillScript.script.push(['fill_by_opid', passwords[i].opid, login.password]);
        }

        fillScript = setFillScriptForFocus(filledFields, fillScript);
        return fillScript;
    }

    function generateCardFillScript(fillScript, pageDetails, filledFields, options) {
        if (!options.cipher.card) {
            return null;
        }

        var card = options.cipher.card;
    }

    function generateIdentityFillScript(fillScript, pageDetails, filledFields, options) {
        if (!options.cipher.identity) {
            return null;
        }

        var id = options.cipher.identity;
    }

    function loadPasswordFields(pageDetails, canBeHidden) {
        var arr = [];
        for (var i = 0; i < pageDetails.fields.length; i++) {
            if (pageDetails.fields[i].type === 'password' && (canBeHidden || pageDetails.fields[i].viewable)) {
                arr.push(pageDetails.fields[i]);
            }
        }

        return arr;
    }

    function findUsernameField(pageDetails, passwordField, canBeHidden, withoutForm) {
        var usernameField = null;
        for (var i = 0; i < pageDetails.fields.length; i++) {
            var f = pageDetails.fields[i];
            if (f.elementNumber >= passwordField.elementNumber) {
                break;
            }

            if ((withoutForm || f.form === passwordField.form) && (canBeHidden || f.viewable) &&
                (f.type === 'text' || f.type === 'email' || f.type === 'tel')) {
                usernameField = f;

                if (findMatchingFieldIndex(f, usernameFieldNames) > -1) {
                    // We found an exact match. No need to keep looking.
                    break;
                }
            }
        }

        return usernameField;
    }

    function findMatchingFieldIndex(field, names) {
        var matchingIndex = -1;
        if (field.htmlID && field.htmlID !== '') {
            matchingIndex = names.indexOf(field.htmlID.toLowerCase());
        }
        if (matchingIndex < 0 && field.htmlName && field.htmlName !== '') {
            matchingIndex = names.indexOf(field.htmlName.toLowerCase());
        }
        if (matchingIndex < 0 && field['label-tag'] && field['label-tag'] !== '') {
            matchingIndex = names.indexOf(field['label-tag'].replace(/(?:\r\n|\r|\n)/g, '').trim().toLowerCase());
        }
        if (matchingIndex < 0 && field.placeholder && field.placeholder !== '') {
            matchingIndex = names.indexOf(field.placeholder.toLowerCase());
        }

        return matchingIndex;
    }

    function fieldIsFuzzyMatch(field, names) {
        if (field.htmlID && field.htmlID !== '' && fuzzyMatch(names, field.htmlID.toLowerCase())) {
            return true;
        }
        if (field.htmlName && field.htmlName !== '' && fuzzyMatch(names, field.htmlName.toLowerCase())) {
            return true;
        }
        if (field['label-tag'] && field['label-tag'] !== '' &&
            fuzzyMatch(names, field['label-tag'].replace(/(?:\r\n|\r|\n)/g, '').trim().toLowerCase())) {
            return true;
        }
        if (field.placeholder && field.placeholder !== '' && fuzzyMatch(names, field.placeholder.toLowerCase())) {
            return true;
        }

        return false;
    }

    function fuzzyMatch(options, value) {
        if (!options || !options.length || !value || value === '') {
            return false;
        }

        for (var i = 0; i < options.length; i++) {
            if (value.indexOf(options[i]) > -1) {
                return true;
            }
        }

        return false;
    }

    function setFillScriptForFocus(filledFields, fillScript) {
        var lastField = null,
            lastPasswordField = null;

        for (var opid in filledFields) {
            if (filledFields.hasOwnProperty(opid) && filledFields[opid].viewable) {
                lastField = filledFields[opid];

                if (filledFields[opid].type === 'password') {
                    lastPasswordField = filledFields[opid];
                }
            }
        }

        // Prioritize password field over others.
        if (lastPasswordField) {
            fillScript.script.push(['focus_by_opid', lastPasswordField.opid]);
        }
        else if (lastField) {
            fillScript.script.push(['focus_by_opid', lastField.opid]);
        }

        return fillScript;
    }
}
