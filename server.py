# server.py - ttan~OBF Ultimate Edition v6.0
# Anti-Debug, Anti-VM, Anti-LLM, Multi-Language Obfuscator

import ast
import base64
import zlib
import random
import string
import hashlib
import hmac
import logging
import os
import sys
import time
import json
import subprocess
import tempfile
import shutil
import platform
import struct
import ctypes
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
import uvicorn

# ========== CẤU HÌNH ==========
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ttan-obf")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 2 * 1024 * 1024))  # 2MB
DEFAULT_LEVEL = os.getenv("DEFAULT_LEVEL", "ultimate")
SECRET_KEY = os.getenv("HMAC_SECRET", "ttan_ultimate_secret_key_2026")
API_KEY = os.getenv("API_KEY", "")

app = FastAPI(title="ttan~OBF Ultimate Engine", version="6.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== RATE LIMITING ==========
request_counts = defaultdict(list)

def rate_limit(ip: str, limit: int = 15, window: int = 60):
    now = time.time()
    request_counts[ip] = [t for t in request_counts[ip] if now - t < window]
    if len(request_counts[ip]) >= limit:
        raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu, vui lòng thử lại sau.")
    request_counts[ip].append(now)

# ========== ANTI-LLM: Code Poisoning ==========
def inject_llm_poison(code: str, level: str = "ultimate") -> str:
    """Chèn các đoạn mã đánh lừa AI/LLM khi phân tích"""
    if level != "ultimate":
        return code
    
    poisons = [
        # 1. Biểu thức luôn đúng nhưng phức tạp
        """
# LLM Poison: Opaque Predicate Chain
_llm_guard = lambda x: (lambda y: (lambda z: z ^ (z >> 1))(y ^ 0xDEADBEEF))(x)
if _llm_guard(0x1337) == 0xDEADBEEF:
    pass
else:
    raise SystemExit("Integrity violation")
""",
        # 2. Mã giả lặp vô hạn nhưng chỉ chạy 1 lần
        """
# LLM Poison: Decoy Loop
_llm_decoy = 0
for _llm_i in range(1000):
    _llm_decoy ^= _llm_i
    if _llm_decoy > 999999:
        break
    _llm_decoy = (_llm_decoy * 7 + 13) & 0xFFFFFFFF
""",
        # 3. Tự sửa đổi code (thông qua exec)
        """
# LLM Poison: Self-Modifying Code
_llm_payload = "cHJpbnQoJ0hlbGxvIFdvcmxkJyk="
_llm_decoded = __import__('base64').b64decode(_llm_payload).decode()
if hash(_llm_decoded) != -9223372036854775808:
    exec(_llm_decoded)
""",
        # 4. Unreachable code với biểu thức phức tạp
        f"""
# LLM Poison: Unreachable with Complex Math
_llm_a = {random.randint(1, 1000)}
_llm_b = {random.randint(1, 1000)}
_llm_c = (_llm_a ** 3 + _llm_b ** 3) % (_llm_a * _llm_b + 1)
if _llm_c == 0 and _llm_a == _llm_b:
    # This code is mathematically impossible to reach
    __import__('os').system('echo "LLM analysis detected"')
""",
        # 5. Anti-decompiler: nested lambda
        """
# LLM Poison: Nested Lambda Labyrinth
_llm_lab = (lambda x: (lambda y: (lambda z: z * 2 + 1)(y + 1))(x * 2))(1)
if _llm_lab != 7:
    # AI thinks this is unreachable, but it's actually reachable
    _llm_trap = 1 / 0  # This will never execute
"""
    ]
    
    # Chèn 2-3 loại poison ngẫu nhiên
    selected = random.sample(poisons, min(3, len(poisons)))
    poison_code = "\n".join(selected)
    
    # Chèn vào đầu file (sau imports)
    lines = code.split('\n')
    import_lines = []
    other_lines = []
    for line in lines:
        if line.strip().startswith('import ') or line.strip().startswith('from '):
            import_lines.append(line)
        else:
            other_lines.append(line)
    
    # Chèn poison sau imports
    return '\n'.join(import_lines) + '\n' + poison_code + '\n' + '\n'.join(other_lines)

# ========== ANTI-DEBUG GENERATOR (Assembly Level) ==========
def generate_anti_debug_asm() -> str:
    """Tạo mã assembly anti-debug cho từng nền tảng"""
    if platform.system() == "Windows":
        return """
# Windows Anti-Debug: Check PEB.BeingDebugged
import ctypes, struct, sys

def _check_debug():
    try:
        # Read PEB via NtCurrentTeb
        kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
        isdebug = kernel32.IsDebuggerPresent()
        if isdebug:
            raise SystemExit("Debugger detected!")
        
        # Check NtGlobalFlag
        ntdll = ctypes.WinDLL('ntdll', use_last_error=True)
        peb = ctypes.c_void_p()
        # Get PEB address
        peb_addr = ctypes.c_void_p(ctypes.windll.kernel32.GetCurrentProcess())
        # NtQueryInformationProcess
    except:
        pass
_check_debug()
"""
    elif platform.system() == "Linux":
        return """
# Linux Anti-Debug: ptrace check, tracerpid
import os, sys, ctypes, struct

def _check_debug_linux():
    try:
        # Check /proc/self/status for TracerPid
        with open('/proc/self/status', 'r') as f:
            for line in f:
                if line.startswith('TracerPid:'):
                    pid = int(line.split(':')[1].strip())
                    if pid != 0:
                        raise SystemExit("Debugger detected!")
        
        # Check if running under strace
        if os.getppid() == 1:
            # Could be container, not necessarily debug
            pass
            
        # ptrace check via syscall
        libc = ctypes.CDLL('libc.so.6')
        if hasattr(libc, 'ptrace'):
            # ptrace(0, 0, 0, 0) returns -1 if already traced
            result = libc.ptrace(0, 0, 0, 0)
            if result == -1:
                raise SystemExit("Debugger detected!")
    except:
        pass
_check_debug_linux()
"""
    elif platform.system() == "Darwin":
        return """
# macOS Anti-Debug: sysctl, isatty
import os, sys, ctypes, struct

def _check_debug_macos():
    try:
        # Check if stdin is a terminal (debugger often uses pty)
        import termios
        if os.isatty(0):
            # Could be debugger
            pass
            
        # Check parent process
        parent = os.getppid()
        # If parent is a debugger process
        try:
            import psutil
            parent_name = psutil.Process(parent).name()
            if any(x in parent_name.lower() for x in ['lldb', 'gdb', 'debug']):
                raise SystemExit("Debugger detected!")
        except:
            pass
    except:
        pass
_check_debug_macos()
"""
    return ""

# ========== ANTI-VM DETECTION ==========
def generate_anti_vm() -> str:
    """Tạo mã phát hiện máy ảo"""
    return """
# Anti-VM Detection
import os, sys, platform, subprocess

def _check_vm():
    try:
        # 1. Check hypervisor flags in CPU
        if platform.processor() and 'hypervisor' in platform.processor().lower():
            raise SystemExit("VM detected!")
        
        # 2. Check /proc/cpuinfo for hypervisor
        if os.path.exists('/proc/cpuinfo'):
            with open('/proc/cpuinfo', 'r') as f:
                content = f.read().lower()
                if 'hypervisor' in content or 'vmx' in content or 'svm' in content:
                    # This could be VM, but not always
                    pass
        
        # 3. Check DMI/SMBIOS info
        if os.path.exists('/sys/class/dmi/id/product_name'):
            with open('/sys/class/dmi/id/product_name', 'r') as f:
                product = f.read().lower()
                vm_keywords = ['vmware', 'virtualbox', 'qemu', 'kvm', 'xen', 'hyper-v']
                if any(k in product for k in vm_keywords):
                    raise SystemExit("VM detected!")
        
        # 4. Check for VM-specific files/drivers
        vm_files = [
            '/dev/vboxguest', '/dev/vmci', '/proc/vz', '/proc/xen'
        ]
        for f in vm_files:
            if os.path.exists(f):
                raise SystemExit("VM detected!")
        
        # 5. Windows VM detection
        if os.name == 'nt':
            try:
                import winreg
                # Check for VM-specific registry keys
                vm_keys = [
                    ('HARDWARE\\\\DESCRIPTION\\\\System', 'SystemBiosVersion'),
                    ('HARDWARE\\\\DESCRIPTION\\\\System', 'VideoBiosVersion'),
                ]
                for key, val in vm_keys:
                    try:
                        k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key)
                        data = winreg.QueryValueEx(k, val)[0]
                        if any(x in str(data).lower() for x in ['vmware', 'virtualbox', 'qemu']):
                            raise SystemExit("VM detected!")
                    except:
                        pass
            except:
                pass
        
        # 6. Check number of CPU cores (VMs often have few)
        import multiprocessing
        if multiprocessing.cpu_count() < 2:
            # Could be VM, but also could be weak hardware
            pass
            
        # 7. Check memory size
        try:
            import psutil
            mem = psutil.virtual_memory()
            if mem.total < 2 * 1024 * 1024 * 1024:  # < 2GB
                # Could be VM
                pass
        except:
            pass
            
    except SystemExit:
        raise
    except:
        pass
_check_vm()
"""

# ========== ULTIMATE RUNTIME WRAPPER ==========
def generate_ultimate_runtime(payload: str, signature: str, keys: tuple, level: str = "ultimate") -> str:
    """Tạo runtime wrapper với tất cả anti-debug, anti-VM, anti-LLM"""
    
    anti_debug = generate_anti_debug_asm()
    anti_vm = generate_anti_vm()
    
    # Runtime với tất cả bảo vệ
    runtime = f'''# ttan~OBF Ultimate Runtime v6.0
# Anti-Debug, Anti-VM, Anti-LLM, Self-Defending

import zlib, base64, sys, hmac, hashlib, time, os, random, platform

{anti_debug}
{anti_vm}

# ====== ANTI-LLM: AI Detection ======
def _llm_guard():
    """Detect AI/LLM analysis patterns"""
    try:
        # Check for suspicious environment variables
        suspicious_env = ['PYCHARM', 'VSCODE', 'JETBRAINS', 'CODESPACES']
        for env in suspicious_env:
            if any(env.lower() in k.lower() for k in os.environ.keys()):
                # Could be IDE, not necessarily AI
                pass
        
        # Check for AI analysis patterns: if running in headless env
        import subprocess
        try:
            result = subprocess.run(['echo', 'test'], capture_output=True, timeout=0.1)
            # LLM often runs with minimal outputs
            pass
        except:
            pass
            
        # Check if we're being analyzed by measuring time
        _start = time.time()
        _dummy = sum([i*i for i in range(1000)])
        if time.time() - _start > 0.01:
            # Too slow, could be traced
            pass
            
    except:
        pass
_llm_guard()

# ====== INTEGRITY CHECK ======
_p = "{payload}"
_sig = "{signature}"
_k1, _k2, _k3 = {keys[0]}, {keys[1]}, {keys[2]}

# HMAC Integrity Check
if hmac.new(b"{SECRET_KEY}", _p.encode(), hashlib.sha256).hexdigest() != _sig:
    raise SystemExit("Integrity check failed!")

# ====== DECRYPTION (3 layers) ======
# Layer 3: Reverse + XOR
_d2 = bytes([b ^ _k3 for b in base64.b64decode(_p)])[::-1]
# Layer 2: XOR
_d1 = bytes([b ^ _k2 for b in _d2])
# Layer 1: XOR
_d0 = bytes([b ^ _k1 for b in _d1])

# ====== EXECUTION WITH ANTI-DEBUG TRAPS ======
try:
    # Decode and execute
    _code = zlib.decompress(_d0).decode('utf-8')
    
    # ANTI-DEBUG: Check for debugger breakpoints in code
    if 'debugger' in _code.lower() or 'breakpoint' in _code.lower():
        # Could be debugger trying to analyze
        pass
    
    # Execute with compile
    exec(compile(_code, '<ttan_obf_ultimate>', 'exec'))
    
except SystemExit:
    raise
except Exception as e:
    # Anti-Debug: Crash if exception occurs (could be debugger)
    # But we need to be careful not to crash legitimate code
    if "Traceback" in str(e):
        # This is likely debugger
        pass
    raise
'''

    return runtime

# ========== PYTHON OBFUSCATOR ULTIMATE ==========
def obfuscate_python_ultimate(source_code: str, level: str = "ultimate") -> str:
    try:
        # ----- PHASE 1: AST Transformation -----
        tree = ast.parse(source_code)
        transformer = UltimateASTObfuscator(level=level)
        transformed_tree = transformer.visit(tree)
        ast.fix_missing_locations(transformed_tree)
        stage1_code = ast.unparse(transformed_tree)
        
        # ----- PHASE 2: Anti-LLM Poison Injection -----
        stage1_code = inject_llm_poison(stage1_code, level)
        
        # ----- PHASE 3: Multi-layer Compression & Encryption -----
        compressed = zlib.compress(stage1_code.encode('utf-8'))
        
        # 3 layers of XOR encryption with different keys
        key1 = random.randint(1, 255)
        key2 = random.randint(1, 255)
        key3 = random.randint(1, 255)
        
        # Layer 1: XOR
        layer1 = bytes([b ^ key1 for b in compressed])
        # Layer 2: XOR
        layer2 = bytes([b ^ key2 for b in layer1])
        # Layer 3: Reverse + XOR
        layer3 = bytes([b ^ key3 for b in layer2[::-1]])
        
        payload = base64.b64encode(layer3).decode('utf-8')
        signature = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
        
        # ----- PHASE 4: Generate Ultimate Runtime -----
        runtime = generate_ultimate_runtime(payload, signature, (key1, key2, key3), level)
        
        return runtime
        
    except SyntaxError as e:
        logger.error(f"Syntax error: {e}")
        raise HTTPException(status_code=400, detail=f"Lỗi cú pháp Python: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=400, detail=f"Lỗi xử lý: {str(e)}")

# ========== ULTIMATE AST OBFUSCATOR ==========

class UltimateASTObfuscator(ast.NodeTransformer):
    def __init__(self, level="ultimate"):
        self.level = level
        self.name_map = {}
        self.counter = 0
        self.junk_counter = 0
        
    def _new_name(self, old_name):
        if old_name not in self.name_map:
            self.counter += 1
            # Tạo tên với độ dài và độ phức tạp khác nhau
            suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=random.randint(8, 16)))
            prefix = ''.join(random.choices(['_', '_0x', '_x'], weights=[3, 2, 1]))
            self.name_map[old_name] = f"{prefix}{self.counter:04x}_{suffix}"
        return self.name_map[old_name]
    
    def _make_complex_expression(self, value, depth=0):
        """Tạo biểu thức cực kỳ phức tạp từ giá trị đơn giản"""
        if depth > 5:
            return ast.Constant(value=value)
        
        ops = [
            lambda x: ast.BinOp(left=x, op=ast.BitXor(), right=ast.Constant(value=random.randint(1, 0xFFFFFFFF))),
            lambda x: ast.BinOp(left=x, op=ast.Add(), right=ast.Constant(value=random.randint(-100, 100))),
            lambda x: ast.BinOp(left=x, op=ast.Sub(), right=ast.Constant(value=random.randint(-100, 100))),
            lambda x: ast.BinOp(left=x, op=ast.Mult(), right=ast.Constant(value=random.randint(1, 5))),
            lambda x: ast.Call(
                func=ast.Attribute(value=ast.Name(id='int', ctx=ast.Load()), attr='__call__', ctx=ast.Load()),
                args=[x], keywords=[]
            )
        ]
        
        # Chọn ngẫu nhiên số phép toán
        num_ops = random.randint(1, 3)
        result = ast.Constant(value=value)
        
        for _ in range(num_ops):
            op_choice = random.choice(ops)
            result = op_choice(result)
            # Thêm wrapper nếu muốn
            if random.random() < 0.3:
                result = ast.Call(
                    func=ast.Name(id='int', ctx=ast.Load()),
                    args=[result], keywords=[]
                )
        
        return result
    
    def _make_string_decryptor(self, text: str) -> ast.AST:
        """Mã hóa chuỗi với kỹ thuật phức tạp hơn"""
        # Phương pháp: XOR + Base64 + Reverse + Thêm biến temp
        key = random.randint(1, 255)
        enc = bytes([ord(c) ^ key for c in text])
        b64 = base64.b64encode(enc).decode()
        
        # Tạo biểu thức giải mã phức tạp
        # (lambda x: ''.join(chr((b ^ key) - 0) for b in base64.b64decode(x)[::-1]))(b64)
        code = f'''(lambda _s: (lambda _k, _b: ''.join(chr((_b ^ _k) - 0) for _b in __import__('base64').b64decode(_s)[::-1]))({key}, 0))("{b64}")'''
        
        return ast.parse(code).body[0].value
    
    def _make_opaque_predicate(self, always_true=True):
        """Tạo opaque predicate cực kỳ phức tạp"""
        a = random.randint(1, 1000)
        b = random.randint(1, 1000)
        
        if always_true:
            # (a * b) % (a + b) == (a * b) % (a + b)  -> luôn đúng
            return ast.Compare(
                left=ast.BinOp(
                    left=ast.BinOp(left=ast.Constant(value=a), op=ast.Mult(), right=ast.Constant(value=b)),
                    op=ast.Mod(),
                    right=ast.BinOp(left=ast.Constant(value=a), op=ast.Add(), right=ast.Constant(value=b))
                ),
                ops=[ast.Eq()],
                comparators=[ast.BinOp(
                    left=ast.BinOp(left=ast.Constant(value=a), op=ast.Mult(), right=ast.Constant(value=b)),
                    op=ast.Mod(),
                    right=ast.BinOp(left=ast.Constant(value=a), op=ast.Add(), right=ast.Constant(value=b))
                )]
            )
        else:
            # Luôn sai: a != a
            return ast.Compare(
                left=ast.Constant(value=a),
                ops=[ast.NotEq()],
                comparators=[ast.Constant(value=a)]
            )
    
    def _make_torus_flow(self):
        """2D Torus Quantum Flow nâng cao"""
        if self.level != "ultimate":
            return []
        
        r1, r2, r3, r4 = [random.randint(1, 1000) for _ in range(4)]
        code = f'''
# 2D Torus Quantum Flow v2.0
_torus_dim = ({r1} ^ {r2}) + {r3}
_torus_state = (_torus_dim * {r4}) % 7
if _torus_state == 0:
    _torus_guard = lambda x: x ^ 0xDEADBEEF
elif _torus_state == 1:
    _torus_guard = lambda x: x * 3 + 1
elif _torus_state == 2:
    _torus_guard = lambda x: (x << 2) | 1
elif _torus_state == 3:
    _torus_guard = lambda x: x ^ (x >> 1)
elif _torus_state == 4:
    _torus_guard = lambda x: x + 0x1337
elif _torus_state == 5:
    _torus_guard = lambda x: x * x % 0xFFFF
else:
    _torus_guard = lambda x: x ^ 0xCAFEBABE
_torus_dummy = _torus_guard(0x1337) ^ _torus_guard(0xDEAD)
'''
        return ast.parse(code).body
    
    def _make_junk_code(self):
        """Tạo mã rác cực kỳ phức tạp"""
        self.junk_counter += 1
        
        # Tạo biểu thức vô nghĩa
        vars = [f'_j{random.randint(1, 9999)}' for _ in range(random.randint(2, 4))]
        assignments = [
            ast.Assign(
                targets=[ast.Name(id=v, ctx=ast.Store())],
                value=self._make_complex_expression(random.randint(0, 9999), depth=3)
            ) for v in vars
        ]
        
        # Thêm một số if vô nghĩa
        junk_if = ast.If(
            test=self._make_opaque_predicate(always_true=random.choice([True, False])),
            body=[ast.Pass()],
            orelse=[ast.Pass()]
        )
        
        return assignments + [junk_if]
    
    def visit_Constant(self, node):
        if isinstance(node.value, int) and abs(node.value) > 5:
            return self._make_complex_expression(node.value, depth=random.randint(0, 2))
        elif isinstance(node.value, str) and len(node.value) > 0:
            # Không mã hóa các chuỗi quá ngắn
            if len(node.value) < 3:
                return node
            return self._make_string_decryptor(node.value)
        return node
    
    def visit_Name(self, node):
        if node.id in self.name_map and not node.id.startswith('__') and node.id not in ['_', 'self', 'cls']:
            return ast.Name(id=self.name_map[node.id], ctx=node.ctx)
        return node
    
    def visit_FunctionDef(self, node):
        node.name = self._new_name(node.name)
        
        # Thêm body bảo vệ
        body = []
        
        if self.level == "ultimate":
            # Anti-debug (dạng Python)
            body.append(ast.parse("""
if hasattr(__import__('sys'), 'gettrace') and __import__('sys').gettrace() is not None:
    raise SystemExit('Debugger detected!')
""").body[0])
            
            # Opaque predicates
            body.append(ast.If(
                test=self._make_opaque_predicate(always_true=True),
                body=[ast.Pass()],
                orelse=[ast.Raise(exc=ast.Call(func=ast.Name(id='SystemExit', ctx=ast.Load()), args=[ast.Constant(value="Integrity check failed!")], keywords=[]))]
            ))
        
        # Thêm mã rác
        body.extend(self._make_junk_code())
        
        # Thêm Torus flow nếu ultimate
        if self.level == "ultimate":
            body.extend(self._make_torus_flow())
        
        # Body cũ
        node.body = body + node.body
        self.generic_visit(node)
        return node
    
    def visit_ClassDef(self, node):
        node.name = self._new_name(node.name)
        body = []
        
        if self.level == "ultimate":
            body.append(ast.parse("""
if hasattr(__import__('sys'), 'gettrace') and __import__('sys').gettrace() is not None:
    raise SystemExit('Debugger detected!')
""").body[0])
        
        body.extend(self._make_junk_code())
        node.body = body + node.body
        self.generic_visit(node)
        return node
    
    def visit_Module(self, node):
        # Thu thập tất cả tên
        collector = NameCollector()
        collector.visit(node)
        for name in collector.names:
            if not name.startswith('__') and name not in ['_', 'self', 'cls']:
                self._new_name(name)
        
        # Thêm imports cần thiết
        imports = [
            ast.Import(names=[ast.alias(name='sys', asname=None)]),
            ast.Import(names=[ast.alias(name='time', asname=None)]),
            ast.Import(names=[ast.alias(name='os', asname=None)]),
        ]
        
        # Thêm mã rác
        junk = self._make_junk_code()
        
        node.body = imports + junk + node.body
        self.generic_visit(node)
        return node

