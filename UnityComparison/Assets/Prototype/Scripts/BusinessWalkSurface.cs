using System.Collections.Generic;
using UnityEngine;

// Query the same meshes that are rendered, rather than a fixed street height.
public sealed class BusinessWalkSurface:MonoBehaviour
{
    readonly List<MeshCollider> surfaces=new();
    public void Initialize(Transform city)
    {
        foreach(var filter in city.GetComponentsInChildren<MeshFilter>(true)){
            string n=filter.name.ToLowerInvariant();
            if(!(n.Contains("paving")||n.Contains("pavement")||n.Contains("roads road")||n.Contains("promenade")))continue;
            if(!filter.sharedMesh)continue;
            var surface=filter.GetComponent<MeshCollider>();if(!surface)surface=filter.gameObject.AddComponent<MeshCollider>();
            surface.sharedMesh=filter.sharedMesh;surfaces.Add(surface);
        }
    }
    public float Height(Vector3 point,float fallback)
    {
        float highest=float.NegativeInfinity;
        var ray=new Ray(new(point.x,2,point.z),Vector3.down);
        foreach(var surface in surfaces){
            if(!surface||!surface.gameObject.activeInHierarchy)continue;
            var b=surface.bounds;if(point.x<b.min.x||point.x>b.max.x||point.z<b.min.z||point.z>b.max.z)continue;
            if(surface.Raycast(ray,out var hit,3)&&hit.normal.y>.5f&&hit.point.y>highest)highest=hit.point.y;
        }
        return float.IsNegativeInfinity(highest)?fallback:highest+.003f;
    }
}
