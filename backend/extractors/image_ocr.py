"""
Image OCR Extractor
Uses EasyOCR to extract readable text from code screenshots and images.
Lazy-initializes the OCR reader as a singleton to avoid reloading on every request.
"""

import easyocr
import numpy as np
from PIL import Image
import io
import re

# Singleton reader — initialized on first use to avoid startup delay
_reader = None


def _get_reader():
    """Get or create the EasyOCR reader singleton."""
    global _reader
    if _reader is None:
        # gpu=False keeps it lightweight and avoids CUDA dependency
        _reader = easyocr.Reader(["en"], gpu=False)
    return _reader


def extract_text_from_image(file_bytes: bytes) -> str:
    """
    Extract text from an image file using OCR with precise spatial reconstruction
    of lines and code indentation.

    Args:
        file_bytes: Raw bytes of the uploaded image file (PNG/JPG/JPEG).

    Returns:
        Extracted text string with lines joined by newlines, preserving indentation.
    """
    # Convert bytes to numpy array for EasyOCR
    image = Image.open(io.BytesIO(file_bytes))
    image_np = np.array(image)

    reader = _get_reader()
    
    # Use tuned parameters to capture fine code details, operators, and small characters
    results = reader.readtext(
        image_np,
        text_threshold=0.3,
        low_text=0.2,
        link_threshold=0.3,
        decoder='greedy'
    )

    if not results:
        return ""

    # Parse and construct blocks with coordinates
    blocks = []
    for box, text, conf in results:
        xs = [pt[0] for pt in box]
        ys = [pt[1] for pt in box]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        h = max_y - min_y
        w = max_x - min_x
        blocks.append({
            "min_x": min_x,
            "max_x": max_x,
            "min_y": min_y,
            "max_y": max_y,
            "height": h,
            "width": w,
            "text": text,
            "conf": conf
        })

    # Sort blocks vertically first
    blocks.sort(key=lambda b: b["min_y"])

    # Group blocks into distinct text lines based on vertical overlap
    lines = []
    for b in blocks:
        placed = False
        for line in lines:
            # Check overlap height
            overlap_min = max(line["min_y"], b["min_y"])
            overlap_max = min(line["max_y"], b["max_y"])
            overlap = overlap_max - overlap_min
            
            # If vertical overlap is significant (> 40% of either block's height)
            min_h = min(line["height"], b["height"])
            if overlap > 0.4 * min_h:
                line["blocks"].append(b)
                line["min_y"] = min(line["min_y"], b["min_y"])
                line["max_y"] = max(line["max_y"], b["max_y"])
                line["height"] = line["max_y"] - line["min_y"]
                placed = True
                break
        if not placed:
            lines.append({
                "min_y": b["min_y"],
                "max_y": b["max_y"],
                "height": b["height"],
                "blocks": [b]
            })

    # Process and horizontally sort each line
    reconstructed_lines = []
    for line in lines:
        # Sort blocks within the line horizontally (left-to-right)
        line["blocks"].sort(key=lambda b: b["min_x"])
        
        merged_text = ""
        first_block = line["blocks"][0]
        line_start_x = first_block["min_x"]
        
        prev_max_x = None
        for b in line["blocks"]:
            if prev_max_x is not None:
                # Add a space if the horizontal gap is larger than 1.2 * average character width
                char_w = b["width"] / max(len(b["text"]), 1)
                gap = b["min_x"] - prev_max_x
                if gap > 1.2 * char_w:
                    merged_text += " "
            merged_text += b["text"]
            prev_max_x = b["max_x"]
            
        reconstructed_lines.append({
            "start_x": line_start_x,
            "min_y": line["min_y"],
            "text": merged_text
        })

    # Sort the reconstructed lines vertically to ensure perfect vertical ordering
    reconstructed_lines.sort(key=lambda l: l["min_y"])

    # Indentation Reconstruction Heuristics
    if reconstructed_lines:
        baseline_x = min(l["start_x"] for l in reconstructed_lines)
        
        # Estimate the indentation step (e.g. 4 spaces) in pixels
        starts = sorted(l["start_x"] for l in reconstructed_lines)
        diffs = [s - baseline_x for s in starts if s - baseline_x > 8]
        
        # Establish minimum indent unit width (at least 12 pixels is safe)
        indent_unit = min(diffs) if diffs else 20
        if indent_unit < 12:
            indent_unit = 12
            
        final_code_lines = []
        for l in reconstructed_lines:
            rel_x = l["start_x"] - baseline_x
            num_indents = round(rel_x / indent_unit) if indent_unit > 0 else 0
            indent_str = "    " * num_indents
            
            # Post-process common OCR syntax/character mistakes
            cleaned_text = l["text"]
            
            # 1. OCR letter-to-number confusion inside range() call (l or I -> 1)
            cleaned_text = re.sub(r'\brange\(\s*l\b', 'range(1', cleaned_text)
            cleaned_text = re.sub(r'\brange\(\s*I\b', 'range(1', cleaned_text)
            
            # 2. Re-combine split arithmetic operators (e.g. "* =" to "*=")
            cleaned_text = re.sub(r'([\+\-\*/%&\|\^<>!=])\s*=', r'\1=', cleaned_text)
            
            final_code_lines.append(f"{indent_str}{cleaned_text}")
            
        return "\n".join(final_code_lines)
        
    return ""
