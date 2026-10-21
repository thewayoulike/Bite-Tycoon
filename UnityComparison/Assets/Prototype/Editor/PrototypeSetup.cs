using System.IO;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public static class PrototypeSetup
{
    static Material cream, stone, green, wood, asphalt, paint, foliage, trunk, metal, glass, dark, red, blue, yellow, white;
    static Transform world;
    static readonly List<Transform> cars = new List<Transform>();

    [MenuItem("Business Simulator/Create City Prototype")]
    public static void Create()
    {
        Directory.CreateDirectory("Assets/Prototype/Materials");
        Directory.CreateDirectory("Assets/Scenes");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        cars.Clear();
        cream=Mat("Warm limestone","DCCFBA"); stone=Mat("Paving","B2B0A6"); green=Mat("Forest enamel","204C40",.38f,.25f);
        wood=Mat("Warm oak","946741"); asphalt=Mat("Asphalt","39434A"); paint=Mat("Road markings","E9E2CB"); foliage=Mat("Leaf green","537A48");
        trunk=Mat("Bark","604933"); metal=Mat("Brushed metal","556368",.56f,.7f); dark=Mat("Charcoal","202C31");
        red=Mat("Terracotta","BA6752"); blue=Mat("Ocean blue","4E7C91"); yellow=Mat("Produce yellow","D9AE44"); white=Mat("Porcelain","EAE9DE",.35f);
        glass=Mat("Glazing","88BDC6",.88f,.2f); glass.SetFloat("_Surface",1); glass.SetFloat("_Blend",0); glass.SetFloat("_SrcBlend",5); glass.SetFloat("_DstBlend",10); glass.SetFloat("_ZWrite",0); glass.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); glass.SetOverrideTag("RenderType","Transparent"); glass.renderQueue=3000; var gc=glass.color; gc.a=.28f; glass.color=gc;
        world=new GameObject("City block").transform;
        Box("Landscape",new Vector3(0,-.2f,0),new Vector3(250,.3f,220),Mat("Grass","7F9367"));
        Box("Main road",new Vector3(0,0,-19.5f),new Vector3(112,.12f,10),asphalt);
        Box("Sidewalk",new Vector3(0,.12f,-11.9f),new Vector3(92,.25f,5),stone);
        Box("Back path",new Vector3(0,.12f,14.2f),new Vector3(92,.25f,3),stone);
        for(int i=-13;i<=13;i++) Box("Lane marking",new Vector3(i*3.7f,.075f,-19.5f),new Vector3(1.8f,.025f,.12f),paint);
        for(int side=-1;side<=1;side+=2) for(int i=0;i<9;i++) Box("Crosswalk",new Vector3(side*29,.09f,-23.4f+i),new Vector3(3,.025f,.45f),paint);
        for(int i=-5;i<=5;i++) { Box("Paving joint",new Vector3(i*8,.254f,-11.8f),new Vector3(.025f,.012f,5),cream); if(Mathf.Abs(i)>1) Tree(i*8,-10.8f,1.1f); }
        var restaurant=Building("Juniper Kitchen",-13,17,cream,green);
        var supermarket=Building("Market & Co.",12,22,cream,blue);
        Restaurant(-13);
        Supermarket(12);
        for(int i=0;i<6;i++) { Tree(-38+i*15,16.7f,1.25f); StreetLight(-37+i*15,-14); }
        for(int i=0;i<5;i++) {
            float x=-32+i*16;
            Box("Neighborhood house",new Vector3(x,4,29),new Vector3(12,8,10),i%2==0?red:cream);
            Box("Roof cornice",new Vector3(x,8.15f,29),new Vector3(12.5f,.4f,10.5f),dark);
            for(int floor=0;floor<2;floor++) for(int w=-1;w<=1;w++) { Box("Window frame",new Vector3(x+w*3.4f,2.1f+floor*3.6f,23.95f),new Vector3(1.8f,2.2f,.18f),white); Box("Window",new Vector3(x+w*3.4f,2.1f+floor*3.6f,23.82f),new Vector3(1.55f,1.95f,.05f),blue); }
        }
        for(int i=0;i<4;i++) cars.Add(Car(i%2==0?green:red));
        var cameraObject=new GameObject("Main Camera"); cameraObject.tag="MainCamera";
        var camera=cameraObject.AddComponent<Camera>(); camera.nearClipPlane=.25f; camera.farClipPlane=350; camera.fieldOfView=42; camera.backgroundColor=new Color(.63f,.77f,.85f); camera.clearFlags=CameraClearFlags.Skybox; cameraObject.AddComponent<AudioListener>();
        var cameraData=cameraObject.AddComponent<UniversalAdditionalCameraData>(); cameraData.renderPostProcessing=true; cameraData.antialiasing=AntialiasingMode.SubpixelMorphologicalAntiAliasing;
        cameraObject.transform.position=new Vector3(15,47,-56); cameraObject.transform.LookAt(Vector3.zero);
        var tour=cameraObject.AddComponent<CityTour>(); tour.viewCamera=camera; tour.restaurantRoof=restaurant; tour.supermarketRoof=supermarket; tour.traffic=cars.ToArray();
        var sun=new GameObject("Afternoon sun").AddComponent<Light>(); sun.type=LightType.Directional; sun.color=new Color(1,.9f,.76f); sun.intensity=2.2f; sun.shadows=LightShadows.Soft; sun.transform.rotation=Quaternion.Euler(46,-32,0); sun.shadowBias=.035f; sun.shadowNormalBias=.3f;
        RenderSettings.sun=sun; RenderSettings.ambientMode=AmbientMode.Trilight; RenderSettings.ambientSkyColor=new Color(.65f,.76f,.83f); RenderSettings.ambientEquatorColor=new Color(.55f,.57f,.52f); RenderSettings.ambientGroundColor=new Color(.32f,.3f,.26f); RenderSettings.ambientIntensity=1;
        var sky=new Material(Shader.Find("Skybox/Procedural")); sky.SetColor("_SkyTint",new Color(.57f,.71f,.84f)); sky.SetFloat("_AtmosphereThickness",.85f); sky.SetFloat("_Exposure",1.1f); SaveAsset(sky,"Assets/Prototype/Materials/Day sky.mat"); RenderSettings.skybox=AssetDatabase.LoadAssetAtPath<Material>("Assets/Prototype/Materials/Day sky.mat");
        RenderSettings.fog=true; RenderSettings.fogMode=FogMode.Linear; RenderSettings.fogColor=new Color(.68f,.78f,.82f); RenderSettings.fogStartDistance=115; RenderSettings.fogEndDistance=280;
        var volume=new GameObject("Daylight grading").AddComponent<Volume>(); volume.isGlobal=true; var profile=ScriptableObject.CreateInstance<VolumeProfile>();
        var tone=profile.Add<Tonemapping>(); tone.mode.Override(TonemappingMode.ACES);
        var bloom=profile.Add<Bloom>(); bloom.intensity.Override(.16f); bloom.threshold.Override(1.2f);
        var color=profile.Add<ColorAdjustments>(); color.saturation.Override(5); color.contrast.Override(7);
        SaveAsset(profile,"Assets/Prototype/Daylight.asset"); volume.sharedProfile=AssetDatabase.LoadAssetAtPath<VolumeProfile>("Assets/Prototype/Daylight.asset");
        PlayerSettings.companyName="Business Simulator"; PlayerSettings.productName="Business Simulator Unity Prototype"; PlayerSettings.defaultScreenWidth=1280; PlayerSettings.defaultScreenHeight=720;
        QualitySettings.vSyncCount=1; QualitySettings.shadowDistance=100;
        foreach(var child in world.GetComponentsInChildren<Transform>(true)) GameObjectUtility.SetStaticEditorFlags(child.gameObject, StaticEditorFlags.BatchingStatic | StaticEditorFlags.OccludeeStatic);
        EditorSceneManager.SaveScene(scene,"Assets/Scenes/BusinessSimulatorPrototype.unity");
        EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/Scenes/BusinessSimulatorPrototype.unity",true)};
        AssetDatabase.SaveAssets(); Debug.Log("BUSINESS_SIMULATOR_PROTOTYPE_READY");
    }
    static Material Mat(string name,string hex,float smooth=.16f,float metallic=0) {
        string path="Assets/Prototype/Materials/"+name+".mat";
        var mat=AssetDatabase.LoadAssetAtPath<Material>(path); if(!mat) {mat=new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(mat,path);}
        ColorUtility.TryParseHtmlString("#"+hex,out Color c); mat.color=c; mat.SetFloat("_Smoothness",smooth); mat.SetFloat("_Metallic",metallic); mat.enableInstancing=true; return mat;
    }
    static void SaveAsset(Object asset,string path) { if(AssetDatabase.LoadAssetAtPath<Object>(path)) AssetDatabase.DeleteAsset(path); AssetDatabase.CreateAsset(asset,path); if(asset is VolumeProfile volumeProfile) foreach(var component in volumeProfile.components) if(!AssetDatabase.Contains(component)) AssetDatabase.AddObjectToAsset(component,volumeProfile); }
    static GameObject Shape(string name,PrimitiveType shape,Vector3 pos,Vector3 scale,Material mat,Transform parent=null) {
        var obj=GameObject.CreatePrimitive(shape); obj.name=name; obj.transform.SetParent(parent?parent:world,false); obj.transform.localPosition=pos; obj.transform.localScale=scale; obj.GetComponent<Renderer>().sharedMaterial=mat; Object.DestroyImmediate(obj.GetComponent<Collider>()); return obj;
    }
    static GameObject Box(string name,Vector3 pos,Vector3 scale,Material mat,Transform parent=null) => Shape(name,PrimitiveType.Cube,pos,scale,mat,parent);
    static GameObject Cylinder(string name,Vector3 pos,Vector3 scale,Material mat,Transform parent=null) => Shape(name,PrimitiveType.Cylinder,pos,scale,mat,parent);
    static void Sign(string text,Vector3 pos,float size,Color color,Transform parent=null) {
        var obj=new GameObject(text); obj.transform.SetParent(parent?parent:world,false); obj.transform.localPosition=pos; obj.transform.localRotation=Quaternion.identity;
        var mesh=obj.AddComponent<TextMesh>(); mesh.text=text; mesh.font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); mesh.fontSize=100; mesh.characterSize=size/10; mesh.anchor=TextAnchor.MiddleCenter; mesh.alignment=TextAlignment.Center; mesh.color=color; obj.GetComponent<MeshRenderer>().sharedMaterial=mesh.font.material;
    }
    static GameObject Building(string name,float x,float width,Material wall,Material accent) {
        Box(name+" floor",new Vector3(x,.25f,1.2f),new Vector3(width,.25f,18),cream);
        Box("Back wall",new Vector3(x,2.8f,10.3f),new Vector3(width,5.3f,.35f),wall);
        foreach(int side in new[]{-1,1}) Box("Side wall",new Vector3(x+side*width/2,2.8f,1.2f),new Vector3(.35f,5.3f,18),wall);
        for(int i=0;i<6;i++) {float wx=x-width/2+(i+.5f)*width/6; Box("Front glazing",new Vector3(wx,2.4f,-7.75f),new Vector3(width/6-.18f,3.7f,.07f),glass); Box("Window mullion",new Vector3(wx-width/12,2.4f,-7.85f),new Vector3(.11f,4,.16f),metal); }
        Box("Store fascia",new Vector3(x,4.65f,-7.9f),new Vector3(width+.5f,1.15f,.45f),accent);
        Sign(name.ToUpperInvariant(),new Vector3(x,4.65f,-8.16f),.8f,Color.white);
        Box("Entrance canopy",new Vector3(x,4,-9),new Vector3(width*.8f,.18f,2.4f),accent);
        var roof=new GameObject(name+" roof"); roof.transform.SetParent(world);
        Box("Roof slab",new Vector3(x,5.65f,1.2f),new Vector3(width+.7f,.5f,18.7f),dark,roof.transform);
        Box("Roof trim",new Vector3(x,5.3f,-8.1f),new Vector3(width+.7f,.16f,.35f),white,roof.transform);
        for(int side=-1;side<=1;side+=2) { Box("Planter",new Vector3(x+side*(width/2-1),.68f,-9.8f),new Vector3(1.35f,1,1.35f),accent); Shape("Plant",PrimitiveType.Sphere,new Vector3(x+side*(width/2-1),1.35f,-9.8f),new Vector3(1.3f,1.45f,1.3f),foliage); }
        return roof;
    }
    static void Restaurant(float x) {
        for(int row=0;row<3;row++) for(int col=0;col<2;col++) {
            float tx=x-4+col*8, tz=-4+row*4;
            Cylinder("Oak dining table",new Vector3(tx,1.12f,tz),new Vector3(2.35f,.09f,2.35f),wood); Cylinder("Table pedestal",new Vector3(tx,.7f,tz),new Vector3(.2f,.35f,.2f),metal);
            for(int side=-1;side<=1;side+=2) { Box("Chair seat",new Vector3(tx+side*1.65f,.72f,tz),new Vector3(.8f,.14f,.8f),green); Box("Chair back",new Vector3(tx+side*1.98f,1.17f,tz),new Vector3(.12f,.95f,.8f),wood); for(int dz=-1;dz<=1;dz+=2) Box("Chair legs",new Vector3(tx+side*1.65f,.44f,tz+dz*.28f),new Vector3(.5f,.5f,.09f),metal); Cylinder("Plate",new Vector3(tx+side*.6f,1.23f,tz),new Vector3(.55f,.02f,.55f),white); }
            Cylinder("Vase",new Vector3(tx,1.4f,tz),new Vector3(.19f,.15f,.19f),green); Shape("Flowers",PrimitiveType.Sphere,new Vector3(tx,1.63f,tz),Vector3.one*.35f,yellow);
        }
        Box("Kitchen counter",new Vector3(x,1.15f,7.3f),new Vector3(13,1.5f,1.7f),green); Box("Stone worktop",new Vector3(x,1.96f,7.3f),new Vector3(13.2f,.13f,1.85f),white);
        for(int i=0;i<4;i++) Cylinder("Cooking ring",new Vector3(x-4+i*1.3f,2.05f,7.2f),new Vector3(.7f,.025f,.7f),dark);
        Box("Extraction hood",new Vector3(x-2,4,7.5f),new Vector3(8,.6f,2),metal);
        Sign("JUNIPER  /  SEASONAL KITCHEN",new Vector3(x,3.5f,10.04f),.52f,new Color(.15f,.3f,.23f));
    }
    static void Supermarket(float x) {
        Material[] stock={red,blue,yellow,green,white};
        for(int aisle=0;aisle<3;aisle++) for(int section=0;section<2;section++) {
            float sx=x-6+aisle*6, sz=section*5;
            for(int level=0;level<4;level++) {float y=.6f+level*.65f; Box("Shelf board",new Vector3(sx,y,sz),new Vector3(2.25f,.09f,3.8f),white);
                for(int product=0;product<7;product++) for(int side=-1;side<=1;side+=2) Box("Groceries",new Vector3(sx+side*.63f,y+.25f,sz-1.48f+product*.48f),new Vector3(.53f,.4f,.36f),stock[(product+level+aisle)%5]); }
            foreach(int side in new[]{-1,1}) Box("Shelf end",new Vector3(sx,1.6f,sz+side*1.9f),new Vector3(2.25f,2.4f,.09f),metal);
            Box("Aisle header",new Vector3(sx,3.13f,sz-1.96f),new Vector3(2.4f,.3f,.12f),green);
        }
        for(int i=0;i<4;i++) {float fx=x-7.5f+i*5; Box("Chilled cabinet",new Vector3(fx,1.7f,9),new Vector3(4.6f,2.8f,1.5f),white); Box("Chilled glass",new Vector3(fx,1.7f,8.2f),new Vector3(4.35f,2.45f,.07f),glass); for(int row=0;row<3;row++) for(int item=0;item<6;item++) Box("Chilled products",new Vector3(fx-1.7f+item*.65f,.7f+row*.75f,8.6f),new Vector3(.45f,.4f,.5f),stock[(item+row)%5]); }
        for(int i=0;i<2;i++) {float cx=x-5+i*10; Box("Checkout",new Vector3(cx,1.1f,-5),new Vector3(4.2f,1.4f,1.45f),green); Box("Checkout belt",new Vector3(cx,1.85f,-5),new Vector3(3.9f,.09f,1.2f),dark); Box("Register",new Vector3(cx+1.1f,2.18f,-5),new Vector3(.65f,.6f,.12f),metal); }
    }
    static void Tree(float x,float z,float size) {
        Cylinder("Tree trunk",new Vector3(x,1.7f*size,z),new Vector3(.33f,1.55f*size,.33f),trunk);
        for(int i=0;i<5;i++) {float angle=i*1.2566f; Shape("Tree canopy",PrimitiveType.Sphere,new Vector3(x+Mathf.Cos(angle)*.8f*size,(3.3f+(i%2)*.5f)*size,z+Mathf.Sin(angle)*.8f*size),new Vector3(2.1f,2.5f,2.1f)*size,foliage); }
        Box("Tree bed",new Vector3(x,.28f,z),new Vector3(2.6f,.15f,2.6f),wood);
    }
    static void StreetLight(float x,float z) { Cylinder("Lamp post",new Vector3(x,3,z),new Vector3(.12f,2.8f,.12f),metal); Box("Lamp",new Vector3(x,5.8f,z),new Vector3(1.1f,.16f,.7f),white); }
    static Transform Car(Material body) {
        var car=new GameObject("Moving traffic").transform;
        Box("Chassis",new Vector3(0,.65f,0),new Vector3(1.8f,.6f,4),body,car); Box("Cabin",new Vector3(0,1.25f,-.15f),new Vector3(1.6f,.65f,2.2f),blue,car); Box("Roof",new Vector3(0,1.61f,-.15f),new Vector3(1.65f,.12f,2.25f),body,car);
        foreach(int side in new[]{-1,1}) foreach(int end in new[]{-1,1}) { var wheel=Cylinder("Wheel",new Vector3(side*.95f,.42f,end*1.23f),new Vector3(.65f,.12f,.65f),dark,car); wheel.transform.localRotation=Quaternion.Euler(0,0,90); }
        foreach(int side in new[]{-1,1}) Box("Headlight",new Vector3(side*.6f,.72f,2.03f),new Vector3(.4f,.2f,.04f),white,car);
        return car;
    }
    public static void BuildWeb()
    {
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions {scenes=new[]{"Assets/Scenes/BusinessSimulatorPrototype.unity"},locationPathName="Builds/Web",target=BuildTarget.WebGL,options=BuildOptions.None});
        if(report.summary.result!=UnityEditor.Build.Reporting.BuildResult.Succeeded) throw new System.Exception("Web prototype build failed: "+report.summary.result);
    }
}
