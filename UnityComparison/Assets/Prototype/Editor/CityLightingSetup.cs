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

public static class CityLightingSetup
{
    const string Folder = "Assets/Prototype/Migration/StableLights";

    // These three original materials have flat colours and emission, with no
    // texture packing to translate. Their glTF emissive shader produces extreme
    // pixels in WebGL; use the same URP material path as the working shop lights.
    public static string Configure()
    {
        if (EditorApplication.isPlaying) throw new InvalidOperationException("Stop Play mode before preparing city lighting.");
        Directory.CreateDirectory(Folder);
        AssetDatabase.Refresh();
        var replacements = new Dictionary<Material, Material>();
        foreach (string model in new[] { "house", "vehicles" })
        foreach (var source in AssetDatabase.LoadAllAssetsAtPath("Assets/Prototype/Art/" + model + ".glb").OfType<Material>())
        {
            if (source.name is not ("window_lit" or "headlights" or "taillights")) continue;
            string path = Folder + "/" + source.name + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (!material)
            {
                material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
                AssetDatabase.CreateAsset(material, path);
            }
            material.name = "Stable " + source.name;
            material.color = source.GetColor("baseColorFactor");
            material.SetFloat("_Smoothness", 1 - Mathf.Clamp(source.GetFloat("roughnessFactor"), .22f, 1));
            material.SetFloat("_Metallic", source.GetFloat("metallicFactor"));
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", source.GetColor("emissiveFactor"));
            material.enableInstancing = true;
            EditorUtility.SetDirty(material);
            replacements[source] = material;
        }
        int count = 0;
        foreach (string guid in AssetDatabase.FindAssets("t:Prefab", new[] { "Assets/Prototype/Migration", "Assets/Prototype/SharedCity" }))
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            var asset = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (!asset.GetComponentsInChildren<Renderer>(true).Any(r => r.sharedMaterials.Any(m => m && replacements.ContainsKey(m)))) continue;
            var root = PrefabUtility.LoadPrefabContents(path);
            try
            {
                foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
                {
                    var materials = renderer.sharedMaterials;
                    bool changed = false;
                    for (int i = 0; i < materials.Length; i++)
                        if (materials[i] && replacements.TryGetValue(materials[i], out var replacement))
                        {
                            materials[i] = replacement;
                            changed = true;
                            count++;
                        }
                    if (changed) renderer.sharedMaterials = materials;
                }
                PrefabUtility.SaveAsPrefabAsset(root, path);
            }
            finally { PrefabUtility.UnloadPrefabContents(root); }
        }
        EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");
        var bridge = Object.FindFirstObjectByType<BusinessGameBridge>();
        var camera = bridge.viewCamera.GetComponent<UniversalAdditionalCameraData>();
        camera.stopNaN = true;
        EditorUtility.SetDirty(camera);
        var profile = bridge.lighting.grading.sharedProfile;
        if (profile.TryGet<Bloom>(out var bloom))
        {
            // Preserve normal glints, but never spread a broken HDR pixel over
            // entire city blocks. The old default allowed values up to 65472.
            bloom.clamp.Override(6);
            EditorUtility.SetDirty(bloom);
        }
        EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
        AssetDatabase.SaveAssets();
        return $"Prepared city lighting: {count} window/vehicle material slots replaced; bounded bloom and invalid-pixel protection enabled.";
    }
}
