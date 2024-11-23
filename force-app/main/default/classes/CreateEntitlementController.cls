public without sharing class CreateEntitlementController {
    @AuraEnabled
    public static void createEntitlement(String entitlementJson, String lineItemsJson){
        try {
            Entitlement__c entitlementToLoad = (Entitlement__c)JSON.deserialize(entitlementJson, Entitlement__c.class);
            insert entitlementToLoad;

            List<Entitlement_Line_Item__c> lineItemsToLoad = (List<Entitlement_Line_Item__c>)JSON.deserialize(lineItemsJson, List<Entitlement_Line_Item__c>.class);
            for(Entitlement_Line_Item__c eachLi : lineItemsToLoad){
                eachLi.Entitlement__c = entitlementToLoad.Id;
            }
            insert lineItemsToLoad;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}