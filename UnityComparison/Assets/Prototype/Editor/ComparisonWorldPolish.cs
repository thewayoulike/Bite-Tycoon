using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object=UnityEngine.Object;

public static class ComparisonWorldPolish
{
 const string Folder="Assets/ComparisonPrepared";
 static Material paint,white,dark,rubber,glass,concrete,yellow,font;
 static Material Mat(string name,Color colour,float gloss=.25f){
  string path=Folder+"/Materials/Station-"+name+".mat";
  var m=AssetDatabase.LoadAssetAtPath<Material>(path);
  if(!m){m=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(m,path);}
  m.color=colour;m.SetFloat("_Smoothness",gloss);m.enableInstancing=true;EditorUtility.SetDirty(m);return m;
 }
 static GameObject Box(Transform root,string name,Vector3 at,Vector3 size,Material material){
  var g=GameObject.CreatePrimitive(PrimitiveType.Cube);g.name=name;g.transform.SetParent(root,false);g.transform.localPosition=at;g.transform.localScale=size;
  g.GetComponent<Renderer>().sharedMaterial=material;Object.DestroyImmediate(g.GetComponent<Collider>());return g;
 }
 static void Rod(Transform root,Vector3 a,Vector3 b,float radius,Material material){
  var g=GameObject.CreatePrimitive(PrimitiveType.Cylinder);g.name="Hose / metal tube";g.transform.SetParent(root,false);g.transform.localPosition=(a+b)/2;g.transform.up=(b-a).normalized;g.transform.localScale=new(radius*2,(b-a).magnitude/2,radius*2);g.GetComponent<Renderer>().sharedMaterial=material;Object.DestroyImmediate(g.GetComponent<Collider>());
 }
 static void Text(Transform root,string words,Vector3 at,float size,Color color){
  var g=new GameObject(words);g.transform.SetParent(root,false);g.transform.localPosition=at;
  var t=g.AddComponent<TextMesh>();t.font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");t.text=words;t.fontSize=64;t.characterSize=size/8;t.anchor=TextAnchor.MiddleCenter;t.alignment=TextAlignment.Center;t.color=color;
  var renderer=g.GetComponent<Renderer>();renderer.sharedMaterial=font;
  float height=renderer.bounds.size.y;if(height>.0001f)g.transform.localScale*=size*words.Split('\n').Length/height;
 }
 static Bounds Bounds(GameObject g){var r=g.GetComponentsInChildren<Renderer>();var b=r[0].bounds;foreach(var item in r)b.Encapsulate(item.bounds);return b;}
 static void Dining(BusinessGameBridge bridge){
  var root=new GameObject("Comparison dining set");
  var table=Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/CoffeeTable.prefab"),root.transform);
  var b=Bounds(table);table.transform.localScale=new(1.65f/b.size.x,.78f/b.size.y,1.5f/b.size.z);table.transform.localPosition=new(0,.44f,0);
  var seats=new[]{new Vector3(-1.176f,.44f,0),new Vector3(1.176f,.44f,0),new Vector3(0,.44f,1.12f),new Vector3(0,.44f,-1.12f)};
  for(int n=0;n<4;n++){
   var chair=Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/CoffeeChair.prefab"),root.transform);
   chair.name="Chair "+n;chair.transform.localPosition=seats[n];
   // The publisher's chair faces -Z; game actors face +Z.
   chair.transform.localRotation=Quaternion.Euler(0,new[]{270,90,0,180}[n],0);
  }
  bridge.tablePrefab=PrefabUtility.SaveAsPrefabAsset(root,Folder+"/DiningSet.prefab");Object.DestroyImmediate(root);
 }
 static void Station(Transform city,BusinessGameBridge bridge){
  foreach(string oldName in new[]{"Eastport petrol station","Eastgate city petrol station"}){var old=city.Find(oldName);if(old)Object.DestroyImmediate(old.gameObject);}
  var station=new GameObject("Eastgate city petrol station");station.transform.SetParent(city,false);station.transform.localPosition=new(75,0,75);var root=station.transform;
  font=bridge.fontMaterial;paint=Mat("teal",new(.045f,.28f,.29f));white=Mat("ivory",new(.88f,.88f,.8f));dark=Mat("charcoal",new(.065f,.085f,.09f));rubber=Mat("rubber",new(.025f,.03f,.03f));concrete=Mat("concrete",new(.53f,.56f,.55f));yellow=Mat("safety",new(.95f,.67f,.1f));glass=Mat("glass",new(.29f,.49f,.52f),.7f);
  Box(root,"Paved city forecourt",new(0,.16f,0),new(18.8f,.18f,18.8f),bridge.road);
  foreach(float x in new[]{-6f,6f})Box(root,"Driveway to city road",new(x,.15f,-10.3f),new(5,.14f,3.2f),bridge.road);
  Box(root,"Shop platform",new(0,.3f,6.6f),new(17.5f,.2f,5.5f),concrete);
  Box(root,"Shop rear",new(0,1.9f,9),new(17,3.2f,.3f),white);
  foreach(float x in new[]{-8.5f,8.5f})Box(root,"Shop side",new(x,1.9f,6.5f),new(.3f,3.2f,5),white);
  Box(root,"Shop roof",new(0,3.6f,6.5f),new(17.4f,.25f,5.4f),dark);
  Box(root,"Shop fascia",new(0,3.18f,3.96f),new(17.3f,.7f,.26f),paint);
  Text(root,"EASTGATE  MARKET & COFFEE",new(0,3.19f,3.8f),.27f,Color.white);
  for(int i=-3;i<=3;i++){
   Box(root,"Shop glazing",new(i*2.25f,1.7f,4),new(2.16f,2.25f,.05f),glass);
   Box(root,"Window mullion",new(i*2.25f-1.1f,1.7f,3.94f),new(.06f,2.3f,.09f),dark);
  }
  Box(root,"Door",new(0,1.55f,3.9f),new(1.3f,2.45f,.12f),dark);
  Box(root,"Door glass",new(0,1.7f,3.82f),new(1.12f,1.95f,.05f),glass);
  Box(root,"Door handle",new(.4f,1.55f,3.75f),new(.035f,.42f,.05f),white);
  foreach(float x in new[]{-3.6f,3.6f})foreach(float z in new[]{-5.7f,1f})Box(root,"Canopy pillar",new(x,2.3f,z),new(.2f,4.2f,.2f),white);
  Box(root,"Canopy",new(0,4.5f,-2.5f),new(16,.4f,8),white);
  Box(root,"Teal canopy edge",new(0,4.55f,-6.52f),new(16,.55f,.12f),paint);
  Text(root,"EASTGATE  FUEL",new(0,4.55f,-6.61f),.45f,Color.white);
  foreach(float x in new[]{-3.6f,3.6f}){
   const float z=-2.7f;Box(root,"Raised pump island",new(x,.35f,z),new(1.5f,.22f,6.6f),concrete);
   Box(root,"Fuel pump base",new(x,.86f,z),new(.75f,1,.58f),paint);
   Box(root,"Fuel pump head",new(x,1.6f,z),new(.95f,.6f,.65f),white);
   foreach(int face in new[]{-1,1}){
    Box(root,"Pump digital display",new(x,1.67f,z+face*.334f),new(.67f,.23f,.02f),dark);
    Box(root,"Payment pad",new(x,1.42f,z+face*.34f),new(.22f,.16f,.025f),dark);
   }
   var points=new[]{new Vector3(x+.5f,1.8f,z),new Vector3(x+.75f,1.5f,z),new Vector3(x+.83f,.65f,z),new Vector3(x+.7f,.55f,z),new Vector3(x+.5f,1.32f,z)};
   for(int i=0;i<points.Length-1;i++)Rod(root,points[i],points[i+1],.026f,rubber);
   Box(root,"Fuel nozzle",new(x+.5f,1.35f,z),new(.08f,.24f,.1f),yellow);
   foreach(float bollardZ in new[]{-5.5f,.2f})Rod(root,new(x,.4f,bollardZ),new(x,1.15f,bollardZ),.09f,yellow);
  }
  Box(root,"Price sign pillar",new(8.3f,2.7f,-8),new(.3f,5,.3f),white);
  Box(root,"Price sign",new(8.3f,3.8f,-8),new(1.8f,2.6f,.35f),paint);
  Text(root,"FUEL\nPETROL  1.49\nDIESEL  1.59\nOPEN 24H",new(8.3f,3.8f,-8.19f),.17f,Color.white);
  for(int n=0;n<2;n++){
   var car=Object.Instantiate(bridge.vehiclePrefabs[n],root);car.name="Car refuelling on forecourt";
   var carBounds=Bounds(car);float factor=Mathf.Min(1,1.8f/carBounds.size.x,4.1f/carBounds.size.z);car.transform.localScale*=factor;
   car.transform.localPosition=new(n==0?-6.2f:6.2f,.26f,-2.7f);
  }
  var occupancy=city.GetComponent<CityOccupancy>();
  if(occupancy)occupancy.buildings=occupancy.buildings.Where(f=>f.owner!="Eastgate city petrol station"&&f.owner!="Eastport petrol station").Append(new CityFootprint{owner=station.name,bounds=new Bounds(new(75,2,81.6f),new(17.5f,4,5.5f))}).ToArray();

  // Static scenery only: the station is not added to the property market.
 }
 public static string Apply(){
  if(EditorApplication.isPlaying||!Application.dataPath.Replace('\\','/').EndsWith("/UnityComparison/Assets"))throw new InvalidOperationException("Use the stopped comparison editor.");
  EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");var bridge=Object.FindFirstObjectByType<BusinessGameBridge>();Dining(bridge);
  var city=PrefabUtility.LoadPrefabContents(Folder+"/ComparisonCity.prefab");Station(city.transform,bridge);PrefabUtility.SaveAsPrefabAsset(city,Folder+"/ComparisonCity.prefab");PrefabUtility.UnloadPrefabContents(city);
  bridge.sharedCityData=AssetDatabase.LoadAssetAtPath<TextAsset>(Folder+"/city.json");
  if(!bridge.sharedCityData)throw new InvalidOperationException("Generate comparison city life first.");
  EditorUtility.SetDirty(bridge);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
  return "Petrol station, furniture alignment and comparison city life prepared.";
 }
}
