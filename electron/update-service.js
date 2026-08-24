"use strict";

const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function createUpdateService() {
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

  autoUpdater.autoDownload = false;

  autoUpdater.on("update-downloaded", () => {
    updateDownloaded = true;
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
