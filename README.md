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

## 原生版（分支 native-app，v1.1-native）

WebView 壳的替代实现：不再套 Infor JS 客户端，按服务端下发的屏定义做原生
Android 界面。地址固定（`wss://wms.pantum.com:443/wm_webrf`），无地址栏。

- `WmsProtocol.kt`：OkHttp WebSocket。welcome/maxframesize 处理、`<6 位随机 ID>
  <消息>` 发送、收后回 `pda<响应 ID>` 确认、PING/PONG 保活、按请求 ID 路由、
  断线 3 秒重连、分片 `FRAGMENT`/`LFRAGMENT` 重组。
- `WmsCodec.kt`：手写 `encodeURIComponent`/`decodeURIComponent`（Java 的
  URLEncoder/URLDecoder 与 JS 行为不一致，空格 ↔ `+`）。
- `ScreenDef.kt`：OT,03 屏定义解析（`\x0c` 分记录、反引号分字段、每字段 42
  项）+ EXEC 参数拼接（SEND 字段按顺序）+ OT,01 结果行解析。纯 Kotlin，
  可 JVM 单元测试。
- `WmsSession.kt`：登录（`NSPRFMETAOT08`）、令牌存 SharedPreferences、重连
  （`NSPRFWEBRFOT08`）、META01 取屏（带缓存）、EXEC 提交与 OT,09/RF,09
  报错解析。
- `MainActivity.kt`：原生 UI。登录屏 → M2 主菜单 → 菜单屏（每条 SEND 一个
  大按钮）/ 表单屏（标题栏、SEND 输入格、RECEIVE 只读文本、结果列表）。
  F1 提交、F2 查找（仅聚焦格有 LKUP 时启用）、F4 返回；AUTOENTER 的屏扫码
  后自动提交；屏幕常亮；扫码枪走键盘事件天然兼容。
- 拣货二（STDPK2）加“查序列号”按钮：按当前库位 + 物料打开 SNL01 预填查询，
  出列表多选，选完直接填回“库位/箱”格，不切屏、不复制。
- `app/src/main/assets/` 的 13 个客户端文件原样保留（WebView 旧版留作回退
  参考，不删）。协议细节见 `PROTOCOL.md`，拣货日志分析见
  `SERIAL_QUERY_ANALYSIS.md`。

### 与 WebView 版的区别

| | WebView 版（main） | 原生版（native-app） |
|---|---|---|
| 界面 | Infor JS 客户端渲染 | 原生 Android 控件，按 META01 动态生成 |
| 地址栏 | 无（固定地址） | 无（固定地址） |
| 登录/会话 | JS 处理 | Kotlin 处理，令牌存 SharedPreferences |
| 屏定义 | JS 解析 | `ScreenDef.kt` 解析 |
| 序列号查询 | 未接（切屏复制） | STDPK2 内置按钮，SNL01 多选填回 |
| 回退 | — | assets 里的 13 个文件可恢复 WebView 版 |

### 待真机验（TODO）

- STDPK2、SNL01 的屏定义不在任何抓包里：字段名、SNL01 查询 EXEC 格式、
  结果列映射、多选序列号的分隔符均按 IQ01/IQ02 模式推断，需真机验。
- OT,02（STDPK22X 后）→ STDPK23X 的规则只在 2 个数据点上验证过。
- F4 暂映射为“返回”，框架的按屏 F4 绑定未映射。
- SETSCREEN 的条件（SENDIF）未求值，取第一个无条件目标。

GitHub Actions 自动构建 debug APK（artifact）。Release 签名用 `split.keystore`
（与 AccessBrowser 同一证书），通过仓库 Secrets 提供：
`KEYSTORE_BASE64`、`KEYSTORE_PASSWORD`、`KEY_ALIAS`、`KEY_PASSWORD`。

## 安装

ST6750 PDA（Android 6.0），直接装 APK 覆盖即可。包名 `com.jiebao.wmsapp`，
与 AccessBrowser（`com.jiebao.accessbrowser`）互不冲突。
