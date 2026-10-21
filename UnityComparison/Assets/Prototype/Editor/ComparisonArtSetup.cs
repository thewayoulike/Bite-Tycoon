using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

public static class ComparisonArtSetup
{
    const string Out="Assets/ComparisonPrepared";
    const string Apartment="Assets/Brick Project Studio/Apartment Kit";
    const string Kitchen="Assets/CuteMagic_Room/CuteMagic_Room_Kitchen";
    static readonly Dictionary<Material,Material> materials=new();
    static readonly List<string> used=new();
    static string Find(string folder,string filename){
        var path=Directory.GetFiles(folder,filename,SearchOption.AllDirectories).OrderBy(x=>x).FirstOrDefault();
        if(path==null)throw new InvalidOperationException("Missing comparison asset: "+folder+"/"+filename);
        return path.Replace('\\','/');
    }
    static void Save(Object asset,string path){
        var old=AssetDatabase.LoadAssetAtPath<Object>(path);
        if(old){EditorUtility.CopySerialized(asset,old);EditorUtility.SetDirty(old);Object.DestroyImmediate(asset);}
        else AssetDatabase.CreateAsset(asset,path);
    }
    static Texture TextureFor(Material source,params string[] choices){
        foreach(var name in choices)if(source.HasProperty(name)&&source.GetTexture(name))return source.GetTexture(name);
        return null;
    }
    static Material MaterialFor(Material source){
        if(!source){
            const string fallbackPath=Out+"/Materials/CITY-missing-surface.mat";
            var fallback=AssetDatabase.LoadAssetAtPath<Material>(fallbackPath);
            if(!fallback){fallback=new Material(Shader.Find("Universal Render Pipeline/Lit")){color=new Color(.8f,.81f,.77f),enableInstancing=true};AssetDatabase.CreateAsset(fallback,fallbackPath);}
            return fallback;
        }
        if(materials.TryGetValue(source,out var cached))return cached;
        // This vehicle shader maps a shared colour atlas and decals. Keep the
        // publisher's URP shader instead of treating the mask as a colour map.
        bool vehicle=source.shader.name.Contains("LowPolyRoadVehicles");
        var result=vehicle?new Material(source):new Material(Shader.Find("Universal Render Pipeline/Lit"));
        result.name=source.name;result.enableInstancing=!vehicle;
        if(!vehicle){
            var map=TextureFor(source,"_BaseMap","_MainTex","_BaseColorMap");
            var textures=source.GetTexturePropertyNames().Select(p=>source.GetTexture(p)).Where(t=>t).Distinct().ToArray();
            map??=textures.FirstOrDefault(t=>!t.name.ToLowerInvariant().Contains("normal")&&!t.name.ToLowerInvariant().Contains("mask")&&!t.name.Contains("Moss"));
            var normal=TextureFor(source,"_BumpMap","_NormalMap")??textures.FirstOrDefault(t=>t.name.ToLowerInvariant().Contains("normal")&&!t.name.Contains("Moss"));
            Color color=source.HasProperty("_BaseColor")?source.GetColor("_BaseColor"):source.HasProperty("_Color")?source.GetColor("_Color"):Color.white;
            result.SetColor("_BaseColor",color);
            if(map)result.SetTexture("_BaseMap",map);
            if(normal){result.SetTexture("_BumpMap",normal);result.EnableKeyword("_NORMALMAP");}
            result.SetFloat("_Smoothness",source.HasProperty("_Smoothness")?Mathf.Clamp(source.GetFloat("_Smoothness"),.08f,.7f):.25f);
            result.SetFloat("_Metallic",source.HasProperty("_Metallic")?Mathf.Clamp01(source.GetFloat("_Metallic")):0);
            bool leaves=source.shader.name.ToLowerInvariant().Contains("leaves")||AssetDatabase.GetAssetPath(source).Contains("/Leaves/")||source.name.Contains("_Single");
            bool cutout=leaves||source.HasProperty("_AlphaClip")&&source.GetFloat("_AlphaClip")>0||source.IsKeywordEnabled("_ALPHATEST_ON");
            if(cutout){result.SetFloat("_AlphaClip",1);result.SetFloat("_Cutoff",.42f);result.SetFloat("_Cull",0);result.EnableKeyword("_ALPHATEST_ON");result.renderQueue=2450;}
            if(source.name.ToLowerInvariant().Contains("glass")){
                result.SetColor("_BaseColor",new Color(.65f,.83f,.85f,.22f));result.SetFloat("_Surface",1);result.SetFloat("_ZWrite",0);
                result.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);result.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha);
                result.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");result.renderQueue=3000;
            }
        }
        AssetDatabase.TryGetGUIDAndLocalFileIdentifier(source,out string guid,out long localId);
        guid=string.IsNullOrEmpty(guid)?"generated-"+materials.Count:guid+"-"+localId;
        string file=Out+"/Materials/"+guid+".mat";
        Save(result,file);result=AssetDatabase.LoadAssetAtPath<Material>(file);materials[source]=result;
        return result;
    }
    static Bounds BoundsOf(GameObject root){
        var rs=root.GetComponentsInChildren<Renderer>(true).Where(r=>r.enabled).ToArray();
        if(rs.Length==0)throw new InvalidOperationException("Empty model: "+root.name);
        var bounds=rs[0].bounds;foreach(var r in rs)bounds.Encapsulate(r.bounds);return bounds;
    }
    internal static GameObject Prepare(string key,string path,float width=0,float height=0,float depth=0,bool tree=false,float waterline=0){
        var source=AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if(!source)throw new InvalidOperationException("Could not load "+path);
        var root=new GameObject(key);var model=Object.Instantiate(source,root.transform);model.transform.localPosition=Vector3.zero;
        foreach(var transform in root.GetComponentsInChildren<Transform>(true))GameObjectUtility.RemoveMonoBehavioursWithMissingScript(transform.gameObject);
        foreach(var c in root.GetComponentsInChildren<Component>(true).Where(c=>c is MonoBehaviour||c is Collider||c is Rigidbody||c is Light||c is Camera||c is AudioSource).ToArray())Object.DestroyImmediate(c);
        foreach(var group in root.GetComponentsInChildren<LODGroup>(true)){
            var levels=group.GetLODs();if(!tree||levels.Length<3)continue;
            var selected=levels.Skip(levels.Length-3).ToArray();
            var keep=selected.SelectMany(l=>l.renderers).ToHashSet();
            foreach(var renderer in levels.SelectMany(l=>l.renderers).Distinct().Where(r=>r&&!keep.Contains(r)).ToArray()){
                if(!renderer)continue;
                var filter=renderer.GetComponent<MeshFilter>();if(filter)Object.DestroyImmediate(filter);
                Object.DestroyImmediate(renderer);
            }
            selected[0].screenRelativeTransitionHeight=.12f;
            selected[1].screenRelativeTransitionHeight=.035f;
            selected[2].screenRelativeTransitionHeight=.006f;
            group.SetLODs(selected);group.fadeMode=LODFadeMode.None;group.RecalculateBounds();
        }
        foreach(var renderer in root.GetComponentsInChildren<Renderer>(true)){
            renderer.sharedMaterials=renderer.sharedMaterials.Select(MaterialFor).ToArray();
            renderer.shadowCastingMode=ShadowCastingMode.On;
        }
        var b=BoundsOf(root);float scale=1;
        if(width>0)scale=width/Mathf.Max(.01f,b.size.x);
        if(height>0)scale=width>0?Mathf.Min(scale,height/Mathf.Max(.01f,b.size.y)):height/Mathf.Max(.01f,b.size.y);
        if(depth>0)scale=Mathf.Min(scale,depth/Mathf.Max(.01f,b.size.z));
        model.transform.localScale*=scale;
        model.transform.localPosition=-new Vector3(b.center.x,b.min.y,b.center.z)*scale;
        model.transform.localPosition-=Vector3.up*waterline;
        var prefab=PrefabUtility.SaveAsPrefabAsset(root,Out+"/"+key+".prefab");Object.DestroyImmediate(root);
        used.Add(key+" | "+path);return prefab;
    }
    static GameObject Place(Transform parent,GameObject source,Vector3 at,float width=0,float depth=0,float angle=0){
        var item=Object.Instantiate(source,parent);item.name="Comparison "+source.name;
        item.transform.localPosition=Vector3.zero;var b=BoundsOf(item);
        float scale=width>0?width/Mathf.Max(.01f,b.size.x):1;
        if(depth>0)scale=Mathf.Min(scale,depth/Mathf.Max(.01f,b.size.z));
        item.transform.localScale*=scale;item.transform.localPosition=at;
        item.transform.localRotation=Quaternion.Euler(0,angle,0);return item;
    }
    [MenuItem("Business Simulator Comparison/Prepare imported art")]
    public static string Prepare(){
        if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop comparison Play mode first.");
        if(!Application.dataPath.Replace('\\','/').EndsWith("/UnityComparison/Assets"))throw new InvalidOperationException("Only run in UnityComparison.");
        Directory.CreateDirectory(Out+"/Materials");
        // The vehicle pack declares subgraph inputs as per-instance properties.
        // GLES expands those names into invalid field accesses inside functions.
        // Keep the publisher's colour/decals graph, but store its values per material.
        foreach(var graph in Directory.GetFiles("Assets/YelScryptFireStudio/LowPolyRoadVehiclesFreePackage/Shaders","*",SearchOption.AllDirectories)
            .Where(p=>p.EndsWith(".shadergraph")||p.EndsWith(".shadersubgraph"))){
            string source=File.ReadAllText(graph);
            string fixedSource=source.Replace("\"overrideHLSLDeclaration\": true","\"overrideHLSLDeclaration\": false");
            if(source!=fixedSource)File.WriteAllText(graph,fixedSource);
        }
        AssetDatabase.Refresh();
        materials.Clear();used.Clear();
        EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");
        var bridge=Object.FindFirstObjectByType<BusinessGameBridge>();
        bridge.comparisonTrees=new[]{
            Prepare("TreeBirch",Find("Assets/Realistic Tree/Prefabs/URP/Birch","Birch 1.prefab"),height:7.2f,tree:true),
            Prepare("TreeAsh",Find("Assets/Realistic Tree/Prefabs/URP/Ash","Ash 2.prefab"),height:7.6f,tree:true),
            Prepare("TreeSpruce",Find("Assets/Realistic Tree/Prefabs/URP/Spruce","Spruce 1.prefab"),height:8,tree:true)
        };
        bridge.treePrefab=bridge.comparisonTrees[0];
        string vehicles="Assets/YelScryptFireStudio/LowPolyRoadVehiclesFreePackage/Vehicles";
        bridge.vehiclePrefabs=new[]{"Sedan_01","Pickup_01","SportCar_01","Van_01"}.Select(n=>Prepare(n,Find(vehicles,"pref_"+n+".prefab"),1.8f,depth:4.2f)).ToArray();
        bridge.comparisonTruck=Prepare("DeliveryTruck",Find(vehicles,"pref_Truck_01.prefab"),2.2f,depth:6.2f);
        bridge.comparisonPlane=Prepare("Airliner",Find("Assets/EmbersStorm - AirStrike Aviation Pack/Prefabs","AirBus Blue.prefab"),25,depth:30);
        bridge.comparisonBoats=new[]{
            Prepare("OldRowboat",Find("Assets/Boats/Prefabs","OldWoodenRowboat_Complete.prefab"),4.2f,depth:5.4f,waterline:.22f),
            Prepare("MotorboatBlue",Find("Assets/HQ Boats/2.prefabs","boat_1.prefab"),2.8f,depth:7,waterline:.28f),
            Prepare("MotorboatWhite",Find("Assets/HQ Boats/2.prefabs","boat_2.prefab"),3.4f,depth:9,waterline:.4f)
        };
        var sofa=Prepare("loungeSofa",Find(Apartment,"Sofa_Apt_01.prefab"),2.6f);
        bridge.furnishingAssets=bridge.furnishingAssets.Where(p=>p.name!="loungeSofa").Append(sofa).ToArray();
        var bed=Prepare("ApartmentBed",Find(Apartment,"Bed_Apt_01_01.prefab"),1.8f,depth:2.4f);
        var coffee=Prepare("CoffeeMachine",Find(Apartment,"CoffeeMaker_Apt_01.prefab"),.8f);
        var rack=Prepare("KitchenRack",Find(Kitchen+"/Prefab","DishRackShelf_01a.prefab"),1.4f);
        var bread=Prepare("KitchenBread",Find(Kitchen+"/Prefab","Bread_01.prefab"),.45f);
        var fast=Prepare("FastFoodDisplay",Find("Assets/Brick Project Studio/Fast Food Restaurant Kit","FFK_Display_01_01.prefab"),1.4f);
        var board=Prepare("BreakfastBoard",Find("Assets/Free Food-BreakfastTime/Prefabs","WoodBoard_WithCoffee.prefab"),1);
        var cup=Prepare("BreakfastCup",Find("Assets/Free Food-BreakfastTime/Prefabs","Free_CupCoffeeBreakfast.prefab"),.18f);
        var meal=Prepare("ServedMeal",Find("Assets/RPG Food & Drinks Pack","Steak.prefab"),.5f);
        var desk=Prepare("HomeTable",Find("Assets/FastMesh","Table-1.prefab"),1.5f,height:.85f);
        bridge.comparisonProps=new[]{bed,coffee,rack,bread,fast,board,cup,meal,desk};
        bridge.foodAssets=new[]{
            Prepare("Lemon",Find("Assets/Free Food-BreakfastTime/Prefabs","Free_Lemon.prefab"),.18f),
            Prepare("Kiwi",Find("Assets/Free Food-BreakfastTime/Prefabs","Free_Kiwi.prefab"),.17f),
            Prepare("Pepper",Find("Assets/Food Pack-Demo/Prefabs","Bell pepper green.prefab"),.2f),
            Prepare("Watermelon",Find("Assets/RPG Food & Drinks Pack","Watermelon.prefab"),.3f)
        };
        var chair=Prepare("CoffeeChair",Find("Assets/LeartesStudios/CoffeeShopInterior/URP/Prefabs","BoothsChairsTables_SM_Chair_6.prefab"),.53f,height:.94f);
        var tabletop=Prepare("CoffeeTable",Find("Assets/LeartesStudios/CoffeeShopInterior/URP/Prefabs","BoothsChairsTables_SM_Table_8.prefab"),1.6f,height:.86f);
        var dining=new GameObject("Comparison dining set");Place(dining.transform,tabletop,new(0,.44f,0));
        var seats=new[]{new Vector3(-1.176f,.44f,0),new Vector3(1.176f,.44f,0),new Vector3(0,.44f,1.12f),new Vector3(0,.44f,-1.12f)};
        for(int i=0;i<4;i++)Place(dining.transform,chair,seats[i],angle:new[]{90,270,180,0}[i]);
        bridge.tablePrefab=PrefabUtility.SaveAsPrefabAsset(dining,Out+"/DiningSet.prefab");Object.DestroyImmediate(dining);
        PrepareCity(bridge);
        // Limit only referenced new textures; the original project is untouched.
        foreach(var texture in materials.Values.SelectMany(m=>m.GetTexturePropertyNames().Select(m.GetTexture)).OfType<Texture2D>().Distinct()){
            var importer=AssetImporter.GetAtPath(AssetDatabase.GetAssetPath(texture)) as TextureImporter;
            if(importer&&importer.maxTextureSize>1024){importer.maxTextureSize=1024;importer.mipmapEnabled=true;importer.SaveAndReimport();}
        }
        EditorUtility.SetDirty(bridge);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
        File.WriteAllLines("../artifacts/unity-comparison/integrated-models.txt",used);
        // Keep the station, measured dining fit and denser city life when art is rebuilt.
        if(File.Exists(Out+"/city.json")){ComparisonWorldPolish.Apply();ComparisonCityPackage.Apply();}
        return "Prepared "+used.Count+" imported models in the separate comparison scene.";
    }
    static void PrepareCity(BusinessGameBridge bridge){
        var city=PrefabUtility.LoadPrefabContents("Assets/Prototype/SharedCity/City.prefab");
        var data=JsonUtility.FromJson<SharedCityData>(bridge.sharedCityData.text);
        var homes=new[]{"terraced1a","terraced1c","terraced3c","terraced4a","cornerterrace1c"}
            .Select(n=>Prepare("UK_"+n,Find("Assets/UK Terraced Houses FREE/Prefabs",n+".prefab"),6.1f,height:9,depth:7.5f)).ToArray();
        var holiday=Prepare("HolidayHouse",Find("Assets/Lowpoly_Holiday_House/Prefabs","Building_10.prefab"),6.3f,height:8,depth:7.5f);
        for(int q=0;q<4;q++){
            var old=city.transform.Find("Residential neighbourhood "+q);if(old)old.gameObject.SetActive(false);
            var group=new GameObject("Comparison neighbourhood "+q);group.transform.SetParent(city.transform,false);
            foreach(var h in data.houses.Where(h=>(h.x<0?1:0)+(h.z<0?2:0)==q)){
                int variant=Math.Abs((int)(h.x*7+h.z*13)+h.palette*11+h.style*3);
                Place(group.transform,variant%6==0?holiday:homes[variant%homes.Length],new(h.x,h.y,h.z),h.width>0?h.width:6.2f,7.2f,h.angle);
            }
            Combine(group,"Homes"+q);
        }
        var commercial=new[]{"Building_A_prefab","Building_B_prefab","Building_C1_prefab","Building_F_prefab","Building_H_prefab","Building_J_prefab"}
            .Select(n=>Prepare(n,Find("Assets/POLYGON city pack/Prefabs/Buildings",n+".prefab"),14,height:26,depth:15)).ToArray();
        var urban=Prepare("UrbanWarehouse",Find("Assets/UrbanBuilding/Prefabs","urban_building_Prefab.prefab"),14,height:18,depth:14);
        int index=0;
        foreach(var site in data.parcels){
            var group=city.transform.Find("Parcel:"+site.id);if(!group||Math.Abs(site.x)<65&&Math.Abs(site.z)<65)continue;
            var rs=group.GetComponentsInChildren<MeshRenderer>().Where(r=>r.bounds.max.y>3).ToArray();
            if(rs.Length==0)continue; // Vacant land stays vacant.
            index++;if(index%3==0)continue;
            foreach(var r in rs)r.enabled=false;
            var source=index%11==0?urban:commercial[index%commercial.Length];
            Place(group,source,new(site.x,.1f,site.z),16,16);
        }
        // Roads retain their exact paths and lane markings. EasyRoads supplies
        // the road normal map; no texture-drawn duplicate lanes are introduced.
        var normal=AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/EasyRoads3D/textures/roads/road_N.png");
        foreach(var m in city.GetComponentsInChildren<MeshRenderer>(true).SelectMany(r=>r.sharedMaterials).Where(m=>m&&m.HasProperty("_RoadSurface")).Distinct()){
            m.SetTexture("_RoadNormal",normal);EditorUtility.SetDirty(m);
        }
        used.Add("Road normal surface | Assets/EasyRoads3D/textures/roads/road_N.png");
        var garage=Prepare("AirportServiceGarage",Find("Assets/Industrial building/Garage/Models","garage.fbx"),12,height:7,depth:10);
        var service=new GameObject("Comparison airport maintenance");service.transform.SetParent(city.transform,false);
        var apron=GameObject.CreatePrimitive(PrimitiveType.Cube);apron.name="Service parking apron";apron.transform.SetParent(service.transform,false);
        apron.transform.localPosition=new(541,.1f,98);apron.transform.localScale=new(17,.16f,15);apron.GetComponent<MeshRenderer>().sharedMaterial=bridge.road;
        Place(service.transform,garage,new(542,.2f,101),12,10,180);
        PrefabUtility.SaveAsPrefabAsset(city,Out+"/ComparisonCity.prefab");PrefabUtility.UnloadPrefabContents(city);
        bridge.sharedCityPrefab=AssetDatabase.LoadAssetAtPath<GameObject>(Out+"/ComparisonCity.prefab");
    }
    internal static void Combine(GameObject root,string key){
        var groups=new Dictionary<Material,List<CombineInstance>>();
        foreach(var filter in root.GetComponentsInChildren<MeshFilter>()){
            var renderer=filter.GetComponent<MeshRenderer>();if(!renderer||!filter.sharedMesh)continue;
            var mesh=filter.sharedMesh;
            if(!mesh.isReadable){
                var importer=AssetImporter.GetAtPath(AssetDatabase.GetAssetPath(mesh)) as ModelImporter;
                if(importer){importer.isReadable=true;importer.SaveAndReimport();}
            }
            for(int sub=0;sub<mesh.subMeshCount;sub++){
                var material=renderer.sharedMaterials[Math.Min(sub,renderer.sharedMaterials.Length-1)];
                if(!groups.TryGetValue(material,out var items)){items=new();groups[material]=items;}
                items.Add(new CombineInstance{mesh=mesh,subMeshIndex=sub,transform=root.transform.worldToLocalMatrix*filter.transform.localToWorldMatrix});
            }
        }
        int n=0;foreach(var group in groups){
            var mesh=new Mesh{name=key+"-"+n,indexFormat=IndexFormat.UInt32};mesh.CombineMeshes(group.Value.ToArray(),true,true);mesh.RecalculateBounds();
            string file=Out+"/"+key+"-"+n+++".asset";Save(mesh,file);
            var batch=new GameObject("Batched imported homes");batch.transform.SetParent(root.transform,false);
            batch.AddComponent<MeshFilter>().sharedMesh=AssetDatabase.LoadAssetAtPath<Mesh>(file);batch.AddComponent<MeshRenderer>().sharedMaterial=group.Key;
        }
        foreach(Transform child in root.transform.Cast<Transform>().Where(t=>t.name!="Batched imported homes").ToArray())Object.DestroyImmediate(child.gameObject);
    }
}
