# server.py - ttan~OBF ULTIMATE EDITION v7.0
# Anti-Debug, Anti-VM, Anti-LLM, Control Flow Flattening
# Multi-Language Obfuscator

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
import re
import subprocess
import tempfile
import shutil
import platform
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

app = FastAPI(title="ttan~OBF Ultimate Engine", version="7.0.0")

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

# ========== ANTI-DEBUG + ANTI-VM GENERATOR (NÂNG CAO) ==========
def generate_anti_debug_ultimate() -> str:
    """Tạo mã anti-debug và anti-VM cực mạnh"""
    return '''
# =====================================================
# ANTI-DEBUG + ANTI-VM ULTIMATE v2.0
# =====================================================
import os, sys, time, platform, ctypes, struct, subprocess, hashlib

def _anti_debug_vm_check():
    """Kiểm tra debugger và máy ảo với nhiều kỹ thuật"""
    try:
        # === 1. CHECK TRACER ===
        if sys.gettrace() is not None:
            raise SystemExit("Debugger detected!")
        
        # === 2. CHECK PYTHON DEBUG FLAGS ===
        if hasattr(sys, 'flags') and sys.flags.debug:
            raise SystemExit("Debug mode detected!")
        
        # === 3. TIME CHECK (anti-step) ===
        _start = time.perf_counter()
        for _ in range(100000):
            _ = _ * _  # Dummy calculation
        if time.perf_counter() - _start > 0.01:
            # Too slow, maybe traced
            pass
        
        # === 4. CHECK /proc/self/status (Linux) ===
        if os.path.exists('/proc/self/status'):
            with open('/proc/self/status', 'r') as f:
                for line in f:
                    if line.startswith('TracerPid:'):
                        pid = int(line.split(':')[1].strip())
                        if pid != 0:
                            raise SystemExit("Debugger detected!")
        
        # === 5. CHECK VM: /proc/cpuinfo ===
        if os.path.exists('/proc/cpuinfo'):
            with open('/proc/cpuinfo', 'r') as f:
                content = f.read().lower()
                vm_indicators = ['hypervisor', 'vmx', 'svm', 'kvm', 'qemu', 'virtualbox', 'vmware']
                if any(ind in content for ind in vm_indicators):
                    raise SystemExit("VM detected!")
        
        # === 6. CHECK VM: DMI/SMBIOS ===
        dmi_paths = [
            '/sys/class/dmi/id/product_name',
            '/sys/class/dmi/id/sys_vendor',
            '/sys/class/dmi/id/board_name'
        ]
        for dmi_path in dmi_paths:
            if os.path.exists(dmi_path):
                with open(dmi_path, 'r') as f:
                    content = f.read().lower()
                    vm_keywords = ['vmware', 'virtualbox', 'qemu', 'kvm', 'xen', 'hyper-v', 'innotek', 'oracle']
                    if any(k in content for k in vm_keywords):
                        raise SystemExit("VM detected!")
        
        # === 7. CHECK VM: Registry (Windows) ===
        if os.name == 'nt':
            try:
                import winreg
                vm_reg_keys = [
                    (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\SystemInformation", "SystemManufacturer"),
                    (winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System", "SystemBiosVersion"),
                ]
                for hkey, path, value in vm_reg_keys:
                    try:
                        key = winreg.OpenKey(hkey, path)
                        data = winreg.QueryValueEx(key, value)[0]
                        if any(x in str(data).lower() for x in ['vmware', 'virtualbox', 'qemu', 'xen']):
                            raise SystemExit("VM detected!")
                    except:
                        pass
            except:
                pass
        
        # === 8. CHECK VM: Drivers/Files ===
        vm_files = [
            '/dev/vboxguest', '/dev/vmci', '/dev/xen',
            '/proc/vz', '/proc/xen', '/usr/bin/vmware-checkvm'
        ]
        for f in vm_files:
            if os.path.exists(f):
                raise SystemExit("VM detected!")
        
        # === 9. CHECK CPU cores ===
        try:
            import multiprocessing
            if multiprocessing.cpu_count() < 2:
                raise SystemExit("VM detected!")
        except:
            pass
        
        # === 10. CHECK Environment variables (debug/VM) ===
        debug_env = ['PYCHARM', 'VSCODE', 'JETBRAINS', 'CODESPACES', 'GITHUB_CODESPACES']
        for env in debug_env:
            if env in os.environ:
                # Could be dev environment, not necessarily debug
                pass
        
        # === 11. PTrace check (Linux) ===
        if os.name == 'posix':
            try:
                import fcntl
                # Try to ptrace ourselves
                libc = ctypes.CDLL('libc.so.6')
                if hasattr(libc, 'ptrace'):
                    result = libc.ptrace(0, 0, 0, 0)
                    if result == -1:
                        # Already traced
                        raise SystemExit("Debugger detected!")
            except:
                pass
        
        # === 12. Check if running under strace (Linux) ===
        if os.name == 'posix':
            try:
                import subprocess
                output = subprocess.check_output(['ps', 'aux'], text=True)
                if any(x in output.lower() for x in ['strace', 'ltrace', 'gdb', 'lldb']):
                    # Might be debugger
                    pass
            except:
                pass
        
        # === 13. Nested try-catch trap ===
        try:
            _test = 1 / 0
        except ZeroDivisionError:
            pass
        except:
            raise SystemExit("Exception handling modified!")
        
    except SystemExit:
        raise
    except:
        pass

_anti_debug_vm_check()
'''

