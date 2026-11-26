# Contributing to DispSwitch

Thanks for helping out! Bug reports, monitor compatibility reports and pull requests are all welcome.

## Reporting bugs

Open an issue using the **Bug report** template. Please include:

- Your OS and version
- Your monitor model, and how it's connected (HDMI, DisplayPort, USB-C)
- Linux: the output of `ddcutil detect` and `ddcutil getvcp 60`
- Windows: the output of `powershell -File scripts\ddc_helper.ps1 get`

## Reporting a monitor that works (or doesn't)

Use the **Monitor compatibility** template. This is one of the most useful things you can do, since DDC/CI support varies a lot between monitors.

## Development setup

```bash
git clone https://github.com/MRA810/DispSwitch.git
cd DispSwitch
npm install
npm start
```

The window reloads automatically when you save a file (via `electron-reload`).

See the [README](README.md#project-structure) for how the code is organized.

## Pull requests

1. Fork the repository and create a branch from `main`:
   `git checkout -b fix/short-description`
2. Keep changes focused. One fix or feature per pull request.
3. Test on real hardware where you can, and say in the PR which OS and monitor you tested on.
4. Make sure the app still builds: `npm run dist:linux` and/or `npm run dist:win`.
5. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
6. Open the pull request and fill in the template.

### Commit messages

Use short, imperative messages, for example:

```
Add support for a second HDMI input
Fix bus detection when several monitors are connected
```

### Code style

- 2-space indentation for JavaScript, HTML and CSS; 4 spaces for PowerShell (see [.editorconfig](.editorconfig))
- Double quotes and semicolons in JavaScript
- Keep the renderer sandboxed: `contextIsolation: true`, `nodeIntegration: false`. Anything that needs Node goes through `preload.js` and IPC.

## Releasing (maintainers)

1. Bump `version` in `package.json`.
2. Move the **Unreleased** entries in `CHANGELOG.md` under the new version.
3. Commit, then tag and push:
   ```bash
   git tag v1.1.0
   git push origin main --tags
   ```
4. The **Build** workflow builds the `.deb` and `.exe` and attaches them to a GitHub Release.

## Code of Conduct

By taking part in this project you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
