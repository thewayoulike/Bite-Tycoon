using UnityEngine;

public sealed partial class BusinessGameBridge
{
    ParticleSystem rainDrops,snowflakes; string lightKey;
    void CreateWeather()
    {
        rainDrops=Precipitation("City rain",false);snowflakes=Precipitation("City snow",true);
    }
    ParticleSystem Precipitation(string name,bool snow)
    {
        var effect=new GameObject(name).AddComponent<ParticleSystem>();effect.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
        var main=effect.main;main.startLifetime=snow?7:2;main.startSpeed=0;main.startSize=snow?.085f:.025f;main.startColor=snow?new Color(.93f,.95f,1,.85f):new Color(.7f,.83f,.9f,.4f);main.maxParticles=snow?850:1200;main.simulationSpace=ParticleSystemSimulationSpace.World;
        var shape=effect.shape;shape.shapeType=ParticleSystemShapeType.Box;shape.scale=new Vector3(55,1,55);
        var velocity=effect.velocityOverLifetime;velocity.enabled=true;velocity.space=ParticleSystemSimulationSpace.World;velocity.y=snow?-2.2f:-20;velocity.x=snow?.4f:1.4f;
        var emission=effect.emission;emission.rateOverTime=0;
        var renderer=effect.GetComponent<ParticleSystemRenderer>();renderer.sharedMaterial=smokeMaterial;if(!snow){renderer.renderMode=ParticleSystemRenderMode.Stretch;renderer.lengthScale=5;renderer.velocityScale=.025f;}
        effect.Play();return effect;
    }
    void UpdateWeather()
    {
        if(frame==null||!rainDrops)return;
        bool inside=!string.IsNullOrEmpty(frame.focus)&&frame.detail!="exterior"&&frame.detail!="street";
        viewCamera.clearFlags=inside?CameraClearFlags.SolidColor:CameraClearFlags.Skybox;
        viewCamera.backgroundColor=frame.night?new Color(.18f,.23f,.25f):new Color(.64f,.68f,.65f);
        var position=new Vector3(target.x,23,target.z);rainDrops.transform.position=position;snowflakes.transform.position=position;
        var rain=rainDrops.emission;rain.rateOverTime=inside?0:Mathf.Clamp01(frame.rain)*(frame.fast?160:400);
        var snow=snowflakes.emission;snow.rateOverTime=inside?0:Mathf.Clamp01(frame.snow)*(frame.fast?35:100);
        if(inside){rainDrops.Clear();snowflakes.Clear();}
        float cloud=Mathf.Max(frame.rain,frame.snow)*.25f;
        lighting.sun.intensity=(frame.night?.7f:2.5f)*(1-cloud);
        string key=frame.night+":"+frame.weather;
        if(lightKey!=key){lightKey=key;var probe=new UnityEngine.Rendering.SphericalHarmonicsL2();probe.AddAmbientLight(frame.night?new Color(.17f,.22f,.29f):new Color(.51f,.57f,.62f)*(1-cloud));RenderSettings.ambientProbe=probe;if(RenderSettings.skybox)RenderSettings.skybox.SetColor("_GroundColor",RenderSettings.fogColor);}
    }
}
