using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object=UnityEngine.Object;

public static class CityArchitectureSetup
{
    public const string Folder="Assets/Prototype/Art/Original/City/Prepared";
    public static readonly string[] Homes={"gableHome","gardenBungalow","brickTownhouse","modernHouse","bayCottage"};
    public static readonly string[] Restaurants={"brickBistro","timberRestaurant","decoRestaurant","pavilionRestaurant"};
    public static readonly string[] Markets={"marketHall","timberMarket","cityMarket","pavilionMarket"};
    public static string Configure()
    {
        if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop Play mode before preparing architecture.");
        AssetDatabase.Refresh();Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
        EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");
        var bridge=Object.FindFirstObjectByType<BusinessGameBridge>();
        var residence=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/Migration/Residence.prefab");
        var referenceMaterials=residence.GetComponentsInChildren<MeshRenderer>().Select(r=>r.sharedMaterial).ToArray();
        Texture Map(string name)=>referenceMaterials.FirstOrDefault(m=>m.name==name)?.mainTexture;
        var materials=new Dictionary<string,Material>();
        foreach(string name in Homes.Concat(Restaurants).Concat(Markets)){
            var source=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/Art/Original/City/"+name+".glb");
            if(!source)throw new InvalidOperationException("Missing Blender architecture: "+name);
            var root=new GameObject(name);var model=Object.Instantiate(source,root.transform);
            if(Homes.Contains(name))model.transform.localRotation=Quaternion.Euler(0,180,0);
            foreach(var r in root.GetComponentsInChildren<MeshRenderer>()){
                var old=r.sharedMaterial;string key=old.name.Replace(" (Instance)","");
                if(key.Contains("Clear storefront")){r.sharedMaterial=bridge.glass;continue;}
                if(!materials.TryGetValue(key,out var m)){
                    m=new Material(Shader.Find("Universal Render Pipeline/Lit")){name=key,color=old.color,enableInstancing=true};
                    m.SetFloat("_Smoothness",key.Contains("glass")?.75f:key.Contains("metal")?.55f:.28f);
                    if(key.Contains("brick")){m.mainTexture=bridge.brick.mainTexture;m.color=Color.Lerp(Color.white,old.color,.18f);}
                    if(key.Contains("Cedar")){m.mainTexture=bridge.wood.mainTexture;m.color=Color.Lerp(Color.white,old.color,.2f);}
                    if(key.Contains("siding")){m.mainTexture=Map("cedar");m.color=Color.white;}
                    if(key.Contains("Slate")){m.mainTexture=Map("slate");m.color=Color.white;}
                    if(key.Contains("Limestone")){m.mainTexture=Map("limestone");m.color=Color.white;}
                    string path=Folder+"/"+key.Replace(" ","-")+".mat";
                    SaveAsset(m,path);m=AssetDatabase.LoadAssetAtPath<Material>(path);materials[key]=m;
                }
                r.sharedMaterial=m;
            }
            PrefabUtility.SaveAsPrefabAsset(root,Folder+"/"+name+".prefab");Object.DestroyImmediate(root);
        }
        bridge.restaurantExteriors=Restaurants.Select(n=>AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/"+n+".prefab")).ToArray();
        bridge.marketExteriors=Markets.Select(n=>AssetDatabase.LoadAssetAtPath<GameObject>(Folder+"/"+n+".prefab")).ToArray();
        EditorUtility.SetDirty(bridge);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
        return "Prepared five original Blender homes, four restaurants and four supermarkets.";
    }
    static void SaveAsset(Object value,string path){
        var old=AssetDatabase.LoadAssetAtPath<Object>(path);
        if(old){EditorUtility.CopySerialized(value,old);EditorUtility.SetDirty(old);Object.DestroyImmediate(value);}else AssetDatabase.CreateAsset(value,path);
    }
}
