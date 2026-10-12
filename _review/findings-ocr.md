# OCR 全量扫描 · 结构化问题清单

- 扫描工具：`ocr scan --audience agent -f json`（provider `deepseek / deepseek-flash`）
- 原始输出：`_review/ocr-scan.json`（789 KB，可机读）、`_review/ocr-scan.txt`（40 KB，可读版，由 JSON 离线渲染，未二次调用 LLM）
- session_id：见 `ocr-scan.json` 的 `session_id`
- 扫描统计：13 文件 / 5604 行，耗时 6m57s，tokens 1,140,922（in 982,898 / out 158,024 / cache_read 732,672）

> ## ⚖️ team-lead 拍板（2026-10-12，供全队统一口径）
> **部署契约 = `file://` 双击优先，HTTP 静态托管仅作兼容项。**
> - **`404.html:7,67` 归入「不改」**（本条维持 ⚠️ 存疑，**不进修复清单**）：保持相对路径。根目录响应 404 时相对路径同样可解析，仅「嵌套 URL 触发 404」失效 —— 属服务器配置事项，写入交付文档注意事项即可，不动代码。
> - 同族的「脚本外置」「CSP nonce」「500 内联关键 CSS 拆分」**一律维持不采纳**（后两者还会引入构建/响应头依赖）。
> - 下文 5 条 high **全部为要修的真问题**（见「最严重的 5 条」）。

## 总量统计

| 维度 | 数值 |
|---|---|
| 总问题数 | **55** |
| high | **11** |
| medium | **26** |
| low | **18** |
| 严重度类别 | bug 29 · maintainability 17 · security 8 · style 1 |
| 涉及文件数 | **13**（全部被扫文件都有问题） |

### 我的初判汇总

| 初判 | 数量 |
|---|---|
| ✅ 真问题 | **43** |
| ⚠️ 存疑（需澄清是否为有意约束/演示态） | **10** |
| ❌ 疑似误报 | **2** |

---

## 一、按文件分组（组内按 high → medium → low 排序）

### `.gitignore`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 53 | 11 | 🟠high/maintainability | 忽略 `AGENTS.md`/`CLAUDE.md`，会把共享的 agent 指引文档从仓库移除 | 从忽略清单移除，或收窄为个人变体 | ❌ **疑似误报** —— 任务上下文明确：本仓库不跟踪 agent 配置文件，是有意为之；OCR 看不到团队约定 |
| 51 | 5 | 🟡medium/security | 忽略清单遗漏本地机密/凭证文件（`.env` 等） | 补 `.env`、`.env.*`、`*.local`、`*.pem`、`credentials.json` | ⚠️ **存疑** —— 本 demo 无任何 env/凭证，纯静态站；但补上零成本、无副作用，属良性加固 |
| 52 | 3 | 🟡medium/maintainability | 忽略整个 `.claude/` 会连带丢掉可共享的项目级配置 | 只忽略 `.claude/*.local.*` 等个人产物 | ❌ **疑似误报** —— 同上，与 #53 同源，有意约束 |
| 54 | 10 | 🔵low/style | 注释格式不一致：`#AGENT配置` 少了 `# ` 空格 | 改为 `# AGENT配置` | ✅ **真问题** —— 纯格式，零风险 |

### `404.html`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 16 | 7 | 🟠high/bug | 404 是 catch-all 页，服务器保留原请求 URL，`./h5v2/...` 在嵌套路径（如 `/foo/bar`）下会解析到 `/foo/bar/h5v2/...` 而 404，页面完全无样式 | 改为根绝对路径 `/h5v2/tokens.css` | ⚠️ **存疑** —— 论证正确，但**演示现场是 `file://` 双击打开**，根绝对路径在 file:// 下同样失效；此结论只在「HTTP 部署 + 存在嵌套 404 路径」时成立。真源部署契约需先确认 |
| 17 | 67 | 🟠high/bug | 同一相对路径问题，「回到首页」`href="./index.html"` 在嵌套 404 下指向另一个 404 | 改根绝对 `/index.html` | ⚠️ **存疑** —— 同 #16，与「file:// 可双击」约束冲突 |

