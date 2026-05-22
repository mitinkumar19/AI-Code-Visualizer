"""
Upload Route — File upload endpoint for code extraction pipeline.

Accepts PDF, DOCX, and image files, extracts text, detects code blocks,
identifies the programming language, and returns the result as JSON.
"""

import os
from fastapi import APIRouter, UploadFile, File, HTTPException

from extractors.pdf_extractor import extract_text_from_pdf
from extractors.docx_extractor import extract_text_from_docx
from extractors.image_ocr import extract_text_from_image
from nlp.code_detector import detect_code
from nlp.language_detector import detect_language

router = APIRouter()

# Supported file extensions
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a file and extract code from it.

    Accepts: PDF, DOCX, PNG, JPG, JPEG
    Returns: { "language": "Python", "code": "..." }
    """
    # Validate file extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: '{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    try:
        # Read file bytes
        file_bytes = await file.read()

        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Step 1: Extract raw text based on file type
        if ext == ".pdf":
            raw_text = extract_text_from_pdf(file_bytes)
        elif ext == ".docx":
            raw_text = extract_text_from_docx(file_bytes)
        elif ext in {".png", ".jpg", ".jpeg"}:
            raw_text = extract_text_from_image(file_bytes)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")

        if not raw_text or not raw_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract any text from the uploaded file."
            )

        # Step 2: Detect code blocks from extracted text
        code = detect_code(raw_text)

        if not code or not code.strip():
            # If code detector didn't find blocks, return the raw text as fallback
            code = raw_text.strip()

        # Step 3: Detect programming language
        language = detect_language(code)

        return {
            "language": language,
            "code": code.strip(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )
