# 对抗性复核报告 · findings-verified

- 复核者：reviewer-b（对抗复核员）
- 输入：`_review/findings-ocr.md`（55 条）+ 源码实读 + 一次离线渲染实测
- 口径（team-lead 拍板，已执行）：**部署契约 = `file://` 双击优先，HTTP 静态托管仅作兼容项**；`.claude/AGENTS.md/CLAUDE.md` 忽略有意；demo 凭证是有意门槛非安全边界；不得建议 ES module / fetch / 构建 / 抽公共 JS；微信路径不测。
- **不改源码。**

## 结论摘要

| 分类 | 条数 |
|---|---|
| ✅ 真问题（要修） | **42**（high 4 · medium 19 · low 19） |
| ⚠️ 存疑（真实但属设计取舍，本轮不改） | **4** |
| ❌ 误报剔除 | **9** |
| 合计 | 55 |

**5 条流程关键真问题（最高优先）**：`history.html:258` 删除不持久 · `chat.html:937` IME 误发送 · `account.html:201` 缺登录守卫 · `phone.html:78-79+186` 重复硬编码凭证且绕开 Auth · `phone.html:145-146` 节流被提前清掉。

**推翻/修正 reviewer-a 初判 6 处**：#9 由 high 降 medium（file:// 下 JS 恒在）· #54 由真问题改为「纯风格剔除」· #10 拆分（null 守卫真、CSP 剔除）· #46 拆分（禁用 var 剔除、注释单位真）· #47 降级为「检查/服务不一致」而非安全洞（附证）· #51 由存疑改「存疑（可选加固）」。

---

## A. 逐条对抗性复核

> 「触发路径/危害」列即**自证**：能给出具体触发路径或实测证据的才判真问题；给不出的降级。

### `.gitignore`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 53 | 11 | high | ❌ 剔除 | 忽略 `AGENTS.md/CLAUDE.md` 是本仓库有意约定（任务上下文），OCR 看不到团队约定；这两个文件本就不入版本库 | 不改 |
| 52 | 3 | med | ❌ 剔除 | 同 #53 同源；`.claude/` 忽略有多条实证理由（见仓库既有状态） | 不改 |
| 51 | 5 | med | ⚠️ 存疑(可选) | 全仓无 `.env/*.pem/credentials.json`（纯静态站），补忽略**零收益**；OCR 泛化了 | 可选补，不列为 bug |
| 54 | 10 | low | ❌ 剔除(风格) | `#AGENT配置` 少一个空格，纯格式、零功能影响；本项目不做无关重构 | 不改 |

### `404.html` / `500.html`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 16 | 7 | high | ❌ 剔除(不改) | 仅在「HTTP 托管 + 嵌套 URL 触发 404」时失效；根目录响应 404（GitHub Pages 默认）相对路径可解析。改根绝对路径**反而破坏 `file://` 双击** | 不改；写进部署注意事项 |
| 17 | 67 | high | ❌ 剔除(不改) | 同 #16 | 不改 |
| 9 | 65 | high→med | ✅ 真问题 | 注释自陈「必须留兜底」，实际 `<button id=retry>` 在 JS 禁用/失败时**完全无重试**，只剩非等价的「回到首页」。降级理由：`file://` 场景 JS 恒在，触发面窄 | 换 `<a href=""`> 原生刷新，或补 `<noscript>` |
| 10 | 75 | med | ✅ 真问题(null 守卫) + ❌ 剔除(CSP 段) | `getElementById('retry')` 无 null 守卫：脚本若被拦截则 `.addEventListener` 抛错。但「外置脚本/nonce/hash CSP」与 `file://` 无响应头冲突 | 只加 null 守卫；CSP 建议弃 |
| 11 | 7-8 | med | ❌ 剔除(不改) | 「500 页内联关键 CSS」正是「无外部依赖也能显示」的手段，改不得；本 demo 无后端、资源不会「故障」 | 不改 |

