# 独立验证报告 · verification-report

- 验证员：verifier（独立，未参与任何修复）
- 基线：`git show HEAD:<file>`（原始状态）与工作区（修复后终态）逐文件 `git diff` 对照
- 口径：`file://` 双击优先；微信路径不自动化（仅静态核查）；`DEMO_PHONE/DEMO_CODE` 是有意门槛而非漏洞；`.gitignore` 忽略 `.claude/AGENTS.md/CLAUDE.md` 有意；不得 ES module/fetch/外部 js。
- **未修改任何源码**；临时自检脚本与 `__pycache__` 已删除。

## 0. 方法与证据

| 检查 | 命令/手段 | 结果 |
|---|---|---|
| 逐条 diff 核对 | `git diff` 通读 11 文件全量 | 见 §1 |
| 内联脚本语法 | 抽取全部 `<script>` 无 src 块，`new vm.Script` | 6/6 PASS |
| `auth.js` | `node --check auth.js` | PASS |
| `dev-server.py` | `python -m py_compile dev-server.py` | PASS |
| 断言自检（27 项） | 临时 node 脚本：AVATARS/localStorage/Auth 导出/裸常量/500/404/seed/模块/服务器 | **27 PASS / 0 FAIL**（脚本跑完即删） |
| 链接完整性 | 全页 `href/src` 相对路径 existsSync | 全部命中（唯一"未命中"是已知 JS 模板字符串误报） |
| 形状/边界 | `maskPhone`、avatar 白名单正则、`esc` 逐例 | 见 §2 |

## 1. 逐条判定（findings-verified 全部 43 条「真问题」）

> 行号为**修复后**工作区行号；证据取 `git diff` 关键行。