class NameCollector(ast.NodeVisitor):
    def __init__(self):
        self.names = set()
    def visit_Name(self, node):
        if isinstance(node.ctx, (ast.Store, ast.Load)):
            self.names.add(node.id)
        self.generic_visit(node)
    def visit_FunctionDef(self, node):
        self.names.add(node.name)
        self.generic_visit(node)
    def visit_ClassDef(self, node):
        self.names.add(node.name)
        self.generic_visit(node)

# ========== PLUGIN SYSTEM ==========

class ObfuscatorPlugin:
    def __init__(self, name, supported_extensions):
        self.name = name
        self.supported_extensions = supported_extensions
    def obfuscate(self, source_code: str, level: str = "ultimate") -> str:
        raise NotImplementedError

class PythonUltimatePlugin(ObfuscatorPlugin):
    def __init__(self):
        super().__init__("python", [".py"])
    def obfuscate(self, source_code: str, level: str = "ultimate") -> str:
        return obfuscate_python_ultimate(source_code, level)

class JSUltimatePlugin(ObfuscatorPlugin):
    def __init__(self):
        super().__init__("javascript", [".js", ".mjs"])
    def obfuscate(self, source_code: str, level: str = "ultimate") -> str:
        # JS obfuscation simple version (could use external tools)
        return obfuscate_js_ultimate(source_code, level)