### `account.html`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 12 | 201-202 | high | ✅ 真问题 | 全文件**无** `Auth.require/isLoggedIn` 调用（已 grep 核实）。非微信未登录访客直接打开 `account.html` → `Auth.get()\|\|{}` 静默回退 → 看到「正常」账户页（号码显示 `—`）+ 可用退出钮。与 `Auth.require` 模式不符 | 非微信且未登录时 `location.replace('./index.html')` |
| 13 | 195-198 | med | ✅ 真问题 | `maskPhone('12345678')`：`new Array(8-7).join('*')` = `''` → 返回**完整 8 位未脱敏**。脱敏函数「失败即泄露」 | `length<8` 返回 `'—'`；星号 `Math.max(1, p.length-8)` |
| 14 | 211-212 | low | ✅ 真问题 | `user.avatar`（localStorage，可被本机脚本写）未校验即赋 `img.src`，可指向外部源（referrer 追踪）或 `data:` | 仅放行 `https:`/同源，否则退回内置图形 |
| 15 | 235-236 | low | ✅ 真问题 | 无 `showModal` 时仅 `setAttribute('open','')`，无遮罩、Esc 不可关（与 base.css 兜底同族缺口） | 兜底路径补 Esc/遮罩 |

### `phone.html`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 18 | 78-79 | high | ✅ 真问题 | 页面自带 `DEMO_CODE/DEMO_PHONE`，与 auth.js「两个值**只在这里**，不写进页面」直接冲突（auth.js:30 明文）。改一处必漏另一处 | 由 auth.js 暴露校验入口；页面勿带常量 |
| 19 | 184-186 | high→med | ✅ 真问题 | 直写私有键 `'skl.user'`（auth.js 用 `KEY`），绕过 `Auth.set`；`try/catch` 吞错 → UI 报「已更新」但没落库。auth.js 改键名/结构即静默失联 | 增 `Auth.set/Auth.update` 并调用 |
| 20 | 145-146 | med | ✅ 真问题 | `ph-save` 首行 `stopCountdown()` 在任何校验之前 → **保存失败也清倒计时并放开「获取验证码」**，60s 节流被破坏。成功分支 189 行本就再调一次，此处多余且有害 | 只在成功分支停 |
| 21 | 200 | med | ✅ 真问题 | 无在途守卫，`Enter` 又 `.click()` 同一钮：连点 → 重复 toast + 多次 localStorage 写 + **多个 900ms 跳转定时器** | 加 `submitting` 标志/禁钮 |
| 22 | 131-137 | med→low | ✅ 真问题 | 手机号格式+同号校验在「发送」「保存」两处逐字复制，规则变更需改两处 | 抽 `validatePhone(v)` |
| 23 | 176-177 | low | ⚠️ 存疑(不改) | 推理成立：只认 `DEMO_PHONE` → 登录用户当前号恒为 `DEMO_PHONE` → 同号校验挡 `new===current`、176 行又挡 `new!==DEMO_PHONE` → **成功分支确实不可达**。但这是「演示只认一个号」的必然结果，属设计取舍 | 若保留改绑演示，放开一条路径；否则明确为演示限制 |

### `history.html`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 24 | 258 | high | ✅ 真问题 | `load()` 用 `!convs.length` 判播种：删光全部会话写入 `[]` → 下次加载 `[]` 触发 `seed()` 覆盖回演示数据。**删除永不持久化、真空态（除 `?state=empty`）不可达** | 按「是否首次访问」播种（如哨兵键） |
| 25 | 257 | med | ✅ 真问题 | 只做 `JSON.parse`+`Array` 检查：缺/非法 `ts` → `relTime` 产出「NaN 个月前」；重复 `id` → 删除/重命名 `forEach` 命中错对象 | 解析后过滤非法项（校验 id/title/ts/count） |
| 26 | 470 | med | ✅ 真问题 | `renInput keydown` 未排除组合态：中文输入法 Enter 上屏候选词 → `saveRename()` 误触发 | 加 `!e.isComposing && e.keyCode!==229` |
| 27 | 404 | med | ✅ 真问题 | `showLoading()` 的 `setTimeout(renderList,900)` 不存句柄：错误态连点「重新加载」→ 叠加多个 `renderList` | 存 timer 并在启动前 `clearTimeout` |
| 28 | 520 | low | ✅ 真问题 | 读屏区赋**相同**字符串不再次播报 → 连续删第二条静默（屏幕阅读器行为） | 赋前清空或拼可变内容 |