### `500.html`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 9 | 65 | 🟠high/bug | 注释自称要给重载动作留兜底，但 `<button>` 在 JS 禁用/失败时完全无效，只剩非等价的「回到首页」 | 改用 `<a href="">` 原生刷新，或加 `<noscript>` | ✅ **真问题** —— 注释与实现自相矛盾，非 JS 路径确实无重试 |
| 10 | 75 | 🟡medium/maintainability | `getElementById('retry')` 无空值校验；严格 CSP 下内联 `<script>/<style>` 会被静默拦截 | 加 null 守卫；CSP 建议用 nonce/hash | ⚠️ **存疑** —— null 守卫合理；但「抽外部文件/nonce」与「必须能 file:// 双击打开」的约束冲突，不应采纳 |
| 11 | 7-8 | 🟡medium/maintainability | 错误页依赖外部 `tokens.css`/`base.css`，静态资源同时故障时整页无样式 | 内联本页所需最小关键样式 | ⚠️ **存疑** —— 论证符合「500 页要能扛资源故障」的通例，但本 demo 无后端、资源不会「故障」；是否内联取决于部署方式 |

### `account.html`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 12 | 201-202 | 🟠high/bug | 缺登录态守卫：`Auth.get()` 返回 null 时静默回退 `{}`，非微信未登录访客也能看到「正常」的账户页与可用退出按钮，而非跳登录 | 非微信且未登录时 `location.replace('./index.html')` | ✅ **真问题** —— 与项目 `Auth.require` 模式不符，越过了登录门槛 |
| 13 | 195-198 | 🟡medium/bug | `maskPhone` 边界 bug：长度 8 时 `new Array(1).join('*')` 为空串，返回完整 8 位未脱敏；更短的直接原样返回 | `length<8` 返回 `'—'`；星号数 `Math.max(1, len-8)` | ✅ **真问题** —— 当前演示号 11 位不触发，但脱敏函数「失败即泄露」是真实缺陷 |
| 14 | 211-212 | 🔵low/security | `user.avatar`（来自 localStorage）未校验就赋给 `img.src`，可指向外部源/data URI（追踪泄露） | 仅放行 `https:`/同源，否则退回内置图形 | ✅ **真问题** —— 属信任边界；当前数据不可控但通道危险 |
| 15 | 235-236 | 🔵low/maintainability | 非 `showModal` 兜底仅 `setAttribute('open','')`，无遮罩、Esc 不可关 | 兜底路径补 Esc/遮罩处理 | ✅ **真问题** —— 与 base.css 兜底定位同族缺口，老内核下体验降级 |

### `phone.html`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 18 | 78-79 | 🟠high/security | 重复硬编码演示凭证，违反 auth.js「只在这里，不写进页面」的明文约定，制造第二份真源 | 从 auth.js 暴露校验入口，页面勿自带常量 | ✅ **真问题** —— 与 auth.js 注释直接冲突，改一处要同步两处。(凭证本身是「有意门槛」，但**重复**是真问题) |
| 19 | 184-186 | 🟠high/maintainability | 绕过 Auth 抽象：直接写私有键 `'skl.user'` 到 localStorage；try/catch 吞错导致 UI 假成功 | 增加 `Auth.set`/`Auth.update` 并调用 | ✅ **真问题** —— 键名/结构在 auth.js 变更会静默失联 |
| 20 | 145-146 | 🟡medium/bug | `stopCountdown()` 在任何校验之前调用，保存失败也清掉倒计时、立刻放开「获取验证码」，破坏 60s 重发节流 | 只在成功分支停倒计时 | ✅ **真问题** —— 成功分支本已调用，此处多余且有害 |
| 21 | 200 | 🟡medium/bug | 保存按钮无在途守卫，连点/点击后回车会重复执行：重复 toast、重复写入、多个跳转定时器 | 加 `submitting` 标志或禁用按钮 | ✅ **真问题** |
| 22 | 131-137 | 🟡medium/maintainability | 手机号校验（格式 + 同号）在发送与保存两处复制粘贴，规则变更需改两处、易漂移 | 抽 `validatePhone(value)` 复用 | ✅ **真问题** —— 重复代码 |
| 23 | 176-177 | 🔵low/bug | 逻辑死胡同：只认 DEMO_PHONE，故已登录用户当前号恒为 DEMO_PHONE；同号校验挡 `new===current`，此处又挡 `new!==DEMO_PHONE` → 成功路径不可达 | 确认是否有意，至少放开一条路径 | ⚠️ **存疑** —— 对**登录用户**而言推理成立（我方确认：换绑成功分支确难到达）；但演示主要是从登录入口走改绑成功，是否算缺陷取决于设计意图 |

