#!/usr/bin/env python3
"""
河豚吹糖人 3D 沉浸交互网页 - 本地轻量化服务器
支持 macOS / Linux / Windows
用法：
  python3 server.py
  python3 server.py --port 8765
  python3 server.py --lan
"""

import sys
import os
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser

class PufferfishHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # 允许跨域和本地资源访问
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def main():
    parser = argparse.ArgumentParser(description='启动河豚吹糖人 3D 交互网页本地服务器')
    parser.add_argument('--port', type=int, default=8765, help='服务器端口 (默认 8765)')
    parser.add_argument('--lan', action='store_true', help='允许同一局域网内其他设备访问')
    parser.add_argument('--no-browser', action='store_true', help='不自动打开浏览器')
    args = parser.parse_args()

    # 如果存在构建目录 dist，则以 dist 为根目录，否则以当前目录为根目录
    root_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(root_dir, 'dist')
    serve_dir = dist_dir if os.path.isdir(dist_dir) else root_dir

    os.chdir(serve_dir)

    bind_host = '0.0.0.0' if args.lan else '127.0.0.1'
    server_address = (bind_host, args.port)

    httpd = HTTPServer(server_address, PufferfishHandler)
    url = f"http://localhost:{args.port}/"

    print("=" * 60)
    print(" 🐡 一口糖 · 一尾河豚 - 本地服务器已启动")
    print(f" 本地访问地址: {url}")
    if args.lan:
        print(" 局域网模式开启：支持手机/平板通过电脑IP访问")
    print(f" 服务目录: {serve_dir}")
    print(" 按 Ctrl + C 停止服务")
    print("=" * 60)

    if not args.no_browser:
        webbrowser.open(url)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止。")
        httpd.server_close()

if __name__ == '__main__':
    main()
