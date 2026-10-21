Shader "Business Simulator/Short Grass" {
 SubShader {
  Tags {"RenderType"="Opaque" "RenderPipeline"="UniversalPipeline"}
  Cull Off
  Pass {
   Tags {"LightMode"="UniversalForward"}
   HLSLPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #pragma multi_compile_instancing
   #pragma multi_compile_fog
   #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
   #pragma multi_compile_fragment _ _SHADOWS_SOFT
   #include "CityLighting.hlsl"
   #include "NaturalGrass.hlsl"
   float _CitySnow,_CityNight,_CityWind;
   struct Attributes {float4 positionOS:POSITION;float3 normalOS:NORMAL;float2 uv:TEXCOORD0;UNITY_VERTEX_INPUT_INSTANCE_ID};
   struct Varyings {float4 positionCS:SV_POSITION;float3 positionWS:TEXCOORD0;half3 normalWS:TEXCOORD1;float2 uv:TEXCOORD2;half fog:TEXCOORD3;};
   Varyings vert(Attributes i){
    UNITY_SETUP_INSTANCE_ID(i);
    Varyings o;float3 p=TransformObjectToWorld(i.positionOS.xyz);
    float fade=1-smoothstep(24,38,distance(p,_WorldSpaceCameraPos));
    // Roots remain fixed. Only the top of each short blade bends.
    p.y-=i.uv.y*(1-fade);
    p.xz+=float2(1,.4)*sin(_Time.y*1.7+p.x*.8+p.z*.5)*i.uv.y*i.uv.y*(.45+min(_CityWind,2)*.35);
    o.positionWS=p;o.positionCS=TransformWorldToHClip(p);o.normalWS=TransformObjectToWorldNormal(i.normalOS);
    o.uv=i.uv;o.fog=ComputeFogFactor(o.positionCS.z);return o;
   }
   half4 frag(Varyings i):SV_Target{
    clip(.65-_CitySnow);
    half3 n=normalize(i.normalWS);
    half3 base=GrassColour(i.positionWS.xz)*lerp(.76,1.18,saturate(i.uv.y*8));
    Light light=CityMainLight(i.positionWS);
    half diffuse=saturate(dot(n,light.direction))*.5+.5;
    half3 ambient=max(SampleSH(half3(0,1,0)),half3(.18,.2,.22)*(1-_CityNight*.75));
    half3 color=base*(ambient+light.color*diffuse*light.shadowAttenuation);
    return half4(MixFog(color,i.fog),1);
   }
   ENDHLSL
  }
 }
}
