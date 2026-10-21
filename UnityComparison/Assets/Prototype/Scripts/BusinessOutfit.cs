using UnityEngine;
// Accessories follow the animated person rather than floating at a scene coordinate.
[DefaultExecutionOrder(200)]
public sealed class BusinessOutfit : MonoBehaviour
{
 public string role;Transform accessories,hat,apron,head,pelvis,cachedModel;PrototypePerson pose;Material white,dark;
 public void Assign(string value){if(role==value&&accessories)return;role=value;if(accessories)Destroy(accessories.gameObject);pose=GetComponent<PrototypePerson>();accessories=new GameObject("Role uniform "+role).transform;accessories.SetParent(transform,false);
  if(white)Destroy(white);if(dark)Destroy(dark);
  white=new Material(Shader.Find("Universal Render Pipeline/Lit")){color=new Color(.94f,.93f,.88f)};dark=new Material(white){color=new Color(.12f,.15f,.17f)};
  if(role=="chef"){
   hat=new GameObject("Chef toque").transform;hat.SetParent(accessories,false);
   Shape(hat,"Toque band",PrimitiveType.Cylinder,new(0,.035f,0),new(.20f,.035f,.20f),white);
   Shape(hat,"Toque crown",PrimitiveType.Cylinder,new(0,.14f,0),new(.24f,.08f,.23f),white);
   Shape(hat,"Soft crown top",PrimitiveType.Sphere,new(0,.22f,0),new(.24f,.08f,.23f),white);
  }
  if(role is "chef" or "waiter"){
   apron=new GameObject("Service apron").transform;apron.SetParent(accessories,false);
   Shape(apron,"Apron panel",PrimitiveType.Cube,new(0,-.12f,0),new(.32f,.42f,.025f),role=="chef"?white:dark);
   Shape(apron,"Waist tie",PrimitiveType.Cube,new(0,.1f,-.015f),new(.37f,.045f,.04f),dark);
  }
 }
 void Shape(Transform p,string name,PrimitiveType type,Vector3 pos,Vector3 scale,Material mat){var o=GameObject.CreatePrimitive(type);o.name=name;o.transform.SetParent(p,false);o.transform.localPosition=pos;o.transform.localScale=scale;o.GetComponent<Renderer>().sharedMaterial=mat;Destroy(o.GetComponent<Collider>());}
 void LateUpdate(){if(!pose||!pose.model)return;if(cachedModel!=pose.model){cachedModel=pose.model;head=null;pelvis=null;foreach(var t in cachedModel.GetComponentsInChildren<Transform>()){if(t.name=="head")head=t;if(t.name=="pelvis")pelvis=t;}}
  if(hat&&head){hat.position=head.position+transform.up*.11f;hat.rotation=transform.rotation;}
  if(apron&&pelvis){apron.position=pelvis.position+transform.forward*.19f;apron.rotation=transform.rotation;}
 }
 void OnDestroy(){if(white)Destroy(white);if(dark)Destroy(dark);}
}