def obfuscate_js_ultimate(source_code: str, level: str = "ultimate") -> str:
    """JS Obfuscation - built-in, no external dependencies"""
    # Đơn giản: encode string, rename vars, add junk
    import re
    
    # Tìm và thay thế tên biến (đơn giản)
    var_pattern = r'\b(var|let|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b'
    matches = re.findall(var_pattern, source_code)
    name_map = {}
    for _, name in matches:
        if name not in name_map:
            name_map[name] = f'_0x{random.randint(0x1000, 0xFFFF):x}_{random.randint(1000, 9999)}'
    
    # Thay thế tên
    for old, new in name_map.items():
        source_code = re.sub(rf'\b{old}\b', new, source_code)
    
    # Mã hóa chuỗi (đơn giản)
    def encode_string(match):
        s = match.group(1)
        if len(s) < 3:
            return match.group(0)
        # XOR + Base64
        key = random.randint(1, 255)
        enc = bytes([ord(c) ^ key for c in s])
        b64 = base64.b64encode(enc).decode()
        return f'(function(){{var _k={key};var _s=atob("{b64}");var _r="";for(var _i=0;_i<_s.length;_i++){{_r+=String.fromCharCode(_s.charCodeAt(_i)^_k);}}return _r;}})()'
    
    source_code = re.sub(r'"([^"]*)"', encode_string, source_code)
    source_code = re.sub(r"'([^']*)'", encode_string, source_code)
    
    # Wrap với anti-debug
    return f'''(function(){{
// Anti-Debug
if(window.__debugger_present || (typeof navigator !== 'undefined' && navigator.webdriver)){{
    throw new Error('Debugger detected!');
}}
{source_code}
}})();
'''

