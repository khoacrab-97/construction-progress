"use strict";

const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function createUpdateService(notify) {
  // notify: main.js truyền vào để đẩy sự kiện xuống giao diện (kênh updates:event)
  const emit = (type, payload) => {
    if (typeof notify !== "function") return;
    try { notify(Object.assign({ type }, payload || {})); } catch (error) { }
  };
  let autoUpdater = null;
  let lastCheckResult = null;
  let updateDownloaded = false;

  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    return {
      async checkForUpdates() {
        return {
          status: "unavailable",
          message: "Chưa cài electron-updater.",
          detail: error.message
        };
      }
    };
  }

  // KHÔNG tự tải. Thấy bản mới thì chỉ báo về giao diện để hỏi người dùng;
  // chỉ khi họ bấm "Cập nhật" mới gọi downloadUpdate(). Tải ngầm không hỏi
  // làm người dùng mất băng thông và ngạc nhiên khi app tự khởi động lại.
  autoUpdater.autoDownload = false;
  // Lưới an toàn: đã tải xong mà chưa kịp cài thì cài lúc thoát app.
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", info => emit("available", { version: info && info.version }));
  autoUpdater.on("update-not-available", () => emit("not-available"));
  autoUpdater.on("download-progress", p => emit("progress", { percent: Math.round((p && p.percent) || 0) }));
  autoUpdater.on("error", err => emit("error", { message: String((err && err.message) || err || "") }));

  autoUpdater.on("update-downloaded", info => {
    updateDownloaded = true;
    emit("downloaded", { version: info && info.version });
  });

  function readableUpdateError(error) {
    const detail = error && error.message ? error.message : String(error || "");
    if (/404|not found|latest\.yml/i.test(detail)) {
      return {
        status: "error",
        message: "Không đọc được GitHub Release. Kiểm tra kho GitHub có đang private, release có đang draft, hoặc release có thiếu latest.yml không.",
        detail
      };
    }

    return {
      status: "error",
      message: "Không kiểm tra được cập nhật.",
      detail
    };
  }

  function isConfigured() {
    const updateConfigPath = path.join(process.resourcesPath || "", "app-update.yml");
    return fs.existsSync(updateConfigPath);
  }

  function inactiveStatus() {
    if (!app.isPackaged) {
      return {
        status: "disabled",
        message: "Tự động cập nhật chỉ hoạt động trong bản đã đóng gói."
      };
    }

    if (!isConfigured()) {
      return {
        status: "not-configured",
        message: "Chưa cấu hình nguồn phát hành cho tự động cập nhật."
      };
    }

    return null;
  }

  return {
    async checkForUpdates() {
      const inactive = inactiveStatus();
      if (inactive) return inactive;

      try {
        const result = await autoUpdater.checkForUpdates();
        lastCheckResult = result;
        updateDownloaded = false;

        if (!result) {
          return {
            status: "not-configured",
            message: "Nguồn cập nhật không trả về kết quả."
          };
        }

        return {
          status: result.isUpdateAvailable ? "available" : "not-available",
          updateInfo: result.updateInfo || null
        };
      } catch (error) {
        return readableUpdateError(error);
      }
    },

    async downloadUpdate() {
      const inactive = inactiveStatus();
      if (inactive) return inactive;

      if (updateDownloaded) return { status: "downloaded" };

      if (!lastCheckResult || !lastCheckResult.isUpdateAvailable) {
        return {
          status: "not-checked",
          message: "Chưa có bản cập nhật đã kiểm tra để tải."
        };
      }

      try {
        const files = await autoUpdater.downloadUpdate();
        updateDownloaded = true;
        return {
          status: "downloaded",
          files
        };
      } catch (error) {
        return {
          status: "error",
          message: error.message || String(error)
        };
      }
    },

    quitAndInstall() {
      const inactive = inactiveStatus();
      if (inactive) return inactive;

      if (!updateDownloaded) {
        return {
          status: "not-downloaded",
          message: "Chưa có bản cập nhật đã tải sẵn để cài đặt."
        };
      }

      // isSilent = true → truyền cờ /S cho trình cài NSIS: cài đè trong nền,
      // không hiện cửa sổ trình cài đặt. isForceRunAfter = true → tự mở lại app.
      autoUpdater.quitAndInstall(true, true);
      return {
        status: "installing"
      };
    }
  };
}

module.exports = { createUpdateService };
