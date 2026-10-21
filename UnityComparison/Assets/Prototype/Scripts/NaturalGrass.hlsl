#ifndef BUSINESS_NATURAL_GRASS
#define BUSINESS_NATURAL_GRASS
float2 GrassHash(float2 p)
{
    float3 q=frac(float3(p.x,p.y,p.x)*float3(.1031,.1030,.0973));
    q+=dot(q,q.yzx+33.33);
    return frac((q.xx+q.yz)*q.zy);
}
float GrassNoise(float2 p)
{
    float2 cell=floor(p),f=frac(p);f=f*f*(3-2*f);
    return lerp(lerp(GrassHash(cell).x,GrassHash(cell+float2(1,0)).x,f.x),
        lerp(GrassHash(cell+float2(0,1)).x,GrassHash(cell+1).x,f.x),f.y);
}
half3 GrassColour(float2 world)
{
    // World-space scales avoid a separate repeated tile on every square plot.
    float broad=GrassNoise(world*.072),patch=GrassNoise(world*.63);
    half3 c=lerp(half3(.083,.141,.035),half3(.168,.238,.074),broad*.65+patch*.35);
    float dry=smoothstep(.65,.88,GrassNoise(world*.19+31));
    return lerp(c,half3(.22,.208,.092),dry*.27);
}
#ifdef GRASS_TEXTURED
half3 GrassSurface(float3 position,inout half3 normal)
{
    float2 world=position.xz;
    // Scanned turf provides irregular blades and bare patches, with mipmaps for
    // distant views. No per-cell normals: these made the old turf look woven.
    float2 uv=world/18;
    half3 turf=SAMPLE_TEXTURE2D(_GrassMap,sampler_GrassMap,uv).rgb;
    half3 bump=UnpackNormal(SAMPLE_TEXTURE2D(_GrassNormal,sampler_GrassNormal,uv));
    normal=normalize(normal+half3(bump.x,0,bump.y)*.3);
    return turf*half3(.64,1.12,.68)*lerp(.87,1.14,GrassNoise(world*.075));
}
#endif
#endif
