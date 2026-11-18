#!/usr/bin/env python3
"""Tiny HTTP server for the SinusBot soundboard.

SinusBot's playURL only plays http urls. The bot shows the host name as track title for
plain streams, so this server prepends an ID3v2 tag with the file name as title.
Usage: sounds-server.py <folder> [port]   (listens on 127.0.0.1 only)
"""
import os, sys, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

FOLDER = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8098


def id3_title(title):
    text = b'\x03' + title.encode('utf-8')          # encoding byte 3 = UTF-8
    frame = b'TIT2' + len(text).to_bytes(4, 'big') + b'\x00\x00' + text
    size = len(frame)
    syncsafe = bytes([(size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f])
    return b'ID3\x04\x00\x00' + syncsafe + frame


class Handler(BaseHTTPRequestHandler):
    def do_GET(self, head=False):
        name = urllib.parse.unquote(self.path.split('?')[0].lstrip('/'))
        path = os.path.abspath(os.path.join(FOLDER, name))
        ext = os.path.splitext(name)[1].lower()
        if os.path.dirname(path) != FOLDER or ext not in ('.mp3', '.png') or not os.path.isfile(path):
            self.send_error(404)
            return
        with open(path, 'rb') as f:
            data = f.read()
        if ext == '.mp3' and not data.startswith(b'ID3'):
            data = id3_title(name[:-4]) + data
        self.send_response(200)
        self.send_header('Content-Type', 'image/png' if ext == '.png' else 'audio/mpeg')
        # Shoutcast headers: players that show radio stream names use these as title
        self.send_header('icy-name', name[:-4])
        self.send_header('ice-name', name[:-4])
        self.send_header('icy-description', name[:-4])
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        if not head:
            self.wfile.write(data)

    def do_HEAD(self):
        self.do_GET(head=True)

    def log_message(self, *args):
        pass


ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
