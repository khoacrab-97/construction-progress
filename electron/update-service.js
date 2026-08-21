"use strict";

const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function createUpdateService() {
  let autoUpdater = null;

  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    return {
      async checkForUpdates() {
        return {
          status: "unavailable",
          message: "electron-updater is not installed.",
          detail: error.message
        };
      }
    };
  }

  autoUpdater.autoDownload = false;

  return {
    async checkForUpdates() {
      if (!app.isPackaged) {
        return {
          status: "disabled",
          message: "Auto update is available only in packaged builds."
        };
      }

      const updateConfigPath = path.join(process.resourcesPath || "", "app-update.yml");
      if (!fs.existsSync(updateConfigPath)) {
        return {
          status: "not-configured",
          message: "Auto update publish provider is not configured yet."
        };
      }

      try {
        const result = await autoUpdater.checkForUpdates();
        if (!result) {
          return {
            status: "not-configured",
            message: "Auto update provider returned no result."
          };
        }

        return {
          status: result.updateInfo ? "ok" : "not-available",
          updateInfo: result.updateInfo || null
        };
      } catch (error) {
        return {
          status: "error",
          message: error.message || String(error)
        };
      }
    }
  };
}

module.exports = { createUpdateService };
