import sys
import io
import json
import copy
from typing import List, Dict, Any, Optional

# Types that are safe to display in the memory panel
DISPLAYABLE_TYPES = (int, float, str, bool, list, dict, tuple, set, type(None))

# Types to completely exclude from variable capture
EXCLUDED_TYPES = (type, type(lambda: None), type(sys), type(print))

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

        # Step compression: skip if same line AND no variable changes
        if user_line == self.last_line and not self._vars_changed(cleaned_vars):
            return self.trace_calls

        # Determine event type from source line
        event_type = classify_event(line_content)

        # Skip function definitions (the body is traced when called)
        if event_type == "function_def" or event_type == "class_def":
            return self.trace_calls

        current_output = self.output_buffer.getvalue()

        self.steps.append({
            "line": user_line,
            "event": event_type,
            "variables": cleaned_vars,
            "output": current_output,
        })

        self.last_line = user_line
        self.last_vars_snapshot = dict(cleaned_vars)

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
                "line": None,
                "event": "error",
                "variables": {},
                "output": self.output_buffer.getvalue(),
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
        print(f"  Line {step['line']}: {step['event']} | vars={step['variables']} | out='{step['output']}'")
    print(f"  Truncated: {result['truncated']}")
    print(f"  Total steps: {len(result['steps'])}")

    # Test 2: Loop
    print("\n=== Test 2: Loop ===")
    executor2 = CodeExecutor()
    result2 = executor2.run("total = 0\nfor i in range(5):\n    total += i\nprint(total)")
    for step in result2["steps"]:
        print(f"  Line {step['line']}: {step['event']} | vars={step['variables']} | out='{step['output']}'")
    print(f"  Total steps: {len(result2['steps'])}")

    # Test 3: Fibonacci (recursion)
    print("\n=== Test 3: Fibonacci ===")
    executor3 = CodeExecutor()
    fib_code = """def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)

result = fib(6)
print(result)"""
    result3 = executor3.run(fib_code)
    print(f"  Total steps: {len(result3['steps'])}")
    print(f"  Truncated: {result3['truncated']}")
    if result3["steps"]:
        last = result3["steps"][-1]
        print(f"  Last output: '{last['output']}'")

    # Test 4: Function should NOT appear in memory
    print("\n=== Test 4: Function Filtering ===")
    executor4 = CodeExecutor()
    result4 = executor4.run("def greet(name):\n    return 'Hello ' + name\nx = greet('World')\nprint(x)")
    for step in result4["steps"]:
        print(f"  Line {step['line']}: vars={step['variables']}")
    print(f"  (greet function should NOT appear in vars)")
