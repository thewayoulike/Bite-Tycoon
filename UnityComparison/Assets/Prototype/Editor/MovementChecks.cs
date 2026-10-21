using System;
using UnityEngine;
using UnityEngine.Assertions;
using Object=UnityEngine.Object;

public static class MovementChecks
{
 public static string Run(){
  var go=new GameObject("Movement regression check");
  try{
   var pose=go.AddComponent<PrototypePerson>();var actor=go.AddComponent<BusinessActor>();actor.pose=pose;actor.speed=1;actor.seatAtEnd=true;
   actor.Follow("blocked",new[]{Vector3.zero},false,true);actor.Step(.1f);
   Assert.IsFalse(pose.seated,"A blocked route must not seat a customer at the entrance.");
   var path=new[]{Vector3.zero,new Vector3(0,0,2),new Vector3(2,0,2)};
   go.transform.position=Vector3.zero;actor.Follow("arrival",path,false,false);
   for(int i=0;i<14;i++)actor.Step(.1f);
   var before=go.transform.position;
   Assert.IsTrue(before.x>0&&before.z==2,"Walk around the corner, never across it.");
   actor.Follow("arrival",path,false,false);actor.Step(.1f);
   Assert.IsTrue(go.transform.position.x>=before.x,"A service state update must not reset the route.");
   for(int i=0;i<20;i++)actor.Step(.1f);
   Assert.IsTrue(pose.seated);Assert.IsTrue((go.transform.position-path[2]).sqrMagnitude<.0001f);
   actor.seatAtEnd=false;actor.Follow("departure",path,true,false);actor.Step(.1f);
   Assert.IsFalse(pose.seated);Assert.IsTrue(pose.externallyWalking);Assert.IsFalse(pose.working);
   before=go.transform.position;actor.speed=0;actor.Step(.1f);Assert.AreEqual(before,go.transform.position);
   return "Movement checks passed: blocked seats, corner routes, state changes, departure, pause.";
  }finally{Object.DestroyImmediate(go);}
 }
}
