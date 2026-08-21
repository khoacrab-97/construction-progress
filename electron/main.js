"use strict";

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { createUpdateService } = require("./update-service");

const APP_NAME = "Construction Progress";
const PROJECT_EXTENSIONS = new Set([".tdtc", ".json"]);

let mainWindow = null;
let currentProjectPath = null;
let pendingOpenFile = null;
let allowWindowClose = false;
let updateService = null;

function projectFilters() {
  return [
    { name: "Construction Progress Project (*.tdtc)", extensions: ["tdtc"] },
    { name: "JSON Project (*.json)", extensions: ["json"] },
    { name: "All Files (*.*)", extensions: ["*"] }
  ];
}

function normalizeProjectPath(filePath) {
  if (!filePath || typeof filePath !== "string") return null;
  const normalized = path.resolve(filePath);
  const ext = path.extname(normalized).toLowerCase();
  if (!PROJECT_EXTENSIONS.has(ext)) return null;
  return normalized;
}

function findProjectArg(argv, cwd = process.cwd()) {
  for (const arg of argv || []) {
    if (!arg || arg.startsWith("-")) continue;
    const candidate = path.isAbsolute(arg) ? arg : path.resolve(cwd, arg);
    const normalized = normalizeProjectPath(candidate);
    if (normalized && fsSync.existsSync(normalized)) return normalized;
  }
  return null;
}

function ensureExtension(filePath, extension) {
  const ext = path.extname(filePath);
  return ext ? filePath : `${filePath}${extension}`;
}

function safeFileNameFromProjectName(projectName, extension = ".tdtc") {
  const base = String(projectName || "tien-do-thi-cong")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base || "tien-do-thi-cong"}${extension}`;
}

function projectDescriptor(filePath) {
  return {
    filePath,
    fileName: path.basename(filePath)
  };
}

async function readProjectFile(filePath) {
  const normalized = normalizeProjectPath(filePath);
  if (!normalized) throw new Error("Unsupported project file type.");
  const text = await fs.readFile(normalized, "utf8");
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.tasks) || !data.start) {
    throw new Error("Invalid project file.");
  }
  currentProjectPath = normalized;
  return {
    canceled: false,
    data,
    ...projectDescriptor(normalized)
  };
}

async function writeProjectFile(filePath, jsonText) {
  const normalized = normalizeProjectPath(filePath);
  if (!normalized) throw new Error("Unsupported project file type.");
  await fs.writeFile(normalized, jsonText, "utf8");
  currentProjectPath = normalized;
  return {
    canceled: false,
    ...projectDescriptor(normalized)
  };
}

function createWindow() {
  const iconPath = path.join(__dirname, "..", "assets", "icon.ico");
  const browserWindowOptions = {
    title: APP_NAME,
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#f5f7f8",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  };

  if (fsSync.existsSync(iconPath)) {
    browserWindowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(browserWindowOptions);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (url !== currentUrl && /^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("close", (event) => {
    if (allowWindowClose) return;
    event.preventDefault();
    mainWindow.webContents.send("app:close-request");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, "..", "src", "index.html"));
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  pendingOpenFile = findProjectArg(process.argv);

  app.on("second-instance", (_event, commandLine, workingDirectory) => {
    const filePath = findProjectArg(commandLine, workingDirectory);
    focusMainWindow();
    if (filePath && mainWindow) {
      mainWindow.webContents.send("project:open-file-request", projectDescriptor(filePath));
    }
  });

  app.whenReady().then(() => {
    updateService = createUpdateService();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app:get-version", () => app.getVersion());

ipcMain.handle("app:get-initial-open-file", () => {
  if (!pendingOpenFile) return null;
  const descriptor = projectDescriptor(pendingOpenFile);
  pendingOpenFile = null;
  return descriptor;
});

ipcMain.handle("app:set-window-title", (event, title) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && typeof title === "string") win.setTitle(title.slice(0, 240));
});

ipcMain.handle("app:close-after-confirm", () => {
  if (!mainWindow) return;
  allowWindowClose = true;
  mainWindow.close();
});

ipcMain.handle("project:open", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: "Open Project",
    properties: ["openFile"],
    filters: projectFilters()
  });

  if (result.canceled || !result.filePaths.length) return { canceled: true };
  try {
    return await readProjectFile(result.filePaths[0]);
  } catch (error) {
    return { canceled: false, error: error.message || String(error) };
  }
});

ipcMain.handle("project:load-file", async (_event, filePath) => {
  try {
    return await readProjectFile(filePath);
  } catch (error) {
    return { canceled: false, error: error.message || String(error) };
  }
});

async function saveProject(event, payload, forceSaveAs) {
  const win = BrowserWindow.fromWebContents(event.sender);
  const jsonText = typeof payload?.json === "string" ? payload.json : "";
  if (!jsonText) return { canceled: false, error: "No project data to save." };

  let targetPath = forceSaveAs ? null : currentProjectPath;

  if (!targetPath) {
    const defaultName = safeFileNameFromProjectName(payload?.suggestedName || payload?.projectName);
    const result = await dialog.showSaveDialog(win, {
      title: forceSaveAs ? "Save Project As" : "Save Project",
      defaultPath: defaultName,
      filters: projectFilters()
    });

    if (result.canceled || !result.filePath) return { canceled: true };
    targetPath = ensureExtension(result.filePath, ".tdtc");
  }

  try {
    return await writeProjectFile(targetPath, jsonText);
  } catch (error) {
    return { canceled: false, error: error.message || String(error) };
  }
}

ipcMain.handle("project:save", (event, payload) => saveProject(event, payload, false));
ipcMain.handle("project:save-as", (event, payload) => saveProject(event, payload, true));

ipcMain.handle("project:export-pdf", async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const defaultName = safeFileNameFromProjectName(payload?.suggestedName || "Tien-do-thi-cong", ".pdf");
  const result = await dialog.showSaveDialog(win, {
    title: "Export PDF",
    defaultPath: defaultName,
    filters: [
      { name: "PDF Document (*.pdf)", extensions: ["pdf"] },
      { name: "All Files (*.*)", extensions: ["*"] }
    ]
  });

  if (result.canceled || !result.filePath) return { canceled: true };

  const targetPath = ensureExtension(result.filePath, ".pdf");
  try {
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true
    });
    await fs.writeFile(targetPath, pdfData);
    return {
      canceled: false,
      filePath: targetPath,
      fileName: path.basename(targetPath)
    };
  } catch (error) {
    return { canceled: false, error: error.message || String(error) };
  }
});

ipcMain.handle("updates:check", async () => {
  if (!updateService) {
    return {
      status: "disabled",
      message: "Update service is not initialized."
    };
  }
  return updateService.checkForUpdates();
});
