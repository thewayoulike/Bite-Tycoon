Shader "Business Simulator/Terminal Glass" {
 Properties { _Opacity("Clear glass opacity",Range(0,1))=.1 }
 SubShader {
  Tags {"Queue"="Transparent" "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline"}
  Blend SrcAlpha OneMinusSrcAlpha
  ZWrite Off
  Cull Off
  Pass {
   Tags {"LightMode"="UniversalForward"}
   HLSLPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #pragma multi_compile_fog
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
   CBUFFER_START(UnityPerMaterial)
   float _Opacity;
   CBUFFER_END
   struct A {float4 positionOS:POSITION;float3 normalOS:NORMAL;float4 color:COLOR;};
   struct V {float4 positionCS:SV_POSITION;float3 world:TEXCOORD0;half3 normal:TEXCOORD1;half fog:TEXCOORD2;};
   V vert(A i){V o;o.world=TransformObjectToWorld(i.positionOS.xyz);o.positionCS=TransformWorldToHClip(o.world);o.normal=TransformObjectToWorldNormal(i.normalOS);o.fog=ComputeFogFactor(o.positionCS.z);return o;}
   half4 frag(V i):SV_Target{
    half3 n=normalize(i.normal),v=GetWorldSpaceNormalizeViewDir(i.world);
    half fresnel=pow(1-abs(dot(n,v)),4);
    half3 reflection=lerp(half3(.17,.25,.28),half3(.59,.76,.83),saturate(reflect(-v,n).y*.5+.5));
    Light light=GetMainLight();
    half shine=pow(abs(dot(n,normalize(light.direction+v))),140)*.25;
    return half4(MixFog(reflection+light.color*shine,i.fog),_Opacity+fresnel*.18);
   }
   ENDHLSL
  }
 }
}
