using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.InputSystem;

public sealed class DetailedCityTour : MonoBehaviour
{
    public Camera viewCamera;
    public GameObject restaurantCutaway, supermarketCutaway;
    public Transform[] traffic;
    public Light sun;
    public Light[] lamps;
    public Transform[] treeCrowns;
    public Volume grading;
    public GameObject staticScenery;
    public bool evening;
    public int selectedView;
    public float AverageFrameMs => frameTime * 1000;
    Vector3 target;
    float yaw, pitch, distance, frameTime;
    GUIStyle brand, eyebrow, title, body, small, button;
    readonly Color ink = new(.035f, .075f, .08f, .94f), gold = new(.85f, .72f, .46f), paper = new(.95f, .94f, .88f);
    readonly string[] names = { "STREET VIEW", "RESTAURANT", "SUPERMARKET", "NEIGHBORHOOD" };
    readonly string[] captions = { "A neighborhood worth building.", "Juniper Kitchen", "Market & Co.", "One connected neighborhood" };
    readonly string[] details = { "Brick, glass, warm timber and streets with life.", "Oak floors · dining booths · open kitchen", "Fresh produce · groceries · chilled goods", "Detailed homes · planted streets · moving traffic" };

    void Start()
    {
        Application.targetFrameRate = 60;
        if (staticScenery) StaticBatchingUtility.Combine(staticScenery);
        SetView(0); SetEvening(false);
    }

    public void SetView(int index)
    {
        selectedView = Mathf.Clamp(index, 0, 3);
        target = index == 1 ? new(-13, .5f, 1) : index == 2 ? new(12, .5f, 1) : index == 3 ? new(0, 0, 5) : new(-3, 2.5f, -2);
        distance = index == 1 ? 25 : index == 2 ? 29 : index == 3 ? 83 : 49;
        pitch = index == 1 || index == 2 ? 53 : index == 3 ? 48 : 20;
        yaw = index == 1 ? -9 : index == 2 ? -10 : index == 3 ? 20 : -16;
        restaurantCutaway.SetActive(index != 1);
        supermarketCutaway.SetActive(index != 2);
        var position = target + Quaternion.Euler(pitch, yaw, 0) * new Vector3(0, 0, -distance);
        position.y = Mathf.Max(1.7f, position.y);
        viewCamera.transform.position = position;
        viewCamera.transform.LookAt(target);
    }

    public void SetEvening(bool value)
    {
        evening = value;
        sun.transform.rotation = Quaternion.Euler(value ? 12 : 43, value ? -65 : -28, 0);
        sun.color = value ? new Color(1, .65f, .36f) : new Color(1, .93f, .82f);
        sun.intensity = value ? .7f : 2.5f;
        RenderSettings.ambientSkyColor = value ? new Color(.25f, .34f, .48f) : new Color(.68f, .78f, .88f);
        RenderSettings.ambientEquatorColor = value ? new Color(.26f, .28f, .32f) : new Color(.59f, .61f, .6f);
        RenderSettings.ambientGroundColor = value ? new Color(.13f, .14f, .17f) : new Color(.35f, .34f, .3f);
        RenderSettings.fogColor = value ? new Color(.33f, .38f, .45f) : new Color(.68f, .77f, .8f);
        if (RenderSettings.skybox) RenderSettings.skybox.SetFloat("_Exposure", value ? .55f : 1.1f);
        foreach (var lamp in lamps) if (lamp) lamp.intensity = lamp.gameObject.name.Contains("Street") ? (value ? 5 : 0) : (value ? 4 : 1.5f);
        if (grading && grading.profile.TryGet<ColorAdjustments>(out var color)) color.postExposure.Override(value ? .2f : .1f);
    }

