import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class RedirectToManageAddOns extends NavigationMixin(LightningElement) {
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
              apiName: 'Manage_Add_Ons',
            },
            state: {
                c__recordId: this.recordId,
            }
        });
    }
}