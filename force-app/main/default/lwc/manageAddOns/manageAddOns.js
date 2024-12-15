import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin, CurrentPageReference } from "lightning/navigation";

import fetchAddOns from '@salesforce/apex/ManageAddOnsController.fetchAddOns';
import createAddOns from '@salesforce/apex/ManageAddOnsController.createAddOns';

const LINEITEMFIELDS = '{"summaryFields":[{"label":"Add On","fieldName":"Catalog_Item__r.Name","idField":"Catalog_Item__c","dataType":"recordLink","isRequired":false,"isReadOnly":true},{"label":"Activation Code","fieldName":"Activation_code__c","dataType":"text","isRequired":false,"isReadOnly":true},{"label":"System Entitlement Id","fieldName":"Entitle_Account__r.Name","idField":"Entitle_Account__c","dataType":"recordLink","isRequired":false,"isReadOnly":true},{"label":"License Model","fieldName":"License_Model__r.Name","idField":"License_Model__c","dataType":"recordLink","isRequired":false,"isReadOnly":true},{"label":"Expiration","fieldName":"Expiration_Date__c","dataType":"date","isRequired":false,"isReadOnly":true},{"label":"Available Units In Line Item","fieldName":"Available_Quantity__c","dataType":"number","isRequired":true,"isReadOnly":true},{"label":"Total Units In Line Item","fieldName":"Qty__c","dataType":"text","isRequired":false,"isReadOnly":true},{"label":"Qty To Add","fieldName":"Units_Allocated_To_Device__c","dataType":"text","value":"","isRequired":false,"isReadOnly":false,"validation":{"validationFormula":"eachRow.Units_Allocated_To_Device__c <= eachRow.Available_Quantity__c","validationMessage":"Quantity cannot be more than the Available Quantity"}}]}';

const SEARCHFILTERS = '[{"placeholder":"Activation Code","fieldName":"Activation_code__c","condition":"CT"},{"placeholder":"Add On Name","fieldName":"Catalog_Item__r.Name","condition":"CT"},{"placeholder":"Entitlement Name","fieldName":"Entitle_Account__r.Name","condition":"CT"}]';

