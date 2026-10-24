"""No installation required: python3 server.py [--port 8765] [--lan]."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description='河豚本地网页')
parser.add_argument('--port', type=int, default=8765)
parser.add_argument('--lan', action='store_true', help='允许同一局域网的手机访问')
args = parser.parse_args()
root = Path(__file__).resolve().parent / 'dist'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(root), **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

server = ThreadingHTTPServer(('0.0.0.0' if args.lan else '127.0.0.1', args.port), Handler)
print(f'河豚网页：http://localhost:{args.port}', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
