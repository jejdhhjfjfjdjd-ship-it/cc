#!/bin/python3
# Shenron Ultimate Pro - Backend v5.0 (Production Grade)
# ULTIMATE OBFUSCATOR & ANTI-ANALYSIS ENGINE

import ast
import base64
import zlib
import random
import string
import hashlib
import time
import sys
import os
import json
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, HTMLResponse, JSONResponse
import uvicorn

# ========== CẤU HÌNH HỆ THỐNG ==========
ADMIN_SECRET = os.getenv("SHENRON_ADMIN_SECRET", "SHENRON_SECURE_ADMIN_2026_KEY")
DATABASE_FILE = "shenron_keys.db"

app = FastAPI(title="Shenron Ultimate Pro Engine", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== THREAD-SAFE DATABASE SYSTEM ==========
class KeyDatabase:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._lock, self._get_connection() as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS keys (
                    key_str TEXT PRIMARY KEY,
                    created TEXT,
                    expires TEXT,
                    max_uses INTEGER,
                    uses INTEGER,
                    key_type TEXT
                )
            ''')
            conn.commit()

    def generate_key(self, valid_days: int = 30, max_uses: int = 100, key_type: str = "premium") -> str:
        prefix = "SHENRON"
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=16))
        key = f"{prefix}-{suffix}"
        
        created = datetime.now().isoformat()
        expires = (datetime.now() + timedelta(days=valid_days)).isoformat()

        with self._lock, self._get_connection() as conn:
            conn.execute(
                "INSERT INTO keys VALUES (?, ?, ?, ?, ?, ?)",
                (key, created, expires, max_uses, 0, key_type)
            )
            conn.commit()
        return key

    def verify_and_use_key(self, key_str: str) -> bool:
        if not key_str:
            return False
        
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM keys WHERE key_str = ?", (key_str,))
            row = cursor.fetchone()
            if not row:
                return False

            expires = datetime.fromisoformat(row["expires"])
            if expires < datetime.now() or row["uses"] >= row["max_uses"]:
                return False

            conn.execute("UPDATE keys SET uses = uses + 1 WHERE key_str = ?", (key_str,))
            conn.commit()
            return True

    def get_info(self, key_str: str) -> Optional[dict]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM keys WHERE key_str = ?", (key_str,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def total_keys(self) -> int:
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) as count FROM keys")
            return cursor.fetchone()["count"]

db = KeyDatabase(DATABASE_FILE)

# ========== ADVANCED OBFUSCATOR ENGINE V5.0 ==========
class ShenronUltimateObfuscator:
    def __init__(self, source_code: str, level: str = "ultimate", key: str = None):
        self.source_code = source_code
        self.level = level
        self.key = key
        self.name_map = {}
        self.counter = 0

    def _new_name(self, old_name: str, length: int = 20) -> str:
        if old_name not in self.name_map:
            self.counter += 1
            chars = string.ascii_letters + string.digits + "_"
            prefix = random.choice(['_', '__', '___', 'x_'])
            suffix = ''.join(random.choices(chars, k=length))
            self.name_map[old_name] = f"{prefix}{self.counter:06x}_{suffix}"
        return self.name_map[old_name]

    def _generate_anti_debug_crossplatform(self) -> str:
        return '''
import os, sys, time, platform, ctypes

def _shenron_v5_guard():
    try:
        # Cross-platform Anti-Debug
        if sys.gettrace() is not None or (hasattr(sys, 'flags') and sys.flags.debug):
            sys.exit(1)

        # Windows-specific Anti-Debug checks
        if platform.system() == 'Windows':
            kernel32 = ctypes.windll.kernel32
            if kernel32.IsDebuggerPresent() != 0:
                sys.exit(1)
            is_remote_present = ctypes.c_bool(False)
            kernel32.CheckRemoteDebuggerPresent(kernel32.GetCurrentProcess(), ctypes.byref(is_remote_present))
            if is_remote_present.value:
                sys.exit(1)

        # Anti-Hooking Protection Check for builtins
        if str(exec) != "<built-in function exec>" or str(compile) != "<built-in function compile>":
            sys.exit(1)

        # Time-based Anti-Analysis Check
        t0 = time.perf_counter()
        for _ in range(200000): pass
        if time.perf_counter() - t0 > 0.05:
            sys.exit(1)
    except Exception:
        sys.exit(1)

_shenron_v5_guard()
'''

    def _rename_all_variables(self, node: ast.AST) -> ast.AST:
        class UltimateRenamer(ast.NodeTransformer):
            def __init__(self, parent):
                self.parent = parent
                self.builtins = set(dir(__builtins__))

            def visit_Name(self, node):
                if node.id not in self.builtins and not node.id.startswith('__'):
                    if node.id not in self.parent.name_map:
                        self.parent.name_map[node.id] = self.parent._new_name(node.id)
                    return ast.Name(id=self.parent.name_map[node.id], ctx=node.ctx)
                return node

            def visit_FunctionDef(self, node):
                if node.name not in self.builtins and not node.name.startswith('__'):
                    node.name = self.parent._new_name(node.name)
                self.generic_visit(node)
                return node

            def visit_ClassDef(self, node):
                if node.name not in self.builtins and not node.name.startswith('__'):
                    node.name = self.parent._new_name(node.name)
                self.generic_visit(node)
                return node

        return UltimateRenamer(self).visit(node)

    def obfuscate_and_encrypt(self) -> str:
        tree = ast.parse(self.source_code)
        tree = self._rename_all_variables(tree)

        # Inject Cross-Platform Anti-Debug to top
        guard_ast = ast.parse(self._generate_anti_debug_crossplatform()).body
        tree.body = guard_ast + tree.body
        ast.fix_missing_locations(tree)

        unparsed_code = ast.unparse(tree)

        # Multi-layer Payload Protection
        compressed = zlib.compress(unparsed_code.encode('utf-8'))
        k1, k2, k3 = [random.randint(1, 255) for _ in range(3)]

        l1 = bytes([(b ^ k1) & 0xFF for b in compressed])
        l2 = bytes([(b ^ k2) & 0xFF for b in l1])
        l3 = bytes([(b ^ k3) & 0xFF for b in l2[::-1]])

        payload = base64.b64encode(l3).decode('ascii')

        return f'''# Shenron Pro v5.0 Protected
import base64, zlib, sys, time, ctypes, platform

_k1, _k2, _k3 = {k1}, {k2}, {k3}
_p = "{payload}"

if str(exec) != "<built-in function exec>":
    sys.exit(1)

_d2 = bytes([(b ^ _k3) & 0xFF for b in base64.b64decode(_p)[::-1]])
_d1 = bytes([(b ^ _k2) & 0xFF for b in _d2])
_d0 = bytes([(b ^ _k1) & 0xFF for b in _d1])

exec(compile(zlib.decompress(_d0).decode('utf-8'), '<shenron_v5>', 'exec'))
'''

# ========== API ENDPOINTS ==========

@app.post("/api/generate-key")
async def generate_api_key(request: Request):
    data = await request.json()
    if data.get("admin_secret") != ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin secret")

    key = db.generate_key(
        valid_days=data.get("days", 30),
        max_uses=data.get("max_uses", 100),
        key_type=data.get("type", "premium")
    )
    return {"key": key, "info": db.get_info(key)}

@app.post("/api/verify-key")
async def verify_api_key(request: Request):
    data = await request.json()
    key = data.get("key", "")
    valid = db.verify_and_use_key(key)
    return {"valid": valid, "info": db.get_info(key) if valid else None}

@app.post("/api/obfuscate")
async def api_obfuscate(
    file: UploadFile = File(...),
    level: str = Form("ultimate"),
    key: str = Form("")
):
    if not db.verify_and_use_key(key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Key không hợp lệ, đã hết hạn hoặc hết lượt sử dụng."
        )

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Dung lượng file tối đa là 5MB")

    if not file.filename.endswith('.py'):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận định dạng file .py")

    try:
        source_code = contents.decode('utf-8', errors='ignore')
        obf = ShenronUltimateObfuscator(source_code, level=level, key=key)
        protected_code = obf.obfuscate_and_encrypt()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý Obfuscate: {str(e)}")

    return Response(
        content=protected_code,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=protected_{file.filename}"}
    )

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "5.0.0",
        "total_registered_keys": db.total_keys(),
        "engine": "AST Multi-layer Obfuscator + Anti-Hooking"
    }

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
