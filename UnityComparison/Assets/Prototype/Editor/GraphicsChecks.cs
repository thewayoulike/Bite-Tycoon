using System;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Assertions;
using Object=UnityEngine.Object;

public static class GraphicsChecks
{
    const BindingFlags Flags=BindingFlags.Instance|BindingFlags.NonPublic;
    static FieldInfo Field(string name)=>typeof(BusinessGameBridge).GetField(name,Flags);
    static object Call(BusinessGameBridge bridge,string name,params object[] args)=>typeof(BusinessGameBridge).GetMethod(name,Flags).Invoke(bridge,args);
    public static string Configure()
    {
        if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop Play mode before configuring.");
        AssetDatabase.Refresh();
        EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");
        var bridge=Object.FindFirstObjectByType<BusinessGameBridge>();
        bridge.furnishingAssets=new[]{"loungeSofa","tableCoffee","plantSmall1","lampRoundFloor","televisionModern"}.Select(n=>AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/Art/Kenney/Furniture/"+n+".glb")).Append(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/Art/Original/conciergeDesk.glb")).ToArray();
        bridge.foodAssets=new[]{"apple","banana","pear","carrot"}.Select(n=>AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/Art/Kenney/Food/"+n+".glb")).ToArray();
        Assert.IsTrue(bridge.furnishingAssets.All(p=>p)&&bridge.foodAssets.All(p=>p));
        EditorUtility.SetDirty(bridge);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
        return "Nine CC0 models and the original Blender concierge desk assigned to the shared Unity scene.";
    }
    public static string Run()
    {
        var wire=JsonUtility.FromJson<BusinessFrame>("{\"version\":1,\"speed\":5,\"tables\":[{\"id\":\"inside\"}],\"frontages\":[{\"id\":\"other\",\"speed\":1,\"tables\":[{\"id\":\"outside\"}]}]}");
        Assert.AreEqual(5f,wire.speed);Assert.AreEqual("inside",wire.tables[0].id);
        Assert.AreEqual("outside",wire.frontages[0].tables[0].id);
        Assert.AreEqual("other",JsonUtility.FromJson<BusinessFrame>(JsonUtility.ToJson(wire)).frontages[0].id);
        var source=Object.FindFirstObjectByType<BusinessGameBridge>();
        Assert.IsTrue(source.viewCamera.GetComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>().stopNaN,"Invalid lighting pixels must be removed before bloom.");
        Assert.IsTrue(source.lighting.grading.sharedProfile.TryGet<UnityEngine.Rendering.Universal.Bloom>(out var bloom)&&bloom.clamp.overrideState&&bloom.clamp.value<=6,"Bloom must not spread extreme HDR values across the city.");
        foreach(var prefab in source.vehiclePrefabs.Append(source.housePrefab).Append(source.sharedCityPrefab))
            Assert.IsFalse(prefab.GetComponentsInChildren<Renderer>(true).SelectMany(r=>r.sharedMaterials).Any(m=>m&&m.shader.name.Contains("glTF")&&m.IsKeywordEnabled("_EMISSIVE")),"Scenery lights need stable browser-compatible materials.");
        var city=source.sharedCityPrefab.GetComponentsInChildren<MeshRenderer>();
        var terminal=city.Single(r=>r.name=="Eastport Airport glass");
        Assert.IsTrue(terminal.sharedMaterial.renderQueue>=3000,"Airport glazing must render transparently.");
        Assert.AreEqual(UnityEngine.Rendering.ShadowCastingMode.Off,terminal.shadowCastingMode,"Glass must not black out the concourse.");
        var ground=city.Single(r=>r.name=="Ground").sharedMaterial;
        Assert.IsTrue(ground.GetTexture("_GrassMap")&&ground.GetTexture("_GrassNormal"),"The terrain needs both scanned turf maps.");
        Assert.IsTrue(city.Where(r=>r.name.EndsWith("roads road")).All(r=>r.sharedMaterial.GetTexture("_RoadMap")),"Both central and outer roads need asphalt.");
        var root=new GameObject("Graphics regression check");
        try{
            var bridge=root.AddComponent<BusinessGameBridge>();EditorUtility.CopySerialized(source,bridge);
            var camera=new GameObject("Check camera").AddComponent<Camera>();camera.transform.SetParent(root.transform);bridge.viewCamera=camera;
            var frame=new BusinessFrame{focus="check",detail="room",properties=new[]{new BusinessProperty{id="check",kind="restaurant",owned=true}}};
            Field("frame").SetValue(bridge,frame);Field("distance").SetValue(bridge,27f);
            bridge.ZoomBy("-1");Assert.IsTrue((float)Field("distance").GetValue(bridge)<27);
            bridge.ZoomBy("NaN");Assert.IsFalse((bool)Field("overviewRequested").GetValue(bridge));
            for(int n=0;n<8;n++)bridge.ZoomBy("3");
            Assert.IsTrue((bool)Field("overviewRequested").GetValue(bridge));Assert.AreEqual(48f,(float)Field("distance").GetValue(bridge));
            bridge.ZoomBy("3");Assert.AreEqual(48f,(float)Field("distance").GetValue(bridge));
            Field("overviewRequested").SetValue(bridge,false);frame.detail="exterior";
            bridge.ZoomBy("3");Assert.IsTrue((float)Field("distance").GetValue(bridge)>48);Assert.IsFalse((bool)Field("overviewRequested").GetValue(bridge));
            camera.fieldOfView=48;camera.aspect=1.6f;camera.transform.position=new(0,2,-6);camera.transform.LookAt(new Vector3(0,2,25));
            frame.focus="";frame.fast=true;frame.properties=new[]{
                new BusinessProperty{id="visible-diner",kind="restaurant",x=0,z=25},
                new BusinessProperty{id="behind-mall",kind="plaza",x=0,z=-28},
                new BusinessProperty{id="left-offscreen",kind="restaurant",x=-25,z=0},
                new BusinessProperty{id="right-offscreen",kind="hotel",x=25,z=0}};
            var visible=(BusinessProperty[])Call(bridge,"VisibleStreetProperties");
            Assert.IsTrue(visible.Any(p=>p.id=="visible-diner"),"The visible storefront must keep its fit-out even in Fast graphics.");
            Assert.IsFalse(visible.Any(p=>p.id=="behind-mall"),"A building behind the camera must not take an interior slot.");
            camera.transform.LookAt(new Vector3(0,2,-28));
            visible=(BusinessProperty[])Call(bridge,"VisibleStreetProperties");
            Assert.IsFalse(visible.Any(p=>p.id=="behind-mall"),"The mall has its own permanent visible galleries, not a generic street lobby.");Assert.IsFalse(visible.Any(p=>p.id=="visible-diner"));
            CheckPersistentExteriors(bridge,root.transform,camera);
            CheckInteriorSurroundings(bridge,root.transform,camera);
            foreach(string kind in new[]{"hotel","apartments","plaza"}){
                var model=new GameObject(kind);model.transform.SetParent(root.transform);
                Call(bridge,"Building",model.transform,kind,2);
                Assert.IsFalse(model.GetComponentsInChildren<Transform>().Any(t=>t.name=="Building shell"));
                Assert.IsTrue(model.GetComponentsInChildren<Transform>().Any(t=>t.name=="Glazing"));
                Assert.IsTrue(model.GetComponentsInChildren<Transform>().Any(t=>t.name=="Furnished upper room"));
            }
            var modelRoot=new GameObject("Character").transform;modelRoot.SetParent(root.transform);
            var skin=modelRoot.gameObject.AddComponent<SkinnedMeshRenderer>();skin.quality=SkinQuality.Bone2;
            var pose=root.AddComponent<PrototypePerson>();pose.SetModel(modelRoot);
            Assert.AreEqual(SkinQuality.Bone4,skin.quality);
            return "Passed: transparent airport glazing, scanned turf, asphalt, interior zoom exit, invalid wheel, city zoom, visible storefront priority, stable exteriors across zoom and rotation for all six business types, city visibility inside all six business types, shared placeholder suppression, glazed openings, upper-floor furnishings, four-bone character skinning.";
        }finally{Object.DestroyImmediate(root);}
    }
    static void CheckInteriorSurroundings(BusinessGameBridge bridge,Transform root,Camera camera)
    {
        var shared=new GameObject("Interior city surroundings");shared.transform.SetParent(root);
        Field("sharedCity").SetValue(bridge,shared.transform);
        var models=(System.Collections.Generic.Dictionary<string,GameObject>)Field("properties").GetValue(bridge);
        var active=new GameObject("Entered property");active.transform.SetParent(root);models["inside"]=active;
        var neighbor=new GameObject("Neighbor");neighbor.transform.SetParent(root);models["neighbor"]=neighbor;
        camera.transform.position=new(0,4,-10);camera.transform.LookAt(new Vector3(0,2,25));
        foreach(string kind in new[]{"restaurant","cafe","shop","hotel","apartments","plaza"}){
            var frame=new BusinessFrame{focus="inside",detail="room",properties=new[]{
                new BusinessProperty{id="inside",kind=kind,owned=true},
                new BusinessProperty{id="neighbor",kind="restaurant",x=0,z=25}}};
            Field("frame").SetValue(bridge,frame);
            Call(bridge,"UpdateCityVisibility");
            Assert.IsTrue(shared.activeSelf&&neighbor.activeSelf,"Entering "+kind+" must preserve the real surroundings.");
            Assert.IsFalse(active.activeSelf,"Only the entered building's shell is hidden.");
            var visible=(BusinessProperty[])Call(bridge,"VisibleStreetProperties");
            Assert.IsTrue(visible.Any(p=>p.id=="neighbor"),"Neighboring shop windows must retain their contents.");
            Assert.IsFalse(visible.Any(p=>p.id=="inside"),"Do not draw duplicate furnishings over the active interior.");
            frame.detail="exterior";Call(bridge,"UpdateCityVisibility");
            Assert.IsTrue(shared.activeSelf&&active.activeSelf&&neighbor.activeSelf,"Leaving a business restores its exterior.");
            frame.detail="room";frame.properties[0].owned=false;Call(bridge,"UpdateCityVisibility");
            Assert.IsTrue(active.activeSelf,"Unowned buildings keep their exterior.");
        }
        models.Remove("inside");models.Remove("neighbor");Field("sharedCity").SetValue(bridge,null);
    }
    static void CheckPersistentExteriors(BusinessGameBridge bridge,Transform root,Camera camera)
    {
        var shared=new GameObject("Shared city test").transform;shared.SetParent(root);
        foreach(string name in new[]{"OuterMarket","OuterLegacy","Parcel:check-site"})new GameObject(name).transform.SetParent(shared);
        Field("sharedCity").SetValue(bridge,shared);
        Field("cityData").SetValue(bridge,new SharedCityData{parcels=new[]{new SharedSite{id="check-site",x=0,z=0}},lots=Array.Empty<SharedSite>()});
        var propertyModels=(System.Collections.Generic.Dictionary<string,GameObject>)Field("properties").GetValue(bridge);
        foreach(string kind in new[]{"restaurant","cafe","shop","hotel","apartments","plaza"}){
            var p=new BusinessProperty{id="stable-"+kind,name="Existing "+kind,kind=kind,existing=true,
                offer=kind=="cafe"?"lease":"purchase",floors=1,accent="#41687E",design=""};
            var frame=new BusinessFrame{focus="",detail="exterior",market=true,properties=new[]{p}};
            Field("frame").SetValue(bridge,frame);
            var model=(GameObject)Call(bridge,"CreateProperty",p);model.transform.SetParent(root);
            propertyModels[p.id]=model;
            var architecture=model.transform.Find("Building and site");
            var exterior=architecture.GetComponentsInChildren<Renderer>();
            Assert.IsTrue(architecture.gameObject.activeSelf&&exterior.Length>0,"Existing "+kind+" needs its exterior before the camera approaches.");
            var scale=architecture.localScale;var position=architecture.localPosition;
            foreach(float range in new[]{140f,35f,140f,35f}){
                frame.fast=range>75;
                camera.transform.position=new(0,range*.3f,-range);camera.transform.LookAt(new Vector3(0,2,0));
                Call(bridge,"UpdateStreetInteriors");
                Assert.IsTrue(architecture.gameObject.activeSelf&&exterior.All(r=>r&&r.gameObject.activeInHierarchy),"Zoom must not replace or hide the "+kind+" exterior.");
                Assert.AreEqual(scale,architecture.localScale);Assert.AreEqual(position,architecture.localPosition);
                Assert.IsFalse(shared.Find("Parcel:check-site").gameObject.activeSelf,"The old shared placeholder must stay hidden at every zoom.");
            }
            camera.transform.LookAt(new Vector3(0,2,-200));Call(bridge,"UpdateStreetInteriors");
            Assert.IsTrue(architecture.gameObject.activeSelf&&exterior.All(r=>r&&r.gameObject.activeInHierarchy),"Turning away must not remove the exterior.");
            propertyModels.Remove(p.id);Object.DestroyImmediate(model);
        }
        Field("sharedCity").SetValue(bridge,null);
    }
}
