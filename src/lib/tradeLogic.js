export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL || 'fc781117@gmail.com').toLowerCase();

export function normalizeRole(profile, userEmail) {
  const email = (userEmail || profile?.email || '').toLowerCase();
  if (email === OWNER_EMAIL) return 'owner';
  return profile?.role || 'personal';
}

export function roleLabel(role) {
  return {
    owner: '最高管理員',
    admin: '管理員',
    personal: '個人使用者',
    viewer: '閱覽者'
  }[role] || '個人使用者';
}

export function canViewSensitive(role, currentUserId, targetUserId) {
  return role === 'owner' || currentUserId === targetUserId;
}

export function supportBands(support) {
  const s = Number(support || 0);
  return {
    support: s,
    plus1: s * 1.01,
    plus2: s * 1.02,
    plus3: s * 1.03
  };
}

export function pctFromSupport(price, support) {
  if (!support) return 0;
  return ((price - support) / support) * 100;
}

export function entryStatus(price, support, breakout) {
  const pct = pctFromSupport(price, support);
  if (pct <= 1) return { level: 'green', label: '接近支撐，可列入買撐觀察', detail: '符合「買在支撐，停損點近」的核心邏輯。' };
  if (pct <= 2) return { level: 'blue', label: '支撐上方 2% 內，可小部位觀察', detail: '仍在可控區，但槓桿工具需降低金額。' };
  if (pct <= 3) return { level: 'yellow', label: '離支撐稍遠，只能輕倉或等待回測', detail: '不適合大槓桿，避免追高後停損太遠。' };
  if (breakout && price <= breakout * 1.01) return { level: 'blue', label: '突破後 +1% 內，可列入追突破觀察', detail: '若跌回突破點，視為假突破須退出。' };
  return { level: 'red', label: '離支撐過遠，不追高', detail: '等待回撐、突破回測或下一個 A 點。' };
}

export function riskNumbers(profile) {
  const capital = Number(profile?.capital_amount || 0);
  const maxRiskPercent = Number(profile?.max_risk_percent || 2);
  const singleRisk = capital * (maxRiskPercent / 100);
  return { capital, maxRiskPercent, singleRisk };
}

export function positionSizing(profile, setup) {
  const { capital, singleRisk } = riskNumbers(profile);
  const support = Number(setup.support || setup.support_price || 0);
  const stop = Number(setup.stop || setup.stop_loss_price || support * 0.97);
  const current = Number(setup.price || support);
  const perShareRisk = Math.max(current - stop, current * 0.005, 0.01);
  const sharesByRisk = Math.floor(singleRisk / perShareRisk);
  const sharesByCash = Math.floor(capital / current);
  const cashShares = Math.max(0, Math.min(sharesByRisk, sharesByCash));
  const fractionalBudget = Math.min(capital * 0.08, singleRisk / 0.03 || 0);
  const warrantBudget = singleRisk > 0 ? singleRisk / 0.2 : 0;
  const optionPremiumBudget = Math.min(singleRisk, capital * 0.05);
  const marginBudget = Math.min(capital * 0.35, cashShares * current);
  const futuresLossOneLot = Math.max((current - stop) * 2000, 0);
  const futuresAllowed = futuresLossOneLot > 0 && futuresLossOneLot <= singleRisk;

  return {
    singleRisk,
    perShareRisk,
    cashShares,
    cashAmount: cashShares * current,
    fractionalBudget,
    marginBudget,
    warrantBudget,
    optionPremiumBudget,
    futuresLossOneLot,
    futuresAllowed
  };
}

export function toolRecommendation(profile, symbol) {
  const status = entryStatus(symbol.price, symbol.support, symbol.breakout);
  const sizing = positionSizing(profile, symbol);
  const allow = {
    fractional: profile?.allow_fractional,
    cash: profile?.allow_cash_stock,
    margin: profile?.allow_margin,
    futures: profile?.allow_stock_futures,
    warrants: profile?.allow_warrants,
    options: profile?.allow_options
  };
  const rows = [];

  rows.push({
    tool: '零股',
    enabled: Boolean(allow.fractional && symbol.hasFractional),
    verdict: allow.fractional ? '適合練習買點與紀律' : '個人設定未開啟',
    amount: sizing.fractionalBudget
  });
  rows.push({
    tool: '現股',
    enabled: Boolean(allow.cash),
    verdict: status.level === 'red' ? '等待回測，不追高' : '可依風險分批',
    amount: sizing.cashAmount
  });
  rows.push({
    tool: '融資',
    enabled: Boolean(allow.margin && status.level !== 'red'),
    verdict: allow.margin ? '只適合支撐附近或突破回測' : '個人設定未開啟',
    amount: sizing.marginBudget
  });
  rows.push({
    tool: '股票期貨',
    enabled: Boolean(allow.futures && symbol.hasFutures && sizing.futuresAllowed),
    verdict: symbol.hasFutures
      ? (sizing.futuresAllowed ? '一口停損金額在風險上限內' : '一口停損金額超過風險上限')
      : '此標的未列股期',
    amount: sizing.futuresLossOneLot
  });
  rows.push({
    tool: '權證',
    enabled: Boolean(allow.warrants && symbol.hasWarrants && status.level !== 'red' && profile?.can_follow_20pct_warrant_stop),
    verdict: profile?.can_follow_20pct_warrant_stop ? '需通過黃金漏斗，-20% 必停損' : '未確認可執行 -20% 停損',
    amount: sizing.warrantBudget
  });
  rows.push({
    tool: '選擇權',
    enabled: Boolean(allow.options && symbol.hasOptions),
    verdict: symbol.hasOptions ? '限買方或價差單，不建議裸賣' : '此標的暫無個股選擇權資料',
    amount: sizing.optionPremiumBudget
  });

  return { status, sizing, rows };
}

export function warrantScore(w) {
  let score = 0;
  if (w.remaining_days >= 60) score += 20;
  if (w.price >= 0.7 && w.price <= 3) score += 15;
  if (w.effective_gearing >= 4 && w.effective_gearing <= 8) score += 15;
  if (w.moneyness_percent >= -10 && w.moneyness_percent <= 5) score += 15;
  if (w.spread_gearing_ratio <= 0.3) score += 15;
  if (w.outstanding_ratio >= 10 && w.outstanding_ratio <= 80) score += 10;
  if (['元大', '凱基', '麥格理', '群益', '統一'].includes(w.issuer)) score += 10;
  return score;
}

export function formatMoney(v) {
  const n = Number(v || 0);
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function formatPrice(v) {
  const n = Number(v || 0);
  return n.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
