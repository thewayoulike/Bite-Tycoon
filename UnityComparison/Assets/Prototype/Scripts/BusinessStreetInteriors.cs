using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;

public sealed partial class BusinessGameBridge
{
    sealed class StreetRoom
    {
        public GameObject root;
        public readonly Dictionary<string,GameObject> tables=new(),people=new();
        public Transform[] stock=Array.Empty<Transform>(),fresh=Array.Empty<Transform>();
        public BusinessProperty property;
        public string interiorStyle;
    }
    readonly Dictionary<string,StreetRoom> streetRooms=new();
    float streetTimer;
    public GameObject[] furnishingAssets=Array.Empty<GameObject>(),foodAssets=Array.Empty<GameObject>();
    // Stable per address, independent of camera, frame order or session.
    GameObject ExteriorModel(BusinessProperty p)
    {
        var choices=p.kind=="shop"?marketExteriors:restaurantExteriors;
        var original=p.kind=="shop"?marketExterior:restaurantExterior;
        if(choices.Length==0||p.id is "diner" or "cafe" or "bistro" or "shop")return original;
        uint hash=2166136261;foreach(char c in p.id)hash=unchecked((hash^c)*16777619);
        int variant=p.design=="modern"?Math.Min(3,choices.Length-1):p.design=="classic"?2:(int)(hash%(choices.Length+1));
        return variant<choices.Length&&choices[variant]?choices[variant]:original;
    }

    bool IsInteriorView()=>frame?.properties?.Any(p=>p.id==frame.focus&&p.owned)==true&&frame.detail!="exterior"&&frame.detail!="street";
    bool StreetApplicable(BusinessProperty p)=>p.offer!="internal"&&p.kind is "restaurant" or "cafe" or "shop" or "hotel" or "apartments" or "plaza";
    BusinessProperty[] VisibleStreetProperties()
    {
        if(frame==null)return Array.Empty<BusinessProperty>();
        bool inside=IsInteriorView();
        var planes=GeometryUtility.CalculateFrustumPlanes(viewCamera);
        return frame.properties.Where(p=>{
            if(p.kind=="plaza"||inside&&p.id==frame.focus||p.preserveExterior||!StreetApplicable(p)||Vector3.Distance(viewCamera.transform.position,new(p.x,1,p.z))>=75)return false;
            float height=Mathf.Max(6,(p.floors+1)*2.9f);
            return GeometryUtility.TestPlanesAABB(planes,new Bounds(new(p.x,height/2,p.z),new(20,height,20)));
        }).OrderBy(p=>p.id==frame.focus?0:1)
          .ThenBy(p=>Vector3.Distance(viewCamera.transform.position,new(p.x,1,p.z)))
          .Take(4).ToArray();
    }

