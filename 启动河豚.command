#!/bin/bash
cd "$(dirname "$0")"
echo "=================================================="
echo " 🐡 正在启动「一口糖 · 一尾河豚」3D交互网页..."
echo "=================================================="
if command -v python3 &>/dev/null; then
    python3 server.py
elif command -v python &>/dev/null; then
    python server.py
else
    echo "未检测到 Python，正在尝试使用 npm 启动..."
    npm run dev
fi
