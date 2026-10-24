/* ==========================================================================
   登录 / 注册 —— 手机 + 短信验证码
   ==========================================================================
   适用环境：**非微信浏览器**。微信内走公众号授权，由微信体系给身份，
   不出现这个弹层（见 isWeChat）。

   演示站没有后端，验证码不真发。发送后把码写进页面提示里，
   任何机器都能演完整流程；接真实接口时替换 sendCode / verifyCode 两处。

   状态存在 localStorage['skl.user']：
     user = null        → 未登录
     user = { phone }   → 已登录（真实场景还会有 uid / 昵称 / 头像）

   页面用法：
     <script src="./js/auth.js"></script>
     Auth.require(function (user) { ... });   // 未登录则弹层，登录后回调
     Auth.get();                              // 取当前用户，null 表示未登录
     Auth.logout();
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'skl.user';
  var CODE_MS = 60000;      /* 重发倒计时（毫秒）*/

  /* ---------------------------------------------------------- 演示账号
     演示站没有后端，真短信与真校验都不存在。所以：
       · 验证码恒为 DEMO_CODE，校验它就是校验一个常量；
       · 手机号只认 DEMO_PHONE 一个。
     两个值都**只在这里**，不写进页面 —— 演示时由演示者口头给出。
     注意它们挡不住懂行的人，这只是演示用的一次性门槛，不是安全边界。
     接真实后端时删掉 isDemoAccount 的调用即可。 */
  var DEMO_PHONE = '13800138000';
  var DEMO_CODE = '123456';

  function isDemoAccount(phone) { return phone === DEMO_PHONE; }

  /* ---------------------------------------------------------------- 状态 */

  function get() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) { return null; }
  }

  function set(user) {
    try {
      if (user) localStorage.setItem(KEY, JSON.stringify(user));
      else localStorage.removeItem(KEY);
    } catch (err) { /* 无痕模式等，忽略 */ }
  }

  function isLoggedIn() { return !!get(); }

  /* 微信内不走这套。UA 里含 MicroMessenger 即为微信内置浏览器。 */
  function isWeChat() { return /micromessenger/i.test(navigator.userAgent); }

  /* ------------------------------------------------------------- 弹层 UI */

  var dlg = null, els = null, timer = null, countdown = 0;
  var pending = null;                  /* 登录成功后要回调的函数 */

  /* 全站通用的提示出口。
     页面若已有自己的 toast（如首页、对话页），用 Auth.onToast() 注册进来，
     复用它以免同一页出现两个 toast；没有的页面（账户页等）走内建的那个。
     两条路的样式都出自 base.css 的 .toast，不分叉。 */
  var customToast = null;
  var ownToastEl = null, ownToastTimer = null;

  function toast(msg) {
    if (customToast) { customToast(msg); return; }
    if (!ownToastEl) {
      ownToastEl = document.createElement('div');
      ownToastEl.className = 'toast';
      ownToastEl.setAttribute('role', 'status');
      ownToastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(ownToastEl);
    }
    ownToastEl.textContent = msg;
    ownToastEl.hidden = false;
    clearTimeout(ownToastTimer);
    ownToastTimer = setTimeout(function () { ownToastEl.hidden = true; }, 2000);
  }

  function build() {
    if (dlg) return;

    dlg = document.createElement('dialog');
    dlg.className = 'modal';
    dlg.setAttribute('aria-labelledby', 'auth-title');
    dlg.innerHTML =
      '<h2 id="auth-title">手机号登录</h2>' +
      '<p class="modal__hint">未注册的手机号将自动创建账号。</p>' +
      '<label class="field" for="auth-phone">' +
        '<span class="field__label">手机号</span>' +
        '<input class="field__input" id="auth-phone" type="tel" inputmode="numeric" ' +
               'maxlength="11" autocomplete="tel" placeholder="请输入 11 位手机号">' +
      '</label>' +
      '<label class="field" for="auth-code">' +
        '<span class="field__label">短信验证码</span>' +
        '<div class="authcode">' +
          '<input class="field__input" id="auth-code" type="text" inputmode="numeric" ' +
                 'maxlength="6" autocomplete="one-time-code" placeholder="6 位验证码">' +
          '<button class="btn btn--quiet" type="button" id="auth-send">获取验证码</button>' +
        '</div>' +
        /* 验证码提示行：可用 .field__help 交代「码发到哪了 / 演示用码是多少」 */
        '<span class="field__help" id="auth-codehelp"></span>' +
      '</label>' +
      /* 校验失败的提示走 toast 而不是字段下方的常驻错误行：
         用同一个 .toast 组件（样式、动效全站一套），只是挂在 dialog 内部，
         才能浮在遮罩之上。见 base.css 里 dialog.modal .toast 的说明。 */
      '<div class="toast" id="auth-toast" role="status" aria-live="polite" hidden></div>' +
      '<div class="cluster">' +
        '<button class="btn btn--quiet" type="button" id="auth-cancel">取消</button>' +
        '<button class="btn btn--primary" type="button" id="auth-ok">登录 / 注册</button>' +
      '</div>';
    document.body.appendChild(dlg);

    els = {
      phone: dlg.querySelector('#auth-phone'),
      code: dlg.querySelector('#auth-code'),
      send: dlg.querySelector('#auth-send'),
      codeHelp: dlg.querySelector('#auth-codehelp'),
      toast: dlg.querySelector('#auth-toast'),
      ok: dlg.querySelector('#auth-ok'),
      cancel: dlg.querySelector('#auth-cancel')
    };

    els.send.addEventListener('click', send);
    els.ok.addEventListener('click', submit);
    els.cancel.addEventListener('click', function () { close(null); });
    /* 边输边收起错误 —— 提示还挂着但用户已经在改了，留着会让人以为没生效 */
    els.phone.addEventListener('input', hideModalToast);
    els.code.addEventListener('input', hideModalToast);
    els.code.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    els.phone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); els.code.focus(); }
    });
  }

  /* 校验失败的统一出口：弹层内 toast + 把出错的字段标红。
     纯靠红边不够（§10 状态不只靠颜色），所以文案与颜色两条通道都给。 */
  var modalToastTimer = null;

  function showError(msg, field) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(modalToastTimer);
    /* 比页面级 toast 长一点：这是要用户改完再提交的，读得慢 */
    modalToastTimer = setTimeout(hideModalToast, 3200);
    (field || els.phone).setAttribute('aria-invalid', 'true');
  }

  function hideModalToast() {
    if (els && els.toast) els.toast.hidden = true;
    if (els) {
      els.phone.removeAttribute('aria-invalid');
      els.code.removeAttribute('aria-invalid');
    }
    clearTimeout(modalToastTimer);
  }

  function open(onDone) {
    build();
    pending = onDone || null;
    els.phone.value = '';
    els.code.value = '';
    els.codeHelp.textContent = '';
    hideModalToast();
    stopCountdown();
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    els.phone.focus();
  }

  function close(user) {
    stopCountdown();
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
    var cb = pending; pending = null;
    if (cb) cb(user);
  }

  /* --------------------------------------------------------------- 动作 */

  function isPhone(v) { return /^1[3-9]\d{9}$/.test(v); }

  function send() {
    var phone = els.phone.value.trim();
    if (!isPhone(phone)) {
      showError('手机号格式不对，请填 11 位手机号。', els.phone);
      els.phone.focus();
      return;
    }
    hideModalToast();
    els.code.focus();

    /* 页面**不暴露**验证码 —— 演示时由演示者口头给出（见上 DEMO_CODE）。
       所以这里只交代「已经发出了」这件事，码本身不写出来。
       接真实接口时把这一行换成请求即可。 */
    els.codeHelp.textContent = '验证码已发送，请查看短信并填入。';

    startCountdown();
  }

  function startCountdown() {
    if (timer) clearInterval(timer);   /* 倒计时未走完又进来：先清旧的，别留孤儿 interval */
    countdown = CODE_MS / 1000;
    els.send.disabled = true;
    tick();
    timer = setInterval(tick, 1000);
  }

  function tick() {
    if (countdown <= 0) { stopCountdown(); return; }
    els.send.textContent = countdown + ' 秒后重发';
    countdown--;
  }

  function stopCountdown() {
    if (timer) { clearInterval(timer); timer = null; }
    if (els) {
      els.send.disabled = false;
      els.send.textContent = '获取验证码';
    }
    countdown = 0;
  }

  function submit() {
    var phone = els.phone.value.trim();
    var code = els.code.value.trim();

    if (!isPhone(phone)) {
      showError('手机号格式不对，请填 11 位手机号。', els.phone);
      els.phone.focus();
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      showError('验证码是 6 位数字，请检查后重填。', els.code);
      els.code.focus();
      return;
    }
    if (code !== DEMO_CODE) {
      showError('验证码不对或已过期，请重新获取。', els.code);
      els.code.focus();
      return;
    }
    /* 只认演示用的那个号。
       演示站没有后端，谁都发不了真短信，所以「能不能登录」本来就无从校验；
       与其放任何号码进来（看起来像真能注册，实际拿到的是假账号），
       不如收成唯一一个号 —— 页面不写它，由演示者口头给出。
       接真实短信/后端时删掉这一段，恢复「任意手机号 + 真实校验码」。 */
    if (!isDemoAccount(phone)) {
      showError('当前为演示环境，请使用演示账号登录。', els.phone);
      els.phone.focus();
      return;
    }

    var user = { phone: phone };
    set(user);
    close(user);
    /* 成功提示由页面给 —— 弹层刚关上，提示要靠它自己那句 toast 站住 */
    toast('登录成功，欢迎回来');
  }

  function logout() { set(null); }

  /* ------------------------------------------------------- 微信授权（占位）

     演示站没有公众号 AppID / 没有后端换 openid，所以这里**只留顺序不乱**：
     真实实现是「取 code → 后端换 openid → 落库 → 记登录态」。
     现在直接给一个本地标记，好让「微信端已登录」这条路走得通。

     接真实授权时替换本函数体即可，调用点（boot / 各处 require）都不用动。
     注意真实实现里这一步会跳转，所以它必须发生在页面加载时，
     不能挂在某个点击动作上 —— 那会让用户点了按钮又被弹走。 */
  /* 演示用的微信身份。真机上这三项都来自公众号授权返回的用户信息，
     演示站没有，就用固定值 —— 设置页要展示「昵称 + 头像 + 脱敏手机号」，
     空着演示不出效果。手机号用演示账号那一个，与手机号登录路径同源。 */
  var WX_PROFILE = {
    nickname: '微信用户_社科',
    avatar: './assets/demo-avatar.jpg',   /* 演示用头像，与二维码同放 assets */
    phone: DEMO_PHONE
  };

  function wxAuthorize() {
    if (get()) return;                     /* 已登录就不重复授权 */
    set({
      wx: true,
      nickname: WX_PROFILE.nickname,
      avatar: WX_PROFILE.avatar,
      phone: WX_PROFILE.phone
    });
  }

  global.Auth = {
    get: get,
    set: set,                                  /* 改手机号页写回登录态，别再直写 skl.user */
    CODE_MS: CODE_MS,                          /* 改手机号页倒计时，与登录弹层同为 60s */
    isDemoAccount: isDemoAccount,              /* 页面别自带演示号常量 */
    isDemoCode: function (code) { return code === DEMO_CODE; },
    logout: logout,
    isLoggedIn: isLoggedIn,
    isWeChat: isWeChat,
    open: open,
    /* 页面已有 toast 时注册进来，全站共用同一个 */
    onToast: function (fn) { customToast = fn; },
    /* 通用提示出口：账户页、改手机号页等直接用它 */
    toast: toast,
  /* 未登录就先弹层；已登录直接回调。
       **微信内直接放行** —— 身份由公众号授权给，不出现手机号登录层。
       微信的授权由 boot() 在页面加载时就发起，不等到某个操作。 */
    require: function (cb) {
      if (isWeChat()) { cb(null); return; }
      var user = get();
      if (user) { cb(user); return; }
      open(function (u) { if (u) cb(u); });
    },

    /* 页面加载时调一次。
       微信内：直接发起授权 —— 用微信组件登录，不是进入页面后再点一次。
       非微信：什么都不做。手机号登录层由用户首次触发动作时再弹
       （未登录也不影响浏览，上来就弹一个要填手机号的框是骚扰）。
       例外：首页扫码演示会显式传 true（用户点了二维码＝确认授权），
       此时非微信也要落登录态，否则演示走不到授权后。
       真实微信授权接在这里：把下面三行换成调微信 SDK（拿 code → 换 openid）。 */
    boot: function (force) {
      if (!force && !isWeChat()) return;
      wxAuthorize();
    }
  };
})(window);
