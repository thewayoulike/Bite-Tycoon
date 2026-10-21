Shader "Business/DriftingSmoke"
{
 SubShader {
  Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
  Pass {
   Blend SrcAlpha OneMinusSrcAlpha ZWrite Off Cull Off
   HLSLPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
   struct A { float4 positionOS:POSITION; float2 uv:TEXCOORD0; half4 color:COLOR; };
   struct V { float4 pos:SV_POSITION; float2 uv:TEXCOORD0; half4 color:COLOR; };
   V vert(A i) { V o; o.pos=TransformObjectToHClip(i.positionOS.xyz); o.uv=i.uv; o.color=i.color; return o; }
   half4 frag(V i):SV_Target { float r=length(i.uv-.5)*2; float alpha=pow(saturate(1-r),2)*i.color.a; return half4(i.color.rgb,alpha); }
   ENDHLSL
  }
 }
}
