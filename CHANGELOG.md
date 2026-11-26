# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- README, license, contributing guide, code of conduct and security policy.
- GitHub issue and pull request templates.
- GitHub Actions workflow that builds Linux and Windows packages and publishes them on version tags.
- Dependabot configuration.

### Changed
- The app bundle now contains only the files the app needs.
- Removed unused runtime dependencies.

## [1.0.0] - 2026-11-26

### Added
- One-click switching between HDMI and DisplayPort over DDC/CI.
- Detection of the active input, checked every 5 seconds.
- Automatic I2C bus detection on Linux (`ddcutil detect`).
- Windows support through a PowerShell helper that uses the Monitor Configuration API (`dxva2.dll`).
- `.deb` (Linux) and NSIS `.exe` (Windows) packages.

### Fixed
- Stutter when switching inputs.

[Unreleased]: https://github.com/MRA810/DispSwitch/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/MRA810/DispSwitch/releases/tag/v1.0.0
