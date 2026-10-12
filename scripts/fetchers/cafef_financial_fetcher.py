#!/usr/bin/env python3
"""
scripts/fetchers/cafef_financial_fetcher.py
Module cào dữ liệu Báo Cáo Tài Chính dự phòng cấp 3 (Tier 3 Fallback) từ CafeF.
Đóng vai trò:
1. Fallback khi cả Yahoo Finance và vnstock đều không có dữ liệu (mã UPCoM, công ty quy mô nhỏ).
2. Deep Historical Backfill: Hỗ trợ bù đắp các kỳ lịch sử sâu (2018-2021, 2014-2017) mà các API nguồn miễn phí không cung cấp.
Chuẩn hóa đơn vị: VNĐ ➔ Tỷ đồng (Bn. VND).
"""

from __future__ import annotations

import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    from curl_cffi import requests
except ImportError:
    import requests  # fallback if curl_cffi not present

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None


class CafeFFinancialFetcher:
    """Fetcher chuyên cào BCTC từ cổng dữ liệu tài chính s.cafef.vn."""

    BASE_URL = "https://s.cafef.vn/bao-cao-tai-chinh"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://s.cafef.vn/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    SCALE = 1_000_000_000.0  # Quy đổi về Tỷ đồng (Bn. VND)

    def __init__(self, timeout: int = 10):
        self.timeout = timeout

    @staticmethod
    def _parse_num(txt: str) -> float:
        """Chuyển đổi chuỗi số có dấu chấm (37.950.635.502.050 hoặc âm trong ngoặc) sang float."""
        if not txt:
            return 0.0
        txt = txt.strip()
        is_neg = False
        if txt.startswith("(") and txt.endswith(")"):
            is_neg = True
            txt = txt[1:-1]
        elif txt.startswith("-"):
            is_neg = True
            txt = txt[1:]
        txt = txt.replace(".", "").replace(",", ".")
        try:
            val = float(txt)
            return -val if is_neg else val
        except (ValueError, TypeError):
            return 0.0

    def _get_soup(self, url: str) -> Optional[BeautifulSoup]:
        """Tải trang web qua curl_cffi (impersonate='chrome120') và parse BeautifulSoup."""
        if BeautifulSoup is None:
            return None
        try:
            if hasattr(requests, "Session") and "impersonate" in getattr(requests.get, "__code__", {}).co_varnames:
                r = requests.get(url, headers=self.HEADERS, impersonate="chrome120", timeout=self.timeout)
            else:
                r = requests.get(url, headers=self.HEADERS, timeout=self.timeout)
            if r.status_code == 200 and r.text:
                return BeautifulSoup(r.text, "html.parser")
        except Exception as e:
            pass
        return None

    def _scrape_report_table(self, symbol: str, report_type: str, year: int, quarter: int) -> Tuple[List[str], Dict[str, Dict[str, float]]]:
        """
        Cào một bảng BCTC từ CafeF (incsta, bsheet, cashflow).
        quarter = 0: Lấy báo cáo theo năm (4 năm gần nhất).
        quarter = 1..4: Lấy báo cáo theo quý (4 quý gần nhất).
        """
        url = f"{self.BASE_URL}/{symbol.upper()}/{report_type}/{year}/{quarter}/0/0/bao-cao.chn"
        soup = self._get_soup(url)
        if not soup:
            return [], {}

        tbl_content = soup.find("table", {"id": "tableContent"})
        if not tbl_content:
            return [], {}

        # Lấy bảng chứa hàng tiêu đề kỳ báo cáo
        prev_table = tbl_content.find_previous("table")
        periods = []
        if prev_table:
            rows = prev_table.find_all("tr")
            if rows:
                cols = rows[0].find_all(["td", "th"])
                for c in cols[1:]:
                    txt = c.get_text(strip=True)
                    if quarter > 0:
                        m = re.search(r"Quý\s*(\d)[-\s]+(\d{4})", txt)
                        if m:
                            periods.append(f"{m.group(2)}-Q{m.group(1)}")
                    else:
                        m = re.search(r"\b(20\d\d)\b", txt)
                        if m:
                            periods.append(m.group(1))

        if not periods:
            return [], {}

        # Bóc tách từng dòng chỉ tiêu
        data_by_period: Dict[str, Dict[str, float]] = {p: {} for p in periods}
        for tr in tbl_content.find_all("tr"):
            cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
            if not cells or not cells[0]:
                continue
            item_name = cells[0].strip()
            is_per_share = any(k in item_name.lower() for k in [
                "lãi cơ bản trên cổ phiếu", "eps", "pha loãng", "cổ tức trên mỗi cổ phiếu", "giá trị sổ sách"
            ])
            for idx, p in enumerate(periods):
                if idx + 1 < len(cells):
                    raw_val = self._parse_num(cells[idx + 1])
                    val = round(raw_val) if is_per_share else round(raw_val / self.SCALE)
                    data_by_period[p][item_name] = val

        return periods, data_by_period

    def fetch_statements(self, symbol: str, backfill_deep: bool = False) -> Optional[Dict[str, Any]]:
        """
        Thu thập trọn vẹn 3 BCTC (KQKD, CĐKT, LCTT) cho chuỗi Quý và Năm từ CafeF.
        Nếu backfill_deep=True: Lấy thêm các năm và quý quá khứ (lùi về 2021).
        """
        sym = symbol.strip().upper()
        cur_year = datetime.now().year
        cur_quarter = (datetime.now().month - 1) // 3 + 1
        latest_q = cur_quarter - 1
        latest_y = cur_year
        if latest_q == 0:
            latest_q = 4
            latest_y -= 1

        try:
            # 1. THU THẬP BCTC QUÝ (QUARTERLY STATEMENTS)
            inc_periods, inc_q = self._scrape_report_table(sym, "incsta", latest_y, latest_q)
            bs_periods, bs_q = self._scrape_report_table(sym, "bsheet", latest_y, latest_q)
            cf_periods, cf_q = self._scrape_report_table(sym, "cashflow", latest_y, latest_q)

            # 2. THU THẬP BCTC NĂM (ANNUAL STATEMENTS)
            inc_y_periods, inc_y = self._scrape_report_table(sym, "incsta", latest_y, 0)
            bs_y_periods, bs_y = self._scrape_report_table(sym, "bsheet", latest_y, 0)
            cf_y_periods, cf_y = self._scrape_report_table(sym, "cashflow", latest_y, 0)

            # Nếu yêu cầu backfill sâu, lấy thêm một đợt 4 năm trước đó (lùi 4 năm)
            if backfill_deep:
                older_y = latest_y - 4
                inc_y2_periods, inc_y2 = self._scrape_report_table(sym, "incsta", older_y, 0)
                bs_y2_periods, bs_y2 = self._scrape_report_table(sym, "bsheet", older_y, 0)
                cf_y2_periods, cf_y2 = self._scrape_report_table(sym, "cashflow", older_y, 0)
                # Gộp vào dictionary
                for p, items in inc_y2.items():
                    inc_y.setdefault(p, {}).update(items)
                for p, items in bs_y2.items():
                    bs_y.setdefault(p, {}).update(items)
                for p, items in cf_y2.items():
                    cf_y.setdefault(p, {}).update(items)

            # Hàm ánh xạ chỉ tiêu theo từ điển tiếng Việt chuẩn VAS TT200
            def map_period_record(p_str: str, inc_m: Dict, bs_m: Dict, cf_m: Dict, is_quarter: bool = True) -> Optional[Dict[str, Any]]:
                def get_v(m: Dict, patterns: List[str]) -> float:
                    # 1. So khớp chính xác tuyệt đối trước
                    for pat in patterns:
                        pat_clean = pat.strip().lower()
                        for k, v in m.items():
                            if k.strip().lower() == pat_clean:
                                return float(v)
                    # 2. So khớp chuỗi con nếu không có khớp tuyệt đối
                    for pat in patterns:
                        pat_clean = pat.strip().lower()
                        for k, v in m.items():
                            if pat_clean in k.lower():
                                return float(v)
                    return 0.0

                rev = get_v(inc_m, ["Doanh thu thuần về bán hàng", "Doanh thu thuần", "Doanh thu bán hàng"])
                cogs = get_v(inc_m, ["Giá vốn hàng bán"])
                gp = get_v(inc_m, ["Lợi nhuận gộp"])
                if gp == 0 and rev > 0 and cogs > 0:
                    gp = rev - cogs

                fin_inc = get_v(inc_m, ["Doanh thu hoạt động tài chính"])
                fin_exp = get_v(inc_m, ["Chi phí tài chính"])
                interest = get_v(inc_m, ["Chi phí lãi vay", "- Trong đó: Chi phí lãi vay"])
                selling = get_v(inc_m, ["Chi phí bán hàng"])
                admin = get_v(inc_m, ["Chi phí quản lý"])
                op_exp = selling + admin if (selling or admin) else 0.0
                op_inc = get_v(inc_m, ["Lợi nhuận thuần từ hoạt động kinh doanh"])
                pbt = get_v(inc_m, ["Tổng lợi nhuận kế toán trước thuế", "Lợi nhuận trước thuế"])
                tax = get_v(inc_m, ["Chi phí thuế TNDN hiện hành", "Chi phí thuế thu nhập"])
                ni = get_v(inc_m, ["Lợi nhuận sau thuế thu nhập doanh nghiệp", "Lợi nhuận sau thuế"])
                ni_parent = get_v(inc_m, ["cổ đông của công ty mẹ", "cổ đông công ty mẹ"]) or ni
                eps = get_v(inc_m, ["Lãi cơ bản trên cổ phiếu"])

                # CĐKT
                total_assets = get_v(bs_m, ["TỔNG CỘNG TÀI SẢN", "Tổng tài sản"])
                st_assets = get_v(bs_m, ["A- TÀI SẢN NGẮN HẠN", "Tài sản ngắn hạn"])
                lt_assets = get_v(bs_m, ["B. TÀI SẢN DÀI HẠN", "B- TÀI SẢN DÀI HẠN", "Tài sản dài hạn"])
                nguon_von = get_v(bs_m, ["TỔNG CỘNG NGUỒN VỐN", "Tổng cộng nguồn vốn"])
                cash = get_v(bs_m, ["Tiền và các khoản tương đương tiền"])
                st_inv = get_v(bs_m, ["Các khoản đầu tư tài chính ngắn hạn"])
                rec = get_v(bs_m, ["Các khoản phải thu ngắn hạn"])
                inv = get_v(bs_m, ["Hàng tồn kho"])
                fixed_assets = get_v(bs_m, ["Tài sản cố định"])
                cip = get_v(bs_m, ["Chi phí xây dựng cơ bản dở dang"])

                total_debt = get_v(bs_m, ["A- NỢ PHẢI TRẢ", "C. NỢ PHẢI TRẢ", "Nợ phải trả"])
                st_debt = get_v(bs_m, ["I. Nợ ngắn hạn", "Nợ ngắn hạn"])
                lt_debt = get_v(bs_m, ["II. Nợ dài hạn", "Nợ dài hạn"])
                equity = get_v(bs_m, ["B- VỐN CHỦ SỞ HỮU", "D.VỐN CHỦ SỞ HỮU", "D. VỐN CHỦ SỞ HỮU", "Vốn chủ sở hữu"])
                share_capital = get_v(bs_m, ["Vốn góp của chủ sở hữu", "Vốn đầu tư của chủ sở hữu"])
                retained_earnings = get_v(bs_m, ["Lợi nhuận sau thuế chưa phân phối"])

                # Sanity check kế toán: Tổng tài sản = Tài sản ngắn hạn + Tài sản dài hạn = Tổng nguồn vốn
                if total_assets == 0 or (st_assets > 0 and total_assets < st_assets):
                    total_assets = max(total_assets, st_assets + lt_assets, nguon_von, total_debt + equity)

                # LCTT (Universal Taxonomy: CafeF)
                cfo = get_v(cf_m, [
                    "Lưu chuyển tiền thuần từ hoạt động kinh doanh",
                    "Lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh",
                    "Lưu chuyển tiền thuần từ HĐKD"
                ])
                cfi = get_v(cf_m, [
                    "Lưu chuyển tiền thuần từ hoạt động đầu tư"
                ])
                cff = get_v(cf_m, [
                    "Lưu chuyển tiền thuần từ hoạt động tài chính"
                ])
                depr = get_v(cf_m, [
                    "Khấu hao TSCĐ và BĐSĐT",
                    "Khấu hao TSCĐ",
                    "- Khấu hao"
                ])
                capex = get_v(cf_m, [
                    "Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác",
                    "Tiền chi để mua sắm, xây dựng TSCĐ",
                    "1.Tiền chi để mua sắm, xây dựng TSCĐ và các tài sản dài hạn khác",
                    "Tiền chi mua sắm"
                ])
                if capex > 0:
                    capex = -capex
                div_paid = get_v(cf_m, [
                    "Cổ tức, lợi nhuận đã trả cho chủ sở hữu",
                    "Tiền trả cổ tức, lợi nhuận cho chủ sở hữu"
                ])
                net_cash = get_v(cf_m, [
                    "Lưu chuyển tiền thuần trong kỳ",
                    "Tiền và tương đương tiền cuối kỳ"
                ])
                fcf = cfo + capex if (cfo or capex) else 0.0

                if rev == 0 and total_assets == 0 and equity == 0:
                    return None

                rec_dict = {
                    "revenue": rev,
                    "costOfGoodsSold": cogs,
                    "grossProfit": gp,
                    "financialIncome": fin_inc,
                    "financialExpense": fin_exp,
                    "interestExpense": interest,
                    "sellingExpense": selling,
                    "adminExpense": admin,
                    "operatingExpense": op_exp,
                    "operatingProfit": op_inc,
                    "profitBeforeTax": pbt,
                    "taxExpense": tax,
                    "netIncome": ni,
                    "netIncomeParent": ni_parent,
                    "eps": eps,
                    "netMargin": round((ni / rev) * 100, 2) if rev > 0 else 0.0,
                    "grossMargin": round((gp / rev) * 100, 2) if rev > 0 else 0.0,
                    "cashAndEquivalents": cash,
                    "shortTermInvestments": st_inv,
                    "accountsReceivable": rec,
                    "inventory": inv,
                    "shortTermAssets": st_assets,
                    "fixedAssets": fixed_assets,
                    "constructionInProgress": cip,
                    "totalAssets": total_assets,
                    "shortTermDebt": st_debt,
                    "longTermDebt": lt_debt,
                    "totalDebt": total_debt,
                    "shareCapital": share_capital,
                    "retainedEarnings": retained_earnings,
                    "equity": equity,
                    "depreciation": depr,
                    "cfo": cfo,
                    "capex": capex,
                    "cfi": cfi,
                    "cff": cff,
                    "dividendsPaid": div_paid,
                    "netCashChange": net_cash,
                    "freeCashFlow": fcf,
                    "cfoToNetIncome": round(cfo / ni, 2) if ni > 0 else 1.0,
                }

                if is_quarter:
                    rec_dict["period"] = p_str
                else:
                    rec_dict["year"] = p_str
                    rec_dict["ebitda"] = round(ni + interest + depr)
                    rec_dict["roe"] = round((ni / equity) * 100, 2) if equity > 0 else 0.0
                    rec_dict["roa"] = round((ni / total_assets) * 100, 2) if total_assets > 0 else 0.0
                    rec_dict["debtToEquity"] = round(total_debt / equity, 2) if equity > 0 else 0.0
                    rec_dict["currentRatio"] = round(st_assets / st_debt, 2) if st_debt > 0 else 1.8

                return rec_dict

            # Tổng hợp chuỗi quý
            all_q_periods = sorted(list(set(inc_q.keys()) | set(bs_q.keys()) | set(cf_q.keys())))
            quarterly_records = []
            for qp in all_q_periods:
                r = map_period_record(qp, inc_q.get(qp, {}), bs_q.get(qp, {}), cf_q.get(qp, {}), is_quarter=True)
                if r:
                    quarterly_records.append(r)

            # Tổng hợp chuỗi năm
            all_y_periods = sorted(list(set(inc_y.keys()) | set(bs_y.keys()) | set(cf_y.keys())), key=lambda x: int(x) if x.isdigit() else 0)
            annual_records = []
            for yp in all_y_periods:
                r = map_period_record(yp, inc_y.get(yp, {}), bs_y.get(yp, {}), cf_y.get(yp, {}), is_quarter=False)
                if r:
                    annual_records.append(r)

            if len(quarterly_records) >= 1 or len(annual_records) >= 1:
                return {
                    "source": "CafeF HTML Financial Statements Archive (VAS TT200)",
                    "quarterly": quarterly_records,
                    "annual": annual_records,
                }

        except Exception as e:
            pass

        return None
