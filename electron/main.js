"use strict";

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { createUpdateService } = require("./update-service");

const APP_NAME = "Tiến độ thi công";
const PROJECT_EXTENSIONS = new Set([".tdtc", ".json"]);

/* MỖI CỬA SỔ LÀ MỘT TÀI LIỆU RIÊNG.
   Trước đây main.js giữ đúng một mainWindow và một currentProjectPath, nên
   mở hai file là hai cửa sổ ghi đè đường dẫn của nhau — bấm Lưu ở cửa sổ này
   có thể ghi vào file của cửa sổ kia. Nay mọi thứ tra theo webContents.id. */
const winPath = new Map();      // wcId → đường dẫn .tdtc cửa sổ đang giữ
const winPending = new Map();   // wcId → file cần mở ngay khi cửa sổ dựng xong
const allowClose = new Set();   // wcId đã xác nhận cho đóng
let allowCloseAll = false;      // đang cài bản cập nhật → đóng hết, không hỏi
let pendingOpenFile = null;
let updateService = null;

function projectFilters() {
  return [
    { name: "Dự án tiến độ thi công (*.tdtc)", extensions: ["tdtc"] },
    { name: "Dự án JSON (*.json)", extensions: ["json"] },
    { name: "Tất cả tệp (*.*)", extensions: ["*"] }
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
  if (!normalized) throw new Error("Định dạng tệp dự án không được hỗ trợ.");
  const text = await fs.readFile(normalized, "utf8");
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.tasks) || !data.start) {
    throw new Error("Tệp dự án không hợp lệ.");
  }
  /* KHÔNG gán winPath ở đây. Đọc file chỉ là đọc — cửa sổ có nhận nó làm
     tài liệu của mình hay không là do renderer quyết, và nó khai báo bằng
     project:set-path. Trước đây gán ngay tại đây nên mở file thứ ba bị hiểu
     nhầm là "file đã mở ở cửa sổ này" và chỉ focus lại chính nó. */
  return {
    canceled: false,
    data,
    ...projectDescriptor(normalized)
  };
}

async function writeProjectFile(filePath, jsonText, wcId) {
  const normalized = normalizeProjectPath(filePath);
  if (!normalized) throw new Error("Định dạng tệp dự án không được hỗ trợ.");
  await fs.writeFile(normalized, jsonText, "utf8");
  if (wcId != null) winPath.set(wcId, normalized);
  return {
    canceled: false,
    ...projectDescriptor(normalized)
  };
}

/* opts.blank = cửa sổ mở cho lệnh New: nạp kèm hash #blank để renderer vào
   thẳng bảng trống, không dừng ở màn hình Backstage. */
function createWindow(filePath, opts) {
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

  const win = new BrowserWindow(browserWindowOptions);
  const wcId = win.webContents.id;
  if (filePath) winPending.set(wcId, filePath);

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    const currentUrl = win.webContents.getURL();
    if (url !== currentUrl && /^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.on("close", (event) => {
    // allowCloseAll: đang cài bản cập nhật, mọi cửa sổ phải đóng không hỏi lại
    if (allowCloseAll || allowClose.has(wcId)) return;
    event.preventDefault();
    win.webContents.send("app:close-request");
  });

  win.on("closed", () => {
    winPath.delete(wcId);
    winPending.delete(wcId);
    allowClose.delete(wcId);
  });

  win.loadFile(path.join(__dirname, "..", "src", "index.html"),
    (opts && opts.blank) ? { hash: "blank" } : undefined);
  return win;
}

function focusWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.focus();
}

function samePath(a, b) {
  if (!a || !b) return false;
  return path.normalize(a).toLowerCase() === path.normalize(b).toLowerCase();
}

function windowForPath(filePath) {
  const target = normalizeProjectPath(filePath);
  if (!target) return null;
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    if (samePath(winPath.get(win.webContents.id), target)) return win;
    if (samePath(winPending.get(win.webContents.id), target)) return win;
  }
  return null;
}

/* Mở một file thành cửa sổ riêng. Nếu file đó đang mở ở đâu rồi thì đưa cửa
   sổ đó lên chứ KHÔNG nhân bản — hai cửa sổ cùng một file sẽ ghi đè lẫn nhau
   cả trên đĩa lẫn trong localStorage. */
