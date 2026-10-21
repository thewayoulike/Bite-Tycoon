using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

[Serializable] public class CityFootprint { public string owner; public Bounds bounds; }
public sealed class CityOccupancy : MonoBehaviour { public CityFootprint[] buildings=Array.Empty<CityFootprint>(); }

public sealed partial class BusinessGameBridge
{
 readonly HashSet<Transform> obstructedTrees=new(),obstructedWalkers=new();
 readonly HashSet<Transform> obstructedParking=new();
 readonly Dictionary<Transform,Vector3> originalParking=new();
 readonly List<Bounds> cityObstacles=new(); string occupancyKey;
 public static bool FootprintContains(Bounds b,Vector3 point,float margin) =>
  point.x>=b.min.x-margin&&point.x<=b.max.x+margin&&point.z>=b.min.z-margin&&point.z<=b.max.z+margin;
 public static bool WalkIntersects(Bounds b,Vector3 a,Vector3 c,float margin){
  // Slab intersection includes the complete swept segment, not only its ends.
  float lo=0,hi=1;
  for(int axis=0;axis<2;axis++){
   float p=axis==0?a.x:a.z,d=axis==0?c.x-a.x:c.z-a.z;
   float min=(axis==0?b.min.x:b.min.z)-margin,max=(axis==0?b.max.x:b.max.z)+margin;
   if(Mathf.Abs(d)<.00001f){if(p<min||p>max)return false;continue;}
   float t0=(min-p)/d,t1=(max-p)/d;if(t0>t1)(t0,t1)=(t1,t0);
   lo=Mathf.Max(lo,t0);hi=Mathf.Min(hi,t1);if(lo>hi)return false;
  }
  return true;
 }
 void RefreshCityOccupancy(){
  if(!sharedCity||frame==null)return;
  string key=string.Join(";",frame.properties.Select(p=>p.id+":"+p.kind+":"+p.owned+":"+p.existing))+frame.market+":"+IsInteriorView()+":"+frame.focus;
  if(key==occupancyKey)return;occupancyKey=key;cityObstacles.Clear();
  var baked=sharedCity.GetComponent<CityOccupancy>();
  foreach(var f in baked?.buildings??Array.Empty<CityFootprint>()){
   // Skip obsolete background geometry once a business replaces the parcel.
   var group=string.IsNullOrEmpty(f.owner)?sharedCity:sharedCity.Find(f.owner);
   if(group&&group.gameObject.activeSelf)cityObstacles.Add(f.bounds);
  }
  foreach(var p in frame.properties.Where(p=>p.offer!="internal"&&p.kind is not ("land" or "park")))
   if((!p.preserveExterior||IsInteriorView()&&p.id==frame.focus)&&(p.owned||StreetApplicable(p)))cityObstacles.Add(new Bounds(SiteCenter(p)+Vector3.up*2,SiteExtent(p)));
  obstructedTrees.Clear();
  foreach(var tree in trees){
   // Keep the trunk and the inner crown outside the building, including later construction.
   var renderers=tree.GetComponentsInChildren<Renderer>(true);if(renderers.Length==0)continue;
   var b=renderers[0].bounds;foreach(var r in renderers)b.Encapsulate(r.bounds);
   float crown=Mathf.Clamp(Mathf.Max(b.extents.x,b.extents.z),.55f,4f);
   if(cityObstacles.Any(o=>FootprintContains(o,tree.position,crown))||(sharedCity.Find("Eastgate city petrol station")?.gameObject.activeSelf==true&&FootprintContains(new Bounds(new(75,0,75),new(18.8f,4,18.8f)),tree.position,crown)))obstructedTrees.Add(tree);
  }
  obstructedWalkers.Clear();
  foreach(var actor in ambientPeople){
   if(actor.name=="Airport passenger")continue; // Terminal paths run inside the concourse intentionally.
   var walk=actor.GetComponent<PrototypePerson>();
   if(cityObstacles.Any(o=>WalkIntersects(o,walk.routeA,walk.routeB,.32f)))obstructedWalkers.Add(actor);
  }
  // Imported scenery can occupy part of an old parking yard. Keep each parked
  // vehicle wholly on that paved parcel and clear of the new architecture.
  obstructedParking.Clear();var occupiedParking=new List<Bounds>();
  foreach(var car in parkedCars){
   if(!originalParking.TryGetValue(car,out var original)){original=car.position;originalParking[car]=original;}
   car.position=original;
   if(!parkingSites.TryGetValue(car,out var site)||redevelopedParking.Contains(site))continue;
   var renderers=car.GetComponentsInChildren<Renderer>(true);if(renderers.Length==0)continue;
   var b=renderers[0].bounds;foreach(var renderer in renderers)b.Encapsulate(renderer.bounds);
   bool Free(Bounds candidate)=>!cityObstacles.Any(o=>RectOverlap(o,candidate,.15f))&&!occupiedParking.Any(o=>RectOverlap(o,candidate,.25f));
   if(!Free(b)){
    bool placed=false;
    foreach(var offset in new[]{new Vector2(-8.2f,-6),new Vector2(8.2f,-6),new Vector2(-8.2f,0),new Vector2(8.2f,0),new Vector2(-8.2f,6),new Vector2(8.2f,6),new Vector2(0,-7),new Vector2(0,7)}){
     var candidate=new Bounds(new(site.x+offset.x,b.center.y,site.y+offset.y),b.size);
     if(Mathf.Abs(offset.x)+b.extents.x>9.2f||Mathf.Abs(offset.y)+b.extents.z>9.2f||!Free(candidate))continue;
     car.position+=candidate.center-b.center;b=candidate;placed=true;break;
    }
    if(!placed){obstructedParking.Add(car);continue;}
   }
   occupiedParking.Add(b);
  }
 }
 static bool RectOverlap(Bounds a,Bounds b,float margin)=>a.min.x-margin<b.max.x&&a.max.x+margin>b.min.x&&a.min.z-margin<b.max.z&&a.max.z+margin>b.min.z;
 float SelectedFloorHeight(BusinessProperty p) => p!=null&&p.kind is "shop" or "hotel" or "apartments" or "plaza" ? Mathf.Max(0,p.kind is "hotel" or "apartments"&&frame.floor>p.floors?p.floors+1:frame.floor)*StoreyHeight(p) : 0;
 void AmenitiesInterior(BusinessProperty p){
  string key="amenities:"+string.Join(",",frame.facilities??Array.Empty<string>());if(roomKey==key)return;roomKey=key;
  RemovePeople(new HashSet<string>());var root=Group(interior.transform,"Shared amenities");
  Label(root,"SHARED AMENITIES  /  ROOF WING",new(0,3.5f,9.8f),.6f);
  int n=0;foreach(string facility in frame.facilities??Array.Empty<string>()){
   var area=Group(root,facility);area.localPosition=new(-7+(n%3)*7,.44f,-4+(n/3)*8);n++;
   Label(area,facility.ToUpperInvariant(),new(0,2.8f,2.8f),.3f);
   if(facility=="laundry")for(int i=-1;i<=1;i++){
    Box(area,"Washing machine",new(i*1.4f,.65f,1),new(1.2f,1.3f,1.1f),plaster);Sphere(area,"Washer door",new(i*1.4f,.7f,.43f),new(.8f,.8f,.05f),glass);
   }else if(facility=="restaurant"){
    var table=Instantiate(tablePrefab,area);table.transform.localScale=Vector3.one*.8f;
    Box(area,"Breakfast buffet",new(0,.8f,2.3f),new(4,1.6f,1),wood);
   }else if(facility=="gym")for(int i=-1;i<=1;i++){
    Box(area,"Exercise treadmill",new(i*1.6f,.2f,0),new(1.2f,.3f,2.4f),metal);Box(area,"Exercise console",new(i*1.6f,1.3f,1),new(1.2f,.3f,.4f),metal);
   }else{Sofa(area,new(0,0,1),0);PlaceFreeAsset(area,"tableCoffee",new(0,0,-.5f),1.5f,0);Plant(area,new(2.5f,0,1),1);}
  }
 }
 void LowerStoreys(Transform root,BusinessProperty p,float height){
  if(height<=0)return;
  var lower=Group(root,"Lower storeys beneath selected floor");lower.localPosition=new(0,-height,0);if(GalleriaSite(p))lower.localScale=GalleriaPlanScale;
  float width=p.kind=="plaza"?24:22,depth=p.kind=="plaza"?28.8f:20,storey=StoreyHeight(p);
  for(int floor=0;floor<Mathf.RoundToInt(height/storey);floor++){
   float y=floor*storey;
   Box(lower,"Lower floor slab",new(0,y+.35f,0),new(width,.18f,depth),paving);
   foreach(int side in new[]{-1,1}){
    Box(lower,"Lower side wall",new(side*(width/2-.1f),y+1.75f,0),new(.2f,storey-.1f,depth),plaster);
    Box(lower,"Lower front glazing",new(0,y+1.7f,side*(depth/2-.1f)),new(width-.4f,2.5f,.06f),glass);
    for(int bay=-3;bay<=3;bay++)Box(lower,"Lower window frame",new(bay*width/7,y+1.75f,side*(depth/2-.1f)),new(.12f,2.8f,.14f),metal);
   }
  }
 }
}
