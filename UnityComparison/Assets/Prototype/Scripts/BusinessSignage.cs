using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;

public sealed partial class BusinessGameBridge
{
    readonly Dictionary<Material,Color> illuminatedSigns=new();
    readonly Dictionary<string,Material> neonLettering=new();
    readonly Dictionary<string,Material> neonHalos=new();
    bool? signsAtNight;
    void CreateBusinessSign(Transform root,BusinessProperty p)
    {
        if(p.kind is "land" or "park" or "plaza"||p.offer=="internal"||p.cityCategory=="petrol")return;
        var renderers=root.GetComponentsInChildren<Renderer>().Where(r=>r.enabled&&r.bounds.max.y>2).ToArray();
        if(p.preserveExterior&&sharedCity){
            var original=sharedCity.Find("Parcel:"+p.siteId)??(p.siteId?.StartsWith("site-")==true?sharedCity.Find("Lot:"+p.siteId.Substring(5)):null);
            if(original)renderers=original.GetComponentsInChildren<Renderer>(true).Where(r=>r.enabled&&r.bounds.max.y>2).ToArray();
        }
        if(renderers.Length==0)return;
        var bounds=renderers[0].bounds;foreach(var r in renderers)bounds.Encapsulate(r.bounds);
        if(p.kind is "restaurant" or "cafe" or "shop" or "cityshop" && (p.owned||p.offer!="lease")){
            CreateNeonShopfront(root,p,bounds);return;
        }
        float width=Mathf.Min(12,bounds.size.x*.88f),height=Mathf.Min(bounds.max.y-.7f,3.4f);
        var sign=Group(root,"Illuminated business name");sign.position=new(bounds.center.x,Mathf.Max(1.8f,height),bounds.min.z-.11f);
        var face=ColorMat(p.offer=="lease"&&!p.owned?"193F5D":p.kind=="plaza"?"3C334D":"163A32");
        illuminatedSigns[face]=face.color;signsAtNight=null;
        Box(sign,"Lightbox",Vector3.zero,new(width,1.0f,.16f),face);
        string text=p.offer=="lease"&&!p.owned?"TO LET  /  EMPTY PREMISES":p.name;
        Label(sign,text.ToUpperInvariant(),new(0,.03f,-.1f),Mathf.Min(.34f,width/Mathf.Max(20,text.Length)*1.9f));
        var textModel=sign.GetComponentInChildren<TextMesh>();var textBounds=textModel.GetComponent<Renderer>().bounds;
        textModel.transform.localScale*=Mathf.Min(width*.9f/Mathf.Max(.001f,textBounds.size.x),.58f/Mathf.Max(.001f,textBounds.size.y));
        var trim=ColorMat("A8C7BC");illuminatedSigns[trim]=trim.color;
        Box(sign,"Illuminated lower trim",new(0,-.48f,-.08f),new(width,.035f,.035f),trim);
        foreach(var renderer in sign.GetComponentsInChildren<Renderer>()){renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=false;}
    }
    void UpdateBusinessSigns(bool night)
    {
        if(signsAtNight==night)return;signsAtNight=night;
        foreach(var pair in illuminatedSigns){
            pair.Key.EnableKeyword("_EMISSION");pair.Key.SetColor("_EmissionColor",pair.Value*(night?1.5f:0));
        }
        foreach(var material in neonLettering.Values)material.SetFloat("_GlowStrength",night?2.2f:.65f);
        foreach(var material in neonHalos.Values)material.SetFloat("_Strength",night?.85f:.07f);
    }

