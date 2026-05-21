import sys
import io
import json
import copy
import re
from typing import List, Dict, Any, Optional

# Types that are safe to display in the memory panel
DISPLAYABLE_TYPES = (int, float, str, bool, list, dict, tuple, set, type(None))

# Types to completely exclude from variable capture
EXCLUDED_TYPES = (type, type(lambda: None), type(sys), type(print))

# Mutable types where reference sharing is meaningful
MUTABLE_TYPES = (list, dict, set)


def classify_event(line_content: str) -> str:
    """Classify a code line into a high-level event type."""
    trimmed = line_content.strip()
    if not trimmed:
        return "blank"
    if trimmed.startswith('for '):
        return "loop_iteration"
    if trimmed.startswith('while '):
        return "loop_iteration"
    if trimmed.startswith('if ') or trimmed.startswith('elif '):
        return "condition"
    if trimmed.startswith('else'):
        return "condition"
    if trimmed.startswith('def '):
        return "function_def"
    if trimmed.startswith('return'):
        return "return"
    if 'print(' in trimmed:
        return "output"
    if trimmed.startswith('class '):
        return "class_def"
    if trimmed.startswith('import ') or trimmed.startswith('from '):
        return "import"
    if '=' in trimmed and not trimmed.startswith('#') and '==' not in trimmed.split('=')[0]:
        return "assignment"
    return "expression"


def clean_value(v):
    """Deep-copy and sanitize a value for JSON serialization."""
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, str):
        return v
    if isinstance(v, (list, tuple)):
        result = []
        for item in v:
            if isinstance(item, DISPLAYABLE_TYPES) and not isinstance(item, EXCLUDED_TYPES):
                result.append(clean_value(item))
            else:
                result.append(str(item))
        return result
    if isinstance(v, dict):
        result = {}
        for k, val in v.items():
            key_str = str(k)
            if isinstance(val, DISPLAYABLE_TYPES) and not isinstance(val, EXCLUDED_TYPES):
                result[key_str] = clean_value(val)
            else:
                result[key_str] = str(val)
        return result
    if isinstance(v, set):
        return sorted([clean_value(item) for item in v if isinstance(item, (int, float, str, bool))])
    return str(v)


def is_displayable(v) -> bool:
    """Check if a value should be shown in the memory panel."""
    if isinstance(v, EXCLUDED_TYPES):
        return False
    if isinstance(v, DISPLAYABLE_TYPES):
        return True
    return False


def get_python_type_name(v) -> str:
    """Get a human-readable Python type name."""
    if v is None:
        return "NoneType"
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, int):
        return "int"
    if isinstance(v, float):
        return "float"
    if isinstance(v, str):
        return "str"
    if isinstance(v, list):
        return "list"
    if isinstance(v, tuple):
        return "tuple"
    if isinstance(v, dict):
        return "dict"
    if isinstance(v, set):
        return "set"
    return type(v).__name__


class MemoryTracker:
    """Tracks simulated memory addresses and references for variables."""

    def __init__(self):
        self._next_addr = 0x1001
        # Maps Python id() -> simulated address hex string
        self._id_to_addr = {}
        # For immutable types, map (type, value) -> address for stable addressing
        self._immutable_cache = {}

    def get_address(self, name: str, value) -> str:
        """Get a stable simulated memory address for a value."""
        if isinstance(value, MUTABLE_TYPES):
            # Mutable: use Python id() for identity tracking
            obj_id = id(value)
            if obj_id not in self._id_to_addr:
                self._id_to_addr[obj_id] = f"0x{self._next_addr:04x}"
                self._next_addr += 1
            return self._id_to_addr[obj_id]
        else:
            # Immutable: use value-based addressing for stability
            try:
                cache_key = (type(value).__name__, str(value))
                if cache_key not in self._immutable_cache:
                    self._immutable_cache[cache_key] = f"0x{self._next_addr:04x}"
                    self._next_addr += 1
                return self._immutable_cache[cache_key]
            except Exception:
                addr = f"0x{self._next_addr:04x}"
                self._next_addr += 1
                return addr

    def get_reference_id(self, value) -> str:
        """Get a reference ID for a value. Mutable objects sharing id() get the same ref ID."""
        if isinstance(value, MUTABLE_TYPES):
            obj_id = id(value)
            # Ensure address exists
            if obj_id not in self._id_to_addr:
                self._id_to_addr[obj_id] = f"0x{self._next_addr:04x}"
                self._next_addr += 1
            return f"ref_{obj_id}"
        return None