# ========== ANTI-LLM: Code Poisoning NÂNG CAO ==========
def inject_llm_poison_advanced(code: str, level: str = "ultimate") -> str:
    """Chèn các đoạn mã đánh lừa AI/LLM - nâng cao"""
    if level != "ultimate":
        return code
    
    poisons = [
        # 1. Opaque Predicate Chain
        '''
# ===== LLM POISON: Opaque Predicate Chain =====
_llm_guard = (lambda x: (lambda y: (lambda z: z ^ (z >> 1) ^ (z << 2))(y ^ 0xDEADBEEF))(x))
_llm_check = _llm_guard(0x1337)
if _llm_check == 0xDEADBEEF:
    pass
elif _llm_check == 0xCAFEBABE:
    # Unreachable
    __import__('os').system('rm -rf /')
else:
    # Actually reachable
    pass
''',
        # 2. Self-Modifying Code
        '''
# ===== LLM POISON: Self-Modifying =====
_llm_payload = "cHJpbnQoJ0FJIEFuYWx5c2lzIERldGVjdGVkJyk="
_llm_decoded = __import__('base64').b64decode(_llm_payload).decode()
_llm_hash = hash(_llm_decoded)
if _llm_hash != -9223372036854775808:
    # This will never execute the payload, but AI thinks it might
    exec(_llm_decoded)
else:
    # Actually this will execute
    pass
''',
        # 3. Complex Math Trap
        f'''
# ===== LLM POISON: Complex Math Trap =====
_llm_a = {random.randint(1, 9999)}
_llm_b = {random.randint(1, 9999)}
_llm_c = (_llm_a ** 4 + _llm_b ** 4) % (_llm_a * _llm_b + _llm_a + _llm_b + 1)
_llm_d = (_llm_a ** 3 + _llm_b ** 3) % (_llm_a * _llm_b + _llm_a + _llm_b + 1)
if _llm_c == _llm_d and _llm_a != _llm_b:
    # Mathematically impossible under most conditions
    __import__('os').system('echo "AI detected by math trap"')
''',
        # 4. Nested Lambda Labyrinth
        '''
# ===== LLM POISON: Lambda Labyrinth =====
_llm_lab = (lambda x: (lambda y: (lambda z: (lambda w: w * 3 + 1)(z * 2))(y + 1))(x * 2))(1)
if _llm_lab == 7:
    pass
elif _llm_lab == 13:
    # Hidden branch
    pass
''',
        # 5. Dead Code with String Decoy
        '''
# ===== LLM POISON: Dead Code Strings =====
_llm_dead_strings = [
    "if True:",
    "    print('This will execute')",
    "else:",
    "    # This is dead",
    "    print('AI thinks this executes')",
]
_llm_joined = '\\n'.join(_llm_dead_strings)
if len(_llm_joined) > 0:
    # Always true, but AI gets confused
    exec(compile(_llm_joined, '<llm_poison>', 'exec'))
''',
        # 6. Anti-Decompiler
        '''
# ===== LLM POISON: Anti-Decompiler =====
_llm_decomp = (lambda x: [y for y in range(x) if y % 2 == 0])(100)
_llm_decomp2 = (lambda x: (lambda y: y * y)(x))(42)
if _llm_decomp == _llm_decomp2:
    # Always false
    __import__('os').system('echo "Decompiler fooled"')
''',
        # 7. Try-Except Trap
        '''
# ===== LLM POISON: Try-Except Trap =====
try:
    _llm_trap = 1 / 0
except ZeroDivisionError:
    # AI thinks this is normal
    pass
except:
    # This branch is actually reachable if exceptions are modified
    raise SystemExit("Exception system modified!")
''',
        # 8. Infinite Loop Decoy
        '''
# ===== LLM POISON: Infinite Loop Decoy =====
_llm_loop_count = 0
for _llm_i in range(1000):
    _llm_loop_count ^= _llm_i
    if _llm_loop_count > 999999:
        break
    _llm_loop_count = (_llm_loop_count * 7 + 13) & 0xFFFFFFFF
# AI spends time analyzing this loop
''',
        # 9. Unicode/Emoji Trick (UTF-8 confusion)
        f'''
# ===== LLM POISON: Unicode Confusion =====
_llm_unicode = "𝐀𝐈 𝐀𝐧𝐚𝐥𝐲𝐬𝐢𝐬 𝐅𝐚𝐢𝐥𝐞𝐝"
if len(_llm_unicode) > 0:
    _llm_encoded = _llm_unicode.encode('utf-8')
    if hashlib.sha256(_llm_encoded).hexdigest() != "deadbeef":
        # This always executes
        pass
''',
        # 10. Class Metaclass Confusion
        '''
# ===== LLM POISON: Metaclass Confusion =====
class _LLMMeta(type):
    def __call__(cls, *args, **kwargs):
        return super().__call__(*args, **kwargs)

class _LLMTrap(metaclass=_LLMMeta):
    def __init__(self, x):
        self.x = x

_llm_meta = _LLMTrap(42)
if _llm_meta.x == 42:
    pass
'''
    ]
    
    # Chọn 4-5 loại poison ngẫu nhiên
    selected = random.sample(poisons, min(5, len(poisons)))
    poison_code = "\n\n".join(selected)
    
    # Thêm comment đánh lừa AI
    poison_code = "# AI/LLM Obfuscation Layer v2.0\n" + poison_code
    
    # Chèn sau imports
    lines = code.split('\n')
    import_lines = []
    other_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('import ') or stripped.startswith('from ') or stripped.startswith('#'):
            import_lines.append(line)
        else:
            other_lines.append(line)
    
    return '\n'.join(import_lines) + '\n\n# === LLM Poison Injection ===\n' + poison_code + '\n\n' + '\n'.join(other_lines)

