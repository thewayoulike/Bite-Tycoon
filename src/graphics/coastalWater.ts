import * as THREE from 'three';

/** Seamless, shared ripple normals. Layered texture samples break up regular
 * sine-wave bands, while mipmaps keep the distant ocean stable. */
export function createWaterRippleMap(){
  const size=256,height=new Float32Array(size*size),pixels=new Uint8Array(size*size*4);
  const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let value=0,amplitude=.55;
    for(const frequency of [4,8,16,32,64]){
      const px=x/size*frequency,py=y/size*frequency,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
      const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
      const a=hash(ix%frequency,iy%frequency),b=hash((ix+1)%frequency,iy%frequency),c=hash(ix%frequency,(iy+1)%frequency),d=hash((ix+1)%frequency,(iy+1)%frequency);
      value+=((a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy)*amplitude;amplitude*=.48;
    }
    height[y*size+x]=value;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*15;
    const dz=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*15;
    const length=Math.hypot(dx,dz,1),i=(y*size+x)*4;
    pixels[i]=(dx/length*.5+.5)*255;pixels[i+1]=(dz/length*.5+.5)*255;
    pixels[i+2]=height[y*size+x]*255;pixels[i+3]=255;
  }
  const texture=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

/** Concentrate wave vertices at the playable shoreline, leaving the far ocean
 * coarse. This is still one mesh and never renders a second city reflection. */
export function createWaterSurface(){
  const xs=[-2500,-1500],zs=[-2500,230],positions:number[]=[],indices:number[]=[];
  for(let x=-950;x<=950;x+=10)xs.push(x);
  xs.push(1500,2500);
  for(let z=240;z<=1000;z+=8)zs.push(z);
  zs.push(1500,2500);
  for(const z of zs)for(const x of xs)positions.push(x,0,z);
  for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){
    const a=j*xs.length+i,b=a+1,c=a+xs.length,d=c+1;indices.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

/** Small shared reflection map: glass gets a sky reflection without rendering
 * the entire city again. The water uses the same sky colours analytically. */
export function createCoastalSkyReflection() {
  const width=256,height=128,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const elevation=Math.sin((y/(height-1)-.5)*Math.PI);
    const t=Math.max(0,elevation);
    const cloud=Math.pow(Math.max(0,Math.sin(x*.055+y*.07)*Math.sin(x*.028-y*.11)),3)*.24*(1-t*.7);
    const sky=elevation<0?[90,112,111]:[191-103*t,212-73*t,219-37*t];
    const i=(y*width+x)*4;
    for(let c=0;c<3;c++)data[i+c]=Math.min(255,sky[c]+cloud*100);
    data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  texture.mapping=THREE.EquirectangularReflectionMapping;
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;
  texture.needsUpdate=true;
  return texture;
}

export const coastalWaterVertex=`
varying vec3 world;
uniform float time;
#include <fog_pars_vertex>
void main(){
  vec4 p=modelMatrix*vec4(position,1.);
  float edge=302.+sin(p.x/84.)*8.+cos(p.x/39.)*3.;
  float swell=(sin(dot(p.xz,vec2(.85,.53))*.13-time*.65)*.28+sin(dot(p.xz,vec2(-.4,.916))*.071-time*.43)*.18);
  p.y+=swell*smoothstep(5.,35.,p.z-edge);
  world=p.xyz;
  vec4 mvPosition=viewMatrix*p;
  gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
}`;

// Analytic wave normals give moving, view-dependent reflections at every zoom.
// One draw call, no reflection cameras, framebuffer copies or huge textures.
export const coastalWaterFragment=`
uniform float time,night;
uniform vec4 wakes[3];
uniform sampler2D rippleMap;
varying vec3 world;
#include <fog_pars_fragment>
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
vec2 slope(vec2 p,vec2 direction,float frequency,float amplitude,float speed){
  return direction*(frequency*amplitude*cos(dot(p,direction)*frequency-time*speed));
}
void main(){
  vec2 p=world.xz;
  float edge=302.+sin(p.x/84.)*8.+cos(p.x/39.)*3.;
  float depth=max(0.,p.y-edge-4.5);
  float distanceToEye=length(cameraPosition-world);
  // The shortest ripples fade in the distance to avoid shimmering when zooming.
  float small=1.-smoothstep(90.,330.,distanceToEye);
  vec4 rippleA=texture2D(rippleMap,p*.035+vec2(time*.006,-time*.0036));
  vec2 turn=vec2(p.x*.8-p.y*.6,p.x*.6+p.y*.8);
  vec4 rippleB=texture2D(rippleMap,turn*.075+vec2(-time*.005,time*.007));
  vec4 rippleC=texture2D(rippleMap,p*.18+vec2(time*.012,time*.008));
  vec2 d=slope(p,vec2(.85,.53),.13,.28,.65)+slope(p,vec2(-.4,.916),.071,.18,.43)
    +(rippleA.xy*2.-1.)*.44+(rippleB.xy*2.-1.)*.34+(rippleC.xy*2.-1.)*.19*small;
  vec3 normal=normalize(vec3(-d.x,1.,-d.y));
  vec3 view=normalize(cameraPosition-world);
  vec3 reflected=reflect(-view,normal);
  float fresnel=.025+.975*pow(1.-max(0.,dot(normal,view)),5.);
  float cloud=noise(reflected.xz*5.+vec2(time*.003,0.));
  vec3 sky=mix(vec3(.3,.44,.54),vec3(.08,.2,.34),smoothstep(0.,.85,reflected.y));
  sky=mix(sky,vec3(.65,.72,.73),smoothstep(.6,.86,cloud)*.3);
  vec3 bottom=mix(vec3(.022,.19,.16),vec3(.006,.064,.10),smoothstep(0.,120.,depth));
  float sand=noise(p*.13+vec2(time*.018,0.));
  bottom+=vec3(.025,.035,.015)*sand*(1.-smoothstep(0.,35.,depth));
  vec3 color=mix(bottom,sky,fresnel*.85+.08);
  vec3 sun=normalize(vec3(-.28,.55,-.79));
  vec3 halfVector=normalize(sun+view);
  float spec=pow(max(0.,dot(normal,halfVector)),220.);
  float broad=pow(max(0.,dot(normal,halfVector)),22.);
  color+=vec3(1.,.94,.79)*(spec*1.4+broad*.055)*(1.-night*.94);
  float shoreNoise=noise(vec2(p.x*.19-time*.08,depth*.28));
  float surge=sin(depth*.72-time*.95+sin(p.x*.065)*.7+shoreNoise*.55);
  float foam=smoothstep(.73,.98,surge)*(1.-smoothstep(1.,19.,depth))*(.4+shoreNoise*.6);
  foam+=exp(-depth*.9)*(.25+shoreNoise*.25);
  foam+=smoothstep(.63,.78,rippleA.b)*smoothstep(.55,.7,rippleB.b)*.14;
  // Thin broken wakes trail the moving fishing boat, cruiser and sailing boat.
  for(int i=0;i<3;i++){
    vec2 offset=p-wakes[i].xy,heading=wakes[i].zw;
    float behind=-dot(offset,heading),across=abs(dot(offset,vec2(heading.y,-heading.x)));
    float envelope=smoothstep(2.,5.,behind)*(1.-smoothstep(8.,24.,behind));
    float line=1.-smoothstep(.25,.9,abs(across-(behind*.19+.5)));
    foam+=line*envelope*(.3+noise(p*.8+time*.3)*.4)*.38;
  }
  color=mix(color,vec3(.67,.76,.72),clamp(foam*.7,0.,.8));
  color=mix(color,color*.16+vec3(.006,.015,.029),night);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