class LoopTracker:
    """Tracks loop iterations for visualization."""

    def __init__(self):
        # Stack of active loops: [{variable, total, iterations_seen}]
        self._loop_stack = []
        self._last_loop_line = None

    def update(self, line_no: int, line_content: str, variables: dict) -> Optional[dict]:
        """Update loop tracking and return loopInfo if inside a loop."""
        trimmed = line_content.strip()

        if trimmed.startswith('for '):
            match = re.match(r'^for\s+(\w+)\s+in\s+(.+?)\s*:', trimmed)
            if match:
                loop_var = match.group(1)
                iterable_expr = match.group(2)

                # Try to determine total iterations
                total = None
                range_match = re.match(r'range\((\d+)\)', iterable_expr)
                if range_match:
                    total = int(range_match.group(1))
                else:
                    range_match2 = re.match(r'range\((\d+)\s*,\s*(\d+)\)', iterable_expr)
                    if range_match2:
                        total = int(range_match2.group(2)) - int(range_match2.group(1))

                current_val = variables.get(loop_var)

                # Check if this is the same loop continuing or a new loop
                if self._last_loop_line == line_no and self._loop_stack:
                    # Same loop, increment iteration
                    top = self._loop_stack[-1]
                    top["iterations_seen"] += 1
                    self._last_loop_line = line_no
                    return {
                        "variable": loop_var,
                        "current": top["iterations_seen"],
                        "total": top.get("total"),
                        "value": clean_value(current_val) if current_val is not None else None
                    }
                else:
                    # New loop
                    loop_info = {
                        "variable": loop_var,
                        "total": total,
                        "iterations_seen": 1
                    }
                    self._loop_stack.append(loop_info)
                    self._last_loop_line = line_no
                    return {
                        "variable": loop_var,
                        "current": 1,
                        "total": total,
                        "value": clean_value(current_val) if current_val is not None else None
                    }

        # If we're inside a loop body, return the current loop info
        if self._loop_stack:
            top = self._loop_stack[-1]
            return {
                "variable": top["variable"],
                "current": top["iterations_seen"],
                "total": top.get("total"),
                "value": None
            }

        return None

    def exit_loop(self):
        """Pop the current loop from the stack."""
        if self._loop_stack:
            self._loop_stack.pop()


