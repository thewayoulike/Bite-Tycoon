using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

public sealed partial class BusinessGameBridge
{
 readonly Dictionary<string,Mesh> diningMeshes=new();
 Material diningGlass,diningChrome,diningBrass;
 Material DiningMetal(bool brass=false){
  var material=brass?diningBrass:diningChrome;if(material)return material;
  material=new Material(metal){name=brass?"Dining brushed brass":"Dining polished chrome",color=brass?new Color(.64f,.49f,.27f):new Color(.7f,.76f,.78f),enableInstancing=true};
  material.SetFloat("_Metallic",.85f);material.SetFloat("_Smoothness",.76f);
  if(brass)diningBrass=material;else diningChrome=material;return material;
 }
 // Shared extruded rounded meshes: no imported pivot/axis assumptions or per-frame allocations.
 Mesh DiningMesh(float width,float thickness,float depth,float radius){
  string key=$"{width}:{thickness}:{depth}:{radius}";if(diningMeshes.TryGetValue(key,out var cached))return cached;
  var outline=new List<Vector3>();radius=Mathf.Min(radius,Mathf.Min(width,depth)/2);
  bool circle=Mathf.Abs(width-depth)<.001f&&Mathf.Abs(radius-width/2)<.001f;
  if(circle)for(int n=0;n<32;n++){float a=n*Mathf.PI/16;outline.Add(new(Mathf.Cos(a)*radius,0,Mathf.Sin(a)*radius));}
  else for(int corner=0;corner<4;corner++)for(int n=0;n<=6;n++){
   float a=(corner+n/6f)*Mathf.PI/2;
   outline.Add(new((corner is 0 or 3?1:-1)*(width/2-radius)+Mathf.Cos(a)*radius,0,(corner<2?1:-1)*(depth/2-radius)+Mathf.Sin(a)*radius));
  }
  int count=outline.Count;var vertices=new List<Vector3>();var triangles=new List<int>();
  foreach(float y in new[]{thickness/2,-thickness/2,thickness/2,-thickness/2})foreach(var p in outline)vertices.Add(p+Vector3.up*y);
  vertices.Add(Vector3.up*thickness/2);vertices.Add(Vector3.down*thickness/2);
  for(int n=0;n<count;n++){int next=(n+1)%count;
   triangles.AddRange(new[]{count*4,next,n,count*4+1,count+n,count+next});
   triangles.AddRange(new[]{2*count+n,2*count+next,3*count+n,2*count+next,3*count+next,3*count+n});
  }
  var uv=new List<Vector2>();foreach(var v in vertices)uv.Add(new(v.x/width+.5f,v.z/depth+.5f));
  var mesh=new Mesh{name="Dining rounded solid "+key};mesh.SetVertices(vertices);mesh.SetUVs(0,uv);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();diningMeshes[key]=mesh;return mesh;
 }
 Transform DiningPanel(Transform parent,string name,Vector3 at,Vector3 size,float radius,Material material){
  var t=Group(parent,name);t.localPosition=at;t.gameObject.AddComponent<MeshFilter>().sharedMesh=DiningMesh(size.x,size.y,size.z,radius);t.gameObject.AddComponent<MeshRenderer>().sharedMaterial=material;return t;
 }
 void DiningRod(Transform parent,string name,Vector3 a,Vector3 b,float diameter,Material material){
  var t=Group(parent,name);t.localPosition=(a+b)*.5f;t.localRotation=Quaternion.FromToRotation(Vector3.up,b-a);t.localScale=new(diameter,Vector3.Distance(a,b),diameter);
  t.gameObject.AddComponent<MeshFilter>().sharedMesh=DiningMesh(1,1,1,.5f);t.gameObject.AddComponent<MeshRenderer>().sharedMaterial=material;
 }
 GameObject RestaurantDiningSet(Transform parent,string type){
  string look=RestaurantLook(type);var placement=Group(parent,"Styled dining set");
  var root=Group(placement,"Dining set "+look);root.localPosition=Vector3.up*.44f;
  var chrome=DiningMetal();var dark=ColorMat("283333");
  if(look=="diner"){
   DiningPanel(root,"Chrome tabletop rim",new(0,.815f,0),new(1.7f,.075f,1.38f),.17f,chrome);
   DiningPanel(root,"Dining tabletop",new(0,.846f,0),new(1.65f,.028f,1.33f),.15f,ColorMat("F1E7CC"));
   foreach(int side in new[]{-1,1}){DiningPanel(root,"Twin pedestal foot",new(side*.48f,.083f,0),new(.48f,.055f,.65f),.18f,chrome);DiningRod(root,"Chrome pedestal",new(side*.48f,.10f,0),new(side*.48f,.78f,0),.095f,chrome);}
  }else if(look=="cafe"){
   DiningPanel(root,"Round timber edge",new(0,.785f,0),new(1.65f,.11f,1.65f),.825f,ColorMat("6B4932"));
   DiningPanel(root,"Dining tabletop",new(0,.843f,0),new(1.61f,.034f,1.61f),.805f,wood);
   DiningRod(root,"Cast iron pedestal",new(0,.09f,0),new(0,.76f,0),.12f,dark);
   DiningPanel(root,"Round pedestal base",new(0,.085f,0),new(.68f,.06f,.68f),.34f,dark);
  }else if(look=="bistro"){
   if(!diningGlass){diningGlass=new Material(Shader.Find("Business Simulator/Terminal Glass")){name="Dining clear tempered glass",enableInstancing=true};diningGlass.SetFloat("_Opacity",.24f);}
   var pane=DiningPanel(root,"Dining tabletop",new(0,.8375f,0),new(1.7f,.045f,1.36f),.25f,diningGlass);
   pane.GetComponent<Renderer>().shadowCastingMode=ShadowCastingMode.Off;
   var brass=DiningMetal(true);
   foreach(int side in new[]{-1,1}){
    DiningRod(root,"Crossed brass pedestal",new(side*.48f,.10f,-.38f),new(-side*.48f,.79f,.38f),.065f,brass);
    DiningRod(root,"Crossed brass pedestal",new(side*.48f,.10f,.38f),new(-side*.48f,.79f,-.38f),.065f,brass);
    DiningRod(root,"Glass support rail",new(side*.51f,.798f,-.46f),new(side*.51f,.798f,.46f),.03f,brass);
    DiningRod(root,"Polished glass edge",new(side*.847f,.838f,-.40f),new(side*.847f,.838f,.40f),.013f,ColorMat("7AB5AC"));
   }
   DiningPanel(root,"Candle coaster",new(0,.867f,0),new(.16f,.014f,.16f),.08f,brass);Sphere(root,"Table candle",new(0,.95f,0),new(.06f,.15f,.06f),ColorMat("F3D29E"));
  }else{
   for(int plank=0;plank<5;plank++)Box(root,"Dining tabletop",new((plank-2)*.34f,.815f,0),new(.328f,.09f,1.38f),wood);
   foreach(int side in new[]{-1,1}){
    Box(root,"Trestle end frame",new(side*.56f,.43f,0),new(.14f,.70f,.95f),ColorMat("51412D"));
    Box(root,"Trestle foot",new(side*.56f,.10f,0),new(.26f,.09f,1.05f),wood);
   }
   Box(root,"Mortise cross stretcher",new(0,.26f,0),new(1.42f,.12f,.12f),wood);
   foreach(int side in new[]{-1,1})Box(root,"Woven placemat",new(side*.49f,.867f,0),new(.42f,.014f,.54f),ColorMat("C1B28D"));
  }
  var points=new[]{new Vector3(-1.176f,0,0),new Vector3(1.176f,0,0),new Vector3(0,0,1.12f),new Vector3(0,0,-1.12f)};
  for(int n=0;n<4;n++){
   var chair=Group(root,"Dining chair "+look);chair.localPosition=points[n];chair.localRotation=Quaternion.Euler(0,new[]{-90,90,0,180}[n],0);DiningChair(chair,look);
  }
  return placement.gameObject;
 }
 void DiningChair(Transform chair,string look){
  var chrome=DiningMetal();var timber=ColorMat("725137");
  var cloth=ColorMat(look=="diner"?"A94238":look=="bistro"?"4B6B68":look=="japanese"?"C3B595":"B8A17B");
  DiningPanel(chair,"Seat cushion",new(0,.405f,0),new(.56f,.11f,.54f),look=="cafe"?.27f:look=="bistro"?.18f:.055f,cloth);
  if(look=="diner"){
   var rim=DiningPanel(chair,"Chrome high back rim",new(0,.77f,.26f),new(.59f,.08f,.65f),.08f,chrome);rim.localRotation=Quaternion.Euler(90,0,0);
   var back=DiningPanel(chair,"Ribbed vinyl back",new(0,.77f,.205f),new(.54f,.075f,.59f),.065f,cloth);back.localRotation=Quaternion.Euler(90,0,0);
   for(int n=-1;n<=1;n++)Box(chair,"Vinyl seam",new(n*.15f,.77f,.165f),new(.012f,.47f,.008f),ColorMat("D07A64"));
   foreach(int side in new[]{-1,1}){
    DiningRod(chair,"Tubular chrome leg",new(side*.23f,.065f,-.24f),new(side*.23f,.39f,-.22f),.033f,chrome);
    DiningRod(chair,"Tubular chrome back leg",new(side*.23f,.065f,.27f),new(side*.23f,.70f,.25f),.033f,chrome);
    DiningRod(chair,"Chrome foot rail",new(side*.23f,.065f,-.24f),new(side*.23f,.065f,.27f),.033f,chrome);
   }
  }else if(look=="cafe"){
   DiningPanel(chair,"Bentwood seat frame",new(0,.352f,0),new(.59f,.055f,.57f),.275f,timber);
   Vector3 previous=new(-.255f,.46f,.23f);
   for(int n=0;n<=12;n++){float angle=Mathf.PI-n*Mathf.PI/12;var next=new Vector3(Mathf.Cos(angle)*.255f,.68f+Mathf.Sin(angle)*.35f,.25f);DiningRod(chair,"Bentwood hoop",previous,next,.045f,timber);previous=next;}
   DiningRod(chair,"Bentwood hoop",previous,new(.255f,.46f,.23f),.045f,timber);
   foreach(float x in new[]{-.13f,0,.13f})DiningRod(chair,"Spindle back",new(x,.46f,.25f),new(x,.96f,.25f),.022f,timber);
   foreach(int x in new[]{-1,1})foreach(int z in new[]{-1,1})DiningRod(chair,"Splayed timber leg",new(x*.24f,.055f,z*.24f),new(x*.19f,.35f,z*.19f),.045f,timber);
  }else if(look=="bistro"){
   for(int n=-2;n<=2;n++){
    float angle=n*22*Mathf.Deg2Rad;var back=DiningPanel(chair,"Curved upholstered shell",new(Mathf.Sin(angle)*.29f,.69f,Mathf.Cos(angle)*.29f),new(.17f,.10f,.48f),.045f,cloth);
    back.localRotation=Quaternion.Euler(90,n*22,0);
   }
   foreach(int side in new[]{-1,1})DiningPanel(chair,"Upholstered arm",new(side*.28f,.64f,-.015f),new(.09f,.09f,.40f),.04f,cloth);
   foreach(int x in new[]{-1,1})foreach(int z in new[]{-1,1})DiningRod(chair,"Brass chair leg",new(x*.25f,.055f,z*.24f),new(x*.20f,.35f,z*.18f),.028f,DiningMetal(true));
  }else{
   Box(chair,"Timber seat frame",new(0,.343f,0),new(.60f,.06f,.57f),timber);
   foreach(int x in new[]{-1,1})foreach(int z in new[]{-1,1})Box(chair,"Square timber leg",new(x*.235f,.21f,z*.22f),new(.055f,.31f,.055f),timber);
   foreach(int side in new[]{-1,1})Box(chair,"Back post",new(side*.25f,.66f,.27f),new(.065f,.69f,.06f),timber);
   for(int n=0;n<3;n++)Box(chair,"Horizontal timber back slat",new(0,.65f+n*.14f,.27f),new(.49f,.075f,.035f),wood);
   for(int n=-3;n<=3;n++)Box(chair,"Woven seat stripe",new(n*.065f,.461f,0),new(.012f,.003f,.40f),ColorMat("A89A7D"));
  }
 }
}
