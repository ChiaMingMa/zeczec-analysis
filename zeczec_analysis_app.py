import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import io
import plotly.express as px
import plotly.graph_objects as go

# 成本對照表
COST_MAP = {
    '早鳥 1 入｜個人獨享組': 920,
    '好膝力 Pro': 461,
    '好腿力（鋼珠款單隻）': 483,
    '海浪枕布套 1入': 150,
    '雙層氣壓按摩眼罩': 572,
    '海浪枕布套 2入': 300,
    '分享 2 入｜一起做夢組': 1840,
    '團購 4 入｜全家一起睡': 3680,
    '團購 10 入｜超值揪團': 9200,
    '加購｜海浪枕布套 1入': 150,
    '加購｜海浪枕布套 2入': 300
}

def read_uploaded_files(uploaded_files):
    """讀取上傳的 CSV/Excel 檔案並合併"""
    dfs = []
    for file in uploaded_files:
        if file.name.endswith('.csv'):
            df = pd.read_csv(file)
            dfs.append(df)
        elif file.name.endswith(('.xlsx', '.xls')):
            # 讀取所有工作表
            excel_file = pd.ExcelFile(file)
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file, sheet_name=sheet_name)
                dfs.append(df)
    
    if dfs:
        return pd.concat(dfs, ignore_index=True)
    return pd.DataFrame()

def process_order_data(df):
    """處理訂單資料"""
    if df.empty:
        return pd.DataFrame()
    
    # 確保必要欄位存在
    required_cols = ['訂單編號', '付款時間', '贊助選項名稱', '總金額']
    if not all(col in df.columns for col in required_cols):
        st.error(f"訂單資料缺少必要欄位：{required_cols}")
        return pd.DataFrame()
    
    # 過濾：僅保留有付款時間的訂單
    df = df[df['付款時間'].notna()].copy()
    
    if df.empty:
        st.warning("沒有找到已付款的訂單")
        return pd.DataFrame()
    
    # 轉換付款時間為日期
    df['付款時間'] = pd.to_datetime(df['付款時間'], errors='coerce')
    df = df[df['付款時間'].notna()]
    df['Date'] = df['付款時間'].dt.date
    
    # 計算每個商品的成本
    df['商品成本'] = df['贊助選項名稱'].map(COST_MAP).fillna(0)
    
    # 按訂單編號分組聚合
    order_agg = df.groupby('訂單編號').agg({
        'Date': 'first',
        '總金額': 'sum',
        '商品成本': 'sum',
        '建立時間': 'first',
        '導購': 'first'
    }).reset_index()
    
    order_agg.columns = ['訂單編號', 'Date', '訂單總金額', '訂單總成本', '建立時間', '導購']
    
    return order_agg

def aggregate_daily_data(order_df):
    """按日期聚合訂單數據"""
    if order_df.empty:
        return pd.DataFrame()
    
    daily = order_df.groupby('Date').agg({
        '訂單編號': 'count',
        '訂單總金額': 'sum',
        '訂單總成本': 'sum'
    }).reset_index()
    
    daily.columns = ['Date', '訂單數', '總金額', '總成本']
    daily['毛利'] = daily['總金額'] - daily['總成本']
    
    return daily

def process_ad_data(ad_file):
    """處理廣告費資料"""
    if ad_file is None:
        return pd.DataFrame()
    
    if ad_file.name.endswith('.csv'):
        ad_df = pd.read_csv(ad_file)
    else:
        ad_df = pd.read_excel(ad_file)
    
    # 偵測日期和廣告費欄位
    date_col = None
    ad_col = None
    
    for col in ad_df.columns:
        if '日期' in col or 'date' in col.lower():
            date_col = col
        if 'FB' in col or '廣告費' in col or 'ad' in col.lower():
            ad_col = col
    
    if date_col is None or ad_col is None:
        st.error("廣告費檔案缺少日期或廣告費欄位")
        return pd.DataFrame()
    
    ad_df = ad_df[[date_col, ad_col]].copy()
    ad_df.columns = ['Date', 'Ad_Spend']
    ad_df['Date'] = pd.to_datetime(ad_df['Date'], errors='coerce').dt.date
    ad_df = ad_df[ad_df['Date'].notna()]
    ad_df['Ad_Spend'] = pd.to_numeric(ad_df['Ad_Spend'], errors='coerce').fillna(0)
    
    return ad_df

