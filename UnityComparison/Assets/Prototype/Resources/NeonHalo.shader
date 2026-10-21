Shader "BusinessSimulator/NeonHalo"
{
    Properties {
        _Tint ("Tube colour", Color) = (0.2,0.8,1,1)
        _Size ("Board dimensions", Vector) = (12,1.3,0,0)
        _Strength ("Night glow", Range(0,2)) = 1
    }
    SubShader {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" }
        Pass {
            Blend SrcAlpha One
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            half4 _Tint; float4 _Size; half _Strength;
            struct A { float4 positionOS:POSITION; float2 uv:TEXCOORD0; };
            struct V { float4 positionCS:SV_POSITION; float2 uv:TEXCOORD0; };
            V vert(A i) { V o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz);o.uv=i.uv;return o; }
            half4 frag(V i):SV_Target {
                float2 p=(i.uv-.5)*(_Size.xy+.8);
                float2 q=abs(p)-(_Size.xy*.5-.18);
                float d=length(max(q,0))+min(max(q.x,q.y),0)-.09;
                half core=exp(-abs(d)*85),halo=exp(-abs(d)*10)*.45;
                // Geometry-bounded glow: no screen-wide bloom or bright light sources.
                return half4(_Tint.rgb*1.25+core*.2,(core+halo)*_Strength);
            }
            ENDHLSL
        }
    }
}
