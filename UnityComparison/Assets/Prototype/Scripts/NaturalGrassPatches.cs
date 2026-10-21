using UnityEngine;

/// One reusable tuft mesh; only positions are stored for the city.
/// Nearby tiles use GPU instancing instead of downloading millions of duplicate vertices.
public sealed class NaturalGrassPatches : MonoBehaviour
{
    [System.Serializable] public sealed class Tile {
        public Vector3[] points;
        public Bounds bounds;
        [System.NonSerialized] public Matrix4x4[] matrices;
    }
    public Mesh tuft;
    public Material material;
    public Tile[] tiles;
    public int VisiblePatchCount=>visible.Count;
    readonly System.Collections.Generic.List<Tile> visible=new();
    Camera view;float timer;
    void LateUpdate(){
        if(!view)view=Camera.main;if(!view)return;
        bool detail=Shader.GetGlobalFloat("_CityGrassDetail")>.5f&&Shader.GetGlobalFloat("_CitySnow")<.65f;
        if(!detail||!SystemInfo.supportsInstancing){visible.Clear();timer=0;return;}
        timer-=Time.unscaledDeltaTime;
        if(timer<=0){
            timer=.3f;visible.Clear();var at=transform.InverseTransformPoint(view.transform.position);
            foreach(var tile in tiles){
                if(tile.bounds.SqrDistance(at)>=38*38)continue;
                if(tile.matrices==null){
                    tile.matrices=new Matrix4x4[tile.points.Length];
                    for(int i=0;i<tile.points.Length;i++){
                        var p=tile.points[i];float seed=Mathf.Repeat(p.x*13.37f+p.z*7.91f,1);
                        tile.matrices[i]=transform.localToWorldMatrix*Matrix4x4.TRS(p,Quaternion.Euler(0,seed*360,0),Vector3.one*(.8f+seed*.4f));
                    }
                }
                visible.Add(tile);
            }
        }
        foreach(var tile in visible)Graphics.DrawMeshInstanced(tuft,0,material,tile.matrices,tile.matrices.Length,null,
            UnityEngine.Rendering.ShadowCastingMode.Off,true,gameObject.layer,view,UnityEngine.Rendering.LightProbeUsage.Off);
    }
}
