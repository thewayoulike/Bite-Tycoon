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

public static class DetailedPrototypeSetup
{
    const string Folder = "Assets/Prototype/Detailed";
    const string Art = "Assets/Prototype/Art/";
    static Transform world, nature, parent;
    static Material ivory, brick, wood, pavement, asphalt, forest, brass, black, glass, white, sage, leather, steel, soil, leaf, lightMat, tile, fabric;
    static readonly List<Light> lamps = new();
    static readonly List<Transform> crowns = new();
    static readonly List<Transform> traffic = new();
    static readonly Dictionary<string, Mesh> meshes = new();
    static readonly Dictionary<string, Material> materials = new();

    [MenuItem("Business Simulator/Create Detailed Graphics Test")]
    public static void Create()
    {
        Directory.CreateDirectory(Folder + "/Materials"); Directory.CreateDirectory(Folder + "/Meshes");
        AssetDatabase.Refresh();
        foreach (string file in Directory.GetFiles(Art + "Textures", "*.jpg"))
        {
            var importer = AssetImporter.GetAtPath(file.Replace('\\', '/')) as TextureImporter;
            if (importer == null) continue;
            importer.textureType = file.Contains("nor_gl") ? TextureImporterType.NormalMap : TextureImporterType.Default;
            importer.maxTextureSize = 1024; importer.anisoLevel = 8; importer.wrapMode = TextureWrapMode.Repeat;
            importer.SaveAndReimport();
        }
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        lamps.Clear(); crowns.Clear(); traffic.Clear(); meshes.Clear(); materials.Clear();
        world = new GameObject("Architecture and furnishings").transform; parent = world;
        nature = new GameObject("Detailed trees").transform;
        ivory = Mat("Warm mineral plaster", "E6DDC9", .15f);
        brick = Textured("Handmade buff brick", "brick_wall_003", .26f, .58f);
        wood = Textured("Oiled oak", "wood_floor", .35f, .65f);
        pavement = Textured("Stone paving", "floor_pavement", .2f, .5f);
        asphalt = Mat("Fine asphalt", "8B918B", .12f); asphalt.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "Textures/Asphalt.png"); asphalt.mainTextureScale = Vector2.one * .2f;
        forest = Mat("Juniper green enamel", "183E32", .38f, .25f); brass = Mat("Aged brass", "C8A968", .66f, .7f);
        black = Mat("Blackened steel", "232C2D", .35f, .5f); white = Mat("Warm porcelain", "EEEADF", .5f);
        sage = Mat("Sage tiles", "718B75", .52f); leather = Mat("Saddle leather", "965E3A", .34f);
        steel = Mat("Stainless steel", "AEB6B4", .72f, .82f); soil = Mat("Planting soil", "3C392B", .04f); leaf = Mat("Leaf accents", "516E3E", .15f);
        tile = Mat("Ivory terrazzo", "CFCDBD", .42f); fabric = Mat("Natural canvas", "C9BEA3", .05f);
        lightMat = Mat("Warm luminous glass", "FFF1C9", .25f); lightMat.EnableKeyword("_EMISSION"); lightMat.SetColor("_EmissionColor", new Color(1, .76f, .4f) * 2.2f);
        glass = Mat("Clear architectural glass", "A4C7CA", .92f, .1f);
        glass.SetFloat("_Surface", 1); glass.SetFloat("_SrcBlend", 5); glass.SetFloat("_DstBlend", 10); glass.SetFloat("_ZWrite", 0);
        glass.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); glass.SetOverrideTag("RenderType", "Transparent"); glass.renderQueue = 3000; glass.color = new Color(.57f, .73f, .76f, .2f);
        Streets();
        parent = Group("Restaurant template", world);
        var restaurant = Storefront(-13, 17, "JUNIPER", "K I T C H E N   &   C O F F E E", true);
        var restaurantRoot = parent; parent = Group("Restaurant interior"); Restaurant(); parent = world;
        parent = Group("Supermarket template", world);
        var market = Storefront(12, 22, "MARKET & CO.", "F R E S H   •   L O C A L   •   E V E R Y D A Y", false);
        parent = Group("Supermarket interior"); Supermarket(); parent = world;
        Surroundings(); People();
        var cameraObject = new GameObject("Main Camera"); cameraObject.tag = "MainCamera";
        var camera = cameraObject.AddComponent<Camera>(); camera.fieldOfView = 43; camera.nearClipPlane = .15f; camera.farClipPlane = 350; camera.allowHDR = true;
        cameraObject.AddComponent<AudioListener>(); camera.transform.position = new Vector3(10, 19, -49); camera.transform.LookAt(new Vector3(-3, 2.5f, -2));
        var data = cameraObject.AddComponent<UniversalAdditionalCameraData>(); data.renderPostProcessing = true; data.stopNaN = true; data.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing; data.antialiasingQuality = AntialiasingQuality.High;
        var sun = new GameObject("Golden daylight").AddComponent<Light>(); sun.type = LightType.Directional; sun.intensity = 2.5f; sun.color = new Color(1, .93f, .82f); sun.transform.rotation = Quaternion.Euler(43, -28, 0); sun.shadows = LightShadows.Soft; sun.shadowBias = .025f; sun.shadowNormalBias = .15f; sun.shadowStrength = .85f;
        RenderSettings.sun = sun; RenderSettings.ambientMode = AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(.68f, .78f, .88f); RenderSettings.ambientEquatorColor = new Color(.59f, .61f, .6f); RenderSettings.ambientGroundColor = new Color(.35f, .34f, .3f);
        var sky = new Material(Shader.Find("Skybox/Procedural")); sky.SetColor("_SkyTint", new Color(.56f, .68f, .77f)); sky.SetFloat("_AtmosphereThickness", .8f); sky.SetFloat("_Exposure", 1.1f);
        Save(sky, Folder + "/Sky.mat"); RenderSettings.skybox = AssetDatabase.LoadAssetAtPath<Material>(Folder + "/Sky.mat");
        RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogColor = new Color(.68f, .77f, .8f); RenderSettings.fogStartDistance = 95; RenderSettings.fogEndDistance = 245;
        var volume = new GameObject("Cinematic color and bloom").AddComponent<Volume>(); volume.isGlobal = true;
        var profile = ScriptableObject.CreateInstance<VolumeProfile>(); profile.Add<Tonemapping>().mode.Override(TonemappingMode.ACES);
        var color = profile.Add<ColorAdjustments>(); color.postExposure.Override(.1f); color.contrast.Override(12); color.saturation.Override(-5);
        var bloom = profile.Add<Bloom>(); bloom.intensity.Override(.22f); bloom.threshold.Override(1.2f); bloom.scatter.Override(.55f); bloom.clamp.Override(6);
        var vignette = profile.Add<Vignette>(); vignette.intensity.Override(.16f); vignette.smoothness.Override(.6f);
        Save(profile, Folder + "/Grading.asset"); foreach (var component in profile.components) AssetDatabase.AddObjectToAsset(component, profile); volume.sharedProfile = profile;
        var tour = cameraObject.AddComponent<DetailedCityTour>(); tour.viewCamera = camera; tour.restaurantCutaway = restaurant; tour.supermarketCutaway = market; tour.traffic = traffic.ToArray(); tour.sun = sun; tour.lamps = lamps.ToArray(); tour.treeCrowns = crowns.ToArray(); tour.grading = volume; tour.staticScenery = world.gameObject;
        PlayerSettings.colorSpace = ColorSpace.Linear; QualitySettings.vSyncCount = 1; QualitySettings.shadowDistance = 90;
        PlayerSettings.defaultScreenWidth = 1600; PlayerSettings.defaultScreenHeight = 900; PlayerSettings.productName = "Business Simulator — Graphics Test";
        foreach (var r in world.GetComponentsInChildren<MeshRenderer>()) { r.receiveShadows = true; GameObjectUtility.SetStaticEditorFlags(r.gameObject, StaticEditorFlags.BatchingStatic); }
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/DetailedGraphicsTest.unity");
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/DetailedGraphicsTest.unity", true) };
        AssetDatabase.SaveAssets(); Debug.Log("DETAILED_GRAPHICS_TEST_READY");
    }

    static Material Mat(string name, string hex, float smooth = .2f, float metallic = 0)
    {
        if (materials.TryGetValue(name, out var cached)) return cached;
        string path = Folder + "/Materials/" + name + ".mat";
        var m = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (!m) { m = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(m, path); }
        ColorUtility.TryParseHtmlString("#" + hex, out var c); m.color = c; m.SetFloat("_Smoothness", smooth); m.SetFloat("_Metallic", metallic); m.enableInstancing = true;
        materials[name] = m; return m;
    }
    static Material Textured(string name, string texture, float smooth, float tiling)
    {
        var m = Mat(name, "FFFFFF", smooth); m.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "Textures/" + texture + "_Diffuse.jpg"); m.mainTextureScale = Vector2.one * tiling;
        m.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Art + "Textures/" + texture + "_nor_gl.jpg")); m.SetFloat("_BumpScale", .7f); m.EnableKeyword("_NORMALMAP"); return m;
    }
    static void Save(Object asset, string path) { if (AssetDatabase.LoadAssetAtPath<Object>(path)) AssetDatabase.DeleteAsset(path); AssetDatabase.CreateAsset(asset, path); }
    static Transform Group(string name, Transform under = null)
    {
        var g = new GameObject(name).transform; g.SetParent(under ? under : parent, false); return g;
    }
    static GameObject Shape(string name, PrimitiveType type, Vector3 position, Vector3 size, Material material)
    {
        var go = GameObject.CreatePrimitive(type); go.name = name; go.transform.SetParent(parent, false); go.transform.localPosition = position; go.transform.localScale = size;
        go.GetComponent<Renderer>().sharedMaterial = material; Object.DestroyImmediate(go.GetComponent<Collider>()); return go;
    }
    static GameObject Box(string name, Vector3 p, Vector3 s, Material m)
    {
        var go = Shape(name, PrimitiveType.Cube, p, s, m);
        if (!m.mainTexture) return go;
        string key = $"{s.x:0.000}_{s.y:0.000}_{s.z:0.000}";
        if (!meshes.TryGetValue(key, out var mesh))
        {
            string path = Folder + "/Meshes/UV_" + key + ".asset";
            mesh = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (!mesh)
            {
                mesh = Object.Instantiate(go.GetComponent<MeshFilter>().sharedMesh); mesh.name = "Metre UV box " + key;
                var verts = mesh.vertices; var normal = mesh.normals; var uv = mesh.uv;
                for (int i = 0; i < uv.Length; i++) { var v = Vector3.Scale(verts[i], s); uv[i] = Mathf.Abs(normal[i].y) > .5f ? new Vector2(v.x, v.z) : Mathf.Abs(normal[i].x) > .5f ? new Vector2(v.z, v.y) : new Vector2(v.x, v.y); }
                mesh.uv = uv; mesh.RecalculateTangents(); AssetDatabase.CreateAsset(mesh, path);
            }
            meshes[key] = mesh;
        }
        go.GetComponent<MeshFilter>().sharedMesh = mesh; return go;
    }
    static GameObject Cyl(string name, Vector3 p, float radius, float height, Material mat) => Shape(name, PrimitiveType.Cylinder, p, new Vector3(radius * 2, height / 2, radius * 2), mat);
    static void Rod(string name, Vector3 a, Vector3 b, float radius, Material mat)
    {
        var go = Cyl(name, (a + b) / 2, radius, (b - a).magnitude, mat); go.transform.localRotation = Quaternion.FromToRotation(Vector3.up, b - a);
    }
    static void Text(string text, Vector3 p, float height, Material mat, float yaw = 0)
    {
        var go = new GameObject(text); go.transform.SetParent(parent, false); go.transform.localPosition = p; go.transform.localRotation = Quaternion.Euler(0, yaw, 0);
        var t = go.AddComponent<TextMesh>(); t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); t.fontSize = 96; t.characterSize = height / 10; t.anchor = TextAnchor.MiddleCenter; t.alignment = TextAlignment.Center; t.text = text; t.color = mat.color;
        var fontMat = Mat("Depth-tested signs", "FFFFFF");
        fontMat.shader = Shader.Find("BusinessSimulator/WorldText"); fontMat.mainTexture = t.font.material.mainTexture;
        go.GetComponent<MeshRenderer>().sharedMaterial = fontMat;
    }
    static Light Lamp(string name, Vector3 p, float range, bool street = false)
    {
        var go = new GameObject(name); go.transform.SetParent(parent, false); go.transform.localPosition = p;
        var l = go.AddComponent<Light>(); l.type = LightType.Point; l.range = range; l.intensity = street ? 0 : 1.5f; l.color = new Color(1, .79f, .5f); l.shadows = LightShadows.None; lamps.Add(l); return l;
    }

    static void Streets()
    {
        Box("Landscape", new(0, -.3f, 10), new(1200, .4f, 1200), Mat("Meadow", "7A8864"));
        Box("Restaurant terrace paving", new(-25.5f, .18f, 1), new(6.4f, .36f, 18), pavement);
        Box("Asphalt boulevard", new(0, -.02f, -19.6f), new(160, .18f, 9), asphalt);
        Box("Shops pavement", new(0, .15f, -10.8f), new(115, .3f, 8.2f), pavement);
        Box("Far pavement", new(0, .12f, -26), new(160, .3f, 3.7f), pavement);
        Box("Rear street", new(0, 0, 18), new(140, .15f, 7), asphalt);
        Box("Rear footway", new(0, .13f, 22.5f), new(140, .27f, 2), pavement);
        for (int i = -28; i <= 28; i++)
        {
            Box("Granite kerb", new(i * 2, .22f, -14.8f), new(1.97f, .32f, .32f), ivory);
            Box("Centre lane dash", new(i * 3.1f, .086f, -19.7f), new(1.6f, .012f, .12f), white);
        }
        for (int side = -1; side <= 1; side += 2)
        {
            for (int i = 0; i < 9; i++) Box("Zebra crossing", new(side * 30, .09f, -23.6f + i), new(3.3f, .012f, .42f), white);
            for (int i = 0; i < 4; i++) Cyl("Pavement bollard", new(side * 27 + i * 1.25f, .72f, -14.2f), .07f, .9f, black);
        }
        foreach (float x in new[] { -40f, -26f, -2f, 28f, 42f })
        {
            Box("Tree planting bed", new(x, .31f, -11.7f), new(2.5f, .08f, 2.4f), soil);
            Tree(x, -11.7f, x == -2 ? "aspen" : "oak", 1.05f);
            Cyl("Street lantern post", new(x + 2, 2.8f, -14.1f), .065f, 5.2f, black);
            Rod("Lamp arm", new(x + 2, 5.4f, -14.1f), new(x + 2, 5.4f, -15.1f), .06f, black);
            Box("Street lamp housing", new(x + 2, 5.32f, -15.1f), new(.48f, .12f, .7f), black);
            Box("Street lamp diffuser", new(x + 2, 5.24f, -15.1f), new(.4f, .04f, .6f), lightMat);
            Lamp("Street illumination", new(x + 2, 5, -15.1f), 12, true);
        }
        for (int i = 0; i < 4; i++) { var car = Vehicle(i % 2 == 0 ? "sedan" : "hatchback", new(0, 0, 0), i % 2 == 0 ? "284B43" : "B8A58A"); car.SetParent(null); traffic.Add(car); }
        Vehicle("suv", new(-37, .32f, -11.5f), "344858").rotation = Quaternion.Euler(0, 90, 0);
        Vehicle("sedan", new(37, .32f, -11.5f), "912F26").rotation = Quaternion.Euler(0, 90, 0);
        Bench(-29, -12.4f); Bench(29, -12.4f);
    }

    static GameObject Storefront(float x, float width, string name, string subtitle, bool restaurant)
    {
        Box(name + " foundation", new(x, .23f, 1), new(width + .6f, .45f, 18.4f), pavement);
        Box(name + " floor", new(x, .38f, 1), new(width, .12f, 18), restaurant ? wood : tile);
        Box("Masonry back wall", new(x, 2.6f, 10), new(width, 4.4f, .38f), brick);
        foreach (int side in new[] { -1, 1 })
        {
            Box("Masonry side wall", new(x + side * width / 2, 2.6f, 1), new(.38f, 4.4f, 18), brick);
            Box("Stone skirting", new(x + side * width / 2, .64f, 1), new(.45f, .45f, 18), ivory);
            Planter(x + side * (width / 2 - .8f), -9.1f);
        }
        var cutaway = Group(name + " facade and removable roof"); var before = parent; parent = cutaway;
        float bay = width / 5;
        for (int i = 0; i < 5; i++)
        {
            float bx = x - width / 2 + (i + .5f) * bay;
            Box("Shopfront glass", new(bx, 2.18f, -8.04f), new(bay - .21f, 3.4f, .045f), glass);
            Box("Window sill", new(bx, .55f, -8.14f), new(bay, .22f, .38f), restaurant ? forest : black);
            Box("Transom rail", new(bx, 3.25f, -8.1f), new(bay, .075f, .12f), restaurant ? forest : black);
            Box("Glazing stile", new(bx - bay / 2, 2.25f, -8.12f), new(.13f, 3.65f, .17f), restaurant ? forest : black);
        }
        for (int side = -1; side <= 1; side += 2)
        {
            Box("Entrance door stile", new(x + side * .68f, 1.9f, -8.16f), new(.075f, 2.95f, .1f), brass);
            Rod("Brass pull handle", new(x + side * .16f, 1.35f, -8.27f), new(x + side * .16f, 2, -8.27f), .023f, brass);
            Box("Corner stone pier", new(x + side * width / 2, 2.65f, -8.17f), new(.5f, 4.6f, .6f), ivory);
        }
        Box("Entrance mat", new(x, .457f, -8.6f), new(2.6f, .025f, 1.1f), black);
        Box("Brand fascia", new(x, 4.35f, -8.16f), new(width + .2f, .95f, .4f), restaurant ? forest : black);
        Box("Brass fascia edge", new(x, 4.85f, -8.35f), new(width + .4f, .065f, .1f), brass);
        Text(name, new(x, 4.45f, -8.39f), restaurant ? .95f : .85f, white);
        Text(subtitle, new(x, 4.02f, -8.4f), .22f, brass);
        for (int bayIndex = -1; bayIndex <= 1; bayIndex++)
        {
            float ax = x + bayIndex * width * .32f;
            var awning = Box("Canvas awning", new(ax, 3.65f, -9.1f), new(width * .28f, .1f, 1.65f), restaurant ? forest : fabric); awning.transform.localRotation = Quaternion.Euler(-10, 0, 0);
            Box("Awning valance", new(ax, 3.46f, -9.9f), new(width * .28f, .27f, .08f), restaurant ? forest : fabric);
            for (int rib = -2; rib <= 2; rib++) Rod("Awning support", new(ax + rib * .6f, 3.9f, -8.3f), new(ax + rib * .6f, 3.5f, -9.9f), .018f, brass);
        }
        Box("Insulated roof", new(x, 4.97f, 1), new(width + .3f, .25f, 18.5f), Mat("Roof gravel", "777E77"));
        foreach (int side in new[] { -1, 1 }) Box("Parapet edge", new(x + side * width / 2, 5.22f, 1), new(.2f, .5f, 18.4f), ivory);
        Box("Front coping", new(x, 5.18f, -8.2f), new(width + .5f, .28f, .6f), ivory);
        if (restaurant)
        {
            Box("Upper brick facade", new(x, 6.5f, 1), new(width, 2.7f, 17.8f), brick);
            for (int i = 0; i < 5; i++)
            {
                float wx = x - width / 2 + 1.7f + i * 3.4f;
                Box("Upper window architrave", new(wx, 6.45f, -7.99f), new(2.05f, 1.9f, .16f), ivory);
                Box("Upper window dark reveal", new(wx, 6.45f, -8.1f), new(1.74f, 1.63f, .08f), Mat("Deep window", "243A3D", .65f));
                Box("Upper window mullion", new(wx, 6.45f, -8.19f), new(.06f, 1.64f, .08f), ivory);
                Box("Upper window crossbar", new(wx, 6.56f, -8.19f), new(1.75f, .065f, .08f), ivory);
                Box("Window ledge", new(wx, 5.47f, -8.2f), new(2.2f, .13f, .48f), ivory);
            }
            Box("Layered cornice", new(x, 7.93f, 1), new(width + .6f, .22f, 18.5f), ivory);
            Box("Upper roof edge", new(x, 8.12f, 1), new(width + .8f, .2f, 18.7f), black);
        }
        else
        {
            for (int i = -1; i <= 1; i++)
            {
                Box("Rooflight frame", new(x + i * 6, 5.28f, 1), new(4.6f, .32f, 8), black);
                Box("Blue rooflight", new(x + i * 6, 5.46f, 1), new(4.4f, .05f, 7.8f), Mat("Skylight", "6A8C8D", .8f, .2f));
                for (int pane = -2; pane <= 2; pane++) Box("Rooflight rib", new(x + i * 6, 5.5f, 1 + pane * 1.45f), new(4.5f, .045f, .065f), steel);
            }
            for (int ac = -1; ac <= 1; ac += 2)
            {
                Box("HVAC cabinet", new(x + ac * 7, 5.6f, 8), new(2.3f, 1.2f, 1.4f), steel);
                for (int vent = 0; vent < 8; vent++) Box("HVAC louvre", new(x + ac * 7, 5.2f + vent * .1f, 7.28f), new(2.1f, .035f, .04f), black);
            }
        }
        parent = before;
        return cutaway.gameObject;
    }

    static void Restaurant()
    {
        // Banquettes and paired chairs leave a broad central service aisle.
        foreach (int side in new[] { -1, 1 }) for (int row = 0; row < 3; row++)
        {
            float x = -13 + side * 4.8f, z = -4.7f + row * 3.5f;
            var diningParent = parent; parent = Group("Dining set");
            Box("Oak table top", new(x, 1.2f, z), new(1.55f, .095f, 1.35f), wood);
            Cyl("Brass table stem", new(x, .8f, z), .065f, .73f, brass); Cyl("Table foot", new(x, .47f, z), .42f, .06f, black);
            Chair(x, z - 1, 0); Chair(x, z + 1, 180);
            for (int place = -1; place <= 1; place += 2)
            {
                Cyl("Dinner plate", new(x, 1.26f, z + place * .39f), .21f, .025f, white);
                Cyl("Side plate", new(x + .49f, 1.26f, z + place * .35f), .105f, .018f, white);
                Cyl("Water glass", new(x - .43f, 1.37f, z + place * .35f), .07f, .22f, glass);
                Box("Linen napkin", new(x - .32f, 1.265f, z + place * .36f), new(.1f, .012f, .28f), fabric);
                Rod("Cutlery", new(x + .29f, 1.28f, z + place * .23f), new(x + .29f, 1.28f, z + place * .48f), .012f, steel);
            }
            Cyl("Bud vase", new(x, 1.36f, z), .065f, .2f, brass);
            Rod("Flower stem", new(x, 1.46f, z), new(x + .02f, 1.66f, z), .009f, leaf);
            Shape("Flower", PrimitiveType.Sphere, new(x + .02f, 1.67f, z), new(.14f, .12f, .14f), Mat("Rust flowers", "BA6D43"));
            Pendant(x, z);
            parent = diningParent;
        }
        foreach (int side in new[] { -1, 1 })
        {
            float bx = -13 + side * 7.35f;
            Box("Upholstered banquette base", new(bx, .67f, -1), new(1.15f, .48f, 10.5f), wood);
            Box("Leather banquette seat", new(bx, .94f, -1), new(1.13f, .12f, 10.4f), leather);
            Box("Channel tufted banquette back", new(bx + side * .43f, 1.43f, -1), new(.18f, 1.05f, 10.4f), leather);
            for (int rib = 0; rib < 32; rib++) Box("Upholstery seam", new(bx + side * .32f, 1.43f, -6 + rib * .32f), new(.02f, .98f, .015f), Mat("Leather seam", "71472F"));
        }
        Box("Kitchen pass oak front", new(-13, 1, 6.1f), new(12.9f, 1.1f, 1.15f), wood);
        Box("Kitchen marble counter", new(-13, 1.6f, 6.1f), new(13.2f, .14f, 1.35f), ivory);
        for (int i = 0; i < 38; i++) Box("Counter fluting", new(-19.25f + i * .335f, 1, 5.5f), new(.08f, 1.08f, .06f), brass);
        Box("Kitchen tiled splashback", new(-13, 1.9f, 9.73f), new(15.3f, 2.9f, .12f), sage);
        for (int row = 0; row < 7; row++) Box("Tile grout", new(-13, .55f + row * .4f, 9.64f), new(15.2f, .018f, .01f), ivory);
        Box("Kitchen rear prep counter", new(-13, .96f, 8.95f), new(14.5f, 1.05f, 1.15f), steel);
        Box("Kitchen worktop", new(-13, 1.52f, 8.95f), new(14.7f, .075f, 1.2f), steel);
        for (int burner = 0; burner < 4; burner++) { float x = -15.5f + burner * .7f; Cyl("Hob ring", new(x, 1.57f, 8.85f), .22f, .025f, black); Cyl("Saucepan", new(x, 1.72f, 8.85f), .18f, .27f, steel); }
        Box("Extractor hood", new(-14.3f, 3.35f, 8.9f), new(4.9f, .45f, 1.65f), steel);
        Box("Extractor chimney", new(-14.3f, 3.95f, 9.25f), new(1.5f, .8f, .65f), steel);
        for (int shelf = 0; shelf < 2; shelf++)
        {
            Box("Open kitchen shelving", new(-7.4f, 2.2f + shelf * .65f, 9.35f), new(3.5f, .08f, .6f), wood);
            for (int jar = 0; jar < 9; jar++) { float x = -8.9f + jar * .37f; Cyl("Pantry jar", new(x, 2.43f + shelf * .65f, 9.3f), .12f, .37f, jar % 2 == 0 ? fabric : white); Cyl("Jar lid", new(x, 2.64f + shelf * .65f, 9.3f), .13f, .035f, brass); }
        }
        Box("Espresso machine", new(-8, 1.93f, 6), new(1.65f, .57f, .62f), forest);
        Box("Espresso chrome top", new(-8, 2.24f, 6), new(1.7f, .04f, .65f), steel);
        for (int cup = 0; cup < 5; cup++) Cyl("Coffee cup", new(-8.6f + cup * .28f, 2.32f, 6), .075f, .13f, white);
        Box("Cafe chalkboard", new(-19.8f, 2.8f, 9.55f), new(1.25f, 1.9f, .12f), black);
        Text("JUNIPER\n\nSEASONAL\nKITCHEN\n\nCoffee  /  Bakery", new(-19.8f, 2.8f, 9.47f), .23f, ivory);
        for (int i = 0; i < 3; i++)
        {
            float x = -17 + i * 4;
            Box("Framed botanical artwork", new(x, 3.35f, 4.8f), new(1.2f, 1.45f, .08f), wood);
            Box("Art paper", new(x, 3.35f, 4.73f), new(1.06f, 1.3f, .01f), fabric);
            // Simple botanical reliefs catch light rather than using a blank placeholder picture.
            Rod("Botanical stem", new(x, 2.85f, 4.7f), new(x, 3.83f, 4.7f), .015f, leaf);
            for (int l = 0; l < 5; l++) Shape("Botanical leaf", PrimitiveType.Sphere, new(x + (l % 2 == 0 ? .14f : -.14f), 3 + l * .16f, 4.69f), new(.32f, .15f, .025f), leaf);
        }
        MenuBoard(-13, -10.2f, "JUNIPER\n\nGood food.\nGood company.\n\nOPEN DAILY");
        // A small sidewalk terrace beside the restaurant.
        for (int i = 0; i < 3; i++)
        {
            float z = -4 + i * 3;
            Cyl("Terrace cafe table", new(-25.3f, 1.07f, z), .65f, .08f, wood); Cyl("Terrace pedestal", new(-25.3f, .72f, z), .05f, .67f, black);
            Chair(-25.3f, z - .9f, 0); Chair(-25.3f, z + .9f, 180);
        }
        for (int i = 0; i < 5; i++) Planter(-28.4f, -5 + i * 2.2f);
    }

    static void Chair(float x, float z, float angle)
    {
        var before = parent; var root = Group("Bentwood dining chair"); root.localPosition = new(x, .44f, z); root.localRotation = Quaternion.Euler(0, angle, 0); parent = root;
        Cyl("Padded seat", new(0, .46f, 0), .3f, .085f, leather);
        foreach (int side in new[] { -1, 1 }) foreach (int end in new[] { -1, 1 }) Rod("Tapered chair leg", new(side * .25f, 0, end * .25f), new(side * .21f, .45f, end * .21f), .027f, wood);
        for (int i = 0; i < 11; i++)
        {
            float a = Mathf.Lerp(22, 158, i / 10f) * Mathf.Deg2Rad;
            var p = new Vector3(Mathf.Cos(a) * .29f, .9f, -Mathf.Sin(a) * .29f);
            Shape("Curved chair back", PrimitiveType.Sphere, p, new(.12f, .23f, .09f), leather);
        }
        Rod("Back support", new(-.22f, .42f, -.22f), new(-.22f, .9f, -.2f), .025f, wood); Rod("Back support", new(.22f, .42f, -.22f), new(.22f, .9f, -.2f), .025f, wood);
        parent = before;
    }
    static void Pendant(float x, float z)
    {
        Rod("Pendant cable", new(x, 4.55f, z), new(x, 3.35f, z), .012f, black);
        Shape("Opal pendant globe", PrimitiveType.Sphere, new(x, 3.28f, z), new(.45f, .43f, .45f), lightMat);
        Cyl("Pendant brass cap", new(x, 3.46f, z), .13f, .08f, brass); Lamp("Warm dining light", new(x, 3.15f, z), 4.5f);
    }

    static void Supermarket()
    {
        // Three fully stocked double-sided aisles, with 2m circulation gaps.
        for (int aisle = 0; aisle < 3; aisle++)
        {
            float x = 4.7f + aisle * 6.1f;
            Box("Gondola plinth", new(x, .56f, 2.2f), new(1.8f, .24f, 9), forest);
            Box("Gondola back", new(x, 1.45f, 2.2f), new(.12f, 1.8f, 9), ivory);
            foreach (int side in new[] { -1, 1 }) for (int level = 0; level < 4; level++)
            {
                float y = .71f + level * .43f;
                Box("Retail shelf", new(x + side * .47f, y, 2.2f), new(.9f, .055f, 8.9f), white);
                Box("Shelf ticket strip", new(x + side * .91f, y - .04f, 2.2f), new(.04f, .13f, 8.9f), forest);
                for (int item = 0; item < 21; item++)
                {
                    float z = -2 + item * .41f;
                    int kind = (aisle * 4 + item / 3 + level) % 7;
                    Product(new(x + side * .55f, y + .03f, z), kind, level + item);
                    if (item % 3 != 0) Product(new(x + side * .23f, y + .03f, z), kind, level + item);
                    if (item % 4 == 0) Box("Price label", new(x + side * .938f, y - .04f, z), new(.006f, .06f, .21f), white);
                }
            }
            Box("Aisle end header", new(x, 2.72f, -2.43f), new(2.4f, .43f, .1f), forest);
            Text(aisle == 0 ? "PANTRY & BAKERY" : aisle == 1 ? "HOME & EVERYDAY" : "DRINKS & SNACKS", new(x, 2.72f, -2.5f), .24f, white);
            Rod("Aisle header upright", new(x, 2.1f, -2.4f), new(x, 2.5f, -2.4f), .025f, steel);
        }
        for (int unit = 0; unit < 7; unit++)
        {
            float x = 3.5f + unit * 2.8f;
            Box("Refrigerated cabinet", new(x, 1.73f, 8.75f), new(2.65f, 2.6f, 1.4f), forest);
            Box("Chiller white lining", new(x, 1.8f, 8.04f), new(2.43f, 2.3f, .04f), ivory);
            for (int level = 0; level < 4; level++)
            {
                float y = .7f + level * .52f;
                Box("Chiller shelf", new(x, y, 7.85f), new(2.42f, .045f, .65f), white);
                for (int item = 0; item < 7; item++) Product(new(x - 1 + item * .32f, y + .03f, 7.72f), (unit + level) % 7, item);
            }
            Box("Refrigerator light strip", new(x - 1.2f, 1.8f, 7.63f), new(.035f, 2.2f, .03f), lightMat);
            Box("Chiller glazing", new(x, 1.75f, 7.5f), new(2.44f, 2.2f, .02f), glass);
            Rod("Refrigerator handle", new(x + 1.02f, 1.2f, 7.4f), new(x + 1.02f, 2.15f, 7.4f), .025f, steel);
        }
        Box("Chilled department sign", new(12, 3.55f, 9.65f), new(18, .6f, .12f), forest);
        Text("D A I R Y     •     M E A T     •     F I S H     •     F R E S H", new(12, 3.55f, 9.56f), .37f, white);
        for (int bin = 0; bin < 4; bin++)
        {
            float x = 14.3f + bin * 2.05f, z = -5.5f;
            Box("Timber produce stand", new(x, .95f, z), new(1.8f, 1, 2.1f), wood);
            Box("Dark produce crate", new(x, 1.48f, z), new(1.65f, .12f, 1.95f), soil);
            var produce = Mat("Produce " + bin, new[] { "AC3124", "D3AE32", "557C31", "D4772D" }[bin], .38f);
            for (int row = 0; row < 6; row++) for (int col = 0; col < 5; col++)
            {
                var fruit = Shape("Fresh produce", PrimitiveType.Sphere, new(x - .63f + col * .31f, 1.62f + Mathf.Sin(row + col) * .025f, z - .78f + row * .31f), new(.27f, bin == 2 ? .4f : .26f, .27f), produce);
                if (bin == 2) fruit.transform.localRotation = Quaternion.Euler(0, 0, 25);
            }
            Box("Produce price card", new(x, 1.05f, z - 1.07f), new(.9f, .3f, .03f), forest);
            Text(new[] { "APPLES", "LEMONS", "PEARS", "ORANGES" }[bin], new(x, 1.05f, z - 1.1f), .17f, white);
        }
        for (int checkout = 0; checkout < 2; checkout++)
        {
            float x = 3.5f + checkout * 4;
            Box("Checkout base", new(x, .91f, -5.35f), new(2.4f, .95f, 2.8f), forest);
            Box("Checkout worktop", new(x, 1.43f, -5.35f), new(2.5f, .12f, 2.9f), steel);
            Box("Conveyor belt", new(x - .45f, 1.5f, -5.35f), new(.9f, .035f, 2.6f), black);
            for (int seam = 0; seam < 10; seam++) Box("Belt seam", new(x - .45f, 1.52f, -6.5f + seam * .25f), new(.88f, .008f, .012f), Mat("Belt rubber", "4C5050"));
            Box("POS screen body", new(x + .64f, 1.86f, -4.8f), new(.65f, .44f, .07f), black);
            Box("POS lit screen", new(x + .64f, 1.86f, -4.85f), new(.55f, .35f, .018f), Mat("POS screen", "69A89C"));
            Cyl("Screen support", new(x + .64f, 1.65f, -4.8f), .04f, .3f, black);
            Rod("Checkout number pole", new(x + .9f, .45f, -3.9f), new(x + .9f, 3.3f, -3.9f), .03f, steel);
            Box("Checkout number", new(x + .9f, 3.12f, -3.9f), new(.6f, .55f, .08f), forest);
            Text((checkout + 1).ToString(), new(x + .9f, 3.12f, -3.96f), .35f, white);
        }
        for (int x = 0; x < 4; x++) for (int z = 0; z < 2; z++)
        {
            Box("Suspended linear light", new(3 + x * 6, 4, -3 + z * 8), new(3.3f, .09f, .19f), steel);
            Box("Linear diffuser", new(3 + x * 6, 3.94f, -3 + z * 8), new(3.15f, .025f, .15f), lightMat);
            Lamp("Market aisle lighting", new(3 + x * 6, 3.85f, -3 + z * 8), 6);
        }
        MenuBoard(20.5f, -10.5f, "MARKET & CO.\n\nFRESH TODAY\n\nLocal produce\nEveryday essentials");
    }

    static void Product(Vector3 p, int kind, int variation)
    {
        var previousParent = parent; parent = Group("Stock product");
        var mat = Mat("Package " + kind, new[] { "D6B259", "64868A", "B85B42", "D5C7A6", "4D6B45", "886F8C", "CB8741" }[kind], .3f);
        float h = .26f + variation % 3 * .035f;
        if (kind == 1 || kind == 4)
        {
            Cyl("Bottle", p + Vector3.up * h / 2, .078f, h, mat);
            Cyl("Bottle cap", p + Vector3.up * (h + .02f), .052f, .04f, kind == 1 ? white : forest);
        }
        else
        {
            Box("Packaged groceries", p + Vector3.up * h / 2, new(.2f, h, .23f), mat);
            Box("Printed package label", p + new Vector3(0, h * .53f, -.118f), new(.145f, h * .43f, .003f), white);
            Box("Label graphic", p + new Vector3(0, h * .6f, -.121f), new(.1f, h * .11f, .002f), mat);
        }
        parent = previousParent;
    }

    static void Planter(float x, float z)
    {
        Box("Terracotta planter", new(x, .75f, z), new(.9f, .8f, .9f), Mat("Terracotta pottery", "A97552", .16f));
        Box("Planter rim", new(x, 1.15f, z), new(.97f, .08f, .97f), ivory);
        Box("Planter soil", new(x, 1.19f, z), new(.8f, .035f, .8f), soil);
        for (int i = 0; i < 9; i++)
        {
            float a = i * 2.4f; var top = new Vector3(x + Mathf.Cos(a) * .34f, 1.65f + (i % 3) * .12f, z + Mathf.Sin(a) * .34f);
            Rod("Plant stem", new(x, 1.2f, z), top, .012f, leaf);
            Shape("Planter leaf", PrimitiveType.Sphere, top, new(.38f, .15f, .19f), leaf).transform.localRotation = Quaternion.Euler(0, i * 38, 20);
        }
    }
    static void Bench(float x, float z)
    {
        for (int i = 0; i < 5; i++) Box("Bench seat slat", new(x, .86f, z + i * .13f), new(2.5f, .07f, .1f), wood);
        for (int i = 0; i < 4; i++) Box("Bench back slat", new(x, 1.1f + i * .13f, z + .62f), new(2.5f, .09f, .07f), wood);
        foreach (int side in new[] { -1, 1 }) Rod("Bench support", new(x + side * 1, .3f, z + .3f), new(x + side * 1, 1.5f, z + .6f), .045f, black);
    }
    static void MenuBoard(float x, float z, string message)
    {
        var board = Box("A-frame menu", new(x, 1.08f, z), new(1.05f, 1.38f, .12f), wood); board.transform.localRotation = Quaternion.Euler(-8, 0, 0);
        Box("Chalkboard inset", new(x, 1.08f, z - .08f), new(.9f, 1.19f, .025f), forest);
        Text(message, new(x, 1.08f, z - .11f), .17f, ivory);
        foreach (int side in new[] { -1, 1 }) Rod("Menu board rear leg", new(x + side * .44f, 1.65f, z), new(x + side * .44f, .3f, z + .6f), .035f, wood);
    }
    static Transform Find(GameObject root, string name) => root.GetComponentsInChildren<Transform>(true).First(t => t.name == name);
    static Transform Vehicle(string style, Vector3 p, string color)
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "vehicles.glb");
        if (!prefab) throw new InvalidOperationException("Detailed vehicle import has not finished.");
        var car = Object.Instantiate(Find(prefab, style), world); car.name = style + " detailed vehicle"; car.localPosition = p;
        foreach (var r in car.GetComponentsInChildren<Renderer>())
        {
            if (r.sharedMaterial.name.Contains("paint")) r.sharedMaterial = Mat("Car paint " + color, color, .8f, .35f);
        }
        return car;
    }
    static void Tree(float x, float z, string species, float scale)
    {
        var source = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "trees.glb");
        if (!source) throw new InvalidOperationException("Detailed tree import has not finished.");
        var root = new GameObject(species + " street tree").transform; root.SetParent(nature, false); root.localPosition = new(x, .3f, z); root.localScale = Vector3.one * scale;
        var lod = root.gameObject.AddComponent<LODGroup>(); var levels = new LOD[2];
        for (int level = 0; level < 2; level++)
        {
            var model = Object.Instantiate(Find(source, species + "_lod" + level), root); model.localPosition = Vector3.zero;
            var renderers = model.GetComponentsInChildren<Renderer>(); foreach (var r in renderers) { r.shadowCastingMode = ShadowCastingMode.TwoSided; r.sharedMaterial.enableInstancing = true; }
            levels[level] = new LOD(level == 0 ? .16f : .025f, renderers); crowns.Add(model);
        }
        lod.SetLODs(levels); lod.RecalculateBounds();
    }
    static void Surroundings()
    {
        var source = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "house.glb");
        if (!source) throw new InvalidOperationException("Detailed house import has not finished.");
        for (int i = 0; i < 7; i++)
        {
            float x = -45 + i * 15;
            var root = Group("Cedar residence " + (i + 1)); root.localPosition = new(x, .25f, 31); root.localRotation = Quaternion.Euler(0, 180, 0);
            var model = Object.Instantiate(source, root); model.name = "Original residential kit";
            var kit = model.transform;
            foreach (Transform section in kit)
            {
                if (section.name.StartsWith("level.")) section.localPosition += Vector3.up * 2.9f;
                if (section.name.StartsWith("roof.")) section.localPosition += Vector3.up * 5.8f;
            }
            foreach (var section in model.GetComponentsInChildren<Transform>()) if (section.name.StartsWith("inside.")) section.gameObject.SetActive(false);
            Box("Garden lawn", new(x, .11f, 28), new(12.5f, .2f, 13), Mat("Garden lawn", "71815C"));
            Box("House path", new(x, .24f, 24), new(1.5f, .1f, 4.5f), pavement);
            for (int picket = 0; picket < 15; picket++) Box("Garden picket", new(x - 6 + picket * .34f, .67f, 23.8f), new(.07f, .83f, .08f), ivory);
            Box("Fence rail", new(x - 3.6f, .65f, 23.8f), new(5.1f, .09f, .06f), ivory);
            Tree(x + 5.5f, 26, i % 2 == 0 ? "aspen" : "ash", .8f);
        }
        for (int side = -1; side <= 1; side += 2) for (int i = 0; i < 3; i++) Tree(side * (35 + i * 9), 7, i % 2 == 0 ? "oak" : "ash", 1.2f);
    }
    static void Person(string id, Vector3 p, float yaw = 0, bool seated = false, Vector3? end = null, bool work = false)
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Art + "People/" + id + ".glb"); if (!prefab) return;
        var root = new GameObject(id + (seated ? " dining" : " visiting")).transform; root.position = p;
        var model = Object.Instantiate(prefab, root).transform; model.localPosition = Vector3.zero;
        var renderers = model.GetComponentsInChildren<Renderer>(); var bounds = renderers[0].bounds; foreach (var r in renderers) bounds.Encapsulate(r.bounds);
        float scale = 1.76f / bounds.size.y; model.localScale *= scale; model.localPosition = Vector3.up * -(bounds.min.y - p.y) * scale;
        root.rotation = Quaternion.Euler(0, yaw, 0);
        var actor = root.gameObject.AddComponent<PrototypePerson>(); actor.model = model; actor.seated = seated; actor.working = work; actor.routeA = p; actor.routeB = end ?? p; actor.phase = p.x * .31f;
    }
    static void People()
    {
        Person("alice", new(-17.8f, .44f, -5.7f), 0, true);
        Person("ben", new(-17.8f, .44f, -3.7f), 180, true);
        Person("emma", new(-8.2f, .44f, 3.3f), 180, true);
        Person("daniel", new(-13, .44f, -5.5f), 0, false, new Vector3(-13, .44f, 4.7f));
        Person("emma", new(-12, .44f, 7.6f), 180, false, null, true);
        Person("ben", new(8.1f, .44f, -.9f), 0, false, new Vector3(8.1f, .44f, 6.4f));
        Person("alice", new(14.1f, .44f, 5.9f), 180, false, new Vector3(14.1f, .44f, -.8f));
        Person("daniel", new(4.6f, .44f, -3.3f), 180, false, null, true);
        Person("emma", new(-22, .31f, -12.4f), 90, false, new Vector3(-5, .31f, -12.4f));
        Person("ben", new(5, .31f, -13.3f), 90, false, new Vector3(23, .31f, -13.3f));
    }
}
