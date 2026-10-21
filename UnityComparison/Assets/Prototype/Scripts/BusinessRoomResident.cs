using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

// Room routines are visual. They never create bookings, income or tenants.
public sealed class BusinessRoomResident : MonoBehaviour
{
    public string activity="Arriving";
    public float hour=12;
    public BusinessActor motion;
    Transform room; string kind,type; int seed,step,serial;
    float width,remaining,transition; bool initialized,bedtime,exiting;
    Vector3 bedPoint,bedAccess,goal,approach,start;
    float angle; bool sitting,sleeping;
    GameObject cover;
    readonly List<Bounds> obstacles=new();
    const float Cell=.2f,Radius=.2f;
    int nx,nz; bool[] blocked;
    readonly List<Visit> visits=new();
    struct Visit { public string name; public Vector3 point,access; public float angle; public bool seated; }
    public void Configure(Transform nextRoom,string nextKind,string nextType,int index,GameObject blanket)
    {
        if(room==nextRoom&&initialized)return;
        room=nextRoom;kind=nextKind;type=nextType;seed=index;cover=blanket;width=kind=="hotel"?5.4f:7;
        motion=GetComponent<BusinessActor>();obstacles.Clear();visits.Clear();
        string[] solids={"Room bed","Room lounge sofa","Writing desk","Executive work desk","Vanity writing desk","Lounge coffee table","Suite stone coffee table","Family activity table","Wardrobe","Hospitality minibar","Home kitchen units","Home fridge","Penthouse stone island","Bedroom partition","Second bedroom divider","Suite bedroom divider","Family storage bench","Bedside cabinet","Desk chair","Lounge armchair","Comparison HomeTable","Dining table","Dining chair seat","Apartment media console","Apartment reading chair"};
        foreach(var t in room.GetComponentsInChildren<Transform>())if(solids.Contains(t.name)||t.name=="Apartment lounge coffee table")obstacles.Add(BoundsOf(t,room));
        nx=Mathf.CeilToInt((width-.6f)/Cell)+1;nz=58;blocked=new bool[nx*nz];
        for(int z=0;z<nz;z++)for(int x=0;x<nx;x++){var p=Point(z*nx+x);blocked[z*nx+x]=obstacles.Any(b=>p.x>b.min.x-Radius&&p.x<b.max.x+Radius&&p.z>b.min.z-Radius&&p.z<b.max.z+Radius);}
        var bed=room.GetComponentsInChildren<Transform>().First(t=>t.name=="Room bed");var bb=BoundsOf(bed,room);
        bedPoint=new(bb.center.x,.64f,bb.center.z-.98f);bedAccess=Safe(new(bb.max.x+.32f,0,bb.center.z-.3f));
        var left=Safe(new(bb.min.x-.32f,0,bb.center.z-.3f));
        if(Vector3.Distance(left,new(bb.min.x-.32f,0,bb.center.z-.3f))<Vector3.Distance(bedAccess,new(bb.max.x+.32f,0,bb.center.z-.3f)))bedAccess=left;
        foreach(var seat in room.GetComponentsInChildren<Transform>().Where(t=>t.name is "Room lounge sofa" or "Desk chair" or "Lounge armchair")){
            var b=BoundsOf(seat,room);Vector3 front=room.InverseTransformDirection(-seat.forward).normalized;
            Vector3 p=new(b.center.x,seat.name=="Room lounge sofa"?.01f:.09f,b.center.z);p+=front*.05f;
            var access=Safe(new Vector3(p.x,0,p.z)+front*(seat.name=="Room lounge sofa"?.88f:.72f));
            visits.Add(new Visit{name=seat.name=="Desk chair"?"At the desk":"Relaxing",point=p,access=access,seated=true,angle=Mathf.Atan2(front.x,front.z)*Mathf.Rad2Deg});
        }
        if(kind=="apartments")visits.Add(new Visit{name="Preparing refreshments",point=Safe(new(1.55f,0,-2.7f)),access=Safe(new(1.55f,0,-2.7f)),angle=90});
        visits.Add(new Visit{name="Looking around",point=Safe(new(width/2-.7f,0,.1f)),access=Safe(new(width/2-.7f,0,.1f)),angle=90});
        visits.Add(new Visit{name="Moving around the room",point=Safe(new(0,0,-5.2f)),access=Safe(new(0,0,-5.2f)),angle=0});
        initialized=true;step=seed%visits.Count;remaining=0;transition=0;bedtime=false;exiting=false;sleeping=false;sitting=false;if(cover)cover.SetActive(false);
        var spawn=Safe(room.InverseTransformPoint(transform.position));SetPosition(spawn);
        if(WantsSleep()){bedtime=true;sleeping=true;goal=bedPoint;SetPosition(goal);motion.Direct(transform.localPosition);motion.sleeping=true;motion.finalAngle=180;activity="Sleeping";if(cover)cover.SetActive(true);}
        else {
            var v=visits[step++%visits.Count];goal=v.point;approach=v.access;sitting=v.seated;angle=v.angle;
            SetPosition(goal);motion.Direct(transform.localPosition);motion.seatAtEnd=sitting;motion.sleeping=false;motion.finalAngle=angle;
            remaining=8+seed%9;activity=v.name;
        }
    }
    public static Bounds BoundsOf(Transform item,Transform relative)
    {
        var rs=item.GetComponentsInChildren<Renderer>().Where(r=>r.enabled&&r is not ParticleSystemRenderer&&r is not TrailRenderer).ToArray();
        var b=new Bounds();bool first=true;
        foreach(var r in rs){var a=r.bounds;for(int i=0;i<8;i++){var p=relative.InverseTransformPoint(a.center+Vector3.Scale(a.extents,new Vector3((i&1)==0?-1:1,(i&2)==0?-1:1,(i&4)==0?-1:1)));if(first){b=new Bounds(p,Vector3.zero);first=false;}else b.Encapsulate(p);}}
        return b;
    }
    Vector3 Point(int i)=>new(-width/2+.3f+(i%nx)*Cell,0,-5.6f+(i/nx)*Cell);
    int Nearest(Vector3 p){int best=-1;float d=float.MaxValue;for(int i=0;i<blocked.Length;i++)if(!blocked[i]){float v=(Point(i)-new Vector3(p.x,0,p.z)).sqrMagnitude;if(v<d){d=v;best=i;}}return best;}
    Vector3 Safe(Vector3 p){int i=Nearest(p);return i<0?new(0,0,-5.2f):Point(i);}
    public Vector3[] Route(Vector3 from,Vector3 to)
    {
        int a=Nearest(from),b=Nearest(to);if(a<0||b<0)return Array.Empty<Vector3>();
        var prev=Enumerable.Repeat(-1,blocked.Length).ToArray();var q=new Queue<int>();q.Enqueue(a);prev[a]=a;
        while(q.Count>0&&prev[b]<0){int n=q.Dequeue();foreach(int offset in new[]{-1,1,-nx,nx}){int t=n+offset;if(t<0||t>=blocked.Length||blocked[t]||prev[t]>=0||Math.Abs(t%nx-n%nx)>1)continue;prev[t]=n;q.Enqueue(t);}}
        if(prev[b]<0)return Array.Empty<Vector3>();var path=new List<Vector3>();for(int n=b;n!=a;n=prev[n])path.Add(Point(n));path.Add(Point(a));path.Reverse();
        // Keep corners while dropping collinear grid nodes; every segment remains in the free cells.
        var result=new List<Vector3>{path[0]};for(int i=1;i<path.Count-1;i++)if(Vector3.Cross(path[i]-path[i-1],path[i+1]-path[i]).sqrMagnitude>.00001f)result.Add(path[i]);if(path.Count>1)result.Add(path[^1]);return result.ToArray();
    }
    bool WantsSleep()=>hour>=22+(seed%3)*.22f||hour<6.5f+(seed%4)*.18f;
    Vector3 Here()=>room.InverseTransformPoint(transform.position);
    Vector3 ParentPoint(Vector3 p)=>transform.parent.InverseTransformPoint(room.TransformPoint(p));
    void SetPosition(Vector3 p)=>transform.localPosition=ParentPoint(p);
    void BeginVisit()
    {
        sleeping=false;motion.sleeping=false;if(cover)cover.SetActive(false);
        var v=visits[step++%visits.Count];activity="Walking to "+v.name.ToLowerInvariant();sitting=v.seated;goal=v.point;approach=v.access;angle=v.angle;
        if(!Walk(approach)){remaining=3;activity="Resting";sitting=false;goal=approach=Here();}
    }
    bool Walk(Vector3 target)
    {
        var route=Route(Here(),target);if(route.Length==0)return false;
        motion.seatAtEnd=false;motion.sleeping=false;motion.working=false;
        motion.Follow("room:"+(++serial),route.Select(ParentPoint).ToArray(),false,false);remaining=0;transition=0;return true;
    }
    public string AuditRoutes(){var start=Safe(new(0,0,-5.2f));return string.Join("; ",visits.Select(v=>v.name+":"+Route(start,v.access).Length))+"; Bed:"+Route(start,bedAccess).Length;}
    void Update()
    {
        if(!initialized||!room||motion.speed<=0)return;
        float dt=Mathf.Min(Time.deltaTime,.1f)*motion.speed;
        bool wants=WantsSleep();
        if(bedtime&&!wants&&!exiting){bedtime=false;sleeping=false;motion.sleeping=false;if(cover)cover.SetActive(false);exiting=true;start=Here();goal=bedAccess;transition=.9f;motion.Direct(transform.localPosition);activity="Getting up";}
        if(!bedtime&&wants&&!exiting){bedtime=true;sitting=false;goal=bedPoint;approach=bedAccess;angle=180;activity="Going to bed";Walk(approach);}
        if(exiting){transition=Mathf.Max(0,transition-dt);SetPosition(Vector3.Lerp(start,goal,1-transition/.9f));motion.Direct(transform.localPosition);if(transition==0){exiting=false;BeginVisit();}return;}
        if(sleeping)return;
        if(transition>0){transition=Mathf.Max(0,transition-dt);SetPosition(Vector3.Lerp(start,goal,1-transition/.65f));motion.Direct(transform.localPosition);motion.seatAtEnd=sitting;motion.finalAngle=angle;if(transition==0){remaining=9+(seed*7+step*3)%15;activity=bedtime?"Sleeping":sitting?"Seated":"Using the room";sleeping=bedtime;motion.sleeping=sleeping;if(cover)cover.SetActive(sleeping);}return;}
        if(remaining>0){remaining-=dt;if(remaining<=0){motion.seatAtEnd=false;exiting=true;start=Here();goal=approach;transition=.9f;activity="Standing up";}return;}
        if(Vector3.Distance(Here(),approach)<.08f){start=Here();transition=.65f;motion.Direct(transform.localPosition);}
    }
}

