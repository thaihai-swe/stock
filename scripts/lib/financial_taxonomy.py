"""
scripts/lib/financial_taxonomy.py
Từ điển ánh xạ chuẩn hóa các chỉ tiêu Báo Cáo Tài Chính Việt Nam (VAS / TT200 / TT202).
Trích xuất và tinh gọn từ stock_database phục vụ cho ứng dụng quản lý và định giá cổ phiếu.
"""

from typing import Dict, Optional, Any

# 1. ÁNH XẠ BẢNG CÂN ĐỐI KẾ TOÁN (BALANCE SHEET)
BALANCE_SHEET_MAPPING: Dict[str, str] = {
    # === Tiếng Anh ===
    'CURRENT ASSETS (Bn. VND)': 'asset_current',
    'Current Assets': 'asset_current',
    'Cash and cash equivalents (Bn. VND)': 'cash_and_equivalents',
    'Cash and cash equivalents': 'cash_and_equivalents',
    'Short-term investments (Bn. VND)': 'short_term_investments',
    'Short-term investments': 'short_term_investments',
    'Accounts receivable (Bn. VND)': 'accounts_receivable',
    'Accounts receivable': 'accounts_receivable',
    'Net Inventories': 'inventory',
    'Inventories, Net (Bn. VND)': 'inventory',
    'Inventories': 'inventory',
    'Other current assets': 'current_assets_other',
    'NON-CURRENT ASSETS (Bn. VND)': 'asset_non_current',
    'Non-current Assets': 'asset_non_current',
    'Fixed assets (Bn. VND)': 'fixed_assets',
    'Fixed assets': 'fixed_assets',
    'Long-term investments': 'long_term_investments',
    'TOTAL ASSETS (Bn. VND)': 'total_assets',
    'Total Assets': 'total_assets',
    'LIABILITIES (Bn. VND)': 'liabilities_total',
    'Total Liabilities': 'liabilities_total',
    'Current Liabilities': 'liabilities_current',
    'Non-current Liabilities': 'liabilities_non_current',
    'Short-term Debt': 'short_term_debt',
    'Long-term Debt': 'long_term_debt',
    "OWNER'S EQUITY (Bn. VND)": 'equity_total',
    "Total Owner's Equity": 'equity_total',
    "Share Capital": 'share_capital',
    "Retained Earnings": 'retained_earnings',

    # === Tiếng Việt (VAS/TT200) ===
    'TÀI SẢN NGẮN HẠN (đồng)': 'asset_current',
    'Tài sản ngắn hạn': 'asset_current',
    'Tiền và tương đương tiền (đồng)': 'cash_and_equivalents',
    'Tiền và các khoản tương đương tiền': 'cash_and_equivalents',
    'Đầu tư tài chính ngắn hạn (đồng)': 'short_term_investments',
    'Các khoản phải thu ngắn hạn (đồng)': 'accounts_receivable',
    'Hàng tồn kho ròng': 'inventory',
    'Hàng tồn kho, ròng (đồng)': 'inventory',
    'Hàng tồn kho': 'inventory',
    'TÀI SẢN DÀI HẠN (đồng)': 'asset_non_current',
    'Tài sản dài hạn': 'asset_non_current',
    'Tài sản cố định (đồng)': 'fixed_assets',
    'Tài sản cố định': 'fixed_assets',
    'Chi phí xây dựng cơ bản dở dang (đồng)': 'construction_in_progress',
    'TỔNG CỘNG TÀI SẢN (đồng)': 'total_assets',
    'Tổng cộng tài sản': 'total_assets',
    'NỢ PHẢI TRẢ (đồng)': 'liabilities_total',
    'Nợ phải trả': 'liabilities_total',
    'Nợ ngắn hạn (đồng)': 'liabilities_current',
    'Nợ ngắn hạn': 'liabilities_current',
    'Nợ dài hạn (đồng)': 'liabilities_non_current',
    'Nợ dài hạn': 'liabilities_non_current',
    'Vay và nợ thuê tài chính ngắn hạn': 'short_term_debt',
    'Vay và nợ thuê tài chính dài hạn': 'long_term_debt',
    'VỐN CHỦ SỞ HỮU (đồng)': 'equity_total',
    'Vốn chủ sở hữu': 'equity_total',
    'Vốn góp của chủ sở hữu (đồng)': 'share_capital',
    'Vốn đầu tư của chủ sở hữu': 'share_capital',
    'Lợi nhuận sau thuế chưa phân phối': 'retained_earnings',
    'Lãi chưa phân phối (đồng)': 'retained_earnings'
}

