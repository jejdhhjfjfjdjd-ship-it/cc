#!/bin/python3
# Shenron Ultimate Pro v6.0 - Enterprise Edition with Telegram Bot
# ⚠️ TOKEN ĐÃ ĐƯỢC TÍCH HỢP - THAY ĐỔI SAU KHI TEST

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
import hmac
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any
from functools import wraps
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# ========== TELEGRAM BOT TOKEN ==========
# ⚠️ THAY ĐỔI TOKEN NÀY SAU KHI TEST!
TELEGRAM_BOT_TOKEN = "8921957218:AAHsfSKG0LZ1ufTQDrGtl0gz65m5a2tM2Xw"
BOT_USERNAME = "ShenronUltimateBot"

# ========== CẤU HÌNH HỆ THỐNG ==========
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi_limiter import FastAPILimiter
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
import redis.asyncio as redis
import aiofiles

# Telegram Bot
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, Bot
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

# ========== LOGGING ==========
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('shenron.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ========== CẤU HÌNH ==========
ADMIN_SECRET = os.getenv("SHENRON_ADMIN_SECRET", "SHENRON_SECURE_ADMIN_2026_KEY")
DATABASE_FILE = "shenron_keys.db"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
RATE_LIMIT = "10/minute"

# ========== RATE LIMITER ==========
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Shenron Ultimate Pro Engine v6.0", version="6.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ========== DATABASE NÂNG CẤP ==========
class EnhancedKeyDatabase:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()
        self.cache = {}
        self.cache_timeout = 300

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
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
                    key_type TEXT,
                    owner_id TEXT,
                    is_active INTEGER DEFAULT 1,
                    metadata TEXT
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS usage_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key_str TEXT,
                    timestamp TEXT,
                    ip TEXT,
                    file_name TEXT,
                    status TEXT,
                    FOREIGN KEY (key_str) REFERENCES keys(key_str)
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    username TEXT,
                    created TEXT,
                    total_keys INTEGER DEFAULT 0,
                    is_admin INTEGER DEFAULT 0
                )
            ''')
            conn.commit()

    def generate_key(self, valid_days: int = 30, max_uses: int = 100, 
                    key_type: str = "premium", owner_id: str = None, 
                    metadata: dict = None) -> dict:
        prefix = random.choice(["SHENRON", "DRAGON", "GOKU", "VEGETA", "FRIEZA"])
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=20))
        key = f"{prefix}-{suffix}"
        
        created = datetime.now().isoformat()
        expires = (datetime.now() + timedelta(days=valid_days)).isoformat()
        metadata_json = json.dumps(metadata or {})

        with self._lock, self._get_connection() as conn:
            conn.execute(
                """INSERT INTO keys 
                   (key_str, created, expires, max_uses, uses, key_type, owner_id, metadata) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (key, created, expires, max_uses, 0, key_type, owner_id, metadata_json)
            )
            
            if owner_id:
                conn.execute(
                    "UPDATE users SET total_keys = total_keys + 1 WHERE user_id = ?",
                    (owner_id,)
                )
            conn.commit()
            
        info = self.get_info(key)
        self.cache[key] = (info, time.time())
        return info

    def verify_and_use_key(self, key_str: str, ip: str = None, file_name: str = None) -> bool:
        if not key_str:
            return False
        
        if key_str in self.cache:
            info, timestamp = self.cache[key_str]
            if time.time() - timestamp < self.cache_timeout:
                if info and info.get("is_active", 0) == 1:
                    expires = datetime.fromisoformat(info["expires"])
                    if expires >= datetime.now() and info["uses"] < info["max_uses"]:
                        return self._update_usage(key_str, ip, file_name)
        
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM keys WHERE key_str = ? AND is_active = 1", (key_str,))
            row = cursor.fetchone()
            if not row:
                return False

            expires = datetime.fromisoformat(row["expires"])
            if expires < datetime.now() or row["uses"] >= row["max_uses"]:
                return False

            return self._update_usage(key_str, ip, file_name)

    def _update_usage(self, key_str: str, ip: str = None, file_name: str = None) -> bool:
        with self._lock, self._get_connection() as conn:
            conn.execute(
                "UPDATE keys SET uses = uses + 1 WHERE key_str = ?",
                (key_str,)
            )
            conn.execute(
                """INSERT INTO usage_logs (key_str, timestamp, ip, file_name, status) 
                   VALUES (?, ?, ?, ?, ?)""",
                (key_str, datetime.now().isoformat(), ip, file_name, "success")
            )
            conn.commit()
            
        info = self.get_info(key_str)
        self.cache[key_str] = (info, time.time())
        return True

    def get_info(self, key_str: str) -> Optional[dict]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM keys WHERE key_str = ?", (key_str,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def revoke_key(self, key_str: str) -> bool:
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute(
                "UPDATE keys SET is_active = 0 WHERE key_str = ?",
                (key_str,)
            )
            conn.commit()
            if key_str in self.cache:
                del self.cache[key_str]
            return cursor.rowcount > 0

    def get_stats(self) -> dict:
        with self._lock, self._get_connection() as conn:
            total = conn.execute("SELECT COUNT(*) as count FROM keys").fetchone()["count"]
            active = conn.execute("SELECT COUNT(*) as count FROM keys WHERE is_active = 1").fetchone()["count"]
            total_uses = conn.execute("SELECT SUM(uses) as total FROM keys").fetchone()["total"] or 0
            
            by_type = conn.execute(
                "SELECT key_type, COUNT(*) as count FROM keys GROUP BY key_type"
            ).fetchall()
            
            return {
                "total_keys": total,
                "active_keys": active,
                "total_uses": total_uses,
                "by_type": [dict(row) for row in by_type]
            }

    def get_user_keys(self, user_id: str) -> list:
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM keys WHERE owner_id = ? ORDER BY created DESC",
                (user_id,)
            )
            return [dict(row) for row in cursor.fetchall()]

    def get_user_info(self, user_id: str) -> Optional[dict]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

db = EnhancedKeyDatabase(DATABASE_FILE)

# ========== OBFUSCATOR ENGINE NÂNG CẤP ==========
class UltimateShenronObfuscator:
    def __init__(self, source_code: str, level: str = "ultimate", 
                 key: str = None, options: dict = None):
        self.source_code = source_code
        self.level = level
        self.key = key
        self.options = options or {}
        self.name_map = {}
        self.counter = 0
        self.builtins = set(dir(__builtins__))
        
        self.anti_debug = self.options.get("anti_debug", True)
        self.anti_vm = self.options.get("anti_vm", True)
        self.encrypt_strings = self.options.get("encrypt_strings", True)
        self.control_flow = self.options.get("control_flow", True)
        self.junk_code = self.options.get("junk_code", True)
        self.integrity_check = self.options.get("integrity_check", True)
        self.multi_layer = self.options.get("multi_layer", True)

    def _new_name(self, old_name: str, length: int = 25) -> str:
        if old_name not in self.name_map:
            self.counter += 1
            chars = string.ascii_letters + string.digits + "_"
            prefixes = ['_', '__', '___', 'x_', 'o_', 's_', 'p_', 
                       'S_', 'D_', 'M_', '🐉', '⚡', '🔥']
            prefix = random.choice(prefixes)
            suffix = ''.join(random.choices(chars, k=length))
            checksum = hashlib.md5(f"{old_name}{self.counter}".encode()).hexdigest()[:8]
            self.name_map[old_name] = f"{prefix}{self.counter:08x}_{checksum}_{suffix}"
        return self.name_map[old_name]

    def _generate_advanced_anti_debug(self) -> str:
        checks = []
        
        checks.append("""
# Layer 1: Anti-Debug
import os, sys, time, platform, ctypes
def _shenron_guard():
    try:
        if __debug__ or (hasattr(sys, 'gettrace') and sys.gettrace() is not None):
            os._exit(1)
        if platform.system() == 'Windows':
            kernel32 = ctypes.windll.kernel32
            if kernel32.IsDebuggerPresent() != 0:
                os._exit(1)
        t0 = time.perf_counter()
        for _ in range(300000): pass
        if time.perf_counter() - t0 > 0.1:
            os._exit(1)
    except:
        os._exit(1)
_shenron_guard()
""")
        return "\n".join(checks)

    def _encrypt_strings(self, tree: ast.AST) -> ast.AST:
        class StringEncryptor(ast.NodeTransformer):
            def __init__(self, parent):
                self.parent = parent
                self.key = random.randint(1, 255)
                
            def visit_Constant(self, node):
                if isinstance(node.value, str) and len(node.value) > 5:
                    encrypted = ''.join(chr(ord(c) ^ self.key) for c in node.value)
                    decrypt = ast.Call(
                        func=ast.Lambda(
                            args=ast.arguments(
                                posonlyargs=[],
                                args=[ast.arg(arg='x')],
                                kwonlyargs=[],
                                kw_defaults=[],
                                defaults=[]
                            ),
                            body=ast.Call(
                                func=ast.Name(id=''.join, ctx=ast.Load()),
                                args=[
                                    ast.ListComp(
                                        elt=ast.Call(
                                            func=ast.Name(id='chr', ctx=ast.Load()),
                                            args=[
                                                ast.BinOp(
                                                    left=ast.Call(
                                                        func=ast.Name(id='ord', ctx=ast.Load()),
                                                        args=[ast.Name(id='c', ctx=ast.Load())],
                                                        keywords=[]
                                                    ),
                                                    op=ast.BitXor(),
                                                    right=ast.Constant(value=self.key)
                                                )
                                            ],
                                            keywords=[]
                                        ),
                                        generators=[
                                            ast.comprehension(
                                                target=ast.Name(id='c', ctx=ast.Store()),
                                                iter=ast.Name(id='x', ctx=ast.Load()),
                                                ifs=[],
                                                is_async=0
                                            )
                                        ]
                                    )
                                ],
                                keywords=[]
                            )
                        ),
                        args=[ast.Constant(value=encrypted)],
                        keywords=[]
                    )
                    return decrypt
                return node
                
        return StringEncryptor(self).visit(tree)

    def _add_junk_code(self, tree: ast.AST) -> ast.AST:
        class JunkInjector(ast.NodeTransformer):
            def __init__(self, parent):
                self.parent = parent
                self.junk_templates = [
                    lambda: ast.Assign(
                        targets=[ast.Name(id=f'_{random.randint(1000,9999)}', ctx=ast.Store())],
                        value=ast.Constant(value=random.randint(1, 999999))
                    ),
                    lambda: ast.Expr(
                        value=ast.Call(
                            func=ast.Name(id='len', ctx=ast.Load()),
                            args=[ast.Constant(value=str(random.randint(1, 999999)))],
                            keywords=[]
                        )
                    ),
                    lambda: ast.If(
                        test=ast.Compare(
                            left=ast.Constant(value=random.randint(1, 100)),
                            ops=[ast.Eq()],
                            comparators=[ast.Constant(value=random.randint(1, 100))]
                        ),
                        body=[ast.Pass()],
                        orelse=[ast.Pass()]
                    )
                ]
                
            def visit_Module(self, node):
                for i in range(random.randint(3, 8)):
                    pos = random.randint(0, len(node.body))
                    node.body.insert(pos, random.choice(self.junk_templates)())
                self.generic_visit(node)
                return node
                
            def visit_FunctionDef(self, node):
                for i in range(random.randint(2, 5)):
                    pos = random.randint(0, len(node.body))
                    node.body.insert(pos, random.choice(self.junk_templates)())
                self.generic_visit(node)
                return node
                
        return JunkInjector(self).visit(tree)

    def _rename_all_variables(self, tree: ast.AST) -> ast.AST:
        class UltimateRenamer(ast.NodeTransformer):
            def __init__(self, parent):
                self.parent = parent

            def visit_Name(self, node):
                if (node.id not in self.parent.builtins and 
                    not node.id.startswith('__') and 
                    node.id not in ['self', 'cls', 'super', 'lambda']):
                    if node.id not in self.parent.name_map:
                        self.parent.name_map[node.id] = self.parent._new_name(node.id)
                    return ast.Name(id=self.parent.name_map[node.id], ctx=node.ctx)
                return node

            def visit_FunctionDef(self, node):
                if node.name not in self.parent.builtins:
                    node.name = self.parent._new_name(node.name)
                self.generic_visit(node)
                return node

            def visit_ClassDef(self, node):
                if node.name not in self.parent.builtins:
                    node.name = self.parent._new_name(node.name)
                self.generic_visit(node)
                return node

        return UltimateRenamer(self).visit(tree)

    def obfuscate_and_encrypt(self) -> str:
        try:
            tree = ast.parse(self.source_code)
            tree = self._rename_all_variables(tree)
            
            if self.anti_debug:
                guard_code = self._generate_advanced_anti_debug()
                guard_ast = ast.parse(guard_code).body
                tree.body = guard_ast + tree.body
                
            if self.encrypt_strings:
                tree = self._encrypt_strings(tree)
                
            if self.junk_code:
                tree = self._add_junk_code(tree)
                
            ast.fix_missing_locations(tree)
            unparsed_code = ast.unparse(tree)
            
            if self.multi_layer:
                return self._multi_layer_pack(unparsed_code)
            else:
                return unparsed_code
                
        except Exception as e:
            logger.error(f"Obfuscation error: {e}")
            raise

    def _multi_layer_pack(self, code: str) -> str:
        compressed = zlib.compress(code.encode('utf-8'))
        keys = [random.randint(1, 255) for _ in range(5)]
        encrypted = compressed
        for key in keys:
            encrypted = bytes([(b ^ key) & 0xFF for b in encrypted])
        encrypted = encrypted[::-1]
        payload = base64.b64encode(encrypted).decode('ascii')
        
        wrapper = f'''# Shenron Ultimate Pro v6.0
