/* ==========================================================================
   本地设置 —— 外观模式 / 自动播报
   ==========================================================================
   独立于 auth.js：登录态与偏好设置是两件事，混在一起会让「退出登录」顺手
   清掉用户的主题选择，那是意外的数据丢失。

   存储键与取值：
     skl.theme  'auto' | 'light' | 'dark'   缺省 'auto'（跟随设备）
     skl.autospeak  '1' | '0'              缺省 '0'（关闭）

   页面用法（必须放在 <head> 里、样式表之后，避免首帧闪白）：
     <script src="./js/settings.js"></script>
     Settings.applyTheme();          // 把 data-theme 写回 <html>
     Settings.isAutoSpeak();         // 是否自动播报
     Settings.setTheme('dark');      // 设置页用
     Settings.setAutoSpeak(true);
   ========================================================================== */
(function (global) {
  'use strict';

  var THEME_KEY = 'skl.theme';
  var SPEAK_KEY = 'skl.autospeak';

  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (err) { return fallback; }   /* 无痕模式等 */
  }

  function write(key, val) {
    try { localStorage.setItem(key, val); } catch (err) { /* 忽略 */ }
  }

  function getTheme() {
    var v = read(THEME_KEY, 'auto');
    return (v === 'light' || v === 'dark') ? v : 'auto';
  }

  function isAutoSpeak() {
    return read(SPEAK_KEY, '0') === '1';
  }

  /* 把偏好写到 <html data-theme>。'auto' 时移除属性，交回 tokens.css 的
     @media (prefers-color-scheme) 处理。 */
  function applyTheme() {
    var t = getTheme();
    var el = document.documentElement;
    if (t === 'auto') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', t);
    return t;
  }

  function setTheme(t) {
    write(THEME_KEY, (t === 'light' || t === 'dark') ? t : 'auto');
    return applyTheme();
  }

  function setAutoSpeak(on) {
    write(SPEAK_KEY, on ? '1' : '0');
  }

  global.Settings = {
    getTheme: getTheme,
    setTheme: setTheme,
    applyTheme: applyTheme,
    isAutoSpeak: isAutoSpeak,
    setAutoSpeak: setAutoSpeak
  };
})(window);
