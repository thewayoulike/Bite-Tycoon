using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public sealed partial class BusinessGameBridge
{
    public GameObject[] itemAssets=Array.Empty<GameObject>();
    readonly Dictionary<string,GameObject> itemModels=new();
    Transform itemCache;
    Transform CachedItem(Transform parent,string key,Action<Transform> build)
    {
        if(!itemCache){itemCache=Group(transform,"Item mesh library");itemCache.gameObject.SetActive(false);}
        if(!itemModels.TryGetValue(key,out var source)){
            var root=Group(itemCache,key);build(root);
            // One mesh per material, shared by every facing of this product.
            foreach(var group in root.GetComponentsInChildren<MeshFilter>(true).Where(f=>f.sharedMesh.isReadable&&f.GetComponent<MeshRenderer>()).GroupBy(f=>f.GetComponent<MeshRenderer>().sharedMaterial).ToArray()){
                var mesh=new Mesh{name=key};mesh.indexFormat=UnityEngine.Rendering.IndexFormat.UInt32;
                mesh.CombineMeshes(group.Select(f=>new CombineInstance{mesh=f.sharedMesh,transform=root.worldToLocalMatrix*f.transform.localToWorldMatrix}).ToArray());
                var batch=Group(root,"Item geometry");batch.gameObject.AddComponent<MeshFilter>().sharedMesh=mesh;batch.gameObject.AddComponent<MeshRenderer>().sharedMaterial=group.Key;
                foreach(var f in group){f.GetComponent<MeshRenderer>().enabled=false;}
            }
            source=root.gameObject;itemModels[key]=source;
        }
        return Instantiate(source,parent).transform;
    }
    GameObject Piece(Transform root,string name,PrimitiveType type,Vector3 at,Vector3 size,string color,Vector3 rotation=default)
    {
        var go=GameObject.CreatePrimitive(type);go.name=name;go.transform.SetParent(root,false);go.transform.localPosition=at;go.transform.localScale=size;go.transform.localEulerAngles=rotation;
        var collider=go.GetComponent<Collider>();if(Application.isPlaying)Destroy(collider);else DestroyImmediate(collider);
        go.GetComponent<Renderer>().sharedMaterial=ColorMat(color.TrimStart('#'));return go;
    }
    void Ball(Transform r,Vector3 p,Vector3 s,string c)=>Piece(r,"Shaped food",PrimitiveType.Sphere,p,s,c);
    void Cube(Transform r,Vector3 p,Vector3 s,string c)=>Piece(r,"Item detail",PrimitiveType.Cube,p,s,c);
    void Disc(Transform r,float radius,float height,float y,string c,float x=0,float z=0)=>Piece(r,"Round item",PrimitiveType.Cylinder,new(x,y,z),new(radius*2,height/2,radius*2),c);
    bool ImportedItem(Transform root,string key,float size,float lift=0)
    {
        var source=itemAssets.FirstOrDefault(a=>a&&a.name==key);if(!source)return false;
        var model=Instantiate(source,root);var b=LocalModelBounds(model.transform);float scale=size/Mathf.Max(b.size.x,b.size.z);
        model.transform.localScale=Vector3.one*scale;model.transform.localPosition=-new Vector3(b.center.x,b.min.y,b.center.z)*scale+Vector3.up*lift;return true;
    }
    Transform CreateDish(Transform parent,BusinessMeal meal)
    {
        return CachedItem(parent,"Dish: "+meal.name+" / "+meal.id,r=>{
            string kind=meal.kind??"plate";var ingredients=meal.ingredients??Array.Empty<string>();
            bool Has(string id)=>ingredients.Contains(id);
            string protein=Has("fish")||Has("salmon")?"E3A080":Has("beef")||Has("lamb")?"774A32":Has("chicken")?"C99450":Has("shrimp")?"DC9477":"6F9C43";
            string sauce=Has("tomato")?"AD4D2D":Has("cream")||Has("milk")?"DFC98D":Has("soy_sauce")?"785037":"C7A85E";
            Disc(r,.205f,.016f,.008f,"DDDCD0");Disc(r,.183f,.009f,.019f,"F3EEE0");
            if(kind is "coffee" or "drink"){
                Cup(r,kind=="coffee",Has("milk"),Has("chocolate")?"5D3627":Has("lemon")?"E6CF79":Has("soda_syrup")?"573424":"DCA555");return;
            }
            if(kind=="burger"){
                Disc(r,.11f,.035f,.04f,"C99246");Disc(r,.105f,.035f,.075f,Has("chicken")?"BE914F":"654134");
                for(int n=0;n<6;n++){float a=n*Mathf.PI/3;Ball(r,new(Mathf.Cos(a)*.07f,.099f,Mathf.Sin(a)*.07f),new(.12f,.016f,.075f),"74963F");}
                if(Has("cheese"))Cube(r,new(0,.115f,0),new(.18f,.012f,.18f),"F0BD54");
                if(Has("tomato"))Disc(r,.09f,.015f,.13f,"B14D35");
                Ball(r,new(0,.145f,0),new(.23f,.1f,.23f),"D8A157");
                for(int n=0;n<10;n++)Ball(r,new(Mathf.Sin(n*2.4f)*.073f,.185f,Mathf.Cos(n*2.4f)*.073f),new(.012f,.006f,.005f),"F3DCAA");
            }else if(kind=="pizza"){
                if(!ImportedItem(r,"ItemPizza",.36f,.024f)){Disc(r,.178f,.025f,.038f,"C99B5F");Disc(r,.158f,.012f,.055f,"D3AE52");}
                if(Has("beef")||Has("sausage"))for(int n=0;n<6;n++)Disc(r,.025f,.008f,.072f,"A84D37",Mathf.Sin(n*2.4f)*.11f,Mathf.Cos(n*2.4f)*.11f);
            }else if(kind=="sushi"){
                for(int n=0;n<4;n++){float x=(n%2-.5f)*.14f,z=(n/2-.5f)*.14f;Disc(r,.055f,.065f,.058f,"263E30",x,z);Disc(r,.048f,.006f,.093f,"E9E2C6",x,z);Disc(r,.021f,.008f,.098f,Has("avocado")?"8BA755":"DD927A",x,z);}
            }else if(kind=="fries"){
                for(int n=0;n<16;n++)Piece(r,"Golden fries",PrimitiveType.Cube,new((n%4-1.5f)*.046f,.047f+n/4*.018f,Mathf.Sin(n)*.035f),new(.027f,.024f,.2f),n%3==0?"CEA04A":"E4BC65",new(0,Mathf.Sin(n)*26,0));
                if(Has("cheese"))for(int n=0;n<5;n++)Cube(r,new(-.08f+n*.04f,.14f,0),new(.014f,.007f,.15f),"F2C24F");
                if(Has("fish"))Ball(r,new(0,.15f,0),new(.26f,.065f,.11f),"BC8C48");
                if(Has("beef"))for(int n=0;n<5;n++)Ball(r,new(-.08f+n*.04f,.145f,Mathf.Sin(n)*.06f),new(.047f,.03f,.04f),"8E4F35");
            }else if(kind is "sandwich" or "hotdog"){
                if(kind=="hotdog"&&ImportedItem(r,"ItemHotdog",.29f,.024f))return;
                Cube(r,new(0,.047f,0),new(.24f,.035f,.19f),"CA995A");Cube(r,new(0,.073f,0),new(.23f,.016f,.18f),Has("avocado")?"83A652":"638744");
                Cube(r,new(0,.091f,0),new(.22f,.02f,.17f),protein);Cube(r,new(0,.115f,0),new(.24f,.035f,.19f),"DDBC7C");
            }else if(kind=="croissant"){
                var points=Enumerable.Range(0,25).Select(n=>{float a=.25f+n*2.64f/24;return new Vector3(Mathf.Cos(a)*.13f,.06f,Mathf.Sin(a)*.09f-.05f);}).ToArray();
                Tube(r,points,Enumerable.Range(0,25).Select(n=>.009f+Mathf.Sin(n*Mathf.PI/24)*.046f).ToArray(),"CE9B55");
                for(int n=0;n<5;n++)Ball(r,new((n-2)*.035f,.104f,.022f),new(.022f,.014f,.045f),Has("chocolate")?"745038":"E2B875");
            }
            else if(kind is "cake" or "pie"){
                if(kind=="pie"&&ImportedItem(r,"ItemPie",.3f,.024f))return;
                Cube(r,new(0,.075f,0),new(.19f,.1f,.17f),Has("chocolate")?"674235":"D6AF78");Cube(r,new(0,.13f,0),new(.195f,.025f,.175f),Has("chocolate")?"483020":"EEE0B7");
                Ball(r,new(0,.16f,0),new(.06f,.04f,.06f),Has("fruit")?"B14D4B":"EEE2C8");
            }else if(kind=="pancakes"){
                for(int n=0;n<3;n++)Disc(r,.125f,.028f,.04f+n*.029f,"CF9C51");Disc(r,.085f,.005f,.116f,"A56D2F");Cube(r,new(0,.126f,0),new(.055f,.015f,.047f),"EDCF76");
            }else if(kind is "steak" or "fish" or "chicken"){
                string imported=kind=="steak"?"ItemSteak":kind=="fish"?"ItemSalmon":"ItemChicken";
                if(!ImportedItem(r,imported,.26f,.024f))Ball(r,new(-.03f,.06f,0),new(.24f,.075f,.14f),protein);
                for(int n=0;n<4;n++)Cube(r,new(-.1f+n*.05f,.106f,0),new(.008f,.005f,.11f),"674A34");
                for(int n=0;n<4;n++)Ball(r,new(.12f,.045f,-.11f+n*.065f),new(.07f,.045f,.055f),n%2==0?"76A148":"D2B576");
            }else{
                bool bowl=kind is "bowl" or "soup" or "dessert" or "salad" or "pasta";
                if(bowl){Disc(r,.155f,.07f,.059f,"D2DCCD");Disc(r,.145f,.012f,.1f,kind=="salad"?"749D43":kind=="dessert"?"DFD0AE":sauce);}
                float y=bowl?.12f:.045f;
                if(kind=="dessert"){for(int n=0;n<3;n++)Ball(r,new((n-1)*.07f,y+.025f,0),new(.11f,.1f,.11f),Has("chocolate")?"82533C":n%2==0?"E8D3A2":"D9A09F");}
                else for(int n=0;n<12;n++){
                    float a=n*2.399f,rad=.035f+(n%3)*.038f;
                    string c=kind=="salad"?(n%4==0?"BB5942":n%2==0?"8AAD50":"5F873C"):kind=="pasta"?"E3BD74":n%3==0?protein:Has("rice")?"EAE0BF":n%2==0?"D8B97B":"74964C";
                    Ball(r,new(Mathf.Cos(a)*rad,y+(n%2)*.012f,Mathf.Sin(a)*rad),kind=="pasta"?new(.09f,.016f,.025f):new(.055f,.03f,.045f),c);
                }
                if(Has("egg")&&kind!="dessert"){Ball(r,new(.03f,y+.02f,0),new(.1f,.018f,.08f),"F1EADA");Ball(r,new(.03f,y+.033f,0),new(.04f,.015f,.04f),"E4B23C");}
            }
        });
    }
    void Cup(Transform r,bool coffee,bool milk,string liquid)
    {
        float height=coffee?.12f:.19f;
        Disc(r,.052f,height,.027f+height/2,coffee?"E3DFD0":"B1C8C0");Disc(r,.046f,.007f,.029f+height,coffee?(milk?"C6A578":"573B2B"):liquid);
        if(coffee){var handle=Group(r,"Cup handle");for(int n=0;n<9;n++){float a=-Mathf.PI/2+n*Mathf.PI/8;Ball(handle,new(.05f+Mathf.Cos(a)*.032f,.09f+Mathf.Sin(a)*.035f,0),new(.013f,.014f,.013f),"E3DFD0");}}
        else Cube(r,new(.022f,.27f,0),new(.007f,.13f,.007f),"F1E8CF");
    }
    void ShelfItem(Transform facing,BusinessStock item)
    {
        var marker=PrepareFacing(facing);
        if(marker.product==item.id)return;marker.product=item.id;
        foreach(Transform child in facing){child.gameObject.SetActive(false);Destroy(child.gameObject);}
        var renderer=facing.GetComponent<Renderer>();if(renderer)renderer.enabled=false;
        facing.localScale=Vector3.one;facing.localRotation=Quaternion.identity;
        facing.localPosition=marker.basePosition;
        var product=CreateProduct(facing,item.id,item.form,item.color,item.category);product.name=item.name??item.id;
    }
    BusinessShelfItem PrepareFacing(Transform facing)
    {
        var marker=facing.GetComponent<BusinessShelfItem>();if(marker)return marker;
        marker=facing.gameObject.AddComponent<BusinessShelfItem>();marker.basePosition=facing.localPosition;
        // Stock-product groups have a zero pivot and offset children. Produce
        // spheres have a centre pivot. Measure the support plane before replacing either.
        var renderers=facing.GetComponentsInChildren<Renderer>(true);
        if(renderers.Length>0){var b=renderers[0].bounds;foreach(var r in renderers)b.Encapsulate(r.bounds);marker.basePosition=facing.parent.InverseTransformPoint(new Vector3(b.center.x,b.min.y,b.center.z));}
        return marker;
    }
    Transform CreateProduct(Transform parent,string id,string form="",string color="B8A279",string category="")
    {
        return CachedItem(parent,"Product: "+id,r=>{
            if(form=="produce"||category=="Produce"){Produce(r,id);return;}
            if(form=="loaf"||category=="Bakery"){
                if(ImportedItem(r,"ItemBread",.28f))return;
                Ball(r,new(0,.07f,0),new(.28f,.14f,.18f),"C49A59");for(int n=0;n<4;n++)Cube(r,new(-.09f+n*.06f,.13f,0),new(.01f,.007f,.1f),"E0BD7E");return;
            }
            string c=string.IsNullOrEmpty(color)?"B8A279":color.TrimStart('#');
            if(form=="bottle"||form=="jar"||form=="can"){
                float h=form=="bottle"?.27f:.18f;
                Disc(r,.065f,h,h/2,c);Disc(r,form=="bottle"?.028f:.065f,.04f,h+.02f,"D9DCCE");
                Cube(r,new(0,h*.5f,-.064f),new(.092f,h*.42f,.009f),"F0E9D7");
                if(id.Contains("soap"))Cube(r,new(.025f,h+.055f,0),new(.1f,.015f,.025f),"CCD5D1");
            }else if(form=="tray"){
                Cube(r,new(0,.014f,0),new(.28f,.028f,.18f),"E5E1D6");
                if(id=="eggs")for(int n=0;n<6;n++)Ball(r,new((n%3-1)*.075f,.055f,(n/3-.5f)*.075f),new(.055f,.072f,.055f),"D8C8A8");
                else if(!ImportedItem(r,id.Contains("fish")||id=="salmon"?"ItemSalmon":id=="beef"||id=="lamb"?"ItemSteak":"ItemChicken",.22f,.03f))Ball(r,new(0,.055f,0),new(.22f,.06f,.13f),"C2907E");
            }else if(form=="roll"){
                for(int n=0;n<2;n++){Disc(r,.065f,.17f,.085f,"ECE8DD",(n-.5f)*.14f);Disc(r,.021f,.003f,.173f,"99816A",(n-.5f)*.14f);}
            }else if(form=="flower"){
                Disc(r,.045f,.11f,.055f,"BEAA8D");for(int n=0;n<5;n++){Cube(r,new((n-2)*.02f,.18f,0),new(.008f,.22f,.008f),"578452");Ball(r,new((n-2)*.03f,.29f,0),new(.08f,.055f,.08f),n%2==0?"C78594":"E5C27A");}
            }else if(form=="textile"){
                for(int n=0;n<3;n++)Cube(r,new(0,.023f+n*.035f,0),new(.25f,.035f,.18f),n%2==0?c:"C7C7B7");
            }else{
                bool bag=form=="bag";Cube(r,new(0,.14f,0),new(.18f,.28f,bag?.1f:.09f),c);
                if(bag){Cube(r,new(0,.287f,0),new(.18f,.012f,.065f),"DCC8A2");}
                Cube(r,new(0,.16f,-.056f),new(.135f,.12f,.008f),"EEE6D2");
                // A clear product pictogram, avoiding tiny unreadable text.
                Ball(r,new(0,.16f,-.064f),new(.07f,.07f,.01f),id.Contains("chocolate")||id=="coffee"?"6C4835":id=="milk"?"7395AA":c);
            }
        });
    }
    void Produce(Transform r,string id)
    {
        if(id=="tomatoes"&&ImportedItem(r,"ItemTomato",.18f))return;
        if(id=="lemons"&&ImportedItem(r,"ItemLemon",.21f))return;
        if(id=="peppers"&&ImportedItem(r,"ItemPepper",.2f))return;
        if(id=="bananas"){
            for(int finger=0;finger<3;finger++){
                var points=Enumerable.Range(0,17).Select(n=>{float a=-1.12f+n*.14f;return new Vector3(Mathf.Sin(a)*.15f,.035f+(1-Mathf.Cos(a))*.12f,(finger-1)*.045f);}).ToArray();
                Tube(r,points,Enumerable.Range(0,17).Select(n=>.009f+Mathf.Sin(n*Mathf.PI/16)*.014f).ToArray(),"E2C052");
                Ball(r,points[0],Vector3.one*.019f,"8B713C");Ball(r,points[^1],Vector3.one*.019f,"8B713C");
            }return;
        }
        if(id=="carrots"){
            Tube(r,Enumerable.Range(0,13).Select(n=>new Vector3(-.14f+n*.021f,.039f,Mathf.Sin(n*.4f)*.006f)).ToArray(),Enumerable.Range(0,13).Select(n=>.002f+n*.0026f).ToArray(),"DA8737");
            for(int n=0;n<4;n++)Piece(r,"Carrot leaves",PrimitiveType.Cube,new(.13f,.05f,(n-1.5f)*.018f),new(.09f,.012f,.015f),"608C42",new(0,n*15,0));return;
        }
        if(id is "lettuce" or "broccoli"){
            Disc(r,.028f,.065f,.032f,"88A760");for(int n=0;n<15;n++){float a=n*2.4f;var leaf=Piece(r,"Vegetable leaf",PrimitiveType.Sphere,new(Mathf.Sin(a)*.045f,.075f+(n%3)*.018f,Mathf.Cos(a)*.045f),id=="lettuce"?new(.12f,.023f,.095f):new(.07f,.06f,.075f),n%2==0?"659342":"83A955",new(n*19,n*37,25));}return;
        }
        if(id is "grapes" or "blueberries" or "strawberries"){
            for(int n=0;n<12;n++){float a=n*2.4f,rad=.025f+(n%3)*.025f;Ball(r,new(Mathf.Sin(a)*rad,.035f+n%3*.018f,Mathf.Cos(a)*rad),Vector3.one*(id=="strawberries"?.065f:.04f),id=="strawberries"?"B84B3F":id=="blueberries"?"52627E":"78618A");}return;
        }
        if(id=="mushrooms"){
            for(int n=0;n<3;n++){Disc(r,.016f,.045f,.023f,"D9CFB5",(n-1)*.066f);Ball(r,new((n-1)*.066f,.06f,0),new(.08f,.055f,.08f),"B9AA8D");}return;
        }
        string c=id=="apples"?"B94E39":id=="oranges"?"DA8C35":id=="lemons"?"DCCA55":id=="tomatoes"?"BE4D32":id=="potatoes"?"B49A6E":id=="onions"?"C6AA7D":id=="avocados"?"5A7243":"93A552";
        bool longFruit=id is "cucumber" or "pears" or "avocados";
        Ball(r,new(0,.085f,0),new(longFruit?.12f:.17f,.17f,id=="cucumber"?.3f:.15f),c);
        if(id=="pears")Ball(r,new(0,.15f,0),new(.08f,.09f,.08f),c);
        if(id is "apples" or "pears" or "tomatoes" or "oranges"){
            Cube(r,new(0,id=="pears"?.208f:.174f,0),new(.012f,.037f,.012f),"73583A");Ball(r,new(.025f,.185f,0),new(.055f,.009f,.027f),"547B3C");
        }
    }
    void Tube(Transform root,Vector3[] points,float[] radii,string color)
    {
        const int sides=12;var vertices=new Vector3[points.Length*sides];var triangles=new List<int>();
        for(int ring=0;ring<points.Length;ring++){
            var tangent=(points[Math.Min(points.Length-1,ring+1)]-points[Math.Max(0,ring-1)]).normalized;
            var u=Vector3.Cross(tangent,Vector3.up).normalized;var v=Vector3.Cross(tangent,u);
            for(int side=0;side<sides;side++){
                float angle=side*Mathf.PI*2/sides;vertices[ring*sides+side]=points[ring]+(u*Mathf.Cos(angle)+v*Mathf.Sin(angle))*radii[ring];
                if(ring==points.Length-1)continue;
                int a=ring*sides+side,c=ring*sides+(side+1)%sides,b=a+sides,d=c+sides;triangles.AddRange(new[]{a,c,b,b,c,d});
            }
        }
        var mesh=new Mesh{name="Organic item shape"};mesh.vertices=vertices;mesh.triangles=triangles.ToArray();mesh.RecalculateNormals();mesh.RecalculateBounds();
        var model=Group(root,"Organic item mesh");model.gameObject.AddComponent<MeshFilter>().sharedMesh=mesh;model.gameObject.AddComponent<MeshRenderer>().sharedMaterial=ColorMat(color);
    }
}
public sealed class BusinessShelfItem:MonoBehaviour {public string product;public Vector3 basePosition;}