# 2. ÁNH XẠ BÁO CÁO KẾT QUẢ KINH DOANH (INCOME STATEMENT)
INCOME_STATEMENT_MAPPING: Dict[str, str] = {
    # === Tiếng Anh ===
    'Revenue (Bn. VND)': 'revenue',
    'Revenue': 'revenue',
    'Net Sales': 'net_revenue',
    'Net revenue': 'net_revenue',
    'Cost of Sales': 'cost_of_goods_sold',
    'Cost of Goods Sold': 'cost_of_goods_sold',
    'Gross Profit': 'gross_profit',
    'Financial Income': 'financial_income',
    'Financial Expenses': 'financial_expense',
    'Interest Expenses': 'interest_expense',
    'Selling Expenses': 'selling_expense',
    'General & Admin Expenses': 'admin_expense',
    'Operating Profit/Loss': 'operating_profit',
    'Profit Before Tax': 'profit_before_tax',
    'Net Income': 'net_income',
    'Attributable to Parent Company': 'net_income_parent',
    'EPS basic (VND)': 'eps',

    # === Tiếng Việt ===
    'Doanh thu bán hàng và cung cấp dịch vụ (đồng)': 'revenue',
    'Doanh thu thuần': 'net_revenue',
    'Doanh thu thuần về bán hàng và cung cấp dịch vụ (đồng)': 'net_revenue',
    'Giá vốn hàng bán (đồng)': 'cost_of_goods_sold',
    'Giá vốn hàng bán': 'cost_of_goods_sold',
    'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ (đồng)': 'gross_profit',
    'Lợi nhuận gộp': 'gross_profit',
    'Doanh thu hoạt động tài chính (đồng)': 'financial_income',
    'Chi phí tài chính (đồng)': 'financial_expense',
    'Trong đó: Chi phí lãi vay (đồng)': 'interest_expense',
    'Chi phí lãi vay': 'interest_expense',
    'Chi phí bán hàng (đồng)': 'selling_expense',
    'Chi phí quản lý doanh nghiệp (đồng)': 'admin_expense',
    'Lợi nhuận thuần từ hoạt động kinh doanh (đồng)': 'operating_profit',
    'Tổng lợi nhuận kế toán trước thuế (đồng)': 'profit_before_tax',
    'Lợi nhuận trước thuế': 'profit_before_tax',
    'Lợi nhuận sau thuế thu nhập doanh nghiệp (đồng)': 'net_income',
    'Lợi nhuận của Cổ đông của Công ty mẹ (đồng)': 'net_income_parent',
    'Lợi nhuận sau thuế của công ty mẹ': 'net_income_parent',
    'Lãi cơ bản trên cổ phiếu (VND)': 'eps',
    'EPS cơ bản': 'eps'
}

# 3. ÁNH XẠ BÁO CÁO LƯU CHUYỂN TIỀN TỆ (CASH FLOW STATEMENT)
CASH_FLOW_MAPPING: Dict[str, str] = {
    # === Tiếng Anh ===
    'Operating Cash Flow': 'cfo',
    'Net cash from operating activities': 'cfo',
    'Capital Expenditures': 'capex',
    'Purchase of fixed assets': 'capex',
    'Investing Cash Flow': 'cfi',
    'Net cash from investing activities': 'cfi',
    'Financing Cash Flow': 'cff',
    'Net cash from financing activities': 'cff',
    'Net change in cash': 'net_cash_change',
    'Free Cash Flow': 'free_cash_flow',

    # === Tiếng Việt ===
    'Lưu chuyển tiền thuần từ hoạt động kinh doanh (đồng)': 'cfo',
    'Lưu chuyển tiền thuần từ hoạt động kinh doanh': 'cfo',
    'Tiền chi để mua sắm, xây dựng TSCĐ và các TSDH khác (đồng)': 'capex',
    'Mua sắm tài sản cố định': 'capex',
    'Lưu chuyển tiền thuần từ hoạt động đầu tư (đồng)': 'cfi',
    'Lưu chuyển tiền thuần từ hoạt động đầu tư': 'cfi',
    'Lưu chuyển tiền thuần từ hoạt động tài chính (đồng)': 'cff',
    'Lưu chuyển tiền thuần từ hoạt động tài chính': 'cff',
    'Lưu chuyển tiền thuần trong kỳ (đồng)': 'net_cash_change',
    'Dòng tiền tự do': 'free_cash_flow',
    'Khấu hao TSCĐ': 'depreciation',
    'Khấu hao TSCĐ (đồng)': 'depreciation',
    'Cổ tức đã trả': 'dividends_paid',
    'Cổ tức đã trả (đồng)': 'dividends_paid'
}