### `history.html`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 24 | 258 | 🟠high/bug | 删除不持久化：`load()` 以 `!convs.length` 判定播种，用户删光全部会话后写入的 `[]` 下次被覆盖回演示数据，真实空态不可达 | 按「是否首次访问」而非「数组是否为空」播种 | ✅ **真问题** —— 本轮最实在的数据逻辑缺陷 |
| 25 | 257 | 🟡medium/bug | 持久化数据未逐项校验：非法 `ts` → 列表出现「NaN 个月前」；重复 id → 删除/重命名命中错对象 | 解析后过滤非法项（校验 id/title/ts/count） | ✅ **真问题** |
| 26 | 470 | 🟡medium/bug | `keydown` 未排除输入法组合态：中文/日文输入法 Enter 上屏候选词会误触发 `saveRename()` | 加 `e.isComposing`（或 keyCode 229）判断 | ✅ **真问题** —— 中文优先输入场景的高频误触 |
| 27 | 404 | 🟡medium/bug | `showLoading()` 的 900ms 定时器未保存句柄，连点「重新加载」叠加多次 `setTimeout(renderList)` | 保存 timer 并在启动前 `clearTimeout` | ✅ **真问题** |
| 28 | 520 | 🔵low/bug | 读屏播报区反复赋相同字符串不再次播报，连续删除第二条静默 | 赋值前先清空或拼接可变内容 | ✅ **真问题** —— 无障碍真实缺陷 |

### `chat.html`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 29 | 937 | 🟠high/bug | IME 组合态 bug：中文输入法 Enter 确认候选词也会派发 `key==="Enter"`（且 `isComposing===true`），会把半成品文本提前发出 | 加 `!e.isComposing && e.keyCode!==229` 守卫 | ✅ **真问题** —— 对话页主输入是中文，实打实的高频误发 |
| 30 | 669 | 🟡medium/bug | `pickPrompt` 切回键盘态但不清语音状态机：`rec==='busy'` 时残留 `recTimer` 会在 ~1.2s 后覆盖刚填入的提示词；`rec==='on'` 时录音态悬空 | 清理在途识别定时器再切态 | ✅ **真问题** |
| 31 | 920 | 🟡medium/bug | 未登录时 `Auth.require` 异步，而 `busy` 守卫在 `doSend` 内才置位；登录期间多次回车会排队多个回调 → 重复用户气泡 + 重复 AI 回复 | 回调内复查 `busy` 或加挂起标志 | ✅ **真问题** |
| 32 | 806-807 | 🟡medium/bug | TTS 状态竞态：被 cancel 的旧 utterance 仍会触发 `onend/onerror`，两者都绑到 `stopSpeaking`，会误停**新**utterance、播放中途翻回 idle | 标记 utterance，仅当前条允许收状态 | ✅ **真问题** |
| 33 | 838 | 🔵low/security | `aiBubbleHTML()`/`el()` 用字符串拼 `innerHTML`，当前仅常量数据故不可利用，接入真实模型/服务端「来源」即成 XSS 汇聚点 | 正文改 `textContent`/`createTextNode` | ✅ **真问题** —— 信任边界，提前定默认安全性 |

