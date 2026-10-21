using UnityEngine;
public sealed partial class BusinessGameBridge
{
    void ApartmentCharacter(Transform room,string type,float width)
    {
        bool luxury=type=="penthouse",family=type=="twobed";
        var oak=ColorMat(luxury?"A99176":family?"BA9C79":type=="onebed"?"BFAE93":"D0B99A");
        Box(room,"Residential timber floor",new(0,.021f,0),new(width-.2f,.025f,11.8f),oak);
        for(int n=0;n<23;n++)Box(room,"Floorboard joint",new(0,.035f,-5.7f+n*.5f),new(width-.2f,.002f,.012f),ColorMat("978873"));
        Box(room,"Living room woven rug",new(-1.4f,.025f,-2.7f),new(2.8f,.035f,3.2f),ColorMat(luxury?"D5D0BE":family?"778C91":"B0B5A5"));
        RoomTable(room,"Apartment lounge coffee table",new(-.65f,0,-2.7f),.85f,1.1f,luxury?plaster:wood,.43f);
        ComparisonProp(room,"BreakfastCup",new(-.65f,.5f,-2.4f),.11f);
        foreach(var r in room.GetComponentsInChildren<Renderer>())if(r.transform.IsChildOf(room.Find("Room lounge sofa"))){r.sharedMaterial=ColorMat(luxury?"476C70":type=="onebed"?"758294":family?"97765A":"8D9784");}
        for(int n=0;n<3;n++){
            float z=-3.6f+n*.95f;
            Box(room,"Kitchen cupboard door",new(width/2-1.265f,.55f,z),new(.035f,.8f,.85f),ColorMat(luxury?"395E5A":type=="onebed"?"D3D9D4":"E4D9C7"));
            Box(room,"Kitchen cupboard pull",new(width/2-1.3f,.78f,z),new(.035f,.035f,.3f),ColorMat(luxury?"C2AA72":"59656B"));
            Box(room,"Upper kitchen cabinet",new(width/2-.35f,1.98f,z),new(.56f,.7f,.9f),ColorMat(luxury?"395E5A":"E5DFD3"));
        }
        Box(room,"Residential splashback",new(width/2-.12f,1.38f,-2.6f),new(.035f,.52f,3.05f),ColorMat(luxury?"E6E2D6":"90ACA7"));
        Box(room,"Fridge door finish",new(width/2-1.17f,1,-4.8f),new(.035f,1.9f,.85f),ColorMat(luxury?"89989C":"D6DCD9"));
        RoomArt(room,new(-width/2+.14f,1.6f,-3.3f),family?"CF9F58":luxury?"B59B63":"6B929A",luxury?1.4f:1);
        Box(room,"Entry coat rail",new(-width/2+.14f,1.65f,-4.7f),new(.12f,.1f,1),wood);
        for(int n=0;n<3;n++)Sphere(room,"Coat hook",new(-width/2+.24f,1.65f,-5+n*.3f),new(.07f,.07f,.07f),metal);
        if(type=="studio"){
            Box(room,"Studio floating shelf",new(-width/2+.35f,1.45f,1.7f),new(.55f,.06f,1.15f),wood);
            Label(room,"STUDIO / COMPACT LIVING",new(0,2.8f,5.85f),.25f);
        }else if(type=="onebed"){
            for(int n=0;n<4;n++)Box(room,"Reading shelf book",new(-width/2+.28f,1.8f,-.8f+n*.15f),new(.4f,.3f,.12f),ColorMat(n%2==0?"506F82":"D9CDB2"));
            Box(room,"Reading wall shelf",new(-width/2+.3f,1.62f,-.6f),new(.55f,.06f,1.3f),wood);
        }else if(family){
            Box(room,"Family notice board",new(-width/2+.13f,1.7f,-4.7f),new(.06f,.65f,1),ColorMat("B69C73"));
            for(int n=0;n<3;n++)Box(room,"Family drawing",new(-width/2+.17f,1.7f,-5+n*.3f),new(.01f,.43f,.22f),ColorMat(n%2==0?"C5D8D4":"EBD9A9"));
            for(int n=0;n<4;n++)Box(room,"Family coffee table books",new(-.65f,.51f+n*.035f,-2.7f),new(.3f,.03f,.4f),ColorMat(n%2==0?"BB9055":"638A97"));
        }else if(luxury){
            Box(room,"Penthouse island stone top",new(.7f,1.23f,-2.4f),new(1.18f,.1f,1.58f),ColorMat("E6E2D6"));
            for(int n=0;n<6;n++)Box(room,"Walnut feature slat",new(-width/2+.13f,1.5f,.1f+n*.24f),new(.09f,2.7f,.09f),wood);
            Plant(room,new(-2.8f,0,5.5f),.6f);
        }
    }
}
