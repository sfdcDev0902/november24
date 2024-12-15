import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin, CurrentPageReference } from "lightning/navigation";
import createEntitlement from '@salesforce/apex/CreateEntitlementController.createEntitlement';
import uploadFile from '@salesforce/apex/CreateEntitlementController.uploadFile';

const ACCOUNT_OBJ_API_NAME = 'Account';
const ENTITLEMENT_OBJ_API_NAME = 'Entitlement__c';
const LINEITEM_OBJ_API_NAME = 'Entitlement_Line_Item__c';
const ENTITLEMENT_ACCOUNT_LOOKUP_FIELD = 'Account__c';
const LINEITEM_ENTITLEMENT_LOOKUP_FIELD = 'Entitlement__c';

const ACCFIELDS = 'Name, Phone, AccountNumber, Website';
const ENTFIELDS = 'Name, Entitlemen_Date__c, Sales_Rep__c, Purchase_Order__c, Invoice_ID__c, Invoice_ID__c, Entitlement_Note__c';
const LINEITEMFIELDS = '{"summaryFields":[{"label":"Catalog Item ID","fieldName":"Catalog_Item__c","dataType":"text","value":"","isRequired":true,"isLookup":true,"lookupDetails": {"objectApiName":"Catalog__c"}},{"label":"Effective Date","fieldName":"Effective_Date__c","dataType":"date","value":"","isRequired":false,"validation":{"validationFormula":"eachLineSummaryField.Effective_Date__c < eachLineSummaryField.Expiration_Date__c","validationMessage":"Effective Date should be less than Expiration Date"}},{"label":"Expiration Date","fieldName":"Expiration_Date__c","dataType":"date","value":"","isRequired":false,"validation":{"validationFormula":"eachLineSummaryField.Effective_Date__c < eachLineSummaryField.Expiration_Date__c","validationMessage":"Expiration Date should be greater than Effective Date"}},{"label":"Qty","fieldName":"Qty__c","dataType":"number","value":"1","isRequired":true},{"label":"Status","fieldName":"Status__c","dataType":"text","value":"Active","isRequired":false,"isPicklist":true,"picklistValues": [{"label":"ACTIVE","value":"ACTIVE"},{"label":"INACTIVE","value":"INACTIVE"},{"label":"ACTIVE AND INACTIVE","value":"ACTIVE AND INACTIVE"}]}],"detailFields":[{"label":"License Code","fieldName":"Activation_code__c","dataType":"text","value":"","isRequired":false},{"label":"License Model","fieldName":"License_Model__c","dataType":"text","value":"","isRequired":false,"isLookup":true,"lookupDetails": {"objectApiName":"License_Model__c"}}]}';

export default class CreateEntitlement extends NavigationMixin(LightningElement) {
    @api recordId;
    @api accountFields = ACCFIELDS;
    @api entitlementFields = ENTFIELDS;
    @api lineItemFieldsObject = LINEITEMFIELDS;
    @api objectApiNameAccount = ACCOUNT_OBJ_API_NAME;
    @api objectApiNameEntitlement = ENTITLEMENT_OBJ_API_NAME;
    @api objectApiNameLineItem = LINEITEM_OBJ_API_NAME;
    @api fieldApiNameEntitlementToAccount = ENTITLEMENT_ACCOUNT_LOOKUP_FIELD;
    @api fieldApiNameLineItemToEntitlement = LINEITEM_ENTITLEMENT_LOOKUP_FIELD;
    @api successMessage;
    @api errorMessage;
    @api validationsErrorMessage;

    @track lineItems = new Array();

