using System;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

public static class ItemVisualChecks
{
    const BindingFlags F=BindingFlags.NonPublic|BindingFlags.Instance;
    const string Output="../artifacts/item-visuals/";
    [Serializable] class Catalog {public BusinessMeal[] meals;public BusinessStock[] stock;}
    static object Call(BusinessGameBridge b,string method,params object[] args)=>typeof(BusinessGameBridge).GetMethod(method,F).Invoke(b,args);
    static Bounds Bounds(Transform t){var rs=t.GetComponentsInChildren<Renderer>().Where(r=>r.enabled).ToArray();if(rs.Length==0)throw new Exception("No visible mesh: "+t.name);var b=rs[0].bounds;foreach(var r in rs)b.Encapsulate(r.bounds);return b;}
    static void Require(bool condition,string message){if(!condition)throw new Exception(message);}
    public static void PrepareAndBuild()
    {
        try{
            EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");
            var b=Object.FindFirstObjectByType<BusinessGameBridge>();
            string Find(string folder,string filename)=>Directory.GetFiles(folder,filename,SearchOption.AllDirectories).OrderBy(p=>p).First().Replace('\\','/');
            var entries=new[]{
                ("ItemTomato","Assets/Food Pack-Demo/Prefabs","Tomato.prefab",.18f),
                ("ItemLemon","Assets/Free Food-BreakfastTime/Prefabs","Free_Lemon.prefab",.21f),
                ("ItemPepper","Assets/Food Pack-Demo/Prefabs","Bell pepper green.prefab",.2f),
                ("ItemPizza","Assets/Food Pack-Demo/Prefabs","Pizza Margarita.prefab",.36f),
                ("ItemHotdog","Assets/Food Pack-Demo/Prefabs","Hotdog A.prefab",.29f),
                ("ItemSalmon","Assets/Food Pack-Demo/Prefabs","Salmon fillet.prefab",.26f),
                ("ItemSteak","Assets/RPG Food & Drinks Pack","Steak.prefab",.26f),
                ("ItemBread","Assets/RPG Food & Drinks Pack","Bread.prefab",.28f),
                ("ItemPie","Assets/RPG Food & Drinks Pack","Pie.prefab",.3f)
            };
            b.itemAssets=entries.Select(e=>ComparisonArtSetup.Prepare(e.Item1,Find(e.Item2,e.Item3),e.Item4)).ToArray();
            EditorUtility.SetDirty(b);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
            Run(b);
            // Test models must never be written into the production scene.
            EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");
            File.WriteAllText(Output+"ready-to-build.txt",DateTime.UtcNow.ToString("O"));
        }catch(Exception e){File.WriteAllText(Output+"failure.txt",e.ToString());Debug.LogException(e);if(Application.isBatchMode)EditorApplication.Exit(1);}
    }
    public static void Run(BusinessGameBridge b)
    {
        GroundChecks();GroundPoseChecks(b);
        var catalog=JsonUtility.FromJson<Catalog>(File.ReadAllText(Output+"catalog.json"));
        var market=Object.Instantiate(b.marketInterior);
        var facing=market.GetComponentsInChildren<Transform>(true).First(t=>t.name=="Stock product");
        var before=Bounds(facing);Call(b,"PrepareFacing",facing);Call(b,"ShelfItem",facing,catalog.stock.First(s=>s.id=="cereal"));
        var after=Bounds(facing.GetChild(facing.childCount-1));
        Require(Mathf.Abs(after.center.x-before.center.x)<.02f&&Mathf.Abs(after.center.z-before.center.z)<.02f&&Mathf.Abs(after.min.y-before.min.y)<.02f,"Replacement SKU must sit on original shelf support plane, not group pivot");
        Object.DestroyImmediate(market);
        var atlas=new GameObject("Item visual audit");atlas.transform.position=new(2000,0,2000);
        int n=0;var kinds=catalog.meals.GroupBy(m=>m.kind).Select(g=>g.First()).ToArray();
        foreach(var meal in catalog.meals){
            var item=(Transform)Call(b,"CreateDish",atlas.transform,meal);var bounds=Bounds(item);
            Require(bounds.size.x<=.46f&&bounds.size.z<=.46f&&bounds.size.y<.5f,"Dish scale: "+meal.name+" "+bounds.size);
            if(kinds.Any(m=>m.id==meal.id)){item.localPosition=new(n%6*.65f,0,n/6*.7f);n++;}else Object.DestroyImmediate(item.gameObject);
        }
        Capture(b.viewCamera,atlas.transform.position+new Vector3(1.65f,3.4f,-2.6f),atlas.transform.position+new Vector3(1.65f,0,1),"dish-atlas.png");
        foreach(Transform child in atlas.transform.Cast<Transform>().ToArray())Object.DestroyImmediate(child.gameObject);
        n=0;
        foreach(var p in catalog.stock.Where(p=>p.category!="Electronics"&&p.category!="Appliances")){
            var item=(Transform)Call(b,"CreateProduct",atlas.transform,p.id,p.form,p.color,p.category);var bounds=Bounds(item);
            Require(bounds.size.x<.36f&&bounds.size.z<.36f&&bounds.size.y<.4f,"Stock scale: "+p.id+" "+bounds.size);
            if(p.category=="Produce"||n<36){item.localPosition=new(n%8*.42f,0,n/8*.45f);n++;}else Object.DestroyImmediate(item.gameObject);
        }
        Capture(b.viewCamera,atlas.transform.position+new Vector3(1.5f,2.8f,-2.2f),atlas.transform.position+new Vector3(1.5f,0,.9f),"product-atlas.png");
        Object.DestroyImmediate(atlas);
        var shop=new GameObject("Supermarket exterior audit");shop.transform.position=new(2000,0,2000);
        var model=Object.Instantiate(b.marketExterior,shop.transform);
        var p2=new BusinessProperty{id="shop",kind="shop",floors=2,exteriorFloors=1};
        Call(b,"RetailUpperStoreys",shop.transform,p2,model.transform);
        Require(shop.transform.Find("Supermarket upper storeys/Retail floor 2"),"Missing second storey");
        Require(Bounds(shop.transform).size.y>9,"Supermarket still one storey");
        Capture(b.viewCamera,shop.transform.position+new Vector3(25,20,-32),shop.transform.position+new Vector3(0,4,0),"supermarket-two-storeys.png");
        Object.DestroyImmediate(shop);
        File.WriteAllText(Output+"native-checks.txt",$"PASS: {catalog.meals.Length} menu identities, {catalog.stock.Length} retail identities, food/packaging scale, two-storey supermarket, pavement-height queries and disabled surfaces. Three native renders saved.");
    }
    static void GroundChecks()
    {
        var root=new GameObject("Surface test");root.transform.position=new(2500,0,2500);
        var slab=GameObject.CreatePrimitive(PrimitiveType.Cube);slab.name="Central roads paving";slab.transform.SetParent(root.transform,false);slab.transform.localPosition=new(0,.045f,0);slab.transform.localScale=new(4,.085f,4);
        Object.DestroyImmediate(slab.GetComponent<Collider>());
        var surface=root.AddComponent<BusinessWalkSurface>();surface.Initialize(root.transform);Physics.SyncTransforms();
        Require(Mathf.Abs(surface.Height(root.transform.position,.42f)-.0905f)<.004f,"Walker must land on actual pavement, not old .42 offset");
        slab.SetActive(false);Require(Mathf.Abs(surface.Height(root.transform.position,.42f)-.42f)<.001f,"Hidden pavement must not affect pedestrians");
        Object.DestroyImmediate(root);
    }
    static void GroundPoseChecks(BusinessGameBridge bridge)
    {
        var root=new GameObject("Shoe contact test");root.transform.position=new(2500,0,2500);
        try {
            var slab=GameObject.CreatePrimitive(PrimitiveType.Cube);slab.name="Central roads paving";slab.transform.SetParent(root.transform,false);slab.transform.localPosition=new(0,.045f,0);slab.transform.localScale=new(12,.085f,12);
            Object.DestroyImmediate(slab.GetComponent<Collider>());var surface=root.AddComponent<BusinessWalkSurface>();surface.Initialize(root.transform);Physics.SyncTransforms();
            var flags=System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic;
            foreach(var prefab in bridge.peoplePrefabs){
                var actor=new GameObject("Walker");actor.transform.SetParent(root.transform,false);actor.transform.localPosition=new(0,.42f,0);
                var model=Object.Instantiate(prefab,actor.transform).transform;var rs=model.GetComponentsInChildren<Renderer>();var b=rs[0].bounds;foreach(var r in rs)b.Encapsulate(r.bounds);
                float scale=1.74f/b.size.y;model.localScale*=scale;model.localPosition=new(0,-(b.min.y-actor.transform.position.y)*scale,0);
                var pose=actor.AddComponent<PrototypePerson>();pose.model=model;pose.walkSurface=surface;pose.routeA=actor.transform.position;pose.routeB=actor.transform.position+Vector3.forward*4;pose.SetModel(model);
                var baked=new Mesh();
                try {for(int step=0;step<12;step++){
                    typeof(PrototypePerson).GetField("poseTime",flags).SetValue(pose,step*.11f);typeof(PrototypePerson).GetMethod("LateUpdate",flags).Invoke(pose,null);
                    float bottom=float.PositiveInfinity;
                    foreach(var skin in model.GetComponentsInChildren<SkinnedMeshRenderer>()){
                        if(!skin.enabled)continue;skin.BakeMesh(baked);foreach(var v in baked.vertices)bottom=Mathf.Min(bottom,skin.transform.TransformPoint(v).y);
                    }
                    Require(bottom-.0875f>=-.01f&&bottom-.0875f<.018f,prefab.name+" shoes must touch pavement throughout the walking cycle");
                }}finally{Object.DestroyImmediate(baked);}
                Object.DestroyImmediate(actor);
            }
        }finally{Object.DestroyImmediate(root);}
    }
    static void Capture(Camera camera,Vector3 position,Vector3 target,string file)
    {
        camera.transform.position=position;camera.transform.LookAt(target);camera.nearClipPlane=.01f;camera.farClipPlane=100;camera.useOcclusionCulling=false;camera.ResetCullingMatrix();
        var rt=new RenderTexture(1440,1000,24,RenderTextureFormat.ARGB32);rt.Create();
        RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});
        RenderPipeline.SubmitRenderRequest(camera,new RenderPipeline.StandardRequest{destination=rt});
        var old=RenderTexture.active;RenderTexture.active=rt;var texture=new Texture2D(1440,1000,TextureFormat.RGB24,false);texture.ReadPixels(new Rect(0,0,1440,1000),0,0);texture.Apply();File.WriteAllBytes(Output+file,texture.EncodeToPNG());RenderTexture.active=old;Object.DestroyImmediate(texture);rt.Release();Object.DestroyImmediate(rt);
    }
}