def merge_data(daily_df, ad_df):
    """合併每日訂單數據與廣告費"""
    if ad_df.empty:
        return daily_df
    
    merged = pd.merge(daily_df, ad_df, on='Date', how='outer').fillna(0)
    merged = merged.sort_values('Date').reset_index(drop=True)
    
    return merged

def calculate_weekly_data(df):
    """計算週報表"""
    if df.empty:
        return pd.DataFrame()
    
    df_copy = df.copy()
    df_copy['Date'] = pd.to_datetime(df_copy['Date'])
    df_copy['Week'] = df_copy['Date'].dt.to_period('W').astype(str)
    
    agg_dict = {
        '訂單數': 'sum',
        '總金額': 'sum',
        '總成本': 'sum',
        '毛利': 'sum'
    }
    
    if 'Ad_Spend' in df_copy.columns:
        agg_dict['Ad_Spend'] = 'sum'
    
    weekly = df_copy.groupby('Week').agg(agg_dict).reset_index()
    
    return weekly

def calculate_monthly_data(df):
    """計算月報表"""
    if df.empty:
        return pd.DataFrame()
    
    df_copy = df.copy()
    df_copy['Date'] = pd.to_datetime(df_copy['Date'])
    df_copy['Month'] = df_copy['Date'].dt.to_period('M').astype(str)
    
    agg_dict = {
        '訂單數': 'sum',
        '總金額': 'sum',
        '總成本': 'sum',
        '毛利': 'sum'
    }
    
    if 'Ad_Spend' in df_copy.columns:
        agg_dict['Ad_Spend'] = 'sum'
    
    monthly = df_copy.groupby('Month').agg(agg_dict).reset_index()
    
    return monthly

def calculate_gross_margin_rate(df):
    """計算毛利率"""
    if df.empty:
        return pd.DataFrame()
    
    result = df.copy()
    result['毛利率'] = ((result['總金額'] * 0.92 - result['總成本']) / result['總金額'] * 100).fillna(0)
    result['毛利率'] = result['毛利率'].apply(lambda x: f"{x:.2f}%")
    
    return result

def calculate_marketing_metrics(df):
    """計算行銷 ROI 和 ROAS"""
    if df.empty or 'Ad_Spend' not in df.columns:
        return df
    
    result = df.copy()
    
    # 避免除以零
    result['ROI'] = result.apply(
        lambda row: ((row['毛利'] - row['Ad_Spend']) / row['Ad_Spend']) if row['Ad_Spend'] > 0 else 0,
        axis=1
    )
    
    result['ROAS'] = result.apply(
        lambda row: (row['總金額'] / row['Ad_Spend']) if row['Ad_Spend'] > 0 else 0,
        axis=1
    )
    
    # 格式化為兩位小數
    result['ROI'] = result['ROI'].round(2)
    result['ROAS'] = result['ROAS'].round(2)
    
    return result

def calculate_referral_stats(order_df):
    """計算導購統計"""
    if order_df.empty or '導購' not in order_df.columns:
        return pd.DataFrame()
    
    # 轉換建立時間
    order_df['建立時間'] = pd.to_datetime(order_df['建立時間'], errors='coerce')
    order_df = order_df[order_df['建立時間'].notna()].copy()
    order_df['建立日期'] = order_df['建立時間'].dt.date
    
    referral = order_df.groupby(['建立日期', '導購']).size().reset_index(name='訂單數')
    referral = referral.sort_values(['建立日期', '訂單數'], ascending=[True, False])
    
    return referral

def create_line_chart(df, x_col, y_col, title):
    """建立折線圖"""
    if df.empty:
        return None
    
    fig = px.line(df, x=x_col, y=y_col, title=title, markers=True)
    fig.update_layout(
        xaxis_title=x_col,
        yaxis_title=y_col,
        hovermode='x unified'
    )
    return fig