function openFileWindow(filePath) {
  const existing = windowForPath(filePath);
  if (existing) { focusWindow(existing); return { focused: true }; }
  createWindow(filePath);
  return { opened: true };
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  pendingOpenFile = findProjectArg(process.argv);

  app.on("second-instance", (_event, commandLine, workingDirectory) => {
    const filePath = findProjectArg(commandLine, workingDirectory);
    if (filePath) { openFileWindow(filePath); return; }
    focusWindow(BrowserWindow.getAllWindows()[0]);
  });

  app.whenReady().then(() => {
    updateService = createUpdateService(payload => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (win.isDestroyed()) continue;
        try { win.webContents.send("updates:event", payload); } catch (error) { }
      }
    });
    createWindow(pendingOpenFile);
    pendingOpenFile = null;

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(null);
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app:get-version", () => app.getVersion());

ipcMain.handle("app:get-initial-open-file", (event) => {
  const wcId = event.sender.id;
  const filePath = winPending.get(wcId);
  if (!filePath) return null;
  winPending.delete(wcId);
  winPath.set(wcId, filePath);   // cửa sổ này nhận file đó làm tài liệu của mình
  return projectDescriptor(filePath);
});

/* Renderer nhờ mở một cửa sổ mới — cho file, hoặc trống khi truyền null */
ipcMain.handle("app:open-window", (_event, filePath, opts) => {
  if (!filePath) { createWindow(null, opts); return { opened: true }; }
  return openFileWindow(filePath);
});

/* Renderer khai báo "cửa sổ này đang giữ file nào". Là nguồn sự thật cho
   nút Lưu: thiếu nó thì Lưu không biết ghi đè vào đâu. */
ipcMain.handle("project:set-path", (event, filePath) => {
  const wcId = event.sender.id;
  const normalized = filePath ? normalizeProjectPath(filePath) : null;
  if (normalized) winPath.set(wcId, normalized); else winPath.delete(wcId);
  return true;
});

ipcMain.handle("app:set-window-title", (event, title) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && typeof title === "string") win.setTitle(title.slice(0, 240));
});

ipcMain.handle("app:close-after-confirm", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  allowClose.add(event.sender.id);
  win.close();
});

ipcMain.handle("project:open", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: "Mở dự án",
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
  if (!jsonText) return { canceled: false, error: "Không có dữ liệu dự án để lưu." };

  let targetPath = forceSaveAs ? null : winPath.get(event.sender.id);

  if (!targetPath) {
    const defaultName = safeFileNameFromProjectName(payload?.suggestedName || payload?.projectName);
    const result = await dialog.showSaveDialog(win, {
      title: forceSaveAs ? "Lưu dự án thành" : "Lưu dự án",
      defaultPath: defaultName,
      filters: projectFilters()
    });

    if (result.canceled || !result.filePath) return { canceled: true };
    targetPath = ensureExtension(result.filePath, ".tdtc");
  }

  try {
    return await writeProjectFile(targetPath, jsonText, event.sender.id);
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
    title: "Xuất PDF",
    defaultPath: defaultName,
    filters: [
      { name: "Tài liệu PDF (*.pdf)", extensions: ["pdf"] },
      { name: "Tất cả tệp (*.*)", extensions: ["*"] }
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
      message: "Dịch vụ cập nhật chưa sẵn sàng."
    };
  }
  return updateService.checkForUpdates();
});

ipcMain.handle("updates:download", async () => {
  if (!updateService) {
    return {
      status: "disabled",
      message: "Dịch vụ cập nhật chưa sẵn sàng."
    };
  }
  return updateService.downloadUpdate();
});

ipcMain.handle("updates:quit-and-install", () => {
  // Nhiều cửa sổ: nếu không mở cờ này thì từng cửa sổ sẽ chặn close để hỏi
  // lưu, và bản cập nhật treo giữa chừng không bao giờ cài xong.
  allowCloseAll = true;
  if (!updateService) {
    return {
      status: "disabled",
      message: "Dịch vụ cập nhật chưa sẵn sàng."
    };
  }
  return updateService.quitAndInstall();
});
