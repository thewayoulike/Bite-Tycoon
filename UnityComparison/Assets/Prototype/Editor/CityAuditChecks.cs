using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Assertions;
using UnityEditor;

public static class CityAuditChecks
{
 const BindingFlags Flags=BindingFlags.Instance|BindingFlags.NonPublic;
 static T Field<T>(BusinessGameBridge b,string key)=>(T)typeof(BusinessGameBridge).GetField(key,Flags).GetValue(b);
 public static string Run(){
  Assert.IsTrue(EditorApplication.isPlaying,"Audit in Play mode.");
  var b=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();
  Assert.IsTrue(Field<List<Transform>>(b,"boats").Count==11,"Restart Play mode after recompiling before running the city audit.");
  Assert.IsTrue(Field<List<Transform>>(b,"flyingPlanes").Count==2);
  Assert.IsTrue(Field<List<Transform>>(b,"trees").Count>300);
  Assert.IsTrue(Field<List<Transform>>(b,"ambientPeople").Count>70);
  typeof(BusinessGameBridge).GetField("frame",Flags).SetValue(b,null);
  typeof(BusinessGameBridge).GetMethod("UpdateSharedCity",Flags).Invoke(b,null);
  Assert.IsTrue(Field<List<Transform>>(b,"boats").All(t=>t.position.z>300),"Boats start in the harbour without a browser connection.");
  Assert.AreEqual(274.5f,Field<Transform>(b,"train").position.x);
  Assert.AreEqual(281.5f,Field<Transform>(b,"freight").position.x);
  Assert.IsTrue(Field<List<Transform>>(b,"flyingPlanes").All(t=>t.position.sqrMagnitude>10000),"Aircraft cannot wait at the world origin.");
  var data=JsonUtility.FromJson<SharedCityData>(b.sharedCityData.text);var occupancy=b.sharedCityPrefab.GetComponent<CityOccupancy>();
  Assert.IsTrue(occupancy.buildings.Length>300);
  var hit=new Bounds(Vector3.zero,new(2,4,2));
  Assert.IsTrue(BusinessGameBridge.WalkIntersects(hit,new(-3,0,0),new(3,0,0),.3f),"Crossing with endpoints outside must be blocked.");
  Assert.IsFalse(BusinessGameBridge.WalkIntersects(hit,new(-3,0,2),new(3,0,2),.3f));
  foreach(var w in data.pedestrians){
   Assert.IsFalse(occupancy.buildings.Any(f=>BusinessGameBridge.WalkIntersects(f.bounds,new(w.start.x,w.start.y,w.start.z),new(w.end.x,w.end.y,w.end.z),.32f)),"Baked walk crosses a building.");
  }
  int checks=0;
  foreach(string kind in new[]{"hotel","apartments","shop","plaza"}){
   var frame=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-setup/fixtures/"+(kind=="plaza"?"hotel":kind)+".json"));
   var p=frame.properties.First(p=>p.id==frame.focus);p.kind=kind;p.floors=3;
   float storey=kind=="plaza"?4.4f:2.9f;
   int count=kind=="apartments"?3:4;
   frame.units=Enumerable.Range(0,12).Select(n=>new BusinessUnit{index=n,type=kind=="apartments"?"studio":kind=="plaza"?"fashion":"standard",occupied=true,condition=100,cleanliness=100}).ToArray();
   frame.visitors=Array.Empty<BusinessVisitor>();
   for(int floor=0;floor<=2;floor++){
    frame.floor=floor;frame.detail="room";frame.speed=0;b.ApplyFrame(JsonUtility.ToJson(frame));
    var interior=Field<GameObject>(b,"interior");
    Assert.IsTrue(Mathf.Abs(interior.transform.position.y-floor*storey)<.01f,kind+" floor height "+floor);
    Assert.IsTrue(Mathf.Abs(Field<Vector3>(b,"target").y-(floor*storey+.7f))<.01f,"Camera follows selected floor.");
    var names=interior.GetComponentsInChildren<Transform>().Select(t=>t.name).ToHashSet();
    if(floor>0){Assert.IsTrue(names.Contains("Lower storeys beneath selected floor"));}
    var slab=interior.GetComponentsInChildren<Renderer>().FirstOrDefault(r=>r.name=="Interior floor");
    if(slab)Assert.IsTrue(slab.bounds.size.x<=(kind=="plaza"?18.01f:16.81f)&&slab.bounds.size.z<=(kind=="plaza"?21.61f:16.81f),"Selected floor must leave pedestrians their pavement.");
    if(kind is "hotel" or "apartments"){
     Assert.AreEqual(floor==0,names.Contains("Reception feature panel"));
     if(floor>0){Assert.IsTrue(names.Contains("Unit "+((floor-1)*count)));Assert.IsFalse(names.Contains("Unit "+(floor*count)));}
    }
    if(kind=="shop")Assert.AreEqual(floor>0,names.Contains("ELECTRONICS & APPLIANCES"));
    if(kind=="plaza")Assert.IsTrue(names.Contains("Lease unit "+floor*4));
    checks++;
   }
  }
  var current=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-comparison/market-audit-fixture.json"));b.ApplyFrame(JsonUtility.ToJson(current));
  var trees=Field<List<Transform>>(b,"trees");var blockedTrees=Field<HashSet<Transform>>(b,"obstructedTrees");
  var walkers=Field<List<Transform>>(b,"ambientPeople");var blockedWalkers=Field<HashSet<Transform>>(b,"obstructedWalkers");
  var parked=Field<List<Transform>>(b,"parkedCars");var blockedParking=Field<HashSet<Transform>>(b,"obstructedParking");
  var parkingSites=Field<Dictionary<Transform,Vector2>>(b,"parkingSites");var replaced=Field<HashSet<Vector2>>(b,"redevelopedParking");var obstacles=Field<List<Bounds>>(b,"cityObstacles");int parkingChecked=0;
  foreach(var car in parked.Where(c=>!blockedParking.Contains(c)&&parkingSites.ContainsKey(c)&&!replaced.Contains(parkingSites[c]))){
   var rs=car.GetComponentsInChildren<Renderer>(true);var bounds=rs[0].bounds;foreach(var r in rs)bounds.Encapsulate(r.bounds);
   var site=parkingSites[car];Assert.IsTrue(Mathf.Abs(bounds.center.x-site.x)+bounds.extents.x<9.25f&&Mathf.Abs(bounds.center.z-site.y)+bounds.extents.z<9.25f,"Parked vehicle stays in its paved lot.");
   Assert.IsFalse(obstacles.Any(o=>o.min.x<bounds.max.x&&o.max.x>bounds.min.x&&o.min.z<bounds.max.z&&o.max.z>bounds.min.z),"Parked car intersects building.");parkingChecked++;
  }
  string result=$"PASS: transport positions before browser connection; {checks} floor views, camera elevations, room indices, electronics, mall units; {data.pedestrians.Length} full pavement segments checked; {occupancy.buildings.Length} building footprints; {parkingChecked} unobstructed parking spaces. Tree clearance: {trees.Count-blockedTrees.Count}/{trees.Count} retained. Outdoor walkers: {walkers.Count-blockedWalkers.Count}/{walkers.Count} retained.";
  File.WriteAllText("../artifacts/unity-comparison/map-audit-checks.txt",result);return result;
 }
}