public sealed partial class BusinessGameBridge
{
    GameObject ResidentDuvet(Transform bed,float width,string color)
    {
        var root=Group(bed,"Occupied duvet");var vertices=new List<Vector3>();var triangles=new List<int>();
        for(int z=0;z<9;z++)for(int x=0;x<7;x++){
            float px=(x/6f-.5f)*width,pz=-1.04f+z/8f*1.62f;
            float arch=Mathf.Sqrt(Mathf.Max(0,Mathf.Sin(x/6f*Mathf.PI)));
            vertices.Add(new(px,.56f+arch*(.31f+.05f*Mathf.Sin(z/8f*Mathf.PI)),pz));
        }
        for(int z=0;z<8;z++)for(int x=0;x<6;x++){int a=z*7+x;triangles.AddRange(new[]{a,a+7,a+1,a+1,a+7,a+8});}
        var mesh=new Mesh{name="Draped sleeping duvet"};mesh.SetVertices(vertices);mesh.SetTriangles(triangles,0);mesh.RecalculateNormals();mesh.RecalculateBounds();
        root.gameObject.AddComponent<MeshFilter>().sharedMesh=mesh;root.gameObject.AddComponent<MeshRenderer>().sharedMaterial=ColorMat(color);return root.gameObject;
    }
    void UpdateRoomResidents(BusinessProperty p)
    {
        var live=new HashSet<string>();int count=p.kind=="hotel"?4:3;
        var rooms=interior.transform.Find("Rooms");if(!rooms)return;
        foreach(var unit in frame.units??Array.Empty<BusinessUnit>())if(unit.occupied&&unit.index/count==frame.floor-1){
            var room=rooms.Find("Unit "+unit.index);if(!room)continue;
            string id="resident:"+unit.index;live.Add(id);
            var point=interior.transform.InverseTransformPoint(room.TransformPoint(RoomResidentPoint(p.kind,unit.type,false)));
            var actor=people.TryGetValue(id,out var existingActor)?existingActor.GetComponent<BusinessActor>():Actor(id,point,false,0,unit.index,unit.cast);
            actor.speed=frame.speed;
            var routine=actor.GetComponent<BusinessRoomResident>();if(!routine)routine=actor.gameObject.AddComponent<BusinessRoomResident>();routine.hour=frame.hours;
            var bed=room.GetComponentsInChildren<Transform>().FirstOrDefault(t=>t.name=="Room bed");
            GameObject cover=null;
            if(bed){var existing=bed.Find("Occupied duvet");if(existing)cover=existing.gameObject;else{var b=LocalModelBounds(bed);cover=ResidentDuvet(bed,b.size.x*.94f,p.kind=="hotel"?"8BA2A1":"A9B6A7");cover.SetActive(false);}}
            routine.Configure(room,p.kind,unit.type,unit.index,cover);
        }
        RemovePeople(live);
    }
}
