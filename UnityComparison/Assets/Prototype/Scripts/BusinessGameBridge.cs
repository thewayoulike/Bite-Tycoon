using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.InputSystem;

[Serializable] public class BusinessContents
{
    public string id, restaurantType, interiorStyle; public float speed; public string[] facilities;
    public BusinessStock[] stock; public BusinessCrew[] crew; public BusinessTable[] tables; public BusinessCustomer[] customers; public BusinessStaff[] staff; public BusinessUnit[] units; public BusinessVisitor[] visitors;
}
[Serializable] public class BusinessFrame : BusinessContents
{
    public BusinessContents[] frontages;
    public int version, floor, week, day, revision; public string focus, selected, detail, area, weather; public bool night, cutaway, fast, meter, market;
    public float hours, wind, snow, rain; public BusinessProperty[] properties;
}
[Serializable] public class BusinessProperty { public string id, name, kind, offer, accent, wall, design, tenure, siteId, cityCategory; public float x, z, stock; public int floors,exteriorFloors; public bool owned,existing,preserveExterior; }
[Serializable] public class BusinessTable { public string id, customer; public float x, z; public bool dirty; public BusinessMeal[] meals; }
[Serializable] public class BusinessMeal { public string id, name, kind; public string[] ingredients; }
[Serializable] public class BusinessCustomer { public string id, table, state; public int party; public float patience; public BusinessRoute[] routes; public BusinessPerson[] cast; }
[Serializable] public class BusinessPoint { public float x, z; }
[Serializable] public class BusinessRoute { public BusinessPoint[] points; }
[Serializable] public class BusinessStock { public string id, category, name, form, color; public float quantity, capacity; public int floor; }
[Serializable] public class BusinessCrew { public string role; public int count; }
[Serializable] public class BusinessStaff { public string id, role, state; public float x, z; public BusinessPerson cast; }
[Serializable] public class BusinessUnit { public int index; public string type, tenant; public bool occupied, dirty; public float condition, cleanliness; public BusinessPerson cast; }
[Serializable] public class BusinessVisitor { public string id, state; public int unit, seed; public bool basket; public BusinessPerson cast; }

