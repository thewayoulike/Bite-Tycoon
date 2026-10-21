using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Collections;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Assertions;

public static class CityMarketTrafficChecks
{
 const BindingFlags Flags=BindingFlags.NonPublic|BindingFlags.Instance;
 static T Field<T>(BusinessGameBridge b,string name)=>(T)typeof(BusinessGameBridge).GetField(name,Flags).GetValue(b);
 static BusinessGameBridge bridge;static double until,nextSample;static Vector3[] last;static readonly HashSet<int> stopped=new(),resumed=new();
 public static string Run(){
  Assert.IsTrue(EditorApplication.isPlaying);
  var b=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();
  Assert.AreEqual(12,Field<IList>(b,"junctionSignals").Count);
  for(float t=0;t<56;t+=.25f)Assert.IsFalse(BusinessGameBridge.TrafficAspect(t,true)==2&&BusinessGameBridge.TrafficAspect(t,false)==2,"Cross traffic cannot share green.");
  Assert.AreEqual(0f,BusinessGameBridge.SignalTravelLimit(new(-6.5f,0,-1.05f),Vector3.right,Vector3.zero,.45f,18));
  Assert.AreEqual(.45f,BusinessGameBridge.SignalTravelLimit(new(-6.5f,0,-1.05f),Vector3.right,Vector3.zero,.45f,4));
  Assert.AreEqual(.45f,BusinessGameBridge.SignalTravelLimit(new(-4,0,-1.05f),Vector3.right,Vector3.zero,.45f,18),"A crossing vehicle must clear the junction.");
  Assert.AreEqual(.45f,BusinessGameBridge.SignalTravelLimit(new(-6.5f,0,20),Vector3.right,Vector3.zero,.45f,18),"A parallel road must not stop at this signal.");
  var f=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-comparison/market-audit-fixture.json"));b.ApplyFrame(JsonUtility.ToJson(f));
  var city=Field<Transform>(b,"sharedCity");var station=city.Find("Eastgate city petrol station");
  Assert.IsNotNull(station);Assert.IsTrue(station.gameObject.activeSelf);Assert.AreEqual(new Vector3(75,0,75),station.position);
  Assert.IsNull(city.Find("Eastport petrol station"));
  Assert.IsFalse(city.Find("Parcel:city-325-325")?.gameObject.activeSelf==true,"Station cannot overlap the old vacant lot.");
  foreach(var car in station.GetComponentsInChildren<Transform>().Where(t=>t.name=="Car refuelling on forecourt"))Assert.IsTrue(Mathf.Abs(car.localPosition.x)<8&&Mathf.Abs(car.localPosition.z)<8);
  var listing=f.properties.First(p=>p.preserveExterior&&p.offer=="purchase"&&p.siteId.StartsWith("city-"));
  var model=city.Find("Parcel:"+listing.siteId);Assert.IsTrue(model.gameObject.activeSelf);
  var bounds=model.GetComponentsInChildren<Renderer>().Where(r=>r.enabled).Select(r=>r.bounds).ToArray();
  listing.owned=true;listing.tenure="owned";listing.offer="owned";listing.name="New owner, same building";b.ApplyFrame(JsonUtility.ToJson(f));
  Assert.IsTrue(model.gameObject.activeSelf);Assert.IsTrue(bounds.SequenceEqual(model.GetComponentsInChildren<Renderer>().Where(r=>r.enabled).Select(r=>r.bounds)),"Acquisition must not replace the CITY model.");
  Assert.IsTrue(UnityEngine.Object.FindObjectsByType<TextMesh>(FindObjectsSortMode.None).Any(t=>t.text.Contains("BARBERS")));
  f.night=true;b.ApplyFrame(JsonUtility.ToJson(f));typeof(BusinessGameBridge).GetMethod("UpdateBusinessSigns",Flags).Invoke(b,new object[]{true});
  Assert.IsTrue(Field<Dictionary<Material,Color>>(b,"illuminatedSigns").Keys.All(m=>m.GetColor("_EmissionColor").maxColorComponent>0));
  f.night=false;b.ApplyFrame(JsonUtility.ToJson(f));
  return "PASS: 12 controlled junctions; exclusive green, red stop, clearance and adjacent-lane checks; city petrol forecourt; stable acquired exterior; named shops and illuminated night boards.";
 }
 public static string RecordTraffic(){
  bridge=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();until=EditorApplication.timeSinceStartup+42;nextSample=0;last=null;stopped.Clear();resumed.Clear();
  EditorApplication.update-=Sample;EditorApplication.update+=Sample;return "Recording 42 seconds of actual stop/restart movement.";
 }
 static void Sample(){
  if(!EditorApplication.isPlaying||!bridge){EditorApplication.update-=Sample;return;}
  if(EditorApplication.timeSinceStartup<nextSample)return;nextSample=EditorApplication.timeSinceStartup+.25;
  var positions=Field<List<Transform>>(bridge,"cars").Select(t=>t.localPosition).ToArray();
  if(last!=null)for(int n=0;n<positions.Length;n++){
   float moved=Vector3.Distance(positions[n],last[n]);
   if(moved<.015f)stopped.Add(n);else if(moved>.12f&&stopped.Contains(n))resumed.Add(n);
  }
  last=positions;
  if(EditorApplication.timeSinceStartup>=until){EditorApplication.update-=Sample;File.WriteAllText("../artifacts/unity-comparison/traffic-motion-audit.txt",$"Cars: {positions.Length}; stopped in signals/queues: {stopped.Count}; resumed after stopping: {resumed.Count}.");}
 }
}
