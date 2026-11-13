"""
《第七关》本地大模型代理

作用：
  1. 把浏览器发来的请求转发给 OpenAI 兼容服务，密钥只留在本机
  2. 用配置里的 model 覆盖请求里的模型名，改模型不用重新构建游戏
  3. 补上 CORS 头，让 localhost:8123 的游戏页面可以直接调用

用法：
  1. 编辑 llm.proxy.json，填入 upstream、apiKey、model
  2. python tools/llm_proxy.py
  3. 游戏端设置 window.__LLM__ = { enabled: true }

仅依赖 Python 标准库。
"""

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(ROOT, "llm.proxy.json")


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        if payload:
            self.wfile.write(payload)

    def do_OPTIONS(self):
        self._send(204, b"")

    def do_GET(self):
        if self.path == "/health":
            try:
                cfg = load_config()
                body = json.dumps({
                    "ok": True,
                    "upstream": cfg.get("upstream", ""),
                    "model": cfg.get("model", ""),
                    "apiKeySet": bool(cfg.get("apiKey")),
                }, ensure_ascii=False).encode("utf-8")
            except Exception as exc:
                body = json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False).encode("utf-8")
            self._send(200, body)
            return
        self._send(404, json.dumps({"error": "not found"}).encode("utf-8"))

    def do_POST(self):
        try:
            cfg = load_config()
        except Exception as exc:
            self._send(500, json.dumps({"error": "config: " + str(exc)}, ensure_ascii=False).encode("utf-8"))
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)

        payload = raw
        model = ""
        try:
            obj = json.loads(raw.decode("utf-8")) if raw else {}
            configured = str(cfg.get("model", "")).strip()
            if configured:
                obj["model"] = configured
                model = configured
            else:
                model = str(obj.get("model", ""))
            if cfg.get("disableThinking"):
                obj["thinking"] = {"type": "disabled"}
            payload = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        except Exception:
            model = "(raw)"

        upstream = str(cfg.get("upstream", "")).rstrip("/")
        if not upstream:
            self._send(500, json.dumps({"error": "upstream is empty"}, ensure_ascii=False).encode("utf-8"))
            return

        sys.stderr.write("[llm-proxy] model=%s\n" % model)

        req = urllib.request.Request(upstream + "/chat/completions", data=payload, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", "Bearer " + str(cfg.get("apiKey", "")))

        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                self._send(200, resp.read())
        except urllib.error.HTTPError as exc:
            self._send(exc.code, exc.read())
        except Exception as exc:
            self._send(500, json.dumps({"error": str(exc)}, ensure_ascii=False).encode("utf-8"))

    def log_message(self, fmt, *args):
        sys.stderr.write("[llm-proxy] " + (fmt % args) + "\n")


if __name__ == "__main__":
    conf = load_config()
    host = str(conf.get("host", "127.0.0.1"))
    port = int(conf.get("port", 8787))
    print("[llm-proxy] listening on http://%s:%d" % (host, port))
    print("[llm-proxy] upstream -> %s" % conf.get("upstream", ""))
    print("[llm-proxy] model    -> %s" % (conf.get("model", "") or "(use client model)"))
    print("[llm-proxy] thinking -> %s" % ("disabled" if conf.get("disableThinking") else "default"))
    ThreadingHTTPServer((host, port), Handler).serve_forever()
