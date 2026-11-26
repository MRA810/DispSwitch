# DispSwitch

[![Build](https://github.com/MRA810/DispSwitch/actions/workflows/build.yml/badge.svg)](https://github.com/MRA810/DispSwitch/actions/workflows/build.yml)
[![Latest release](https://img.shields.io/github/v/release/MRA810/DispSwitch)](https://github.com/MRA810/DispSwitch/releases/latest)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
![Platforms](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-lightgrey)

A small desktop app for switching a monitor's input between **HDMI** and **DisplayPort** with one click, without using the monitor's on-screen menu.

It was built for the **Gigabyte G27F**, but it should work with any monitor that supports **DDC/CI** and uses the standard input codes (`0x0f` for DisplayPort, `0x12` for HDMI).

Runs on **Linux** (via `ddcutil`) and **Windows** (via the built-in Monitor Configuration API). Built with Electron.

---

## Features

- One-click switch between HDMI and DisplayPort
- Detects which input is currently active and keeps the UI in sync (checks every 5 seconds)
- Shows a "Switching…" status until the monitor confirms the change
- Finds the monitor's I2C bus automatically on Linux
- Packaged as a `.deb` for Linux and an NSIS installer (`.exe`) for Windows

---

## How it works

Monitors that support DDC/CI expose a setting called **VCP code `0x60` (Input Source)**. DispSwitch reads and writes that value:

| Input       | VCP value |
|-------------|-----------|
| DisplayPort | `0x0f`    |
| HDMI        | `0x12` (`0x11` is also read as HDMI) |

- **Linux:** runs `ddcutil --bus <N> getvcp 60` / `setvcp 60 <value>`. The bus number is found at startup with `ddcutil detect` (it falls back to bus `4`).
- **Windows:** runs [`scripts/ddc_helper.ps1`](scripts/ddc_helper.ps1), a PowerShell script that calls `dxva2.dll` (`GetVCPFeatureAndVCPFeatureReply` / `SetVCPFeature`) on the first monitor that supports DDC/CI.

---

## Requirements

### All platforms
- A monitor with **DDC/CI turned on** in its on-screen menu (on the G27F: *Settings → DDC/CI → On*)
- To build from source: [Node.js](https://nodejs.org/) 18 or newer, and npm

### Linux
- `ddcutil`
- Permission to access `/dev/i2c-*`

```bash
# Debian / Ubuntu
sudo apt install ddcutil

# Load the i2c-dev kernel module now and at every boot
sudo modprobe i2c-dev
echo i2c-dev | sudo tee /etc/modules-load.d/i2c-dev.conf

# Let your user access I2C devices without sudo (log out and back in afterwards)
sudo usermod -aG i2c $USER
```

Check that your monitor is detected:

```bash
ddcutil detect
ddcutil getvcp 60
```

### Windows
- Windows 10 or 11
- PowerShell (included with Windows)
- Nothing else to install: the DDC/CI API is part of Windows

---

## Installation

Download the latest installer from the [Releases page](https://github.com/MRA810/DispSwitch/releases/latest).

### Linux (.deb)

```bash
sudo apt install ./dpsw_1.0.0_amd64.deb
```

The package declares `ddcutil` as a dependency, so `apt` will install it if it is missing. You still need the `i2c-dev` and group setup above.

Launch **DispSwitch** from your application menu.

### Windows (.exe)

Run `DispSwitch Setup 1.0.0.exe` and follow the installer. You can choose the install folder. Launch **DispSwitch** from the Start menu.

---

## Running from source

```bash
git clone https://github.com/MRA810/DispSwitch.git
cd DispSwitch
npm install
npm start
```

In development mode (`npm start`), `electron-reload` reloads the window automatically when you save a file.

---

## Building installers

Builds go into the `dist/` folder.

| Command              | Output                                  |
|----------------------|-----------------------------------------|
| `npm run dist:linux` | `dist/dpsw_1.0.0_amd64.deb`             |
| `npm run dist:win`   | `dist/DispSwitch Setup 1.0.0.exe`       |
| `npm run dist`       | Both                                    |

Notes:
- The `scripts/` folder is copied into the app's `resources/scripts/` directory (see `extraResources` in [package.json](package.json)), so the PowerShell helper ships with the Windows build.
- Building the Windows installer on Linux needs [Wine](https://www.winehq.org/). Building on Windows works without it.
- Pushing a tag like `v1.1.0` makes GitHub Actions build both installers and attach them to a GitHub Release (see [CONTRIBUTING.md](CONTRIBUTING.md#releasing-maintainers)).

---

## Project structure

```
.
├── main.js              # Electron main process: DDC/CI commands, bus detection, polling, IPC
├── preload.js           # Exposes a safe electronAPI to the window (contextIsolation on)
├── index.html           # UI markup
├── index.js             # UI logic: buttons, status, syncing with the monitor's real input
├── style.css            # Styles
├── scripts/
│   ├── ddc_helper.ps1   # Windows DDC/CI helper (get / set VCP 0x60)
│   ├── switch_to_dp.sh  # Standalone Linux shortcut: switch to DisplayPort (bus 4)
│   └── switch_to_hdmi.sh# Standalone Linux shortcut: switch to HDMI (bus 4)
├── .github/
│   ├── workflows/build.yml   # CI: builds .deb and .exe, publishes releases on tags
│   ├── ISSUE_TEMPLATE/       # Bug, feature and monitor compatibility forms
│   ├── pull_request_template.md
│   └── dependabot.yml
├── package.json         # Scripts and electron-builder config
├── CHANGELOG.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── LICENSE
```

`dist/` (build output) and `node_modules/` are not tracked in git.

### IPC

| Channel                 | Direction       | Purpose                                         |
|-------------------------|-----------------|-------------------------------------------------|
| `switch-input`          | window → main   | Switch to `"hdmi"` or `"dp"`                    |
| `get-active-input`      | window → main   | Ask for the current input                       |
| `active-input-detected` | main → window   | Reports the input the monitor is actually using |

After a switch, the app waits 2.5 seconds and then reads the input again to confirm the change.

---

## Using the shell scripts directly (Linux)

`scripts/switch_to_dp.sh` and `scripts/switch_to_hdmi.sh` switch inputs without opening the app. They are useful for keyboard shortcuts. They use **bus 4**, so change `--bus 4` if `ddcutil detect` shows a different bus for your monitor.

```bash
chmod +x scripts/*.sh
./scripts/switch_to_dp.sh
./scripts/switch_to_hdmi.sh
```

On Windows you can do the same from PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ddc_helper.ps1 get
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ddc_helper.ps1 set 0x0f   # DisplayPort
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ddc_helper.ps1 set 0x12   # HDMI
```

---

## Using a different monitor

If your monitor uses other input codes, find them with:

```bash
ddcutil capabilities | grep -A10 "Feature: 60"
```

Then change `INPUT_CODES` in [main.js](main.js) (and the matching checks in `parseInput`).

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Nothing happens when clicking a button | Make sure DDC/CI is turned on in the monitor's on-screen menu. |
| `ddcutil detect` shows no display (Linux) | Run `sudo modprobe i2c-dev` and check that your user is in the `i2c` group. |
| Works with `sudo ddcutil` but not in the app | Your user can't access `/dev/i2c-*`. Add it to the `i2c` group and log in again. |
| App controls the wrong monitor | Linux: the app uses the first valid display from `ddcutil detect`. Windows: it uses the first monitor that answers DDC/CI. Multi-monitor selection isn't supported yet. |
| Status stays on "Switching…" | The monitor didn't answer the read after switching. This is common while the monitor changes input; it updates on the next check (within 5 seconds). |
| "Running scripts is disabled" on Windows | The app already uses `-ExecutionPolicy Bypass`. If your organization blocks this with Group Policy, ask your admin. |
| Lost the picture after switching | The other input has no active signal. Switch back with the monitor's buttons, or run the app from the computer connected to the other input. |

---

## Contributing

Bug reports, monitor compatibility reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

To report a security problem, see [SECURITY.md](SECURITY.md).

---

## License

[ISC](LICENSE) © 2026 Shuvo
