/* ==========================================================================
   环境判定与微信授权（占位）
   ==========================================================================
   微信内不走手机号登录，身份由公众号授权给。

   演示站没有公众号 AppID、也没有后端换 openid，所以 wxAuthorize 只留顺序不乱：
   真实实现是「取 code → 后端换 openid → 落库 → 记登录态」，现在直接给一个
   本地标记。接真实授权时替换它的函数体即可。

   **调用时机**（首页的实际情况，与真实微信不同）：
   真实微信里这一步会跳转、且必须发生在页面加载时 —— 用户点了按钮又被弹走，
   所以不能挂在点击上。演示站没有可跳的授权页，改由首页点「立即对话」
   弹一个确认窗示意：确认走 Auth.boot()，取消什么都不做。
   接真实授权时，把点击那一路改回「加载时发起 + 整页跳转」即可，
   boot() 本身是幂等的，调用点不必自己判重。

   手机号登录层（Auth.open / require）随账户体系一起移出了本仓库，
   接回来时从 git 38e5b67 取回旧版 auth.js。
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'skl.user';      /* 登录态。与旧版 auth.js 同一个键，接回来时能接上 */

  /* 微信内不走这套。UA 里含 MicroMessenger 即为微信内置浏览器。 */
  function isWeChat() { return /micromessenger/i.test(navigator.userAgent); }

  /* 占位：写入本地标记。已授权则跳过，所以重复调无害。 */
  function wxAuthorize() {
    try {
      if (localStorage.getItem(KEY)) return;   /* 已登录就不重复授权 */
      localStorage.setItem(KEY, JSON.stringify({ wx: true }));
    } catch (err) { /* 无痕模式等，忽略 */ }
  }

  global.Auth = {
    isWeChat: isWeChat,

    /* 发起授权。微信内由首页在加载时调；非微信由首页在确认窗的「确认授权」里调。
       幂等：已授权则 no-op。 */
    boot: function () {
      wxAuthorize();
    }
  };
})(window);
