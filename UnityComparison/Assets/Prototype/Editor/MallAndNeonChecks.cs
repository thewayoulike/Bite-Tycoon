using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Assertions;

public static class MallAndNeonChecks
{
    const BindingFlags Flags=BindingFlags.NonPublic|BindingFlags.Instance;
    static T Field<T>(BusinessGameBridge b,string key)=>(T)typeof(BusinessGameBridge).GetField(key,Flags).GetValue(b);
    public static string Run(){
        Assert.IsTrue(EditorApplication.isPlaying);
        var b=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();
        var f=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-comparison/market-audit-fixture.json"));
        f.focus="park";f.detail="exterior";f.night=false;b.ApplyFrame(JsonUtility.ToJson(f));
        var p=f.properties.Single(p=>p.id=="park");Assert.AreEqual("purchase",p.offer);Assert.IsFalse(p.owned);
        var model=Field<Dictionary<string,GameObject>>(b,"properties")["park"];
        var architecture=model.transform.Find("Building and site");
        var renderers=architecture.GetComponentsInChildren<Renderer>();var bounds=renderers[0].bounds;foreach(var r in renderers)bounds.Encapsulate(r.bounds);
        Assert.IsTrue(bounds.size.z>40&&bounds.size.x>40&&bounds.size.y>25,"Mall must cover four plots before purchase.");
        Assert.IsTrue(bounds.min.x> -9.25f&&bounds.max.x<34.25f&&bounds.min.z> -59.25f&&bounds.max.z< -15.75f,"Mall cannot cover perimeter carriageways.");
        var city=Field<Transform>(b,"sharedCity");
        foreach(var footprint in city.GetComponent<CityOccupancy>().buildings){
            var original=city.Find(footprint.owner);if(!original||!original.gameObject.activeSelf)continue;
            var n=footprint.bounds;
            Assert.IsFalse(bounds.min.x<n.max.x&&bounds.max.x>n.min.x&&bounds.min.z<n.max.z&&bounds.max.z>n.min.z,"Mall intersects "+footprint.owner);
        }
        Assert.IsTrue(renderers.Any(r=>r.name=="Barrel vault skylight")&&renderers.Any(r=>r.name=="Atrium escalator step"));
        Assert.AreApproximatelyEqual(12.5f,architecture.position.x);Assert.AreApproximatelyEqual(-37.5f,architecture.position.z);
        var civic=city.GetComponent<CityOccupancy>().buildings.Where(n=>n.owner.StartsWith("Relocated civic buildings/")).ToArray();Assert.AreEqual(3,civic.Length);
        foreach(var site in civic){Assert.IsTrue(site.bounds.min.z>40.75f&&site.bounds.max.z<59.25f,"Civic building overlaps perimeter street: "+site.owner);}
        Assert.IsFalse(civic[1].bounds.Intersects(civic[2].bounds),"Clinic and library must have separate sites.");
        p.owned=true;p.tenure="owned";p.offer="owned";p.floors=3;
        f.units=Enumerable.Range(0,12).Select(n=>new BusinessUnit{index=n,type="fashion",occupied=true,tenant="Test tenant"}).ToArray();f.visitors=Array.Empty<BusinessVisitor>();
        f.detail="room";f.floor=2;b.ApplyFrame(JsonUtility.ToJson(f));
        var interior=Field<GameObject>(b,"interior");Assert.AreApproximatelyEqual(8.8f,interior.transform.position.y);
        Assert.AreApproximatelyEqual(9.5f,Field<Vector3>(b,"target").y);
        var slab=interior.GetComponentsInChildren<Renderer>().Single(r=>r.name=="Interior floor");
        Assert.IsTrue(slab.bounds.size.x>40&&slab.bounds.size.z>38,"Playable mall must use its four-plot site.");
        Assert.AreEqual(Vector3.one,interior.transform.localScale,"Visitors must not inherit the stretched building scale.");
        Assert.AreApproximatelyEqual(12.5f,interior.transform.position.x);Assert.AreApproximatelyEqual(-37.5f,interior.transform.position.z);
        Assert.IsTrue(interior.GetComponentsInChildren<Transform>().Any(t=>t.name=="Lease unit 8"));
        f.detail="exterior";f.night=true;b.ApplyFrame(JsonUtility.ToJson(f));
        typeof(BusinessGameBridge).GetMethod("UpdateBusinessSigns",Flags).Invoke(b,new object[]{true});
        var inks=Field<Dictionary<string,Material>>(b,"neonLettering");Assert.IsTrue(inks.Count>=2);
        Assert.IsTrue(inks.Values.All(m=>m.GetFloat("_GlowStrength")>2&&m.GetColor("_GlowColor").maxColorComponent>.7f));
        var barber=Field<Dictionary<string,GameObject>>(b,"properties").Values.Single(g=>g.name==f.properties.Single(p=>p.cityCategory=="barber").id);
        Assert.IsTrue(barber.GetComponentsInChildren<Transform>().Any(t=>t.name=="Barber pole neon stripe"));
        foreach(var leased in f.properties.Where(p=>p.offer=="lease"&&!p.owned))Assert.IsFalse(Field<Dictionary<string,GameObject>>(b,"properties")[leased.id].GetComponentsInChildren<Transform>().Any(t=>t.name=="Neon window badge"),"Vacant premises cannot advertise an operating shop.");
        f.night=false;b.ApplyFrame(JsonUtility.ToJson(f));typeof(BusinessGameBridge).GetMethod("UpdateBusinessSigns",Flags).Invoke(b,new object[]{false});
        Assert.IsTrue(inks.Values.All(m=>m.GetFloat("_GlowStrength")<1));
        var report="PASS: unowned five-storey mall on a four-plot site, perimeter-road and neighbour clearance, relocated civic buildings, transparent vaulted atrium, full-size third floor and tenants, undistorted visitor scale, multicolour night signs, barber icon, subdued daytime signs and truthful vacant-shop boards.";
        File.WriteAllText("../artifacts/unity-comparison/mall-neon-checks.txt",report);return report;
    }
}