# 4. ÁNH XẠ CHỈ SỐ TÀI CHÍNH (FINANCIAL RATIOS - 54 CHỈ TIÊU)
FINANCIAL_RATIOS_MAPPING: Dict[str, str] = {
    # Định giá (Valuation)
    'P/E': 'pe',
    'P/B': 'pb',
    'P/S': 'ps',
    'P/Cash Flow': 'p_cf',
    'EV/EBITDA': 'ev_ebitda',
    'EV/EBIT': 'ev_ebit',
    
    # Sinh lời (Profitability)
    'ROE (%)': 'roe',
    'ROA (%)': 'roa',
    'ROIC (%)': 'roic',
    'Gross Profit Margin (%)': 'gross_margin',
    'Biên lợi nhuận gộp (%)': 'gross_margin',
    'EBIT Margin (%)': 'ebit_margin',
    'Biên EBIT (%)': 'ebit_margin',
    'Net Profit Margin (%)': 'net_profit_margin',
    'Biên lợi nhuận ròng (%)': 'net_profit_margin',
    'EBITDA (Bn. VND)': 'ebitda',
    'EBITDA (Tỷ đồng)': 'ebitda',
    'EBIT (Bn. VND)': 'ebit',
    'EBIT (Tỷ đồng)': 'ebit',
    'Dividend yield (%)': 'dividend_yield',
    'Tỷ suất cổ tức (%)': 'dividend_yield',

    # Thanh khoản (Liquidity)
    'Current Ratio': 'current_ratio',
    'Chỉ số thanh toán hiện thời': 'current_ratio',
    'Quick Ratio': 'quick_ratio',
    'Chỉ số thanh toán nhanh': 'quick_ratio',
    'Cash Ratio': 'cash_ratio',
    'Chỉ số thanh toán tiền mặt': 'cash_ratio',
    'Interest Coverage': 'interest_coverage',
    'Khả năng chi trả lãi vay': 'interest_coverage',

    # Hiệu quả hoạt động (Operating Efficiency)
    'Asset Turnover': 'asset_turnover',
    'Vòng quay tài sản': 'asset_turnover',
    'Inventory Turnover': 'inventory_turnover',
    'Vòng quay hàng tồn kho': 'inventory_turnover',
    'Days Sales Outstanding': 'days_sales_outstanding',
    'Số ngày thu tiền bình quân': 'days_sales_outstanding',
    'Days Inventory Outstanding': 'days_inventory_outstanding',
    'Số ngày tồn kho bình quân': 'days_inventory_outstanding',
    'Days Payable Outstanding': 'days_payable_outstanding',
    'Số ngày thanh toán bình quân': 'days_payable_outstanding',
    'Cash Cycle': 'cash_conversion_cycle',
    'Chu kỳ tiền': 'cash_conversion_cycle',

    # Đòn bẩy & Cơ cấu nợ (Leverage)
    'Debt/Equity': 'debt_to_equity',
    'Nợ/VCSH': 'debt_to_equity',
    '(ST+LT borrowings)/Equity': 'borrowings_to_equity',
    '(Vay NH+DH)/VCSH': 'borrowings_to_equity',
    'Financial Leverage': 'financial_leverage',
    'Đòn bẩy tài chính': 'financial_leverage'
}

def normalize_field_name(raw_name: str, statement_type: str = 'all') -> Optional[str]:
    """
    Chuẩn hóa tên gọi chỉ tiêu BCTC về key tiếng Anh chuẩn.
    """
    clean_name = raw_name.strip()
    
    if statement_type in ('balance_sheet', 'all') and clean_name in BALANCE_SHEET_MAPPING:
        return BALANCE_SHEET_MAPPING[clean_name]
            
    if statement_type in ('income_statement', 'all') and clean_name in INCOME_STATEMENT_MAPPING:
        return INCOME_STATEMENT_MAPPING[clean_name]
            
    if statement_type in ('cash_flow', 'all') and clean_name in CASH_FLOW_MAPPING:
        return CASH_FLOW_MAPPING[clean_name]

    if statement_type in ('ratios', 'all') and clean_name in FINANCIAL_RATIOS_MAPPING:
        return FINANCIAL_RATIOS_MAPPING[clean_name]
            
    # Fuzzy match bỏ dấu ngoặc đơn
    clean_no_parenthesis = clean_name.split('(')[0].strip()
    for mapping in [BALANCE_SHEET_MAPPING, INCOME_STATEMENT_MAPPING, CASH_FLOW_MAPPING, FINANCIAL_RATIOS_MAPPING]:
        for k, v in mapping.items():
            if k.split('(')[0].strip().lower() == clean_no_parenthesis.lower():
                return v
                
    return None