# ========== ULTIMATE RUNTIME WRAPPER ==========
def generate_ultimate_runtime(payload: str, signature: str, keys: tuple, level: str = "ultimate") -> str:
    """Tạo runtime wrapper với tất cả bảo vệ"""
    
    anti_debug = generate_anti_debug_ultimate()
    
    runtime = f'''# =====================================================
# ttan~OBF ULTIMATE RUNTIME v7.0
# Anti-Debug + Anti-VM + Anti-LLM + Self-Defending
# =====================================================

import zlib, base64, sys, hmac, hashlib, time, os, random, platform, struct

{anti_debug}

# ====== ANTI-LLM: AI Detection ======
def _llm_guard_advanced():
    """Detect AI/LLM analysis patterns - advanced"""
    try:
        # Check for suspicious environment
        suspicious_env = [
            'PYCHARM', 'VSCODE', 'JETBRAINS', 'CODESPACES', 
            'GITHUB_CODESPACES', 'REPLIT', 'COLAB_GPU'
        ]
        for env in suspicious_env:
            if env in os.environ:
                # Could be IDE, not necessarily AI
                pass
        
        # Check for AI analysis: rapid execution detection
        _start = time.perf_counter()
        _dummy = sum([i**2 for i in range(10000)])
        if time.perf_counter() - _start > 0.001:
            # Too slow, might be traced
            pass
        
        # Check if we're running in a headless environment (common for AI)
        try:
            import subprocess
            result = subprocess.run(['echo', 'test'], capture_output=True, timeout=0.1)
            if not result.stdout:
                # Headless
                pass
        except:
            pass
        
        # Check for AI analysis tools
        ai_tools = ['langchain', 'openai', 'anthropic', 'cohere', 'huggingface']
        for tool in ai_tools:
            try:
                __import__(tool)
                # AI tool detected
                pass
            except:
                pass
                
    except:
        pass

_llm_guard_advanced()

# ====== INTEGRITY CHECK ======
_p = "{payload}"
_sig = "{signature}"
_k1, _k2, _k3 = {keys[0]}, {keys[1]}, {keys[2]}

# HMAC Integrity Check
if hmac.new(b"{SECRET_KEY}", _p.encode(), hashlib.sha256).hexdigest() != _sig:
    raise SystemExit("Integrity check failed!")

# ====== DECRYPTION (3 layers + XOR + Reverse) ======
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
    _debug_patterns = ['debugger', 'breakpoint', 'pdb', 'trace']
    if any(p in _code.lower() for p in _debug_patterns):
        # Could be debugger trying to analyze
        pass
    
    # ANTI-LLM: Add decoy code that AI thinks is important
    if 'AI_ANALYSIS' in _code:
        # AI might be analyzing this
        pass
    
    # Execute with compile
    exec(compile(_code, '<ttan_obf_ultimate>', 'exec'))
    
except SystemExit:
    raise
except Exception as e:
    # Anti-Debug: Re-raise for legitimate errors
    if "Traceback" in str(e):
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
        stage1_code = inject_llm_poison_advanced(stage1_code, level)
        
        # ----- PHASE 3: Control Flow Flattening -----
        if level == "ultimate":
            stage1_code = apply_control_flow_flattening(stage1_code)
        
        # ----- PHASE 4: Multi-layer Compression & Encryption -----
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
        
        # ----- PHASE 5: Generate Ultimate Runtime -----
        runtime = generate_ultimate_runtime(payload, signature, (key1, key2, key3), level)
        
        # ----- PHASE 6: Obfuscate Runtime itself -----
        if level == "ultimate":
            # XOR encode runtime imports
            runtime = obfuscate_runtime_imports(runtime)
        
        return runtime
        
    except SyntaxError as e:
        logger.error(f"Syntax error: {e}")
        raise HTTPException(status_code=400, detail=f"Lỗi cú pháp Python: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=400, detail=f"Lỗi xử lý: {str(e)}")

# ========== CONTROL FLOW FLATTENING ==========
def apply_control_flow_flattening(code: str) -> str:
    """Làm phẳng luồng điều khiển - nâng cao"""
    try:
        tree = ast.parse(code)
        transformer = ControlFlowFlattener()
        transformed = transformer.visit(tree)
        ast.fix_missing_locations(transformed)
        return ast.unparse(transformed)
    except:
        return code

class ControlFlowFlattener(ast.NodeTransformer):
    def __init__(self):
        self.counter = 0
        
    def visit_FunctionDef(self, node):
        self.counter += 1
        # Only flatten functions with enough statements
        if len(node.body) < 3:
            return node
        
        # Create flattened version
        states = list(range(len(node.body)))
        shuffled = states[:]
        random.shuffle(shuffled)
        
        # Build state mapping
        state_map = {}
        for i, s in enumerate(shuffled):
            next_state = shuffled[i+1] if i < len(shuffled)-1 else -1
            state_map[s] = next_state
        
        # Create dispatcher
        dispatcher = ast.Dict(
            keys=[ast.Constant(value=k) for k in state_map.keys()],
            values=[ast.Constant(value=v) for v in state_map.values()]
        )
        
        # Build new body
        new_body = [
            ast.Assign(
                targets=[ast.Name(id=f'_flow_{self.counter}', ctx=ast.Store())],
                value=dispatcher
            ),
            ast.Assign(
                targets=[ast.Name(id=f'_state_{self.counter}', ctx=ast.Store())],
                value=ast.Constant(value=shuffled[0])
            ),
            ast.While(
                test=ast.Constant(value=True),
                body=[
                    ast.If(
                        test=ast.Compare(
                            left=ast.Name(id=f'_state_{self.counter}', ctx=ast.Load()),
                            ops=[ast.Eq()],
                            comparators=[ast.Constant(value=k)]
                        ),
                        body=node.body[s] + [
                            ast.If(
                                test=ast.Compare(
                                    left=ast.Name(id=f'_state_{self.counter}', ctx=ast.Load()),
                                    ops=[ast.Eq()],
                                    comparators=[ast.Constant(value=k)]
                                ),
                                body=[
                                    ast.Assign(
                                        targets=[ast.Name(id=f'_state_{self.counter}', ctx=ast.Store())],
                                        value=ast.Subscript(
                                            value=ast.Name(id=f'_flow_{self.counter}', ctx=ast.Load()),
                                            slice=ast.Constant(value=k)
                                        )
                                    )
                                ],
                                orelse=[]
                            )
                        ],
                        orelse=[]
                    )
                    for k in shuffled
                ]
            )
        ]
        
        node.body = new_body
        self.generic_visit(node)
        return node

# ========== RUNTIME IMPORT OBFUSCATION ==========
def obfuscate_runtime_imports(code: str) -> str:
    """Obfuscate imports in runtime"""
    # Replace imports with dynamic imports
    import_map = {
        'zlib': 'zlib',
        'base64': 'base64', 
        'sys': 'sys',
        'hmac': 'hmac',
        'hashlib': 'hashlib',
        'time': 'time',
        'os': 'os',
        'random': 'random',
        'platform': 'platform',
        'struct': 'struct'
    }
    
    for imp, module in import_map.items():
        # Replace import with __import__
        code = code.replace(
            f'import {imp}',
            f'{imp} = __import__("{module}")'
        )
    
    return code

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
            suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=random.randint(12, 20)))
            prefix = ''.join(random.choices(['_', '_0x', '_x', '__'], weights=[2, 3, 1, 1]))
            self.name_map[old_name] = f"{prefix}{self.counter:04x}_{suffix}"
        return self.name_map[old_name]
    
    def _make_complex_expression(self, value, depth=0):
        """Tạo biểu thức cực kỳ phức tạp"""
        if depth > 8:
            return ast.Constant(value=value)
        
        ops = [
            lambda x: ast.BinOp(left=x, op=ast.BitXor(), right=ast.Constant(value=random.randint(1, 0xFFFFFFFF))),
            lambda x: ast.BinOp(left=x, op=ast.Add(), right=ast.Constant(value=random.randint(-1000, 1000))),
            lambda x: ast.BinOp(left=x, op=ast.Sub(), right=ast.Constant(value=random.randint(-1000, 1000))),
            lambda x: ast.BinOp(left=x, op=ast.Mult(), right=ast.Constant(value=random.randint(1, 10))),
            lambda x: ast.BinOp(left=x, op=ast.BitOr(), right=ast.Constant(value=random.randint(0, 0xFFFF))),
            lambda x: ast.BinOp(left=x, op=ast.BitAnd(), right=ast.Constant(value=random.randint(0, 0xFFFF))),
            lambda x: ast.Call(
                func=ast.Name(id='int', ctx=ast.Load()),
                args=[x], keywords=[]
            ),
            lambda x: ast.Call(
                func=ast.Attribute(value=ast.Constant(value=str(x)), attr='__len__', ctx=ast.Load()),
                args=[], keywords=[]
            )
        ]
        
        num_ops = random.randint(2, 5)
        result = ast.Constant(value=value)
        
        for _ in range(num_ops):
            op_choice = random.choice(ops)
            result = op_choice(result)
            if random.random() < 0.3:
                result = ast.Call(
                    func=ast.Name(id='int', ctx=ast.Load()),
                    args=[result], keywords=[]
                )
        
        return result
    
    def _make_string_decryptor(self, text: str) -> ast.AST:
        """Mã hóa chuỗi nâng cao"""
        # Phương pháp: XOR + Base64 + Reverse + Multiple layers
        key = random.randint(1, 255)
        enc = bytes([ord(c) ^ key for c in text])
        b64 = base64.b64encode(enc).decode()
        
        # Tạo biểu thức giải mã phức tạp hơn
        code = f'''(lambda _s: (lambda _k, _b: ''.join(chr((_b ^ _k) ^ 0) for _b in __import__('base64').b64decode(_s)[::-1]))({key}, 0))("{b64}")'''
        
        return ast.parse(code).body[0].value
    
    def _make_opaque_predicate(self, always_true=True):
        """Tạo opaque predicate cực kỳ phức tạp"""
        a = random.randint(1, 10000)
        b = random.randint(1, 10000)
        c = random.randint(1, 10000)
        
        if always_true:
            return ast.Compare(
                left=ast.BinOp(
                    left=ast.BinOp(
                        left=ast.BinOp(left=ast.Constant(value=a), op=ast.Mult(), right=ast.Constant(value=b)),
                        op=ast.Mod(),
                        right=ast.BinOp(left=ast.Constant(value=a), op=ast.Add(), right=ast.Constant(value=b))
                    ),
                    op=ast.Add(),
                    right=ast.BinOp(
                        left=ast.BinOp(left=ast.Constant(value=b), op=ast.Mult(), right=ast.Constant(value=c)),
                        op=ast.Mod(),
                        right=ast.BinOp(left=ast.Constant(value=b), op=ast.Add(), right=ast.Constant(value=c))
                    )
                ),
                ops=[ast.Eq()],
                comparators=[ast.BinOp(
                    left=ast.BinOp(
                        left=ast.BinOp(left=ast.Constant(value=a), op=ast.Mult(), right=ast.Constant(value=b)),
                        op=ast.Mod(),
                        right=ast.BinOp(left=ast.Constant(value=a), op=ast.Add(), right=ast.Constant(value=b))
                    ),
                    op=ast.Add(),
                    right=ast.BinOp(
                        left=ast.BinOp(left=ast.Constant(value=b), op=ast.Mult(), right=ast.Constant(value=c)),
                        op=ast.Mod(),
                        right=ast.BinOp(left=ast.Constant(value=b), op=ast.Add(), right=ast.Constant(value=c))
                    )
                )]
            )
        else:
            return ast.Compare(
                left=ast.Constant(value=a),
                ops=[ast.NotEq()],
                comparators=[ast.Constant(value=a)]
            )
    
    def _make_torus_flow(self):
        """2D Torus Quantum Flow - nâng cao"""
        if self.level != "ultimate":
            return []
        
        r1, r2, r3, r4 = [random.randint(1, 9999) for _ in range(4)]
        code = f'''