def export_to_excel(daily_df, weekly_df, monthly_df, total_df, referral_df, 
                    daily_marketing, weekly_marketing, monthly_marketing, total_marketing):
    """匯出所有報表到 Excel"""
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # 總金額報表
        if not daily_df.empty:
            daily_df[['Date', '總金額']].to_excel(writer, sheet_name='總金額日報表', index=False)
        if not weekly_df.empty:
            weekly_df[['Week', '總金額']].to_excel(writer, sheet_name='總金額週報表', index=False)
        if not monthly_df.empty:
            monthly_df[['Month', '總金額']].to_excel(writer, sheet_name='總金額月報表', index=False)
        
        # 毛利報表
        if not daily_df.empty:
            daily_df[['Date', '毛利']].to_excel(writer, sheet_name='毛利日報表', index=False)
        if not weekly_df.empty:
            weekly_df[['Week', '毛利']].to_excel(writer, sheet_name='毛利週報表', index=False)
        if not monthly_df.empty:
            monthly_df[['Month', '毛利']].to_excel(writer, sheet_name='毛利月報表', index=False)
        
        # 毛利率報表
        if not daily_df.empty:
            margin_df = calculate_gross_margin_rate(daily_df)
            margin_df[['Date', '毛利率']].to_excel(writer, sheet_name='毛利率報表', index=False)
        
        # 訂單數報表
        if not daily_df.empty:
            daily_df[['Date', '訂單數']].to_excel(writer, sheet_name='每日訂單數', index=False)
        if not weekly_df.empty:
            weekly_df[['Week', '訂單數']].to_excel(writer, sheet_name='每週訂單數', index=False)
        if not monthly_df.empty:
            monthly_df[['Month', '訂單數']].to_excel(writer, sheet_name='每月訂單數', index=False)
        if not total_df.empty:
            total_df.to_excel(writer, sheet_name='總訂單數', index=False)
        
        # 導購統計
        if not referral_df.empty:
            referral_df.to_excel(writer, sheet_name='導購統計', index=False)
        
        # 行銷報表
        if not daily_marketing.empty:
            daily_marketing.to_excel(writer, sheet_name='每日行銷報表', index=False)
        if not weekly_marketing.empty:
            weekly_marketing.to_excel(writer, sheet_name='每週行銷報表', index=False)
        if not monthly_marketing.empty:
            monthly_marketing.to_excel(writer, sheet_name='每月行銷報表', index=False)
        if not total_marketing.empty:
            total_marketing.to_excel(writer, sheet_name='總計行銷報表', index=False)
    
    output.seek(0)
    return output

# Streamlit 應用程式
st.set_page_config(page_title="嘖嘖數據分析平台", layout="wide")

st.title("🚀 嘖嘖數據分析平台")
st.markdown("---")

# 側邊欄：檔案上傳
st.sidebar.header("📁 資料上傳")
order_files = st.sidebar.file_uploader(
    "上傳嘖嘖原始檔案（可多選）",
    type=['csv', 'xlsx', 'xls'],
    accept_multiple_files=True
)

ad_file = st.sidebar.file_uploader(
    "上傳嘖嘖廣告費檔案（選填）",
    type=['csv', 'xlsx', 'xls']
)