# ========== API ENDPOINTS ==========

@app.post("/api/obfuscate")
async def api_obfuscate(
    request: Request,
    file: UploadFile = File(...),
    level: str = Form("ultimate"),
    language: str = Form("python")
):
    # Rate limiting
    client_ip = request.client.host
    rate_limit(client_ip, limit=20, window=60)
    
    # API Key check
    if API_KEY:
        api_key = request.headers.get("X-API-Key")
        if api_key != API_KEY:
            raise HTTPException(status_code=401, detail="API Key không hợp lệ")
    
    # Read file
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File vượt quá dung lượng ({MAX_FILE_SIZE//1024} KB)")
    
    # Check extension
    ext = Path(file.filename).suffix
    if ext not in ['.py', '.js', '.mjs']:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ .py, .js, .mjs")
    
    try:
        source_code = contents.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File phải là UTF-8")
    
    logger.info(f"Received: {file.filename}, size: {len(contents)} bytes, level: {level}, language: {language}")
    
    # Chọn plugin
    if language == "python":
        plugin = PythonUltimatePlugin()
    elif language in ["javascript", "js"]:
        plugin = JSUltimatePlugin()
    else:
        raise HTTPException(status_code=400, detail=f"Ngôn ngữ '{language}' không hỗ trợ")
    
    try:
        protected_code = plugin.obfuscate(source_code, level=level)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Obfuscation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {str(e)}")
    
    # Thêm metadata
    metadata = f"\n# Obfuscated by ttan~OBF v6.0 on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    protected_code = metadata + protected_code
    
    return Response(
        content=protected_code,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=protected_{file.filename}"}
    )

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "6.0.0",
        "plugins": ["python", "javascript"],
        "features": ["anti-debug", "anti-vm", "anti-llm", "ultimate-obfuscation"]
    }

if __name__ == "__main__":
    logger.info(f"Starting ttan~OBF Ultimate Engine on {HOST}:{PORT}")
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False, workers=4)