    accountFieldArray = new Array();
    entitlementFieldArray = new Array();
    linesToAdd = 1;
    expandedSectionColSpan;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
       if (currentPageReference) {
          this.recordId = currentPageReference.state?.c__recordId;
       }
    }

    connectedCallback() {
        this.accountFieldArray = this.accountFields?.replaceAll(' ','')?.split(',');
        this.entitlementFieldArray = this.entitlementFields?.replaceAll(' ','')?.split(',');
        this.lineItemFieldsObject = JSON.parse(this.lineItemFieldsObject);

        this.expandedSectionColSpan = 3 + this.lineItemFieldsObject.summaryFields.length;
        this.linesToAdd = 1;
        this.addLines();
    }

    setLinesToAdd(event){
        this.linesToAdd = event.target.value;
    }

    addLines(event){
        if(!this.linesToAdd > 0){
            this.linesToAdd = 1;
        }
        for(let index = 0; index < this.linesToAdd; index++){
            let lineToAdd = JSON.parse(JSON.stringify(this.lineItemFieldsObject));
            lineToAdd.lineNumber = this.lineItems.length + 1;
            lineToAdd.isExpanded = false;
            lineToAdd.expandOrCollapseIcon = 'utility:chevronright';
            this.lineItems.push(lineToAdd);
        }
    }

    expandOrCollapseSection(event){
        let relevantLine = event.target.dataset.id;
        this.lineItems.forEach(eachLine => {
            if(eachLine.lineNumber == relevantLine){
                if(eachLine.isExpanded){
                    eachLine.isExpanded = false;
                    eachLine.expandOrCollapseIcon = 'utility:chevronright';
                } else{
                    eachLine.isExpanded = true;
                    eachLine.expandOrCollapseIcon = 'utility:chevrondown';
                }
            }
        });
    }

    expandCollapseBtnLabel = 'Expand All';
    
    doExpandCollapseAll(event){
        this.lineItems.forEach(eachLine => {
            if(this.expandCollapseBtnLabel == 'Expand All'){
                eachLine.isExpanded = true;
                eachLine.expandOrCollapseIcon = 'utility:chevrondown';
            } else{
                eachLine.isExpanded = false;
                eachLine.expandOrCollapseIcon = 'utility:chevronright';
            }
        });
        if(this.expandCollapseBtnLabel == 'Expand All'){
            this.expandCollapseBtnLabel = 'Collapse All';
        } else{
            this.expandCollapseBtnLabel = 'Expand All';
        }
    }

    deleteRow(event){
        let relevantLine = event.target.dataset.id;
        let indexToRemove;
        this.lineItems.forEach( (eachLine, index) => {
            if(eachLine.lineNumber == relevantLine){
                indexToRemove = index;
            }
        });
        this.lineItems.splice(indexToRemove, 1);
        this.resetLineNumbers();
    }

    resetLineNumbers(){
        this.lineItems.forEach( (eachLine, index)  => {
            eachLine.lineNumber = index + 1;
        });
    }

    setLineItemFields(event){
        let relevantLine = event.target.dataset.id;
        let fieldName = event.target.dataset.name;
        let value = event.target.value;
        if(event.target.tagName == 'LIGHTNING-RECORD-PICKER'){
            value = event.detail.recordId;
        }
        this.lineItems.forEach( (eachLine) => {
            if(eachLine.lineNumber == relevantLine){
                eachLine.summaryFields.forEach( (eachLineSummaryField) => {
                    if(eachLineSummaryField.fieldName == fieldName){
                        eachLineSummaryField.value = value;
                    }
                });
                eachLine.detailFields.forEach( (eachLineDetailField) => {
                    if(eachLineDetailField.fieldName == fieldName){
                        eachLineDetailField.value = value;
                    }
                });
            }
        });
    }

    onCreate(){
        let fieldsToSubmit = new Object();
        let entitlementFields = this.template.querySelectorAll("lightning-input-field[data-id=entitlementFields]");
        entitlementFields.forEach(eachField => {
            if(eachField.value != undefined && eachField.value != null && eachField.value != ""){
                fieldsToSubmit[eachField.fieldName] = eachField.value;
            }
        })
        fieldsToSubmit['sobjecttype'] = this.objectApiNameEntitlement;
        this.createLineItems(fieldsToSubmit);
        //this.template.querySelector('lightning-record-edit-form').submit(fieldsToSubmit);
    }

    createLineItems(entitlementFieldsToSubmit){
        
        //let parentId = event.detail.id;
        let lineItemFields = new Array();
        this.lineItems.forEach( (eachLine) => {
            const fields = {};
            fields['sobjecttype'] = this.objectApiNameLineItem;
            eachLine?.summaryFields?.forEach( (eachLineSummaryField) => {
                if(eachLineSummaryField.value != undefined && eachLineSummaryField.value != null && eachLineSummaryField.value != ""){
                    fields[eachLineSummaryField.fieldName] = eachLineSummaryField.value;
                }
            });
            eachLine?.detailFields?.forEach( (eachLineDetailField) => {
                if(eachLineDetailField.value != undefined && eachLineDetailField.value != null && eachLineDetailField.value != ""){
                    fields[eachLineDetailField.fieldName] = eachLineDetailField.value;
                }
            });
            eachLine?.otherFields?.forEach( (eachLineOtherField) => {
                if(eachLineOtherField.value != undefined && eachLineOtherField.value != null && eachLineOtherField.value != ""){
                    fields[eachLineOtherField.fieldName] = eachLineOtherField.value;
                }
            });
            lineItemFields.push(fields);
        });
        
        if(this.isDataValid(lineItemFields)){
            createEntitlement({
                entitlementJson: JSON.stringify(entitlementFieldsToSubmit),
                lineItemsJson: JSON.stringify(lineItemFields)
            }).then(result => {
                const toastEvt = new ShowToastEvent({
                    variant: "success",
                    title: "Success",
                    message: this.successMessage ? this.successMessage : "Entitlement Created!"
                });
                this.dispatchEvent(toastEvt);
                this.navigateBack();
            }).catch(error => {
                const toastEvt = new ShowToastEvent({
                    variant: "error",
                    title: "Something went wrong!",
                    message: this.errorMessage ? this.errorMessage : error.body.message
                });
                this.dispatchEvent(toastEvt);
            });
        }
    }

    isDataValid(lineItemFields){
        let hasErrors = false;
        
        var self = this;
        lineItemFields.forEach( (lineItem, index) => {
            self.lineItemFieldsObject.summaryFields.forEach( eachField => {
                let fieldUi = this.template.querySelector(`lightning-input[data-id='${index+1}'][data-name='${eachField.fieldName}']`);
                if(fieldUi == null || fieldUi == undefined){
                    fieldUi = this.template.querySelector(`lightning-record-picker[data-id='${index+1}'][data-name='${eachField.fieldName}']`);
                    if(fieldUi == null || fieldUi == undefined){
                        fieldUi = this.template.querySelector(`lightning-combobox[data-id='${index+1}'][data-name='${eachField.fieldName}']`);
                    }
                }
                if(fieldUi){
                    if(lineItem[eachField.fieldName] != undefined && lineItem[eachField.fieldName] != null && lineItem[eachField.fieldName] != ""){
                        if(eachField.validation){
                            if(!eval(eachField.validation.validationFormula)){
                                fieldUi.setCustomValidity(eachField.validation.validationMessage);
                                fieldUi.reportValidity();
                                hasErrors = true;
                            } else{
                                fieldUi.setCustomValidity('');
                                fieldUi.reportValidity();
                            }
                        } else{
                            fieldUi.setCustomValidity('');
                            fieldUi.reportValidity();
                        }
                    } else if(lineItem[eachField.fieldName] == undefined || lineItem[eachField.fieldName] == null || lineItem[eachField.fieldName] == ""){
                        if(eachField.isRequired){
                            fieldUi.setCustomValidity('Complete this field.');
                            fieldUi.reportValidity();
                            hasErrors = true;
                        }
                    }
                }
            });
            self.lineItemFieldsObject.detailFields.forEach( eachField => {
                let fieldUi = this.template.querySelector(`lightning-input[data-id='${index+1}'][data-name='${eachField.fieldName}']`);
                if(fieldUi == null || fieldUi == undefined){
                    fieldUi = this.template.querySelector(`lightning-record-picker[data-id='${index+1}'][data-name='${eachField.fieldName}']`);
                    if(fieldUi == null || fieldUi == undefined){
                        fieldUi = this.template.querySelector(`lightning-combobox[data-id='${index+1}'][data-name='${eachField.fieldName}']`);
                    }
                }
                if(fieldUi){
                    if(lineItem[eachField.fieldName] != undefined && lineItem[eachField.fieldName] != null && lineItem[eachField.fieldName] != ""){
                        if(eachField.validation){
                            if(!eval(eachField.validation.validationFormula)){
                                fieldUi.setCustomValidity(eachField.validation.validationMessage);
                                fieldUi.reportValidity();
                                hasErrors = true;
                            } else{
                                fieldUi.setCustomValidity('');
                                fieldUi.reportValidity();
                            }
                        } else{
                            fieldUi.setCustomValidity('');
                            fieldUi.reportValidity();
                        }
                    } else if(lineItem[eachField.fieldName] == undefined || lineItem[eachField.fieldName] == null || lineItem[eachField.fieldName] == ""){
                        if(eachField.isRequired){
                            fieldUi.setCustomValidity('Complete this field.');
                            fieldUi.reportValidity();
                            hasErrors = true;
                        }
                    }
                }
            });
        });

        if(hasErrors){
            const toastEvt = new ShowToastEvent({
                variant: "error",
                title: "Error",
                message: this.validationsErrorMessage ? this.validationsErrorMessage : "Please fix the validations before proceeding!"
            });
            this.dispatchEvent(toastEvt);
        }

        return !hasErrors;
    }

    navigateBack(){
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                actionName: 'view',
            },
        })
    }

    onFileUpload(event){
        let relevantLine = event.target.dataset.id;
        const file = event.target.files[0];
        var reader = new FileReader();
        reader.onload = () => {
            var base64 = reader.result.split(',')[1];
            let fileData = {
                'filename': file.name,
                'base64': base64,
                'recordId': this.recordId,
                'fileContent': atob(base64)
            };
            if(fileData.filename.includes('.txt')){
                uploadFile({
                    base64: fileData.base64,
                    filename: fileData.filename,
                    recordId: this.recordId
                }).then(result => {
                    if(result){
                        this.lineItems.forEach( (eachLine) => {
                            if(eachLine.lineNumber == relevantLine){
                                eachLine.otherFields = [
                                    { fieldName: 'License_Information__c', value: fileData.fileContent},
                                    { fieldName: 'License_File_Reference__c', value: result}
                                ];
                                eachLine.fileName = fileData.filename;
                            }
                        });
                    }
                }).catch(error => {
                    const toastEvt = new ShowToastEvent({
                        variant: "error",
                        title: "Something went wrong!",
                        message: this.errorMessage ? this.errorMessage : error.body.message
                    });
                    this.dispatchEvent(toastEvt);
                });
            } else{
                const toastEvt = new ShowToastEvent({
                    variant: "error",
                    title: "Incorrect File Format!",
                    message: 'Allowed file format is Text (.txt)'
                });
                this.dispatchEvent(toastEvt);
            }
        }
        reader.readAsDataURL(file)
    }
}