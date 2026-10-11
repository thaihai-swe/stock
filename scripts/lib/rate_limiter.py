"""
scripts/lib/rate_limiter.py
Quản lý giới hạn tần suất gửi yêu cầu (Rate Limiter) đa nguồn (VCI, TCBS, TradingView).
Ngăn chặn hiện tượng nghẽn mạng và chống bị máy chủ dịch vụ chặn IP (HTTP 429 / 403).
"""

import time
import logging
from datetime import datetime
from collections import defaultdict
from typing import Dict

try:
    from .config_loader import get_system_config
except ImportError:
    try:
        from lib.config_loader import get_system_config
    except ImportError:
        from scripts.lib.config_loader import get_system_config

logger = logging.getLogger(__name__)

class MultiSourceRateLimiter:
    """
    Theo dõi và áp dụng giới hạn tốc độ riêng biệt cho từng nguồn:
    - VCI / VietCap: 45 req/min
    - TCBS: 45 req/min
    - TradingView: 60 req/min
    """

    def __init__(self, default_requests_per_minute: int = 45):
        sys_cfg = get_system_config()
        configured_limits = sys_cfg.get("rateLimitsPerMinute", {})
        self.default_limit = configured_limits.get("DEFAULT", default_requests_per_minute)
        self.source_limits: Dict[str, int] = {
            'VCI': configured_limits.get('VCI', 45),
            'TCBS': configured_limits.get('TCBS', 45),
            'TRADINGVIEW': configured_limits.get('TRADINGVIEW', 60),
        }
        self.minute_counts = defaultdict(int)
        self.last_minute_reset = defaultdict(datetime.now)

    def get_rate_limit(self, source: str) -> int:
        return self.source_limits.get(source.upper(), self.default_limit)

    def set_rate_limit(self, source: str, limit: int):
        self.source_limits[source.upper()] = limit

    def wait_if_needed(self, source: str = 'VCI'):
        """Kiểm tra và chủ động ngủ (sleep) nếu đã chạm ngưỡng giới hạn của phút hiện tại."""
        src = source.upper()
        now = datetime.now()
        last_reset = self.last_minute_reset[src]

        # Reset bộ đếm nếu đã qua 60 giây
        if (now - last_reset).total_seconds() >= 60:
            self.minute_counts[src] = 0
            self.last_minute_reset[src] = now

        limit = self.get_rate_limit(src)
        if self.minute_counts[src] >= limit:
            sleep_time = max(1.0, 60.0 - (now - last_reset).total_seconds())
            logger.warning(f"⚠️ Chạm ngưỡng rate limit cho {src} ({limit} req/min). Đang tạm dừng {sleep_time:.1f}s...")
            time.sleep(sleep_time)
            self.minute_counts[src] = 0
            self.last_minute_reset[src] = datetime.now()

        # Tăng bộ đếm và sleep nhẹ 0.15s giữa các request liên tiếp để giãn cách tự nhiên
        self.minute_counts[src] += 1
        time.sleep(0.15)
