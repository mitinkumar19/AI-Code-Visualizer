"""
PDF Text Extractor
Uses PyMuPDF (fitz) to extract text from PDF files page-by-page.
Preserves formatting and line breaks as much as possible.
"""

import fitz  # PyMuPDF


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from PDF file bytes.

    Args:
        file_bytes: Raw bytes of the uploaded PDF file.

    Returns:
        Combined text string from all pages, preserving line breaks.
    """
    text_parts = []

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text("text")
            if page_text.strip():
                text_parts.append(page_text)
    finally:
        doc.close()

    return "\n".join(text_parts)
