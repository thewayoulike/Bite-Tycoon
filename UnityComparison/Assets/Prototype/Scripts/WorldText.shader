Shader "BusinessSimulator/WorldText"
{
    Properties {
        _MainTex ("Font atlas", 2D) = "white" {}
        _GlowColor ("Neon colour", Color) = (0,0,0,0)
        _GlowStrength ("Local neon glow", Range(0,3)) = 0
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            ZTest LEqual
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            float4 _MainTex_TexelSize;
            half4 _GlowColor;
            half _GlowStrength;
            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; half4 color : COLOR; };
            struct Varyings { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; half4 color : COLOR; };
            Varyings vert(Attributes input) { Varyings o; o.positionCS=TransformObjectToHClip(input.positionOS.xyz); o.uv=input.uv; o.color=input.color; return o; }
            half4 frag(Varyings input) : SV_Target {
                half glyph=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,input.uv).a;
                if(_GlowStrength<.01)return half4(input.color.rgb,input.color.a*glyph);
                float2 d=_MainTex_TexelSize.xy*1.7;
                half glow=0;
                for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)
                    glow+=SAMPLE_TEXTURE2D(_MainTex,sampler_MainTex,input.uv+float2(x,y)*d).a/9;
                half alpha=max(glyph,glow*.8);
                half3 core=lerp(_GlowColor.rgb,half3(1,1,1),.12)*_GlowStrength;
                half3 colour=lerp(_GlowColor.rgb*_GlowStrength,core,glyph);
                return half4(colour,alpha*input.color.a);
            }
            ENDHLSL
        }
    }
}
