#!/usr/bin/env python3
"""演示站开发服务器。

用法：python dev-server.py [端口]   （默认 8791）

不用现成的静态服务器（serve / http-server 之类），因为它们会把
/chat.html 重定向成 /chat 这种「干净 URL」——查询串在 301 里直接丢掉，
而本应用的导航全靠 ?q=（语音转写、键盘入口）和 ?from=（返回来源）。
丢了参数就会出现「跳过去了但没发出消息」「返回按钮回错页」这类问题。

Python 自带的 http.server 不改写 URL，但也不认无扩展名路径。
所以这里在它的基础上补一层：/chat → chat.html。
两种写法都能命中，`?q=` 一律原样保留。

只管本地演示，不做任何鉴权 —— 不要拿它对外。
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        # /chat 与 /chat.html 都能命中同一个文件。
        # 只补扩展名，不做重定向 —— 重定向才会丢查询串。
        path = self.path.split('?', 1)[0]
        if not os.path.splitext(path)[1]:
            candidate = os.path.join(ROOT, path.lstrip('/') + '.html')
            if os.path.isfile(candidate):
                # 把 path 换掉、query 原样留着
                self.path = path + '.html' + self.path[len(path):]
        super().do_GET()

    def log_message(self, fmt, *args):
        # 默认日志刷屏，只留错误
        if not args or str(args[1] if len(args) > 1 else '').startswith('2'):
            return
        super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