class CodeExecutor:
    def __init__(self):
        self.steps = []
        self.raw_count = 0
        self.output_buffer = io.StringIO()
        self.truncated = False
        self.max_raw_events = 500  # Raw trace events limit
        self.max_compressed_steps = 200  # Final step limit
        self.max_recursion_depth = 15
        self.call_depth = 0
        self.user_code_lines = []
        self.last_line = None
        self.last_vars_snapshot = {}
        self.step_counter = 0

        # Memory and loop tracking
        self.memory_tracker = MemoryTracker()
        self.loop_tracker = LoopTracker()

        # Raw frame locals for reference detection (before clean_value)
        self._raw_frame_locals = {}
        # Build a safe builtins dict: start from real builtins, remove dangerous ones
        import builtins as _builtins
        safe_builtins = {k: getattr(_builtins, k) for k in dir(_builtins) if not k.startswith('_') or k in ('__build_class__', '__name__', '__import__')}
        # Remove dangerous functions that allow file/system/code access
        dangerous = {
            'open', 'exec', 'eval', 'compile', '__import__',
            'globals', 'locals', 'vars',
            'getattr', 'setattr', 'delattr',
            'breakpoint', 'exit', 'quit',
            'memoryview', 'bytearray',
            'help', 'copyright', 'credits', 'license',
        }
        for name in dangerous:
            safe_builtins.pop(name, None)
        # Override print to capture output, and input to be a safe no-op
        safe_builtins['print'] = self._custom_print
        safe_builtins['input'] = lambda prompt="": ""
        self.globals = {"__builtins__": safe_builtins}
        self.locals = {}

    def _custom_print(self, *args, **kwargs):
        print(*args, file=self.output_buffer, **kwargs)



    def _capture_vars(self, frame) -> dict:
        """Extract only displayable variables from frame locals."""
        result = {}
        for k, v in frame.f_locals.items():
            # Skip internal/private names
            if k.startswith('__'):
                continue
            if k in ('self', 'args', 'kwargs'):
                continue
            # Skip functions, classes, modules
            if not is_displayable(v):
                continue
            try:
                result[k] = clean_value(v)
            except Exception:
                # If we can't serialize it, skip it entirely
                pass
        return result

    def _capture_raw_locals(self, frame) -> dict:
        """Capture raw frame locals (before serialization) for reference detection."""
        result = {}
        for k, v in frame.f_locals.items():
            if k.startswith('__'):
                continue
            if k in ('self', 'args', 'kwargs'):
                continue
            if not is_displayable(v):
                continue
            result[k] = v
        return result

    def _detect_changed_variables(self, current_vars: dict) -> list:
        """Detect which variables changed since the last step."""
        changed = []
        for k, v in current_vars.items():
            if k not in self.last_vars_snapshot:
                changed.append(k)  # New variable
            else:
                try:
                    if json.dumps(v, default=str, sort_keys=True) != json.dumps(self.last_vars_snapshot[k], default=str, sort_keys=True):
                        changed.append(k)
                except Exception:
                    if str(v) != str(self.last_vars_snapshot.get(k)):
                        changed.append(k)
        return changed

    def _build_memory_entries(self, cleaned_vars: dict, raw_locals: dict) -> list:
        """Build memory entries with addresses, types, and reference IDs."""
        memory = []
        # Track which reference IDs we've already emitted blocks for
        seen_refs = {}

        for name, cleaned_val in cleaned_vars.items():
            raw_val = raw_locals.get(name)
            if raw_val is None and name in raw_locals:
                raw_val = raw_locals[name]

            type_name = get_python_type_name(raw_val) if raw_val is not None else get_python_type_name(cleaned_val)
            address = self.memory_tracker.get_address(name, raw_val if raw_val is not None else cleaned_val)
            ref_id = self.memory_tracker.get_reference_id(raw_val) if raw_val is not None else None

            memory.append({
                "name": name,
                "value": cleaned_val,
                "type": type_name,
                "address": address,
                "referenceId": ref_id
            })

        return memory

    def _detect_references(self, raw_locals: dict) -> list:
        """Detect variables that share the same mutable object (same Python id)."""
        references = []
        # Map object id -> list of variable names
        id_to_names = {}
        for name, val in raw_locals.items():
            if isinstance(val, MUTABLE_TYPES):
                obj_id = id(val)
                if obj_id not in id_to_names:
                    id_to_names[obj_id] = []
                id_to_names[obj_id].append(name)

        # For any object shared by 2+ variables, emit reference entries
        for obj_id, names in id_to_names.items():
            if len(names) >= 2:
                ref_id = f"ref_{obj_id}"
                for name in names:
                    references.append({
                        "from": name,
                        "to": ref_id
                    })

        return references

    def _vars_changed(self, new_vars: dict) -> bool:
        """Check if variables actually changed since last snapshot."""
        if set(new_vars.keys()) != set(self.last_vars_snapshot.keys()):
            return True
        for k, v in new_vars.items():
            old = self.last_vars_snapshot.get(k)
            try:
                if json.dumps(v, default=str, sort_keys=True) != json.dumps(old, default=str, sort_keys=True):
                    return True
            except Exception:
                if str(v) != str(old):
                    return True
        return False
    


    def trace_calls(self, frame, event, arg):
        # Only trace inside our user code function
        func_name = frame.f_code.co_name

        if event == 'call':
            if func_name == '__execute_user_code__':
                self.call_depth = 1
            elif self.call_depth > 0:
                self.call_depth += 1
                # If recursion is too deep, stop tracing deeper
                if self.call_depth > self.max_recursion_depth:
                    return None
            return self.trace_calls

        if event == 'return':
            if self.call_depth > 0:
                self.call_depth -= 1
            return self.trace_calls

        if event != 'line':
            return self.trace_calls

        # Check raw event limit
        self.raw_count += 1
        if self.raw_count > self.max_raw_events:
            self.truncated = True
            # Stop tracing by returning None
            return None

        line_no = frame.f_lineno

        # Convert to user line number (wrapper adds 1 line at top: "def __execute_user_code__():")
        user_line = line_no - 1

        # Skip lines outside user code range (wrapper def line, call line, etc.)
        if user_line < 1 or user_line > len(self.user_code_lines):
            return self.trace_calls

        # Skip blank/whitespace-only lines — no point highlighting empty lines
        line_content = self.user_code_lines[user_line - 1]
        if not line_content.strip():
            return self.trace_calls

        # Update previous step's output (captures print from last line)
        if self.steps:
            self.steps[-1]["output"] = self.output_buffer.getvalue()

        # Capture and filter variables
        cleaned_vars = self._capture_vars(frame)
        raw_locals = self._capture_raw_locals(frame)

        # Step compression: skip if same line AND no variable changes
        if user_line == self.last_line and not self._vars_changed(cleaned_vars):
            return self.trace_calls

        # Determine event type from source line
        event_type = classify_event(line_content)

        # Skip function definitions (the body is traced when called)
        if event_type == "function_def" or event_type == "class_def":
            return self.trace_calls

        current_output = self.output_buffer.getvalue()

        # Detect changed variables
        changed_vars = self._detect_changed_variables(cleaned_vars)

        # Build memory entries
        memory_entries = self._build_memory_entries(cleaned_vars, raw_locals)

        # Detect references
        references = self._detect_references(raw_locals)

        # Track loop iterations
        loop_info = self.loop_tracker.update(user_line, line_content, cleaned_vars)

        # Increment step counter
        self.step_counter += 1

        self.steps.append({
            "step": self.step_counter,
            "line": user_line,
            "event": event_type,
            "variables": cleaned_vars,
            "changedVariables": changed_vars,
            "memory": memory_entries,
            "references": references,
            "output": current_output,
            "loopInfo": loop_info,
        })

        self.last_line = user_line
        self.last_vars_snapshot = dict(cleaned_vars)
        self._raw_frame_locals = dict(raw_locals)

        # Check compressed step limit
        if len(self.steps) >= self.max_compressed_steps:
            self.truncated = True
            return None

        return self.trace_calls

    def run(self, code: str) -> dict:
        self.steps = []
        self.output_buffer = io.StringIO()
        self.raw_count = 0
        self.truncated = False
        self.call_depth = 0
        self.last_line = None
        self.last_vars_snapshot = {}
        self.step_counter = 0
        self.memory_tracker = MemoryTracker()
        self.loop_tracker = LoopTracker()
        self._raw_frame_locals = {}
        self.user_code_lines = code.splitlines()

        try:
            wrapped_code = "def __execute_user_code__():\n" + "\n".join("    " + line for line in self.user_code_lines) + "\n__execute_user_code__()"

            sys.settrace(self.trace_calls)
            try:
                exec(wrapped_code, self.globals, self.locals)
            finally:
                sys.settrace(None)

            # Capture final output on last step
            if self.steps:
                self.steps[-1]["output"] = self.output_buffer.getvalue()

            return {
                "steps": self.steps,
                "truncated": self.truncated
            }
        except Exception as e:
            error_msg = str(e)
            # Clean up the "Maximum iterations" message if it's ours
            if "exceeded" in error_msg.lower():
                self.truncated = True

            self.steps.append({
                "step": self.step_counter + 1,
                "line": None,
                "event": "error",
                "variables": {},
                "changedVariables": [],
                "memory": [],
                "references": [],
                "output": self.output_buffer.getvalue(),
                "loopInfo": None,
                "error": error_msg
            })
            return {
                "steps": self.steps,
                "truncated": self.truncated
            }


