using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GLTFast;
using UnityEngine;

[Serializable] public class BusinessPerson { public string id; public float height; }

// The same 100 covered-outfit characters used by the original browser game.
// Load only the people currently needed, with shared assets and a bounded idle cache.
public sealed class BusinessCast : MonoBehaviour
{
    sealed class Entry { public Task<GltfImport> task; public int users; public float used; }
    static readonly Dictionary<string, Entry> cache = new();
    static readonly SemaphoreSlim downloads = new(2);
    Entry entry; bool released, loading; public string identity;
    public async void LoadPerson(BusinessPerson person, PrototypePerson pose)
    {
        if (person == null || string.IsNullOrEmpty(person.id) || identity != null) return;
        if (!System.Text.RegularExpressions.Regex.IsMatch(person.id, "^[a-z0-9-]{1,40}$")) return;
        identity = person.id; loading = true;
        if (!cache.TryGetValue(identity, out entry)) { entry = new Entry(); cache[identity] = entry; entry.task = Fetch(identity); }
        entry.users++; entry.used = Time.realtimeSinceStartup;
        try
        {
            var source = await entry.task;
            if (!this || released || source == null) return;
            var root = new GameObject("Cast " + identity).transform; root.SetParent(transform, false);
            if (!await source.InstantiateMainSceneAsync(root)) { Destroy(root.gameObject); return; }
            if (!this || !pose) { if (root) Destroy(root.gameObject); return; }
            var renderers = root.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0) { Destroy(root.gameObject); return; }
            // Mobile's default two-bone skinning deforms fitted clothing differently
            // from the body underneath. Match the four glTF influences on every platform.
            foreach(var skin in root.GetComponentsInChildren<SkinnedMeshRenderer>())
                skin.quality=SkinQuality.Bone4;
            var bounds = renderers[0].bounds; foreach (var r in renderers) bounds.Encapsulate(r.bounds);
            float scale = Mathf.Clamp(person.height, .7f, 2.1f) / Mathf.Max(.1f, bounds.size.y);
            root.localScale = Vector3.one * scale;
            root.localPosition = new(0, -(bounds.min.y - transform.position.y) * scale, 0);
            var old = pose.model; pose.SetModel(root); if (old) Destroy(old.gameObject);
        }
        catch (Exception error) { Debug.LogWarning("Character remains on fallback: " + identity + ". " + error.Message); }
        finally { loading=false;if(released)Release();Trim(); }
    }
    static async Task<GltfImport> Fetch(string id)
    {
        await downloads.WaitAsync(); var source = new GltfImport();
        try
        {
            string origin = string.IsNullOrEmpty(Application.absoluteURL) ? "http://127.0.0.1:4189/" : Application.absoluteURL;
            var url = new Uri(new Uri(origin), "/models/unity-cast/" + id + ".glb?v=wardrobe-v3");
            if (await source.Load(url)) return source;
            source.Dispose(); return null;
        }
        catch { source.Dispose(); return null; }
        finally { downloads.Release(); }
    }
    static void Trim()
    {
        var idle = cache.Where(pair => pair.Value.users == 0 && pair.Value.task.IsCompleted).OrderByDescending(pair => pair.Value.used).Skip(8).ToArray();
        foreach (var pair in idle) { if (pair.Value.task.Status == TaskStatus.RanToCompletion) pair.Value.task.Result?.Dispose(); cache.Remove(pair.Key); }
    }
    void Release(){if(entry==null)return;entry.users=Math.Max(0,entry.users-1);entry.used=Time.realtimeSinceStartup;entry=null;Trim();}
    void OnDestroy() { released = true; if (!loading) Release(); }
}
