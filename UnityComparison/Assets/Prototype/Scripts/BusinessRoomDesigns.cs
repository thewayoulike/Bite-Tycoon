using System.Linq;
using UnityEngine;

public sealed partial class BusinessGameBridge
{
    static Vector3 RoomResidentPoint(string kind,string type,bool sleeping)
    {
        // Coordinates are relative to the room floor, not the old generic sofa.
        if(sleeping)return new(type=="family"?-1.15f:-.7f,.61f,.45f);
        if(kind=="apartments")return new(.7f,0,-1);
        return type is "double" or "premium" or "suite"?new(1.85f,0,-.6f):new(0,0,-1.3f);
    }
    // This pack's bed length is its X axis. Size it after rotating into the room,
    // independently of the single/double mattress width; never shrink its length.
    bool RoomBed(Transform room,Vector3 at,float width,bool dirty,string linen,bool luxury)
    {
        var source=comparisonProps.FirstOrDefault(p=>p&&p.name=="ApartmentBed");
        if(!source)return false;
        var bed=Group(room,"Room bed");bed.localPosition=at;
        var fit=Group(bed,"Bed model fit");var model=Instantiate(source,fit);
        model.transform.localPosition=Vector3.zero;model.transform.localRotation=Quaternion.Euler(0,90,0);model.transform.localScale=Vector3.one;
        var b=LocalModelBounds(fit);var scale=new Vector3(width/b.size.x,.98f/b.size.y,2.25f/b.size.z);
        fit.localScale=scale;fit.localPosition=-Vector3.Scale(new Vector3(b.center.x,b.min.y,b.center.z),scale);
        foreach(var r in model.GetComponentsInChildren<MeshRenderer>()){
            if(r.name.Contains("Pillow")){r.enabled=false;continue;}
            r.sharedMaterial=ColorMat(r.name.Contains("Sheet")?(dirty?"A59983":linen):r.name.Contains("Mattress")?"F5EFE4":luxury?"6A5549":"A59178");
        }
        int pillows=width>1.4f?2:1;
        for(int n=0;n<pillows;n++)Sphere(bed,"Fresh pillow",new((n-(pillows-1)*.5f)*.66f,.62f,.75f),new(pillows==1?.7f:.62f,.18f,.44f),ColorMat(dirty?"B4A792":"FBF7ED"));
        Box(bed,"Folded bed runner",new(0,.57f,-.62f),new(width+.02f,.045f,.42f),ColorMat(luxury?"B69A5D":linen));
        if(luxury){
            Box(bed,"Upholstered headboard",new(0,.72f,1.17f),new(width+.18f,1.44f,.15f),ColorMat(linen));
            for(int n=-2;n<=2;n++)Box(bed,"Headboard piping",new(n*width/5,.72f,1.08f),new(.016f,1.3f,.015f),ColorMat("C4AF88"));
        }
        return true;
    }
    void GuestBed(Transform room,Vector3 at,float width,bool dirty,string linen,bool luxury=false)
    {
        if(!RoomBed(room,at,width,dirty,linen,luxury))Bed(room,at,width,dirty);
    }
    void RoomTable(Transform room,string name,Vector3 at,float width,float depth,Material top,float height=.77f)
    {
        var table=Group(room,name);table.localPosition=at;
        Box(table,"Tabletop",new(0,height,0),new(width,.1f,depth),top);
        foreach(int x in new[]{-1,1})foreach(int z in new[]{-1,1})Box(table,"Table leg",new(x*(width/2-.1f),height/2,z*(depth/2-.1f)),new(.065f,height,.065f),metal);
    }
    void RoomChair(Transform room,Vector3 at,float angle,string color,bool arms=false)
    {
        var chair=Group(room,arms?"Lounge armchair":"Desk chair");chair.localPosition=at;chair.localRotation=Quaternion.Euler(0,angle,0);
        var fabric=ColorMat(color);Box(chair,"Cushioned seat",new(0,.47f,0),new(.65f,.17f,.63f),fabric);
        Box(chair,"Upholstered back",new(0,.86f,.27f),new(.65f,.72f,.12f),fabric);
        foreach(int x in new[]{-1,1})foreach(int z in new[]{-1,1})Box(chair,"Chair leg",new(x*.25f,.2f,z*.23f),new(.055f,.4f,.055f),wood);
        if(arms)foreach(int side in new[]{-1,1})Box(chair,"Armrest",new(side*.33f,.68f,0),new(.12f,.32f,.65f),fabric);
    }
    void RoomSofa(Transform room,Vector3 at,float angle=0)
    {
        var root=Group(room,"Room lounge sofa");root.localPosition=at;root.localRotation=Quaternion.Euler(0,angle,0);
        var orient=Group(root,"Sofa axis correction");Sofa(orient,Vector3.zero,0);
        var b=LocalModelBounds(orient);
        // The imported sofa runs along Z; room plans use X as the seating width.
        if(b.size.z>b.size.x)orient.localRotation=Quaternion.Euler(0,90,0);
    }
    void Nightstand(Transform room,Vector3 at,string color)
    {
        Box(room,"Bedside cabinet",at+new Vector3(0,.29f,0),new(.46f,.58f,.52f),wood);
        Box(room,"Bedside drawer",at+new Vector3(0,.43f,-.27f),new(.36f,.18f,.02f),ColorMat(color));
        Sphere(room,"Lamp base",at+new Vector3(0,.64f,0),new(.17f,.12f,.17f),metal);
        Box(room,"Lamp stem",at+new Vector3(0,.82f,0),new(.035f,.3f,.035f),metal);
        Sphere(room,"Linen lamp shade",at+new Vector3(0,1.01f,0),new(.32f,.3f,.32f),ColorMat("F1DFC0"));
    }
    void RoomArt(Transform room,Vector3 at,string color,float size=1)
    {
        Box(room,"Artwork frame",at,new(.07f,1.05f*size,.85f*size),wood);
        Box(room,"Artwork canvas",at+new Vector3(.045f,0,0),new(.025f,.91f*size,.71f*size),ColorMat("EFE5D3"));
        Sphere(room,"Abstract artwork",at+new Vector3(.065f,.06f,0),new(.025f,.52f*size,.4f*size),ColorMat(color));
    }
    void FurnishGuestRoom(Transform room,string kind,string type,float width,bool dirty)
    {
        bool home=kind=="apartments",luxury=type is "premium" or "suite" or "penthouse";
        string accent=type switch{"standard"=>"728B83","double"=>"406C82","family"=>"B67D53","business"=>"4C6176","premium"=>"7D616D","suite"=>"355E59","onebed"=>"687E91","twobed"=>"8F795A","penthouse"=>"355E59",_=>"859A8B"};
        var design=Group(room,"Design "+type);
        Box(design,"Bedroom rug",new(-.6f,.025f,1.05f),new(type=="family"?width-.5f:luxury?3.8f:2.8f,.03f,3.4f),ColorMat(luxury?"D6C8AE":type=="family"?"D2BE95":"C4CABF"));
        Box(design,"Bed feature wall",new(-.65f,1.3f,2.72f),new(width-1.3f,2.6f,.09f),ColorMat(accent));
        GuestBed(design,new(type=="family"?-1.15f:-.7f,0,1.4f),type is "standard" or "studio" or "family"?1.12f:luxury?1.95f:1.65f,dirty,accent,luxury);
        if(type=="family")GuestBed(design,new(1.15f,0,1.4f),1.12f,dirty,"688F92");
        if(type=="twobed")GuestBed(design,new(1.85f,0,1.4f),1.12f,dirty,"7D8D9B");
        Nightstand(design,new(type=="family"?0:-2.05f,0,2.05f),accent);
        if(type is "double" or "premium" or "suite")Nightstand(design,new(.65f,0,2.05f),accent);
        Box(design,"Wardrobe",new(-width/2+.6f,1.1f,4.7f),new(1,2.2f,1.8f),wood);
        foreach(int side in new[]{-1,1})Box(design,"Wardrobe handle",new(-width/2+1.12f,1.1f,4.7f+side*.15f),new(.04f,.35f,.035f),metal);
        Box(design,"Bathroom mirror",new(width/2-.14f,1.6f,4.5f),new(.03f,1,1.5f),glass);
        Sphere(design,"Basin",new(width/2-.5f,1.14f,4.5f),new(.55f,.13f,.8f),plaster);
        Box(design,"Shower screen",new(width/2-1.1f,1.15f,5.5f),new(1.8f,2.3f,.04f),glass);
        RoomArt(design,new(-width/2+.14f,1.8f,.5f),accent,luxury?1.2f:.8f);
        if(home){
            Box(design,"Home kitchen units",new(width/2-.65f,.5f,-2.6f),new(1.2f,1,3.1f),plaster);
            Box(design,"Kitchen worktop",new(width/2-.65f,1.04f,-2.6f),new(1.25f,.08f,3.2f),metal);
            Box(design,"Home fridge",new(width/2-.6f,1,-4.8f),new(1.1f,2,.9f),metal);
            RoomSofa(design,new(-2,0,-2.7f),-90);
            if(type!="studio")Box(design,"Bedroom partition",new(-.6f,1.15f,-.15f),new(width-2.1f,2.3f,.12f),plaster);
            // Retain apartment-specific kitchen, dining and second-bedroom details.
            DecorateHome(design,kind,type,width);
            ApartmentCharacter(design,type,width);
            return;
        }
        if(type=="business"){
            RoomTable(design,"Executive work desk",new(-.4f,0,-3.8f),2.8f,1.1f,wood);
            RoomChair(design,new(-.4f,0,-2.65f),0,accent);
            Box(design,"Laptop keyboard",new(-.5f,.85f,-3.8f),new(.7f,.04f,.48f),metal);
            Box(design,"Laptop screen",new(-.5f,1.08f,-4.03f),new(.7f,.45f,.035f),ColorMat("34556B"));
            for(int n=0;n<3;n++)Box(design,"Work reference book",new(.65f,.86f+n*.06f,-3.8f),new(.32f,.05f,.42f),ColorMat(n%2==0?accent:"C1AB84"));
            RoomChair(design,new(1.5f,0,-1.8f),-65,accent,true);
        }else if(type=="suite"){
            Box(design,"Suite bedroom divider",new(-.7f,1.1f,-.65f),new(3.2f,2.2f,.13f),wood);
            for(int n=0;n<5;n++)Box(design,"Suite brass divider inlay",new(-1.9f+n*.6f,1.1f,-.73f),new(.025f,2.1f,.02f),ColorMat("BEA66A"));
            Box(design,"Suite lounge carpet",new(0,.025f,-3.4f),new(4.5f,.035f,4.3f),ColorMat("D2C4AA"));
            RoomSofa(design,new(-.7f,0,-1.65f));
            RoomTable(design,"Suite stone coffee table",new(-.7f,0,-3.1f),1.6f,.85f,plaster,.42f);
            RoomChair(design,new(1.6f,0,-3.1f),-90,accent,true);
            Plant(design,new(1.85f,0,-5),.8f);
        }else if(type=="family"){
            RoomSofa(design,new(-.8f,0,-3.8f),180);
            RoomTable(design,"Family activity table",new(-.4f,0,-2.45f),1.3f,.85f,wood,.5f);
            for(int n=0;n<5;n++)Box(design,"Children activity blocks",new(-.8f+n*.2f,.64f,-2.4f),new(.13f,.18f,.13f),ColorMat(n%2==0?"D4A255":"5C9391"));
            Box(design,"Family storage bench",new(1.85f,.38f,-1.15f),new(.85f,.76f,1.4f),ColorMat(accent));
        }else{
            RoomTable(design,luxury?"Vanity writing desk":"Writing desk",new(-1.85f,0,-3.65f),.85f,1.75f,wood);
            RoomChair(design,new(-.9f,0,-3.65f),-90,accent);
            if(type=="standard")RoomChair(design,new(1.6f,0,-1.5f),-20,accent,true);
            else{
                RoomSofa(design,new(.3f,0,-1.4f));
                RoomTable(design,"Lounge coffee table",new(.6f,0,-2.7f),1.15f,.65f,luxury?plaster:wood,.42f);
            }
        }
        if(type is "business" or "premium" or "suite"){
            Box(design,"Hospitality minibar",new(1.9f,.55f,-4.5f),new(.85f,1.1f,.95f),wood);
            Box(design,"Minibar stone top",new(1.9f,1.13f,-4.5f),new(.92f,.06f,1),plaster);
            ComparisonProp(design,"BreakfastCup",new(1.7f,1.18f,-4.3f),.11f);
            ComparisonProp(design,"CoffeeMachine",new(1.95f,1.18f,-4.7f),.4f);
        }
        if(luxury){
            RoomArt(design,new(-width/2+.14f,1.8f,-2),"B39B65",1.15f);
            Plant(design,new(-2,0,-5.15f),.65f);
            Box(design,"Gold room skirting",new(-width/2+.08f,.12f,0),new(.04f,.16f,11.6f),ColorMat("BAA371"));
        }
    }
}
