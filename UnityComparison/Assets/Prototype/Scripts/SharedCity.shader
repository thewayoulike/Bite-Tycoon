Shader "Business Simulator/Shared City" {
 Properties {
  _BaseMap("Surface",2D)="white"{} _BaseColor("Tint",Color)=(1,1,1,1)
  _Smoothness("Smoothness",Range(0,1))=.2 _Metallic("Metal",Range(0,1))=0
  _Glow("Night glow",Float)=0 _TextureMix("Surface texture",Range(0,1))=0
  _GrassSurface("Grass: 1 mixed landscape, 2 lawn",Float)=0
  _GrassMap("Scanned turf",2D)="white"{} _GrassNormal("Turf normal",2D)="bump"{}
  _RoadMap("Asphalt",2D)="white"{} _RoadSurface("Asphalt: 1 mixed, 2 road",Float)=0
  _RoadNormal("Road surface normal",2D)="bump"{}
  _RoadMarkings("Worn road paint",Float)=0
 }
 SubShader {
  Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
  Cull Off
  Pass {
   Tags { "LightMode"="UniversalForward" }
   HLSLPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #pragma multi_compile_fog
   #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
   #pragma multi_compile_fragment _ _SHADOWS_SOFT
   #include "CityLighting.hlsl"
   TEXTURE2D(_GrassMap); SAMPLER(sampler_GrassMap);
   TEXTURE2D(_GrassNormal); SAMPLER(sampler_GrassNormal);
   TEXTURE2D(_RoadMap); SAMPLER(sampler_RoadMap);
   TEXTURE2D(_RoadNormal); SAMPLER(sampler_RoadNormal);
   #define GRASS_TEXTURED
   #include "NaturalGrass.hlsl"
   TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
   CBUFFER_START(UnityPerMaterial)
   float4 _BaseColor; float4 _BaseMap_ST; float _Smoothness,_Metallic,_Glow,_TextureMix,_GrassSurface,_RoadSurface,_RoadMarkings;
   CBUFFER_END
   float _CitySnow,_CityNight;
   struct Attributes { float4 positionOS:POSITION; float3 normalOS:NORMAL; float4 color:COLOR; float2 uv:TEXCOORD0; };
   struct Varyings { float4 positionCS:SV_POSITION; float3 positionWS:TEXCOORD0; half3 normalWS:TEXCOORD1; half4 color:COLOR; float2 uv:TEXCOORD2; half fog:TEXCOORD3; };
   Varyings vert(Attributes v){Varyings o;o.positionWS=TransformObjectToWorld(v.positionOS.xyz);o.positionCS=TransformWorldToHClip(o.positionWS);o.normalWS=TransformObjectToWorldNormal(v.normalOS);o.color=v.color;o.uv=TRANSFORM_TEX(v.uv,_BaseMap);o.fog=ComputeFogFactor(o.positionCS.z);return o;}
   half4 frag(Varyings i):SV_Target {
    half3 n=normalize(i.normalWS),view=GetWorldSpaceNormalizeViewDir(i.positionWS);
    half3 base=i.color.rgb*_BaseColor.rgb;
    base*=lerp(1,SAMPLE_TEXTURE2D(_BaseMap,sampler_BaseMap,i.uv).rgb*1.5,_TextureMix);
    bool green=i.color.g>i.color.r+.015 && i.color.g>i.color.b+.035;
    bool lawn=_GrassSurface>1.5||(_GrassSurface>.5&&green&&i.positionWS.y<.45);
    if(lawn&&n.y>.65)base=GrassSurface(i.positionWS,n);
    bool asphalt=_RoadSurface>1.5||(_RoadSurface>.5&&i.color.b>i.color.r&&i.color.r<.22);
    if(asphalt&&n.y>.65){
     half3 detail=UnpackNormal(SAMPLE_TEXTURE2D(_RoadNormal,sampler_RoadNormal,i.positionWS.xz/5));
     n=normalize(half3(detail.x*.2,1,detail.y*.2));
     half3 surface=SAMPLE_TEXTURE2D(_RoadMap,sampler_RoadMap,i.positionWS.xz/5).rgb;
     float footprint=max(length(ddx(i.positionWS.xz)),length(ddy(i.positionWS.xz)));
     float grit=lerp(1,.83+GrassNoise(i.positionWS.xz*58)*.34,1-smoothstep(.008,.08,footprint));
     base=surface*half3(.89,.95,1.03)*grit*lerp(.88,1.1,GrassNoise(i.positionWS.xz*.17));
    }
    if(_RoadMarkings>.5)base*=lerp(.7,1, smoothstep(.12,.55,GrassNoise(i.positionWS.xz*11)));
    base=lerp(base,half3(.76,.82,.86),_CitySnow*smoothstep(.64,.95,n.y));
    Light light=CityMainLight(i.positionWS);
    half diffuse=saturate(dot(n,light.direction));half3 ambient=max(SampleSH(n),half3(.18,.2,.22)*(1-_CityNight*.75));
    half spec=pow(saturate(dot(n,normalize(light.direction+view))),lerp(12,180,_Smoothness))*_Smoothness;
    half3 reflection=lerp(half3(.12,.21,.26),half3(.55,.68,.77),saturate(reflect(-view,n).y*.5+.5));
    half3 color=base*(ambient+light.color*diffuse*light.shadowAttenuation)+light.color*spec*light.shadowAttenuation*.5+reflection*_Metallic*.28;
    color+=base*_Glow*(.08+_CityNight*1.4);return half4(MixFog(color,i.fog),1);
   }
   ENDHLSL
  }
  UsePass "Universal Render Pipeline/Lit/ShadowCaster"
  UsePass "Universal Render Pipeline/Lit/DepthOnly"
 }
}
