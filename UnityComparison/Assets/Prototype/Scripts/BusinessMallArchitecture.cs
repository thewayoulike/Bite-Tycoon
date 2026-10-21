using System;
using UnityEngine;
using UnityEngine.Rendering;

public sealed partial class BusinessGameBridge
{
    // Four former civic plots share one mall block. Saved property coordinates
    // stay unchanged; presentation uses a centre offset within the expanded site.
    const float MallFloorHeight=4.4f;
    static bool GalleriaSite(BusinessProperty p)=>p.kind=="plaza"&&p.id=="park";
    static Vector3 SiteExtent(BusinessProperty p)=>GalleriaSite(p)?new(41.2f,4,41.2f):new(16.8f,4,16.8f);
    static float StoreyHeight(BusinessProperty p)=>p.kind=="plaza"?MallFloorHeight:p.kind=="shop"?5.55f:2.9f;
    static Vector3 SiteOffset(BusinessProperty p)=>GalleriaSite(p)?new(12.5f,0,-9.5f):Vector3.zero;
    static Vector3 SiteCenter(BusinessProperty p)=>new Vector3(p.x,0,p.z)+SiteOffset(p);
    static readonly Vector3 GalleriaPlanScale=new(1.7f,1,1.32f);
    static Vector3 MallPoint(BusinessProperty p,Vector3 point)=>GalleriaSite(p)?Vector3.Scale(point,GalleriaPlanScale):point;
    Material mallGlazing;

