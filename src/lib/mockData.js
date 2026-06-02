export const defaultTradeProfile = {
  capital_amount: 300000,
  max_risk_percent: 2,
  monthly_target_percent: 5,
  max_daily_drawdown_percent: 5,
  max_positions: 4,
  cash_reserve_percent: 30,
  mode: 'balanced',
  goal_profit_amount: 150000,
  current_profit_amount: 0,
  goal_deadline: '',
  allow_fractional: true,
  allow_cash_stock: true,
  allow_margin: false,
  allow_stock_futures: false,
  allow_warrants: false,
  allow_options: false,
  can_follow_20pct_warrant_stop: false,
  can_accept_futures_volatility: false,
  notes: ''
};

export const marketIndices = [
  { group: '台股', items: [
    { name: '加權指數', value: '42,580', change: '+0.82%', tone: 'green' },
    { name: '櫃買指數', value: '246.3', change: '+0.64%', tone: 'green' },
    { name: '台指近月', value: '42,710', change: '+0.77%', tone: 'green' },
  ]},
  { group: '美股', items: [
    { name: '道瓊', value: '41,220', change: '+0.18%', tone: 'green' },
    { name: 'S&P 500', value: '5,625', change: '+0.32%', tone: 'green' },
    { name: 'NASDAQ', value: '18,420', change: '+0.55%', tone: 'green' },
    { name: '費半 SOX', value: '5,180', change: '-0.21%', tone: 'red' },
  ]},
  { group: '亞洲', items: [
    { name: '日經', value: '38,920', change: '+0.41%', tone: 'green' },
    { name: '韓股 KOSPI', value: '2,781', change: '-0.11%', tone: 'red' },
  ]}
];

export const sectors = [
  { name: '被動元件', score: 9.2, status: '主流', note: '領頭華新科，二線華容接力。' },
  { name: '分離元件', score: 8.6, status: '主流', note: '強茂、台半、朋程。' },
  { name: '晶圓與封裝', score: 8.1, status: '主流', note: '合晶、環球晶，關注封裝技術革命。' },
  { name: 'AI伺服器', score: 8.0, status: '主流', note: '台積電、緯穎、散熱與電源供應鏈。' }
];

export const symbols = [
  { symbol: '2492', name: '華新科', sector: '被動元件', price: 405, support: 392, breakout: 400, stop: 380, target1: 440, target2: 500, type: '領頭股', score: 91, hasFractional: true, hasMargin: true, hasFutures: true, hasWarrants: true, hasOptions: false, setup: '主流領頭，買撐 / 突破回測', tags: ['被動元件', '領頭股', '5MA'] },
  { symbol: '5328', name: '華容', sector: '被動元件', price: 39.8, support: 38.2, breakout: 40, stop: 36.8, target1: 45, target2: 52, type: '二線接力', score: 82, hasFractional: true, hasMargin: false, hasFutures: false, hasWarrants: true, hasOptions: false, setup: '二線接力，等待突破或回撐', tags: ['被動元件', '二線股', '補漲'] },
  { symbol: '2481', name: '強茂', sector: '分離元件', price: 181, support: 176, breakout: 182, stop: 170, target1: 200, target2: 230, type: '主流強股', score: 88, hasFractional: true, hasMargin: true, hasFutures: true, hasWarrants: true, hasOptions: false, setup: '接近滿足，善用一半', tags: ['分離元件', '二極體', '滿足'] },
  { symbol: '5425', name: '台半', sector: '分離元件', price: 86.5, support: 84.8, breakout: 88, stop: 82.2, target1: 96, target2: 108, type: '支撐觀察', score: 77, hasFractional: true, hasMargin: false, hasFutures: false, hasWarrants: true, hasOptions: false, setup: '留意 5MA 支撐', tags: ['分離元件', '5MA'] },
  { symbol: '6182', name: '合晶', sector: '晶圓與封裝', price: 52.7, support: 51.5, breakout: 54, stop: 49.8, target1: 60, target2: 68, type: 'A點觀察', score: 75, hasFractional: true, hasMargin: true, hasFutures: false, hasWarrants: true, hasOptions: false, setup: '晶圓題材，觀察 A 點轉強', tags: ['晶圓', '封裝', 'A點'] },
  { symbol: '2330', name: '台積電', sector: 'AI伺服器', price: 1025, support: 1000, breakout: 1030, stop: 970, target1: 1120, target2: 1250, type: '高價權值', score: 86, hasFractional: true, hasMargin: true, hasFutures: true, hasWarrants: true, hasOptions: true, setup: '大型權值，工具完整，股期/選擇權需控風險', tags: ['AI', '權值', '股期', '選擇權'] },
  { symbol: '6669', name: '緯穎', sector: 'AI伺服器', price: 3150, support: 3060, breakout: 3200, stop: 2950, target1: 3500, target2: 3900, type: 'AI強股', score: 84, hasFractional: true, hasMargin: true, hasFutures: true, hasWarrants: true, hasOptions: false, setup: '高價 AI 強股，零股/現股優先', tags: ['AI伺服器', '高價股'] }
];

export const demoWarrants = [
  { underlying_symbol: '2492', warrant_code: '080001', warrant_name: '華新科元大購01', issuer: '元大', price: 1.38, bid: 1.36, ask: 1.38, remaining_days: 128, effective_gearing: 5.8, moneyness_percent: -4.2, spread_gearing_ratio: 0.25, outstanding_ratio: 42, external_url: 'https://www.warrantwin.com.tw/eyuanta/Warrant/Search.aspx?SID=2492' },
  { underlying_symbol: '2492', warrant_code: '080002', warrant_name: '華新科凱基購02', issuer: '凱基', price: 2.15, bid: 2.12, ask: 2.15, remaining_days: 182, effective_gearing: 4.9, moneyness_percent: 1.8, spread_gearing_ratio: 0.18, outstanding_ratio: 55, external_url: 'https://www.warrantwin.com.tw/eyuanta/Warrant/Search.aspx?SID=2492' },
  { underlying_symbol: '2481', warrant_code: '080003', warrant_name: '強茂群益購03', issuer: '群益', price: 0.92, bid: 0.90, ask: 0.92, remaining_days: 96, effective_gearing: 7.2, moneyness_percent: -6.8, spread_gearing_ratio: 0.30, outstanding_ratio: 31, external_url: 'https://www.warrantwin.com.tw/eyuanta/Warrant/Search.aspx?SID=2481' },
  { underlying_symbol: '2330', warrant_code: '080004', warrant_name: '台積電元大購04', issuer: '元大', price: 1.76, bid: 1.75, ask: 1.76, remaining_days: 210, effective_gearing: 6.6, moneyness_percent: -2.5, spread_gearing_ratio: 0.09, outstanding_ratio: 62, external_url: 'https://www.warrantwin.com.tw/eyuanta/Warrant/Search.aspx?SID=2330' }
];

export const rules = [
  '第一優先：風大 × 浪跡核心系統。大盤 → 主流 → 個股 → 買點 → 商品 → 停損停利。',
  '趨勢最大，點位次之。方向錯，再精準的買點也只是希望陷阱。',
  '槓桿不是用來賭方向，而是用在停損點很近時放大效率。',
  '權證先確認現股可買，再挑權證；-20% 停損，2～3 天不發動撤離。',
  '到第一波滿足、槓桿商品獲利 30%～50%、高檔震盪變大，善用一半。',
  'AI 僅提供參考分析草案，需由管理員或最高管理員確認後發布。'
];