    void Update()
    {
        frameTime = Mathf.Lerp(frameTime, Time.unscaledDeltaTime, .05f);
        bool focused = Application.isFocused;
#if UNITY_EDITOR
        focused = UnityEditor.EditorWindow.focusedWindow != null && UnityEditor.EditorWindow.focusedWindow.GetType().Name == "GameView";
#endif
        var mouse = focused ? Mouse.current : null; var keys = focused ? Keyboard.current : null;
        Vector2 move = Vector2.zero;
        if (keys != null)
        {
            move.x = (keys.dKey.isPressed ? 1 : 0) - (keys.aKey.isPressed ? 1 : 0);
            move.y = (keys.wKey.isPressed ? 1 : 0) - (keys.sKey.isPressed ? 1 : 0);
            if (keys.digit1Key.wasPressedThisFrame) SetView(0);
            if (keys.digit2Key.wasPressedThisFrame) SetView(1);
            if (keys.digit3Key.wasPressedThisFrame) SetView(2);
            if (keys.digit4Key.wasPressedThisFrame) SetView(3);
            if (keys.lKey.wasPressedThisFrame) SetEvening(!evening);
        }
        var flat = Quaternion.Euler(0, yaw, 0);
        target += flat * new Vector3(move.x, 0, move.y) * Time.unscaledDeltaTime * distance * .25f;
        if (mouse != null)
        {
            var delta = mouse.delta.ReadValue();
            if (mouse.rightButton.isPressed) { yaw += delta.x * .17f; pitch = Mathf.Clamp(pitch - delta.y * .15f, 8, 78); }
            if (mouse.middleButton.isPressed) target += flat * new Vector3(-delta.x, 0, -delta.y) * distance * .0012f;
            distance = Mathf.Clamp(distance - mouse.scroll.ReadValue().y / 120 * distance * .07f, 8, 100);
        }
        target.x = Mathf.Clamp(target.x, -45, 45); target.z = Mathf.Clamp(target.z, -24, 33);
        var pos = target + Quaternion.Euler(pitch, yaw, 0) * new Vector3(0, 0, -distance); pos.y = Mathf.Max(1.7f, pos.y);
        viewCamera.transform.position = Vector3.Lerp(viewCamera.transform.position, pos, 1 - Mathf.Exp(-7 * Time.unscaledDeltaTime));
        viewCamera.transform.LookAt(target);
        for (int i = 0; i < traffic.Length; i++)
        {
            float x = Mathf.Repeat(Time.time * (3.0f + i * .3f) + i * 27, 110) - 55;
            traffic[i].position = new Vector3(i % 2 == 0 ? x : -x, .12f, i % 2 == 0 ? -18 : -21.5f);
            traffic[i].rotation = Quaternion.Euler(0, i % 2 == 0 ? 90 : -90, 0);
            foreach (Transform part in traffic[i].GetComponentsInChildren<Transform>()) if (part.name.StartsWith("wheel")) part.Rotate(Vector3.right, Time.deltaTime * 400, Space.Self);
        }
        for (int i = 0; i < treeCrowns.Length; i++) if (treeCrowns[i]) treeCrowns[i].localRotation = Quaternion.Euler(0, 0, Mathf.Sin(Time.time * .65f + i) * .35f);
    }

    GUIStyle Style(int size, Color color, bool bold = false)
    {
        var s = new GUIStyle(GUI.skin.label) { fontSize = size, fontStyle = bold ? FontStyle.Bold : FontStyle.Normal };
        s.normal.textColor = color; return s;
    }
    void Panel(Rect rect, Color color) { GUI.color = color; GUI.DrawTexture(rect, Texture2D.whiteTexture); GUI.color = Color.white; }
    bool Nav(Rect rect, string label, bool active)
    {
        bool hover = rect.Contains(Event.current.mousePosition);
        Panel(rect, active ? new Color(.2f, .31f, .29f, 1) : hover ? new Color(.17f, .24f, .24f, 1) : ink);
        if (active) Panel(new Rect(rect.x, rect.yMax - 3, rect.width, 3), gold);
        return GUI.Button(rect, label, button);
    }
    void OnGUI()
    {
        float scale = Mathf.Min(Screen.width / 1440f, Screen.height / 900f);
        GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, Vector3.one * scale);
        float w = Screen.width / scale, h = Screen.height / scale;
        if (brand == null)
        {
            brand = Style(24, paper, true); eyebrow = Style(11, gold, true); title = Style(27, paper, true);
            body = Style(14, new Color(.8f, .85f, .81f)); small = Style(11, new Color(.69f, .76f, .73f));
            button = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontSize = 12, fontStyle = FontStyle.Bold }; button.normal.textColor = paper;
        }
        Panel(new Rect(28, 25, 355, 85), ink); Panel(new Rect(28, 25, 3, 85), gold);
        GUI.Label(new Rect(47, 35, 320, 19), "THE NEXT CHAPTER  /  UNITY VISUAL TEST", eyebrow);
        GUI.Label(new Rect(46, 56, 335, 37), "BUSINESS SIMULATOR", brand);
        Panel(new Rect(w - 255, 25, 227, 85), ink);
        GUI.Label(new Rect(w - 236, 38, 195, 20), $"{1 / Mathf.Max(.001f, frameTime):0} FPS   ·   LIVE RENDER", eyebrow);
        if (Nav(new Rect(w - 239, 66, 191, 28), evening ? "SUNSET  /  SWITCH TO DAY" : "DAYLIGHT  /  TRY SUNSET", false)) SetEvening(!evening);
        Panel(new Rect(28, h - 204, 445, 87), ink);
        GUI.Label(new Rect(46, h - 193, 415, 35), captions[selectedView], title);
        GUI.Label(new Rect(47, h - 153, 415, 26), details[selectedView], body);
        float left = w / 2 - 345;
        for (int i = 0; i < names.Length; i++) if (Nav(new Rect(left + i * 173, h - 91, 169, 49), $"0{i + 1}   {names[i]}", selectedView == i)) SetView(i);
        GUI.Label(new Rect(left + 12, h - 32, 780, 25), "WASD  move     •     Right drag  orbit     •     Middle drag  pan     •     Scroll  zoom     •     L  light", small);
        GUI.Label(new Rect(30, h - 31, 315, 24), "VISUAL PROTOTYPE  ·  NOT THE FULL SIMULATION", small);
    }
}
