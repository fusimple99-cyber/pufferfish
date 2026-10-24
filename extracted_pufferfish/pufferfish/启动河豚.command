#!/bin/zsh
cd -- "${0:A:h}"
if command -v python3 >/dev/null 2>&1; then
  python3 server.py
elif [[ -x /Users/fusimple/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 ]]; then
  /Users/fusimple/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 server.py
else
  echo "请安装 Python 3，然后执行 python3 server.py。"
  read -r
fi
