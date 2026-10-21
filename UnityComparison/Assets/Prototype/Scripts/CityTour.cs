using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

public sealed class CityTour : MonoBehaviour
{
    public Camera viewCamera;
    public GameObject restaurantRoof;
    public GameObject supermarketRoof;
    public Transform[] traffic;
    Vector3 target = new Vector3(0, 0, 0);
    float yaw = 0, pitch = 51, distance = 62, frameTime;
    int view;
    GUIStyle heading, subtitle, button;

    void Start() { Application.targetFrameRate = 60; SetView(0); }
    public void SetView(int selection)
    {
        view = selection;
        target = selection == 1 ? new Vector3(-13, 0, 1) : selection == 2 ? new Vector3(12, 0, 1) : Vector3.zero;
        distance = selection == 0 ? 72 : selection == 1 ? 29 : 33;
        pitch = selection == 0 ? 42 : 48;
        yaw = selection == 0 ? 18 : selection == 1 ? -12 : -25;
        if (restaurantRoof) restaurantRoof.SetActive(selection != 1);
        if (supermarketRoof) supermarketRoof.SetActive(selection != 2);
    }
    void Update()
    {
        frameTime = Mathf.Lerp(frameTime, Time.unscaledDeltaTime, .08f);
        Vector2 mouseDelta = Vector2.zero, move = Vector2.zero;
        float wheel = 0;
        bool rotate = false, pan = false;
#if ENABLE_INPUT_SYSTEM
        var mouse = Mouse.current;
        var keys = Keyboard.current;
        if (mouse != null) { mouseDelta = mouse.delta.ReadValue(); wheel = mouse.scroll.ReadValue().y / 120f; rotate = mouse.rightButton.isPressed; pan = mouse.middleButton.isPressed; }
        if (keys != null) {
            move.x = (keys.dKey.isPressed || keys.rightArrowKey.isPressed ? 1 : 0) - (keys.aKey.isPressed || keys.leftArrowKey.isPressed ? 1 : 0);
            move.y = (keys.wKey.isPressed || keys.upArrowKey.isPressed ? 1 : 0) - (keys.sKey.isPressed || keys.downArrowKey.isPressed ? 1 : 0);
            if (keys.digit1Key.wasPressedThisFrame) SetView(0);
            if (keys.digit2Key.wasPressedThisFrame) SetView(1);
            if (keys.digit3Key.wasPressedThisFrame) SetView(2);
        }
#else
        mouseDelta = new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y")) * 8;
        wheel = Input.mouseScrollDelta.y;
        rotate = Input.GetMouseButton(1); pan = Input.GetMouseButton(2);
        move = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
        if (Input.GetKeyDown(KeyCode.Alpha1)) SetView(0);
        if (Input.GetKeyDown(KeyCode.Alpha2)) SetView(1);
        if (Input.GetKeyDown(KeyCode.Alpha3)) SetView(2);
#endif
        if (rotate) { yaw += mouseDelta.x * .18f; pitch = Mathf.Clamp(pitch - mouseDelta.y * .15f, 22, 78); }
        distance = Mathf.Clamp(distance - wheel * distance * .07f, 9, 90);
        Quaternion flat = Quaternion.Euler(0, yaw, 0);
        target += flat * new Vector3(move.x, 0, move.y) * Time.unscaledDeltaTime * distance * .3f;
        if (pan) target += flat * new Vector3(-mouseDelta.x, 0, -mouseDelta.y) * distance * .0015f;
        target.x = Mathf.Clamp(target.x, -38, 38); target.z = Mathf.Clamp(target.z, -25, 27);
        var desired = target + Quaternion.Euler(pitch, yaw, 0) * new Vector3(0, 0, -distance);
        desired.y = Mathf.Max(2, desired.y);
        viewCamera.transform.position = Vector3.Lerp(viewCamera.transform.position, desired, 1 - Mathf.Exp(-8 * Time.unscaledDeltaTime));
        viewCamera.transform.LookAt(target + Vector3.up * .8f);
        if (traffic != null) for (int i = 0; i < traffic.Length; i++) {
            if (!traffic[i]) continue;
            float x = Mathf.Repeat(Time.time * (3.2f + i * .2f) + i * 27, 92) - 46;
            traffic[i].position = new Vector3(i % 2 == 0 ? x : -x, .15f, i % 2 == 0 ? -17.5f : -21.5f);
            traffic[i].rotation = Quaternion.Euler(0, i % 2 == 0 ? 90 : -90, 0);
        }
    }
    void OnGUI()
    {
        float scale = Mathf.Min(Screen.width / 1280f, Screen.height / 720f);
        GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, Vector3.one * scale);
        float width = Screen.width / scale, height = Screen.height / scale;
        if (heading == null) {
            heading = new GUIStyle(GUI.skin.label) {fontSize=25, fontStyle=FontStyle.Bold}; heading.normal.textColor = new Color(.96f,.93f,.85f);
            subtitle = new GUIStyle(GUI.skin.label) {fontSize=13}; subtitle.normal.textColor = new Color(.73f,.83f,.8f);
            button = new GUIStyle(GUI.skin.button) {fontSize=15, fontStyle=FontStyle.Bold};
        }
        GUI.color = new Color(.06f,.14f,.16f,.92f); GUI.DrawTexture(new Rect(22,22,438,99),Texture2D.whiteTexture); GUI.color=Color.white;
        GUI.Label(new Rect(40,32,410,35),"BUSINESS SIMULATOR",heading);
        GUI.Label(new Rect(40,71,410,24),"UNITY GRAPHICS TEST  /  SMALL CITY BLOCK",subtitle);
        GUI.Label(new Rect(40,93,410,20),"Visual prototype · economy and save files are separate",subtitle);
        GUI.color = new Color(.06f,.14f,.16f,.94f); GUI.DrawTexture(new Rect(width/2-280,height-91,560,71),Texture2D.whiteTexture); GUI.color=Color.white;
        string[] names = {"1  Neighborhood","2  Restaurant","3  Supermarket"};
        for (int i=0;i<3;i++) { GUI.backgroundColor = view==i ? new Color(.5f,.78f,.65f) : Color.white; if(GUI.Button(new Rect(width/2-266+i*179,height-80,174,42),names[i],button)) SetView(i); }
        GUI.backgroundColor=Color.white;
        GUI.Label(new Rect(width/2-265,height-37,550,24),"WASD: move   ·   Right drag: orbit   ·   Middle drag: pan   ·   Scroll: zoom",subtitle);
        GUI.color = new Color(.06f,.14f,.16f,.9f); GUI.DrawTexture(new Rect(width-172,22,150,54),Texture2D.whiteTexture); GUI.color=Color.white;
        GUI.Label(new Rect(width-158,31,132,35),$"{1f/Mathf.Max(.001f,frameTime):0} FPS  ·  Unity",subtitle);
    }
}
