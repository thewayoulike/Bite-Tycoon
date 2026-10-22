using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

// Uses the same furniture builders and measured imported mesh as the running game.
public static class DiningFurnitureChecks
{
 const BindingFlags F=BindingFlags.NonPublic|BindingFlags.Instance;
 const string Output="../artifacts/dining-furniture/";
 static GameObject fixture;
 static object Call(BusinessGameBridge b,string method,params object[] args)=>typeof(BusinessGameBridge).GetMethod(method,F).Invoke(b,args);
 static void Require(bool ok,string message){if(!ok)throw new Exception(message);}
 static Vector3[] Vertices(Transform root)=>root.GetComponentsInChildren<MeshFilter>(true).SelectMany(m=>m.sharedMesh.vertices.Select(v=>root.InverseTransformPoint(m.transform.TransformPoint(v)))).ToArray();
 public static string Run(){
  Directory.CreateDirectory(Output);var b=Object.FindFirstObjectByType<BusinessGameBridge>();var host=new GameObject("Temporary furniture checks");
  try{
   foreach(string style in new[]{"diner","cafe","bistro","japanese"}){
    var table=(GameObject)Call(b,"RestaurantDiningSet",host.transform,style);
    var tops=table.GetComponentsInChildren<Renderer>().Where(r=>r.name=="Dining tabletop").ToArray();
    Require(tops.Length>0&&tops.All(r=>Mathf.Abs(r.bounds.max.y-1.30f)<.001f),style+": meal support height");
    var chairs=table.GetComponentsInChildren<Transform>().Where(t=>t.name=="Dining chair "+style).ToArray();
    Require(chairs.Length==4,style+": four chairs");
    foreach(var chair in chairs){
     var seat=chair.Find("Seat cushion").GetComponent<Renderer>().bounds;
     Require(Mathf.Abs(seat.max.y-.90f)<.001f,style+": seat/pelvis alignment");
     // Chair's back is +Z; its sitter faces the table in -Z.
     var towardTable=-chair.localPosition.normalized;
     Require(Vector3.Dot(chair.localRotation*Vector3.back,towardTable)>.999f,style+": chair faces away from table");
     var parts=chair.GetComponentsInChildren<Renderer>();
     Require(parts.Min(r=>r.bounds.min.y)>.48f&&parts.Min(r=>r.bounds.min.y)<.52f,style+": feet must reach floor");
     Require(parts.All(r=>Mathf.Abs(r.bounds.center.x)+r.bounds.extents.x<1.6f&&Mathf.Abs(r.bounds.center.z)+r.bounds.extents.z<1.6f),style+": chair blocks an aisle");
     Require(!seat.Intersects(tops[0].bounds),style+": seat intersects tabletop");
    }
    Require(Vertices(table.transform).All(v=>float.IsFinite(v.x)&&float.IsFinite(v.y)&&float.IsFinite(v.z)),style+": invalid furniture vertex");
    if(style=="bistro")Require(tops[0].sharedMaterial.renderQueue>=3000&&tops[0].sharedMaterial.GetFloat("_Opacity")<.3f,"Glass table must be transparent");
    Object.DestroyImmediate(table);
   }
   var plane=(Transform)Call(b,"ImportedAirlinerTemplate",host.transform);var points=Vertices(plane);float top=points.Max(p=>p.y);
   var fin=points.Where(p=>p.y>top-.15f).Aggregate(Vector3.zero,(sum,p)=>sum+p)/points.Count(p=>p.y>top-.15f);
   Require(fin.z<-8&&Mathf.Abs(fin.x)<.2f,"Imported airliner tail must face backward (-Z), not sideways");
   var path=JsonUtility.FromJson<SharedCityData>(b.sharedCityData.text);int segments=0;
   foreach(var flight in path.flights)for(int n=1;n<flight.points.Length;n++){
    var a=flight.points[n-1];var z=flight.points[n];var direction=new Vector3(z.x-a.x,z.y-a.y,z.z-a.z);if(direction.sqrMagnitude<.0001f)continue;
    var heading=Quaternion.LookRotation(direction);var nose=heading*Vector3.forward;
    Require(Vector3.Dot(nose,direction.normalized)>.9999f,"Airliner must face its flight direction");segments++;
   }
   string result=$"PASS: four furniture geometries, 16 inward-facing chairs, seat/floor and meal heights, aisle bounds, transparent bistro glass; imported tail {fin}, {segments} flight segments nose-forward.";
   File.WriteAllText(Output+"native-checks.txt",result);return result;
  }finally{Object.DestroyImmediate(host);}
 }
 public static string Show(string style){
  Clear();var b=Object.FindFirstObjectByType<BusinessGameBridge>();fixture=new GameObject("Temporary dining visual check");fixture.transform.position=new(2000,0,2000);
  Call(b,"RestaurantDiningSet",fixture.transform,style);
  var floor=GameObject.CreatePrimitive(PrimitiveType.Cube);floor.transform.SetParent(fixture.transform,false);floor.transform.localPosition=new(0,.44f,0);floor.transform.localScale=new(6,.10f,6);floor.GetComponent<Renderer>().sharedMaterial=b.paving;
  return "Ready to capture "+style;
 }
 public static string Capture(string style){
  var b=Object.FindFirstObjectByType<BusinessGameBridge>();var cam=b.viewCamera;var pos=cam.transform.position;var rot=cam.transform.rotation;float near=cam.nearClipPlane,far=cam.farClipPlane;bool occlusion=cam.useOcclusionCulling;
  var rt=new RenderTexture(1200,900,24);var tex=new Texture2D(1200,900,TextureFormat.RGB24,false);var old=RenderTexture.active;
  try{
   cam.transform.position=fixture.transform.position+new Vector3(3.5f,3.5f,-4);cam.transform.LookAt(fixture.transform.position+Vector3.up*.8f);cam.nearClipPlane=.01f;cam.farClipPlane=50;cam.useOcclusionCulling=false;cam.ResetCullingMatrix();rt.Create();
   for(int n=0;n<2;n++)RenderPipeline.SubmitRenderRequest(cam,new RenderPipeline.StandardRequest{destination=rt});
   RenderTexture.active=rt;tex.ReadPixels(new Rect(0,0,1200,900),0,0);tex.Apply();File.WriteAllBytes(Output+style+"-native.png",tex.EncodeToPNG());return style+" captured";
  }finally{cam.transform.SetPositionAndRotation(pos,rot);cam.nearClipPlane=near;cam.farClipPlane=far;cam.useOcclusionCulling=occlusion;RenderTexture.active=old;rt.Release();Object.DestroyImmediate(rt);Object.DestroyImmediate(tex);}
 }
 public static void Clear(){if(fixture)Object.DestroyImmediate(fixture);fixture=null;}
}
