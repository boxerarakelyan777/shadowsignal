#!/usr/bin/env python3
"""Lightweight local static server with graceful client-disconnect handling.

Usage:
  python3 scripts/dev_server.py
  python3 scripts/dev_server.py 8000
  python3 scripts/dev_server.py 8000 /path/to/root
"""

from __future__ import annotations

import os
import shutil
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class QuietDisconnectHandler(SimpleHTTPRequestHandler):
    """Avoid noisy tracebacks when the browser cancels an in-flight request."""

    def copyfile(self, source, outputfile):
        try:
            shutil.copyfileobj(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            # Browser closed the connection (tab reload/close/cancel). Safe to ignore.
            pass


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    directory = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    os.chdir(directory)

    server = ThreadingHTTPServer(("0.0.0.0", port), QuietDisconnectHandler)
    print(f"Serving {os.getcwd()} on http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
