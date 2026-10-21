Shader "Business/CoastalWater"
{
 Properties {
  _RippleMap("Original ocean ripple normals",2D)="bump" {}
  _Wind("Wind",Float)=0
  _Night("Night",Float)=0
  _Wake0("Boat wake 1",Vector)=(0,0,0,0)
  _Wake1("Boat wake 2",Vector)=(0,0,0,0)
  _Wake2("Boat wake 3",Vector)=(0,0,0,0)
 }
 SubShader {
  Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" }
  Pass {
   Tags { "LightMode"="UniversalForward" }
   HLSLPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #pragma multi_compile_fog
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
   TEXTURE2D(_RippleMap); SAMPLER(sampler_RippleMap);
   CBUFFER_START(UnityPerMaterial)
    float _Wind,_Night;
    float4 _Wake0,_Wake1,_Wake2;
   CBUFFER_END
   struct A { float4 positionOS:POSITION; };
   struct V { float4 positionCS:SV_POSITION; float3 world:TEXCOORD0; float fog:TEXCOORD1; };
   // The shared city's sand mesh extends five metres beyond coastEdge.
   float shore(float x){return 307+sin(x/84)*8+cos(x/39)*3;}
   // Long swell is geometry. Filtered normal maps prevent the old ripple grid
   // from shimmering when the player zooms out.
   float swell(float2 p) {
    float t=_Time.y,wind=saturate(_Wind);
    return (sin(dot(p,float2(.15,.08))-t*.78)*.16
           +sin(dot(p,float2(-.07,.21))-t*1.05)*.10
           +sin(dot(p,float2(.29,.035))-t*1.18)*.055)*lerp(.65,1.3,wind);
   }
   V vert(A i){
    V o;o.world=TransformObjectToWorld(i.positionOS.xyz);
    o.world.y+=swell(o.world.xz)*smoothstep(0,14,o.world.z-shore(o.world.x));
    o.positionCS=TransformWorldToHClip(o.world);o.fog=ComputeFogFactor(o.positionCS.z);return o;
   }
   float boatWake(float2 p,float4 boat,float noise){
    float2 delta=p-boat.xy;
    float along=-dot(delta,boat.zw),across=abs(dot(delta,float2(-boat.w,boat.z)));
    float envelope=smoothstep(.6,2,along)*(1-smoothstep(5,22,along));
    float width=.7+along*.24;
    float edge=1-smoothstep(.12,.65,abs(across-width));
    float trail=(1-smoothstep(.1,width*.65,across))*.45;
    return (edge+trail)*envelope*smoothstep(.28,.72,noise);
   }
   half4 frag(V i):SV_Target {
    float2 p=i.world.xz;float t=_Time.y,wind=saturate(_Wind),shoreDistance=p.y-shore(p.x);
    float speed=lerp(.38,.95,wind);
    float4 a=SAMPLE_TEXTURE2D(_RippleMap,sampler_RippleMap,p/22+float2(t*.011,t*.004)*speed);
    float2 rotated=float2(p.x*.8-p.y*.6,p.x*.6+p.y*.8);
    float4 b=SAMPLE_TEXTURE2D(_RippleMap,sampler_RippleMap,rotated/8.3+float2(-t*.016,t*.009)*speed);
    float2 smallSlope=(a.rg*2-1)+(b.rg*2-1)*.4;
    float h=swell(p);
    float2 longSlope=float2(h-swell(p+float2(.25,0)),h-swell(p+float2(0,.25)))*4;
    float cameraDistance=distance(_WorldSpaceCameraPos,i.world);
    float distanceFilter=lerp(1,.2,smoothstep(90,500,cameraDistance));
    float2 slope=(longSlope+smallSlope*lerp(.42,1.05,wind))*distanceFilter;
    float3 n=normalize(float3(slope.x,1,slope.y));
    float3 v=normalize(_WorldSpaceCameraPos-i.world);Light sun=GetMainLight();
    float nv=saturate(dot(n,v)),fresnel=.025+.975*pow(1-nv,5);
    float3 reflected=reflect(-v,n);
    float3 horizon=lerp(float3(.25,.39,.47),float3(.035,.06,.09),_Night);
    float3 zenith=lerp(float3(.07,.19,.34),float3(.008,.018,.04),_Night);
    float3 sky=lerp(horizon,zenith,pow(saturate(reflected.y),.65));
    float3 shallow=float3(.035,.26,.22),deep=float3(.008,.075,.105);
    float depthBlend=1-exp(-max(0,shoreDistance)*.034);
    float3 body=lerp(shallow,deep,depthBlend)*lerp(1,.23,_Night);
    body*=.85+.28*a.a+.18*saturate(dot(n,sun.direction));
    body+=float3(.018,.09,.075)*saturate(h+.12)*saturate(dot(v,-sun.direction))*(1-_Night);
    float3 color=lerp(body,sky,fresnel);
    float power=lerp(310,85,saturate(cameraDistance/260))*(1-wind*.32);
    float specular=pow(saturate(dot(n,normalize(v+sun.direction))),power)*2.2;
    color+=sun.color*specular*(.35+.65*(1-fresnel));
    float breakup=smoothstep(.24,.65,a.a*.55+b.a*.45);
    float surge=sin(t*.72+p.x*.045)*.7+sin(p.x*.13+t*.31)*.35;
    float foamEdge=1-smoothstep(.25,1.7,abs(shoreDistance-1.5-surge));
    float surf=smoothstep(.65,.98,sin(shoreDistance*.9+t*.8+b.a*.9));
    float foamDetail=SAMPLE_TEXTURE2D(_RippleMap,sampler_RippleMap,p*.6+float2(-t*.02,t*.03)).a;
    float foam=(foamEdge*.65+surf*(1-smoothstep(2,12,shoreDistance))*.35)*breakup*step(0,shoreDistance);
    foam*=.35+.65*smoothstep(.2,.72,foamDetail);
    float wake=boatWake(p,_Wake0,b.a)+boatWake(p,_Wake1,b.a)+boatWake(p,_Wake2,b.a);
    foam=saturate(foam+wake*.72);
    color=lerp(color,lerp(float3(.73,.85,.81),float3(.12,.18,.22),_Night),foam);
    return half4(MixFog(color,i.fog),1);
   }
   ENDHLSL
  }
 }
}
