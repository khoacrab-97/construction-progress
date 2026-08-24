"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const openFileRequestCallbacks = new Set();
const closeRequestCallbacks = new Set();
const updateEventCallbacks = new Set();

ipcRenderer.on("project:open-file-request", (_event, payload) => {
  openFileRequestCallbacks.forEach((callback) => callback(payload));
});

ipcRenderer.on("app:close-request", () => {
  closeRequestCallbacks.forEach((callback) => callback());
});

ipcRenderer.on("updates:event", (_event, payload) => {
  updateEventCallbacks.forEach((callback) => callback(payload));
});

contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  openProject: () => ipcRenderer.invoke("project:open"),
  loadProjectFile: (filePath) => ipcRenderer.invoke("project:load-file", filePath),
  saveProject: (payload) => ipcRenderer.invoke("project:save", payload),
  saveProjectAs: (payload) => ipcRenderer.invoke("project:save-as", payload),
  exportPdf: (payload) => ipcRenderer.invoke("project:export-pdf", payload),
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getInitialOpenFile: () => ipcRenderer.invoke("app:get-initial-open-file"),
  setWindowTitle: (title) => ipcRenderer.invoke("app:set-window-title", title),
  closeAfterConfirm: () => ipcRenderer.invoke("app:close-after-confirm"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  downloadUpdate: () => ipcRenderer.invoke("updates:download"),
  quitAndInstall: () => ipcRenderer.invoke("updates:quit-and-install"),
  onUpdateEvent: (callback) => {
    if (typeof callback !== "function") return () => {};
    updateEventCallbacks.add(callback);
    return () => updateEventCallbacks.delete(callback);
  },
  onOpenFileRequest: (callback) => {
    if (typeof callback !== "function") return () => {};
    openFileRequestCallbacks.add(callback);
    return () => openFileRequestCallbacks.delete(callback);
  },
  onCloseRequest: (callback) => {
    if (typeof callback !== "function") return () => {};
    closeRequestCallbacks.add(callback);
    return () => closeRequestCallbacks.delete(callback);
  }
});
