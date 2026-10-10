#!/usr/bin/env python3
"""
scripts/fetchers/base.py
Lớp cơ sở BaseFetcher: Quản lý kết nối HTTP, session, headers,
SSL bypass cho các cổng thông tin Việt Nam, rate limiting và auto-retry.
"""

import sys
import time
import json
import ssl
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from typing import Dict, Any, Optional

CURRENT_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = CURRENT_DIR.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

try:
    from lib.rate_limiter import MultiSourceRateLimiter
except ImportError:
    MultiSourceRateLimiter = None

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

# SSL Context
SSL_UNVERIFIED = ssl._create_unverified_context()
SSL_VERIFIED = ssl.create_default_context()


class BaseFetcher:
    """Lớp nền tảng cho mọi module fetcher."""

    def __init__(self, default_source: str = "DEFAULT"):
        self.default_source = default_source
        self.limiter = MultiSourceRateLimiter() if MultiSourceRateLimiter else None

    def wait_rate_limit(self, source: Optional[str] = None):
        """Chờ nếu vượt quá giới hạn tần suất gọi API."""
        src = source or self.default_source
        if self.limiter:
            self.limiter.wait_if_needed(src)

    def http_get(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        verify_ssl: bool = True,
        retries: int = 2,
        sleep_between_retries: float = 1.0,
    ) -> str:
        """Thực hiện HTTP GET kèm cơ chế retry tự động."""
        self.wait_rate_limit()

        hdrs = {"User-Agent": USER_AGENT}
        if headers:
            hdrs.update(headers)

        ctx = SSL_VERIFIED if verify_ssl else SSL_UNVERIFIED

        for attempt in range(retries + 1):
            try:
                req = urllib.request.Request(url, headers=hdrs)
                with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                    return resp.read().decode("utf-8", errors="ignore")
            except urllib.error.URLError as e:
                err_str = str(e)
                if "CERTIFICATE_VERIFY_FAILED" in err_str and verify_ssl:
                    # Tự động chuyển sang unverified context nếu lỗi chứng chỉ
                    try:
                        req = urllib.request.Request(url, headers=hdrs)
                        with urllib.request.urlopen(req, timeout=timeout, context=SSL_UNVERIFIED) as resp:
                            return resp.read().decode("utf-8", errors="ignore")
                    except Exception:
                        pass

                if attempt < retries:
                    time.sleep(sleep_between_retries * (attempt + 1))
                else:
                    raise e
            except Exception as e:
                if attempt < retries:
                    time.sleep(sleep_between_retries * (attempt + 1))
                else:
                    raise e

        return ""

    def http_post_json(
        self,
        url: str,
        payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        verify_ssl: bool = True,
        retries: int = 2,
    ) -> Dict[str, Any]:
        """Thực hiện HTTP POST JSON payload và parse JSON trả về."""
        self.wait_rate_limit()

        hdrs = {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        }
        if headers:
            hdrs.update(headers)

        body_bytes = json.dumps(payload).encode("utf-8")
        ctx = SSL_VERIFIED if verify_ssl else SSL_UNVERIFIED

        for attempt in range(retries + 1):
            try:
                req = urllib.request.Request(url, data=body_bytes, headers=hdrs)
                with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                    raw_text = resp.read().decode("utf-8", errors="ignore")
                    return json.loads(raw_text)
            except urllib.error.URLError as e:
                err_str = str(e)
                if "CERTIFICATE_VERIFY_FAILED" in err_str and verify_ssl:
                    try:
                        req = urllib.request.Request(url, data=body_bytes, headers=hdrs)
                        with urllib.request.urlopen(req, timeout=timeout, context=SSL_UNVERIFIED) as resp:
                            return json.loads(resp.read().decode("utf-8", errors="ignore"))
                    except Exception:
                        pass

                if attempt < retries:
                    time.sleep(1.0 * (attempt + 1))
                else:
                    raise e
            except Exception as e:
                if attempt < retries:
                    time.sleep(1.0 * (attempt + 1))
                else:
                    raise e

        return {}

    def http_post_form(
        self,
        url: str,
        data: Dict[str, str],
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        verify_ssl: bool = False,
    ) -> str:
        """Thực hiện HTTP POST Form Data (dùng cho HNX search form)."""
        self.wait_rate_limit()

        body = urllib.parse.urlencode(data).encode("utf-8")
        hdrs = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
        }
        if headers:
            hdrs.update(headers)

        ctx = SSL_VERIFIED if verify_ssl else SSL_UNVERIFIED
        req = urllib.request.Request(url, data=body, headers=hdrs)
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return resp.read().decode("utf-8", errors="ignore")
