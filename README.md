# 专用 WMS App（Pantum 仓库数据收集）

Infor SCE Mobile Web Client 的专用壳：把 v1.5 抓到的 13 个客户端文件打包进 App
本地渲染，数据与 WebSocket 仍走 live 服务端。

## 做法

- `app/src/main/assets/`：13 个客户端文件（`inforMetaClient.html` + 12 个 JS/CSS）。
  只有 HTML 的 `<body>` 尺寸改了（240x320 写死 → 100%x100%），其余 `../../../svc_wm/...`
  相对路径原样保留——框架靠脚本地址里的 `svc_wm` 推导 `theID=wm`，再去 live 拉配置。
- `MainActivity`：`loadDataWithBaseURL("https://wms.pantum.com/wm/sce/mobile-web-client/", …)`，
  `shouldInterceptRequest` 只拦截 `svc_wm/app/*/mobile-web-client/` 下的 12 个文件走本地
  assets，其余（InforUX 标准库、mobile-web-client.json、locales/翻译、图片）全部 live 拉取。
- WebSocket：`wss://wms.pantum.com:443/wm_webrf`（jWebSocket，EXEC 调用），由打包的 JS 处理。
- 登录：`NSPRFMETAOT08`（首次），重连 `NSPRFWEBRFOT08`。菜单由 `EXEC NSPRFMETA01` 按界面
  动态下发，App 里不写死菜单。
- 拣货“查库位序列号 → 多选填入”流程未接：等用户用 v1.5 做一次完整拣货、把 ws.log 发回后再按原样接。

## 构建

GitHub Actions 自动构建 debug APK（artifact）。Release 签名用 `split.keystore`
（与 AccessBrowser 同一证书），通过仓库 Secrets 提供：
`KEYSTORE_BASE64`、`KEYSTORE_PASSWORD`、`KEY_ALIAS`、`KEY_PASSWORD`。

## 安装

ST6750 PDA（Android 6.0），直接装 APK 覆盖即可。包名 `com.jiebao.wmsapp`，
与 AccessBrowser（`com.jiebao.accessbrowser`）互不冲突。
