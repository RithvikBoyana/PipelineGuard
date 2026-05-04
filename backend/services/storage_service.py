from db import get_db

BUCKET = "transcripts"


def upload(user_id: str, deal_id: str, transcript_id: str, filename: str, content: bytes) -> str:
    db = get_db()
    path = f"{user_id}/{deal_id}/{transcript_id}/{filename}"
    db.storage.from_(BUCKET).upload(path, content, {"upsert": "true"})
    return path


def delete(file_path: str) -> None:
    db = get_db()
    db.storage.from_(BUCKET).remove([file_path])


def get_signed_url(file_path: str, expires_in: int = 3600) -> str:
    db = get_db()
    result = db.storage.from_(BUCKET).create_signed_url(file_path, expires_in)
    return result["signedURL"]
