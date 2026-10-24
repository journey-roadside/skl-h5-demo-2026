# 代码评审记录 · 2026-10-25

范围：根目录站点（`index / chat / history / setting / 404 / 500`、`js/`、`assets/`）。
`v1.1/`、`v2.2/` 两个存档目录按要求排除。

工具：`ocr delegate preview`（workspace 模式）+ 人工复核。

## 覆盖

| 项 | 值 |
|---|---|
| total_files | 17（OCR 报告） |
| 实际评审 | 9 |
| 排除 | 8（`v1.1/`、`v2.2/` 整目录 + 二进制素材 + README） |
| coverage_rate | 100%（限定范围内） |

评审文件：`404.html` `500.html` `index.html` `chat.html` `history.html` `setting.html` `js/auth.js` `js/settings.js` `assets/theme.css`

## 发现与修复

### High

**1. `chat.html` — 空对话时顶栏标题消失**

`measureTitleWidth()` 固定量「新建对话」钮的左沿算右侧占位。本轮把新建钮改成「有对话才显示」，空对话时该元素 `hidden`，`getBoundingClientRect()` 全为 0，公式 `barW − 2×max(left, right) − 2×gap` 得出 0，标题被压成 0 宽。

量化（375 宽）：修复前 0px，修复后 151px；600 宽下从 0px 恢复到 360px。

修复：改为量「右侧这一组里最左那颗**可见**钮」（`rightEls` 数组 + `hidden` 过滤），全隐藏时回落到顶栏右沿。

### Medium

**2. `index.html` — 两处 `var(--text-sm)` 是未定义变量**

`tokens.css` 没有 `--text-sm`（父仓库真源也没有）。`font-size: var(--text-sm)` 属无效声明，浏览器丢弃整条，等于这两处字号设置完全没生效：协议弹窗说明句、矮横屏副标题。

修复：改用最接近的既有档位 `--text-xs`（13px）。与「字号只有 13/16/18/22/28」的约束一致。

**3. `chat.html` — `gate(null)` 在已授权时抛错**

进页面自动弹窗那段传的是 `gate(null)`，而 `gate` 在已授权分支直接 `action()`，空值调用会抛 `TypeError`。当前调用点有 `!Auth.get()` 前置守卫所以没触发，但这是定时炸弹。

修复：`if (action) action();`。

**4. `chat.html` — 窄屏未授权时设置钮紧贴头像**

`@media (max-width: 480px)` 给标题改成流内 flex 并靠 `flex:1` 吃满剩余空间；但未授权时标题是 `hidden`，此时顶栏没有可伸缩项，设置钮会挨着头像。

修复：该断点下补 `.docpage__bar { justify-content: space-between; }`。

**5. `setting.html` — `<button>` 内含块级元素**

账号行改成 `<button>` 后内部仍用 `<div>` / `<p>`。`button` 的内容模型只允许 phrasing content，块级元素会被解析器纠正，可能导致布局错位。

修复：改为 `<span class="acct__body">` + 两个 `<span>`，并补 `display: block` 保持原排版。

**6. `index.html` / `setting.html` — 扫码窗打开即选中二维码**

`showModal()` 把焦点给第一个可聚焦元素（二维码钮），`base.css` 的 `:focus-visible` 画出焦点环，看起来像「已选中」。此前只修了 `chat.html`。

修复：两页同样加 `tabindex="-1" autofocus` 到标题 + 抑制标题自身焦点环。

### Low（未改，记录备查）

- `chat.html` / `history.html` 的 `el()` 辅助函数用 `!= null` 而非 `!== null`。意图是「同时排除 undefined」，`===`/`!==` 在此语义下需写成两次判断，属于有意为之，不改。
- `index.html` 的 `AVATARS.map` 拼进 `innerHTML`：数据来自页面内常量，非用户输入，XSS 风险为零。
- `v1.1/chat.html` 有一处未提交改动（`btn-account` 判据修正），属存档目录，按要求不动。

## 未做的验证

- 未跑浏览器实测（按项目约定等用户叫）。以上结论来自静态检查 + 脚本语法/CSS 花括号校验 + 逻辑推演。
- 窄屏与横屏布局的量化数字是算术推演，非实测。
- 微信真机路径（X5 内核 `dialog` / `autofocus` 行为）未验证。