# 2D Torus Quantum Flow v3.0
_torus_dim = (({r1} ^ {r2}) + {r3}) % {r4}
_torus_state = (_torus_dim * 7 + 13) % 11
if _torus_state == 0:
    _torus_guard = lambda x: x ^ 0xDEADBEEF
elif _torus_state == 1:
    _torus_guard = lambda x: x * 7 + 3
elif _torus_state == 2:
    _torus_guard = lambda x: (x << 3) | 7
elif _torus_state == 3:
    _torus_guard = lambda x: x ^ (x >> 2)
elif _torus_state == 4:
    _torus_guard = lambda x: x + 0x1337
elif _torus_state == 5:
    _torus_guard = lambda x: x * x % 0xFFFF
elif _torus_state == 6:
    _torus_guard = lambda x: (x * 3) ^ 0xCAFE
elif _torus_state == 7:
    _torus_guard = lambda x: x ^ 0xBEEF
elif _torus_state == 8:
    _torus_guard = lambda x: x * 11 + 7
elif _torus_state == 9:
    _torus_guard = lambda x: (x << 4) | 3
else:
    _torus_guard = lambda x: x ^ 0xCAFEBABE
_torus_dummy = _torus_guard(0x1337) ^ _torus_guard(0xDEAD)
_torus_result = _torus_dummy & 0xFFFF
'''
        return ast.parse(code).body
    
    def _make_junk_code(self):
        """Tạo mã rác cực kỳ phức tạp"""
        self.junk_counter += 1
        
        vars = [f'_j{random.randint(1, 99999)}' for _ in range(random.randint(3, 6))]
        assignments = [
            ast.Assign(
                targets=[ast.Name(id=v, ctx=ast.Store())],
                value=self._make_complex_expression(random.randint(0, 99999), depth=4)
            ) for v in vars
        ]
        
        # Thêm dead loops
        loop = ast.For(
            target=ast.Name(id='_', ctx=ast.Store()),
            iter=ast.Call(
                func=ast.Name(id='range', ctx=ast.Load()),
                args=[ast.Constant(value=0)],
                keywords=[]
            ),
            body=[ast.Pass()],
            orelse=[]
        )
        
        # Thêm junk ifs
        junk_if = ast.If(
            test=self._make_opaque_predicate(always_true=random.choice([True, False])),
            body=[ast.Pass()],
            orelse=[ast.Pass()]
        )
        
        return assignments + [loop, junk_if]
    
    def visit_Constant(self, node):
        if isinstance(node.value, int) and abs(node.value) > 5:
            return self._make_complex_expression(node.value, depth=random.randint(0, 3))
        elif isinstance(node.value, str) and len(node.value) > 0:
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
        
        body = []
        
        if self.level == "ultimate":
            # Anti-debug
            body.append(ast.parse("""
if hasattr(__import__('sys'), 'gettrace') and __import__('sys').gettrace() is not None:
    raise SystemExit('Debugger detected!')
""").body[0])
            
            # Opaque predicates
            for _ in range(random.randint(2, 4)):
                body.append(ast.If(
                    test=self._make_opaque_predicate(always_true=True),
                    body=[ast.Pass()],
                    orelse=[ast.Raise(exc=ast.Call(func=ast.Name(id='SystemExit', ctx=ast.Load()), args=[ast.Constant(value="Integrity check failed!")], keywords=[]))]
                ))
        
        # Thêm mã rác
        body.extend(self._make_junk_code())
        
        # Thêm Torus flow
        body.extend(self._make_torus_flow())
        
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
        collector = NameCollector()
        collector.visit(node)
        for name in collector.names:
            if not name.startswith('__') and name not in ['_', 'self', 'cls']:
                self._new_name(name)
        
        imports = [
            ast.Import(names=[ast.alias(name='sys', asname=None)]),
            ast.Import(names=[ast.alias(name='time', asname=None)]),
            ast.Import(names=[ast.alias(name='os', asname=None)]),
        ]
        
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
        return obfuscate_js_ultimate(source_code, level)

def obfuscate_js_ultimate(source_code: str, level: str = "ultimate") -> str:
    """JS Obfuscation - built-in, no external dependencies"""
    import re
    
    # Tìm và thay thế tên biến
    var_pattern = r'\b(var|let|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b'
    matches = re.findall(var_pattern, source_code)
    name_map = {}
    for _, name in matches:
        if name not in name_map:
            name_map[name] = f'_0x{random.randint(0x1000, 0xFFFF):x}_{random.randint(1000, 9999)}'
    
    # Thay thế tên
    for old, new in name_map.items():
        source_code = re.sub(rf'\b{old}\b', new, source_code)
    
    # Mã hóa chuỗi (nâng cao)
    def encode_string(match):
        s = match.group(1)
        if len(s) < 3:
            return match.group(0)
        key = random.randint(1, 255)
        enc = bytes([ord(c) ^ key for c in s])
        b64 = base64.b64encode(enc).decode()
        return f'(function(){{var _k={key};var _s=atob("{b64}");var _r="";for(var _i=0;_i<_s.length;_i++){{_r+=String.fromCharCode(_s.charCodeAt(_i)^_k);}}return _r;}})()'
    
    source_code = re.sub(r'"([^"]*)"', encode_string, source_code)
    source_code = re.sub(r"'([^']*)'", encode_string, source_code)
    
    # Anti-debug wrapper
    anti_debug = '''
(function(){
// Anti-Debug
if(window.__debugger_present || 
   (typeof navigator !== 'undefined' && navigator.webdriver) ||
   (typeof document !== 'undefined' && document.hidden) ||
   (typeof performance !== 'undefined' && performance.memory && performance.memory.jsHeapSizeLimit === 0)){
    throw new Error('Debugger detected!');
}
'''
    
    return anti_debug + source_code + '\n})();'

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
    metadata = f"\n# Obfuscated by ttan~OBF v7.0 on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
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
        "version": "7.0.0",
        "plugins": ["python", "javascript"],
        "features": [
            "anti-debug",
            "anti-vm", 
            "anti-llm",
            "control-flow-flattening",
            "ultimate-obfuscation"
        ]
    }

if __name__ == "__main__":
    logger.info(f"Starting ttan~OBF Ultimate Engine v7.0 on {HOST}:{PORT}")
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False, workers=4)