### `chat.html`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 29 | 937 | high | ✅ 真问题 | `input keydown` 只判 `e.key==='Enter'`：中文 IME 上屏候选词也会派发 Enter 且 `isComposing===true` → **半成品文本提前发出**。本页主输入是中文，高频 | 加 `!e.isComposing && e.keyCode!==229` |
| 30 | 669 | med→low | ✅ 真问题 | `pickPrompt` 只切 `mode` 不碰语音态：`rec==='busy'` 时在途 `recTimer` 约 1.2s 后 `input.value=RECOGNIZED` **覆盖**刚填入的提示词；`rec==='on'` 残留录音态 | 切态前清 `recTimer`、`rec='off'` |
| 31 | 920 | med | ✅ 真问题 | `Auth.require` 异步、`busy` 守卫在 `doSend` 内才置位：登录期间多次回车 → 排队多个回调 → 重复用户气泡 + 重复 AI 回复 | 回调内复查 `busy` 或加挂起标志 |
| 32 | 806-807 | med | ✅ 真问题 | 被 `cancel()` 的旧 utterance 仍触发 `onend/onerror`，两者都绑 `stopSpeaking` → 误停**新** utterance、播放中途翻回 idle | 标记当前 utterance，仅当前条允许收状态 |
| 33 | 838 | low | ✅ 真问题 | `aiBubbleHTML()` 拼 `innerHTML`（当前仅常量，安全）。接真实模型/服务端「来源」即 XSS 汇聚点 | 正文改 `textContent` |

### `index.html`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 34 | 690/827 | med | ✅ 真问题 | 互斥守卫 `isRecording()` **只看 `recording`**：`recognizing` 的 2s 内为 false → 形象切换/键盘输入被放开，可叠出双弹层或跳走丢提问 | 判据改「非 idle」 |
| 36 | 600 | low | ✅ 真问题 | `renderOptions()` 拼接 `innerHTML` 渲染 `a.src/name/desc` 未转义；硬编码下安全，接口下发即 XSS/属性破坏 | 逐个建 DOM 或转义 |
| 37 | 745-747 | med | ✅ 真问题 | 兜底仅 `setAttribute('open','')`，而 base.css 的 `@supports not selector(dialog:modal)`（877-892）**只覆盖 `dialog.sheet[open]`**，`dialog.modal.qrsheet` 不在内 → 老内核下二维码弹层落入文档流（无遮罩/不居中） | 为 `.modal` 变体补同口径兜底 |
| 35 | 819-820 | low | ✅ 真问题 | `recognizeTimer` 只置 null 从不 `clearTimeout`，当前被 `mic.disabled` 掩盖；守卫一放开旧定时器即乱弹转写 | `render()/pagehide` 统一清理 |
| 38 | 85 | low | ✅ 真问题 | `height: clamp(190px, calc(100dvh - 578px), …)` 需 Chromium 108+；X5 老内核整条声明失败 → `clamp` 矮屏压缩全废 | 前面补 `vh` 兜底 |

### `h5v2/tokens.css`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 0 | 134 | med | ✅ 真问题 | `--sp-para:36px` 由「16×1.7×1.3」硬编码推得，**实测** `html[data-font-scale]` 把根字号提到 125%/145%（266-267 行）→ 段距不再满足「≥行距×1.3」 | 改 `calc(1.3 * 1rem * var(--lh-body))` |
| 1 | 41 | med | ✅ 真问题 | **实测计算**：`--ink-3 #7A76A0` 在 `--mist-2 #F5F4FD` 上对比度 ≈3.9:1 < WCAG AA 4.5:1（用于 `--text-xs` 13px） | 加深至 ~#6A668F 或仅用于非关键装饰 |
| 2 | 146 | med | ✅ 真问题 | `--h-pill:36px` < 同文件 `--h-tap:44px`；`.pill`（753）是文本胶囊、`--h-pill` 多用作 iconbtn 可见圆，热区靠 `::before` 撑到 44（base.css:647,665）**已部分缓解**，但 `--h-pill` 的语义描述与 44 约定自相矛盾 | 明确「可见形体 36 / 热区 44」或统一；勿直接改 44 破坏既有几何 |
| 3 | 225 | low | ✅ 真问题 | 深色块 `--line/--brand-soft` 重复字面量 `#2E2C40/#2A2743`（同 `--mist-4/--mist-3`），浅色块用 `var()` 别名 → 改中性色阶会分叉 | 改 `var(--mist-4)/var(--mist-3)` |
| 4 | 246 | low | ⚠️ 存疑(不改) | 深色仅调 `--w-body:350`；CJK 系统字体多为静态，350 会 snap 到 400。属字体平台细节，是否值得改取决于兜底字体 | 不改；如改需统一字重 token |

