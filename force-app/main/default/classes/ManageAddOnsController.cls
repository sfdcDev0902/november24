public with sharing class ManageAddOnsController {
    @AuraEnabled
    public static List<sObject> fetchAddOns(String recordId, List<String> fieldsToQuery){
        try {
            Asset__c hwAssetRecord = [SELECT Id, Account__c FROM Asset__c WHERE Id=: recordId];

            String query = 'SELECT Id';
            for(String eachField : fieldsToQuery){
                query += ',' + eachField;
            }
            query += ' FROM Entitle_Line_Item__c WHERE Entitle_Account__r.Account__c = \'' + hwAssetRecord.Account__c + '\'';
            return Database.query(query);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static Boolean createAddOns(String addOnsJson, String recordId){
        try {
            List<License__c> addOnsToLoad = (List<License__c>)JSON.deserialize(addOnsJson, List<License__c>.class);
            for(License__c eachLi : addOnsToLoad){
                eachLi.H_W_Asset__c = recordId;
            }
            insert addOnsToLoad;
            return true;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}