if order_files:
    # 讀取並處理訂單資料
    with st.spinner("正在處理訂單資料..."):
        raw_order_df = read_uploaded_files(order_files)
        order_df = process_order_data(raw_order_df)
        
        if not order_df.empty:
            st.success(f"✅ 成功載入 {len(order_df)} 筆有效訂單")
            
            # 聚合每日數據
            daily_df = aggregate_daily_data(order_df)
            
            # 處理廣告費資料
            ad_df = pd.DataFrame()
            if ad_file:
                ad_df = process_ad_data(ad_file)
                if not ad_df.empty:
                    st.success(f"✅ 成功載入 {len(ad_df)} 筆廣告費資料")
            
            # 合併數據
            if not ad_df.empty:
                daily_df = merge_data(daily_df, ad_df)
            
            # 計算週報表和月報表
            weekly_df = calculate_weekly_data(daily_df)
            monthly_df = calculate_monthly_data(daily_df)
            
            # 計算總計
            total_orders = len(order_df)
            total_revenue = order_df['訂單總金額'].sum()
            total_cost = order_df['訂單總成本'].sum()
            total_profit = total_revenue - total_cost
            
            total_df = pd.DataFrame({
                '指標': ['總訂單數', '總金額', '總成本', '總毛利'],
                '數值': [total_orders, total_revenue, total_cost, total_profit]
            })
            
            # 計算導購統計
            referral_df = calculate_referral_stats(order_df)
            
            # 計算行銷指標
            daily_marketing = pd.DataFrame()
            weekly_marketing = pd.DataFrame()
            monthly_marketing = pd.DataFrame()
            total_marketing = pd.DataFrame()
            
            if 'Ad_Spend' in daily_df.columns and not ad_df.empty:
                daily_marketing = calculate_marketing_metrics(daily_df)
                weekly_marketing = calculate_marketing_metrics(weekly_df)
                monthly_marketing = calculate_marketing_metrics(monthly_df)
                
                # 總計行銷數據
                total_ad_spend = daily_df['Ad_Spend'].sum()
                total_roi = ((total_profit - total_ad_spend) / total_ad_spend) if total_ad_spend > 0 else 0
                total_roas = (total_revenue / total_ad_spend) if total_ad_spend > 0 else 0
                
                total_marketing = pd.DataFrame({
                    '指標': ['總 FB 廣告費', '總毛利', '總金額', '總 ROI', '總 ROAS'],
                    '數值': [total_ad_spend, total_profit, total_revenue, round(total_roi, 2), round(total_roas, 2)]
                })
            
            # 建立分頁
            tabs = st.tabs([
                "📊 總覽",
                "📈 系列 A：訂單數統計",
                "💰 系列 B：銷售總金額",
                "💵 系列 C：毛利統計",
                "📊 系列 D：毛利率分析",
                "🔗 系列 E：導購統計",
                "📢 系列 F：行銷 ROI & ROAS"
            ])
            
            # Tab 0: 總覽
            with tabs[0]:
                st.header("📊 數據總覽")
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric("總訂單數", f"{total_orders:,}")
                with col2:
                    st.metric("總金額", f"NT$ {total_revenue:,.0f}")
                with col3:
                    st.metric("總毛利", f"NT$ {total_profit:,.0f}")
                with col4:
                    avg_margin = ((total_revenue * 0.92 - total_cost) / total_revenue * 100) if total_revenue > 0 else 0
                    st.metric("平均毛利率", f"{avg_margin:.2f}%")
                
                st.markdown("---")
                st.subheader("每日數據趨勢")
                st.dataframe(daily_df, use_container_width=True)
            
            # Tab 1: 系列 A - 訂單數統計
            with tabs[1]:
                st.header("📈 系列 A：訂單數統計")
                
                st.subheader("每日訂單數")
                st.dataframe(daily_df[['Date', '訂單數']], use_container_width=True)
                fig = create_line_chart(daily_df, 'Date', '訂單數', '每日訂單數趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
                
                st.subheader("每週訂單數")
                st.dataframe(weekly_df[['Week', '訂單數']], use_container_width=True)
                fig = create_line_chart(weekly_df, 'Week', '訂單數', '每週訂單數趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
                
                st.subheader("每月訂單數")
                st.dataframe(monthly_df[['Month', '訂單數']], use_container_width=True)
                fig = create_line_chart(monthly_df, 'Month', '訂單數', '每月訂單數趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
                
                st.subheader("總訂單數")
                st.dataframe(total_df[total_df['指標'] == '總訂單數'], use_container_width=True)
            
            # Tab 2: 系列 B - 銷售總金額
            with tabs[2]:
                st.header("💰 系列 B：銷售總金額")
                
                st.subheader("每日總金額")
                st.dataframe(daily_df[['Date', '總金額']], use_container_width=True)
                fig = create_line_chart(daily_df, 'Date', '總金額', '每日總金額趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
                
                st.subheader("每週總金額")
                st.dataframe(weekly_df[['Week', '總金額']], use_container_width=True)
                fig = create_line_chart(weekly_df, 'Week', '總金額', '每週總金額趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
                
                st.subheader("每月總金額")
                st.dataframe(monthly_df[['Month', '總金額']], use_container_width=True)
                fig = create_line_chart(monthly_df, 'Month', '總金額', '每月總金額趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
            
            # Tab 3: 系列 C - 毛利統計
            with tabs[3]:
                st.header("💵 系列 C：毛利統計")
                
                st.subheader("每日毛利")
                st.dataframe(daily_df[['Date', '毛利']], use_container_width=True)
                fig = create_line_chart(daily_df, 'Date', '毛利', '每日毛利趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
                
                st.subheader("每週毛利")
                st.dataframe(weekly_df[['Week', '毛利']], use_container_width=True)
                fig = create_line_chart(weekly_df, 'Week', '毛利', '每週毛利趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
                
                st.subheader("每月毛利")
                st.dataframe(monthly_df[['Month', '毛利']], use_container_width=True)
                fig = create_line_chart(monthly_df, 'Month', '毛利', '每月毛利趨勢')
                if fig:
                    st.plotly_chart(fig, use_container_width=True)
            
            # Tab 4: 系列 D - 毛利率分析
            with tabs[4]:
                st.header("📊 系列 D：毛利率分析")
                
                margin_df = calculate_gross_margin_rate(daily_df)
                
                st.subheader("每日毛利率")
                st.dataframe(margin_df[['Date', '毛利率']], use_container_width=True)
                
                st.subheader("平均毛利率")
                st.metric("平均毛利率", f"{avg_margin:.2f}%")
            
            # Tab 5: 系列 E - 導購統計
            with tabs[5]:
                st.header("🔗 系列 E：導購統計")
                
                if not referral_df.empty:
                    st.dataframe(referral_df, use_container_width=True)
                    
                    # 導購來源分布
                    referral_summary = referral_df.groupby('導購')['訂單數'].sum().reset_index()
                    referral_summary = referral_summary.sort_values('訂單數', ascending=False)
                    
                    fig = px.bar(referral_summary, x='導購', y='訂單數', title='導購來源訂單數分布')
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("無導購資料")
            
            # Tab 6: 系列 F - 行銷 ROI & ROAS
            with tabs[6]:
                st.header("📢 系列 F：行銷 ROI & ROAS 分析")
                
                if not daily_marketing.empty:
                    st.subheader("每日行銷報表")
                    display_cols = ['Date', 'Ad_Spend', '毛利', '總金額', 'ROI', 'ROAS']
                    st.dataframe(daily_marketing[display_cols], use_container_width=True)
                    
                    fig_roi = create_line_chart(daily_marketing, 'Date', 'ROI', '每日 ROI 趨勢')
                    if fig_roi:
                        st.plotly_chart(fig_roi, use_container_width=True)
                    
                    fig_roas = create_line_chart(daily_marketing, 'Date', 'ROAS', '每日 ROAS 趨勢')
                    if fig_roas:
                        st.plotly_chart(fig_roas, use_container_width=True)
                    
                    st.subheader("每週行銷報表")
                    display_cols_weekly = ['Week', 'Ad_Spend', '毛利', '總金額', 'ROI', 'ROAS']
                    st.dataframe(weekly_marketing[display_cols_weekly], use_container_width=True)
                    
                    st.subheader("每月行銷報表")
                    display_cols_monthly = ['Month', 'Ad_Spend', '毛利', '總金額', 'ROI', 'ROAS']
                    st.dataframe(monthly_marketing[display_cols_monthly], use_container_width=True)
                    
                    st.subheader("總計行銷數據")
                    st.dataframe(total_marketing, use_container_width=True)
                else:
                    st.warning("⚠️ 無廣告數據，請上傳廣告費檔案以查看行銷分析")
            
            # 下載 Excel 按鈕
            st.markdown("---")
            st.header("📥 下載完整報表")
            
            excel_data = export_to_excel(
                daily_df, weekly_df, monthly_df, total_df, referral_df,
                daily_marketing, weekly_marketing, monthly_marketing, total_marketing
            )
            
            st.download_button(
                label="📊 下載完整 Excel 報表",
                data=excel_data,
                file_name=f"嘖嘖數據分析報表_{datetime.now().strftime('%Y%m%d')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        else:
            st.error("❌ 無法處理訂單資料，請檢查檔案格式")
else:
    st.info("👈 請從左側上傳嘖嘖原始檔案開始分析")
