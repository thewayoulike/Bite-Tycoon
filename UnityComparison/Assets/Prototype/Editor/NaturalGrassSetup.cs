using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

public static class NaturalGrassSetup
{
    const string Folder="Assets/Prototype/SharedCity/Grass";
    const string Textures="Assets/Prototype/Art/Textures/Grass/";
    public static void ConfigureTextures(){
        AssetDatabase.Refresh();
        // Grass is submitted by script; no scene MeshRenderer references its
        // instancing variant. Retain it when Unity strips browser shaders.
        var graphics=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset")[0]);
        var stripping=graphics.FindProperty("m_InstancingStripping");
        stripping.enumValueIndex=Array.IndexOf(stripping.enumNames,"Keep All");
        graphics.ApplyModifiedPropertiesWithoutUndo();
        foreach(string file in new[]{"grass_ground_diff_1k.jpg","grass_ground_nor_gl_1k.jpg"}){
            var importer=AssetImporter.GetAtPath(Textures+file) as TextureImporter;
            if(!importer)throw new InvalidOperationException("Missing scanned grass: "+file);
            importer.textureType=file.Contains("nor_")?TextureImporterType.NormalMap:TextureImporterType.Default;
            importer.wrapMode=TextureWrapMode.Repeat;importer.mipmapEnabled=true;importer.anisoLevel=8;
            importer.maxTextureSize=1024;importer.SaveAndReimport();
        }
    }
    public static void SetSurfaceTextures(Material material){
        material.SetTexture("_GrassMap",AssetDatabase.LoadAssetAtPath<Texture2D>(Textures+"grass_ground_diff_1k.jpg"));
        material.SetTexture("_GrassNormal",AssetDatabase.LoadAssetAtPath<Texture2D>(Textures+"grass_ground_nor_gl_1k.jpg"));
        material.SetTexture("_RoadMap",AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Prototype/Art/Textures/Asphalt.png"));
    }
    struct Face {
        public Vector3 a,b,c;public Transform group;
        public bool Contains(float x,float z,out float y){
            float abx=b.x-a.x,abz=b.z-a.z,acx=c.x-a.x,acz=c.z-a.z;
            float d=abx*acz-abz*acx;
            if(Mathf.Abs(d)<.0001f){y=0;return false;}
            float u=((x-a.x)*acz-(z-a.z)*acx)/d,v=(abx*(z-a.z)-abz*(x-a.x))/d;
            y=a.y+u*(b.y-a.y)+v*(c.y-a.y);
            return u>=0&&v>=0&&u+v<=1;
        }
    }
    class Patch {
        public Transform parent;public Vector3 origin;
        public readonly List<Vector3> points=new();
    }
    public static void ConfigureLawn(Material lawn){
        if(!lawn)return;
        lawn.shader=Shader.Find("Business Simulator/Shared City");
        lawn.SetColor("_BaseColor",Color.white);lawn.SetFloat("_GrassSurface",2);
        lawn.SetFloat("_Smoothness",.05f);lawn.SetFloat("_Metallic",0);lawn.SetFloat("_TextureMix",0);
        SetSurfaceTextures(lawn);
        EditorUtility.SetDirty(lawn);AssetDatabase.SaveAssets();
    }
    static long Cell(int x,int z)=>((long)x<<32)^(uint)z;
    static uint Hash(int x,int z){unchecked{uint h=(uint)(x*73856093^z*19349663);h^=h>>16;h*=2246822519;return h^(h>>13);}}
    static float Random(uint seed,int salt)=>((Hash((int)seed,salt)>>8)&65535)/65535f;

    public static void AddPatches(GameObject root){
        Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
        var shader=Shader.Find("Business Simulator/Short Grass");
        if(!shader)throw new InvalidOperationException("Missing grass shader");
        var material=AssetDatabase.LoadAssetAtPath<Material>(Folder+"/Blades.mat");
        if(!material){material=new Material(shader);AssetDatabase.CreateAsset(material,Folder+"/Blades.mat");}
        material.shader=shader;material.enableInstancing=true;EditorUtility.SetDirty(material);
        var lawns=new List<Face>();var covers=new Dictionary<long,List<Face>>();
        foreach(var filter in root.GetComponentsInChildren<MeshFilter>()){
            var mesh=filter.sharedMesh;var renderer=filter.GetComponent<MeshRenderer>();
            if(!mesh||!mesh.isReadable||!renderer||filter.name=="Ground")continue;
            var m=renderer.sharedMaterial;var p=mesh.vertices;var n=mesh.normals;var colors=mesh.colors;var ids=mesh.triangles;
            bool landscape=m&&m.HasProperty("_GrassSurface")&&m.GetFloat("_GrassSurface")>.5f;
            Transform group=filter.transform;while(group.parent!=root.transform)group=group.parent;
            for(int i=0;i<ids.Length;i+=3){
                int ia=ids[i],ib=ids[i+1],ic=ids[i+2];
                if(n.Length!=p.Length||filter.transform.TransformDirection(n[ia]).y<.65f)continue;
                var face=new Face{a=filter.transform.TransformPoint(p[ia]),b=filter.transform.TransformPoint(p[ib]),c=filter.transform.TransformPoint(p[ic]),group=group};
                float height=(face.a.y+face.b.y+face.c.y)/3;
                if(height<.03f||height>12)continue;
                var color=colors.Length==p.Length?colors[ia]:Color.white;
                bool grass=landscape&&height<.45f&&color.g>color.r+.015f&&color.g>color.b+.035f;
                if(grass){lawns.Add(face);continue;}
                int minX=Mathf.FloorToInt(Mathf.Min(face.a.x,face.b.x,face.c.x)/4),maxX=Mathf.FloorToInt(Mathf.Max(face.a.x,face.b.x,face.c.x)/4);
                int minZ=Mathf.FloorToInt(Mathf.Min(face.a.z,face.b.z,face.c.z)/4),maxZ=Mathf.FloorToInt(Mathf.Max(face.a.z,face.b.z,face.c.z)/4);
                for(int x=minX;x<=maxX;x++)for(int z=minZ;z<=maxZ;z++){
                    long key=Cell(x,z);if(!covers.TryGetValue(key,out var list))covers[key]=list=new();list.Add(face);
                }
            }
        }
        var patches=new Dictionary<(Transform,int,int),Patch>();var used=new HashSet<(Transform,int,int)>();
        const float spacing=1.05f;
        int tufts=0;
        foreach(var face in lawns){
            int minX=Mathf.FloorToInt(Mathf.Min(face.a.x,face.b.x,face.c.x)/spacing),maxX=Mathf.CeilToInt(Mathf.Max(face.a.x,face.b.x,face.c.x)/spacing);
            int minZ=Mathf.FloorToInt(Mathf.Min(face.a.z,face.b.z,face.c.z)/spacing),maxZ=Mathf.CeilToInt(Mathf.Max(face.a.z,face.b.z,face.c.z)/spacing);
            for(int x=minX;x<=maxX;x++)for(int z=minZ;z<=maxZ;z++){
                uint seed=Hash(x,z);float px=(x+.15f+Random(seed,1)*.7f)*spacing,pz=(z+.15f+Random(seed,2)*.7f)*spacing;
                if(used.Contains((face.group,x,z))||!face.Contains(px,pz,out float y))continue;
                used.Add((face.group,x,z));
                bool blocked=false;
                for(int dx=-1;dx<=1&&!blocked;dx++)for(int dz=-1;dz<=1&&!blocked;dz++){
                    float tx=px+dx*.13f,tz=pz+dz*.13f;
                    if(covers.TryGetValue(Cell(Mathf.FloorToInt(tx/4),Mathf.FloorToInt(tz/4)),out var list))
                        foreach(var cover in list)if(cover.Contains(tx,tz,out float top)&&top>y+.015f){blocked=true;break;}
                }
                if(blocked)continue;
                var key=(face.group,Mathf.FloorToInt(px/20),Mathf.FloorToInt(pz/20));
                if(!patches.TryGetValue(key,out var patch))patches[key]=patch=new Patch{parent=face.group,origin=new(key.Item2*20,0,key.Item3*20)};
                patch.points.Add(new Vector3(px,y-.006f,pz));
                tufts++;
            }
        }
        var vertices=new List<Vector3>();var normals=new List<Vector3>();var uv=new List<Vector2>();
        for(int b=0;b<6;b++){
            float angle=b*2.4f,height=.065f+b*.007f;
            var side=new Vector3(Mathf.Cos(angle),0,Mathf.Sin(angle));
            var at=side*.035f;
            vertices.Add(at-side*.006f);vertices.Add(at+side*.006f);vertices.Add(at+Vector3.up*height+new Vector3(-side.z,0,side.x)*.025f);
            for(int k=0;k<3;k++){normals.Add(new Vector3(-side.z,.6f,side.x).normalized);uv.Add(new(k==1?1:0,k==2?height:0));}
        }
        string meshPath=Folder+"/Shared-tuft.asset";
        var tuft=AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
        if(!tuft){tuft=new Mesh{name="Shared short grass tuft"};AssetDatabase.CreateAsset(tuft,meshPath);}
        tuft.Clear();tuft.SetVertices(vertices);tuft.SetNormals(normals);tuft.SetUVs(0,uv);
        tuft.SetTriangles(Enumerable.Range(0,vertices.Count).ToArray(),0);tuft.RecalculateBounds();EditorUtility.SetDirty(tuft);
        foreach(var group in patches.Values.GroupBy(p=>p.parent)){
            var go=new GameObject("Short grass near camera");go.transform.SetParent(group.Key,false);
            var controller=go.AddComponent<NaturalGrassPatches>();controller.tuft=tuft;controller.material=material;
            controller.tiles=group.Select(p=>{
                if(p.points.Count>1023)throw new InvalidOperationException("Grass tile exceeds the instancing limit.");
                return new NaturalGrassPatches.Tile{points=p.points.ToArray(),bounds=new Bounds(p.origin+new Vector3(10,.2f,10),new Vector3(20,1,20))};
            }).ToArray();
        }
        Debug.Log($"GRASS_READY {tufts} positions, {patches.Count} tiles, one reusable tuft mesh; buildings and paths excluded");
    }
}
