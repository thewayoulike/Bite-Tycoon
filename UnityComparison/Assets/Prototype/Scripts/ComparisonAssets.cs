using System;
using System.Linq;
using UnityEngine;

public sealed partial class BusinessGameBridge
{
    public GameObject[] comparisonTrees=Array.Empty<GameObject>(), comparisonProps=Array.Empty<GameObject>(), comparisonBoats=Array.Empty<GameObject>();
    public GameObject comparisonPlane,comparisonTruck;
    GameObject ComparisonProp(Transform parent,string key,Vector3 at,float width,float angle=0)
    {
        var prefab=comparisonProps.FirstOrDefault(p=>p&&p.name==key);
        if(!prefab)return null;
        var root=Group(parent,"Comparison "+key);
        var model=Instantiate(prefab,root);
        var b=LocalModelBounds(model.transform);
        float scale=width/Mathf.Max(.001f,b.size.x);
        model.transform.localScale=Vector3.one*scale;
        model.transform.localPosition=-new Vector3(b.center.x,b.min.y,b.center.z)*scale;
        root.localPosition=at;root.localRotation=Quaternion.Euler(0,angle,0);
        return root.gameObject;
    }
    void ComparisonFitout(Transform root,BusinessProperty property)
    {
        if(comparisonProps.Length==0)return;
        if(property.kind is "restaurant" or "cafe"){
            RestaurantCharacter(root,property);
            ComparisonProp(root,"CoffeeMachine",new(-5.5f,1.72f,6.8f),1.3f,180);
            ComparisonProp(root,"KitchenRack",new(5.4f,1.72f,7.2f),1.5f,180);
            ComparisonProp(root,"FastFoodDisplay",new(2.8f,1.72f,6.6f),1.3f);
            ComparisonProp(root,"BreakfastBoard",new(-2.2f,1.72f,6.6f),.42f);
            ComparisonProp(root,"KitchenBread",new(0,1.72f,6.7f),.22f);
        }else if(property.kind=="shop"&&frame.floor==0){
            // Display cases are decorative fixtures. Sale stock remains controlled
            // by the existing stock-facing objects and financial simulation.
            ComparisonProp(root,"KitchenRack",new(8.9f,.44f,7.2f),1.2f,180);
        }
    }
    void ComparisonMeal(GameObject table,BusinessContents state,BusinessTable t)
    {
        var meal=table.transform.Find("Comparison plated meal");
        bool eating=state.customers?.Any(c=>c.table==t.id&&c.state=="eating")==true;
        if(eating&&!meal){
            var group=Group(table.transform,"Comparison plated meal");
            ComparisonProp(group,"ServedMeal",new(0,1.23f,0),.3f);
            ComparisonProp(group,"BreakfastCup",new(.43f,1.23f,0),.11f);
        }else if(!eating&&meal)Destroy(meal.gameObject);
    }
}
