using System.Collections.Generic;
using UnityEngine;

// Small, original pose demonstration. Routes stay within clear aisles and pavements.
public sealed class PrototypePerson : MonoBehaviour
{
    public Transform model;
    public bool seated;
    public bool working;
    public bool externallyWalking, sleeping;
    public float animationSpeed = 1;
    float poseTime;
    public Vector3 routeA, routeB;
    public float walkingSpeed = .8f;
    public float phase;
    readonly Dictionary<string, Transform> bones = new();
    readonly Dictionary<string, Quaternion> rotations = new();
    readonly Dictionary<string, Vector3> directions = new();
    readonly List<Renderer> footwear = new();
    float modelY, hipY;
    bool walking;

    void Start()
    {
        SetModel(model);
    }
    public void SetModel(Transform source)
    {
        if(!source)return;
        model = source; bones.Clear(); rotations.Clear(); directions.Clear();footwear.Clear();
        foreach(var renderer in model.GetComponentsInChildren<Renderer>())if(renderer.name.ToLowerInvariant().Contains("shoe"))footwear.Add(renderer);
        foreach(var skin in source.GetComponentsInChildren<SkinnedMeshRenderer>())skin.quality=SkinQuality.Bone4;
        foreach (var t in model.GetComponentsInChildren<Transform>()) bones[t.name] = t;
        foreach (var item in bones)
        {
            var t = item.Value;
            rotations[item.Key] = Quaternion.Inverse(transform.rotation) * t.rotation;
            if (t.childCount > 0) directions[item.Key] = transform.InverseTransformDirection(t.GetChild(0).position - t.position).normalized;
        }
        modelY = model.localPosition.y;
        if (bones.TryGetValue("pelvis", out var hip)) hipY = transform.InverseTransformPoint(hip.position).y;
        walking = !seated && Vector3.Distance(routeA, routeB) > .1f;
    }

    void Aim(string name, Vector3 direction)
    {
        if (!bones.TryGetValue(name, out var bone) || !directions.TryGetValue(name, out var rest)) return;
        bone.rotation = transform.rotation * Quaternion.FromToRotation(rest, direction.normalized) * rotations[name];
    }

    void LateUpdate()
    {
        if (!model) return;
        foreach(var shoe in footwear)if(shoe)shoe.enabled=!sleeping;
        poseTime += Time.deltaTime * animationSpeed;
        float time = poseTime + phase;
        bool moving = walking || externallyWalking;
        if (walking)
        {
            float length = Vector3.Distance(routeA, routeB);
            float cycle = Mathf.Repeat(time * walkingSpeed / length, 2);
            transform.position = Vector3.Lerp(routeA, routeB, cycle < 1 ? cycle : 2 - cycle);
            transform.rotation = Quaternion.LookRotation((routeB - routeA) * (cycle < 1 ? 1 : -1));
        }
        model.localPosition = new Vector3(0, modelY + (seated ? .46f - hipY : moving ? Mathf.Abs(Mathf.Sin(time * 5.7f)) * .009f : 0), 0);
        model.localRotation = Quaternion.identity;
        foreach(var item in bones)item.Value.rotation=transform.rotation*rotations[item.Key];
        if (sleeping) {
            foreach(string suffix in new[]{"l","r"}){
                float side=bones.TryGetValue("upperarm_"+suffix,out var shoulder)?Mathf.Sign(transform.InverseTransformPoint(shoulder.position).x):suffix=="l"?-1:1;
                Aim("upperarm_"+suffix,new(side*.08f,-1,.05f));
                Aim("lowerarm_"+suffix,new(side*.04f,-1,.12f));
                Aim("thigh_"+suffix,new(side*.025f,-1,.035f));
                Aim("calf_"+suffix,new(0,-1,-.025f));
            }
            // Face upward on the mattress. The resident's final yaw points the head at the pillows.
            model.localRotation=Quaternion.Euler(-90,0,0);
            return;
        }
        float stride = moving ? Mathf.Sin(time * 5.7f) : 0;
        foreach (string suffix in new[] { "l", "r" })
        {
            // Imported rigs can use either left/right axis convention. Keep
            // sleeves and hands outside the torso instead of aiming inward.
            float side = bones.TryGetValue("upperarm_" + suffix, out var shoulder)
                ? Mathf.Sign(transform.InverseTransformPoint(shoulder.position).x)
                : suffix == "l" ? -1 : 1;
            float swing = stride * side;
            Aim("thigh_" + suffix, new Vector3(side * .015f, seated ? -.18f : -1, seated ? 1 : swing * .37f));
            Aim("calf_" + suffix, new Vector3(0, -1, seated ? -.025f : -Mathf.Max(0, swing) * .45f));
            if (bones.TryGetValue("foot_" + suffix, out var foot)) foot.rotation = transform.rotation * rotations["foot_" + suffix];
            Aim("upperarm_" + suffix, new Vector3(side * .24f, -1, seated || working ? .4f : -swing * .29f));
            Aim("lowerarm_" + suffix, seated || working ? new Vector3(-side * .12f, -.1f, 1) : new Vector3(side * .06f, -1, .1f - swing * .23f));
        }
    }
}