### `h5v2/base.css`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 5 | 904-906 | med→low | ✅ 真问题（**注释错误**，非渲染 bug） | 注释称「原生 dialog 默认 static，不写则内部 absolute 以页面为参照」——**事实错误**。实测（加载 tokens.css+base.css，showModal 后）`getComputedStyle(dialog.modal).position`：关闭时 `absolute`、开启时 `fixed`；`margin: 276.6px 561px`（居中，top/left 均在视口中心）。它**本就原生居中** | 删该声明并更正注释；**不影响替换文件**（未新增色值/尺寸/依赖） |
| 6 | 169-171 | med | ✅ 真问题 | `.figure` 仅 `position:relative`（无 `isolation/transform/opacity`），`.figure::before{z-index:-1}`（190-196）以最近层叠上下文为参照 → 若 `.figure` 放进**不透明背景**且自身建层叠上下文的容器，光晕会被画到背景后而消失。`isolation` 缺失属实 | 加 `isolation: isolate` |
| 7 | 975 | med→low | ✅ 真问题 | `min-height:1lh` 与 `100dvh` 是 X5 老内核不支持的现代单位 → 老内核整条丢弃：错误行占位失效（跳版）、骨架可能塌陷 | 补 `em` / `100vh` 兜底 |
| 8 | 739 | low | ✅ 真问题 | `.btn--danger { background: var(--danger); color:#FFFFFF }` 写裸色值，违反体系「不新增裸色值」规则、绕过主题 | 改 `var(--on-brand)` |

### `h5v2/index.html`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 39 | 369 | low | ✅ 真问题 | **实测**页面 `<h1>` 出现 **2 次**（103、369），且 369 嵌在 `<span class="bar__title">` 内（span 只许 phrasing content）→ 标题大纲破坏 | 用非标题元素或把 class 提到标题上 |
| 42 | 724-726 | low | ✅ 真问题 | 模式切换只清语音分支（`rec`+定时器），不清生成分支（`busy`/`sendTimer`）→ 在途生成切到语音后丢「停止」入口，切回时发送键仍显示「停止」 | 一并重置生成态 |
| 40 | 88 | low | ✅ 真问题 | **实测** `.flowpad` 全页仅出现 1 次（即定义本身），引用为 0 → 死 CSS | 删除或落到原意位置 |
| 41 | 449 | low | ⚠️ 存疑(不改) | 五个 composer 演示块逐字重复 ~30 行，属「设计体系展示页」的**样板代码**；抽模板/sprite 与「`file://` 下可读的静态演示源」相权衡 | 不改 |

### `auth.js`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 43 | 33-34 | high | ❌ 剔除(不改) | 任务背景明确：演示凭证是**有意门槛、非安全边界**，auth.js:31 自陈「挡不住懂行的人」。无后端下只能如此 | 不改；上线前替换 |
| 44 | 279-282 | high | ❌ 剔除(不改) | `wxAuthorize()` 无校验即 `set({wx:true})`、UA-only 判定，是**演示 stub**（279 行注释已标）。可保留「醒目标注/上线前替换」提醒 | 不改 |
| 45 | 209-214 | med | ✅ 真问题 | `startCountdown()` 直接 `setInterval` 不清旧 interval：倒计时中再次进入 → 旧 interval 成孤儿，`stopCountdown` 只清最新 `timer` → 泄漏的 interval 每秒翻转按钮态 | 进入前 `if (timer) clearInterval(timer)` |
| 46 | 23-24 | med | ⚠️ 拆分 | (a)「项目禁用 `var`」：在 README/DESIGN.md **未找到任何明文规则**（已 grep）→ OCR 泛化，**剔除**；(b) `CODE_MS=60000` 注释写「秒」而值是毫秒、且下方做 `/1000` 运算 → **确为真错误** | 只改注释为「毫秒」；var→const 无强约束可不动 |

