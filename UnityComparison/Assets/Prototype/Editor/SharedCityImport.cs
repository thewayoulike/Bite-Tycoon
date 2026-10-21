using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

// Imports geometry built by the React game's own city generators.
public static class SharedCityImport
{
 const string Folder="Assets/Prototype/SharedCity";
 [MenuItem("Business Simulator/Import Existing City")]
 public static void Import()
 {
  if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop the editor preview before importing the city.");
  string source=Path.GetFullPath("../artifacts/unity-setup/shared-city");
  var data=JsonUtility.FromJson<SharedCityData>(File.ReadAllText(Path.Combine(source,"city.json")));
  Directory.CreateDirectory(Folder);AssetDatabase.Refresh();
  NaturalGrassSetup.ConfigureTextures();
  var root=new GameObject("Shared React city");var groups=new Dictionary<string,Transform>();var materials=new Dictionary<string,Material>();
  foreach(var item in data.meshes)
  {
   if(!groups.TryGetValue(item.group,out var parent)){parent=new GameObject(item.group).transform;parent.SetParent(root.transform,false);groups[item.group]=parent;}
   using var reader=new BinaryReader(File.OpenRead(Path.Combine(source,item.file)));int count=reader.ReadInt32();
   var vertices=new Vector3[count];var normals=new Vector3[count];var colors=new Color[count];var uv=new Vector2[count];var triangles=new int[count];
   for(int n=0;n<count;n++){vertices[n]=new(reader.ReadSingle(),reader.ReadSingle(),reader.ReadSingle());normals[n]=new(reader.ReadSingle(),reader.ReadSingle(),reader.ReadSingle());colors[n]=new(reader.ReadSingle(),reader.ReadSingle(),reader.ReadSingle(),1);uv[n]=new(reader.ReadSingle(),reader.ReadSingle());triangles[n]=n%3==0?n:n%3==1?n+1:n-1;}
   var mesh=new Mesh{name=item.name,indexFormat=IndexFormat.UInt32,vertices=vertices,normals=normals,colors=colors,uv=uv,triangles=triangles};mesh.RecalculateBounds();
   string asset=Folder+"/"+Path.GetFileNameWithoutExtension(item.file)+".asset";
   SaveAsset(mesh,asset);
   string style=item.name=="Eastport Airport glass"?"terminalGlass":item.surface;
   if(!materials.TryGetValue(style,out var material))
   {
    material=new Material(Shader.Find(style=="terminalGlass"?"Business Simulator/Terminal Glass":"Business Simulator/Shared City")){name="Shared "+style,enableInstancing=true};
    if(style!="terminalGlass"){
    bool glass=style=="glass",metal=style is "metal" or "rails";
    material.SetFloat("_Smoothness",glass?.86f:metal?.55f:.2f);material.SetFloat("_Metallic",glass?.6f:metal?.5f:0);
    if(style is "lights" or "lit")material.SetFloat("_Glow",1);
    string texture=style=="masonry"?"Handmade buff brick":style is "paving" or "stone"?"Stone paving":style=="ground"?"Meadow":null;
    if(texture!=null){var old=AssetDatabase.LoadAssetAtPath<Material>("Assets/Prototype/Detailed/Materials/"+texture+".mat");if(old&&old.mainTexture){material.SetTexture("_BaseMap",old.mainTexture);material.SetFloat("_TextureMix",style=="ground"?.35f:.3f);}}
    if(style=="ground")material.SetColor("_BaseColor",new Color(.63f,.68f,.55f));
    if(style=="paving")material.SetColor("_BaseColor",new Color(.76f,.75f,.69f));
    material.SetFloat("_GrassSurface",style=="ground"?2:style is "land" or "masonry" or "solid" or "base"?1:0);
    material.SetFloat("_RoadSurface",style=="road"?2:style is "base" or "stone"?1:0);
    material.SetFloat("_RoadMarkings",style is "marks" or "markings"?1:0);
    NaturalGrassSetup.SetSurfaceTextures(material);
    }
    SaveAsset(material,Folder+"/Material-"+style+".mat");materials[style]=AssetDatabase.LoadAssetAtPath<Material>(Folder+"/Material-"+style+".mat");
   }
   var part=new GameObject(item.name);part.transform.SetParent(parent,false);part.AddComponent<MeshFilter>().sharedMesh=AssetDatabase.LoadAssetAtPath<Mesh>(asset);var r=part.AddComponent<MeshRenderer>();r.sharedMaterial=materials[style];r.shadowCastingMode=item.name.Contains("road")||style is "ground" or "terminalGlass"?ShadowCastingMode.Off:ShadowCastingMode.On;
  }
  ImportHouses(root.transform,data);
  NaturalGrassSetup.AddPatches(root);
  var prefab=PrefabUtility.SaveAsPrefabAsset(root,Folder+"/City.prefab");Object.DestroyImmediate(root);
  string jsonAsset=Folder+"/city.json";File.Copy(Path.Combine(source,"city.json"),jsonAsset,true);AssetDatabase.ImportAsset(jsonAsset);
  EditorSceneManager.OpenScene("Assets/Scenes/BusinessSimulatorWeb.unity");var bridge=Object.FindFirstObjectByType<BusinessGameBridge>();bridge.sharedCityPrefab=prefab;bridge.sharedCityData=AssetDatabase.LoadAssetAtPath<TextAsset>(jsonAsset);
  EditorUtility.SetDirty(bridge);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
  NaturalGrassSetup.ConfigureLawn(bridge.greenery);
  Debug.Log("SHARED_REACT_CITY_IMPORTED "+data.meshes.Length+" mesh batches");
 }
 static void SaveAsset(Object value,string path){
  var old=AssetDatabase.LoadAssetAtPath<Object>(path);
  if(old){
   if(value is Mesh source&&old is Mesh target){
    // CopySerialized alone can leave the previous native vertex buffers alive.
    // Replace the mesh through its API while retaining the asset GUID.
    target.Clear();target.indexFormat=source.indexFormat;target.vertices=source.vertices;
    target.normals=source.normals;target.colors=source.colors;target.uv=source.uv;
    target.subMeshCount=source.subMeshCount;
    for(int n=0;n<source.subMeshCount;n++)target.SetTriangles(source.GetTriangles(n),n);
    target.bounds=source.bounds;target.UploadMeshData(false);
   }else EditorUtility.CopySerialized(value,old);
   EditorUtility.SetDirty(old);Object.DestroyImmediate(value);
  }else AssetDatabase.CreateAsset(value,path);
 }
 static void ImportHouses(Transform root,SharedCityData data)
 {
  var prefab=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prototype/Migration/Residence.prefab");
  var variants=CityArchitectureSetup.Homes.Select(n=>AssetDatabase.LoadAssetAtPath<GameObject>(CityArchitectureSetup.Folder+"/"+n+".prefab")).Prepend(prefab).Where(p=>p).ToArray();
  var tints=new Dictionary<string,Material>();
  for(int quadrant=0;quadrant<4;quadrant++)
  {
   var area=new GameObject("Residential neighbourhood "+quadrant);area.transform.SetParent(root,false);
   foreach(var h in data.houses.Where(h=>(h.x<0?1:0)+(h.z<0?2:0)==quadrant))
   {
    int variation=Math.Abs((int)(h.x*7+h.z*13)+h.palette*11+h.style*3);
    var house=Object.Instantiate(variants[variation%variants.Length],area.transform);house.transform.position=new(h.x,h.y,h.z);
    var rs=house.GetComponentsInChildren<MeshRenderer>();var bounds=rs[0].bounds;foreach(var r in rs)bounds.Encapsulate(r.bounds);
    house.transform.localScale=new((h.width>0?h.width:6.05f+variation%3*.25f)/bounds.size.x,1,(6.9f+variation%4*.2f)/bounds.size.z);
    house.transform.position+=new Vector3((h.x-bounds.center.x)*house.transform.localScale.x,h.y-bounds.min.y,(h.z-bounds.center.z)*house.transform.localScale.z);
    house.transform.RotateAround(new Vector3(h.x,0,h.z),Vector3.up,h.angle);
    foreach(var r in rs)
    {
     string name=r.sharedMaterial.name.ToLowerInvariant();if(!(name.Contains("cedar")||name.Contains("siding")||name.Contains("slate")||name.Contains("ivory")))continue;
     string key=r.sharedMaterial.name+h.palette;
     if(!tints.TryGetValue(key,out var material)){
      material=new Material(r.sharedMaterial);
      string hex=name.Contains("slate")?data.palettes[h.palette].roof:name.Contains("ivory")?data.palettes[h.palette].trim:data.palettes[h.palette].siding;
      ColorUtility.TryParseHtmlString(hex,out var color);
      // These diffuse maps already contain paint/roof colour. Tint relative to
      // their base colour instead of multiplying dark paint into dark textures.
      if(material.mainTexture){
       var basis=name.Contains("slate")?new Color(.267f,.294f,.318f):new Color(.529f,.553f,.518f);
       color=new Color(color.r/basis.r,color.g/basis.g,color.b/basis.b);
      }
      material.color=color;material.enableInstancing=true;string file=Folder+"/House-tint-"+tints.Count+".mat";
      SaveAsset(material,file);material=AssetDatabase.LoadAssetAtPath<Material>(file);tints[key]=material;
     }r.sharedMaterial=material;
    }
   }
   int serial=0;
   foreach(var group in area.GetComponentsInChildren<MeshFilter>().Where(f=>f.sharedMesh&&f.sharedMesh.isReadable&&f.GetComponent<MeshRenderer>()).GroupBy(f=>f.GetComponent<MeshRenderer>().sharedMaterial).ToArray())
   {
    var pieces=group.Select(f=>new CombineInstance{mesh=f.sharedMesh,transform=area.transform.worldToLocalMatrix*f.transform.localToWorldMatrix}).ToArray();
    var mesh=new Mesh{name="Residential batch",indexFormat=IndexFormat.UInt32};mesh.CombineMeshes(pieces,true,true);mesh.RecalculateBounds();string file=Folder+"/Houses-"+quadrant+"-"+serial+++".asset";SaveAsset(mesh,file);
    var batch=new GameObject("Houses - shared material");batch.transform.SetParent(area.transform,false);batch.AddComponent<MeshFilter>().sharedMesh=AssetDatabase.LoadAssetAtPath<Mesh>(file);batch.AddComponent<MeshRenderer>().sharedMaterial=group.Key;
    foreach(var f in group){Object.DestroyImmediate(f.GetComponent<MeshRenderer>());Object.DestroyImmediate(f);}
   }
   foreach(Transform child in area.transform.Cast<Transform>().ToArray())if(child.name!="Houses - shared material"&&child.GetComponentsInChildren<MeshRenderer>().Length==0)Object.DestroyImmediate(child.gameObject);
  }
 }
}