    void MallExterior(Transform root,BusinessProperty p)
    {
        int levels=Mathf.Clamp(Mathf.Max(p.floors,p.exteriorFloors),1,5);
        float height=levels*MallFloorHeight;
        var stone=ColorMat("E2D8C4");var bronze=ColorMat("AA8F61");var frameMat=ColorMat("425A59");
        if(!mallGlazing){mallGlazing=new Material(Shader.Find("Business Simulator/Terminal Glass")){name="Galleria clear architectural glass",enableInstancing=true};mallGlazing.SetFloat("_Opacity",.24f);}
        var glazing=mallGlazing;
        var shell=Group(root,"Willow Galleria signature architecture");
        Box(shell,"Mall entrance forecourt",new(0,.15f,0),new(24,.22f,30.8f),paving);
        for(int floor=0;floor<levels;floor++){
            float y=floor*MallFloorHeight;
            // Open centre: the barrel vault overlooks balconies and real escalators.
            foreach(int side in new[]{-1,1}){
                Box(shell,"Shopping wing floor",new(side*7.8f,y+.31f,0),new(8.4f,.22f,28.8f),stone);
                Box(shell,"Atrium balcony edge",new(side*3.6f,y+.43f,0),new(.13f,.16f,25.6f),bronze);
                Box(shell,"Mall floor band",new(side*8,y+.6f,-14.4f),new(8,.48f,.42f),stone);
                Box(shell,"Wing curtain glass",new(side*8,y+2.52f,-14.32f),new(7.7f,3.35f,.05f),glazing);
                Box(shell,"Side curtain glass",new(side*11.85f,y+2.5f,0),new(.045f,3.5f,28.6f),glazing);
                Box(shell,"Side limestone band",new(side*11.9f,y+.55f,0),new(.18f,.5f,28.8f),stone);
                for(int bay=-4;bay<=4;bay++)Box(shell,"Side curtain mullion",new(side*11.9f,y+2.37f,bay*3.5f),new(.1f,3.9f,.09f),frameMat);
                for(int bay=-1;bay<=1;bay++)Box(shell,"Wing bronze mullion",new(side*8+bay*2.5f,y+2.4f,-14.4f),new(.085f,3.9f,.14f),bronze);
                // Merchandise silhouettes are visible through the glass, even before purchase.
                for(int bay=-1;bay<=1;bay++){
                    Box(shell,"Retail display island",new(side*8,y+.85f,bay*7),new(2.5f,1,1.25f),wood);
                    for(int item=0;item<3;item++)Box(shell,"Window merchandise",new(side*8-.8f+item*.8f,y+1.55f,bay*7),new(.5f,.45f,.65f),ColorMat(item==0?"839E9C":item==1?"C5A269":"BC8474"));
                }
                if(floor>0){
                    Box(shell,"Atrium glass balustrade",new(side*3.6f,y+1.02f,0),new(.045f,1.05f,25),glazing);
                    Box(shell,"Balcony handrail",new(side*3.6f,y+1.55f,0),new(.09f,.06f,25),bronze);
                }
            }
            foreach(int end in new[]{-1,1})Box(shell,"Atrium connecting gallery",new(0,y+.31f,end*13.2f),new(7.2f,.22f,2.4f),stone);
            Box(shell,"Rear curtain glass",new(0,y+2.5f,14.35f),new(23.6f,3.5f,.045f),glazing);
            Box(shell,"Rear limestone band",new(0,y+.55f,14.4f),new(24,.5f,.18f),stone);
            if(floor>0)MallEscalators(shell,y-MallFloorHeight,bronze);
        }
        foreach(float x in new[]{-11.75f,-4.1f,4.1f,11.75f})Box(shell,"Full height limestone pier",new(x,height/2,-14.45f),new(.42f,height,.48f),stone);
        // Bowed entrance glazing, not the small repeated windows of an office tower.
        for(int panel=0;panel<10;panel++){
            float x1=-3.9f+panel*.78f,x2=x1+.78f;
            float z1=-14.1f-.7f*Mathf.Sqrt(Mathf.Max(0,1-x1*x1/15.21f)),z2=-14.1f-.7f*Mathf.Sqrt(Mathf.Max(0,1-x2*x2/15.21f));
            var panelModel=Box(shell,"Bowed atrium glass",new((x1+x2)/2,height/2,(z1+z2)/2),new(Vector2.Distance(new(x1,z1),new(x2,z2)),height,.045f),glazing);
            panelModel.transform.localRotation=Quaternion.Euler(0,-Mathf.Atan2(z2-z1,x2-x1)*Mathf.Rad2Deg,0);
            Box(shell,"Atrium bronze mullion",new(x1,height/2,z1-.04f),new(.07f,height,.1f),bronze);
        }
        // Planted terraces and a recognisable barrel-vault roof.
        foreach(int side in new[]{-1,1}){
            Box(shell,"Roof garden deck",new(side*7.9f,height+.12f,0),new(8.2f,.24f,28.8f),stone);
            foreach(int end in new[]{-1,1}){
                Box(shell,"Roof garden planter",new(side*8,height+.45f,end*12.9f),new(6.8f,.6f,1.25f),stone);
                for(int bush=0;bush<7;bush++)Sphere(shell,"Roof garden hedge",new(side*8-2.7f+bush*.9f,height+.95f,end*12.9f),new(.95f,.8f,1.1f),greenery);
            }
            Box(shell,"Roof terrace parapet",new(side*11.8f,height+.65f,0),new(.16f,1.1f,28.6f),glazing);
            for(int z=-6;z<=6;z+=12){Box(shell,"Roof terrace bench",new(side*8,height+.65f,z),new(3,.16f,1),wood);}
        }
        for(int segment=0;segment<16;segment++){
            float a=segment*Mathf.PI/16,b=(segment+1)*Mathf.PI/16;
            var start=new Vector3(Mathf.Cos(a)*3.9f,height+.25f+Mathf.Sin(a)*3.1f,0);
            var end=new Vector3(Mathf.Cos(b)*3.9f,height+.25f+Mathf.Sin(b)*3.1f,0);
            var pane=Box(shell,"Barrel vault skylight",(start+end)/2,new(Vector3.Distance(start,end),.04f,28.9f),glazing);
            pane.transform.localRotation=Quaternion.Euler(0,0,Mathf.Atan2(end.y-start.y,end.x-start.x)*Mathf.Rad2Deg);
            foreach(float z in new[]{-14.45f,-7.2f,0,7.2f,14.45f})MallBeam(shell,"Vault bronze rib",start+Vector3.forward*z,end+Vector3.forward*z,.07f,bronze);
        }
        Box(shell,"Galleria glass canopy",new(0,3.4f,-14.7f),new(10.2f,.12f,1.4f),glazing);
        Box(shell,"Canopy bronze fascia",new(0,3.37f,-15.35f),new(10.3f,.23f,.12f),bronze);
        foreach(int side in new[]{-1,1}){
            Box(shell,"Entrance canopy column",new(side*4.8f,1.75f,-14.95f),new(.12f,3.3f,.12f),bronze);
            Box(shell,"Sliding entrance door",new(side*.9f,1.7f,-14.89f),new(1.75f,2.7f,.055f),glazing);
            Box(shell,"Entrance door handle",new(side*.18f,1.6f,-14.96f),new(.06f,.65f,.07f),bronze);
            Plant(shell,new(side*10.3f,.26f,-14.5f),.85f);
        }
        MallNameBoard(shell,p.name.ToUpperInvariant(),new(0,height-.65f,-14.98f),19,1.08f);
        MallNameBoard(shell,"SHOPPING MALL",new(0,height-1.7f,-14.98f),10,.65f);
        MallNameBoard(shell,"SHOP  /  DINE  /  PLAY",new(0,3,-15.41f),9.6f,.48f);
        // Orient the public entrance toward Garden Square and its crossing.
        root.localRotation=Quaternion.Euler(0,180,0);
        if(GalleriaSite(p)){root.localScale=GalleriaPlanScale;root.localPosition=SiteOffset(p);}
        else FitArchitecture(root,root.parent.position); // Preserve older small-plot saves.
        StaticBatchingUtility.Combine(shell.gameObject);
    }
    void MallBeam(Transform root,string name,Vector3 a,Vector3 b,float width,Material material){
        var beam=Box(root,name,(a+b)/2,new(width,Vector3.Distance(a,b),width),material);
        beam.transform.localRotation=Quaternion.FromToRotation(Vector3.up,b-a);
    }
    void MallEscalators(Transform root,float bottom,Material bronze){
        for(int side=-1;side<=1;side+=2){
            for(int step=0;step<20;step++)Box(root,"Atrium escalator step",new(side*1.25f,bottom+.4f+step*MallFloorHeight/19,-4+step*.4f),new(1.8f,.16f,.43f),metal);
            foreach(float edge in new[]{-.96f,.96f})MallBeam(root,"Escalator handrail",new(side*1.25f+edge,bottom+1.4f,-4.2f),new(side*1.25f+edge,bottom+MallFloorHeight+1.4f,3.8f),.08f,bronze);
        }
    }
    void MallNameBoard(Transform root,string text,Vector3 at,float width,float height){
        var board=Group(root,"Galleria illuminated nameboard");board.localPosition=at;
        var face=ColorMat("304B49");illuminatedSigns[face]=face.color;signsAtNight=null;
        Box(board,"Nameboard face",Vector3.zero,new(width,height,.1f),face);
        Label(board,text,new(0,0,-.065f),.5f);
        var letters=board.GetComponentInChildren<TextMesh>();var bounds=letters.GetComponent<Renderer>().bounds;
        letters.transform.localScale*=Mathf.Min(width*.92f/Mathf.Max(.001f,bounds.size.x),height*.7f/Mathf.Max(.001f,bounds.size.y));
        foreach(var r in board.GetComponentsInChildren<Renderer>())r.shadowCastingMode=ShadowCastingMode.Off;
    }
}
