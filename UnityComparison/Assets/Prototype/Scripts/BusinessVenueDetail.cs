using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public sealed partial class BusinessGameBridge
{
    void Plant(Transform parent, Vector3 at, float size = 1)
    {
        Box(parent, "Ceramic planter", at + Vector3.up * .3f * size, new Vector3(.65f,.6f,.65f) * size, plaster);
        Sphere(parent, "Indoor foliage", at + Vector3.up * .95f * size, new Vector3(.85f,1.1f,.85f) * size, ColorMat("51745D"));
    }
    void ApplyBuildingDesign(Transform root, BusinessProperty p)
    {
        if (p.kind is "land" or "park" or "plaza") return;
        ApplyCityFacade(root,p);
        ApplyRestaurantPaint(root,p);
        if (p.design == "modern")
        {
            foreach (var renderer in root.GetComponentsInChildren<MeshRenderer>()) if (renderer.sharedMaterial == brick) renderer.sharedMaterial = ColorMat("9DA9AB");
            Box(root, "Modern entrance blade", new(0,3.7f,-10), new(11,.18f,2), metal);
        }
        if (p.design == "garden")
        {
            foreach (var renderer in root.GetComponentsInChildren<MeshRenderer>()) if (renderer.sharedMaterial == brick) renderer.sharedMaterial = ColorMat("C2B8A2");
            for (int side = -1; side <= 1; side += 2) for (int n = 0; n < 4; n++) { Box(root,"Timber facade screen",new(side*(5+n),2,-9.9f),new(.15f,3.8f,.25f),wood); Plant(root,new(side*(5+n),0,-10.4f),.7f); }
        }
        if (p.kind == "hotel")
        {
            for (int side = -1; side <= 1; side += 2) { Box(root,"Hotel entrance column",new(side*5,2.6f,-10.4f),new(.5f,5, .5f),ColorMat("B89D6B")); Plant(root,new(side*7,0,-10),1.1f); }
            Box(root,"Hotel carpet arrival",new(0,.13f,-10),new(5,.08f,3),ColorMat("566D65"));
        }
        if (p.kind == "apartments") for (int level=1;level<=p.floors;level++) for(int bay=-1;bay<=1;bay++)
        {
            float y=level*2.9f+.35f; Box(root,"Private balcony",new(bay*6,y,-10),new(4.5f,.18f,1.7f),plaster);
            Box(root,"Balcony glass railing",new(bay*6,y+.65f,-10.8f),new(4.4f,1.1f,.08f),glass); Plant(root,new(bay*6+1.6f,y,-10),.5f);
        }

    }
    void ApplyCityFacade(Transform root,BusinessProperty p)
    {
        if(p.kind is not ("restaurant" or "cafe" or "shop"))return;
        uint seed=2166136261;foreach(char c in p.id)seed=unchecked((seed^c)*16777619);
        string[] walls={"DFDED2","A6BAC5","B8C2AD","D7C4AC","C6CED0","597481","EAE4D4","B6ABA1"};
        string[] accents={"305562","596A46","8C4F40","364554","897044","CEBC91","49696B","464E55"};
        int style=(int)(seed%10);if(style>=8)return; // A minority retain original brick or timber.
        foreach(var renderer in root.GetComponentsInChildren<MeshRenderer>()){
            var source=renderer.sharedMaterial;if(!source)continue;
            string name=source.name.ToLowerInvariant();
            bool wall=name.Contains("brick")||name.Contains("limestone")||name.Contains("cedar timber");
            bool accent=name=="dark metal"||name.Contains("upholstery");
            if(!wall&&!accent)continue;
            string key="Facade "+source.name+" "+style;
            if(!colorCache.TryGetValue(key,out var material)){
                material=new Material(source){name=key,enableInstancing=true};
                ColorUtility.TryParseHtmlString("#"+(wall?walls[style]:accents[style]),out var color);
                material.SetColor("_BaseColor",color);
                if(wall){material.SetTexture("_BaseMap",Texture2D.whiteTexture);material.SetFloat("_Smoothness",.24f);}
                colorCache[key]=material;
            }
            renderer.sharedMaterial=material;
        }
    }
    void ApplyRestaurantPaint(Transform root,BusinessProperty p)
    {
        if(p.kind is not ("restaurant" or "cafe"))return;
        foreach(var renderer in root.GetComponentsInChildren<MeshRenderer>()){
            var source=renderer.sharedMaterial;if(!source)continue;string name=source.name.ToLowerInvariant();
            string value=name.Contains("plaster")?p.wall:name.Contains("upholstery")||name.Contains("painted")?p.accent:null;
            if(string.IsNullOrEmpty(value)||!ColorUtility.TryParseHtmlString(value,out var color))continue;
            string key=source.name+value;if(!colorCache.TryGetValue(key,out var material)){material=new Material(source){color=color,enableInstancing=true};colorCache[key]=material;}renderer.sharedMaterial=material;
        }
    }
    void LobbyPeople(BusinessProperty p, HashSet<string> live)
    {
        foreach(var visitor in (frame.visitors??Array.Empty<BusinessVisitor>()).Take(8))
        {
            string id="visitor-lobby-"+visitor.id; live.Add(id); bool exists=people.ContainsKey(id); int row=Math.Abs(visitor.seed)%5;
            var actor=Actor(id,exists?people[id].transform.localPosition:new Vector3(0,.44f,-8),false,0,row,visitor.cast);
            actor.Follow(visitor.state,new[]{new Vector3(0,.44f,-8),new Vector3(0,.44f,0),new Vector3((row%2)*1.1f-.55f,.44f,2.7f-row*.6f)},visitor.state=="leaving",false);
        }
        int service=frame.crew?.FirstOrDefault(c=>c.role=="service")?.count??0;
        for(int n=0;n<Math.Min(2,service);n++){string id="reception-"+n;live.Add(id);Actor(id,new Vector3(-1+n*2,.44f,6.1f),false,180,n);}
    }
    void DecorateLobby(Transform root, BusinessProperty p)
    {
        bool hotel=p.kind=="hotel";
        Box(root,"Lobby runner",new(0,.46f,-2),new(4,.025f,10),ColorMat(hotel?"727F75":"9D8B76"));
        Box(root,"Reception feature panel",new(0,2.4f,9.75f),new(8,3.5f,.12f),wood);
        for(int n=-2;n<=2;n++)Box(root,"Reception bronze trim",new(n*1.5f,2.4f,9.65f),new(.045f,3.5f,.04f),ColorMat("C2AB78"));
        foreach(int side in new[]{-1,1}){Plant(root,new(side*9,.44f,6),1.4f);Plant(root,new(side*9,.44f,-6),1.2f);Box(root,"Lobby side table",new(side*6,.9f,-.5f),new(2.1f,.16f,1.1f),wood);}
        if(hotel)
        {
            Box(root,"Luggage storage",new(8,1.1f,-2),new(2,1.4f,4),wood);
            for(int n=0;n<4;n++)Box(root,"Stored luggage",new(8,2,-3+n*.8f),new(.7f,1,.5f),ColorMat(n%2==0?"405B6A":"866249"));
            Box(root,"Coffee station",new(-8,1.1f,-4),new(2,1.3f,3),wood);Box(root,"Coffee machine",new(-8,2,-4),new(.8f,.7f,.8f),metal);
        }
        else
        {
            for(int n=0;n<12;n++)Box(root,"Resident mailbox",new(-8+n%4*.7f,1.4f+n/4*.4f,9.7f),new(.6f,.32f,.2f),metal);
            Box(root,"Parcel lockers",new(8,1.6f,-3),new(2,2.5f,2),wood);
            Label(root,"RESIDENT LOUNGE  /  PARCELS & MAIL",new(0,3,-8.9f),.45f);
        }
    }
    void DecorateHome(Transform room,string kind,string type,float width)
    {
        if(kind=="apartments")
        {
            Box(room,"Cooktop",new(width/2-.65f,1.1f,-2.2f),new(.9f,.04f,.8f),metal);
            Box(room,"Kitchen sink",new(width/2-.65f,1.1f,-3.5f),new(.85f,.05f,.6f),metal);
            if(!ComparisonProp(room,"HomeTable",new(.7f,0,-4.4f),1.5f))
                Box(room,"Dining table",new(.7f,.82f,-4.4f),new(1.5f,.12f,1),wood);
            foreach(int side in new[]{-1,1}) {Box(room,"Dining chair seat",new(.7f+side*1.05f,.5f,-4.4f),new(.55f,.12f,.55f),wood);Box(room,"Dining chair back",new(.7f+side*1.25f,.9f,-4.4f),new(.12f,.8f,.55f),wood);}
            if(type=="twobed")Box(room,"Second bedroom divider",new(.65f,1.2f,1.6f),new(.12f,2.4f,3.4f),plaster);
            if(type=="penthouse"){Plant(room,new(width/2-.5f,0,2.2f),.8f);Box(room,"Penthouse stone island",new(.7f,.6f,-2.4f),new(1.1f,1.2f,1.5f),plaster);}
        }
        else if(type is "suite" or "business" or "premium")
        {
            Box(room,"Hospitality minibar",new(width/2-.5f,.6f,-4.8f),new(.8f,1.2f,.7f),wood);
            Box(room,"Suite room divider",new(-width/2+1,1.2f,-1.8f),new(1.8f,2.4f,.1f),wood);
            Box(room,"Laptop",new(-width/2+.65f,.92f,-3.4f),new(.7f,.04f,.5f),metal);
        }
    }
    void MallInterior(BusinessProperty p)
    {
        var live=new HashSet<string>();
        foreach(var v in (frame.visitors??Array.Empty<BusinessVisitor>()).Take(24))
        {
            if(v.unit>=0&&v.unit/4!=frame.floor)continue;
            string id="visitor-mall-"+v.id;live.Add(id);bool exists=people.ContainsKey(id);float z=(v.unit>=0?v.unit%2:Math.Abs(v.seed)%2)==0?-7f:7f,lane=v.seed%2==0?-3.3f:3.3f;
            var actor=Actor(id,exists?people[id].transform.localPosition:MallPoint(p,new Vector3(0,.44f,-13)),false,0,v.seed,v.cast);
            actor.Follow(v.state,new[]{MallPoint(p,new Vector3(0,.44f,-13)),MallPoint(p,new Vector3(lane,.44f,-13)),MallPoint(p,new Vector3(lane,.44f,z))},v.state=="leaving",false);
        }
        MallTenantPeople(p,live);
        RemovePeople(live);
        string key="mall:"+frame.floor+":"+string.Join(";",frame.units.Select(u=>u.index+u.type+u.tenant+u.occupied))+string.Join(",",frame.facilities??Array.Empty<string>());
        if(key==roomKey)return;roomKey=key;
        var old=interior.transform.Find("Mall fitout");if(old){old.name="Retired mall fitout";Destroy(old.gameObject);}var root=Group(interior.transform,"Mall fitout");if(GalleriaSite(p))root.localScale=GalleriaPlanScale;
        string[] floorNames={"GRAND SHOPPING HALL","FAMILY & PLAY","FOOD COURT","LIFESTYLE & LEISURE","SKY DINING & GARDEN"};
        Box(root,"Galleria central aisle",new(0,.48f,0),new(7.5f,.06f,28),ColorMat("C8BDA9"));
        Label(root,floorNames[Math.Clamp(frame.floor,0,4)],new(0,3.1f,14.2f),.6f);
        for(int side=-1;side<=1;side+=2)for(int bay=0;bay<2;bay++)
        {
            int n=(side<0?0:2)+bay,index=frame.floor*4+n;var unit=frame.units.FirstOrDefault(u=>u.index==index);if(unit==null)continue;
            // The local -Z shop entrance must face the central shopping aisle.
            var shop=Group(root,"Lease unit "+index);shop.localPosition=new(side*8.05f,.44f,-7+bay*14);shop.localRotation=Quaternion.Euler(0,side<0?-90:90,0);shop.localScale=new(1,1,.88f);
            Box(shop,"Shop floor",new(0,0,0),new(8.5f,.04f,8.2f),wood);Box(shop,"Tenant partition",new(-4.25f,1.55f,0),new(.12f,3.1f,8.2f),plaster);
            foreach(int edge in new[]{-1,1})Box(shop,"Storefront glass",new(edge*2.75f,1.4f,-4.2f),new(2.8f,2.8f,.055f),glass);
            Box(shop,"Tenant sign",new(0,3,-4.25f),new(8.4f,.65f,.12f),ColorMat(n%2==0?"395C5C":"81664D"));
            Label(shop,string.IsNullOrEmpty(unit.tenant)?"AVAILABLE / "+unit.type.ToUpperInvariant():unit.tenant,new(0,3,-4.34f),.34f);
            if(unit.occupied)ShopFitout(shop,unit.type);
            else {Box(shop,"Ready to lease counter",new(0,.7f,1.2f),new(4,1.4f,1.1f),wood);Label(shop,"READY FOR YOUR TENANT",new(0,1.6f,1),.32f);}
            Interaction(shop,new(0,1,0),new(8,2,8),"prices",index);
        }
        // Rest areas sit between access routes rather than across shop doors.
        foreach(int side in new[]{-1,1}){Plant(root,new(side*2.8f,.44f,11.5f),.85f);Sofa(root,new(0,.44f,side*10),side*90);}
        Box(root,"Lift core",new(0,1.9f,13.5f),new(3.4f,3,.7f),metal);Label(root,"LIFTS",new(0,3.1f,13),.3f);
        if(frame.facilities?.Contains("play")==true&&frame.floor==1)
        {
            Box(root,"Soft play mat",new(0,.52f,1),new(4,.08f,5),ColorMat("83A7A1"));
            Box(root,"Play tower",new(-1.1f,1.4f,1.5f),new(1.5f,1.7f,1.5f),ColorMat("D4A45C"));
            var slide=Box(root,"Children slide",new(.6f,1.15f,1.5f),new(2.6f,.15f,1.2f),ColorMat("BE7867"));slide.transform.localRotation=Quaternion.Euler(0,0,-25);
            for(int n=0;n<8;n++)Sphere(root,"Soft play ball",new(-1.5f+n%4,.7f,-1+n/4*.5f),new(.28f,.28f,.28f),ColorMat(n%2==0?"C7A755":"6D9A9A"));
        }
        if(frame.facilities?.Contains("foodcourt")==true&&frame.floor==2)for(int n=0;n<3;n++){var table=Instantiate(tablePrefab,root);table.transform.localPosition=new(0,0,-4+n*4);table.transform.localScale=Vector3.one*.8f;}
        if(frame.facilities?.Contains("cinema")==true&&frame.floor==3){Box(root,"Cinema screen",new(0,2,5),new(4,2.3f,.12f),ColorMat("304B68"));for(int n=0;n<2;n++)Sofa(root,new(0,.44f,1-n*2),0);}
        if(frame.facilities?.Contains("roofgarden")==true&&frame.floor==4)for(int n=0;n<4;n++)Plant(root,new(n%2==0?-2:2,.44f,-3+n*2),1.1f);
        MallTenantPeople(p,live);RemovePeople(live);
    }
}