### `index.html`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 34 | 697 | 🟡medium/bug | 互斥守卫只看 `recording` 态；`recognizing` 这 2 秒内 `isRecording()` 为 false，形象切换/键盘输入被重新放开，可叠出双弹层或跳走丢提问 | 判断源改为「非 idle」 | ✅ **真问题** |
| 36 | 600 | 🟡medium/security | `renderOptions()` 用拼接 + `innerHTML` 渲染 `a.src/a.name/a.desc` 未转义；当前硬编码安全，改由接口下发即 XSS/属性破坏 | 逐个建 DOM 节点或对插值转义 | ✅ **真问题** —— 信任边界 |
| 37 | 745-747 | 🟡medium/bug | 降级打开 `qr-sheet` 仅 `setAttribute('open','')`，但 base.css 的 `@supports not selector(dialog:modal)` 兜底只覆盖 `.sheet`，不含 `.modal qrsheet`；老内核下二维码弹层作为普通块落入文档流（无遮罩、不居中） | 为 modal 变体补同口径 `@supports` 定位，或复用 `.sheet` 兜底 | ✅ **真问题** —— 我方核实：兜底确只匹配 `dialog.sheet[open]`，`dialog.modal.qrsheet` 不在内 |
| 35 | 819-820 | 🔵low/bug | `recognizeTimer` 只置 null 从不 `clearTimeout`，当前被 `mic.disabled` 掩盖，守卫一放开旧定时器即乱弹转写 | `render()`/`pagehide` 统一清理，`finishRecognize` 开头显式清理 | ✅ **真问题** |
| 38 | 85 | 🔵low/maintainability | `dvh` 需 Chromium 108+，面向微信 X5 老内核时不支持则整条声明失效，`clamp` 矮屏压缩策略全废 | 前面补一行 `vh` 兜底 | ✅ **真问题** —— 与「老内核兜底」既有约定一致 |

