using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

public sealed partial class BusinessGameBridge
{
    sealed class JunctionSignal
    {
        public Vector3 center;
        public Transform root;
        public readonly List<(Renderer renderer,bool eastWest,int aspect)> bulbs=new();
    }
    readonly List<JunctionSignal> junctionSignals=new();
    float[] trafficTravel;
    Vector3[] trafficPositions,trafficDirections;
    Material[] signalOn,signalOff;
    int lastSignalPhase=-1;

    // Opposing traffic shares green; a clearance interval separates the axes.
    // 0 = red, 1 = amber, 2 = green. Amber stops approaching vehicles too.
    public static int TrafficAspect(float seconds,bool eastWest)
    {
        float t=Mathf.Repeat(seconds,28);
        if(eastWest)return t<10?2:t<12?1:0;
        return t>=14&&t<24?2:t>=24&&t<26?1:0;
    }
    public static float SignalTravelLimit(Vector3 position,Vector3 heading,Vector3 center,float travel,float seconds)
    {
        bool eastWest=Mathf.Abs(heading.x)>Mathf.Abs(heading.z);
        if(TrafficAspect(seconds,eastWest)==2)return travel;
        var delta=center-position;delta.y=0;
        float ahead=Vector3.Dot(delta,heading),side=Mathf.Abs(delta.x*heading.z-delta.z*heading.x);
        // Vehicles already past the stop line finish crossing, even after red.
        if(side>2.2f||ahead<6.45f||ahead>travel+6.6f)return travel;
        return Mathf.Min(travel,Mathf.Max(0,ahead-6.5f));
    }
    void CreateTrafficSignals()
    {
        signalOn=new Material[3];signalOff=new Material[3];
        var colors=new[]{new Color(1,.035f,.015f),new Color(1,.55f,.015f),new Color(.015f,1,.23f)};
        for(int i=0;i<3;i++){
            signalOn[i]=new Material(metal){name="Traffic lamp "+i};signalOn[i].color=colors[i];
            signalOn[i].EnableKeyword("_EMISSION");signalOn[i].SetColor("_EmissionColor",colors[i]*2.2f);signalOn[i].enableInstancing=true;
            signalOff[i]=new Material(signalOn[i]){name="Unlit traffic lamp "+i};signalOff[i].color=colors[i]*.09f;signalOff[i].SetColor("_EmissionColor",Color.black);
        }
        // Actual centre streets: every crossing here has asphalt on both axes.
        foreach(float x in new[]{-37.5f,12.5f,62.5f})foreach(float z in new[]{-62.5f,-12.5f,37.5f,62.5f}){
            var signal=new JunctionSignal{center=new(x,0,z),root=Group(sharedCity,"Traffic lights "+x+", "+z)};
            signal.root.localPosition=signal.center;
            for(int n=0;n<4;n++){
                bool northEnd=x==12.5f&&z==-62.5f,southEnd=x==12.5f&&z==-12.5f;
                if(northEnd&&n==3||southEnd&&n==2)continue;
                bool eastWest=n<2;float direction=n%2==0?1:-1;
                // Posts sit on the corners, outside the 6.5m carriageway.
                var pole=Group(signal.root,"Junction signal head");
                pole.localPosition=eastWest?new(-direction*4.15f,0,-direction*4.15f):new(direction*4.15f,0,-direction*4.15f);
                if(eastWest&&(northEnd||southEnd)){var corner=pole.localPosition;corner.z=northEnd?-4.15f:4.15f;pole.localPosition=corner;}
                pole.localRotation=Quaternion.LookRotation(eastWest?new(-direction,0,0):new(0,0,-direction));
                Box(pole,"Signal pole",new(0,1.7f,0),new(.11f,3.4f,.11f),metal);
                Box(pole,"Signal housing",new(0,3.1f,.04f),new(.46f,1.15f,.22f),ColorMat("172326"));
                for(int aspect=0;aspect<3;aspect++){
                    var bulb=Sphere(pole,"Signal lens "+aspect,new(0,3.46f-aspect*.35f,.18f),new(.28f,.28f,.06f),signalOff[aspect]).GetComponent<Renderer>();
                    bulb.shadowCastingMode=ShadowCastingMode.Off;bulb.receiveShadows=false;
                    signal.bulbs.Add((bulb,eastWest,aspect));
                }
            }
            junctionSignals.Add(signal);
        }
        trafficTravel=new float[cars.Count];trafficPositions=new Vector3[cars.Count];trafficDirections=new Vector3[cars.Count];
        for(int n=0;n<cars.Count;n++){
            var route=cityData.traffic[n];float d=Mathf.Repeat(n*19,route.length);
            for(int attempt=0;attempt<100;attempt++){
                var p=RoutePosition(route,d,out var h);bool clear=true;
                for(int j=0;j<n;j++)if((trafficPositions[j]-p).sqrMagnitude<30){clear=false;break;}
                if(clear)break;d=Mathf.Repeat(d+6,route.length);
            }
            trafficTravel[n]=d;trafficPositions[n]=RoutePosition(route,d,out trafficDirections[n]);
            cars[n].localPosition=trafficPositions[n];cars[n].localRotation=Quaternion.LookRotation(trafficDirections[n]);
        }
    }
    static Vector3 RoutePosition(SharedTraffic route,float distance,out Vector3 heading)
    {
        var points=route.points;float phase=Mathf.Repeat(distance,route.length)/route.length*(points.Length-1);
        int i=Mathf.Min(points.Length-2,Mathf.FloorToInt(phase));float blend=phase-i;
        var a=points[i];var b=points[i+1];var c=points[(i+2)%(points.Length-1)];
        Vector3 from=new(a.x,a.y,a.z),to=new(b.x,b.y,b.z);
        heading=Vector3.Lerp(to-from,new(c.x-b.x,c.y-b.y,c.z-b.z),blend).normalized;
        return Vector3.Lerp(from,to,blend);
    }
    void AnimateRoadTraffic()
    {
        if(trafficTravel==null)return;
        int phase=TrafficAspect(Time.time,true)*3+TrafficAspect(Time.time,false);
        foreach(var signal in junctionSignals){
            signal.root.gameObject.SetActive(HorizontalDistance(signal.center)<(distance>250?430:230));
            if(phase!=lastSignalPhase)foreach(var bulb in signal.bulbs)bulb.renderer.sharedMaterial=bulb.aspect==TrafficAspect(Time.time,bulb.eastWest)?signalOn[bulb.aspect]:signalOff[bulb.aspect];
        }
        lastSignalPhase=phase;
        float travel=Mathf.Min(Time.deltaTime,.1f)*4.5f;
        for(int n=0;n<cars.Count;n++){
            float step=travel;var p=trafficPositions[n];var heading=trafficDirections[n];
            foreach(var signal in junctionSignals)step=SignalTravelLimit(p,heading,signal.center,step,Time.time);
            // Queue behind a vehicle in the same lane, including shared routes.
            for(int j=0;j<cars.Count;j++){
                if(j==n||Vector3.Dot(heading,trafficDirections[j])<.3f)continue;
                var delta=trafficPositions[j]-p;float ahead=Vector3.Dot(delta,heading);
                if(ahead>.05f&&ahead<5.2f+step&&Mathf.Abs(delta.x*heading.z-delta.z*heading.x)<1.8f)step=Mathf.Min(step,Mathf.Max(0,ahead-5.2f));
            }
            trafficTravel[n]=Mathf.Repeat(trafficTravel[n]+step,cityData.traffic[n].length);
            var car=cars[n];car.localPosition=RoutePosition(cityData.traffic[n],trafficTravel[n],out var nextHeading);
            if(nextHeading.sqrMagnitude>.001f)car.localRotation=Quaternion.LookRotation(nextHeading);
            car.gameObject.SetActive((frame?.night!=true||n%3==0)&&HorizontalDistance(car.position)<(distance>250?420:230));
        }
        // Use one snapshot for all drivers, so update order cannot cause overtaking.
        for(int n=0;n<cars.Count;n++){trafficPositions[n]=cars[n].localPosition;trafficDirections[n]=cars[n].forward;}
    }
}
