public without sharing class CreateEntitlementController {
    @AuraEnabled
    public static void createEntitlement(String entitlementJson, String lineItemsJson){
        try {
            Entitle_Account__c entitlementToLoad = (Entitle_Account__c)JSON.deserialize(entitlementJson, Entitle_Account__c.class);
            insert entitlementToLoad;
            
            List< Entitle_Line_Item__c > lineItemsToLoad = (List< Entitle_Line_Item__c >)JSON.deserialize(lineItemsJson, List< Entitle_Line_Item__c >.class);
            for(Entitle_Line_Item__c eachLi : lineItemsToLoad){
                eachLi.Entitle_Account__c = entitlementToLoad.Id;
            }
            insert lineItemsToLoad;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static String uploadFile(String base64, String filename, String recordId) {
        ContentVersion cv = createContentVersion(base64, filename);
        String contentDocumentId = createContentLink(cv.Id, recordId);
        if (cv == null) { return null; }
        return contentDocumentId;
    }

    private static ContentVersion createContentVersion(String base64, String filename) {
        ContentVersion cv = new ContentVersion();
        cv.VersionData = EncodingUtil.base64Decode(base64);
        cv.Title = filename;
        cv.PathOnClient = filename;
        try {
            insert cv;
            return cv;
        } catch(DMLException e) {
            System.debug(e);
            return null;
        }
    }
    
    private static String createContentLink(String contentVersionId, String recordId) {
        if (contentVersionId == null || recordId == null) { return null; }
        ContentDocumentLink cdl = new ContentDocumentLink();
        String contentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id =: contentVersionId].ContentDocumentId;
        cdl.ContentDocumentId = contentDocumentId;
        cdl.LinkedEntityId = recordId;
        cdl.ShareType = 'V';
        try {
            insert cdl;
            return contentDocumentId;
        } catch(DMLException e) {
            System.debug(e);
            return null;
        }
    }
}