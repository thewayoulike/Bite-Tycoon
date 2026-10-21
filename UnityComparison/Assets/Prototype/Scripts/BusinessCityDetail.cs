using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

public sealed partial class BusinessGameBridge
{
    public Shader seaShader, hazeShader;
    public Texture2D seaNormals;
    Material seaMaterial, smokeMaterial;
    readonly List<Transform> cars = new(), boats = new(), trees = new();
    void PrepareWorldMaterials()
    {
        seaMaterial = new Material(seaShader);
        if(seaNormals)seaMaterial.SetTexture("_RippleMap",seaNormals);
        smokeMaterial = new Material(hazeShader);
    }
    void CreateWater(Transform city)
    {
        var sea = Group(city, "Animated coastal water").gameObject;
        const int nx = 192, nz = 128;
        var vertices = new Vector3[(nx + 1) * (nz + 1)]; var triangles = new int[nx * nz * 6];
        int t = 0;
        for (int z = 0; z <= nz; z++) for (int x = 0; x <= nx; x++) vertices[z * (nx + 1) + x] = new(-580 + x * 1200f / nx, -.2f, 288 + z * 640f / nz);
        for (int z = 0; z < nz; z++) for (int x = 0; x < nx; x++) { int a = z * (nx + 1) + x; triangles[t++] = a; triangles[t++] = a + nx + 1; triangles[t++] = a + 1; triangles[t++] = a + 1; triangles[t++] = a + nx + 1; triangles[t++] = a + nx + 2; }
        var mesh = new Mesh { name = "Coastal water grid", vertices = vertices, triangles = triangles }; mesh.RecalculateNormals(); mesh.RecalculateBounds();
        sea.AddComponent<MeshFilter>().sharedMesh = mesh; sea.AddComponent<MeshRenderer>().sharedMaterial = seaMaterial;
    }
    void AnimateScenery()
    {
        AnimateRoadTraffic();
        for (int n = 0; n < trees.Count; n++) { var tree = trees[n]; tree.gameObject.SetActive(!obstructedTrees.Contains(tree)&&HorizontalDistance(tree.position) < (distance>250?450:frame?.fast == true ? 130 : 200)); }
        if (seaMaterial) {
            seaMaterial.SetFloat("_Wind", frame?.wind ?? 0);seaMaterial.SetFloat("_Night", frame?.night == true ? 1 : 0);
            for(int n=0;n<3;n++)if(boats.Count>6+n){
                var boat=boats[6+n];var forward=boat.forward;
                seaMaterial.SetVector("_Wake"+n,new Vector4(boat.position.x,boat.position.z,forward.x,forward.z));
            }
        }
    }
}
