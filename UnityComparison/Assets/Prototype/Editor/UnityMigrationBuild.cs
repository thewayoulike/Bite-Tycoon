using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using Object = UnityEngine.Object;

public static class UnityMigrationBuild
{
    const string Folder = "Assets/Prototype/Migration";
    [MenuItem("Business Simulator/Prepare Browser Game")]
    public static void Prepare()
    {
        DetailedPrototypeSetup.Create(); Directory.CreateDirectory(Folder);
        var architecture = GameObject.Find("Architecture and furnishings");
        var restaurant = architecture.transform.Find("Restaurant template").gameObject;
        var supermarket = architecture.transform.Find("Supermarket template").gameObject;
        var restaurantExterior = Template(restaurant, "RestaurantExterior", 13, true, false);
        var restaurantInterior = Template(restaurant, "RestaurantInterior", 13, false, true);
        var marketExterior = Template(supermarket, "MarketExterior", -12, true, false);
        var marketInterior = Template(supermarket, "MarketInterior", -12, false, false);
        var dining = restaurant.GetComponentsInChildren<Transform>().First(t => t.name == "Dining set");
        var table = new GameObject("Dining set template"); var set = Object.Instantiate(dining, table.transform); set.localPosition = new Vector3(17.8f, 0, 4.7f);
        var chairs = set.GetComponentsInChildren<Transform>().Where(t => t.name == "Bentwood dining chair").ToArray();
        var chairSource = chairs[0];
        var seatPoints = new[] { new Vector3(-1.176f, .44f, 0), new Vector3(1.176f, .44f, 0), new Vector3(0, .44f, 1.12f), new Vector3(0, .44f, -1.12f) };
        for (int n = 0; n < 4; n++) { var chair = Object.Instantiate(chairSource, table.transform); chair.localPosition = seatPoints[n]; chair.localRotation = Quaternion.Euler(0, new[] {90,270,180,0}[n], 0); }
        foreach (var chair in chairs) Object.DestroyImmediate(chair.gameObject);
        var tablePrefab = PrefabUtility.SaveAsPrefabAsset(table, Folder + "/DiningSet.prefab"); Object.DestroyImmediate(table);
        var home = architecture.transform.Find("Cedar residence 1").gameObject;
        var house = Object.Instantiate(home); house.transform.position = Vector3.zero;
        var housePrefab = PrefabUtility.SaveAsPrefabAsset(house, Folder + "/Residence.prefab"); Object.DestroyImmediate(house);
        var treeSource = GameObject.Find("Detailed trees").transform.GetChild(0).gameObject;
        var tree = Object.Instantiate(treeSource); tree.transform.position = Vector3.zero;
        var treePrefab = PrefabUtility.SaveAsPrefabAsset(tree, Folder + "/Tree.prefab"); Object.DestroyImmediate(tree);
        var vehicles = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/Art/vehicles.glb");
        var vehiclePrefabs = new[] {"sedan", "hatchback", "suv"}.Select(style => { var source = vehicles.GetComponentsInChildren<Transform>().First(t => t.name == style); var car = Object.Instantiate(source).gameObject; car.transform.position = Vector3.zero; var saved = PrefabUtility.SaveAsPrefabAsset(car, Folder + "/" + style + ".prefab"); Object.DestroyImmediate(car); return saved; }).ToArray();
        var tour = Object.FindFirstObjectByType<DetailedCityTour>();
        var mainCamera = tour.viewCamera;
        tour.enabled = false; tour.staticScenery = null; tour.traffic = Array.Empty<Transform>(); tour.treeCrowns = Array.Empty<Transform>(); tour.restaurantCutaway = null; tour.supermarketCutaway = null;
        foreach (var actor in Object.FindObjectsByType<PrototypePerson>(FindObjectsSortMode.None)) Object.DestroyImmediate(actor.gameObject);
        foreach (var root in EditorSceneManager.GetActiveScene().GetRootGameObjects())
        {
            if (root == mainCamera.gameObject || root.GetComponent<Light>() || root.GetComponent<Volume>()) continue;
            Object.DestroyImmediate(root);
        }
        var bridge = new GameObject("BusinessGameBridge").AddComponent<BusinessGameBridge>(); bridge.viewCamera = mainCamera; bridge.lighting = tour;
        bridge.seaShader = AssetDatabase.LoadAssetAtPath<Shader>("Assets/Prototype/Scripts/CoastalWater.shader"); bridge.hazeShader = AssetDatabase.LoadAssetAtPath<Shader>("Assets/Prototype/Scripts/DriftingSmoke.shader");
        bridge.seaNormals = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Prototype/Detailed/Textures/CoastalRipples.png");
        bridge.restaurantExterior = restaurantExterior; bridge.restaurantInterior = restaurantInterior; bridge.marketExterior = marketExterior; bridge.marketInterior = marketInterior; bridge.tablePrefab = tablePrefab; bridge.housePrefab = housePrefab; bridge.treePrefab = treePrefab; bridge.vehiclePrefabs = vehiclePrefabs;
        bridge.peoplePrefabs = new[] { "alice", "ben", "emma", "daniel" }.Select(name => AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/Art/People/" + name + ".glb")).ToArray();
        Material Material(string name) => AssetDatabase.LoadAssetAtPath<Material>("Assets/Prototype/Detailed/Materials/" + name + ".mat");
        bridge.plaster = Material("Warm mineral plaster"); bridge.brick = Material("Handmade buff brick"); bridge.wood = Material("Oiled oak"); bridge.metal = Material("Blackened steel"); bridge.glass = Material("Clear architectural glass"); bridge.paving = Material("Stone paving"); bridge.road = Material("Fine asphalt"); bridge.greenery = Material("Meadow"); bridge.fontMaterial = Material("Depth-tested signs");
        mainCamera.farClipPlane = 1100;
        var mobile = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/Settings/Mobile_RPAsset.asset");
        mobile.renderScale = 1; mobile.msaaSampleCount = 2; mobile.shadowDistance = 90; mobile.mainLightShadowmapResolution = 2048; var mobileSettings = new SerializedObject(mobile); mobileSettings.FindProperty("m_SoftShadowsSupported").boolValue = true; mobileSettings.FindProperty("m_UpscalingFilter").intValue = 1; mobileSettings.ApplyModifiedPropertiesWithoutUndo();
        EditorUtility.SetDirty(mobile);
        RenderSettings.fogStartDistance = 270; RenderSettings.fogEndDistance = 850;
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(), "Assets/Scenes/BusinessSimulatorWeb.unity");
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/BusinessSimulatorWeb.unity", true) };
        AssetDatabase.SaveAssets(); Debug.Log("UNITY_GAME_SCENE_READY");
    }
    static GameObject Template(GameObject source, string name, float center, bool exterior, bool removeTables)
    {
        var wrapper = new GameObject(name); var copy = Object.Instantiate(source, wrapper.transform); copy.transform.localPosition = Vector3.right * center;
        foreach (var t in copy.GetComponentsInChildren<Transform>(true).ToArray())
        {
            if (!t) continue;
            if (exterior && t.name.EndsWith(" interior") || !exterior && t.name.Contains("facade and removable roof") || removeTables && t.name == "Dining set") Object.DestroyImmediate(t.gameObject);
        }
        // Static brand names are replaced by the player's business sign in the game map.
        if (removeTables) foreach (var t in copy.GetComponentsInChildren<Transform>().Where(t => t.name.Contains("banquette") || t.name == "Upholstery seam").ToArray()) if(t) Object.DestroyImmediate(t.gameObject);
        if (exterior) foreach (var text in copy.GetComponentsInChildren<TextMesh>()) Object.DestroyImmediate(text.gameObject);
        if (exterior) Combine(wrapper, name);
        var prefab = PrefabUtility.SaveAsPrefabAsset(wrapper, Folder + "/" + name + ".prefab"); Object.DestroyImmediate(wrapper); return prefab;
    }
    static void Combine(GameObject root, string name)
    {
        var groups = root.GetComponentsInChildren<MeshFilter>().Where(f => f.GetComponent<MeshRenderer>() && f.sharedMesh && f.sharedMesh.isReadable).GroupBy(f => f.GetComponent<MeshRenderer>().sharedMaterial).ToArray();
        int serial = 0;
        foreach (var group in groups)
        {
            if (!group.Key) continue;
            var pieces = group.Select(f => new CombineInstance { mesh = f.sharedMesh, transform = root.transform.worldToLocalMatrix * f.transform.localToWorldMatrix }).ToArray();
            var mesh = new Mesh { name = name + " batch " + serial, indexFormat = IndexFormat.UInt32 }; mesh.CombineMeshes(pieces, true, true); mesh.RecalculateBounds();
            string path = Folder + "/" + name + "-" + serial++ + ".asset"; if (AssetDatabase.LoadAssetAtPath<Mesh>(path)) AssetDatabase.DeleteAsset(path); AssetDatabase.CreateAsset(mesh, path);
            var batch = new GameObject(mesh.name); batch.transform.SetParent(root.transform, false); batch.AddComponent<MeshFilter>().sharedMesh = mesh; batch.AddComponent<MeshRenderer>().sharedMaterial = group.Key;
            foreach (var filter in group) { Object.DestroyImmediate(filter.GetComponent<MeshRenderer>()); Object.DestroyImmediate(filter); }
        }
    }
    [MenuItem("Business Simulator/Build Browser Game")]
    public static void Build()
    {
        string resultPath = Path.GetFullPath("../artifacts/unity-comparison/web-build-result.json");
        try
        {
            CityLightingSetup.Configure();
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.initialMemorySize = 256;
            PlayerSettings.WebGL.maximumMemorySize = 2048;
            PlayerSettings.runInBackground = true;
            PlayerSettings.productName = "Business Simulator — Asset Comparison";
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { "Assets/Scenes/BusinessSimulatorWeb.unity" }, locationPathName = "Builds/UnityComparison", target = BuildTarget.WebGL, options = BuildOptions.None });
            File.WriteAllText(resultPath, JsonUtility.ToJson(new BuildResult { result = report.summary.result.ToString(), errors = (int)report.summary.totalErrors, size = (long)report.summary.totalSize, seconds = report.summary.totalTime.TotalSeconds }));
            if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded) { Debug.LogError("Unity browser build failed. See the build report and console."); return; }
            Debug.Log("UNITY_GAME_WEB_BUILD_READY");
        }
        catch (Exception error) { File.WriteAllText(resultPath, JsonUtility.ToJson(new BuildResult { result = "Failed", message = error.ToString() })); Debug.LogException(error); }
    }
    [Serializable] class BuildResult { public string result, message; public int errors; public long size; public double seconds; }
}
