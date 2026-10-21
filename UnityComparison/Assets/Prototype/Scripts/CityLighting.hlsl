#ifndef BUSINESS_CITY_LIGHTING
#define BUSINESS_CITY_LIGHTING
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

Light CityMainLight(float3 positionWS)
{
    Light light = GetMainLight();
#if defined(MAIN_LIGHT_CALCULATE_SHADOWS)
    // The city ground extends well beyond the shadow camera. Sampling the
    // clamped edge of its atlas there stretches one texel into a horizon stripe,
    // particularly at the low evening sun angle.
    half fade = GetMainLightShadowFade(positionWS);
    if (fade >= 1) return light;
    float4 shadowCoord = TransformWorldToShadowCoord(positionWS);
#if !defined(_MAIN_LIGHT_SHADOWS_SCREEN)
    if (any(shadowCoord.xy < 0) || any(shadowCoord.xy > 1)
        || shadowCoord.z <= 0 || shadowCoord.z >= 1) return light;
#endif
    light.shadowAttenuation = lerp(MainLightRealtimeShadow(shadowCoord), 1, fade);
#endif
    return light;
}
#endif