| 编号 | 文件:行 | 结论 | 证据（diff 关键行） |
|---|---|---|---|
| 0 | tokens.css:134 | ✅ 已修复 | `--sp-para: 36px` → `calc(1.3 * 1rem * var(--lh-body))`；随根字号缩放，满足「≥行距×1.3」 |
| 1 | tokens.css:41 · h5v2/index.html:126 | ✅ 已修复 | `--ink-3 #7A76A0→#6A668F`；色卡字面量同步（预览页与 token 一致） |
| 2 | tokens.css:146 | ✅ 已修复（按授权仅改注释） | `--h-pill` 值未动，注释改为「可见形体 36 / 热区 ::before 撑 44」——与 team-lead 口径一致 |
| 3 | tokens.css:225/231 | ✅ 已修复 | 深色块 `--line:#2E2C40→var(--mist-4)`、`--brand-soft:#2A2743→var(--mist-3)`；深色块内 `--mist-4:#2E2C40`、`--mist-3:#2A2743`（L213-214）**值等价**，无渲染变化 |
| 5 | base.css:922-926 | ✅ 已修复 | 错误注释（"默认 static"）删除并更正为「开启时 fixed、关闭时 absolute」——仅注释纠错 |
| 6 | base.css:171 | ✅ 已修复 | `.figure` 增 `isolation: isolate`，`::before` 光晕落回形象之后 |
| 7 | base.css:996 | ✅ 已修复 | `min-height:1lh→1.7em`（老内核兜底；1.7em≈16×1.7） |
| 8 | base.css:740 | ✅ 已修复 | `.btn--danger color:#FFFFFF→var(--on-brand)` |
| 9 | 500.html:64 | ✅ 已修复 | `<button id=retry>`+整块 `<script>` → `<a class="btn btn--primary" href="">重新加载</a>`；与 404.html:67 同型 |
| 10 | 500.html | ✅ 已修复（随脚本删除消解） | 无内联 `<script>`，`getElementById('retry')` 空守卫问题不复存在 |
| 12 | account.html:204-207 | ✅ 已修复（附设计注记，见 §2-R2） | 非微信且无 `user.phone` → `location.replace('./index.html')` |
| 13 | account.html:196-197 | ⚠️ **部分修复** | `p.length<8` 守卫 + `Math.max(1,len-7)` 星号；**但 len==8 仍整体泄露**（见 §2-R1） |
| 14 | account.html:211-215 | ✅ 已修复 | 白名单 `/^https:\/\//i` 或同源相对；`data:`/`javascript:`/`//host` 逐例拒绝 |
| 15 | account.html:246 | ❌ 未修复 | 兜底仍仅 `setAttribute('open','')`，无 Esc/遮罩（low，未列入本轮授权） |
| 18 | phone.html:74-79 | ✅ 已修复 | 删 `var CODE_MS/DEMO_CODE/DEMO_PHONE`，改 `Auth.CODE_MS`(109)/`Auth.isDemoCode`(163)/`Auth.isDemoAccount`(170) |
| 19 | phone.html:179-181 | ✅ 已修复 | `localStorage.setItem('skl.user',…)` → `Auth.set(next)`，不再直写私有键 |
| 20 | phone.html:184 | ✅ 已修复 | `stopCountdown()` 移出首行，只在成功分支调用；失败保留 60s 节流 |
| 21 | phone.html:145 | ✅ 已修复 | `if (submitting) return;` 在途守卫；成功分支置 `submitting=true` |
| 22 | phone.html:100-105 | ✅ 已修复 | 抽 `validatePhone(p)`，发送/保存共用 |
| 24 | history.html:263-280 | ✅ 已修复 | `SEEDED_KEY='skl.convs.seeded'` 哨兵；首访才 `seed()`+置位，删光写 `[]` 后刷新不复活（迁移注记见 §2-R3） |
| 25 | history.html:284-291 | ✅ 已修复 | 逐项过滤 `id/ts` 合法性 + 重复 id 去重 |
| 26 | history.html:504-508 | ✅ 已修复（静态，真机置信度中） | `!e.isComposing && e.keyCode!==229` |
| 27 | history.html:199/437-438 | ✅ 已修复 | `loadTimer` 句柄；启动前 `clearTimeout`，回调内置 null |
| 28 | history.html:213-217/497/560 | ✅ 已修复 | `announce()` 先清空、30ms 后写，避同串不重播 |
| 29 | chat.html:957-961 | ✅ 已修复（静态，真机置信度中） | 同 #26 组合态守卫 |
| 30 | chat.html:671-674 | ✅ 已修复 | `pickPrompt` 先 `clearTimeout(recTimer)`+`rec='off'`，迟到回填不再覆盖提示词 |
| 31 | chat.html:941 | ✅ 已修复 | `Auth.require(function(){ if (busy) return; doSend(text); })` |
| 32 | chat.html:775/811-814/824 | ✅ 已修复 | `currentUtter` 归属判定；旧条 `onend/onerror` 不再误停新播报；`stopSpeaking` 置 null |
| 33 | chat.html:844-861/876 | ✅ 已修复 | `aiBubbleHTML`→`fillAiBubble`，正文/来源走 `textContent`；class/属性不变，事件委托 `.speakbtn[data-speak]` 仍命中 |
| 34 | index.html:700/707/839/844 | ✅ 已修复（三处同步） | `isRecording`→`isBusy`（`state!=='idle'`）；`setBlocked` + 键盘钮 + 形象钮**全部**同步；文案改「正在处理，请稍候」 |
| 35 | index.html:767/866 | ✅ 已修复 | `render()` 首行清 `recognizeTimer`；新增 `pagehide` 清理 |
| 36 | index.html:600-604/612-615 | ✅ 已修复 | 新增 `esc()`，`a.src/name/desc` 三处转义 |
| 37 | base.css:897-911 | ✅ 已修复（跨文件） | `@supports not selector(dialog:modal)` 内新增 `dialog.modal[open]` 兜底（fixed/inset:0/fit-content + ::before 遮罩 + `> *` 抬层）；index.html 的 `dialog.modal.qrsheet`(545) 与 auth.js 动态建的 `dlg.className='modal'`(90) 均被命中——**全覆盖，无遗漏 dialog 形态** |
| 38 | index.html:85 | ✅ 已修复 | `clamp(190px, calc(100vh-578px), …)` 前置兜底，dvh 版在后覆盖 |
| 39 | h5v2/index.html:367 | ✅ 已修复 | `<span class="bar__title"><h1>…</h1></span>` → `<span class="bar__title">社科数据助手</span>`；字号/字重并入 `.bar__title`(L86) |
| 40 | h5v2/index.html:86 | ✅ 已修复 | 死 CSS `.flowpad` 删除（全文件仅此 1 处，grep 确认 0 引用） |
| 42 | h5v2/index.html:724-725 | ✅ 已修复 | `modeBtn` 切模式前补 `clearTimeout(sendTimer)`+`busy=false` |
| 45 | auth.js:209 | ✅ 已修复 | `startCountdown` 首行 `if (timer) clearInterval(timer)` |
| 46b | auth.js:24 | ✅ 已修复 | 注释「秒」→「毫秒」 |
| 47 | dev-server.py:34-40 | ✅ 已修复 | `realpath` + `ROOT+os.sep` 前缀校验，检查/服务一致 |
| 48 | dev-server.py:46-48 | ✅ 已修复 | 抽 `_resolve_extension()`，`do_HEAD` 复用 |
| 49 | dev-server.py:50-54 | ✅ 已修复 | 覆写 `log_request(code)` 按真实状态码过滤，删按 `args[1]` 猜的 `log_message` |
| 50 | dev-server.py:58-63 | ✅ 已修复 | `try/except ValueError` + `1<=port<=65535` |

