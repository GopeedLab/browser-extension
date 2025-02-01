[![Release](https://img.shields.io/github/release/GopeedLab/browser-extension.svg)](https://github.com/GopeedLab/browser-extension/releases)
[![Donate](https://img.shields.io/badge/%24-donate-ff69b4.svg)](https://docs.gopeed.com/donate.html)
[![Discord](https://img.shields.io/discord/1037992631881449472?label=Discord&logo=discord&style=social)](https://discord.gg/ZUJqJrwCGB)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R6IJGN6)

[English](/README.md) | [中文](/README_zh-CN.md)

## Install

[<img src="/_docs/img/store/chrome-web-store.png" title="Chrome Web Store" alt="Chrome Web Store" width="170" height="48" />](https://chromewebstore.google.com/detail/gopeed/mijpgljlfcapndmchhjffkpckknofcnd) [<img src="/_docs/img/store/microsoft-store.png" title="Edge Store" alt="Edge Store" height="48">](https://microsoftedge.microsoft.com/addons/detail/dkajnckekendchdleoaenoophcobooce) [<img src="/_docs/img/store/firefox-add-ons.png" title="Firefox Add-ons" alt="Firefox Add-ons" width="170" height="48" />](https://addons.mozilla.org/zh-CN/firefox/addon/gopeed-extension)

> **Note**: Please make sure gopeed version >= 1.6.8

## Features

- 🔽 Instead of browser download manager
- 🔍 Sniff web resources
- ⚙️ Support multiple downloader configurations
- 📦 More..

## Usage

> 中文用户请参考[此处](/README_zh-CN.md#教程)的视频。

As the following pic shows.

1. Install _Gopeed_ ext in the store.

    ![en_install_ext](/_docs/img/tutorial/en_install_ext.png)

2. Click the ext

    ![en_click_ext](/_docs/img/tutorial/en_click_ext.png)

3. Open _gopeed_ ext settings

    ![en_click_setting_btn](/_docs/img/tutorial/en_click_setting_btn.png)

4. Set basic settings of ext

    - Enable **Download Capture** option.
    - Enable **Auto Wake** option.
    - Set Filter options only if you need them.

    ![en_basic_settings](/_docs/img/tutorial/en_basic_settings.png)

5. Set advanced settings

    - Enable **Enable Download with API** option.
    - Click the **Add** button.

    ![en_advanced_settings](/_docs/img/tutorial/en_advanced_settings.png)

6. Set API

    - Set **Address** box to what you've set in GOPEED software advanced settings.
        - DEFAULT: `127.0.0.1:9999`
    - Click **Test** button. If everythins looks good, click the **Save** button.

    ![en_set_api](/_docs/img/tutorial/en_set_api.png)

## Build

```bash
pnpm install
pnpm run build
```
