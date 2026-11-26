const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  switchInput: (target) => ipcRenderer.send("switch-input", target),
  getActiveInput: () => ipcRenderer.send("get-active-input"),
  onActiveInputDetected: (callback) =>
    ipcRenderer.on("active-input-detected", (_event, value) => callback(value)),
});