**统计：✅ 已修复 41 · ⚠️ 部分修复 1（#13）· ❌ 未修复 1（#15，low）**

### 撤回断言确认（team-lead 要求）
`git show HEAD:phone.html` 原始版 L77-79 **确有** `var CODE_MS/DEMO_CODE/DEMO_PHONE` 声明 → 原代码**不崩**。任务描述中「未声明引用→ReferenceError」的旧断言**确认错误**，team-lead 已撤回。修复后 `phone.html` 三常量裸引用数为 **0**（剥注释/字符串后正则扫描），仅存 `Auth.*`。

## 2. 回归与新问题清单

**结论：无功能性硬回归。** 3 项软问题如下：

### R1 · #13 残留：`maskPhone` 对 8 位数仍整体泄露（severity: low）
- 位置：`account.html:197`
- 事实：`new Array(Math.max(1, p.length-7)).join('*')`，`p.length===8` 时 `new Array(1)` → `''`，返回完整 8 位号。
- 触发：仅当 `skl.user.phone` 为**恰好 8 位**（demo 实际恒 11 位，故演示不可见）。
- 备注：findings 建议式 `Math.max(1, p.length-8)` 同样无法覆盖 len==8（且会破坏 11 位的长度等长）。修复员保留 `-7`（保长度，正确），仅加了退化守卫。**建议**：若需彻底，守卫改 `p.length <= 8`。
- 定性：**部分修复**（11 位真号已安全）。

### R2 · #12 守卫以 `.phone` 代理"已登录"（severity: low / 设计注记）
- 位置：`account.html:205`
- 事实：`if (!isWx && !user.phone) replace(index)`。当前两条登录路径为「非微信→`{phone}`」「微信→`{wx:true}`」，后者走 `isWx` 分支放行，**today 无误跳**。
- 潜在：若将来扩展登录方式（OAuth/邮箱等，记录无 `phone` 字段），非微信用户会被误弹回首页。canonical 判据应为 `Auth.isLoggedIn()`（`!!get()`）。
- 定性：符合 #12 原意、当前正确；记录以备登录方式扩展时复核。**非本轮回归。**

### R3 · #24 哨兵键的迁移边界（severity: info）
- 位置：`history.html:189/263-280`
- 事实：新哨兵 `skl.convs.seeded` 对**从未访问过**的用户首访播种并置位（PASS）。但已存在 `skl.convs`（有数据）、尚无哨兵的老安装：`seeded=false` 且 `convs.length>0` → 不播种（保留既有数据），但**哨兵未被置位**；此后若用户删光 → 下次加载 `seeded` 仍 false 且 `length===0` → **短暂复活一次演示数据**。
- 影响：仅限"升级前后已用过 demo"的本机浏览器；演示机若清过 storage 或首次打开则不受影响。
- 定性：**新问题（迁移边界）**，非阻断。建议 load() 对「数据非空但无哨兵」的老库补置哨兵。

### 另：跨文件口径确认
- `#37` 判 **已修复**，落在 `base.css`（非 index.html）。`index.html` 的 `#qr-sheet` 段仍是 `setAttribute('open','')` 属**正确**——兜底在 CSS 侧命中，未判漏修。
- `404.html` 未改动属**正确**（其 #16/#17 已被复核剔除）。
- `.gitignore` 未改动属**正确**（#51-54 全为剔除/存疑）。

### 无关改动 / 格式噪音 / 误删
- `git diff` 通读 11 文件：**无** console/debugger 残留、**无**无关重构、**无**误删。
- 唯一"顺手"改动：#15 之外的 `.figure isolation`、`esc()` 均属已授权 finding；`h5v2/index.html` 色卡字面量同步属 #1 连带（保持预览页与 token 一致，合理）。
- `_review/h5v2-rewrite.patch`、`__pycache__/` 为工作区临时产物，非源码改动（`__pycache__` 已由我清理）。

## 3. 未修复项及原因

