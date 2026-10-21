using System;
using System.Collections.Generic;
using UnityEngine;

// Movement is visual only. The existing browser simulation decides service and money.
public sealed class BusinessActor : MonoBehaviour
{
    public PrototypePerson pose;
    public float speed;
    public bool seatAtEnd, sleeping, working;
    public float startDelay;
    public float finalAngle;
    public Vector3 destination;
    Vector3[] route = Array.Empty<Vector3>();
    int next;
    string routeKey;
    public void Follow(string key, Vector3[] points, bool reverse, bool startSeated)
    {
        if (routeKey == key) return;
        routeKey = key;
        route = (Vector3[])points.Clone();
        if (reverse) Array.Reverse(route);
        next = 0;
        if (startSeated && route.Length > 1) { transform.localPosition = route[^1]; next = route.Length; startDelay=0; }
        else if (route.Length > 1)
        {
            float nearest = float.MaxValue;
            // Resume on the current segment; nearest vertices can send a turn through furniture.
            for (int n=0;n<route.Length-1;n++){
                var leg=route[n+1]-route[n];float t=leg.sqrMagnitude>0?Mathf.Clamp01(Vector3.Dot(transform.localPosition-route[n],leg)/leg.sqrMagnitude):0;
                float d=(transform.localPosition-(route[n]+leg*t)).sqrMagnitude;
                if(d<nearest){nearest=d;next=n+1;}
            }
        }
    }
    public void Direct(Vector3 point) { destination = point; route = Array.Empty<Vector3>(); next = 0; }
    void Update()=>Step(Time.deltaTime);
    public void Step(float deltaTime)
    {
        var before = transform.localPosition;
        float elapsed=Mathf.Min(deltaTime,.25f)*Mathf.Max(0,speed);
        if(startDelay>0){float wait=Mathf.Min(startDelay,elapsed);startDelay-=wait;elapsed-=wait;}
        float remaining = elapsed * 1.65f;
        if (route.Length > 0)
        {
            while (next < route.Length && remaining > 0)
            {
                var point = route[next]; float d = Vector3.Distance(transform.localPosition, point);
                if (d <= remaining) { transform.localPosition = point; remaining -= d; next++; }
                else { transform.localPosition = Vector3.MoveTowards(transform.localPosition, point, remaining); remaining = 0; }
            }
        }
        else transform.localPosition = Vector3.MoveTowards(transform.localPosition, destination, remaining * 2);
        var movement = transform.localPosition - before; movement.y = 0;
        bool moving = movement.sqrMagnitude > .000001f;
        pose.externallyWalking = moving; pose.animationSpeed = speed; pose.sleeping = sleeping;pose.working=working&&!moving;
        pose.seated = seatAtEnd && (route.Length == 0 || route.Length>1&&next >= route.Length);
        if (moving) transform.localRotation = Quaternion.Slerp(transform.localRotation,Quaternion.LookRotation(movement),1-Mathf.Exp(-12*deltaTime*Mathf.Max(1,speed)));
        else if (pose.seated || sleeping) transform.localRotation = Quaternion.Euler(0, finalAngle, 0);
    }
}
