require('clipboard');
require('angular');

require('angular-animate');
const uiRouter = require('@uirouter/angularjs').default;
require('angular-toastr');

require('ngclipboard');

require('sweetalert');
require('angular-sweetalert');
require('angulartics');
require('angulartics-google-analytics');
require('ng-infinite-scroll');

require('../../scripts/analytics.js');
require('../../scripts/duo.js');
require('../../scripts/u2f.js');

require('../less/libs.less');
require('../less/popup.less');

import DirectivesModule from './directives/directives.module';
import ComponentsModule from './components/components.module';
import ToolsModule from './tools/tools.module';
import ServicesModule from './services/services.module';
import LockModule from './lock/lock.module';
import CurrentModule from './current/current.module';
import GlobalModule from './global/global.module';
import SettingsModule from './settings/settings.module';

// Model imports
import { Attachment } from '../../models/domain/attachment';
import { Card } from '../../models/domain/card';
import { Cipher } from '../../models/domain/cipher';
import { Field } from '../../models/domain/field';
import { Folder } from '../../models/domain/folder';
import { Identity } from '../../models/domain/identity';
import { Login } from '../../models/domain/login';
import { SecureNote } from '../../models/domain/secureNote';

import { AttachmentData } from '../../models/data/attachmentData';
import { CardData } from '../../models/data/cardData';
import { CipherData } from '../../models/data/cipherData';
import { FieldData } from '../../models/data/fieldData';
import { FolderData } from '../../models/data/folderData';
import { IdentityData } from '../../models/data/identityData';
import { LoginData } from '../../models/data/loginData';
import { SecureNoteData } from '../../models/data/secureNoteData';

import { CipherString } from '../../models/domain/cipherString';

import { CipherRequest } from '../../models/request/cipherRequest';
import { DeviceRequest } from '../../models/request/deviceRequest';
import { DeviceTokenRequest } from '../../models/request/deviceTokenRequest';
import { FolderRequest } from '../../models/request/folderRequest';
import { PasswordHintRequest } from '../../models/request/passwordHintRequest';
import { RegisterRequest } from '../../models/request/registerRequest';
import { TokenRequest } from '../../models/request/tokenRequest';
import { TwoFactorEmailRequest } from '../../models/request/twoFactorEmailRequest';

import { AttachmentResponse } from '../../models/response/attachmentResponse';
import { CipherResponse } from '../../models/response/cipherResponse';
import { DeviceResponse } from '../../models/response/deviceResponse';
import { DomainsResponse } from '../../models/response/domainsResponse';
import { ErrorResponse } from '../../models/response/errorResponse';
import { FolderResponse } from '../../models/response/folderResponse';
import { GlobalDomainResponse } from '../../models/response/globalDomainResponse';
import { IdentityTokenResponse } from '../../models/response/identityTokenResponse';
import { KeysResponse } from '../../models/response/keysResponse';
import { ListResponse } from '../../models/response/listResponse';
import { ProfileOrganizationResponse } from '../../models/response/profileOrganizationResponse';
import { ProfileResponse } from '../../models/response/profileResponse';
import { SyncResponse } from '../../models/response/syncResponse';

angular
    .module('bit', [
        uiRouter,
        'ngAnimate',
        'toastr',
        'angulartics',
        'angulartics.google.analytics',

        DirectivesModule,
        ComponentsModule,
        ServicesModule,

        GlobalModule,
        'bit.accounts',
        CurrentModule,
        'bit.vault',
        SettingsModule,
        ToolsModule,
        LockModule
    ]);

require('./config');
require('./accounts/accountsModule.js');
require('./accounts/accountsLoginController.js');
require('./accounts/accountsLoginTwoFactorController.js');
require('./accounts/accountsTwoFactorMethodsController.js');
require('./accounts/accountsHintController.js');
require('./accounts/accountsRegisterController.js');
require('./vault/vaultModule.js');
require('./vault/vaultController.js');
require('./vault/vaultViewGroupingController.js');
require('./vault/vaultAddCipherController.js');
require('./vault/vaultEditCipherController.js');
require('./vault/vaultViewCipherController.js');
require('./vault/vaultAttachmentsController.js');
require('./tools/toolsPasswordGeneratorHistoryController.js');

// $$ngIsClass fix issue with "class constructors must be invoked with |new|" on Firefox ESR
// ref: https://github.com/angular/angular.js/issues/14240
import { ActionButtonsController } from './components/action-buttons.component';
ActionButtonsController.$$ngIsClass = true;
import { CipherItemsController } from './components/cipher-items.component';
CipherItemsController.$$ngIsClass = true;
import { IconController } from './components/icon.component';
IconController.$$ngIsClass = true;
import { PopOutController } from './components/pop-out.component';
PopOutController.$$ngIsClass = true;
import { CurrentController } from './current/current.component';
CurrentController.$$ngIsClass = true;
import { LockController } from './lock/lock.component';
LockController.$$ngIsClass = true;
import { ExportController } from './tools/export.component';
ExportController.$$ngIsClass = true;
import { PasswordGeneratorController } from './tools/password-generator.component';
PasswordGeneratorController.$$ngIsClass = true;
import { ToolsController } from './tools/tools.component';
ToolsController.$$ngIsClass = true;
import { AddFolderController } from './settings/folders/add-folder.component';
AddFolderController.$$ngIsClass = true;
import { EditFolderController } from './settings/folders/edit-folder.component';
EditFolderController.$$ngIsClass = true;
import { FoldersController } from './settings/folders/folders.component';
FoldersController.$$ngIsClass = true;
import { AboutController } from './settings/about.component';
AboutController.$$ngIsClass = true;
import { CreditsController } from './settings/credits.component';
CreditsController.$$ngIsClass = true;
import { EnvironmentController } from './settings/environment.component';
EnvironmentController.$$ngIsClass = true;
import { OptionsController } from './settings/options.component';
OptionsController.$$ngIsClass = true;
import { HelpController } from './settings/help.component';
HelpController.$$ngIsClass = true;
import { PremiumController } from './settings/premium.component';
PremiumController.$$ngIsClass = true;
import { SettingsController } from './settings/settings.component';
SettingsController.$$ngIsClass = true;
import { SyncController } from './settings/sync.component';
SyncController.$$ngIsClass = true;
import { BaseController } from './global/base.controller';
BaseController.$$ngIsClass = true;
import { MainController } from './global/main.controller';
MainController.$$ngIsClass = true;
import { PrivateModeController } from './global/private-mode.controller';
PrivateModeController.$$ngIsClass = true;
import { TabsController } from './global/tabs.controller';
TabsController.$$ngIsClass = true;

// Bootstrap the angular application
angular.element(function () {
    angular.bootstrap(document, ['bit']);
});