    // Only furnishings and moving people depend on camera distance. A property's
    // exterior belongs to its persistent architecture and must never swap here.
    void UpdateStreetInteriors()
    {
        if(frame==null)return;
        var nearby=VisibleStreetProperties();
        var wanted=new HashSet<string>(nearby.Select(p=>p.id));
        foreach(var id in streetRooms.Keys.Where(id=>!wanted.Contains(id)||!streetRooms[id].root).ToArray()){
            var old=streetRooms[id];if(old.root)Destroy(old.root);
            streetRooms.Remove(id);
        }
        foreach(var p in nearby){
            var style=p.kind is "restaurant" or "cafe"?RestaurantInteriorLook(frame.frontages?.FirstOrDefault(s=>s.id==p.id),p):"";
            if(streetRooms.TryGetValue(p.id,out var previous)&&previous.interiorStyle!=style){
                if(previous.root){previous.root.SetActive(false);Destroy(previous.root);}streetRooms.Remove(p.id);
            }
            if(streetRooms.ContainsKey(p.id))continue;
            if(!properties.TryGetValue(p.id,out var property))continue;
            var architecture=property.transform.Find("Building and site");
            var room=new StreetRoom{property=p,interiorStyle=style,root=Group(architecture,"Visible street interior").gameObject};
            streetRooms[p.id]=room;
            if(p.offer=="lease"&&!p.owned)continue; // A vacant lease really is an empty shell.
            if(p.kind is "restaurant" or "cafe" or "shop"){
                var template=p.kind=="shop"?marketInterior:restaurantInterior;
                var source=template.GetComponentsInChildren<Transform>(true).First(t=>t.name==(p.kind=="shop"?"Supermarket interior":"Restaurant interior"));
                var fitout=Instantiate(source,room.root.transform);
                fitout.localPosition=template.transform.InverseTransformPoint(source.position);
                TrimSampleTerrace(fitout,room.root.transform,p.kind=="shop");
                ApplyRestaurantPaint(room.root.transform,p);
                if(p.kind=="shop"){
                    var parts=room.root.GetComponentsInChildren<Transform>(true);
                    room.stock=parts.Where(t=>t.name=="Stock product").ToArray();room.fresh=parts.Where(t=>t.name=="Fresh produce").ToArray();
                    AddFoodDisplays(room.root.transform);
                }
            }else{
                BuildStreetLobby(room.root.transform,p);
            }
            ComparisonFitout(room.root.transform,p);
            var fill=Group(room.root.transform,"Window interior lighting").gameObject.AddComponent<Light>();
            fill.type=LightType.Point;fill.range=22;fill.intensity=38;fill.color=new(1,.89f,.76f);fill.shadows=LightShadows.None;fill.transform.localPosition=new(0,3,-2);
            foreach(var light in room.root.GetComponentsInChildren<Light>())if(light!=fill)light.intensity=12;
            StaticBatchingUtility.Combine(room.root);
        }
        RefreshStreetInteriors();SyncSharedLots();
    }
    // The original isolated showcase has a wide side terrace that overlaps the
    // city road. It is not part of the playable room or this property's footprint.
    void TrimSampleTerrace(Transform fitout,Transform coordinates,bool shop,bool keepEntrance=false)
    {
        foreach(Transform child in fitout){
            var rs=child.GetComponentsInChildren<Renderer>();if(rs.Length==0)continue;
            var bounds=rs[0].bounds;foreach(var r in rs)bounds.Encapsulate(r.bounds);
            var local=coordinates.InverseTransformPoint(bounds.center);
            if(local.x<-8.1f&&!shop||!keepEntrance&&local.z<-7.9f)child.gameObject.SetActive(false);
        }
    }
    void RefreshStreetInteriors()
    {
        foreach(var room in streetRooms.Values){
            if(!room.root)continue;
            var p=room.property;
            if(p.offer=="lease"&&!p.owned)continue;
            var state=frame.frontages?.FirstOrDefault(s=>s.id==p.id);
            if(p.kind is "restaurant" or "cafe"){
                state??=new BusinessContents{speed=0,tables=new[]{
                    new BusinessTable{id="display-1",x=-11,z=12},new BusinessTable{id="display-2",x=11,z=12},
                    new BusinessTable{id="display-3",x=-11,z=1},new BusinessTable{id="display-4",x=11,z=1}}};
                RestaurantState(p,state,room.root,room.tables,room.people);
            }else if(p.kind=="shop"){
                var stock=(state?.stock??new[]{"apples","bananas","carrots","tomatoes","bread","milk","rice","juice"}.Select(id=>new BusinessStock{id=id,name=id,category=id is "apples" or "bananas" or "carrots" or "tomatoes"?"Produce":"Pantry",form=id=="bread"?"loaf":id=="juice"?"bottle":"box",quantity=20,capacity=20}).ToArray()).Where(s=>s.floor==0).ToArray();
                ShowShelfStock(room.stock,stock.Where(s=>s.category!="Produce").ToArray());
                ShowShelfStock(room.fresh,stock.Where(s=>s.category=="Produce").ToArray());
                var live=new HashSet<string>();
                foreach(var visitor in (state?.visitors??Array.Empty<BusinessVisitor>()).Take(12)){
                    string id="visitor-"+visitor.id;live.Add(id);
                    int slot=Math.Abs(visitor.seed)%6;
                    var at=new Vector3(-5.7f+(slot%3)*6.1f,.44f,-2+slot/3*3);
                    if(visitor.basket)at=new(-7.1f+slot%2*4,.44f,-5.3f);
                    var actor=Actor(id,at,false,180,slot,visitor.cast,room.root.transform,room.people,state.speed);
                    actor.Direct(at);
                }
                RemovePeople(live,room.people);
            }
        }
    }
    void FitArchitecture(Transform architecture,Vector3 position)
    {
        architecture.localScale=Vector3.one;architecture.localPosition=Vector3.zero;
        var renderers=architecture.GetComponentsInChildren<Renderer>();
        if(renderers.Length==0)return;
        var bounds=renderers[0].bounds;foreach(var r in renderers)bounds.Encapsulate(r.bounds);
        float x=Mathf.Min(1,16.8f/Mathf.Max(.1f,bounds.size.x)),z=Mathf.Min(1,16.8f/Mathf.Max(.1f,bounds.size.z));
        architecture.localScale=new(x,1,z);architecture.localPosition=new((position.x-bounds.center.x)*x,0,(position.z-bounds.center.z)*z);
    }
    void BuildStreetLobby(Transform root,BusinessProperty p)
    {
        Box(root,"Lobby stone floor",new(0,.42f,0),new(19,.08f,18),paving);
        PlaceFreeAsset(root,"conciergeDesk",new(0,.46f,3),6.2f,0);
        foreach(int side in new[]{-1,1}){
            var sofa=PlaceFreeAsset(root,"loungeSofa",new(side*5,.46f,-4),2.9f,side*90);
            if(!sofa)Sofa(root,new(side*5,.44f,-4),side*90);
            PlaceFreeAsset(root,"tableCoffee",new(side*5,.44f,-1.5f),1.6f,0);
            Plant(root,new(side*8,.44f,-7),1.1f);
        }
        if(p.kind=="apartments")for(int n=0;n<12;n++)Box(root,"Resident mailbox",new(-6+n%4*.6f,1.1f+n/4*.35f,7),new(.5f,.29f,.15f),metal);
        if(p.kind=="plaza"){
            for(int side=-1;side<=1;side+=2)for(int row=0;row<3;row++){
                Box(root,"Shopfront display plinth",new(side*7,.8f,-2+row*3.5f),new(2, .7f,2),wood);
                PlaceFreeAsset(root,row==0?"televisionModern":row==1?"lampRoundFloor":"plantSmall1",new(side*7,1.16f,-2+row*3.5f),1.1f,0);
            }
        }
    }
    GameObject PlaceFreeAsset(Transform parent,string name,Vector3 at,float width,float angle)
    {
        var source=furnishingAssets.FirstOrDefault(p=>p&&p.name==name);if(!source)return null;
        var root=Group(parent,"Kenney "+name);var model=Instantiate(source,root);
        var b=LocalModelBounds(model.transform);
        float scale=width/Mathf.Max(b.size.x,b.size.z);
        model.transform.localScale=Vector3.one*scale;model.transform.localPosition=-new Vector3(b.center.x,b.min.y,b.center.z)*scale;
        root.localPosition=at;root.localRotation=Quaternion.Euler(0,angle,0);return root.gameObject;
    }
    static Bounds LocalModelBounds(Transform model)
    {
        var bounds=new Bounds();bool first=true;
        foreach(var filter in model.GetComponentsInChildren<MeshFilter>()){
            var b=filter.sharedMesh.bounds;var matrix=model.worldToLocalMatrix*filter.transform.localToWorldMatrix;
            for(int corner=0;corner<8;corner++){
                var v=matrix.MultiplyPoint3x4(b.center+Vector3.Scale(b.extents,new Vector3((corner&1)==0?-1:1,(corner&2)==0?-1:1,(corner&4)==0?-1:1)));
                if(first){bounds=new Bounds(v,Vector3.zero);first=false;}else bounds.Encapsulate(v);
            }
        }
        return bounds;
    }
    void AddFoodDisplays(Transform root)
    {
        // Disable the old anonymous models before static batching. Actual SKU
        // facings are added by ShowShelfStock and remain stock-controlled.
        foreach(var item in root.GetComponentsInChildren<Transform>(true).Where(t=>t.name is "Fresh produce" or "Stock product")){
            PrepareFacing(item);
            foreach(var renderer in item.GetComponentsInChildren<Renderer>(true))renderer.enabled=false;
        }
        foreach(var label in root.GetComponentsInChildren<TextMesh>(true))
            if(new[]{"APPLES","LEMONS","PEARS","ORANGES","BANANAS","CARROTS"}.Contains(label.text))label.text="FRESH PRODUCE";
    }
}
