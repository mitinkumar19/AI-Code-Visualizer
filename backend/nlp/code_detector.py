"""
Code Detector — Heuristic-based code extraction from mixed text.

Uses regex, keyword matching, indentation analysis, and syntax pattern
scoring to distinguish code lines from natural language prose.
No ML models — pure lightweight NLP.
"""

import re

# ── Programming keyword sets (used for scoring) ──
CODE_KEYWORDS = {
    # Python
    "def", "class", "import", "from", "return", "yield", "lambda",
    "if", "elif", "else", "for", "while", "break", "continue", "pass",
    "try", "except", "finally", "raise", "with", "as", "assert",
    "print", "range", "len", "True", "False", "None", "self",
    "and", "or", "not", "in", "is",
    # Java
    "public", "private", "protected", "static", "void", "int", "float",
    "double", "boolean", "String", "char", "new", "this", "super",
    "extends", "implements", "interface", "abstract", "final",
    "throws", "throw", "catch", "switch", "case", "default",
    # C / C++
    "include", "define", "ifdef", "ifndef", "endif", "typedef",
    "struct", "enum", "union", "sizeof", "malloc", "free",
    "printf", "scanf", "cout", "cin", "endl", "namespace", "using",
    "template", "typename", "virtual", "override",
    # JavaScript / TypeScript
    "const", "let", "var", "function", "async", "await",
    "export", "require", "module", "undefined", "null",
    "console", "document", "window",
}

# ── Regex patterns that indicate code ──
CODE_PATTERNS = [
    re.compile(r'^\s{4,}'),                          # Indentation (4+ spaces)
    re.compile(r'^\t'),                               # Tab indentation
    re.compile(r'[=!<>]='),                           # Comparison operators
    re.compile(r'[^=]=[^=]'),                         # Assignment operator
    re.compile(r'\w+\('),                             # Function call
    re.compile(r'#include\s*<'),                      # C/C++ include
    re.compile(r'//\s*\w'),                           # Single-line comment
    re.compile(r'/\*'),                               # Multi-line comment start
    re.compile(r'^\s*#\s*\w'),                        # Python comment / preprocessor
    re.compile(r'\{|\}'),                             # Braces
    re.compile(r';\s*$'),                             # Semicolon at end of line
    re.compile(r'->\s*\w'),                           # Arrow (C++/PHP)
    re.compile(r'=>'),                                # Fat arrow (JS)
    re.compile(r'\[\d*\]'),                           # Array indexing
    re.compile(r'&&|\|\|'),                           # Logical operators
    re.compile(r'\+\+|--'),                           # Increment/decrement
    re.compile(r'def\s+\w+\s*\('),                   # Python function def
    re.compile(r'class\s+\w+'),                       # Class definition
    re.compile(r'for\s*\(|for\s+\w+\s+in\s+'),      # For loop
    re.compile(r'while\s*\(|while\s+\w+'),           # While loop
    re.compile(r'if\s*\(|if\s+\w+'),                 # If statement
    re.compile(r'return\s+\w'),                       # Return statement
    re.compile(r'import\s+\w'),                       # Import statement
]

# ── Patterns that suggest natural language prose ──
PROSE_PATTERNS = [
    re.compile(r'^[A-Z][a-z]+(\s+[a-z]+){5,}'),     # Starts with capital, many words
    re.compile(r'[.!?]\s*$'),                         # Ends with sentence punctuation
    re.compile(r'^\d+\.\s+[A-Z]'),                   # Numbered list item
    re.compile(r'^[-•]\s+[A-Z]'),                    # Bullet point
    re.compile(r'^(Chapter|Section|Note|Example|Output|Input|Explanation)\s*:?\s', re.IGNORECASE),
]


