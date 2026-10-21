using System.Linq;
using UnityEngine;

public sealed partial class BusinessGameBridge
{
    void RetailUpperStoreys(Transform root,BusinessProperty p,Transform model)
    {
        if(p.floors<2)return;
        var b=LocalModelBounds(model);
        RetailStoreys(root,p,1,new Vector3(b.center.x,5.55f,b.center.z),b.size.x-.2f,18.4f);
    }
    void RetailExistingStoreys(Transform root,BusinessProperty p)
    {
        var existing=sharedCity?sharedCity.Find("Parcel:"+p.siteId):null;
        if(!existing)return;
        var rs=existing.GetComponentsInChildren<Renderer>();if(rs.Length==0)return;
        var b=rs[0].bounds;foreach(var r in rs)b.Encapsulate(r.bounds);
        var at=root.InverseTransformPoint(new Vector3(b.center.x,b.max.y,b.center.z));
        RetailStoreys(root,p,Mathf.Max(1,p.exteriorFloors),at,b.size.x-.1f,b.size.z-.1f);
    }
    void RetailStoreys(Transform root,BusinessProperty p,int first,Vector3 at,float width,float depth)
    {
        var levels=Group(root,"Supermarket upper storeys");levels.localPosition=at;
        var trim=ColorMat("CBD2CB");var panel=ColorMat("526C68");
        for(int floor=first;floor<p.floors;floor++){
            var storey=Group(levels,"Retail floor "+(floor+1));storey.localPosition=Vector3.up*(floor-first)*3.9f;
            Box(storey,"Upper floor slab",new(0,.12f,0),new(width,.24f,depth),trim);
            Box(storey,"Rear wall",new(0,1.85f,depth/2-.12f),new(width,3.5f,.24f),panel);
            foreach(int side in new[]{-1,1})Box(storey,"Side wall",new(side*(width/2-.12f),1.85f,0),new(.24f,3.5f,depth),panel);
            Box(storey,"Upper display glazing",new(0,1.95f,-depth/2),new(width-.5f,2.65f,.06f),glass);
            for(int bay=0;bay<=8;bay++)Box(storey,"Upper window mullion",new(-width/2+bay*width/8,1.95f,-depth/2-.05f),new(.12f,2.75f,.12f),metal);
            Box(storey,"Upper roof",new(0,3.8f,0),new(width+.15f,.22f,depth+.15f),trim);
            Box(storey,"Upper retail fascia",new(0,.53f,-depth/2-.07f),new(width,.58f,.14f),panel);
            // Visible electronics display behind the glass; no fictitious sale stock.
            for(int bay=-2;bay<=2;bay++){
                Box(storey,"Display pedestal",new(bay*width/6,.72f,-depth/2+1.25f),new(1.6f,1.1f,.85f),trim);
                Box(storey,"Display television",new(bay*width/6,1.77f,-depth/2+1.25f),new(1.5f,.85f,.12f),metal);
                Box(storey,"Display screen",new(bay*width/6,1.77f,-depth/2+1.17f),new(1.39f,.74f,.02f),ColorMat(bay%2==0?"638B96":"7A9680"));
            }
        }
    }
}