| 编号 | 级别 | 原因 |
|---|---|---|
| #13 | med | 部分修复：主路径（11 位）已修，8 位边界残留（见 R1） |
| #15 | low | 未列入本轮授权（`showModal` 兜底无 Esc/遮罩）；非回归 |
| #23 | low | 复核判「存疑不改」（演示只认一个号的必然结果） |
| #41 | low | 复核判「存疑不改」（设计体系展示页样板重复） |
| N1 | low | 复核判「存疑：本轮可不改」——`RECOGNIZE_MS` 首页 2000 / 对话页 1200 **值分叉仍在**（页面各自持有，未统一）。属既存漂移，非本轮回归 |

## 4. 总判定

**通过（有条件）。**

- 41/43 条真问题已正确修复，修法自洽、无功能性回归、无无关重构。
- 1 条部分修复（#13 的 8 位边界）、1 条低危未修（#15）、3 项软问题（R1/R2/R3）与 1 项既存漂移（N1）。
- **放行条件**：R1（如需彻底）、R3（如需在老安装上保证删除持久）建议在 `REVIEW-FIXES.md` 记为遗留项；R2、N1 记入待办即可。
- 跨页一致性（AVATARS 下标/默认、localStorage 键、Auth.* 调用点、链接）**全部回归通过**；`file://` 可双击、无 ES module/fetch 回归。

---
**跳过/未检查：** 微信真机路径（含 `wxAuthorize`、X5 老内核 `@supports` 兜底的真实渲染）· 图片/二维码二进制内容 · README/DESIGN 全文 · 8791/8792 未启停（未起任何临时服务）。
**用户需知风险：** ① `h5v2/` 修复必须回同步父仓库真源 `05-Design/design-system/h5v2/`，否则二次分叉；② `--sp-para` 改 rem 后跟随根字号缩放，与 tokens.css §7「间距用 px 绝对值」的笼统说法冲突——fixer-base 已标为特例；③ 输入法/读屏两项（#26/#28/#29）为静态推断，无真机实测，置信度中。

---

## 5. R3 定向复验（补修后追加 · 2026-10-12）

- 补修点：`history.html:285-287`，`load()` 播种分支之后新增迁移分支 `if (!seeded && convs.length) { setItem(SEEDED_KEY,'1') }`
- 手段：从 `history.html` **逐字抽取** `load()`（花括号配对），在 node `vm` 沙箱中以 `fake localStorage` 复现页面启动序列（`load()` 无条件先跑 → 再按 `?state=` 分支）。临时脚本跑完即删，**未改源码**。
- 声明：未在真实浏览器执行（未启 8791/8792），为**逻辑等价复现**；`load()` 抽取 1207 字节，含迁移分支（断言确认）。

| 项 | 场景 | 结论 | 证据 |
|---|---|---|---|
| 1 | 老安装（有数据、无哨兵）→ 加载 → 删光 → 重载 | ✅ PASS | 迁移后 `seeded='1'`（数据保留 n=1）；删光写 `[]` 后重载 `convs.length===0`，**不复活** |
| 2 | 首访（无数据、无哨兵） | ✅ PASS | 播种 **5 条** + `seeded='1'`（无回归） |
| 3 | 已有哨兵 + 数据正常 | ✅ PASS | 保留既有 1 条，`skl.convs` 原始串未变；不重复播种/写 |
| 4 | 老安装 + `?state=reset` | ✅ PASS | `load()` 先置哨兵 → reset 分支播种 5 条 + `save()`；结果 **5 条且哨兵已置**，后续删光仍持久——**语义无矛盾**（删光后哨兵本应保持'1'） |
| 5 | 全非法老数据 `[{}, {id:1}]` | ✅ PASS | 迁移分支用 filter **之前**的 `convs.length`(=2) 判断 → 哨兵已置；filter 后 0 条 → 空态；重载保持 0，**不复活** |

**R3 复验结论：5/5 PASS。** 原 §2-R3 迁移边界问题**已消除**：任何"有数据但无哨兵"的老安装，首次加载即补置哨兵，其后删光持久。§2-R3 由「新问题」更新为「已修复」。

**残留（info）**：老安装 `skl.convs` 为**非空非法 JSON 数组**时，迁移补置哨兵但被 filter 丢弃成 0 条且**不回写** `skl.convs`（仅内存为 0）；因哨兵已置，不会复活，属安全结果。

**跳过/未检查：** 未在真实浏览器验证（沿用不启停 8791/8792 的约定）；复现依赖 `load()` 源码抽取，若后续再改动该函数需重新抽取。