### `dev-server.py`

| 条 | 行 | 级别 | 结论 | 触发路径/危害（证据） | 建议 |
|---|---|---|---|---|---|
| 47 | 33 | low | ✅ 真问题（**非安全洞**，是检查/服务不一致） | `candidate=os.path.join(ROOT, path.lstrip('/')+'.html')` 未规范化就 `os.path.isfile` 检查；随后 `translate_path()` **会剥离 `..`** → 检查的文件 ≠ 实际服务的文件。**实测论证**：`SimpleHTTPRequestHandler.translate_path` 对 `..` 段逐个 `continue` 跳过，**无法逃出 ROOT**，故非目录穿越 | 用 `realpath` 并做前缀校验（消不一致） |
| 48 | 28 | low | ✅ 真问题 | 扩展名映射只在 `do_GET`：`HEAD /chat` → 404 而 `GET /chat` → 200，探活/缓存行为不一致 | 抽 `_resolve_extension()`，`do_HEAD` 复用 |
| 49 | 41 | low | ✅ 真问题 | 日志过滤假设 `args[1]` 恒为状态码；`log_error` 中 `args[1]` 是消息文本，靠「不以 '2' 开头」猜测 → 可能吞掉真实日志 | 覆写 `log_request/log_error` 而非按位置猜 |
| 50 | 47 | low | ✅ 真问题 | `int(sys.argv[1])` 对非数字抛未捕获 `ValueError`；端口越界在绑定时抛原始 traceback 而非友好提示 | 包 try/except 并校验范围 |

---

## B. 跨页 / 跨文件一致性专项（OCR 抓不到，本项为主价值）

### B1. `AVATARS` / `AVATAR_SRC` 跨页一致性 —— **无问题 ✅**
- `index.html:574` `AVATARS` = 2 项：`[0]=avatar-01.png(女性)，[1]=avatar-02.png(男性)`。
- `chat.html:534` `AVATAR_SRC` = `[0]=avatar-01.png，[1]=avatar-02.png`。**逐位一致**（下标顺序、默认 0 均一致）。
- `index.html:441` `#hero-img` 初始 `src="./h5v2/assets/avatars/avatar-01.png"` = `AVATARS[0]`。**一致**（注释也显式声明此约束）。
- 两文件键名均 `'skl.avatar'`，写入 `String(i)`、读取 `parseInt`，越界回落 0（index:628 / chat:544）。**一致**。
- 兜底：index 无法 `showModal` 时 `applyAvatar((current+1)%len)`（648），不写库语义一致。**结论：三处一致，改一边需改另一边——当前无漂移。**
- 附注：`h5v2/index.html` 是设计体系展示页，硬编码 `avatar-02.png`（328/367/387），与 demo 流程无关，不算跨页不一致。

### B2. localStorage 键名跨页读写匹配 —— **键名统一，唯一缺口是 phone 直写**
| 键 | 写 | 读 | 结论 |
|---|---|---|---|
| `skl.user` | auth.js:49（`KEY` 常量）· **phone.html:186 直写字面量** | auth.js:42 · account.html:201 · phone.html:131/157/184 | ⚠️ phone 只写直连（**#19**），键名本身拼写一致 |
| `skl.convs` | history.html:269（`KEY`） | history.html:255 | ✅ 单文件，自洽 |
| `skl.avatar` | index.html:622（`AVATAR_KEY`） | index.html:627 · chat.html:542（`AVATAR_KEY`） | ✅ 键名一致，各页各自定义常量（有意，非 bug） |
| `skl.pendingQ` | index.html:809（`sessionStorage`） | chat.html:1128/1129（`sessionStorage`） | ✅ **同为 sessionStorage**，读写配对、读完即删，正确 |

