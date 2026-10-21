using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;

public sealed partial class BusinessGameBridge
{
    // Tenure only affects presentation; owned continues to mean player-operated.
    void HighlightProperty(Transform root,BusinessProperty property)
    {
        if(!property.owned||property.offer=="internal"||property.kind=="park")return;
        bool leased=property.tenure=="leased";
        var material=ColorMat(leased?"39A9F4":"38C98B");
        material.EnableKeyword("_EMISSION");
        material.SetColor("_EmissionColor",material.color*.45f);
        var outline=Group(root,leased?"Rented property boundary":"Owned property boundary");
        // Outside the building footprint, inside its single-plot or mall site. Raised
        // above paving to avoid flicker; no lights, colliders or animation.
        outline.localPosition=SiteOffset(property);
        float halfX=GalleriaSite(property)?21.25f:9.15f,halfZ=GalleriaSite(property)?21.25f:9.15f;
        foreach(int side in new[]{-1,1}){
            Box(outline,"Boundary",new(side*halfX,.38f,0),new(.2f,.055f,halfZ*2+.2f),material);
            Box(outline,"Boundary",new(0,.38f,side*halfZ),new(halfX*2+.2f,.055f,.2f),material);
        }
        foreach(var renderer in outline.GetComponentsInChildren<Renderer>()){
            renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=false;
        }
    }

    List<BusinessMarker> MapMarkers()
    {
        var markers=new List<BusinessMarker>();
        if(frame==null||!string.IsNullOrEmpty(frame.focus))return markers;
        int listings=0;
        foreach(var p in frame.properties.OrderByDescending(p=>p.owned).ThenBy(p=>HorizontalDistance(new(p.x,0,p.z)))){
            if(p.offer is "scenery" or "public" or "internal")continue;
            if(!p.owned&&(distance>=180||listings>=8))continue;
            float height=p.kind is "hotel" or "apartments" or "plaza"?Mathf.Max(p.floors,p.exteriorFloors)*StoreyHeight(p)+4:10;
            var point=viewCamera.WorldToViewportPoint(SiteCenter(p)+Vector3.up*height);
            if(point.z<=0||point.x<.035f||point.x>.965f||point.y<.16f||point.y>.84f)continue;
            bool overlaps=markers.Any(m=>Mathf.Abs(m.x-point.x)<.17f&&Mathf.Abs(m.y-(1-point.y))<.1f);
            if(overlaps&&!p.owned)continue;
            markers.Add(new BusinessMarker{id=p.id,x=point.x,y=1-point.y,compact=p.owned&&(distance>=165||overlaps)});
            if(!p.owned)listings++;
        }
        return markers;
    }
}
