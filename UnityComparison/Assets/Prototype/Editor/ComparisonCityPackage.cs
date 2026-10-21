using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using Object=UnityEngine.Object;

// Rebuilds comparison scenery only. Gameplay addresses, routes and save IDs stay stable.
public static class ComparisonCityPackage
{
 const string Folder="Assets/ComparisonPrepared",Source="Assets/POLYGON city pack/Prefabs/Buildings";
 static readonly List<CityFootprint> footprints=new();
 static Bounds Bounds(GameObject g){var rs=g.GetComponentsInChildren<Renderer>().Where(r=>r.enabled).ToArray();var b=rs[0].bounds;foreach(var r in rs)b.Encapsulate(r.bounds);return b;}
 static GameObject Model(string file){return ComparisonArtSetup.Prepare("CITY_"+Path.GetFileNameWithoutExtension(file),Source+"/"+file+".prefab");}
 static GameObject Place(Transform parent,GameObject prefab,Vector3 at,float width,float depth,float angle,string owner){
  var model=Object.Instantiate(prefab,parent);model.name="CITY package / "+prefab.name;
  var b=Bounds(model);float scale=Mathf.Min(width/b.size.x,depth/b.size.z);
  model.transform.localScale*=scale;model.transform.localPosition=at;model.transform.localRotation=Quaternion.Euler(0,angle,0);
  footprints.Add(new CityFootprint{owner=owner,bounds=Bounds(model)});return model;
 }
 public static string Apply(){
  if(EditorApplication.isPlaying||!Application.dataPath.Replace('\\','/').EndsWith("/UnityComparison/Assets"))throw new InvalidOperationException("Use the stopped comparison editor.");
  EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");
  var bridge=Object.FindFirstObjectByType<BusinessGameBridge>();var data=JsonUtility.FromJson<SharedCityData>(bridge.sharedCityData.text);
  var city=PrefabUtility.LoadPrefabContents(Folder+"/ComparisonCity.prefab");footprints.Clear();
  var houses=new[]{"Building_F_prefab","Building_M_prefab","Building_N_Prefab","Building_O_PREFAB","Building_W_prefab","building_X_prefab"}.Select(Model).ToArray();
  var commercial=new[]{"Building_A_prefab","Building_A1_prefab","Building_B1_prefab","Building_C1_prefab","Building_D_prefab","Building_D1_prefab","Building_E_prefab","Building_H_prefab","Building_I_1_prefab","Building_J_prefab","Building_K_prefab","Building_R_Prefab","Building_S_prefab","Building_T_prefab","Building_Y_prefab","Building_Z_Prefab","Shop_A_prefab","Shop_B_prefab","Shop_C_prefab","Supermaket_prefab"}.Select(Model).ToArray();
  try{
   // These are hidden templates, not parked vehicles at the world origin.
   foreach(string name in new[]{"Airliner","FishingBoat","Yacht","Sailboat","PassengerTrain","FreightTrain"}){
    var template=city.transform.Find(name);if(template)template.gameObject.SetActive(false);
   }
   for(int q=0;q<4;q++){
    foreach(string name in new[]{"Residential neighbourhood "+q,"Comparison neighbourhood "+q,"CITY neighbourhood "+q}){var old=city.transform.Find(name);if(old){if(name.StartsWith("Residential"))old.gameObject.SetActive(false);else Object.DestroyImmediate(old.gameObject);}}
    var group=new GameObject("CITY neighbourhood "+q);group.transform.SetParent(city.transform,false);
    foreach(var h in data.houses.Where(h=>(h.x<0?1:0)+(h.z<0?2:0)==q)){
     int seed=Math.Abs((int)(h.x*7+h.z*13)+h.palette*11+h.style*3);
     Place(group.transform,houses[seed%houses.Length],new(h.x,h.y,h.z),Mathf.Min(h.width>0?h.width:6.2f,7),7.2f,h.angle,group.name);
    }
    ComparisonArtSetup.Combine(group,"CITYHomes"+q);
   }
   int changed=0;
   foreach(var site in data.parcels){
    var group=city.transform.Find("Parcel:"+site.id);if(!group||Math.Abs(site.x)<65&&Math.Abs(site.z)<65)continue;
    // Never replace a vacant parcel, and remove earlier comparison models before rebaking.
    var candidates=group.GetComponentsInChildren<MeshRenderer>().Where(r=>r.enabled&&r.bounds.max.y>3).ToArray();
    bool preparedBuilding=group.Cast<Transform>().Any(t=>t.name.StartsWith("Comparison ")||t.name.StartsWith("CITY package /"));
    if(candidates.Length==0&&!preparedBuilding)continue;
    foreach(Transform child in group.Cast<Transform>().Where(t=>t.name.StartsWith("Comparison ")||t.name.StartsWith("CITY package /")).ToArray())Object.DestroyImmediate(child.gameObject);
    foreach(var r in group.GetComponentsInChildren<MeshRenderer>())if(r.bounds.max.y>3)r.enabled=false;
    uint hash=2166136261;foreach(char c in site.id)hash=unchecked((hash^c)*16777619);int seed=(int)(hash&0x7fffffff);
    // Taller offices mix with low shops; no oversized strip-mall mesh squeezed into a tiny plot.
    var prefab=commercial[seed%commercial.Length];float width=14.2f+(seed%4)*.6f;
    Place(group,prefab,new(site.x,.14f,site.z),width,16,0,group.name);changed++;
   }
   // Capture unreplaced central buildings/industrial shells for the same clearance checks.
   foreach(Transform group in city.transform){
    if(!group.gameObject.activeSelf||group.name.StartsWith("Residential")||group.name.StartsWith("Comparison neighbourhood")||group.name.StartsWith("CITY neighbourhood"))continue;
    if(!group.name.StartsWith("Parcel:")&&!group.name.StartsWith("Lot:"))continue;
    if(footprints.Any(f=>f.owner==group.name))continue;
    foreach(var r in group.GetComponentsInChildren<MeshRenderer>().Where(r=>r.enabled&&r.bounds.max.y>3&&r.bounds.size.y>2&&r.bounds.size.x<50&&r.bounds.size.z<50))footprints.Add(new CityFootprint{owner=group.name,bounds=r.bounds});
   }
   var occupancy=city.GetComponent<CityOccupancy>();if(!occupancy)occupancy=city.AddComponent<CityOccupancy>();occupancy.buildings=footprints.ToArray();
   PrefabUtility.SaveAsPrefabAsset(city,Folder+"/ComparisonCity.prefab");
   // Keep the longest safe portion of each existing pavement route. Do not shift walkers onto roads.
   int shortened=0,removed=0;var walks=new List<SharedWalk>();
   foreach(var w in data.pedestrians??Array.Empty<SharedWalk>()){
    Vector3 a=new(w.start.x,w.start.y,w.start.z),b=new(w.end.x,w.end.y,w.end.z);int steps=Mathf.CeilToInt(Vector3.Distance(a,b)/.2f),start=-1,bestStart=0,bestEnd=-1;
    for(int n=0;n<=steps;n++){
     var at=Vector3.Lerp(a,b,n/(float)steps);bool safe=!footprints.Any(f=>BusinessGameBridge.FootprintContains(f.bounds,at,.45f));
     if(safe&&start<0)start=n;
     if((!safe||n==steps)&&start>=0){int end=safe?n:n-1;if(end-start>bestEnd-bestStart){bestStart=start;bestEnd=end;}start=-1;}
    }
    if(bestEnd-bestStart<10){removed++;continue;}
    Vector3 from=Vector3.Lerp(a,b,bestStart/(float)steps),to=Vector3.Lerp(a,b,bestEnd/(float)steps);
    if(footprints.Any(f=>BusinessGameBridge.WalkIntersects(f.bounds,from,to,.32f))){removed++;continue;}
    if(bestStart!=0||bestEnd!=steps)shortened++;
    walks.Add(new SharedWalk{start=new SharedPlacement{x=from.x,y=from.y,z=from.z},end=new SharedPlacement{x=to.x,y=to.y,z=to.z}});
   }
   data.pedestrians=walks.ToArray();File.WriteAllText(Folder+"/city.json",JsonUtility.ToJson(data));AssetDatabase.Refresh();
   bridge.sharedCityPrefab=AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/ComparisonCity.prefab");bridge.sharedCityData=AssetDatabase.LoadAssetAtPath<TextAsset>(Folder+"/city.json");
   EditorUtility.SetDirty(bridge);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
   string report=$"CITY package: {houses.Length+commercial.Length} building models; {data.houses.Length} homes, {changed} commercial scenery parcels; {footprints.Count} footprints. Pavement walks: {walks.Count} retained, {shortened} shortened, {removed} obstructed routes removed.";
   File.WriteAllText("../artifacts/unity-comparison/city-package-audit.txt",report);return report;
  }finally{PrefabUtility.UnloadPrefabContents(city);}
 }
}
