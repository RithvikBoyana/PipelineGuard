from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

_url: str | None = None
_key: str | None = None


def get_db() -> Client:
    global _url, _key
    if _url is None:
        _url = os.getenv("SUPABASE_URL")
        _key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not _url or not _key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(_url, _key)
