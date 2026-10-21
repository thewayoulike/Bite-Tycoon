using System.Linq;
using UnityEngine;
public sealed partial class BusinessGameBridge
{
 static string RestaurantLook(string type)=>type is "diner" or "fastfood"?"diner":type=="cafe"?"cafe":type=="japanese"?"japanese":"bistro";
 static string RestaurantInteriorLook(BusinessContents state,BusinessProperty property)=>state?.interiorStyle is "diner" or "cafe" or "bistro" or "japanese"?state.interiorStyle:RestaurantLook(string.IsNullOrEmpty(state?.restaurantType)?(property.kind=="cafe"?"cafe":"diner"):state.restaurantType);
 void RestaurantCharacter(Transform root,BusinessProperty property)
 {
  var state=property.id==frame.focus?frame:frame.frontages?.FirstOrDefault(f=>f.id==property.id);
  string look=RestaurantInteriorLook(state,property);
  string accent=look switch{"diner"=>"98514A","cafe"=>"64847B","japanese"=>"393F39",_=>"596A65"};
  var design=Group(root,"Restaurant style "+look);
  Box(design,"Dining floor finish",new(0,.48f,-.8f),new(16.8f,.02f,13.8f),ColorMat(look=="cafe"?"B9A084":look=="bistro"?"96775C":look=="japanese"?"797262":"DDD9C9"));
  if(look=="diner"){
   for(int x=0;x<14;x++)for(int z=0;z<11;z++)if((x+z)%2==0)Box(design,"Checkerboard tile",new(-7.8f+x*1.2f,.493f,-6.8f+z*1.2f),new(1.19f,.004f,1.19f),ColorMat("596366"));
  }else for(int n=0;n<28;n++)Box(design,"Dining timber joint",new(-8.1f+n*.6f,.493f,-.8f),new(.014f,.003f,13.7f),ColorMat(look=="japanese"?"514E43":"7D6955"));
  foreach(int side in new[]{-1,1}){
   Box(design,"Dining wall wainscot",new(side*8.27f,1.12f,-.8f),new(.055f,1.22f,13.6f),ColorMat(look=="diner"?"98514A":look=="cafe"?"C4B19A":look=="japanese"?"554D3D":"385956"));
   Box(design,"Wainscot capping",new(side*8.23f,1.75f,-.8f),new(.09f,.06f,13.6f),look=="diner"?metal:wood);
   if(look=="japanese")for(int panel=0;panel<6;panel++)Box(design,"Rice paper wall panel",new(side*8.25f,2.55f,-6+panel*2.1f),new(.04f,1.45f,1.8f),ColorMat("D6CFB6"));
  }
  foreach(var r in root.GetComponentsInChildren<MeshRenderer>()){
   string n=r.name.ToLowerInvariant();if(n.Contains("banquette")||n.Contains("upholstery seam"))r.sharedMaterial=ColorMat(accent);
   if(n=="kitchen pass oak front")r.sharedMaterial=look=="diner"?ColorMat("C3C9C7"):wood;
   if(n=="kitchen tiled splashback")r.sharedMaterial=ColorMat(look=="japanese"?"565C53":look=="diner"?"8D5551":look=="bistro"?"596A65":"698F86");
  }
  if(look=="diner"){
   Box(design,"Diner illuminated sign",new(0,2.9f,9.5f),new(5,.9f,.1f),ColorMat("963E3A"));Label(design,"ALL DAY DINER",new(0,2.9f,9.4f),.4f);
   for(int n=-2;n<=2;n++)Box(design,"Chrome counter panel",new(n*2.5f,1.05f,5.48f),new(2.3f,.85f,.03f),ColorMat("B3BFC0"));
  }else if(look=="cafe"){
   Label(design,"COFFEE / BAKES / GOOD COMPANY",new(0,3,9.5f),.32f);
   for(int n=0;n<5;n++){Box(design,"Cafe coffee bag",new(-5.5f+n*.5f,2.35f,9.2f),new(.3f,.5f,.25f),ColorMat("BEA17B"));}
   foreach(int side in new[]{-1,1})Plant(design,new(side*8,.44f,4.1f),.85f);
  }else if(look=="japanese"){
   for(int side=-1;side<=1;side+=2)for(int n=0;n<10;n++)Box(design,"Timber wall slat",new(side*8.3f,2,-6+n*1.05f),new(.1f,2.8f,.06f),wood);
   for(int n=-2;n<=2;n++){Sphere(design,"Paper lantern",new(n*2.8f,3.2f,4.8f),new(.52f,.65f,.52f),ColorMat("F2E0B9"));Box(design,"Lantern suspension",new(n*2.8f,3.8f,4.8f),new(.02f,.5f,.02f),metal);}
   Label(design,"SEASONAL KITCHEN",new(0,3,9.5f),.35f);
  }else{
   Label(design,"THE BISTRO / SEASONAL DINING",new(0,3,9.5f),.32f);
   for(int n=-2;n<=2;n++){Box(design,"Wine display shelf",new(n*2.7f,2.55f,9.35f),new(2.1f,.07f,.32f),wood);for(int k=0;k<4;k++)Sphere(design,"Wine bottle",new(n*2.7f-.75f+k*.45f,2.85f,9.35f),new(.14f,.52f,.14f),ColorMat("36594A"));}
  }
 }
 GameObject RestaurantDiningSet(Transform parent,string type)
 {
  string look=RestaurantLook(type);
  if(look=="cafe")return Instantiate(tablePrefab,parent);
  var root=Group(parent,"Dining set "+look);root.localPosition=Vector3.up*.44f;
  var top=look=="bistro"?ColorMat("E8E0D1"):look=="diner"?ColorMat("E1DCD0"):wood;
  RoomTable(root,"Dining tabletop",Vector3.zero,1.65f,1.35f,top,.81f);
  var points=new[]{new Vector3(-1.176f,0,0),new Vector3(1.176f,0,0),new Vector3(0,0,1.12f),new Vector3(0,0,-1.12f)};
  for(int n=0;n<4;n++){
   var chair=Group(root,"Dining chair");chair.localPosition=points[n];chair.localRotation=Quaternion.Euler(0,new[]{-90,90,0,180}[n],0);
   var material=look=="diner"?ColorMat("98514A"):look=="bistro"?ColorMat("596A65"):wood;
   Box(chair,"Seat cushion",new(0,.4f,0),new(.54f,.12f,.53f),material);Box(chair,"Chair back",new(0,.71f,.26f),new(.54f,.65f,.09f),material);
   foreach(int x in new[]{-1,1})foreach(int z in new[]{-1,1})Box(chair,"Chair leg",new(x*.21f,.19f,z*.2f),new(.045f,.38f,.045f),look=="diner"?metal:wood);
  }
  if(look=="bistro"){Box(root,"Linen table runner",new(0,.867f,0),new(.42f,.012f,1.34f),ColorMat("A89B7A"));Sphere(root,"Table candle",new(0,1.01f,0),new(.08f,.27f,.08f),ColorMat("F3D29E"));}
  if(look=="japanese")foreach(int side in new[]{-1,1}){Box(root,"Woven placemat",new(side*.5f,.867f,0),new(.42f,.012f,.58f),ColorMat("C1B28D"));Box(root,"Chopsticks",new(side*.6f,.885f,.1f),new(.012f,.012f,.28f),wood);}
  // The scene's live route/seat anchors stay identical for every dining style.
  var placement=Group(parent,"Styled dining set");root.SetParent(placement,false);return placement.gameObject;
 }
}