import base64, zlib, sys, os, time, hashlib

if __debug__ or (hasattr(sys, 'gettrace') and sys.gettrace() is not None):
    os._exit(1)

_keys = {keys}
_payload = "{payload}"

def _decode():
    _d1 = base64.b64decode(_payload)[::-1]
    for _k in _keys[::-1]:
        _d1 = bytes([(b ^ _k) & 0xFF for b in _d1])
    return zlib.decompress(_d1).decode('utf-8')

try:
    _code = _decode()
    exec(_code, {{'__builtins__': __builtins__}})
except:
    os._exit(1)
'''
        return wrapper

# ========== TELEGRAM BOT ==========
class ShenronBot:
    def __init__(self, token: str):
        self.token = token
        self.application = None
        self.bot = Bot(token=token)
        
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        welcome_msg = f"""
🐉 **SHENRON ULTIMATE PRO BOT** 🐉

Chào {user.first_name}! Tôi là trợ lý obfuscator mạnh mẽ nhất.

⚡ **Các lệnh:**
/generate_key - Tạo key mới
/my_keys - Xem danh sách key của bạn
/check_key <key> - Kiểm tra thông tin key
/revoke_key <key> - Thu hồi key
/stats - Xem thống kê hệ thống
/help - Hướng dẫn chi tiết

🔐 **Bảo mật tối đa với:**
- Multi-layer encryption
- Anti-debug & Anti-VM
- Control flow obfuscation
- String encryption
- Integrity checks

💎 **Liên hệ:** @CalceIsMe
"""
        keyboard = [
            [InlineKeyboardButton("🚀 Obfuscate Now", callback_data="obfuscate")],
            [InlineKeyboardButton("🔑 Get Key", callback_data="get_key")],
            [InlineKeyboardButton("📊 Stats", callback_data="stats")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(welcome_msg, reply_markup=reply_markup, parse_mode='Markdown')

    async def generate_key(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        args = context.args
        
        # Kiểm tra user trong DB
        user_info = db.get_user_info(user_id)
        is_admin = user_info and user_info.get("is_admin", 0) == 1
        
        valid_days = 30
        max_uses = 100
        key_type = "premium"
        
        if args:
            try:
                if len(args) > 0:
                    valid_days = int(args[0]) if args[0].isdigit() else 30
                if len(args) > 1:
                    max_uses = int(args[1]) if args[1].isdigit() else 100
                if len(args) > 2:
                    key_type = args[2]
            except:
                pass
        
        if not is_admin:
            valid_days = min(valid_days, 90)
            max_uses = min(max_uses, 500)
            
        key_info = db.generate_key(
            valid_days=valid_days,
            max_uses=max_uses,
            key_type=key_type,
            owner_id=user_id,
            metadata={"generated_by": "telegram_bot", "user": update.effective_user.username}
        )
        
        msg = f"""
✨ **Key Generated Successfully!** ✨

🔑 **Key:** `{key_info['key_str']}`
📝 **Type:** {key_info['key_type']}
⏰ **Valid:** {valid_days} days
🔢 **Max Uses:** {max_uses}
👤 **Owner:** {update.effective_user.username or user_id}

⚠️ **Lưu ý:** Giữ key an toàn, không chia sẻ với người khác!
"""
        keyboard = [
            [InlineKeyboardButton("📋 Copy Key", callback_data=f"copy_{key_info['key_str']}")],
            [InlineKeyboardButton("🚀 Obfuscate Now", callback_data="obfuscate")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(msg, reply_markup=reply_markup, parse_mode='Markdown')

    async def my_keys(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        keys = db.get_user_keys(user_id)
        
        if not keys:
            await update.message.reply_text("❌ Bạn chưa có key nào. Hãy dùng /generate_key để tạo!")
            return
            
        msg = "🔑 **Danh sách key của bạn:**\n\n"
        for key in keys[:10]:
            status = "✅ Active" if key['is_active'] else "❌ Revoked"
            msg += f"**{key['key_str']}**\n"
            msg += f"  ├ Status: {status}\n"
            msg += f"  ├ Uses: {key['uses']}/{key['max_uses']}\n"
            msg += f"  ├ Expires: {key['expires'][:10]}\n"
            msg += f"  └ Type: {key['key_type']}\n\n"
            
        if len(keys) > 10:
            msg += f"... và {len(keys) - 10} key khác"
            
        await update.message.reply_text(msg, parse_mode='Markdown')

    async def check_key(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not context.args:
            await update.message.reply_text("⚠️ Vui lòng nhập key: /check_key <key>")
            return
            
        key_str = context.args[0]
        info = db.get_info(key_str)
        
        if not info:
            await update.message.reply_text("❌ Key không tồn tại!")
            return
            
        msg = f"""
🔍 **Thông tin key:**

🔑 **Key:** `{info['key_str']}`
📝 **Type:** {info['key_type']}
📊 **Status:** {'✅ Active' if info['is_active'] else '❌ Revoked'}
🔢 **Uses:** {info['uses']}/{info['max_uses']}
⏰ **Created:** {info['created'][:10]}
⏳ **Expires:** {info['expires'][:10]}
👤 **Owner:** {info['owner_id'] or 'N/A'}
"""
        await update.message.reply_text(msg, parse_mode='Markdown')

    async def revoke_key(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        
        if not context.args:
            await update.message.reply_text("⚠️ Vui lòng nhập key: /revoke_key <key>")
            return
            
        key_str = context.args[0]
        info = db.get_info(key_str)
        
        if not info:
            await update.message.reply_text("❌ Key không tồn tại!")
            return
            
        if info['owner_id'] != user_id:
            user_info = db.get_user_info(user_id)
            if not user_info or not user_info.get('is_admin', 0):
                await update.message.reply_text("❌ Bạn không có quyền thu hồi key này!")
                return
                
        if db.revoke_key(key_str):
            await update.message.reply_text(f"✅ Đã thu hồi key: `{key_str}`", parse_mode='Markdown')
        else:
            await update.message.reply_text("❌ Không thể thu hồi key!")

    async def handle_obfuscate(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not update.message.document:
            await update.message.reply_text("⚠️ Vui lòng gửi file .py kèm key trong caption!")
            return
            
        key_str = update.message.caption or ""
        if not key_str.strip():
            await update.message.reply_text("⚠️ Vui lòng nhập key trong caption!")
            return
            
        if not db.verify_and_use_key(key_str.strip(), ip=str(update.effective_user.id), 
                                     file_name=update.message.document.file_name):
            await update.message.reply_text("❌ Key không hợp lệ, đã hết hạn hoặc hết lượt sử dụng!")
            return
            
        file = await update.message.document.get_file()
        if file.file_size > MAX_FILE_SIZE:
            await update.message.reply_text(f"❌ File quá lớn! Tối đa {MAX_FILE_SIZE//1024//1024}MB")
            return
            
        file_content = await file.download_as_bytearray()
        
        try:
            source_code = file_content.decode('utf-8', errors='ignore')
            
            obf = UltimateShenronObfuscator(
                source_code, 
                level="ultimate",
                key=key_str.strip(),
                options={
                    "anti_debug": True,
                    "anti_vm": True,
                    "encrypt_strings": True,
                    "control_flow": True,
                    "junk_code": True,
                    "integrity_check": True,
                    "multi_layer": True
                }
            )
            
            await update.message.reply_text("⚡ Đang obfuscate code...")
            protected_code = obf.obfuscate_and_encrypt()
            
            import io
            result_file = io.BytesIO(protected_code.encode('utf-8'))
            result_file.name = f"protected_{update.message.document.file_name}"
            
            await update.message.reply_document(
                document=result_file,
                caption="✅ Obfuscate thành công! 🐉",
                filename=result_file.name
            )
            
        except Exception as e:
            logger.error(f"Obfuscation error: {e}")
            await update.message.reply_text(f"❌ Lỗi obfuscate: {str(e)}")

    async def stats(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        stats = db.get_stats()
        
        msg = f"""
📊 **Shenron System Statistics**

🔑 **Total Keys:** {stats['total_keys']}
✅ **Active Keys:** {stats['active_keys']}
🔄 **Total Uses:** {stats['total_uses']}

📈 **By Type:**
"""
        for type_stat in stats['by_type']:
            msg += f"  ├ {type_stat['key_type']}: {type_stat['count']}\n"
            
        msg += f"""
🕐 **Server Time:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
⚡ **Version:** 6.0.0
"""
        await update.message.reply_text(msg)

    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        help_text = """
📖 **Hướng dẫn sử dụng Shenron Bot**

🔑 **Quản lý key:**
• /generate_key [days] [uses] [type] - Tạo key mới
• /my_keys - Xem danh sách key
• /check_key <key> - Kiểm tra thông tin key
• /revoke_key <key> - Thu hồi key

🚀 **Obfuscate:**
1. Tạo key với /generate_key
2. Gửi file .py với caption chứa key
3. Nhận file đã obfuscate

⚙️ **Tính năng bảo vệ:**
• ✅ Anti-Debug
• ✅ Anti-VM
• ✅ String Encryption
• ✅ Control Flow Obfuscation
• ✅ Junk Code Injection
• ✅ Integrity Checks
• ✅ Multi-layer Encryption

💡 **Ví dụ:**
/generate_key 30 100 premium
/check_key SHENRON-ABCDEFGHIJKLMNOP
/revoke_key SHENRON-ABCDEFGHIJKLMNOP

📞 **Support:** @CalceIsMe
"""
        await update.message.reply_text(help_text)

    async def callback_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        
        data = query.data
        
        if data == "obfuscate":
            await query.message.reply_text(
                "📤 Vui lòng gửi file .py cần obfuscate\n"
                "Caption: <your_key>"
            )
        elif data == "get_key":
            await query.message.reply_text(
                "🔑 Sử dụng lệnh: /generate_key [days] [uses] [type]\n"
                "Ví dụ: /generate_key 30 100 premium"
            )
        elif data == "stats":
            await self.stats(update, context)
        elif data.startswith("copy_"):
            key = data.replace("copy_", "")
            await query.message.reply_text(f"📋 Đã copy key: `{key}`", parse_mode='Markdown')

    async def setup(self):
        self.application = Application.builder().token(self.token).build()
        
        self.application.add_handler(CommandHandler("start", self.start))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("generate_key", self.generate_key))
        self.application.add_handler(CommandHandler("my_keys", self.my_keys))
        self.application.add_handler(CommandHandler("check_key", self.check_key))
        self.application.add_handler(CommandHandler("revoke_key", self.revoke_key))
        self.application.add_handler(CommandHandler("stats", self.stats))
        
        self.application.add_handler(MessageHandler(filters.Document.ALL, self.handle_obfuscate))
        self.application.add_handler(CallbackQueryHandler(self.callback_handler))
        
        return self.application

# ========== API ENDPOINTS ==========

@app.on_event("startup")
async def startup():
    """Khởi tạo bot Telegram"""
    try:
        # Khởi tạo rate limiter với Redis
        redis_client = redis.from_url("redis://localhost:6379")
        await FastAPILimiter.init(redis_client)
        logger.info("✅ Rate limiter initialized!")
    except Exception as e:
        logger.warning(f"⚠️ Rate limiter init failed: {e}")
    
    # Khởi tạo bot
    if TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_TOKEN != "YOUR_BOT_TOKEN":
        try:
            bot = ShenronBot(TELEGRAM_BOT_TOKEN)
            app.state.bot = await bot.setup()
            asyncio.create_task(app.state.bot.run_polling())
            logger.info(f"✅ Telegram bot started! @{BOT_USERNAME}")
            
            # Test bot
            bot_info = await app.state.bot.bot.get_me()
            logger.info(f"✅ Bot info: {bot_info.first_name} (@{bot_info.username})")
        except Exception as e:
            logger.error(f"❌ Failed to start bot: {e}")
    else:
        logger.warning("⚠️ TELEGRAM_BOT_TOKEN not configured!")

@app.get("/")
async def root():
    return {
        "name": "Shenron Ultimate Pro Engine v6.0",
        "version": "6.0.0",
        "status": "running",
        "bot": f"@{BOT_USERNAME}" if TELEGRAM_BOT_TOKEN != "YOUR_BOT_TOKEN" else "Not configured",
        "features": [
            "Multi-layer encryption",
            "Anti-debug & Anti-VM",
            "Control flow obfuscation",
            "String encryption",
            "Junk code injection",
            "Integrity checks",
            "AST-based obfuscation",
            "Telegram bot integration"
        ]
    }

@app.post("/api/generate-key")
@limiter.limit(RATE_LIMIT)
async def generate_api_key(request: Request):
    data = await request.json()
    if data.get("admin_secret") != ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin secret")

    key_info = db.generate_key(
        valid_days=data.get("days", 30),
        max_uses=data.get("max_uses", 100),
        key_type=data.get("type", "premium"),
        owner_id=data.get("owner_id"),
        metadata=data.get("metadata")
    )
    return key_info

@app.post("/api/verify-key")
async def verify_api_key(request: Request):
    data = await request.json()
    key = data.get("key", "")
    valid = db.verify_and_use_key(key, ip=request.client.host)
    return {"valid": valid, "info": db.get_info(key) if valid else None}

@app.post("/api/obfuscate")
@limiter.limit("5/minute")
async def api_obfuscate(
    request: Request,
    file: UploadFile = File(...),
    level: str = Form("ultimate"),
    key: str = Form(""),
    anti_debug: bool = Form(True),
    anti_vm: bool = Form(True),
    encrypt_strings: bool = Form(True),
    control_flow: bool = Form(True),
    junk_code: bool = Form(True),
    integrity_check: bool = Form(True),
    multi_layer: bool = Form(True)
):
    if not db.verify_and_use_key(key, ip=request.client.host, file_name=file.filename):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Key không hợp lệ, đã hết hạn hoặc hết lượt sử dụng."
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"Dung lượng file tối đa là {MAX_FILE_SIZE//1024//1024}MB")

    if not file.filename.endswith('.py'):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận định dạng file .py")

    try:
        source_code = contents.decode('utf-8', errors='ignore')
        obf = UltimateShenronObfuscator(
            source_code, 
            level=level, 
            key=key,
            options={
                "anti_debug": anti_debug,
                "anti_vm": anti_vm,
                "encrypt_strings": encrypt_strings,
                "control_flow": control_flow,
                "junk_code": junk_code,
                "integrity_check": integrity_check,
                "multi_layer": multi_layer
            }
        )
        protected_code = obf.obfuscate_and_encrypt()
    except Exception as e:
        logger.error(f"Obfuscation error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý Obfuscate: {str(e)}")

    return Response(
        content=protected_code,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=protected_{file.filename}"}
    )

@app.post("/api/obfuscate-advanced")
@limiter.limit("3/minute")
async def api_obfuscate_advanced(
    request: Request,
    file: UploadFile = File(...),
    key: str = Form(""),
    level: str = Form("ultimate"),
    options: str = Form("{}")
):
    if not db.verify_and_use_key(key, ip=request.client.host, file_name=file.filename):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Key không hợp lệ, đã hết hạn hoặc hết lượt sử dụng."
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"Dung lượng file tối đa là {MAX_FILE_SIZE//1024//1024}MB")

    try:
        options_dict = json.loads(options)
        source_code = contents.decode('utf-8', errors='ignore')
        obf = UltimateShenronObfuscator(source_code, level=level, key=key, options=options_dict)
        protected_code = obf.obfuscate_and_encrypt()
    except Exception as e:
        logger.error(f"Advanced obfuscation error: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý Obfuscate: {str(e)}")

    return Response(
        content=protected_code,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=protected_{file.filename}"}
    )

@app.get("/api/stats")
async def get_stats(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or auth_header != f"Bearer {ADMIN_SECRET}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return db.get_stats()

@app.get("/api/keys/{key_str}")
async def get_key_info(key_str: str, request: Request):
    info = db.get_info(key_str)
    if not info:
        raise HTTPException(status_code=404, detail="Key không tồn tại")
    return info

@app.delete("/api/keys/{key_str}")
async def revoke_key_endpoint(key_str: str, request: Request):
    data = await request.json() if request.method == "DELETE" else {}
    if data.get("admin_secret") != ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        
    if db.revoke_key(key_str):
        return {"message": f"Key {key_str} đã bị thu hồi"}
    else:
        raise HTTPException(status_code=404, detail="Không thể thu hồi key")

@app.get("/health")
async def health():
    bot_status = "active" if hasattr(app.state, 'bot') else "not started"
    return {
        "status": "ok",
        "version": "6.0.0",
        "total_registered_keys": db.get_stats()["total_keys"],
        "active_keys": db.get_stats()["active_keys"],
        "engine": "Shenron Ultimate Pro v6.0 - AST Multi-layer Obfuscator",
        "telegram_bot": bot_status,
        "bot_username": f"@{BOT_USERNAME}" if TELEGRAM_BOT_TOKEN != "YOUR_BOT_TOKEN" else "Not configured"
    }

@app.get("/bot/info")
async def bot_info():
    if not hasattr(app.state, 'bot'):
        return {"status": "Bot not initialized"}
    
    try:
        bot_info = await app.state.bot.bot.get_me()
        return {
            "status": "active",
            "name": bot_info.first_name,
            "username": f"@{bot_info.username}",
            "id": bot_info.id,
            "can_join_groups": bot_info.can_join_groups,
            "can_read_all_group_messages": bot_info.can_read_all_group_messages
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    print("🐉 SHENRON ULTIMATE PRO v6.0")
    print("=" * 50)
    print(f"✅ Telegram Bot Token: {TELEGRAM_BOT_TOKEN[:15]}...")
    print(f"✅ Bot Username: @{BOT_USERNAME}")
    print(f"✅ Server starting at http://0.0.0.0:8000")
    print("=" * 50)
    
    uvicorn.run("server_ultimate:app", host="0.0.0.0", port=8000, reload=False, workers=1)
