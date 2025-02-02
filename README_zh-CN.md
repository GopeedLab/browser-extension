[![Release](https://img.shields.io/github/release/GopeedLab/browser-extension.svg)](https://github.com/GopeedLab/browser-extension/releases)
[![Donate](https://img.shields.io/badge/%24-donate-ff69b4.svg)](https://docs.gopeed.com/donate.html)
[![Discord](https://img.shields.io/discord/1037992631881449472?label=Discord&logo=discord&style=social)](https://discord.gg/ZUJqJrwCGB)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R6IJGN6)

[English](/README.md) | [中文](/README_zh-CN.md)

## 安装

[<img src="/_docs/img/store/chrome-web-store.svg" title="Chrome Web Store" alt="Chrome Web Store"  height="50" />](https://chromewebstore.google.com/detail/gopeed/mijpgljlfcapndmchhjffkpckknofcnd) [<img src="/_docs/img/store/microsoft-store.svg" title="Edge Store" alt="Edge Store" height="50">](https://microsoftedge.microsoft.com/addons/detail/dkajnckekendchdleoaenoophcobooce) [<img src="/_docs/img/store/firefox-add-ons.svg" title="Firefox Add-ons" alt="Firefox Add-ons" height="50" />](https://addons.mozilla.org/zh-CN/firefox/addon/gopeed-extension)

> **注意**: 请确保 gopeed 版本 >= 1.6.8

## 功能

- 🔽 接管浏览器下载
- 🔍 嗅探网页资源
- ⚙️ 支持多个下载器配置
- 📦 More..

## 进阶教程

本扩展**开箱即用**，一般无须操心

### 临时禁用扩展

![zhcn_temp_disabled](/_docs/img/tutorial/zhcn_temp_disabled.png)

### 如何自定义API接口

1. 打开设置

    ![zhcn_settings](/_docs/img/tutorial/zhcn_settings.png)

2. 填写接口设置（必须与软件内设置相同）

    ![zhcn_api](/_docs/img/tutorial/zhcn_api.png)

### 如何屏蔽指定后缀名（扩展名）的文件

1. 打开扩展设置
2. 在“基础设置”页面的“文件类型过滤”栏依次填写您不需要捕获的文件类型名称，例如：
    - 注：`.tar.gz` 会被 `.gz` 与 `.tar.gz` 匹配

    ```text
    jpg
    jpeg
    png
    tif
    tiff
    webp
    avif
    gif
    pdf
    docx
    doc
    pptx
    ppt
    xlsx
    xls
    ```

### 如何屏蔽来自指定域名的文件

1. 打开扩展设置
2. 在“基础设置”页面的“域名过滤”栏依次填写您不需要捕获的网址，例如：
    - 注：**不支持通配符**

    ```text
    changjiang.yuketang.cn
    zhihu.com
    ```

## 构建

```bash
pnpm install
pnpm run build
```
