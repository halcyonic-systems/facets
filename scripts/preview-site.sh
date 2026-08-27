#!/bin/bash
# Serves the assembled _site/ tree the way GitHub Pages will: static files with
# 404.html as the fallback for unknown paths (that fallback is what makes
# /chat/a/<id> deep links work). The dress rehearsal for facets.systems.
#
#   scripts/publish-site.sh --with-model --dry-run   # assemble
#   scripts/preview-site.sh                          # then walk it
#
# Serves on http://localhost:5199 — the `localhost` hostname matters: the chat
# client points its API at the local GSR (:5010) when served from localhost.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="$REPO_ROOT/_site"
[ -d "$SITE_DIR" ] || { echo "no _site/ — run scripts/publish-site.sh --dry-run first" >&2; exit 1; }
PORT="${PORT:-5199}"

python3 - "$SITE_DIR" "$PORT" <<'EOF'
import http.server, functools, sys, os

root, port = sys.argv[1], int(sys.argv[2])

class PagesHandler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code == 404 and os.path.exists(os.path.join(root, "404.html")):
            body = open(os.path.join(root, "404.html"), "rb").read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().send_error(code, message, explain)

handler = functools.partial(PagesHandler, directory=root)
print(f"facets.systems rehearsal: http://localhost:{port}")
http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
EOF
