import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class RedirectToCreateEntitlement extends NavigationMixin(LightningElement) {
    _recordId;

    @api
    get recordId() {
        return this._recordId;
    }

    set recordId(recordId) {
        if (recordId !== this._recordId) {
            this._recordId = recordId;
    }
    }

    @api invoke() {
        this[NavigationMixin.Navigate]({
            type: "standard__navItemPage",
            attributes: {
              apiName: 'Entitlement_Page',
            },
            state: {
                c__recordId: this.recordId,
            }
        });
    }
}