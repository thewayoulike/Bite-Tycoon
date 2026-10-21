using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

// Original tileable wave spectrum. Mipmaps filter the small ripples at a distance
// instead of producing the shimmering grid caused by unfiltered shader sine waves.
public static class CoastalWaterSetup
{
    static float Grain(int x,int y)
    {
        unchecked{
            uint n=(uint)(x*374761393+y*668265263+4815);
            n=(n^(n>>13))*1274126177;
            return (n^(n>>16))/(float)uint.MaxValue;
        }
    }
    public static string Configure()
    {
        if(EditorApplication.isPlaying)throw new InvalidOperationException("Stop Play mode before configuring water.");
        const int size=256;
        const string path="Assets/Prototype/Detailed/Textures/CoastalRipples.png";
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        var heights=new float[size*size];
        for(int y=0;y<size;y++)for(int x=0;x<size;x++){
            float value=0,amplitude=.55f;
            for(int frequency=4;frequency<=64;frequency*=2){
                float px=x/(float)size*frequency,py=y/(float)size*frequency;
                int ix=Mathf.FloorToInt(px),iy=Mathf.FloorToInt(py);
                float fx=Mathf.SmoothStep(0,1,px-ix),fy=Mathf.SmoothStep(0,1,py-iy);
                float a=Grain(ix%frequency,iy%frequency),b=Grain((ix+1)%frequency,iy%frequency);
                float c=Grain(ix%frequency,(iy+1)%frequency),d=Grain((ix+1)%frequency,(iy+1)%frequency);
                value+=Mathf.Lerp(Mathf.Lerp(a,b,fx),Mathf.Lerp(c,d,fx),fy)*amplitude;
                amplitude*=.48f;
            }
            heights[y*size+x]=value;
        }
        var pixels=new Color[size*size];
        for(int y=0;y<size;y++)for(int x=0;x<size;x++){
            float dx=(heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size])*15;
            float dz=(heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x])*15;
            var normal=new Vector3(-dx,1,-dz).normalized;
            pixels[y*size+x]=new(normal.x*.5f+.5f,normal.z*.5f+.5f,normal.y,Mathf.Clamp01(.5f+(heights[y*size+x]-.5f)*2.3f));
        }
        var texture=new Texture2D(size,size,TextureFormat.RGBA32,false,true);texture.SetPixels(pixels);texture.Apply();
        File.WriteAllBytes(path,texture.EncodeToPNG());UnityEngine.Object.DestroyImmediate(texture);
        AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceUpdate);
        var importer=(TextureImporter)AssetImporter.GetAtPath(path);
        importer.sRGBTexture=false;importer.mipmapEnabled=true;importer.wrapMode=TextureWrapMode.Repeat;
        importer.filterMode=FilterMode.Trilinear;importer.anisoLevel=4;importer.textureCompression=TextureImporterCompression.Uncompressed;
        importer.alphaSource=TextureImporterAlphaSource.FromInput;importer.alphaIsTransparency=false;importer.SaveAndReimport();
        var bridge=UnityEngine.Object.FindFirstObjectByType<BusinessGameBridge>();
        bridge.seaNormals=AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        EditorUtility.SetDirty(bridge);EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());AssetDatabase.SaveAssets();
        return "Original mipmapped ocean ripple texture assigned to the shared Unity scene.";
    }
}
