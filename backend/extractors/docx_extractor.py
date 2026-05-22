"""
DOCX Text Extractor
Uses python-docx to extract paragraph text from Word documents.
Preserves line breaks between paragraphs.
"""

import io
from docx import Document


def extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Extract text from DOCX file bytes.

    Args:
        file_bytes: Raw bytes of the uploaded DOCX file.

    Returns:
        Combined text string from all paragraphs, preserving line breaks.
    """
    doc = Document(io.BytesIO(file_bytes))

    paragraphs = []
    for para in doc.paragraphs:
        paragraphs.append(para.text)

    return "\n".join(paragraphs)
