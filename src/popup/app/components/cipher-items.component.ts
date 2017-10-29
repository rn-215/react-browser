import * as template from './cipher-items.component.html';

class CipherItemsController implements ng.IController {
    onSelected: Function;
    onView: Function;

    constructor(private i18nService: any) {

    }

    public view(cipher: any) {
        return this.onView()(cipher);
    }

    public select(cipher: any) {
        return this.onSelected()(cipher);
    }

}

export const CipherItemsComponent = {
    bindings: {
        ciphers: '<',
        selectionTitle: '<',
        onView: '&',
        onSelected: '&'
    },
    template: template,
    controller: CipherItemsController
}