### `h5v2/tokens.css`（设计体系，缺陷外溢到所有页）

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 0 | 134 | 🟡medium/bug | `--sp-para:36px` 由「16×1.7×1.3」硬编码推得，只在 100% 根字号下成立；文件底部 `html[data-font-scale]` 把根字号提到 125%/145%，适老化「段距 ≥ 行距×1.3」在大字号下不再满足 | 改 `calc(1.3 * 1rem * var(--lh-body))` | ✅ **真问题** —— 我方核实字号缩放块确实存在，token 会随字号静默跑出规范 |
| 1 | 41 | 🟡medium/bug | `--ink-3`(#7A76A0) 用于 `--text-xs`(13px) 小字，在 `--mist-2`(#F5F4FD) 上仅 ~3.9:1，低于 WCAG AA 4.5:1 | 加深为 ~#6A668F（≈4.9:1），或仅用于非关键装饰文字 | ✅ **真问题** —— 我方核实两色值，对比度不足 |
| 2 | 146 | 🟡medium/bug | `--h-pill:36px` 低于本文件自定的 `--h-tap:44px` 最小热区，却描述为可点击胶囊/页头小图标钮，违反 WCAG 2.5.5 / 微信适老化 | 提到 44px，或在使用点保证 ≥44px 命中区 | ✅ **真问题** —— 与同文件 44px 约定自相矛盾 |
| 3 | 225 | 🔵low/maintainability | 深色块 `--line`/`--brand-soft` 重复写字面量 `#2E2C40`/`#2A2743`（同 `--mist-4`/`--mist-3`），浅色块本用 `var()` 别名；后续改中性色阶会静默分叉 | 改 `var(--mist-4)`/`var(--mist-3)` | ✅ **真问题** —— token 卫生 |
| 4 | 246 | 🔵low/maintainability | 深色仅重调 `--w-body`，CJK 系统字体多为静态，350 会 snap 到 400，去重无效；若生效则正文比 mid/head 更细、层级倒置 | 用统一的字重 token 驱动，或标注变字重字体前提 | ⚠️ **存疑** —— 论证合理但属字体平台细节，是否值得改取决于兜底字体是否可变字重 |

### `h5v2/base.css`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 5 | 904-906 | 🟡medium/bug | 给 `dialog.modal` 加 `position:relative` 的理由不成立且有害：UA 本就把 `<dialog>` 定为 absolute（`:modal` 时 fixed），已是包含块；改成 relative 反而会盖掉 `dialog:modal` 的 `position:fixed`，且 `.toast` 是 fixed，只认 transform/filter/contain 祖先，不受影响 | 删除该声明并更正注释 | ✅ **真问题** —— 注释理由错误 + 可能破坏原生 modal 定位 |
| 6 | 169-171 | 🟡medium/bug | `.figure` 仅 relative，不建层叠上下文，`.figure::before{z-index:-1}` 会以最近祖先层叠上下文解析；`.figure` 若放进不透明背景容器，光晕会被画到背景之后而消失 | 加 `isolation: isolate` | ✅ **真问题** —— 层叠上下文缺失，属真实渲染风险 |
| 7 | 975 | 🟡medium/maintainability | `min-height:1lh` 与 `100dvh` 是旧微信 X5 内核不支持的现代单位，老内核整条丢弃：错误行占位失效（出现时跳版）、骨架可能塌陷 | 补 `em` 兜底 + `100vh` 兜底 | ✅ **真问题** —— 与本体系「面向旧内核」的自我约束矛盾 |
| 8 | 739 | 🔵low/maintainability | `.btn--danger` 写裸色值 `#FFFFFF`，违反本体系「不新增裸色值」规则、绕过主题 | 改用现有 on-brand token（`var(--on-brand)`） | ✅ **真问题** —— 违反体系自身明文规则 |

### `h5v2/index.html`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 39 | 369 | 🟡medium/bug | `<h1>` 嵌在 `<span class="bar__title">` 内非法（span 只许 phrasing content），且页面出现第二个 `<h1>`，破坏标题大纲 | 用非标题元素，或把 class 提到标题上 | ✅ **真问题** —— 我方核实：页面确有两处 `<h1>`（103、369） |
| 42 | 724-726 | 🔵low/bug | 模式切换只清语音分支（`rec`+识别定时器），未清生成分支（`busy`/`sendTimer`）：在途生成切到语音后丢失「停止」入口，切回时发送键仍显示「停止」 | 模式切换一并重置生成态 | ✅ **真问题** |
| 40 | 88 | 🔵low/maintainability | `.flowpad` 定义后全页无人引用（mockup 用 `.docpage__flow`），死 CSS | 删除或落到原意位置 | ✅ **真问题** —— 我方核实：`.flowpad` 全页仅 1 次出现（即定义本身） |
| 41 | 449 | 🔵low/maintainability | 五个 composer 演示块几乎逐字重复 ~30 行标记，改一个图标要改五处、易漂移 | 抽 `<template>` + JS 克隆，或用 `<symbol>` sprite | ⚠️ **存疑** —— 属「设计体系展示页」的样板代码；是否值得抽要看是否要求 file:// 下可读的静态可演示源 |

### `auth.js`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 43 | 33-34 | 🟠high/security | 演示凭证硬编码进客户端 bundle，任何人 View-Source 可得，「一次性门槛」不构成屏障 | 移到构建/环境注入或运行时配置 | ⚠️ **存疑** —— 任务上下文明确此为**有意的演示门槛、非安全边界**（auth.js 注释也自陈）。OCR 所说「无后端故只能如此」本 demo 亦成立 |
| 44 | 279-282 | 🟠high/security | `wxAuthorize()` 无校验即持久化 `{wx:true}`，`Auth.require()` 对微信用户一律短路；`isWeChat()` 仅查 UA 字符串，任何人可伪造 UA 取得全站登录态 | 明确标注为 demo stub 并在接真实后端时替换 | ⚠️ **存疑** —— 同上，演示态有意为之；但「确保醒目标注、上线前替换」这条建议值得保留 |
| 45 | 209-214 | 🟡medium/bug | `startCountdown()` 直接 `setInterval` 不先清旧 interval；若已在倒计时中再进入，旧 interval 变孤儿，`stopCountdown` 只清最新 `timer`，泄漏的 interval 每秒持续跑并反复翻转按钮态 | 进入前 `if (timer) clearInterval(timer)` | ✅ **真问题** —— 与 #20/#21 同族定时器卫生缺陷 |
| 46 | 23-24 | 🟡medium/maintainability | (1) 项目规则禁用 `var`；(2) `CODE_MS=60000` 注释却写「秒」，与实际毫秒单位及 `CODE_MS/1000` 运算不符、误导 | 改 `const/let`；注释改「毫秒」 | ⚠️ **存疑** —— 注释单位确实错（✅ 该修）；但「项目禁用 var」我在仓库文档中未找到明文依据，OCR 可能泛化。我倾向：var→const 无强约束，注释修正为真 |

### `dev-server.py`

| # | 行 | 级别 | 问题 | OCR 建议 | 初判 |
|---|---|---|---|---|---|
| 47 | 33 | 🔵low/security | `candidate` 未规范化，含 `..` 的路径可解析到 `ROOT` 之外；因 `self.path` 被重写成同一未规范化串，`translate_path()`（会剥离 `..`）最终服务的文件与存在性检查的文件不一致 | 用 `os.path.realpath(os.path.join(...))` 并做前缀校验 | ✅ **真问题** —— 本地开发工具，影响面小，但检查/服务不一致是真缺陷 |
| 48 | 28 | 🔵low/bug | 扩展名映射只写在 `do_GET`，`do_HEAD` 不生效：`HEAD /chat` 返回 404 而 `GET /chat` 返回 200，探活客户端/缓存行为不一致 | 抽 `_resolve_extension()`，重写 `do_HEAD` 调用 | ✅ **真问题** —— 低危但确为不一致 |
| 49 | 41 | 🔵low/maintainability | 日志过滤假设 `args[1]` 恒为状态码，仅对 `log_request` 成立；`log_error`（`args[1]` 是消息文本）依赖「消息不以 '2' 开头」，可能静默吞掉真实日志 | 覆写 `log_request`/`log_error` 而非按位置猜 | ✅ **真问题** —— 脆弱的位置启发式 |
| 50 | 47 | 🔵low/maintainability | `int(sys.argv[1])` 对非数字参数抛未捕获 `ValueError`，端口越界/负数则在绑定时抛原始 traceback，而非友好提示 | 包 try/except 并校验范围 | ✅ **真问题** |

---

## 二、最严重的 5 条（对齐 team-lead 摘要）

1. **`history.html:258`**（high/bug）— 删光会话后写入的 `[]` 会被下次加载覆盖回演示数据，**删除永不持久化**、真实空态不可达。
2. **`chat.html:937`**（high/bug）— 中文输入法 Enter 上屏候选词会**提前发送**半成品文本（缺 `isComposing` 守卫）。
3. **`account.html:201-202`**（high/bug）— **缺登录态守卫**，非微信未登录访客也会看到「正常」的账户页与可用退出按钮。
4. **`phone.html:78-79 + 184-186`**（high/security+maintainability）— **重复硬编码演示凭证**（违反 auth.js 明文约定）+ **绕过 Auth 直写 `'skl.user'`**，两处真源会静默分叉。
5. **`phone.html:145-146`**（medium/bug，但对演示流程可见度高）— `stopCountdown()` 在校验前调用，**保存失败也清倒计时并立刻放开重发**，破坏 60s 节流；叠加 200 行无在途守卫，连点可重复提交。

> 备注：`404.html:7,67` 虽被 OCR 判为 high，但经我核实其论证依赖「HTTP 部署 + 嵌套路径」，与本案「`file://` 双击优先」的演示约束相冲突，已降级为 ⚠️ 存疑（见上表），故未列入前 5。

---

## 三、结论与使用说明

- 55 条中 **43 条判为真问题**，可用于后续修复任务；**10 条存疑**需与用户/真源文档澄清（涉及演示态意图、部署契约、file:// 约束）；**2 条疑似误报**（`.gitignore` 的 agent 配置忽略项，属有意约束）。
- 本清单**只做判断、不改源码**。修复归属见任务 #3–#6 的分工。
- 高价值且低风险的收敛点：IME 守卫（chat/history 各一行）、`tokens.css` 对比度与 token 卫生、`auth.js` 定时器清理、`history.html` 播种逻辑、`404/500` 的非 JS 兜底。

**跳过/未检查：** 二进制与图片（4 张头像 + 二维码，2MB 上限被跳过，不影响评审）、`README.md`/`DESIGN.md`/`h5v2/README.md`（非受支持扩展名，未扫）；未执行的还有 **微信相关路径**（按约定不做自动化测试，只指出风险）；**未启停任何本地端口服务**。
**风险：** ① 多条 high 的「修法」与本案「必须能 `file://` 直接双击打开」的硬约束冲突（尤其 `404.html` 根绝对路径、内联脚本外置、CSP nonce 类建议），落地前须逐条对照演示约束取舍；② `h5v2/` 是父仓库真源的手工同步副本，改其 tokens/base 需回同步父仓库；③ 存储桶末尾统计未逐条覆盖 severity 与 category 的交叉分布（仅总量），如需可按 `category × severity` 再出一张表。
