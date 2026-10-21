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
        var meals=t.dirty?Array.Empty<BusinessMeal>():t.meals??Array.Empty<BusinessMeal>();
        var marker=table.GetComponent<BusinessMealDisplay>();if(!marker)marker=table.AddComponent<BusinessMealDisplay>();
        string key=string.Join("|",meals.Select(m=>m.id));if(marker.signature==key)return;marker.signature=key;
        var old=table.transform.Find("Ordered dishes");if(old){old.gameObject.SetActive(false);Destroy(old.gameObject);}
        if(meals.Length==0)return;
        var group=Group(table.transform,"Ordered dishes");
        // Use the actual dining surface, including the imported cafe table.
        var surfaces=table.GetComponentsInChildren<Renderer>().Where(r=>r.name=="Dining tabletop"||r.name.Contains("CoffeeTable")||r.name.Contains("Table_8")).ToArray();
        float height=surfaces.Length>0?surfaces.Max(r=>table.transform.InverseTransformPoint(new Vector3(r.bounds.center.x,r.bounds.max.y,r.bounds.center.z)).y):1.31f;
        for(int n=0;n<Math.Min(6,meals.Length);n++){
            var at=meals.Length<=4?new Vector3(new[]{-.49f,.49f,0f,0f}[n],height+.008f,new[]{0f,0f,.39f,-.39f}[n]):new Vector3((n%3-1)*.47f,height+.008f,(n/3-.5f)*.48f);
            var dish=CreateDish(group,meals[n]);dish.localPosition=at;
        }
    }
}
public sealed class BusinessMealDisplay:MonoBehaviour {public string signature;}
