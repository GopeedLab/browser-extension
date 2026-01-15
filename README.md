[![Release](https://img.shields.io/github/release/GopeedLab/browser-extension.svg)](https://github.com/GopeedLab/browser-extension/releases)
[![Donate](https://img.shields.io/badge/%24-donate-ff69b4.svg)](https://docs.gopeed.com/donate.html)
[![Discord](https://img.shields.io/discord/1037992631881449472?label=Discord&logo=discord&style=social)](https://discord.gg/ZUJqJrwCGB)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R6IJGN6)

[English](/README.md) | [中文](/README_zh-CN.md)

## Install

[<img src="/_docs/img/store/chrome-web-store.svg" title="Chrome Web Store" alt="Chrome Web Store"  height="50" />](https://chromewebstore.google.com/detail/gopeed/mijpgljlfcapndmchhjffkpckknofcnd) [<img src="/_docs/img/store/microsoft-store.svg" title="Edge Store" alt="Edge Store" height="50">](https://microsoftedge.microsoft.com/addons/detail/dkajnckekendchdleoaenoophcobooce) [<img src="/_docs/img/store/firefox-add-ons.svg" title="Firefox Add-ons" alt="Firefox Add-ons" height="50" />](https://addons.mozilla.org/firefox/addon/gopeed-extension)

> **Note**: Please make sure gopeed version >= 1.6.8

## Features

- 🔽 Instead of browser download manager
- 🖱️ Right-click menu download
- 🔍 Sniff web resources
- 🚀 Quick access to remote servers
- ⚙️ Support multiple downloader configurations
- 📦 More..

## Usage

Basicly, this extension is **ready to use**, you don't need to do any settings, just make sure you have installed `Gopeed`.

### Remote Download

The extension supports pushing tasks to the `Gopeed server` for downloading. If you have deployed the `web` or `docker` version, you can configure the remote download server through the extension.

![](/_docs//img/tutorial/en_api.png)

> **Tip**: You can also [enable](https://docs.gopeed.com/dev-api.html#enable-api) Gopeed's TCP protocol as a remote download server, which is suitable for cases where the browser extension does not automatically take over the download, such as the `Linux` version, which is unlikely to be automatically taken over for downloading.

## Build

```bash
pnpm install
pnpm run build
```
