# Security Policy

## Supported versions

Only the latest release receives security fixes.

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report them privately through GitHub: go to the repository's **Security** tab and choose **Report a vulnerability**. Include:

- What the problem is and what it lets an attacker do
- Steps to reproduce
- The affected version and OS

You should get a reply within 7 days. Once a fix is ready, it will be released and you will be credited unless you prefer not to be.

## Notes on how DispSwitch works

- The app runs local commands (`ddcutil` on Linux, PowerShell on Windows). Only fixed input values (`0x0f`, `0x12`) are ever passed to them; nothing typed by the user reaches the shell.
- On Windows the helper is launched with `-ExecutionPolicy Bypass` so it works on default system settings. The script ships inside the app's install folder.
- The renderer runs with `contextIsolation` on and `nodeIntegration` off.
