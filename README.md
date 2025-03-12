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
- 🔍 Sniff web resources
- ⚙️ Support multiple downloader configurations
- 📦 More..

## Advanced Usage

This extension is "**ready to use after download**" and usually requires no worries on your part.

### Temp disable the extension

![en_temp_disabled](/_docs/img/tutorial/en_temp_disabled.png)

### How to customize API

1. Open ext settings

   ![en_settings](/_docs/img/tutorial/en_settings.png)

2. Edit the API settings (MUST BE SAME AS WHAT YOU'VE SET IN SOFTWARE)

   ![en_api](/_docs/img/tutorial/en_api.png)

### How to set file types that do not need to be captured

1. Open ext setting page and turn to _Basic Settings_ page.
2. Open and edit the box of the option _File Type Filter_, for example:

   - Note: `.tar.gz` would be matched by both `.gz` and `.tar.gz`

   ```text
   .jpg
   .jpeg
   .png
   .tif
   .tiff
   .webp
   .avif
   .gif
   .pdf
   .docx
   .doc
   .pptx
   .ppt
   .xlsx
   .xls
   ```

### How to set domains that do not need to be captured

1. Open ext setting page and turn to _Basic Settings_ page.
2. Open and edit the box of the option _Domain Filter_, for example:

   - Note: The use of **regular expression** or **wildcard characters** is **not** supported.

   ```text
   changjiang.yuketang.cn
   zhihu.com
   ```

## Build

```bash
pnpm install
pnpm run build
```
