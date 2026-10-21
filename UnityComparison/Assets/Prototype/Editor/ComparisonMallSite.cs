using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

// Four civic plots form a single urban mall block. No market parcel or saved
// business is removed. The original React and original Unity cities are untouched.
public static class ComparisonMallSite
{
    const string Folder="Assets/ComparisonPrepared/MallSite";
    struct Vertex {
        public Vector3 p,n;public Vector2 uv;public Color colour;
        public static Vertex Lerp(Vertex a,Vertex b,float t)=>new(){p=Vector3.LerpUnclamped(a.p,b.p,t),n=Vector3.LerpUnclamped(a.n,b.n,t),uv=Vector2.LerpUnclamped(a.uv,b.uv,t),colour=Color.LerpUnclamped(a.colour,b.colour,t)};
    }
    static List<Vertex> Clip(List<Vertex> polygon,int axis,float line,bool greater){
        var output=new List<Vertex>();if(polygon.Count==0)return output;
        var a=polygon[^1];float da=(a.p[axis]-line)*(greater?1:-1);
        foreach(var b in polygon){
            float db=(b.p[axis]-line)*(greater?1:-1);
            if((da>=0)!=(db>=0))output.Add(Vertex.Lerp(a,b,da/(da-db)));
            if(db>=0)output.Add(b);a=b;da=db;
        }
        return output;
    }
    static Mesh Subtract(Mesh source,Rect rectangle){
        var p=source.vertices;var ns=source.normals;var cs=source.colors;var uv=source.uv;
        var vertices=new List<Vertex>();var indices=source.triangles;
        void Add(List<Vertex> poly){for(int n=1;n<poly.Count-1;n++){
            if(Vector3.Cross(poly[n].p-poly[0].p,poly[n+1].p-poly[0].p).sqrMagnitude<1e-12f)continue;
            vertices.Add(poly[0]);vertices.Add(poly[n]);vertices.Add(poly[n+1]);
        }}
        for(int t=0;t<indices.Length;t+=3){
            var triangle=Enumerable.Range(0,3).Select(i=>{int n=indices[t+i];return new Vertex{p=p[n],n=ns.Length==p.Length?ns[n]:Vector3.up,uv=uv.Length==p.Length?uv[n]:Vector2.zero,colour=cs.Length==p.Length?cs[n]:Color.white};}).ToList();
            // Four disjoint outside regions preserve long triangles crossing the cut.
            Add(Clip(triangle,0,rectangle.xMin,false));Add(Clip(triangle,0,rectangle.xMax,true));
            var middle=Clip(Clip(triangle,0,rectangle.xMin,true),0,rectangle.xMax,false);
            Add(Clip(middle,2,rectangle.yMin,false));Add(Clip(middle,2,rectangle.yMax,true));
        }
        var mesh=new Mesh{name=source.name+" / mall perimeter",indexFormat=IndexFormat.UInt32};
        mesh.SetVertices(vertices.Select(v=>v.p).ToList());mesh.SetNormals(vertices.Select(v=>v.n).ToList());mesh.SetUVs(0,vertices.Select(v=>v.uv).ToList());mesh.SetColors(vertices.Select(v=>v.colour).ToList());mesh.SetTriangles(Enumerable.Range(0,vertices.Count).ToArray(),0);mesh.RecalculateBounds();return mesh;
    }
    static void SaveMesh(Mesh mesh,string path){var old=AssetDatabase.LoadAssetAtPath<Mesh>(path);if(old){EditorUtility.CopySerialized(mesh,old);Object.DestroyImmediate(mesh);EditorUtility.SetDirty(old);}else AssetDatabase.CreateAsset(mesh,path);}
    static Bounds Bounds(Transform root){var r=root.GetComponentsInChildren<Renderer>();var b=r[0].bounds;foreach(var item in r)b.Encapsulate(item.bounds);return b;}
    static void Sign(Transform parent,string name,Vector3 at,float width,Material font){
        var root=new GameObject(name).transform;root.SetParent(parent,false);root.localPosition=at;
        var text=root.gameObject.AddComponent<TextMesh>();text.font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");text.text=name;text.fontSize=80;text.characterSize=.12f;text.anchor=TextAnchor.MiddleCenter;text.color=new(.2f,.32f,.31f);
        root.GetComponent<Renderer>().sharedMaterial=font;var bounds=root.GetComponent<Renderer>().bounds;root.localScale=Vector3.one*Mathf.Min(width/bounds.size.x,.7f/bounds.size.y);
    }
    public static string Apply(){
        if(EditorApplication.isPlaying||!Application.dataPath.Replace('\\','/').EndsWith("/UnityComparison/Assets"))throw new InvalidOperationException("Use the stopped comparison project.");
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");
        var bridge=Object.FindFirstObjectByType<BusinessGameBridge>();
        var source=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/SharedCity/City.prefab");
        var path=AssetDatabase.GetAssetPath(bridge.sharedCityPrefab);var city=PrefabUtility.LoadPrefabContents(path);
        try{
            var existing=city.transform.Find("Relocated civic buildings");if(existing)Object.DestroyImmediate(existing.gameObject);
            var campus=new GameObject("Relocated civic buildings").transform;campus.SetParent(city.transform,false);
            // Move civic services to public civic land, rather than consuming owned plots.
            var destinations=new[]{("school",new Vector3(0,0,-50),new Vector3(-50,0,50),new Vector3(.95f,1,.95f),"CEDAR PRIMARY SCHOOL"),
                ("clinic",new Vector3(25,0,-50),new Vector3(0,0,45),new Vector3(.85f,1,.65f),"PARKSIDE HEALTH CENTRE"),
                ("library",new Vector3(25,0,-25),new Vector3(0,0,55),new Vector3(.85f,1,.65f),"PUBLIC LIBRARY")};
            var occupancy=city.GetComponent<CityOccupancy>();var footprints=occupancy.buildings.Where(f=>!f.owner.StartsWith("Relocated civic buildings")).ToList();
            foreach(var (id,from,to,scale,title) in destinations){
                var group=new GameObject(id).transform;group.SetParent(campus,false);group.localPosition=to;
                foreach(var original in source.GetComponentsInChildren<MeshFilter>(true).Where(f=>f.name.StartsWith(id+" "))){
                    var copy=Object.Instantiate(original.gameObject,group);copy.name=original.name;copy.SetActive(true);copy.transform.localScale=scale;copy.transform.localPosition=-Vector3.Scale(from,scale);
                    copy.GetComponent<Renderer>().enabled=true;
                }
                // Fit the entire civic site (including its steps and planting) inside
                // its new public parcel, keeping the original building height.
                var bounds=Bounds(group);float depth=id=="school"?17.2f:8.2f;
                group.localScale=new(Mathf.Min(1,17.2f/bounds.size.x),1,Mathf.Min(1,depth/bounds.size.z));
                bounds=Bounds(group);group.position+=new Vector3(to.x-bounds.center.x,0,to.z-bounds.center.z);
                bounds=Bounds(group);footprints.Add(new CityFootprint{owner="Relocated civic buildings/"+id,bounds=bounds});
                Sign(group,title,new(0,3.1f,-(id=="school"?5.9f:4.05f)),id=="school"?12:11,bridge.fontMaterial);
            }
            foreach(var original in city.GetComponentsInChildren<MeshFilter>(true).Where(f=>f.transform.parent.name=="City"&&new[]{"school ","clinic ","library ","cedar-playground ","market-square "}.Any(prefix=>f.name.StartsWith(prefix))))original.gameObject.SetActive(false);
            foreach(string suffix in new[]{"road","marks","paving","details"}){
                string name="Central roads "+suffix;
                var original=source.GetComponentsInChildren<MeshFilter>(true).Single(f=>f.name==name);
                var destination=city.GetComponentsInChildren<MeshFilter>(true).Single(f=>f.name==name);
                // Close only the internal north-south street. Keep perimeter roads and crossings.
                var cut=suffix is "road" or "marks"?Rect.MinMaxRect(9.25f,-59.25f,15.75f,-15.75f):Rect.MinMaxRect(-9.05f,-59.05f,34.05f,-15.95f);
                string meshPath=Folder+"/Central-"+suffix+".asset";SaveMesh(Subtract(original.sharedMesh,cut),meshPath);destination.sharedMesh=AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
            }
            var previous=city.transform.Find("Galleria public plaza");if(previous)Object.DestroyImmediate(previous.gameObject);
            var plaza=GameObject.CreatePrimitive(PrimitiveType.Cube);plaza.name="Galleria public plaza";plaza.transform.SetParent(city.transform,false);plaza.transform.localPosition=new(12.5f,.05f,-37.5f);plaza.transform.localScale=new(43.2f,.08f,43.2f);Object.DestroyImmediate(plaza.GetComponent<Collider>());plaza.GetComponent<Renderer>().sharedMaterial=bridge.paving;
            var plantingExclusions=footprints.Where(f=>f.owner.StartsWith("Relocated civic buildings")).Select(f=>f.bounds).Append(new Bounds(new(12.5f,0,-37.5f),new(43.2f,10,43.2f))).ToArray();
            foreach(var grass in city.GetComponentsInChildren<NaturalGrassPatches>(true))foreach(var tile in grass.tiles){
                tile.points=tile.points.Where(p=>!plantingExclusions.Any(b=>p.x>b.min.x-.25f&&p.x<b.max.x+.25f&&p.z>b.min.z-.25f&&p.z<b.max.z+.25f)).ToArray();tile.matrices=null;
            }
            occupancy.buildings=footprints.ToArray();PrefabUtility.SaveAsPrefabAsset(city,path);AssetDatabase.SaveAssets();
            string result="Galleria: four-plot block at (12.5,-37.5), 43.2m square public site; internal street removed; school, clinic and library relocated onto public civic land. All commercial parcel IDs preserved.";
            File.WriteAllText("../artifacts/unity-comparison/mall-site-layout.txt",result);return result;
        }finally{PrefabUtility.UnloadPrefabContents(city);}
    }
}