**无「只读不写」「只写不读」「键名拼写不符」项。** 唯一真问题：phone.html:186 绕过 Auth 直写（已列 #19）。

### B3. 演示常量重复定义 —— **跨页数值分叉，新发现**
| 常量 | 定义点 | 值 | 结论 |
|---|---|---|---|
| `DEMO_CODE` | auth.js:34 · **phone.html:78** | 均 `'123456'` | ⚠️ 重复（#18），值暂同 |
| `DEMO_PHONE` | auth.js:33 · **phone.html:79** | 均 `'13800138000'` | ⚠️ 重复（#18），值暂同 |
| `CODE_MS` | auth.js:24 · **phone.html:77** | 均 `60000` | ⚠️ **三处（含注释）重复**；auth.js 注释单位写错（#46b） |
| `RECOGNIZED` 文本 | index.html:677(`DEMO_SPEECH`) · chat.html:970 · h5v2/index.html:663 | 三处同一句 | 重复，值同 |
| **`RECOGNIZE_MS`** | **index.html:674 = `2000`** · **chat.html:971 = `1200`** · h5v2/index.html:664 = `1200` | **不一致** | 🔴 **新发现**：同一「ASR 演示耗时」首页与对话页差 1 倍，改需求要改两处 |
| `TYPING_MS` | chat.html:512 = 900 | 单处 | ✅ |

> DESIGN.md:309 明文：「接真实 ASR 替换 `RECOGNIZED/RECOGNIZE_MS` 两个常量，状态机不动」。两页各有一份且**数值不同**，正是设计体系与 demo 漂移的典型点。建议以注释互指或统一。

### B4. 链接完整性 —— **无断链 ✅（file:// 双击可解析）**
用脚本对全部 7 个根页 + `h5v2/index.html` 的每个 `href/src` 相对路径做 `file://` 解析（`?`/`#` 截断）：
- 全部命中真实文件；3 个二进制资产 `h5v2/assets/avatars/avatar-01.png`·`avatar-02.png`·`assets/demo-qr.png` 均 **存在**。
- 唯一「未命中」是 `index.html` 里 `'<img src="' + a.src + '"…'` 的**字符串模板**（运行期拼装），非断链——扫描误报。
- 对话页移出又接回的残留：**未发现**。`chat→history(?from=chat)`、`history→chat`、`account→phone(?from=account)`、各页 `BACK_MAP` 目标均存在。

### B5. 事件监听 / 定时器泄漏 —— 真问题均为 OCR 已捕获，无新增
- 未清理：`history.html:404`（#27）· `auth.js:213`（#45）· `index.html:820`（#35）· `phone.html:191` 跳转定时器（叠加 #21）。
- 已正确清理：`chat.html` 的 `promptTimer`(695)/`aiTimer`(898)/`recTimer`(1006) · `history` 的 `toastTimer`/`rename` · `index` 的 `toastTimer`。
- 页级 `resize` 监听（chat:1108）不摘除——页面存活期内单次绑定，**不构成泄漏**。

### B6. chat.html 两态输入条状态机自洽性 —— **自洽，仅 #30 一处**
- 键盘↔语音：`modeBtn`(1005) 切走时清 `recTimer`、`rec='off'`；语音 `off→on`（Auth.require）→`on→busy`（`recTimer`）→ 到点回填输入框并回键盘态。**不卡录音态、不重复发送**（`send` 由 `busy` 守卫）。
- DESIGN.md §5.1 声称「只替换 `RECOGNIZED/RECOGNIZE_MS` 不动状态机」**成立**：两常量只出现在 1039/1047 两处输入，未参与状态迁移。
- 唯一缺口：`pickPrompt`(669) 切回键盘态但不清语音分支（**#30**）。

### B7. dev-server.py —— 见 A 表 #47–#50
- **绑定 `127.0.0.1`（48 行）** → 默认不对外，docstring 亦声明「不要拿它对外」。误用为对外服务需显式改绑地址，风险可控。
- 目录列表（SimpleHTTPRequestHandler 默认）仅在 localhost 暴露。
- 路径穿越：**已实证不能逃出 ROOT**（`translate_path` 跳过 `..`）；#47 是检查/服务不一致的低危缺陷。

