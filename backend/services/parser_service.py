import io
from pypdf import PdfReader
from docx import Document


def parse(content: bytes, filename: str | None) -> str:
    if not filename:
        return content.decode("utf-8", errors="replace")

    ext = filename.rsplit(".", 1)[-1].lower()

    if ext == "txt":
        return content.decode("utf-8", errors="replace")

    if ext == "pdf":
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages)

    if ext == "docx":
        doc = Document(io.BytesIO(content))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)

    raise ValueError(f"Unsupported file type: .{ext}. Supported types: .txt, .pdf, .docx")
