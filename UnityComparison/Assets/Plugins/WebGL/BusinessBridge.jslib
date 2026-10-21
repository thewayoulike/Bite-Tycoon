mergeInto(LibraryManager.library, {
  BusinessUnityEvent: function (jsonPointer) {
    window.dispatchEvent(new CustomEvent('business-unity-event', {detail: UTF8ToString(jsonPointer)}));
  }
});
