using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.Assertions;
public static class InteriorActivityChecks
{
 const BindingFlags F=BindingFlags.NonPublic|BindingFlags.Instance;
 public static string Show(string kind="apartments",int floor=1,float hours=12){
  var b=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();
  var f=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-setup/fixtures/hotel.json"));
  f.focus=kind;f.detail="room";f.floor=floor;f.hours=hours;f.night=hours>=20||hours<6;f.speed=1;
  var p=f.properties.First(p=>p.id==kind);p.floors=kind=="apartments"?10:5;
  var types=kind=="apartments"?new[]{"studio","onebed","twobed","penthouse"}:new[]{"standard","double","family","business","premium","suite"};
  f.units=Enumerable.Range(0,kind=="apartments"?30:20).Select(n=>new BusinessUnit{index=n,type=kind=="apartments"&&n>=27?"penthouse":types[n%types.Length],occupied=true,condition=100,cleanliness=100,cast=new BusinessPerson{id=new[]{"amira","daniel","sofia","noah"}[n%4],height=1.72f}}).ToArray();
  typeof(BusinessGameBridge).GetField("roomKey",F).SetValue(b,"");b.ApplyFrame(JsonUtility.ToJson(f));
  return "Occupied "+kind+" floor "+floor;
 }
 public static string ShowElectronics(){
  var b=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();var f=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-setup/fixtures/shop.json"));f.floor=1;f.speed=1;f.properties.First(p=>p.id==f.focus).floors=2;
  f.stock=new[]{new BusinessStock{id="tv",floor=1,quantity=3,capacity=4},new BusinessStock{id="laptop",floor=1,quantity=0,capacity=4}};
  f.visitors=Enumerable.Range(0,7).Select(n=>new BusinessVisitor{id=n.ToString(),seed=n,state="waiting",basket=n==6,cast=new BusinessPerson{id="daniel",height=1.75f}}).ToArray();
  b.ApplyFrame(JsonUtility.ToJson(f));return "Showroom fixture";
 }
 public static string ShowMall(int floor=0){
  var b=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();var f=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-setup/fixtures/hotel.json"));
  f.focus="park";f.detail="room";f.floor=floor;f.hours=12;f.night=false;f.speed=1;f.properties.First(p=>p.id==f.focus).floors=5;
  string[] types={"barber","bakery","fashion","pharmacy","toys","books","grocer","florist","cafe","restaurant","dessert","home","electronics","sports","beauty","books"};
  f.units=Enumerable.Range(0,20).Select(n=>new BusinessUnit{index=n,type=types[n%types.Length],occupied=true,tenant="Local "+types[n%types.Length],cleanliness=100,condition=100}).ToArray();f.visitors=Array.Empty<BusinessVisitor>();
  b.ApplyFrame(JsonUtility.ToJson(f));return "Leased mall floor "+floor;
 }
 public static string ShowRestaurant(string type="diner"){
  var b=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();var f=JsonUtility.FromJson<BusinessFrame>(File.ReadAllText("../artifacts/unity-setup/fixtures/diner.json"));
  f.restaurantType=type;f.night=false;f.hours=12;f.speed=1;f.revision=type.GetHashCode();b.ApplyFrame(JsonUtility.ToJson(f));return type;
 }
 public static string Camera(float distance=18,float pitch=48,int mallUnit=-1){
  var b=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();var t=typeof(BusinessGameBridge);var interior=(GameObject)t.GetField("interior",F).GetValue(b);
  var target=interior.transform.TransformPoint(new Vector3(0,1,0));
  if(mallUnit>=0){var shop=interior.transform.Find("Mall fitout/Lease unit "+mallUnit);target=shop.TransformPoint(new Vector3(0,1,0));}
  t.GetField("target",F).SetValue(b,target);t.GetField("distance",F).SetValue(b,distance);t.GetField("pitch",F).SetValue(b,pitch);t.GetField("yaw",F).SetValue(b,-15f);t.GetMethod("CameraPose",F).Invoke(b,new object[]{true});return "Camera adjusted";
 }
 public static string Report(){
  return string.Join("; ",UnityEngine.Object.FindObjectsByType<BusinessRoomResident>(FindObjectsSortMode.None).Select(r=>r.name+": "+r.activity+" "+r.transform.localPosition));
 }
 public static string CheckElectronics(){
  var displays=UnityEngine.Object.FindObjectsByType<ElectronicsDisplay>(FindObjectsSortMode.None);Assert.AreEqual(12,displays.Length);
  Assert.AreEqual("3 IN STOCK",displays.Single(d=>d.productId=="tv").availability.text);
  Assert.IsTrue(displays.Single(d=>d.productId=="laptop").availability.text.Contains("OUT OF STOCK"));
  Assert.IsTrue(displays.Single(d=>d.productId=="kettle").availability.text.Contains("NOT RANGED"));
  return "PASS: twelve named demo models and stock labels follow the matching SKU.";
 }
}
