[![Release](https://img.shields.io/github/release/GopeedLab/browser-extension.svg)](https://github.com/GopeedLab/browser-extension/releases)
[![Donate](https://img.shields.io/badge/%24-donate-ff69b4.svg)](https://docs.gopeed.com/donate.html)
[![Discord](https://img.shields.io/discord/1037992631881449472?label=Discord&logo=discord&style=social)](https://discord.gg/ZUJqJrwCGB)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R6IJGN6)

[English](/README.md) | [中文](/README_zh-CN.md)

## 安装

[<img src="/_docs/img/store/chrome-web-store.svg" title="Chrome Web Store" alt="Chrome Web Store"  height="50" />](https://chromewebstore.google.com/detail/gopeed/mijpgljlfcapndmchhjffkpckknofcnd) [<img src="/_docs/img/store/microsoft-store.svg" title="Edge Store" alt="Edge Store" height="50">](https://microsoftedge.microsoft.com/addons/detail/dkajnckekendchdleoaenoophcobooce) [<img src="/_docs/img/store/firefox-add-ons.svg" title="Firefox Add-ons" alt="Firefox Add-ons" height="50" />](https://addons.mozilla.org/firefox/addon/gopeed-extension)

> **注意**: 请确保 gopeed 版本 >= 1.6.8

## 功能

- 🔽 接管浏览器下载
- 🖱️ 右键菜单下载
- 🔍 嗅探网页资源
- 🚀 快速访问远程服务器
- ⚙️ 支持多个下载器配置
- 📦 More..

## 教程

本扩展**开箱即用**，通常不需要您进行任何设置，只要确保安装了`Gopeed`即可。

### 远程下载

扩展支持把任务推送到`Gopeed服务端`进行下载，如果部署的`web`或者`docker`版本，可以通过扩展进行配置远程下载服务器进行下载。

![](/_docs//img/tutorial/zhcn_api.png)

> **Tip**: 也可以[开启](https://docs.gopeed.com/zh/dev-api.html#%E5%90%AF%E7%94%A8%E6%8E%A5%E5%8F%A3)Gopeed的TCP协议作为远程下载服务器，适用于浏览器扩展不自动接管的情况，比如`Linux`版本大概率无法被自动接管下载。

## 构建

```bash
pnpm install
pnpm run build
```