    Material NeonInk(string hex){
        if(neonLettering.TryGetValue(hex,out var found))return found;
        var ink=new Material(fontMaterial){name="Neon letters "+hex};
        ColorUtility.TryParseHtmlString("#"+hex,out var colour);ink.SetColor("_GlowColor",colour);ink.SetFloat("_GlowStrength",frame?.night==true?2.2f:.65f);
        neonLettering[hex]=ink;signsAtNight=null;return ink;
    }
    void NeonWords(Transform root,string words,Vector3 at,float width,float height,string colour){
        var textRoot=Group(root,"Neon lettering");textRoot.localPosition=at;
        Label(textRoot,words,Vector3.zero,.6f);
        var text=textRoot.GetComponentInChildren<TextMesh>();var renderer=text.GetComponent<Renderer>();
        var bounds=renderer.bounds;text.transform.localScale*=Mathf.Min(width/Mathf.Max(.001f,bounds.size.x),height/Mathf.Max(.001f,bounds.size.y));
        renderer.sharedMaterial=NeonInk(colour);renderer.shadowCastingMode=ShadowCastingMode.Off;
    }
    void CreateNeonShopfront(Transform root,BusinessProperty p,Bounds bounds){
        uint hash=2166136261;foreach(char c in p.id)hash=unchecked((hash^c)*16777619);
        string category=p.cityCategory??"",primary=new[]{"49DDEB","FA6FC8","FFC66B","9FE485"}[hash%4];
        string secondary=primary=="49DDEB"?"FA6FC8":"49DDEB";
        bool barber=category=="barber",coffee=p.kind=="cafe"||p.name.ToLowerInvariant().Contains("coffee");
        if(barber){primary="49DDEB";secondary="FFC66B";}
        float width=Mathf.Min(12,bounds.size.x*.88f);
        var sign=Group(root,"Neon shop nameboard");sign.position=new(bounds.center.x,Mathf.Max(2.1f,Mathf.Min(bounds.max.y-.9f,3.8f)),bounds.min.z-.16f);
        Box(sign,"Dark enamel backing",Vector3.zero,new(width,1.3f,.15f),ColorMat("142126"));
        NeonHalo(sign,width,1.3f,primary);
        var tube=ColorMat(primary);illuminatedSigns[tube]=tube.color;signsAtNight=null;
        foreach(int edge in new[]{-1,1}){
            Box(sign,"Neon border tube",new(0,edge*.59f,-.095f),new(width-.28f,.025f,.035f),tube);
            Box(sign,"Neon border tube",new(edge*(width/2-.14f),0,-.095f),new(.025f,1.18f,.035f),tube);
        }
        NeonWords(sign,p.name.ToUpperInvariant(),new(.15f,.13f,-.11f),width-.8f,.59f,primary);
        string line=barber?"CUTS  •  SHAVES":coffee?"COFFEE  •  BAKES":category=="bakery"?"FRESHLY BAKED":category=="pharmacy"?"HEALTH  •  CARE":p.kind is "restaurant" or "cafe"?"EAT  •  DRINK  •  ENJOY":"YOUR NEIGHBOURHOOD SHOP";
        NeonWords(sign,line,new(0,-.35f,-.11f),width*.75f,.22f,secondary);
        // A small window sign gives streets a varied neon rhythm without extra lights.
        if(width>5){
            var badge=Group(root,"Neon window badge");badge.position=new(bounds.center.x+width*.3f,2,bounds.min.z-.14f);
            Box(badge,"Badge backing",Vector3.zero,new(2.15f,1.32f,.09f),ColorMat("142126"));
            NeonHalo(badge,2.15f,1.32f,secondary,-.06f);
            NeonWords(badge,barber?"BARBER":coffee?"COFFEE":category=="pharmacy"?"CARE":category=="bakery"?"BAKERY":p.kind=="shop"?"MARKET":"DINING",new(0,-.34f,-.07f),1.85f,.27f,secondary);
            var icon=ColorMat(secondary);illuminatedSigns[icon]=icon.color;
            if(barber){
                for(int stripe=0;stripe<5;stripe++)Box(badge,"Barber pole neon stripe",new(0,-.04f+stripe*.12f,-.08f),new(.38f,.07f,.025f),stripe%2==0?tube:icon);
                foreach(int side in new[]{-1,1})Box(badge,"Barber pole endcap",new(0,.2f+side*.33f,-.08f),new(.5f,.045f,.025f),icon);
            }else{
                // A cup for cafes and restaurants; a shopping bag for retailers.
                bool cup=coffee||p.kind is "restaurant" or "cafe";
                foreach(int side in new[]{-1,1})Box(badge,"Neon symbol side",new(side*.29f,.18f,-.08f),new(.035f,.42f,.025f),icon);
                Box(badge,"Neon symbol base",new(0,-.03f,-.08f),new(.6f,.035f,.025f),icon);
                Box(badge,"Neon symbol rim",new(0,.39f,-.08f),new(.6f,.035f,.025f),icon);
                if(cup){
                    Box(badge,"Cup handle",new(.43f,.2f,-.08f),new(.035f,.25f,.025f),icon);
                    foreach(int side in new[]{-1,1})Box(badge,"Cup handle ends",new(.36f,.2f+side*.125f,-.08f),new(.17f,.035f,.025f),icon);
                    foreach(int side in new[]{-1,1})Box(badge,"Coffee steam",new(side*.12f,.52f,-.08f),new(.025f,.12f,.025f),tube);
                }else{
                    Box(badge,"Bag handle top",new(0,.55f,-.08f),new(.28f,.035f,.025f),icon);
                    foreach(int side in new[]{-1,1})Box(badge,"Bag handle side",new(side*.14f,.47f,-.08f),new(.035f,.16f,.025f),icon);
                }
            }
        }
        foreach(var renderer in sign.GetComponentsInChildren<Renderer>()){renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=false;}
    }
    void NeonHalo(Transform parent,float width,float height,string hex,float z=-.1f){
        string key=hex+":"+width.ToString("F2")+":"+height;
        if(!neonHalos.TryGetValue(key,out var material)){
            material=new Material(Resources.Load<Shader>("NeonHalo")){name="Local neon halo "+hex,enableInstancing=true};
            ColorUtility.TryParseHtmlString("#"+hex,out var colour);material.SetColor("_Tint",colour);
            material.SetVector("_Size",new Vector4(width,height,0,0));material.SetFloat("_Strength",frame?.night==true?.85f:.07f);
            neonHalos[key]=material;signsAtNight=null;
        }
        var glow=GameObject.CreatePrimitive(PrimitiveType.Quad);glow.name="Bounded neon glow";glow.transform.SetParent(parent,false);
        glow.transform.localPosition=new(0,0,z);glow.transform.localScale=new(width+.8f,height+.8f,1);
        Destroy(glow.GetComponent<Collider>());var renderer=glow.GetComponent<Renderer>();renderer.sharedMaterial=material;renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=false;
    }
}
