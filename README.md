# skl-h5-demo-2026

社科联二期项目建设（SKLQ2）H5 端演示原型仓库。

- 产品名称：湖北社科数据信息联盟
- 仓库用途：承载公众号 H5 端可运行原型
- 当前状态：**只保留首页**。对话页、历史列表、账户体系（含手机号登录 / 注册）
  已移出，后续按需逐个接回；404 / 500 状态页保留

## 目录

```
index.html                      首页 · Companion-Hero（数字人入口页）
404.html                        页面不存在（独立状态页）
500.html                        服务暂时不可用（独立状态页）
dev-server.py                   本地演示服务器（默认 8791）
README.md                       本文件
js/                             页面脚本
  auth.js                         环境判定 + 微信授权占位（Auth.isWeChat / Auth.boot）
  settings.js                     外观模式 / 自动播报偏好（Settings.*）
assets/                         页面级资源
  theme.css                       强制浅色 / 深色的令牌覆盖层（跟随设置页选择）
  demo-qr.png                     演示用二维码
h5v2/                           设计体系 v2「靖紫」，自包含副本
  tokens.css                      令牌唯一真源
  base.css                        基础层 + 组件层
  DESIGN.md                       规范正文
  index.html                      规范预览页
  assets/avatars/                 数字人形象占位素材
```

`h5v2/tokens.css` 与 `base.css` **不挪进 `assets/`**：它们必须与父仓库
`05-Design/design-system/h5v2/` 的目录结构逐字对应，同步时才能直接比对。

`404.html` / `500.html` 按 DESIGN.md §4.4 状态页骨架写：居中单点、一个明确动作。
两者差别在「有没有重试价值」—— 404 重试无用，所以只给出口；
500 是暂时的，所以主动作是「重新加载」，出口降为次级链接。
**注意**：这两个文件名是演示用的静态页面，不等于真实 HTTP 状态码。
部署时需要在服务器侧把 404/500 指向这两个文件，静态托管（如 GitHub Pages）
会自动使用根目录的 `404.html`，`500.html` 需要自行配置。

页面直接引用 `./h5v2/`，仓库自包含，单独 clone 即可运行。
`h5v2/` 的源目录在父仓库 `05-Design/design-system/h5v2/`，体系改动请回写那边。

## 首页的入口现状

首页是「数字人入口页」，它的键盘钮、「立即对话」、转写弹窗的「发送」
原本都跳对话页。对话页移出后这三个入口**保留外观、链接摘掉，点击不跳转**；
对话页接回来时，恢复各自的 `href` 与发送处理即可。

`js/auth.js` 只留环境判定与微信授权占位（`Auth.isWeChat()` / `Auth.boot()`）——
首页据此切底部动作区，并在微信内往 `localStorage['skl.user']` 写 `{wx:true}`。
原来的手机号登录层随账户体系一起移出了，接回来时从 git `38e5b67` 取回旧版
`js/auth.js`。接真实微信授权时替换 `wxAuthorize` 函数体。

## 本地预览

Playwright 禁用 `file://`，需起本地服务器：

```bash
python dev-server.py 8791        # 或 python -m http.server 8791
# 打开 http://127.0.0.1:8791/
```

## 约束速记（详见 h5v2/DESIGN.md）

- 颜色只用 `#hex` / `rgba()`。**禁止 `oklch()` / `color-mix()`** —— 微信 X5 旧内核不认，整条声明静默失效。
- 数值一律走令牌，页面里不写裸色值 / 裸字号 / 裸间距。
- 320px 视口不得横向溢出：`scrollWidth <= clientWidth`。
- 数字人形象位是固定几何（首页基准 286px 大形象），字号不随档位在形象内放大。
  首页形象位在矮屏下按 `clamp()` 收缩至 190px 下限，以保证一屏叙事。