if __name__ == "__main__":
    # Test 1: Simple code
    print("=== Test 1: Simple Code ===")
    executor = CodeExecutor()
    result = executor.run("x = 5\nif x > 3:\n    y = 10\nelse:\n    y = 0\nprint(y)")
    for step in result["steps"]:
        print(f"  Step {step['step']} | Line {step['line']}: {step['event']} | vars={step['variables']} | changed={step['changedVariables']} | mem={[m['address'] for m in step['memory']]} | out='{step['output']}'")
    print(f"  Truncated: {result['truncated']}")
    print(f"  Total steps: {len(result['steps'])}")

    # Test 2: Loop
    print("\n=== Test 2: Loop ===")
    executor2 = CodeExecutor()
    result2 = executor2.run("total = 0\nfor i in range(5):\n    total += i\nprint(total)")
    for step in result2["steps"]:
        loop = step.get('loopInfo')
        print(f"  Step {step['step']} | Line {step['line']}: {step['event']} | vars={step['variables']} | changed={step['changedVariables']} | loop={loop}")
    print(f"  Total steps: {len(result2['steps'])}")

    # Test 3: References
    print("\n=== Test 3: References ===")
    executor3 = CodeExecutor()
    result3 = executor3.run("a = [1, 2]\nb = a")
    for step in result3["steps"]:
        refs = step.get('references', [])
        mem = step.get('memory', [])
        print(f"  Step {step['step']} | Line {step['line']}: {step['event']} | vars={step['variables']} | refs={refs} | mem_addrs={[(m['name'], m['address'], m.get('referenceId')) for m in mem]}")
    print(f"  Total steps: {len(result3['steps'])}")

    # Test 4: Variable reassignment
    print("\n=== Test 4: Variable Reassignment ===")
    executor4 = CodeExecutor()
    result4 = executor4.run("x = 5\nx = x + 1")
    for step in result4["steps"]:
        print(f"  Step {step['step']} | Line {step['line']}: {step['event']} | vars={step['variables']} | changed={step['changedVariables']} | mem={[(m['name'], m['address'], m['type']) for m in step['memory']]}")

    # Test 5: Fibonacci (recursion)
    print("\n=== Test 5: Fibonacci ===")
    executor5 = CodeExecutor()
    fib_code = """def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)

result = fib(6)
print(result)"""
    result5 = executor5.run(fib_code)
    print(f"  Total steps: {len(result5['steps'])}")
    print(f"  Truncated: {result5['truncated']}")
    if result5["steps"]:
        last = result5["steps"][-1]
        print(f"  Last output: '{last['output']}'")

    # Test 6: Function should NOT appear in memory
    print("\n=== Test 6: Function Filtering ===")
    executor6 = CodeExecutor()
    result6 = executor6.run("def greet(name):\n    return 'Hello ' + name\nx = greet('World')\nprint(x)")
    for step in result6["steps"]:
        print(f"  Step {step['step']} | Line {step['line']}: vars={step['variables']}")
    print(f"  (greet function should NOT appear in vars)")
