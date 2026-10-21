using System;
using System.Linq;
using UnityEngine;

public sealed class ElectronicsDisplay : MonoBehaviour
{
    public string productId;
    public TextMesh availability;
    public GameObject[] cartons;
}

public sealed partial class BusinessGameBridge
{
    static Vector3 ElectronicsBrowsePoint(int index,bool basket,string state)
    {
        if(state is "leaving" or "using")return new(0,.46f,-8.7f);
        if(basket)return new(4+index%3*.65f,.46f,-5.45f);
        return new(index%2==0?-2.25f:2.25f,.46f,-2.1f+(index/2%3)*4.1f);
    }
    void Electronics(Transform parent)
    {
        var root=Group(parent,"Electronics showroom");root.localPosition=Vector3.up*.46f;
        var white=ColorMat("E5E9E8");var ink=ColorMat("243C4A");var teal=ColorMat("287B86");
        Box(root,"Showroom floor",new(0,.01f,0),new(21.8f,.025f,19.7f),ColorMat("D9DCD6"));
        Box(root,"Central circulation",new(0,.03f,0),new(3.4f,.02f,19.4f),ColorMat("B9CAC9"));
        foreach(int side in new[]{-1,1}){
            Box(root,"Showroom side wall",new(side*10.9f,1.5f,0),new(.14f,3,19.8f),white);
            Box(root,"Wall base trim",new(side*10.8f,.13f,0),new(.06f,.22f,19.7f),ink);
        }
        Box(root,"Department backdrop",new(0,1.9f,9.7f),new(21.6f,3.8f,.12f),ink);
        Box(root,"Department accent",new(0,3.55f,9.6f),new(21.6f,.07f,.06f),teal);
        Label(root,"TECH & HOME",new(0,3,9.5f),.65f);
        Label(root,"TRY THE DISPLAY MODELS  /  ASK OUR TEAM",new(0,2.5f,9.5f),.23f);
        ShowroomZone(root,"TV & GAMING",new(-5.4f,0,6.5f),new(6,1.8f));
        ShowroomZone(root,"LAUNDRY & COOLING",new(5.5f,0,6.5f),new(6,1.8f));
        ShowroomZone(root,"PHONES & TABLETS",new(-5.4f,0,2),new(5.7f,1.5f),true);
        ShowroomZone(root,"COMPUTING & AUDIO",new(-5.4f,0,-2.4f),new(5.7f,1.5f),true);
        ShowroomZone(root,"SMALL APPLIANCES",new(5.5f,0,1.8f),new(5.7f,1.6f),true);
        ShowroomZone(root,"HOME CARE",new(5.5f,0,-2.5f),new(5.7f,1.6f));
        ElectronicsProduct(root,"tv","SMART TV",new(-6.4f,.18f,6.5f));
        ElectronicsProduct(root,"console","GAMES CONSOLE",new(-3.6f,.18f,6.4f));
        ElectronicsProduct(root,"washing_machine","WASHING MACHINE",new(4,.18f,6.5f));
        ElectronicsProduct(root,"fridge_appliance","REFRIGERATOR",new(6.5f,.18f,6.5f));
        ElectronicsProduct(root,"smartphone","MOBILE PHONES",new(-6.8f,.98f,2));
        ElectronicsProduct(root,"tablet","TABLETS",new(-4.1f,.98f,2));
        ElectronicsProduct(root,"laptop","LAPTOPS",new(-6.8f,.98f,-2.4f));
        ElectronicsProduct(root,"headphones","HEADPHONES",new(-4.1f,.98f,-2.4f));
        ElectronicsProduct(root,"microwave","MICROWAVE",new(3.8f,.98f,1.8f));
        ElectronicsProduct(root,"kettle","KETTLES",new(5.6f,.98f,1.8f));
        ElectronicsProduct(root,"toaster","TOASTERS",new(7.3f,.98f,1.8f));
        ElectronicsProduct(root,"vacuum","VACUUM CLEANER",new(5.5f,.18f,-2.5f));
        var desk=Group(root,"Advice and collection desk");desk.localPosition=new(5.3f,0,-7);
        Box(desk,"Counter",new(0,.49f,0),new(4.8f,.98f,1.3f),ink);
        Box(desk,"Timber counter top",new(0,1,0),new(4.95f,.08f,1.45f),wood);
        Box(desk,"Teal desk strip",new(0,.77f,-.66f),new(4.8f,.08f,.03f),teal);
        Label(desk,"ADVICE & COLLECTION",new(0,.45f,-.68f),.28f);
        Box(desk,"Service terminal",new(-1.6f,1.28f,0),new(.55f,.45f,.09f),ink);
        Plant(root,new(-9.6f,0,-8.6f),.9f);
        Box(root,"Floor directory",new(-5.6f,1,-7.5f),new(3.8f,1.9f,.13f),ink);
        Label(root,"LEVEL 2\nTECH & HOME\nGROCERIES DOWNSTAIRS",new(-5.6f,1,-7.59f),.26f);
        Interaction(root,new(5.3f,1,-6.8f),new(4.9f,2,1.5f),"inventory");
    }
    void ShowroomZone(Transform root,string name,Vector3 at,Vector2 size,bool counter=false)
    {
        var zone=Group(root,"Zone "+name);zone.localPosition=at;
        Box(zone,"Display plinth",new(0,counter?.46f:.08f,0),new(size.x,counter?.92f:.16f,size.y),ColorMat("F0F0E9"));
        Box(zone,"Timber display top",new(0,counter?.95f:.17f,0),new(size.x+.06f,.06f,size.y+.06f),wood);
        Box(zone,"Zone title panel",new(0,counter?.65f:.3f,-size.y/2-.055f),new(size.x,.4f,.06f),ColorMat("243C4A"));
        Label(zone,name,new(0,counter?.65f:.3f,-size.y/2-.095f),.23f);
    }
    void ElectronicsProduct(Transform root,string id,string title,Vector3 at)
    {
        var group=Group(root,"Display model "+id);group.localPosition=at;
        var white=ColorMat("E6E9E8");var dark=ColorMat("202B34");var silver=ColorMat("9BA9AD");var blue=ColorMat("28607C");
        switch(id){
            case "tv":
                Box(group,"Screen bezel",new(0,1.03f,0),new(1.75f,1.02f,.09f),dark);
                Box(group,"Display sky",new(0,1.04f,-.051f),new(1.65f,.92f,.012f),blue);
                Sphere(group,"Screen sun",new(.5f,1.25f,-.062f),new(.22f,.22f,.006f),ColorMat("F2C47B"));
                for(int n=0;n<6;n++)Box(group,"Screen skyline",new(-.6f+n*.24f,.76f+n%3*.04f,-.064f),new(.19f,.3f+n%3*.08f,.01f),ColorMat(n%2==0?"448B91":"24535F"));
                foreach(int side in new[]{-1,1})Box(group,"TV stand",new(side*.55f,.42f,0),new(.13f,.2f,.42f),dark);break;
            case "console":
                Box(group,"Console",new(0,.37f,0),new(.22f,.7f,.45f),white);Box(group,"Disc slot",new(-.04f,.36f,-.23f),new(.018f,.34f,.015f),dark);
                Box(group,"Controller",new(.5f,.09f,-.05f),new(.3f,.12f,.18f),dark);foreach(int s in new[]{-1,1})Sphere(group,"Gamepad grip",new(.5f+s*.12f,.07f,-.12f),new(.13f,.14f,.16f),dark);break;
            case "smartphone":case "tablet":
                float w=id=="tablet"?.26f:.12f,h=id=="tablet"?.36f:.23f;
                for(int n=-1;n<=1;n++){
                    var phone=Group(group,"Demo device");phone.localPosition=new(n*.5f,.06f,0);phone.localRotation=Quaternion.Euler(-18,0,0);
                    Box(phone,"Device body",new(0,h/2,0),new(w,h,.025f),dark);Box(phone,"Lit screen",new(0,h/2,-.016f),new(w*.89f,h*.86f,.008f),blue);
                    Box(group,"Security stand",new(n*.5f,.035f,.04f),new(w+.04f,.07f,.18f),silver);
                }break;
            case "laptop":
                Box(group,"Keyboard base",new(0,.025f,0),new(.62f,.05f,.42f),silver);
                var screen=Group(group,"Open laptop lid");screen.localPosition=new(0,.05f,.2f);screen.localRotation=Quaternion.Euler(12,0,0);
                Box(screen,"Lid",new(0,.2f,0),new(.62f,.4f,.025f),dark);Box(screen,"Screen",new(0,.2f,-.016f),new(.56f,.34f,.008f),blue);
                for(int n=0;n<4;n++)Box(group,"Keyboard row",new(0,.054f,.04f+n*.034f),new(.5f,.004f,.018f),dark);Box(group,"Track pad",new(0,.054f,-.1f),new(.16f,.004f,.09f),dark);break;
            case "headphones":
                Box(group,"Headphone stand",new(0,.18f,0),new(.04f,.36f,.04f),silver);Box(group,"Stand foot",new(0,.025f,0),new(.25f,.05f,.2f),silver);
                for(int n=0;n<9;n++){float a=n*Mathf.PI/8;var band=Box(group,"Headband",new(Mathf.Cos(a)*.15f,.31f+Mathf.Sin(a)*.15f,0),new(.075f,.035f,.05f),dark);band.transform.localRotation=Quaternion.Euler(0,0,a*Mathf.Rad2Deg+90);}
                foreach(int side in new[]{-1,1})Sphere(group,"Ear cushion",new(side*.15f,.28f,0),new(.09f,.17f,.11f),dark);break;
            case "washing_machine":
                Box(group,"Appliance body",new(0,.46f,0),new(.68f,.92f,.68f),white);
                Sphere(group,"Chrome door rim",new(0,.4f,-.35f),new(.47f,.47f,.07f),silver);Sphere(group,"Drum glass",new(0,.4f,-.39f),new(.37f,.37f,.04f),dark);
                Box(group,"Control panel",new(0,.79f,-.35f),new(.6f,.12f,.015f),silver);Sphere(group,"Program dial",new(.18f,.79f,-.37f),new(.07f,.07f,.04f),dark);break;
            case "fridge_appliance":
                Box(group,"Fridge cabinet",new(0,.93f,0),new(.82f,1.86f,.75f),silver);
                Box(group,"Refrigerator door",new(0,1.18f,-.39f),new(.79f,1.32f,.045f),white);Box(group,"Freezer drawer",new(0,.24f,-.39f),new(.79f,.46f,.045f),white);
                Box(group,"Fridge handle",new(.28f,1.1f,-.44f),new(.035f,.63f,.07f),dark);Box(group,"Freezer handle",new(0,.39f,-.44f),new(.55f,.035f,.07f),dark);break;
            case "microwave":
                Box(group,"Microwave cabinet",new(0,.18f,0),new(.6f,.36f,.4f),silver);Box(group,"Microwave glass door",new(-.06f,.18f,-.21f),new(.39f,.25f,.02f),dark);
                Box(group,"Microwave handle",new(.12f,.18f,-.24f),new(.025f,.21f,.04f),white);Box(group,"Digital controls",new(.23f,.24f,-.215f),new(.08f,.08f,.02f),blue);break;
            case "kettle":
                Sphere(group,"Kettle body",new(0,.16f,0),new(.23f,.29f,.23f),silver);Box(group,"Kettle base",new(0,.025f,0),new(.25f,.05f,.25f),dark);
                Box(group,"Kettle handle",new(.15f,.17f,0),new(.035f,.21f,.04f),dark);foreach(int side in new[]{-1,1})Box(group,"Handle connector",new(.12f,.17f+side*.09f,0),new(.09f,.025f,.04f),dark);
                Box(group,"Kettle spout",new(-.12f,.23f,0),new(.13f,.065f,.07f),silver);break;
            case "toaster":
                Box(group,"Toaster body",new(0,.11f,0),new(.31f,.22f,.21f),silver);foreach(int side in new[]{-1,1})Box(group,"Toast slot",new(0,.224f,side*.048f),new(.24f,.008f,.025f),dark);Sphere(group,"Browning dial",new(.16f,.1f,0),new(.03f,.055f,.055f),dark);break;
            case "vacuum":
                Box(group,"Vacuum floor head",new(0,.06f,-.1f),new(.36f,.12f,.3f),dark);Box(group,"Vacuum shaft",new(0,.65f,0),new(.055f,1.2f,.06f),silver);
                Sphere(group,"Dust canister",new(0,.5f,.04f),new(.23f,.44f,.24f),ColorMat("327B85"));Box(group,"Vacuum handgrip",new(0,1.25f,.07f),new(.07f,.06f,.2f),dark);break;
        }
        // Demonstrators stay visible; their labels distinguish them from actual sale stock.
        var tag=Group(root,"Stock label "+id);tag.localPosition=new(at.x,.63f,at.z-1.03f);
        Box(tag,"Product information card",Vector3.zero,new(id is "kettle" or "toaster"?1.4f:1.9f,.43f,.035f),dark);
        Label(tag,title,new(0,.09f,-.03f),.13f);Label(tag,"DISPLAY ONLY",new(0,-.1f,-.03f),.12f);
        var bind=group.gameObject.AddComponent<ElectronicsDisplay>();bind.productId=id;bind.availability=tag.GetComponentsInChildren<TextMesh>().Last();
        bind.cartons=Array.Empty<GameObject>();
    }
    void UpdateElectronicsStock(Transform root,BusinessStock[] stock)
    {
        foreach(var display in root.GetComponentsInChildren<ElectronicsDisplay>()){
            var item=stock.FirstOrDefault(s=>s.id==display.productId);
            string status=item==null?"DISPLAY ONLY / NOT RANGED":item.quantity<=0?"OUT OF STOCK / DISPLAY ONLY":Mathf.FloorToInt(item.quantity)+" IN STOCK";
            if(display.availability.text!=status)display.availability.text=status;
            display.availability.color=item!=null&&item.quantity>0?new Color(.63f,.91f,.79f):new Color(1,.76f,.46f);
        }
    }
}