### B8. base.css 覆写特异性 —— **本仓库遵守，无静默覆盖 ✅**
- 各页 `<link href="./h5v2/*.css">` 均在 `<head>` **第 7–8 行**，页内 `<style>` 在其**之后** → 同特异度时**页内必然获胜**，约定成立。
- 脚本扫描「页内单类名选择器 ∩ base.css 同名类」仅命中一处：`chat.html:149/155 .herocard__body` 覆写 `base.css:301 .herocard__body`。因源序在后，覆写**正常生效**，未被静默覆盖。
- **未发现违反「覆写必须提高特异性」的实例。**

---

## C. 新发现（OCR 漏掉的）

| # | 文件:行 | 级别 | 问题 | 证据 | 建议/结论 |
|---|---|---|---|---|---|
| N1 | index.html:674 vs chat.html:971 | low | 同一 ASR 演示常量 `RECOGNIZE_MS` 首页 `2000` / 对话页 `1200` **值分叉** | 见 B3，直接对读 | 统一或互指注释（**存疑，本轮可不改**） |
| N2 | `CODE_MS` 三处 / `DEMO_*` 两处 | low | 常量在 auth.js 与 phone.html 双份（OCR #18/#46 只点到一半） | B3 | 归入 #18 一起收敛 |
| N3 | dev-server.py:33 | low | #47 实为**检查/服务不一致**，**非目录穿越**（已实证无法逃出 ROOT） | translate_path 对 `..` 段 `continue` | 修法降级为「消不一致」 |
| N4 | account/phone `maskPhone` 与 `auth.js` 各持一份手机号逻辑 | low | 手机号格式校验散落 auth.js:189 / phone.html:102 / 内联正则，无单一真源 | grep `/^1[3-9]\\d{9}$/` 命中 3 处 | 归入 #22 收敛 |
| N5 | history.html:325,364 | low | 历史列表「进入会话」「开始提问」`href=./chat.html` **不经 Auth 门槛** | chat.html 仅在动作点 `Auth.require`，加载不 require | 与「未登录也可浏览、动作时再弹」的既有设计一致 → **非 bug，仅记录** |
| N6 | index.html:740-748 | low | 非微信端**每次加载**都自动弹 `qr-sheet`，无「已提示过」记忆 | 无 once 标记 | 有意引导，非 bug（记录） |

---

## D. 跳过 / 未检查 / 风险

**跳过或未检查：** 图片与二维码二进制内容（不解析）· `README.md`/`DESIGN.md` 正文（仅 grep 关键规则）· 微信真机路径（按约定不测）· `ocr-scan.json` 全量 789KB（只按 findings 逐条读源码验证）· 未启停任何端口服务。

**用户需知的风险：**
1. **最大偏差在数据层**：`history.html:258` 使「删除」在演示中永不持久，若演示脚本包含「删光记录」环节会当场穿帮——建议优先修。
2. **`h5v2/` 是父仓库真源的手工副本**：本报告对 tokens.css/base.css/index.html 的修法落地后，需回同步父仓库 `05-Design/design-system/h5v2/`，否则二次分叉。
3. **#5 属「注释错误」而非渲染 bug**（已实测 dialog 原生居中），修复收益以「消除误导」计，别按「修布局崩溃」排期。
4. **#47 不是安全洞**（已实证无法逃出 ROOT），勿按「目录穿越」上报成安全事件。
5. **#2 `--h-pill` 存在 `::before` 44px 热区部分缓解**，直接把 token 改 44 会破坏既有几何——需按使用点逐一确认，别一刀切。

---

**跳过/未检查：** 微信真机路径、二进制资产内容、README/DESIGN 全文逐字通读、789KB 原始 JSON 全量核对。
**风险：** ① 数据层删除不持久（#24）是演示最易穿帮点；② tokens/base 修好后必须回同步父仓库真源，否则分叉；③ #5（dialog 定位声明）经实测应为「注释纠错」而非布局修复，勿高估其危害；④ #47 非安全洞（已实证不能逃出 ROOT）。
