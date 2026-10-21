using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

[Serializable] public class SharedMeshEntry {public string name,group,file,surface;}
[Serializable] public class SharedPlacement {public float x,y,z,scale,angle,width;public int seed,palette,style;}
[Serializable] public class SharedCar {public float x,z,lotX,lotZ;public string color,style;}
[Serializable] public class SharedStack {public float x,z,top,radius;}
[Serializable] public class SharedPalette {public string siding,roof,trim,accent;}
[Serializable] public class SharedFlight {public float duration;public SharedPlacement[] points;}
[Serializable] public class SharedTraffic {public float length;public SharedPlacement[] points;}
[Serializable] public class SharedView {public string id;public float[] target,position;}
[Serializable] public class SharedSite {public string id;public float x,z;}
[Serializable] public class SharedWalk {public SharedPlacement start,end;}
[Serializable] public class SharedCityData {public SharedMeshEntry[] meshes;public SharedPlacement[] houses,trees;public SharedCar[] cars;public SharedStack[] stacks;public SharedPalette[] palettes;public SharedFlight[] flights;public SharedTraffic[] traffic;public SharedWalk[] pedestrians;public SharedView[] views;public SharedSite[] parcels,lots;}

public sealed partial class BusinessGameBridge
{
 public GameObject sharedCityPrefab;public TextAsset sharedCityData;
 SharedCityData cityData;Transform sharedCity;readonly List<Transform> flyingPlanes=new(),ambientPeople=new();readonly List<ParticleSystem> factorySmoke=new();float nextCrowdCheck;
 readonly Dictionary<string,Transform> sceneryTemplates=new();Transform freight;
 void BuildSharedCity()
 {
  PrepareWorldMaterials();cityData=JsonUtility.FromJson<SharedCityData>(sharedCityData.text);
  sharedCity=Instantiate(sharedCityPrefab).transform;sharedCity.name="City from the existing game";
  walkSurface=sharedCity.gameObject.AddComponent<BusinessWalkSurface>();walkSurface.Initialize(sharedCity);
  foreach(string name in new[]{"Airliner","FishingBoat","Yacht","Sailboat","PassengerTrain","FreightTrain"}){var source=sharedCity.Find(name);source.gameObject.SetActive(false);sceneryTemplates[name]=source;}
  CreateWater(sharedCity);
  if(comparisonPlane){var plane=Instantiate(comparisonPlane,sharedCity).transform;plane.gameObject.SetActive(false);sceneryTemplates["Airliner"]=plane;}
  for(int i=0;i<2;i++){var plane=SceneryCopy("Airliner","Arrivals and departures");flyingPlanes.Add(plane);}
  foreach(float z in new[]{-73f,-17f}){var plane=SceneryCopy("Airliner","Parked aircraft");plane.localPosition=new(436,2,z);plane.localRotation=Quaternion.Euler(0,-90,0);}
  foreach(var source in comparisonBoats){var template=Instantiate(source,sharedCity).transform;template.gameObject.SetActive(false);sceneryTemplates[source.name]=template;}
  for(int i=0;i<11;i++){
   string style=i==7||i==9?"Yacht":i==8||i==10?"Sailboat":"FishingBoat";
   if(comparisonBoats.Length==3)style=i is 0 or 2?"OldRowboat":i is 5 or 6?"MotorboatBlue":i==7?"MotorboatWhite":style;
   boats.Add(SceneryCopy(style,"Harbour boat"));
  }
  train=SceneryCopy("PassengerTrain","Eastport passenger train");freight=SceneryCopy("FreightTrain","Industrial freight train");
  foreach(var t in cityData.trees){if(!treePrefab)break;var source=comparisonTrees.Length>0?comparisonTrees[Math.Abs(t.seed)%comparisonTrees.Length]:treePrefab;var tree=Instantiate(source,new Vector3(t.x,.16f,t.z),Quaternion.Euler(0,t.seed%360,0),sharedCity).transform;tree.localScale*=t.scale;trees.Add(tree);}
  for(int n=0;n<12;n++){var tree=Instantiate(treePrefab,new Vector3(535,0,-100+n*15),Quaternion.identity,sharedCity).transform;tree.localScale*=.85f;trees.Add(tree);}
  foreach(var p in cityData.cars){if(p.style=="truck")Truck(sharedCity,new(p.x,.15f,p.z));else if(vehiclePrefabs.Length>0){var car=Instantiate(vehiclePrefabs[Math.Abs((int)p.x)%vehiclePrefabs.Length],sharedCity).transform;car.localPosition=new(p.x,.15f,p.z);FitModel(car,1.8f,4.1f);parkedCars.Add(car);parkingSites[car]=new(p.lotX,p.lotZ);}}
  for(int n=0;n<12;n++){var car=Instantiate(vehiclePrefabs[n%vehiclePrefabs.Length],sharedCity).transform;car.localPosition=new(466+n%6*6.4f,.18f,44+n/6*20);FitModel(car,1.8f,4.1f);parkedCars.Add(car);}
  for(int n=0;n<(cityData.traffic?.Length??0);n++){var car=Instantiate(vehiclePrefabs[n%vehiclePrefabs.Length],sharedCity).transform;car.name="Road traffic "+n;FitModel(car,1.8f,4.1f);cars.Add(car);}
  CreateTrafficSignals();
  foreach(var stack in cityData.stacks)
  {
   var smoke=new GameObject("Wind-driven factory smoke").AddComponent<ParticleSystem>();smoke.transform.SetParent(sharedCity,false);smoke.transform.localPosition=new(stack.x,stack.top,stack.z);
   var main=smoke.main;main.startSpeed=1.2f;main.startLifetime=9;main.startSize=stack.radius*2;main.startColor=new Color(.66f,.69f,.69f,.24f);main.maxParticles=28;main.simulationSpace=ParticleSystemSimulationSpace.World;
   var emission=smoke.emission;emission.rateOverTime=2.6f;var velocity=smoke.velocityOverLifetime;velocity.enabled=true;velocity.space=ParticleSystemSimulationSpace.World;velocity.x=.85f;velocity.y=.8f;
   var size=smoke.sizeOverLifetime;size.enabled=true;size.size=new ParticleSystem.MinMaxCurve(1,AnimationCurve.Linear(0,.4f,1,2.8f));smoke.GetComponent<ParticleSystemRenderer>().sharedMaterial=smokeMaterial;factorySmoke.Add(smoke);
  }
  var airportSign=Group(sharedCity,"Eastport terminal sign");airportSign.localPosition=new(509.5f,12,-48);airportSign.localRotation=Quaternion.Euler(0,-90,0);Label(airportSign,"EASTPORT AIRPORT",Vector3.zero,1.7f);
  for(int n=0;n<14;n++)AmbientPerson(new(510.7f+n%3*.8f,.58f,-85+n*5.2f),new(510.7f+n%3*.8f,.58f,-77+n*5.2f),n,true);
  for(int n=0;n<12;n++)AmbientPerson(new(480+n%3*2,.95f,-80+n*6),new(480+n%3*2,.95f,-76+n*6),40+n,true);
  var checkinSign=Group(sharedCity,"Terminal check-in sign");checkinSign.localPosition=new(490,4.6f,-59);checkinSign.localRotation=Quaternion.Euler(0,-90,0);Label(checkinSign,"CHECK-IN  /  DEPARTURES",Vector3.zero,1.1f);
  for(int n=0;n<8;n++)AmbientPerson(new(-190+n*47,.45f,285),new(-180+n*47,.45f,285),20+n,false);
  int walker=80;
  foreach(var walk in cityData.pedestrians??Array.Empty<SharedWalk>()){
   AmbientPerson(new(walk.start.x,walk.start.y,walk.start.z),new(walk.end.x,walk.end.y,walk.end.z),walker++,false);
  }
  CreateWeather();
  // Position every transport before the first rendered frame, even while the
  // browser state is loading or the Unity editor is being previewed on its own.
  UpdateSharedCity();AnimateScenery();
 }
 readonly List<Transform> parkedCars=new();
 readonly Dictionary<Transform,Vector2> parkingSites=new();
 readonly HashSet<Vector2> redevelopedParking=new();
 Transform SceneryCopy(string template,string name){var copy=Instantiate(sceneryTemplates[template],sharedCity);copy.name=name;copy.gameObject.SetActive(true);return copy;}
 void FitModel(Transform model,float width,float depth)
 {
  var renderers=model.GetComponentsInChildren<Renderer>();if(renderers.Length==0)return;var b=renderers[0].bounds;foreach(var r in renderers)b.Encapsulate(r.bounds);
  float factor=Mathf.Min(1,width/Mathf.Max(.1f,b.size.x),depth/Mathf.Max(.1f,b.size.z));model.localScale*=factor;
 }
 void Truck(Transform parent,Vector3 position)
 {
  if(comparisonTruck){var imported=Instantiate(comparisonTruck,parent);imported.name="Comparison factory delivery truck";imported.transform.localPosition=position;return;}
  var truck=Group(parent,"Factory delivery truck");truck.localPosition=position;
  Box(truck,"Chassis",new(0,.6f,0),new(2.2f,.25f,5),metal);Box(truck,"Cargo box",new(0,1.65f,-.7f),new(2.1f,2,3.4f),plaster);Box(truck,"Cab",new(0,1.2f,1.7f),new(2.1f,1.6f,1.6f),ColorMat("527384"));Box(truck,"Windscreen",new(0,1.6f,2.51f),new(1.8f,.7f,.05f),glass);
  foreach(int side in new[]{-1,1})foreach(float axle in new[]{-1.7f,1.6f})Sphere(truck,"Tyre",new(side*1.06f,.5f,axle),new(.23f,.8f,.8f),metal);
 }
 BusinessWalkSurface walkSurface;
 void AmbientPerson(Vector3 start,Vector3 end,int seed,bool luggage)
 {
  var actor=Group(sharedCity,luggage?"Airport passenger":"Promenade pedestrian");actor.position=start;var model=Instantiate(peoplePrefabs[seed%peoplePrefabs.Length],actor).transform;
  var rs=model.GetComponentsInChildren<Renderer>();var b=rs[0].bounds;foreach(var r in rs)b.Encapsulate(r.bounds);float scale=1.74f/b.size.y;model.localScale*=scale;model.localPosition=new(0,-(b.min.y-actor.position.y)*scale,0);
  var pose=actor.gameObject.AddComponent<PrototypePerson>();pose.model=model;pose.routeA=start;pose.routeB=end;pose.phase=seed*.8f;
  if(!luggage)pose.walkSurface=walkSurface;
  if(luggage)Box(actor,"Suitcase",new(.4f,.35f,-.2f),new(.35f,.7f,.3f),ColorMat(seed%2==0?"37536C":"97684D"));ambientPeople.Add(actor);
 }
 void UpdateSharedCity()
 {
  if(!sharedCity)return;
  Shader.SetGlobalFloat("_CitySnow",frame?.snow??0);Shader.SetGlobalFloat("_CityNight",frame?.night==true?1:0);
  Shader.SetGlobalFloat("_CityGrassDetail",frame?.fast==true?0:1);Shader.SetGlobalFloat("_CityWind",frame?.wind??0);
  UpdateBusinessSigns(frame?.night==true);
  for(int i=0;i<flyingPlanes.Count;i++)
  {
   var path=cityData.flights[i];float t=Mathf.Repeat(Time.time+(i==0?16:35),path.duration)/path.duration*(path.points.Length-1);int index=Mathf.FloorToInt(t);var a=path.points[index];var b=path.points[Mathf.Min(index+1,path.points.Length-1)];Vector3 from=new(a.x,a.y,a.z),to=new(b.x,b.y,b.z);flyingPlanes[i].position=Vector3.Lerp(from,to,t-index);if((to-from).sqrMagnitude>.0001f)flyingPlanes[i].rotation=Quaternion.LookRotation(to-from);
  }
  for(int i=0;i<boats.Count;i++)
  {
   bool moving=i>=6&&i<=8;float x=i<5?4+i*17:i==5?65:i==6?-13:i==7?83:i==8?-122:14,z=i<5?344+i%2*10:i==5?349:i==6?410:i==7?426:i==8?431:350,t=Time.time+i*2;
   boats[i].position=new(x+(moving?Mathf.Sin(t*.035f)*32:0),.08f+Mathf.Sin(t*1.1f+i)*.06f,z+(moving?Mathf.Cos(t*.035f)*22:0));boats[i].rotation=Quaternion.Euler(Mathf.Sin(t*.9f),moving?Mathf.Atan2(Mathf.Cos(t*.035f)*32,-Mathf.Sin(t*.035f)*22)*Mathf.Rad2Deg:12+i*12,Mathf.Sin(t*.8f+i)*1.4f);
  }
  if(train)train.position=new(274.5f,0,Mathf.Repeat(Time.time*9+220,1360)-680);
  if(freight){freight.position=new(281.5f,0,680-Mathf.Repeat(Time.time*7+700,1360));freight.rotation=Quaternion.Euler(0,180,0);}
  foreach(var smoke in factorySmoke){bool visible=HorizontalDistance(smoke.transform.position)<(distance>250?500:220);if(visible&&!smoke.isPlaying)smoke.Play();else if(!visible&&smoke.isPlaying)smoke.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);}
  foreach(var car in parkedCars)car.gameObject.SetActive(!obstructedParking.Contains(car)&&HorizontalDistance(car.position)<180&&(!parkingSites.TryGetValue(car,out var site)||!redevelopedParking.Contains(site)));
  // Animate a bounded nearby crowd, rather than every person across the city.
  if(Time.unscaledTime>=nextCrowdCheck){
  nextCrowdCheck=Time.unscaledTime+.5f;
  var nearby=ambientPeople.Where((actor,index)=>frame?.night!=true||index%3==0)
   .Where(actor=>!obstructedWalkers.Contains(actor)&&HorizontalDistance(actor.position)<(distance>250?230:120))
   .OrderBy(actor=>HorizontalDistance(actor.position)).Take(frame?.fast==true?20:48).ToHashSet();
  foreach(var actor in ambientPeople)actor.gameObject.SetActive(nearby.Contains(actor));
  }
 }
 void SyncSharedLots()
 {
  if(!sharedCity||frame==null)return;
  sharedCity.Find("OuterMarket").gameObject.SetActive(frame.market);sharedCity.Find("OuterLegacy").gameObject.SetActive(!frame.market);
  var replaced=new HashSet<Vector2>(frame.properties.Where(p=>p.offer!="internal"&&((!p.preserveExterior&&(p.owned||p.existing&&StreetApplicable(p)))||(IsInteriorView()&&p.id==frame.focus))).Select(p=>new Vector2(p.x,p.z)));
  redevelopedParking.Clear();redevelopedParking.UnionWith(replaced);
  var station=sharedCity.Find("Eastgate city petrol station");
  bool stationOpen=frame.market&&!replaced.Contains(new Vector2(75,75))&&!frame.properties.Any(p=>p.owned&&p.x==75&&p.z==75);
  if(station)station.gameObject.SetActive(stationOpen);
  if(stationOpen){replaced.Add(new Vector2(75,75));redevelopedParking.Add(new Vector2(75,75));}
  foreach(var p in cityData.parcels??Array.Empty<SharedSite>()){var model=sharedCity.Find("Parcel:"+p.id);if(model)model.gameObject.SetActive(frame.market&&!replaced.Contains(new Vector2(p.x,p.z)));}
  foreach(var p in cityData.lots??Array.Empty<SharedSite>()){var model=sharedCity.Find("Lot:"+p.id);if(model)model.gameObject.SetActive(!frame.market||p.id is not ("gym-hardware" or "barber-pharmacy")&&!replaced.Contains(new Vector2(p.x,p.z)));}
  RefreshCityOccupancy();
 }
 float HorizontalDistance(Vector3 position){var delta=position-target;delta.y=0;return delta.magnitude;}
}
