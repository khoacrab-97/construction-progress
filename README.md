# Construction Progress

Electron desktop packaging for the existing single-file construction progress / Gantt scheduler.

## Development

```bash
npm install
npm start
```

The desktop app loads `src/index.html` through Electron with `contextIsolation: true` and `nodeIntegration: false`.

## Windows Build

```bash
npm run build:win
```

Output is written to:

```text
dist/
```

The expected Windows installer name is:

```text
Construction Progress Setup <version>.exe
```

## Icon

Windows packaging uses:

```text
assets/icon.ico
```

The current file is a generated placeholder. Replace it with the final product icon later, keeping the same path.

## File Association

The Windows installer registers:

```text
.tdtc
```

as `Construction Progress Project`, so double-clicking a project file opens the app and requests the running window to load that file.

## Code Signing

The installer is not code-signed in this repository. Unsigned Windows installers can trigger Microsoft SmartScreen warnings. To avoid that for distribution, buy/use a Windows code-signing certificate and configure electron-builder signing credentials in the build environment.

## Auto Update

The app includes a safe `electron-updater` adapter in `electron/update-service.js`, but no publish provider is configured yet. To enable production auto update later, add a real `build.publish` provider such as GitHub, S3, or a generic HTTPS endpoint, publish signed releases, and then wire the update UI to download/install after checks succeed.
