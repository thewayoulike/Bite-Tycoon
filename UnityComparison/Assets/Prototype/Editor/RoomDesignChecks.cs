using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.Assertions;

public static class RoomDesignChecks
{
    const BindingFlags Flags=BindingFlags.Instance|BindingFlags.NonPublic;
    static readonly string[] Types={"standard","double","family","business","premium","suite","studio","onebed","twobed","penthouse"};
    static Bounds VisibleBounds(Transform root){
        var renderers=root.GetComponentsInChildren<Renderer>().Where(r=>r.enabled).ToArray();
        var b=renderers[0].bounds;foreach(var r in renderers)b.Encapsulate(r.bounds);return b;
    }
    public static string Run(){
        var bridge=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();
        var method=typeof(BusinessGameBridge).GetMethod("FurnishGuestRoom",Flags);
        foreach(var type in Types){
            bool home=Array.IndexOf(Types,type)>=6;var root=new GameObject("Room audit "+type);
            try{
                method.Invoke(bridge,new object[]{root.transform,home?"apartments":"hotel",type,home?7f:5.4f,false});
                var beds=root.GetComponentsInChildren<Transform>().Where(t=>t.name=="Room bed").ToArray();
                Assert.AreEqual(type is "family" or "twobed"?2:1,beds.Length,type+" bed count");
                foreach(var bed in beds){
                    var fit=bed.Find("Bed model fit");var renderers=fit.GetComponentsInChildren<Renderer>().Where(r=>r.enabled).ToArray();
                    var b=renderers[0].bounds;foreach(var r in renderers)b.Encapsulate(r.bounds);
                    Assert.IsTrue(b.size.z>2.1f&&b.size.z<2.4f,type+" must have an adult-length mattress");
                    Assert.IsTrue(b.size.x>1.05f&&b.size.x<2.05f,type+" mattress width");
                    Assert.IsTrue(b.size.y>.9f&&b.size.y<1.1f,type+" bed headboard scale");
                    Assert.IsTrue(Mathf.Abs(b.center.x)+b.extents.x<(home?3.5f:2.7f),type+" bed outside room");
                }
                var names=root.GetComponentsInChildren<Transform>().Select(t=>t.name).ToArray();
                string marker=type switch{"standard"=>"Writing desk","double"=>"Lounge coffee table","family"=>"Family activity table","business"=>"Executive work desk","premium"=>"Vanity writing desk","suite"=>"Suite bedroom divider",_=>"Home kitchen units"};
                Assert.IsTrue(names.Contains(marker),type+" distinctive fit-out missing");
                if(type=="standard")Assert.IsFalse(names.Contains("Kenney loungeSofa"),"Standard room must remain simpler than double/premium.");
                var sofa=root.GetComponentsInChildren<Transform>().FirstOrDefault(t=>t.name=="Room lounge sofa");
                if(sofa){
                    var table=root.GetComponentsInChildren<Transform>().Single(t=>t.name==(home?"Apartment lounge coffee table":type=="family"?"Family activity table":type=="suite"?"Suite stone coffee table":"Lounge coffee table"));
                    var sb=VisibleBounds(sofa);var tb=VisibleBounds(table);
                    var localSofa=BusinessRoomResident.BoundsOf(sofa,sofa);
                    Assert.IsTrue(localSofa.size.x>2.4f&&localSofa.size.z<1.2f,type+" sofa width must follow its seating axis");
                    Assert.IsTrue(Vector3.Dot(-sofa.forward,(table.position-sofa.position).normalized)>.8f,type+" sofa must face its table");
                    float gap=Mathf.Max(Mathf.Abs(sb.center.x-tb.center.x)-(sb.extents.x+tb.extents.x),Mathf.Abs(sb.center.z-tb.center.z)-(sb.extents.z+tb.extents.z));
                    Assert.IsTrue(gap>=.34f,type+" sofa/table clearance: "+gap);
                }
                // Check the major movable objects as complete rendered footprints.
                var furniture=root.GetComponentsInChildren<Transform>().Where(t=>t.name is "Room bed" or "Room lounge sofa" or "Writing desk" or "Executive work desk" or "Vanity writing desk" or "Lounge coffee table" or "Suite stone coffee table" or "Family activity table" or "Wardrobe" or "Hospitality minibar" or "Home kitchen units" or "Home fridge" or "Penthouse stone island").ToArray();
                var person=(Vector3)typeof(BusinessGameBridge).GetMethod("RoomResidentPoint",BindingFlags.Static|BindingFlags.NonPublic).Invoke(null,new object[]{home?"apartments":"hotel",type,false});
                foreach(var item in furniture){var b=VisibleBounds(item);b.Expand(new Vector3(.45f,0,.45f));Assert.IsFalse(person.x>b.min.x&&person.x<b.max.x&&person.z>b.min.z&&person.z<b.max.z,type+": guest stands in "+item.name);}
                for(int i=0;i<furniture.Length;i++)for(int j=i+1;j<furniture.Length;j++){
                    var a=VisibleBounds(furniture[i]);var b=VisibleBounds(furniture[j]);
                    float overlapX=Mathf.Min(a.max.x,b.max.x)-Mathf.Max(a.min.x,b.min.x),overlapZ=Mathf.Min(a.max.z,b.max.z)-Mathf.Max(a.min.z,b.min.z);
                    Assert.IsFalse(overlapX>.03f&&overlapZ>.03f,type+": furniture intersects: "+furniture[i].name+" / "+furniture[j].name);
                }
            }finally{UnityEngine.Object.DestroyImmediate(root);}
        }
        return "PASS: ten hotel/apartment designs, adult beds, single/double/king widths, twin-bed counts, room clearance, sofa orientation, sofas face their tables, coffee-table gaps and major furniture do not intersect.";
    }
    public static string Show(int floor=1){
        var bridge=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();
        typeof(BusinessGameBridge).GetField("roomKey",Flags).SetValue(bridge,"");
        var f=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-setup/fixtures/hotel.json"));
        f.properties.Single(p=>p.id=="hotel").floors=5;f.floor=floor;
        f.units=Enumerable.Range(0,20).Select(n=>new BusinessUnit{index=n,type=Types[n%6],condition=100,cleanliness=100}).ToArray();
        bridge.ApplyFrame(JsonUtility.ToJson(f));
        return "Hotel room comparison loaded";
    }
    public static string Focus(int unit){
        var bridge=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();var type=typeof(BusinessGameBridge);
        var interior=(GameObject)type.GetField("interior",Flags).GetValue(bridge);
        var frame=(BusinessFrame)type.GetField("frame",Flags).GetValue(bridge);bool home=frame.focus=="apartments";
        var target=interior.transform.TransformPoint(new Vector3(home?(unit%3-1)*7f:(unit%4-1.5f)*5.4f,1,1.4f));
        type.GetField("target",Flags).SetValue(bridge,target);type.GetField("yaw",Flags).SetValue(bridge,-18f);type.GetField("pitch",Flags).SetValue(bridge,55f);type.GetField("distance",Flags).SetValue(bridge,12.5f);
        type.GetMethod("CameraPose",Flags).Invoke(bridge,new object[]{true});return "Room camera ready";
    }
    public static string ShowHomes(int floor=1){
        var bridge=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();
        typeof(BusinessGameBridge).GetField("roomKey",Flags).SetValue(bridge,"");
        var f=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-setup/fixtures/hotel.json"));
        f.focus="apartments";f.properties.Single(p=>p.id==f.focus).floors=10;f.floor=floor;
        f.units=Enumerable.Range(0,30).Select(n=>new BusinessUnit{index=n,type=n>=27?"penthouse":Types[6+n%3],condition=100,cleanliness=100}).ToArray();
        bridge.ApplyFrame(JsonUtility.ToJson(f));
        var interior=(GameObject)typeof(BusinessGameBridge).GetField("interior",Flags).GetValue(bridge);
        Assert.IsTrue(interior.GetComponentsInChildren<Transform>().Any(t=>t.name=="Unit "+((floor-1)*3)),"Wrong apartment floor displayed");
        if(floor==10)Assert.IsTrue(interior.transform.position.y>25,"Tenth floor must be above the city ground");
        return Focus((floor-1)*3+1);
    }
}