def _score_line(line: str) -> int:
    """
    Score a single line for how "code-like" it is.

    Returns:
        Positive score = likely code, negative = likely prose, 0 = ambiguous.
    """
    stripped = line.strip()

    # Skip empty lines — they're neutral
    if not stripped:
        return 0

    score = 0

    # Check for code keywords (whole-word match)
    words = re.findall(r'\b\w+\b', stripped)
    for word in words:
        if word in CODE_KEYWORDS:
            score += 2

    # Check for explicit variable assignment/update (e.g. x = 5, y += 1)
    if re.search(r'^\s*\w+\s*([\+\-\*/%&\|\^<>!=]?)=\s*\S+', line):
        score += 2

    # Check for code syntax patterns
    for pattern in CODE_PATTERNS:
        if pattern.search(line):
            score += 1

    # Check for prose indicators
    for pattern in PROSE_PATTERNS:
        if pattern.search(stripped):
            score -= 3

    # Long lines with mostly alphabetic words and spaces = likely prose
    if len(words) > 8:
        alpha_words = sum(1 for w in words if w.isalpha() and len(w) > 2)
        if alpha_words / len(words) > 0.85:
            score -= 2

    # Very short lines with only a word or two and no special chars = unclear
    if len(words) <= 2 and not any(c in stripped for c in '=(){}[];:#'):
        score -= 1

    return score


def detect_code(text: str, threshold: int = 2) -> str:
    """
    Extract code-like blocks from mixed text.

    Analyzes each line, scores it for code-likeness, groups adjacent
    code lines into blocks, and discards isolated single-line matches.

    Args:
        text: Raw extracted text (may contain prose + code mixed together).
        threshold: Minimum score for a line to be considered code.

    Returns:
        Extracted code as a single string with formatting preserved.
    """
    lines = text.split("\n")
    scored_lines = []

    for i, line in enumerate(lines):
        score = _score_line(line)
        is_code = score >= threshold
        # Blank lines are carried along if between code lines (preserves formatting)
        is_blank = not line.strip()
        scored_lines.append({
            "line": line,
            "score": score,
            "is_code": is_code,
            "is_blank": is_blank,
        })

    # ── Group adjacent code lines into blocks with lookahead bridging ──
    blocks = []
    current_block = []
    gap_lines = []

    for i, entry in enumerate(scored_lines):
        if entry["is_code"]:
            # If we had a temporary gap, bridge it because we found more code!
            if gap_lines:
                current_block.extend(gap_lines)
                gap_lines = []
            current_block.append(entry["line"])
        elif entry["is_blank"]:
            if current_block:
                gap_lines.append(entry["line"])
        else:
            if current_block:
                # Look ahead to see if code continues within next 2 lines
                has_code_ahead = False
                for j in range(i + 1, min(i + 3, len(scored_lines))):
                    if scored_lines[j]["is_code"]:
                        has_code_ahead = True
                        break
                if has_code_ahead:
                    # Bridge this line
                    gap_lines.append(entry["line"])
                else:
                    # No code ahead: terminate the block
                    # Strip trailing blank/gap lines from block
                    while current_block and not current_block[-1].strip():
                        current_block.pop()
                    if current_block:
                        blocks.append(current_block)
                    current_block = []
                    gap_lines = []

    # Don't forget the last block
    if current_block:
        while current_block and not current_block[-1].strip():
            current_block.pop()
        if current_block:
            blocks.append(current_block)

    # ── Filter out blocks that are too short (likely false positives) ──
    # Keep blocks with 2+ actual code lines
    meaningful_blocks = []
    for block in blocks:
        code_lines = [l for l in block if l.strip()]
        if len(code_lines) >= 2:
            meaningful_blocks.append(block)
        elif len(code_lines) == 1:
            # Single line blocks: only keep if they score very high
            line = code_lines[0]
            if _score_line(line) >= 4:
                meaningful_blocks.append(block)

    # ── Combine all accepted blocks ──
    if not meaningful_blocks:
        # If no blocks found, fall back to returning all lines that scored above threshold
        fallback_lines = [entry["line"] for entry in scored_lines if entry["is_code"]]
        return "\n".join(fallback_lines)

    result_parts = []
    for block in meaningful_blocks:
        result_parts.append("\n".join(block))

    return "\n\n".join(result_parts)
