"""
Language Detector — Rule-based programming language identification.

Uses keyword counting and pattern matching to identify the programming
language of a code snippet. Supports Python, Java, C++, C, and JavaScript.
No ML models — pure heuristic detection.
"""

import re
from typing import Dict


def _count_patterns(code: str, patterns: list) -> int:
    """Count how many patterns match in the code."""
    count = 0
    for pattern in patterns:
        if isinstance(pattern, str):
            count += len(re.findall(re.escape(pattern), code))
        else:
            count += len(pattern.findall(code))
    return count


# ── Language signature definitions ──
# Each language has a list of (signal, weight) pairs.
# Signals can be literal strings or compiled regex patterns.

LANGUAGE_SIGNATURES: Dict[str, list] = {
    "Python": [
        ("def ", 3),
        ("print(", 3),
        ("import ", 2),
        ("from ", 2),
        ("elif ", 4),       # Very Python-specific
        ("self.", 4),       # Very Python-specific
        ("__init__", 5),    # Very Python-specific
        ("range(", 3),
        ("len(", 2),
        ("True", 1),
        ("False", 1),
        ("None", 2),
        ("lambda ", 3),
        ("yield ", 3),
        ("except ", 3),     # Python-style exception handling
        ("f\"", 3),         # f-strings
        ("f'", 3),          # f-strings
        (re.compile(r':\s*$', re.MULTILINE), 2),   # Colon at end of line
        (re.compile(r'^\s*#\s*\w', re.MULTILINE), 1),  # Python comments
        (re.compile(r'if\s+\w+.*:', re.MULTILINE), 2),
        (re.compile(r'for\s+\w+\s+in\s+', re.MULTILINE), 4),  # Very Python
    ],
    "Java": [
        ("public ", 3),
        ("private ", 3),
        ("protected ", 2),
        ("static ", 2),
        ("void ", 3),
        ("String ", 2),
        ("System.out", 5),       # Very Java-specific
        (".println", 4),
        (".print(", 2),
        ("new ", 2),
        ("class ", 2),
        ("extends ", 4),         # Java-specific
        ("implements ", 5),      # Very Java-specific
        ("interface ", 3),
        ("@Override", 5),        # Very Java-specific
        ("throws ", 4),
        ("catch (", 2),
        ("import java.", 5),     # Very Java-specific
        (re.compile(r'public\s+static\s+void\s+main'), 10),  # Main method
        (re.compile(r';\s*$', re.MULTILINE), 1),
    ],
    "C++": [
        ("#include", 3),
        ("cout", 4),             # C++ specific
        ("cin", 4),              # C++ specific
        ("endl", 4),             # C++ specific
        ("std::", 5),            # Very C++ specific
        ("using namespace", 5),  # Very C++ specific
        ("nullptr", 5),          # C++ specific
        ("template", 3),
        ("class ", 2),
        ("virtual ", 3),
        ("->", 1),
        (re.compile(r'int\s+main\s*\('), 3),
        (re.compile(r'#include\s*<\w+>'), 3),
        (re.compile(r'::\w+'), 2),  # Scope resolution
        (re.compile(r'<<|>>'), 2),  # Stream operators
    ],
    "C": [
        ("#include", 3),
        ("printf(", 5),          # Very C specific
        ("scanf(", 5),           # Very C specific
        ("malloc(", 5),          # Very C specific
        ("free(", 4),
        ("sizeof(", 3),
        ("NULL", 3),
        ("struct ", 3),
        ("typedef ", 3),
        (re.compile(r'int\s+main\s*\('), 3),
        (re.compile(r'#include\s*<stdio\.h>'), 5),
        (re.compile(r'#include\s*<stdlib\.h>'), 5),
        (re.compile(r'#define\s+\w+'), 2),
        (re.compile(r';\s*$', re.MULTILINE), 1),
    ],
    "JavaScript": [
        ("const ", 3),
        ("let ", 3),
        ("var ", 2),
        ("=>", 4),               # Arrow functions
        ("console.log", 5),      # Very JS specific
        ("function ", 3),
        ("document.", 4),        # DOM specific
        ("require(", 4),         # Node.js
        ("module.exports", 5),   # Node.js specific
        ("async ", 3),
        ("await ", 3),
        ("undefined", 3),
        ("null", 1),
        ("===", 4),              # Strict equality (very JS)
        ("!==", 4),              # Strict inequality
        ("export ", 3),
        ("import ", 2),
        (re.compile(r'`.*\$\{'), 3),  # Template literals
        (re.compile(r'\.then\('), 3),  # Promise chaining
        (re.compile(r'\.map\(|\.filter\(|\.reduce\('), 2),
    ],
}


def detect_language(code: str) -> str:
    """
    Detect the programming language of a code snippet.

    Uses weighted keyword/pattern counting across all supported languages.
    Returns the language with the highest confidence score.

    Args:
        code: The code snippet to analyze.

    Returns:
        Detected language name (e.g., "Python", "Java") or "Unknown".
    """
    if not code or not code.strip():
        return "Unknown"

    scores = {}

    for language, signatures in LANGUAGE_SIGNATURES.items():
        total_score = 0
        for signal, weight in signatures:
            if isinstance(signal, str):
                # Count occurrences of literal string
                count = code.count(signal)
            else:
                # Count regex matches
                count = len(signal.findall(code))

            total_score += count * weight

        scores[language] = total_score

    # C and C++ disambiguation: if both score high, C++ signals take priority
    if scores.get("C", 0) > 0 and scores.get("C++", 0) > 0:
        # If C++ specific signals are present, reduce C score
        if any(sig in code for sig in ["cout", "cin", "std::", "using namespace", "nullptr"]):
            scores["C"] = max(0, scores["C"] - scores["C++"])

    # Find the winner
    if not scores:
        return "Unknown"

    best_language = max(scores, key=scores.get)
    best_score = scores[best_language]

    # Require a minimum confidence threshold
    if best_score < 3:
        return "Unknown"

    return best_language
