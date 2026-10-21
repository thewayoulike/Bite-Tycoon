using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public sealed class BusinessAmbientRoute : MonoBehaviour
{
 public BusinessActor actor;public Vector3[] points;public int stage;float dwell;
 public void Initialize(BusinessActor a,Vector3[] route,int offset){if(points!=null)return;actor=a;points=route;stage=offset%points.Length;transform.localPosition=points[stage];actor.Direct(transform.localPosition);dwell=1+offset%4;}
 void Update(){if(points==null||actor.speed<=0)return;if(dwell>0){dwell-=Time.deltaTime*actor.speed;if(dwell<=0){stage=(stage+1)%points.Length;actor.Follow("ambient:"+stage,new[]{transform.localPosition,points[stage]},false,false);}return;}if(Vector3.Distance(transform.localPosition,points[stage])<.06f)dwell=stage==2?7:1.5f;}
}
public sealed partial class BusinessGameBridge
{
 void MallTenantPeople(BusinessProperty p,HashSet<string> live)
 {
  var fitout=interior.transform.Find("Mall fitout");if(!fitout||frame.hours<8||frame.hours>=22)return;
  foreach(var u in frame.units??Array.Empty<BusinessUnit>())if(u.occupied&&u.index/4==frame.floor){
   var shop=fitout.Find("Lease unit "+u.index);if(!shop)continue;
   Vector3 P(Vector3 pt)=>interior.transform.InverseTransformPoint(shop.TransformPoint(pt));
   string staff="tenant:staff:"+u.index;live.Add(staff);
   var worker=Actor(staff,P(new(2.5f,0,3.5f)),false,180,u.index,new BusinessPerson{id="theo",height=1.77f});worker.Direct(P(new(2.5f,0,3.5f)));
   for(int n=0;n<3;n++){
    string id="tenant:shopper:"+u.index+":"+n;live.Add(id);
    var actor=Actor(id,P(new(0,0,-5.2f)),false,0,u.index+n,new BusinessPerson{id=new[]{"noah","sofia","daniel","mei","layla","amira"}[(u.index*3+n)%6],height=1.7f+(n%2)*.1f});
    var route=actor.GetComponent<BusinessAmbientRoute>();if(!route)route=actor.gameObject.AddComponent<BusinessAmbientRoute>();
    route.Initialize(actor,new[]{P(new(0,0,-5.2f)),P(new(0,0,-3.2f)),P(new(0,0,-.5f)),P(new(0,0,-3.2f))},n);
   }
  }
 }
 void ShopFitout(Transform root,string kind)
 {
  string tone=kind switch{"barber"=>"47777B","beauty"=>"A78392","fashion"=>"846F87","pharmacy"=>"427F6B","grocer"=>"748952","electronics"=>"3E6582","toys"=>"D4A75D","florist"=>"9D8475",_=>"987956"};
  Box(root,"Tenant floor finish",new(0,.015f,0),new(8.3f,.03f,8),ColorMat(kind is "cafe" or "restaurant" or "books"?"B9A185":"D5D6CA"));
  Box(root,"Tenant feature wall",new(0,1.6f,3.95f),new(8.3f,3.2f,.08f),ColorMat(tone));
  Label(root,kind.ToUpperInvariant(),new(-.8f,2.6f,3.87f),.36f);
  Box(root,"Tenant checkout",new(2.55f,.5f,2.55f),new(2.15f,1,1),wood);
  Box(root,"Checkout terminal",new(2.9f,1.2f,2.6f),new(.4f,.35f,.08f),metal);
  if(kind is "cafe" or "restaurant" or "bakery" or "dessert"){
   ComparisonProp(root,"CoffeeMachine",new(2,1.02f,2.6f),.65f,180);
   ComparisonProp(root,"FastFoodDisplay",new(-2.3f,0,2.7f),2.4f);
   for(int n=0;n<5;n++){ComparisonProp(root,"KitchenBread",new(-3+n*.35f,1.07f,2.6f),.22f);}
   foreach(int side in new[]{-1,1}){
    RoomTable(root,"Tenant dining table",new(side*2.3f,0,-1.6f),1.2f,.9f,wood);
    RoomChair(root,new(side*2.3f,0,-2.55f),180,tone);RoomChair(root,new(side*2.3f,0,-.65f),0,tone);
    ComparisonProp(root,"BreakfastCup",new(side*2.3f,.84f,-1.6f),.11f);
   }
   if(kind=="dessert")for(int n=0;n<4;n++)Sphere(root,"Ice cream display",new(-3+n*.4f,1.15f,2.5f),new(.3f,.22f,.3f),ColorMat(n%2==0?"DCA6AC":"F4DFB7"));
  }else if(kind is "barber" or "beauty"){
   for(int n=0;n<2;n++){
    RoomChair(root,new(-2.4f+n*2.7f,0,1.8f),180,tone,true);
    Box(root,"Salon station mirror",new(-2.4f+n*2.7f,1.8f,3.85f),new(1.65f,1.65f,.04f),glass);
    Box(root,"Salon workstation",new(-2.4f+n*2.7f,.85f,3.4f),new(1.7f,.12f,.7f),whiteMaterial());
   }
   RoomChair(root,new(-2.8f,0,-2.2f),-90,tone,true);
   for(int n=0;n<7;n++)Box(root,"Barber pole stripe",new(-3.85f,1+n*.12f,-3.75f),new(.18f,.1f,.18f),ColorMat(n%2==0?"CB6864":"E5E8E3"));
  }else if(kind is "fashion" or "sports"){
   foreach(int side in new[]{-1,1}){
    Box(root,"Garment rail",new(side*2.7f,1.55f,0),new(.05f,.05f,3.8f),metal);
    foreach(int end in new[]{-1,1})Box(root,"Rail support",new(side*2.7f,.77f,end*1.9f),new(.055f,1.55f,.055f),metal);
    for(int n=0;n<6;n++){var shirt=Group(root,"Hanging garment");shirt.localPosition=new(side*2.7f,1.1f,-1.5f+n*.55f);var cloth=ColorMat(new[]{"899DAD","B67F6C","E1D4B5"}[n%3]);Box(shirt,"Shirt body",Vector3.zero,new(.4f,.65f,.1f),cloth);foreach(int arm in new[]{-1,1})Box(shirt,"Shirt sleeve",new(arm*.27f,.2f,0),new(.2f,.26f,.1f),cloth);}
   }
   if(kind=="sports")for(int n=0;n<4;n++)Sphere(root,"Sports ball",new(-2.8f+n*.5f,.3f,3),new(.4f,.4f,.4f),ColorMat("C38A57"));
  }else if(kind=="home"){
   RoomSofa(root,new(-2.3f,0,.7f));RoomTable(root,"Homeware coffee table",new(-2.3f,0,-.8f),1.3f,.7f,wood,.45f);
   RoomChair(root,new(2.5f,0,-1.7f),-90,tone,true);Plant(root,new(-3,0,3),1);
  }else if(kind=="electronics"){
   Box(root,"TV display backing",new(-1.7f,1.6f,3.7f),new(3.8f,2.2f,.12f),metal);
   ElectronicsProduct(root,"tv","SMART TELEVISION",new(-1.7f,.3f,3.5f));
   RoomTable(root,"Laptop display",new(-2.3f,0,-1.3f),1.8f,1.1f,wood,.9f);ElectronicsProduct(root,"laptop","COMPUTING",new(-2.3f,.97f,-1.3f));
  }else{
   foreach(int side in new[]{-1,1})for(int shelf=0;shelf<3;shelf++){
    Box(root,"Tenant stocked shelf",new(side*2.7f,.5f+shelf*.6f,.3f),new(1.1f,.08f,4.1f),wood);
    for(int n=0;n<7;n++){
     var at=new Vector3(side*2.7f,.68f+shelf*.6f,-1.4f+n*.53f);var color=ColorMat(new[]{"B57564","8EAA82","CBB885","7995AB","BA9CAA"}[(n+shelf)%5]);
     if(kind=="florist"){Sphere(root,"Flower pot",at,new(.25f,.3f,.25f),wood);Sphere(root,"Flower bouquet",at+Vector3.up*.25f,new(.4f,.4f,.4f),color);}
     else if(kind=="grocer")Sphere(root,"Fruit and vegetable display",at,new(.33f,.3f,.35f),color);
     else if(kind=="toys"){Box(root,"Toy block",at,new(.32f,.3f,.32f),color);Sphere(root,"Toy head",at+Vector3.up*.22f,new(.21f,.21f,.21f),color);}
     else Box(root,kind=="books"?"Book spines":kind=="pharmacy"?"Medicine cartons":"Shop merchandise",at,new(kind=="books"?.45f:.38f,kind=="books"?.38f:.28f,kind=="books"?.12f:.3f),color);
    }
   }
   if(kind=="pharmacy"){Box(root,"Pharmacy cross",new(0,2.55f,3.85f),new(.24f,.85f,.06f),ColorMat("C8E6CF"));Box(root,"Pharmacy cross bar",new(0,2.55f,3.8f),new(.85f,.24f,.06f),ColorMat("C8E6CF"));}
  }
 }
 Material whiteMaterial()=>ColorMat("E4E3D9");
}