export default class ManageAddOns extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiNameLicenses;
    @api addOnFieldsJson = LINEITEMFIELDS;
    @api searchFiltersJson = SEARCHFILTERS;
    @api entitlementLineItemLookupField;
    @api successMessage;
    @api errorMessage;

    @track addOnFields = {};
    @track searchFilters = [];
    @track addOnData = [];
    @track fullDataSet;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state?.c__recordId;
        }
    }

    connectedCallback() {
        this.addOnFields = JSON.parse(this.addOnFieldsJson);
        this.searchFilters = JSON.parse(this.searchFiltersJson);

        let fieldsToQuery = [];
        this.addOnFields.summaryFields.forEach(eachField => {
            if (!fieldsToQuery.includes(eachField.fieldName) && eachField.isReadOnly) {
                fieldsToQuery.push(eachField.fieldName);
            }
        });

        this.getAddOns(fieldsToQuery);
    }

    getAddOns(fieldsToQuery) {
        fetchAddOns({
            recordId: this.recordId,
            fieldsToQuery: fieldsToQuery
        }).then(result => {
            if (result) {
                result.forEach(element => {
                    let addOnDataEach = JSON.parse(JSON.stringify(this.addOnFields));
                    addOnDataEach.summaryFields.forEach(eachField => {
                        if (eachField.value == undefined) {
                            eachField.value = element[eachField.fieldName];
                            eachField.isDate = eachField.dataType == 'date';
                            eachField.isUrl = eachField.dataType == 'recordLink';
                        }
                        if (eachField.isUrl) {
                            if (this.getFieldValue(element, eachField.idField) && this.getFieldValue(element, eachField.fieldName)) {
                                eachField.value = '<a href=' + window.location.origin + '/' + this.getFieldValue(element, eachField.idField) + '>' + this.getFieldValue(element, eachField.fieldName) + '</a>'
                            }
                        }
                    });
                    addOnDataEach.additionalData = {};
                    addOnDataEach.additionalData.entitlementLineItem = element['Id'];
                    this.addOnData.push(addOnDataEach);
                });
                this.fullDataSet = JSON.parse(JSON.stringify(this.addOnData));
            }
        }).catch(error => {

        })
    }

    getFieldValue(data, key) {
        return key.split('.').reduce((o, k) => o?.[k], data);
    }

    filterData(event) {
        let searchedData = event.detail.value;
        let fieldName = event.target.dataset.column;
        let condition = event.target.dataset.condition;
        let dataToIterate;
        if (this.addOnData && this.addOnData.length == 0) {
            dataToIterate = JSON.parse(JSON.stringify(this.fullDataSet));
        } else {
            dataToIterate = JSON.parse(JSON.stringify(this.addOnData));
        }
        if (searchedData && searchedData != '') {
            let newData = [];
            dataToIterate.forEach(eachRow => {
                eachRow.summaryFields.forEach(eachField => {
                    if (eachField.fieldName == fieldName) {
                        if (condition == "CT" && eachField.value?.toUpperCase().includes(searchedData?.toUpperCase())) {
                            newData.push(eachRow);
                        }
                    }
                });
            });
            this.addOnData = newData;
        } else {
            this.addOnData = JSON.parse(JSON.stringify(this.fullDataSet));
        }

    }

    updateDataOnFile(event) {
        let dataIndex = event.target.dataset.index;
        let fieldName = event.target.dataset.name;
        this.addOnData.forEach((eachRecord, index) => {
            if (dataIndex == index) {
                eachRecord.summaryFields.forEach(eachField => {
                    if (eachField.fieldName == fieldName) {
                        eachField.value = event.detail.value;
                    }
                });
            }
        });
    }

    isDataValid() {
        let hasErrors = false;
        let finalDataArray = [];
        this.addOnData.forEach((eachRecord) => {
            let fieldsToSubmit = new Object();
            eachRecord.summaryFields.forEach(eachField => {
                fieldsToSubmit[eachField.fieldName] = eachField.value;
            });
            finalDataArray.push(fieldsToSubmit);
        });

        finalDataArray.forEach((eachRow, index) => {
            this.addOnFields.summaryFields.forEach(eachField => {
                if (eachField.isReadOnly == false) {
                    let fieldUi = this.template.querySelector(`lightning-input[data-index='${index}'][data-name='${eachField.fieldName}']`);
                    if (fieldUi) {
                        if (eachRow[eachField.fieldName] != undefined && eachRow[eachField.fieldName] != null && eachRow[eachField.fieldName] != "") {
                            if (eachField.validation) {
                                if (!eval(eachField.validation.validationFormula)) {
                                    fieldUi.setCustomValidity(eachField.validation.validationMessage);
                                    fieldUi.reportValidity();
                                    hasErrors = true;
                                } else {
                                    fieldUi.setCustomValidity('');
                                    fieldUi.reportValidity();
                                }
                            } else {
                                fieldUi.setCustomValidity('');
                                fieldUi.reportValidity();
                            }
                        } else if (eachRow[eachField.fieldName] == undefined || eachRow[eachField.fieldName] == null || eachRow[eachField.fieldName] == "") {
                            if (eachField.isRequired) {
                                fieldUi.setCustomValidity('Complete this field.');
                                fieldUi.reportValidity();
                                hasErrors = true;
                            }
                        }
                    }
                }
            });
        });
        return hasErrors;
    }

    doMapAddOns(event) {
        if (!this.isDataValid()) {
            let dataToDML = new Array();
            this.addOnData.forEach((eachRecord, index) => {
                let validToSubmit = false;
                let fieldsToSubmit = new Object();
                fieldsToSubmit['sobjecttype'] = this.objectApiNameLicenses;
                eachRecord.summaryFields.forEach(eachField => {
                    if (eachField.isReadOnly == false && eachField.value != undefined && eachField.value.trim() != "") {
                        validToSubmit = true;
                        fieldsToSubmit[eachField.fieldName] = eachField.value
                    }
                });
                fieldsToSubmit[this.entitlementLineItemLookupField] = eachRecord.additionalData.entitlementLineItem;
                if (validToSubmit) {
                    dataToDML.push(fieldsToSubmit);
                }
            });

            createAddOns({
                addOnsJson: JSON.stringify(dataToDML),
                recordId: this.recordId
            }).then(result => {
                if (result) {
                    const toastEvt = new ShowToastEvent({
                        variant: "success",
                        title: "Success",
                        message: this.successMessage ? this.successMessage : "Entitlement Created!"
                    });
                    this.dispatchEvent(toastEvt);
                    this.navigateBack();
                }
            }).catch(error => {
                const toastEvt = new ShowToastEvent({
                    variant: "error",
                    title: "Something went wrong!",
                    message: this.errorMessage ? this.errorMessage : error.body.message
                });
                this.dispatchEvent(toastEvt);
            })
        }

    }

    navigateBack() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                actionName: 'view',
            },
        })
    }
}