// Unity is the renderer; the browser remains the sole authority for the existing simulation.
public sealed partial class BusinessGameBridge : MonoBehaviour
{
    public Camera viewCamera;
    public GameObject restaurantExterior, restaurantInterior, marketExterior, marketInterior, tablePrefab, housePrefab;
    public GameObject[] restaurantExteriors=Array.Empty<GameObject>(),marketExteriors=Array.Empty<GameObject>();
    public GameObject[] peoplePrefabs;
    public GameObject treePrefab; public GameObject[] vehiclePrefabs;
    public Material plaster, brick, wood, metal, glass, paving, road, greenery, fontMaterial;
    public DetailedCityTour lighting;
    readonly Dictionary<string, GameObject> properties = new(), tables = new(), people = new();
    readonly Dictionary<string, string> propertyKeys = new();
    readonly List<Transform> labels = new();
    readonly List<GameObject> residential = new();
    readonly Dictionary<string, Material> colorCache = new();
    Transform[] stockProducts = Array.Empty<Transform>(), freshProducts = Array.Empty<Transform>();
    readonly List<float> metricFrames = new(); float metricTime;
    GameObject interior; BusinessFrame frame; string viewKey = "", roomKey = ""; Vector3 target, mouseDown; float distance = 115, yaw = -25, pitch = 48; bool inputFocus;
    Transform train; float frameTime, markerTime; bool sceneReady, overviewRequested; string pendingFrame;
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void BusinessUnityEvent(string json);
#endif
    void Start()
    {
        Application.targetFrameRate = 60;
#if UNITY_WEBGL && !UNITY_EDITOR && ENABLE_LEGACY_INPUT_MANAGER
        WebGLInput.captureAllKeyboardInput = false;
#endif
        BuildScenery(); target = new Vector3(5, 0, 0); CameraPose(true);sceneReady=true;
        if(pendingFrame!=null){var json=pendingFrame;pendingFrame=null;ApplyFrame(json);}
    }
    public void SetInputFocus(string value) { inputFocus = value == "1"; }
    // Browser wheel input is delivered even after a management control takes focus.
    public void ZoomBy(string value)
    {
        if(float.TryParse(value,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out var amount)&&float.IsFinite(amount))
            Zoom(amount);
    }
    void Zoom(float amount)
    {
        if (amount == 0 || overviewRequested) return;
        var p=frame?.properties?.FirstOrDefault(p=>p.id==frame.focus);
        bool inside=p?.owned==true&&frame.detail!="exterior"&&frame.detail!="street";
        float next=distance*Mathf.Exp(Mathf.Clamp(amount,-3,3)*.1f),limit=p!=null&&GalleriaSite(p)?98:p?.kind=="plaza"?58:48;
        if(inside&&amount>0&&next>limit){
            distance=limit;overviewRequested=true;EmitJson("{\"type\":\"overview\"}");return;
        }
        distance=Mathf.Clamp(next,8,620);
    }
    public void ApplyFrame(string json)
    {
        if(!sceneReady){pendingFrame=json;return;}
        var next = JsonUtility.FromJson<BusinessFrame>(json);
        if (next == null || next.version != 1 || next.properties == null || next.properties.Length > 1000) return;
        frame = next;
        if (lighting.evening != frame.night) lighting.SetEvening(frame.night);
        var alive = new HashSet<string>();
        foreach (var p in frame.properties)
        {
            alive.Add(p.id); string key = p.kind + p.name + p.floors + p.owned + p.offer + p.design+p.wall+p.accent+p.tenure+p.preserveExterior+p.exteriorFloors;
            if (!propertyKeys.TryGetValue(p.id, out var old) || old != key)
            {
                if (properties.TryGetValue(p.id, out var previous)) Destroy(previous);
                properties[p.id] = CreateProperty(p); propertyKeys[p.id] = key;
            }
        }
        foreach (string id in properties.Keys.Where(id => !alive.Contains(id)).ToArray()) { Destroy(properties[id]); properties.Remove(id); propertyKeys.Remove(id); }
        QualitySettings.shadows = frame.fast ? ShadowQuality.Disable : ShadowQuality.All;
        var focused=frame.properties.FirstOrDefault(p=>p.id==frame.focus);
        string desiredView = frame.focus + ":" + frame.floor + ":" + frame.detail + ":" + frame.area + ":" + frame.selected + ":" + frame.revision + ":" + frame.cutaway+":"+focused?.wall+":"+focused?.accent;
        if (desiredView != viewKey) { viewKey = desiredView; ChangeView(); }
        UpdateInterior();
        RefreshStreetInteriors();
        SyncSharedLots();
    }
    void ChangeView()
    {
        overviewRequested=false;
        var p = frame.properties.FirstOrDefault(p => p.id == frame.focus);
        if (p != null)
        {
            target = SiteCenter(p)+Vector3.up*(.7f+SelectedFloorHeight(p));
            bool outside = frame.detail == "exterior" || frame.detail == "street";
            distance = outside ? (GalleriaSite(p)?87:p.kind=="plaza"?52:43) : GalleriaSite(p)?66:p.kind == "plaza" ? 39 : p.kind is "restaurant" or "cafe" ? 27 : 32;
            pitch = outside ? (GalleriaSite(p)?38:p.kind=="plaza"?30:24) : 48; yaw = p.kind=="plaza"?155:outside ? -28 : -10;
            if (frame.detail == "person") { distance = 10; pitch = 9; target.y = 1.6f + SelectedFloorHeight(p); }
            if (outside) target.y = p.kind=="plaza"?Mathf.Max(p.floors,p.exteriorFloors)*MallFloorHeight*.4f:Mathf.Min(7, p.floors * 1.5f);
        }
        else
        {
            var located = frame.properties.FirstOrDefault(p => p.id == frame.selected);
            if (located != null) { target = SiteCenter(located); distance = GalleriaSite(located)?96:65; pitch = 48; }
            else
            {
                var savedView=cityData.views?.FirstOrDefault(v=>v.id==frame.area)??new SharedView{target=new[]{0f,2f,0f},position=new[]{82f,64f,116f}};
                target=new Vector3(savedView.target[0],savedView.target[1],savedView.target[2]);var offset=new Vector3(savedView.position[0],savedView.position[1],savedView.position[2])-target;
                distance=offset.magnitude;pitch=Mathf.Asin(offset.y/distance)*Mathf.Rad2Deg;yaw=Mathf.Atan2(-offset.x,-offset.z)*Mathf.Rad2Deg;
                if(frame.detail=="street"){distance=55;pitch=12;}

            }
        }
        if (interior) Destroy(interior); interior = null; tables.Clear(); people.Clear(); stockProducts = Array.Empty<Transform>(); freshProducts = Array.Empty<Transform>(); roomKey = "";
        CameraPose(true);
    }
    GameObject CreateProperty(BusinessProperty p)
    {
        var root = new GameObject(p.id); root.transform.position = new(p.x, 0, p.z);
        if(p.offer=="internal")return root;
        var architecture=Group(root.transform,"Building and site");
        bool renderExterior=!p.preserveExterior&&(!p.existing||StreetApplicable(p));
        if(!renderExterior) { /* Non-business sites retain their shared city model. */ }
        else if (p.kind is "restaurant" or "cafe" or "shop")
        {
            var model = Instantiate(ExteriorModel(p), architecture); model.name = "Exterior";
            if(p.kind=="shop")RetailUpperStoreys(architecture,p,model.transform);
        }
        else if (p.kind == "land")
        {
            Box(architecture, "Land parcel", new(0, .08f, 0), new(19, .13f, 19), ColorMat("8E9277"));
            for (int i = -1; i <= 1; i += 2) { Box(architecture, "Site boundary", new(i * 9.4f, .8f, 0), new(.12f, 1.5f, 19), wood); Box(architecture, "Site boundary", new(0, .8f, i * 9.4f), new(19, 1.5f, .12f), wood); }
        }
        else if (p.kind == "park") Park(architecture);
        else if (p.kind == "plaza") MallExterior(architecture,p);
        else Building(architecture, p.kind, Mathf.Max(p.floors,p.exteriorFloors));
        if(renderExterior)ApplyBuildingDesign(architecture, p);
        if(p.kind is not ("park" or "plaza"))FitArchitecture(architecture,root.transform.position);
        if(p.preserveExterior)architecture.localScale=new Vector3(.74f,1,.74f);
        architecture.gameObject.SetActive(renderExterior);
        if(p.preserveExterior&&p.kind=="shop"&&p.floors>p.exteriorFloors)RetailExistingStoreys(root.transform,p);
        HighlightProperty(root.transform,p);
        CreateBusinessSign(root.transform,p);
        if (p.kind != "park"&&p.offer!="scenery")
        {
            var hit = root.AddComponent<BoxCollider>(); hit.center = SiteOffset(p)+Vector3.up*(p.kind=="plaza"?Mathf.Max(p.floors,p.exteriorFloors)*MallFloorHeight/2:3); hit.size = p.kind=="plaza"?new(SiteExtent(p).x,Mathf.Max(p.floors,p.exteriorFloors)*MallFloorHeight,SiteExtent(p).z):new(21, 6, 21);
            var click = root.AddComponent<BusinessClickTarget>(); click.id = p.id; click.type = "select";
            if(p.kind=="plaza")return root; // Architectural mall nameboards replace the floating panel.
            var sign = Group(root.transform, "Property sign"); sign.localPosition = new(0, p.kind is "hotel" or "apartments" ? p.floors * 2.9f + 5 : 10, 0);
            Box(sign, "Sign panel", Vector3.zero, new(13, 1.25f, .08f), ColorMat(p.owned ? "163F33" : p.offer == "lease" ? "41687E" : p.kind == "land" ? "52725B" : "795F37"));
            Label(sign, p.name.Length > 34 ? p.name.Substring(0, 31) + "…" : p.name, new(0, .16f, -.07f), .38f);
            Label(sign, p.owned ? "YOUR BUSINESS" : p.kind == "land" ? "LAND · BUILD" : p.offer == "lease" ? "EMPTY SHOP · LEASE" : "BUSINESS · BUY", new(0, -.32f, -.07f), .2f);
            labels.Add(sign);
        }
        return root;
    }
    void UpdateInterior()
    {
        if (frame == null) return;
        var p = frame.properties.FirstOrDefault(p => p.id == frame.focus);
        bool inside = p != null && frame.detail != "exterior" && frame.detail != "street" && p.owned;
        UpdateCityVisibility();
        if (!inside) { if (interior) interior.SetActive(false); return; }
        if (interior && (p.kind is "restaurant" or "cafe") && roomKey != RestaurantInteriorLook(frame,p))
        {
            interior.SetActive(false); Destroy(interior); interior=null; tables.Clear(); people.Clear();
        }
        if (!interior)
        {
            if(p.kind is "restaurant" or "cafe")roomKey=RestaurantInteriorLook(frame,p);
            interior = new GameObject("Active business interior"); interior.transform.position = new(p.x, 0, p.z);
            // The cutaway occupies the same site as its exterior. Keep streets and
            // neighbors in place, hiding only the shell of the business being entered.
            if(properties.TryGetValue(p.id,out var property)){
                var architecture=property.transform.Find("Building and site");
                if(architecture){
                    interior.transform.position=architecture.position;
                    interior.transform.rotation=architecture.rotation;
                    interior.transform.localScale=GalleriaSite(p)?Vector3.one:architecture.lossyScale;
                    // Generic upper floors are wider than some exterior templates.
                    // Their slabs must still leave the same clear pavement outside.
                    if(p.kind is "hotel" or "apartments" || p.kind=="shop"&&frame.floor>0){
                        var scale=interior.transform.localScale;
                        scale.x=Mathf.Min(scale.x,16.8f/22.1f);
                        scale.z=Mathf.Min(scale.z,16.8f/20.2f);
                        interior.transform.localScale=scale;
                    }
                }
            }
            float floorHeight=SelectedFloorHeight(p);
            interior.transform.position+=Vector3.up*floorHeight;
            LowerStoreys(interior.transform,p,floorHeight);
            if (p.kind is "restaurant" or "cafe") {
                var model=Instantiate(restaurantInterior, interior.transform);
                var fitout=model.GetComponentsInChildren<Transform>(true).First(t=>t.name=="Restaurant interior");
                TrimSampleTerrace(fitout,interior.transform,false,true);
            }
            else if (p.kind == "shop" && frame.floor == 0) Instantiate(marketInterior, interior.transform);
            else { Box(interior.transform, "Interior floor", new(0, .35f, 0), MallPoint(p,new(p.kind == "plaza" ? 24 : 22, .22f, p.kind=="plaza"?28.8f:20)), paving); Box(interior.transform, "Rear wall", MallPoint(p,new(0, 2.1f, p.kind=="plaza"?14.4f:10)), MallPoint(p,new(p.kind == "plaza" ? 24 : 22, p.kind=="plaza"?3.5f:4.5f, .2f)), plaster); }
            var fill = Group(interior.transform, "Interior fill light").gameObject.AddComponent<Light>(); fill.type = LightType.Point; fill.transform.localPosition = new Vector3(0, 6, 0); fill.range = 26; fill.intensity = 65; fill.color = new Color(1, .89f, .74f); fill.shadows = LightShadows.None;
            foreach (var lamp in interior.GetComponentsInChildren<Light>()) if (lamp != fill) lamp.intensity = 22;
            ApplyRestaurantPaint(interior.transform,p);
            if(p.kind=="shop"&&frame.floor==0)AddFoodDisplays(interior.transform);
            ComparisonFitout(interior.transform,p);
            // Only the static fit-out is combined; live people and movable tables are added afterwards.
            StaticBatchingUtility.Combine(interior);
            if (!frame.cutaway && p.kind is "restaurant" or "cafe") { Box(interior.transform, "Full room front glazing", new(0, 2, -8), new(17, 3.4f, .08f), glass); }
            Interaction(interior.transform, new(0, 1, 8.5f), new(3, 2, 1), "inventory");
        }
        interior.SetActive(true);
        if(p.kind=="shop"&&frame.floor>0&&roomKey!="electronics"){Electronics(interior.transform);roomKey="electronics";}
        if (stockProducts.Length == 0 && p.kind == "shop") { var parts=interior.GetComponentsInChildren<Transform>(true);stockProducts=parts.Where(t=>t.name=="Stock product").ToArray();freshProducts=parts.Where(t=>t.name=="Fresh produce").ToArray(); }
        if (p.kind is "restaurant" or "cafe") RestaurantState(p);
        else if (p.kind is "hotel" or "apartments" or "plaza") Rooms(p);
        else if (p.kind == "shop")
        {
            var live = new HashSet<string>();
            foreach (var v in (frame.visitors ?? Array.Empty<BusinessVisitor>()).Take(24))
            {
                string id = "visitor-" + v.id; live.Add(id);
                int index = Mathf.Abs(v.seed) % 9; float x = v.basket ? -5.7f : -5.7f + index % 3 * 6.1f;
                float z = v.basket ? -3.2f + index / 2 * .6f : 3 - index / 3 * 2;
                var desired = v.state == "leaving" || v.state == "using" ? new Vector3(0, .44f, -8.7f) : new Vector3(x, .44f, z);
                bool exists = people.ContainsKey(id);
                var shopper = Actor(id, exists ? people[id].transform.localPosition : new Vector3(0, .44f, -8.7f), false, 180, index, v.cast);
                var start = shopper.transform.localPosition;
                if(frame.floor>0)desired=ElectronicsBrowsePoint(index,v.basket,v.state);
                var path = frame.floor>0?new[]{start,new Vector3(start.x,.46f,-5.2f),new Vector3(desired.x,.46f,-5.2f),desired}:new[] { start, new Vector3(start.x, .44f, -3.35f), new Vector3(desired.x, .44f, -3.35f), desired };
                shopper.Follow(v.state + ":" + v.basket, path, false, false);
                var click = shopper.GetComponent<BusinessClickTarget>(); if (!click) { click = shopper.gameObject.AddComponent<BusinessClickTarget>(); var collider = shopper.gameObject.AddComponent<CapsuleCollider>(); collider.center = new(0, .85f, 0); collider.height = 1.7f; collider.radius = .3f; }
                click.type = "interact"; click.action = v.basket ? "serve" : "run"; click.unit = int.TryParse(v.id, out var visitorId) ? visitorId : -1;
            }
            foreach (var member in frame.crew ?? Array.Empty<BusinessCrew>()) for (int n = 0; n < Mathf.Min(3, member.count); n++)
            {
                string id = "crew-" + member.role + n; live.Add(id);
                var pos = member.role == "service" ? new Vector3(-7.3f + n * 4, .44f, -5.3f) : new Vector3(9.7f, .44f, 6 - n * 2);
                if(frame.floor>0)pos=member.role=="electronics"||member.role=="service"?new Vector3(5.1f+n*.8f,.46f,-8.4f):new Vector3(9.7f,.46f,4-n*1.6f);
                Actor(id, pos, false, 180, 1 + n);
            }
            RemovePeople(live);
            var available = (frame.stock ?? Array.Empty<BusinessStock>()).Where(item => item.floor == frame.floor).ToArray();
            ShowShelfStock(stockProducts,available.Where(item=>item.category!="Produce").ToArray());
            ShowShelfStock(freshProducts,available.Where(item=>item.category=="Produce").ToArray());
            if(frame.floor>0)UpdateElectronicsStock(interior.transform,available);
        }
    }
    void UpdateCityVisibility()
    {
        bool inside=IsInteriorView();
        foreach(var item in properties)item.Value.SetActive(!inside||item.Key!=frame.focus);
        if(sharedCity)sharedCity.gameObject.SetActive(true);
    }
    void ShowShelfStock(Transform[] models,BusinessStock[] available)
    {
        for(int i=0;i<models.Length;i++){
            int index=available.Length==0?0:Math.Min(available.Length-1,i*available.Length/Math.Max(1,models.Length));
            var item=available.Length>0?available[index]:null;
            int start=available.Length==0?0:Mathf.CeilToInt(index*models.Length/(float)available.Length);
            int end=available.Length==0?0:Mathf.CeilToInt((index+1)*models.Length/(float)available.Length);
            int visible=item==null?0:Math.Min((int)Mathf.Ceil(item.quantity),Mathf.CeilToInt(Mathf.Clamp01(item.quantity/Mathf.Max(1,item.capacity))*(end-start)));
            models[i].gameObject.SetActive(item!=null&&i-start<visible);
            if(item!=null)ShelfItem(models[i],item);
        }
    }
    Vector3 RestaurantPoint(float x, float z) => new(x * .42f, .44f, 2 - z * .4f);
    void RestaurantState(BusinessProperty p, BusinessContents state=null, GameObject root=null, Dictionary<string,GameObject> tableModels=null, Dictionary<string,GameObject> personModels=null)
    {
        state??=frame;root??=interior;tableModels??=tables;personModels??=people;
        var liveTables = new HashSet<string>(); var livePeople = new HashSet<string>();
        foreach (var t in state.tables ?? Array.Empty<BusinessTable>())
        {
            liveTables.Add(t.id); var point = RestaurantPoint(t.x, t.z); point.y = 0;
            if (!tableModels.TryGetValue(t.id, out var table))
            {
                table = RestaurantDiningSet(root.transform,RestaurantInteriorLook(state,p)); table.name = "Dining table " + t.id; tableModels[t.id] = table;
                var hit = table.AddComponent<BoxCollider>(); hit.center = new(0, 1, 0); hit.size = new(2, 1.4f, 2.6f);
                var click = table.AddComponent<BusinessClickTarget>(); click.type = "table"; click.id = t.id;
            }
            table.transform.localPosition = point;
            ComparisonMeal(table,state,t);
            var dishes = table.transform.Find("Dirty dishes");
            if (t.dirty && !dishes) { var debris = Group(table.transform, "Dirty dishes"); for (int i = 0; i < 4; i++) Sphere(debris, "Food scraps", new(-.3f + i * .2f, 1.3f, .1f), new(.1f, .025f, .12f), ColorMat("886239")); }
            if (!t.dirty && dishes) Destroy(dishes.gameObject);
        }
        foreach (string id in tableModels.Keys.Where(id => !liveTables.Contains(id)).ToArray()) { Destroy(tableModels[id]); tableModels.Remove(id); }
        foreach(var customer in state.customers??Array.Empty<BusinessCustomer>()){
            var t=state.tables?.FirstOrDefault(t=>t.id==customer.table);if(t==null)continue;
            for(int seat=0;seat<Math.Min(customer.party,4);seat++){
                string id=customer.id+":"+seat;livePeople.Add(id);
                var route=customer.routes?.ElementAtOrDefault(seat)?.points?.Select(v=>RestaurantPoint(v.x,v.z)).ToArray()??new[]{RestaurantPoint(0,27)};
                bool exists=personModels.ContainsKey(id),leaving=customer.state=="leaving",seated=customer.state!="entering"&&!leaving;
                var spawn=route.Length>1&&(seated||leaving)?route[^1]:RestaurantPoint(0,27);
                var actor=Actor(id,exists?personModels[id].transform.localPosition:spawn,seated,new[]{90f,270f,180f,0f}[seat],seat+Math.Abs(customer.id.GetHashCode()%4),customer.cast?.ElementAtOrDefault(seat),root.transform,personModels,state.speed);
                if(!exists&&!seated)actor.startDelay=seat*.35f;
                actor.seatAtEnd=!leaving;
                // Ordering/eating changes do not restart the arrival path.
                actor.Follow((leaving?"depart:":"arrive:")+t.x+":"+t.z,route,leaving,seated&&!exists);
            }
        }
        foreach (var staff in state.staff ?? Array.Empty<BusinessStaff>()) {
            livePeople.Add(staff.id);var worker=Actor(staff.id,RestaurantPoint(staff.x,staff.z),false,180,Math.Abs(staff.id.GetHashCode()%4),staff.cast,root.transform,personModels,state.speed);
            worker.working=staff.role=="chef"||staff.state is "taking_order" or "serving" or "cleaning";
            var outfit=worker.GetComponent<BusinessOutfit>();if(!outfit)outfit=worker.gameObject.AddComponent<BusinessOutfit>();outfit.Assign(staff.role);
        }
        RemovePeople(livePeople,personModels);
    }
    BusinessActor Actor(string id, Vector3 position, bool seated, float angle, int variant, BusinessPerson person = null, Transform parent=null, Dictionary<string,GameObject> models=null, float? speed=null)
    {
        models??=people;parent??=interior.transform;
        if (!models.TryGetValue(id, out var actor))
        {
            actor = new GameObject(id); actor.transform.SetParent(parent, false); actor.transform.localPosition = position;
            var model = Instantiate(peoplePrefabs[Math.Abs(variant) % peoplePrefabs.Length], actor.transform).transform;
            var renderers = model.GetComponentsInChildren<Renderer>(); var bounds = renderers[0].bounds; foreach (var r in renderers) bounds.Encapsulate(r.bounds);
            float scale = 1.76f / Mathf.Max(.1f, bounds.size.y); model.localScale *= scale; model.localPosition = new Vector3(0, -(bounds.min.y - actor.transform.position.y) * scale, 0);
            var pose = actor.AddComponent<PrototypePerson>(); pose.model = model; pose.seated = seated; var mover = actor.AddComponent<BusinessActor>(); mover.pose = pose; actor.transform.localRotation = Quaternion.Euler(0, angle, 0); models[id] = actor;
            if (person != null) actor.AddComponent<BusinessCast>().LoadPerson(person, pose);
        }
        var motion = actor.GetComponent<BusinessActor>(); motion.speed = speed??frame.speed; motion.seatAtEnd = seated; motion.finalAngle = angle; if (!id.Contains(":") && !id.StartsWith("visitor-")) motion.Direct(position); return motion;
    }
    void RemovePeople(HashSet<string> live, Dictionary<string,GameObject> models=null) { models??=people;foreach (string id in models.Keys.Where(id => !live.Contains(id)).ToArray()) { Destroy(models[id]); models.Remove(id); } }
    void Rooms(BusinessProperty p)
    {
        if (p.kind == "plaza") { MallInterior(p); return; }
        if(frame.floor>p.floors){AmenitiesInterior(p);return;}
        var units = frame.units ?? Array.Empty<BusinessUnit>();
        string key = frame.floor + ":" + string.Join(";", units.Select(u => u.index + u.type + u.occupied + u.dirty + u.tenant)); bool rebuild = roomKey != key; roomKey = key;
        var liveResidents = new HashSet<string>();
        if(frame.floor==0){LobbyPeople(p,liveResidents);RemovePeople(liveResidents);}
        if (!rebuild){if(frame.floor>0)UpdateRoomResidents(p);return;}
        var old = interior.transform.Find("Rooms"); if (old){old.name="Retired rooms";Destroy(old.gameObject);}
        var rooms = Group(interior.transform, "Rooms");
        if (frame.floor == 0 && p.kind != "plaza")
        {
            PlaceFreeAsset(rooms,"conciergeDesk",new(0,.44f,5),7.2f,0);
            Label(rooms, p.name, new(0, 3, 9.83f), .7f);
            foreach (int side in new[] { -1, 1 }) { Sofa(rooms, new(side * 6, .4f, 2), 0); Box(rooms, "Lift doors", new(side * 7.5f, 1.9f, 9.8f), new(2, 2.9f, .1f), metal); }
            DecorateLobby(rooms, p); Interaction(rooms, new(0, 1.2f, 4), new(7, 2, 2), "run"); return;
        }
        int perFloor = p.kind == "hotel" ? 4 : p.kind == "plaza" ? 4 : 3;
        for (int n = 0; n < perFloor; n++)
        {
            int index = (frame.floor - 1) * perFloor + n; if (p.kind == "plaza") index = frame.floor * 4 + n;
            var u = units.FirstOrDefault(u => u.index == index); if (u == null) continue;
            float width = p.kind == "apartments" ? 7 : p.kind == "plaza" ? 7 : 5.4f;
            float x = (n - (perFloor - 1) / 2f) * width;
            var room = Group(rooms, "Unit " + index); room.localPosition = new(x, .44f, 2);
            Box(room, "Timber floor", new(0, -.02f, 0), new(width - .12f, .04f, 12), wood);
            Box(room, "Room partition", new(-width / 2, 1.5f, 0), new(.12f, 3, 12), plaster);
            Box(room, "Bathroom partition", new(width / 2 - 1.2f, 1.25f, 3.5f), new(2.3f, 2.5f, .1f), plaster);
            Box(room, "Bathroom tile floor", new(width / 2 - 1.25f, .02f, 4.7f), new(2.2f, .035f, 2.3f), paving);
            Box(room, "Vanity", new(width / 2 - .5f, .55f, 4.5f), new(.7f, 1.1f, 1.6f), plaster);
            if (p.kind == "plaza")
            {
                Label(room, string.IsNullOrEmpty(u.tenant) ? "AVAILABLE TO RENT" : u.tenant, new(0, 2.5f, -5.8f), .4f);
                Box(room, "Shop glass", new(0, 1.4f, -5.9f), new(width - .3f, 2.8f, .05f), glass);
                Box(room, "Shop display counter", new(0, .65f, -3), new(width - 1.5f, 1.3f, 1), wood);
            }
            else
            {
                FurnishGuestRoom(room,p.kind,u.type,width,u.dirty);
                Label(room, (p.kind == "hotel" ? "ROOM " : "HOME ") + (frame.floor * 100 + n + 1) + (u.dirty ? " · CLEANING" : u.occupied ? " · OCCUPIED" : " · READY"), new(0, 2.8f, -5.9f), .26f);
            }
            Interaction(room, new(0, 1, 0), new(width - .3f, 2, 11), "prices", index);
        }
        UpdateRoomResidents(p);
    }
    void Bed(Transform parent, Vector3 at, float width, bool dirty)
    {
        if(RoomBed(parent,at,width,dirty,"8EAEAD",false))return;
        Box(parent, "Bed base", at + new Vector3(0, .25f, 0), new(width, .5f, 2.25f), wood);
        Box(parent, "Mattress", at + new Vector3(0, .61f, 0), new(width + .06f, .25f, 2.2f), ColorMat(dirty ? "BCB29A" : "EEEDE4"));
        Box(parent, "Duvet", at + new Vector3(0, .79f, -.25f), new(width + .1f, .15f, 1.6f), ColorMat(dirty ? "958970" : "8EAEAD"));
        Box(parent, "Pillow", at + new Vector3(0, .82f, .78f), new(width * .75f, .16f, .43f), ColorMat("F6F0DF"));
        Box(parent, "Headboard", at + new Vector3(0, .8f, 1.15f), new(width + .12f, 1.6f, .13f), wood);
    }
    void Sofa(Transform parent, Vector3 at, float rotation)
    {
        if(PlaceFreeAsset(parent,"loungeSofa",at,2.6f,rotation))return;
        var root = Group(parent, "Lounge sofa"); root.localPosition = at; root.localRotation = Quaternion.Euler(0, rotation, 0);
        Box(root, "Seat", new(0, .45f, 0), new(2.6f, .55f, 1), ColorMat("717F6D")); Box(root, "Back", new(0, .95f, .45f), new(2.6f, .8f, .17f), ColorMat("717F6D"));
    }
    void Building(Transform parent, string kind, int floors)
    {
        bool mall = kind == "plaza"; int count = Mathf.Clamp(floors + (mall ? 0 : 1), 1, 11); float height = count * 2.9f;
        var wall=kind=="apartments"?brick:plaster;
        foreach(int side in new[]{-1,1})Box(parent,"Side wall",new(side*9.9f,height/2+.4f,0),new(.2f,height,19),wall);
        for (int level = 0; level < count; level++)
        {
            float baseY=.4f+level*2.9f;
            Box(parent,"Floor slab",new(0,baseY,0),new(20,.16f,19),paving);
            Box(parent, "Floor cornice", new(0, 3.22f + level * 2.9f, -.1f), new(20.4f, .16f, 19.4f), metal);
            for (int bay = -3; bay <= 3; bay++) foreach (int side in new[] { -1, 1 })
            {
                float x=bay*2.75f,width=level==0||mall?2.6f:1.8f;
                // Real openings: never put an opaque wall or frame behind the glass.
                Box(parent,"Glazing",new(x,baseY+1.4f,side*9.5f),new(width,2.5f,.035f),glass);
                foreach(int edge in new[]{-1,1})Box(parent,"Window jamb",new(x+edge*(width/2+.035f),baseY+1.4f,side*9.5f),new(.07f,2.6f,.13f),metal);
                Box(parent,"Window header",new(x,baseY+2.72f,side*9.5f),new(2.75f,.22f,.2f),wall);
                Box(parent,"Window sill",new(x,baseY+.12f,side*9.5f),new(2.75f,.16f,.2f),wall);
                if(width<2.6f)Box(parent,"Masonry pier",new(x+1.375f,baseY+1.4f,side*9.5f),new(2.75f-width-.1f,2.5f,.2f),wall);
            }
            if(level>0)for(int bay=-2;bay<=2;bay++){
                var room=Group(parent,"Furnished upper room");room.localPosition=new(bay*3.7f,baseY,0);
                Box(room,"Privacy partition",new(1.8f,1.4f,0),new(.12f,2.7f,18.8f),wall);
                if(kind=="plaza"){Box(room,"Upper shop display",new(0,.8f,-6),new(2.2f,1.4f,1.2f),wood);}
                else{Bed(room,new(-.3f,0,-6.7f),1.3f,false);Box(room,"Room desk",new(.4f,.8f,-4),new(1.7f,.12f,.9f),wood);}
            }
        }
        Box(parent, "Entrance canopy", new(0, 3.2f, -10.6f), new(9, .16f, 3), metal);
        Box(parent, "Entrance glass", new(0, 1.8f, -9.75f), new(4, 2.6f, .06f), glass);
        Box(parent, "Roof parapet", new(0, height + .5f, 0), new(20.5f, .35f, 19.5f), plaster);
    }
    void Park(Transform parent)
    {
        Box(parent, "Garden lawn", new(0, .05f, 0), new(20, .1f, 20), greenery); Box(parent, "Garden path", new(0, .15f, 0), new(3, .1f, 20), paving); Box(parent, "Garden path", new(0, .15f, 0), new(20, .1f, 3), paving);
        var fountain = Sphere(parent, "Fountain basin", new(0, .45f, 0), new(5, .65f, 5), plaster); Sphere(parent, "Fountain water", new(0, .7f, 0), new(4.5f, .12f, 4.5f), ColorMat("609FA9"));
    }
    void BuildScenery() { BuildSharedCity(); }
    void Interaction(Transform parent, Vector3 center, Vector3 size, string action, int unit = -1)
    {
        var root = Group(parent, "Interaction " + action).gameObject; var collider = root.AddComponent<BoxCollider>(); collider.center = center; collider.size = size;
        var click = root.AddComponent<BusinessClickTarget>(); click.type = "interact"; click.action = action; click.unit = unit;
    }
    Material ColorMat(string hex)
    {
        if (colorCache.TryGetValue(hex, out var value)) return value;
        var m = new Material(plaster); if (ColorUtility.TryParseHtmlString("#" + hex, out var color)) m.color = color; m.mainTexture = null; m.enableInstancing = true; colorCache[hex] = m; return m;
    }
    Transform Group(Transform parent, string name) { var go = new GameObject(name).transform; go.SetParent(parent, false); return go; }
    GameObject Box(Transform parent, string name, Vector3 position, Vector3 size, Material material)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube); go.name = name; go.transform.SetParent(parent, false); go.transform.localPosition = position; go.transform.localScale = size; go.GetComponent<Renderer>().sharedMaterial = material; Destroy(go.GetComponent<Collider>()); return go;
    }
    GameObject Sphere(Transform parent, string name, Vector3 position, Vector3 size, Material material)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere); go.name = name; go.transform.SetParent(parent, false); go.transform.localPosition = position; go.transform.localScale = size; go.GetComponent<Renderer>().sharedMaterial = material; Destroy(go.GetComponent<Collider>()); return go;
    }
    void Label(Transform parent, string words, Vector3 at, float size)
    {
        var go = Group(parent, words).gameObject; go.transform.localPosition = at;
        var text = go.AddComponent<TextMesh>(); text.text = words; text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); text.fontSize = 80; text.characterSize = size / 10; text.anchor = TextAnchor.MiddleCenter; text.alignment = TextAlignment.Center; text.color = Color.white;
        fontMaterial.mainTexture = text.font.material.mainTexture; go.GetComponent<Renderer>().sharedMaterial = fontMaterial;
    }
    void Update()
    {
        frameTime = Mathf.Lerp(frameTime, Time.unscaledDeltaTime, .05f);
        if (frame?.meter == true)
        {
            metricFrames.Add(Time.unscaledDeltaTime * 1000); metricTime += Time.unscaledDeltaTime;
            if (metricTime >= 2 && metricFrames.Count > 0)
            {
                metricFrames.Sort(); var sample = new BusinessMetrics { type = "performance", fps = metricFrames.Count / metricTime, p95 = metricFrames[(int)((metricFrames.Count - 1) * .95f)], samples = metricFrames.Count };
#if UNITY_WEBGL && !UNITY_EDITOR
                BusinessUnityEvent(JsonUtility.ToJson(sample));
#endif
                metricFrames.Clear(); metricTime = 0;
            }
        }
        var mouse = Mouse.current;
#if UNITY_EDITOR
        inputFocus = UnityEditor.EditorWindow.focusedWindow != null && UnityEditor.EditorWindow.focusedWindow.GetType().Name == "GameView";
#endif
        if (inputFocus && mouse != null)
        {
            Vector2 delta = mouse.delta.ReadValue(); var flat = Quaternion.Euler(0, yaw, 0);
            if (mouse.leftButton.wasPressedThisFrame) mouseDown = mouse.position.ReadValue();
            if (mouse.leftButton.isPressed) target += flat * new Vector3(-delta.x, 0, -delta.y) * distance * .0011f;
            if (mouse.rightButton.isPressed) { yaw += delta.x * .18f; pitch = Mathf.Clamp(pitch - delta.y * .15f, 8, 78); }
#if !UNITY_WEBGL || UNITY_EDITOR
            Zoom(-mouse.scroll.ReadValue().y / 120);
#endif
            if (mouse.leftButton.wasReleasedThisFrame && Vector2.Distance(mouseDown, mouse.position.ReadValue()) < 6)
            {
                if (Physics.Raycast(viewCamera.ScreenPointToRay(mouse.position.ReadValue()), out var hit))
                {
                    var click = hit.collider.GetComponentInParent<BusinessClickTarget>();
                    if (click) Emit(click);
                }
            }
        }
        target.x = Mathf.Clamp(target.x, -320, 610); target.z = Mathf.Clamp(target.z, -320, 450); CameraPose(false);
        streetTimer+=Time.unscaledDeltaTime;if(streetTimer>.35f){streetTimer=0;UpdateStreetInteriors();}
        foreach (var label in labels) if (label) label.gameObject.SetActive(false);
        markerTime += Time.unscaledDeltaTime;
        if(markerTime>.2f&&frame!=null)
        {
            markerTime=0;var markers=MapMarkers();
#if UNITY_WEBGL && !UNITY_EDITOR
            BusinessUnityEvent(JsonUtility.ToJson(new BusinessMarkers{type="markers",items=markers.ToArray()}));
#endif
        }
        

        AnimateScenery();
        UpdateWeather();
        UpdateSharedCity();
    }
    void CameraPose(bool instant)
    {
        viewCamera.nearClipPlane = Mathf.Clamp(distance*.002f,.08f,1.2f);
        var position = target + Quaternion.Euler(pitch, yaw, 0) * new Vector3(0, 0, -distance); position.y = Mathf.Max(1.8f, position.y);
        viewCamera.transform.position = instant ? position : Vector3.Lerp(viewCamera.transform.position, position, 1 - Mathf.Exp(-10 * Time.unscaledDeltaTime)); viewCamera.transform.LookAt(target);
    }
    void Emit(BusinessClickTarget target)
    {
        string json = target.type == "interact" ? "{\"type\":\"interact\",\"action\":\"" + target.action + "\"" + (target.unit >= 0 ? ",\"id\":" + target.unit : "") + "}" : "{\"type\":\"" + target.type + "\",\"id\":\"" + target.id + "\"}";
        EmitJson(json);
    }
    static void EmitJson(string json)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        BusinessUnityEvent(json);
#else
        Debug.Log("Unity interaction: " + json);
#endif
    }
}
public sealed class BusinessClickTarget : MonoBehaviour { public string type, id, action; public int unit = -1; }

[Serializable] public class BusinessMetrics { public string type; public float fps, p95; public int samples; }
[Serializable] public class BusinessMarker { public string id; public float x,y; public bool compact; }
[Serializable] public class BusinessMarkers { public string type; public BusinessMarker[] items; }
