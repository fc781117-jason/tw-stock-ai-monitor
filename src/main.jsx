import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import { defaultTradeProfile, demoWarrants, marketIndices, rules, sectors, symbols } from './lib/mockData.js';
import { OWNER_EMAIL, approvalLabel, entryStatus, formatMoney, formatPrice, goalProgress, normalizeRole, pctFromSupport, positionSizing, roleLabel, supportBands, toolRecommendation, warrantScore } from './lib/tradeLogic.js';
import './styles.css';

const pages = [
  { id: 'dashboard', label: '總覽儀表板', icon: '🏠' },
  { id: 'profile', label: '個人交易設定', icon: '🧭' },
  { id: 'core', label: '風大×浪跡核心', icon: '🧠' },
  { id: 'tools', label: '標的工具箱', icon: '🧰' },
  { id: 'warrants', label: '權證候選搜尋', icon: '🎯' },
  { id: 'report', label: 'AI 盤後分析', icon: '📝' },
  { id: 'admin', label: '審核與管理', icon: '⚙️' }
];

function App() {
  const [page, setPage] = useState('dashboard');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tradeProfile, setTradeProfile] = useState(defaultTradeProfile);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]);
  const [theme, setTheme] = useState('dark');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      await hydrateUser(data.session?.user || null);
      setLoading(false);
    }
    initAuth();
    if (!supabase) return () => { mounted = false; };
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await hydrateUser(newSession?.user || null);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (page === 'admin' && supabase && role === 'owner') fetchAdminUsers();
  }, [page, session?.user?.id]);

  async function hydrateUser(user) {
    if (!user || !supabase) {
      setProfile(null);
      setTradeProfile(defaultTradeProfile);
      return;
    }
    const email = (user.email || '').toLowerCase();
    const fallbackProfile = {
      id: user.id,
      email,
      display_name: user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      role: email === OWNER_EMAIL ? 'owner' : 'personal',
      access_status: email === OWNER_EMAIL ? 'approved' : 'pending',
      real_name: '',
      nickname: '',
      application_submitted_at: null,
      approved_at: null
    };

    const { data: existingProfile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!existingProfile) {
      await supabase.from('profiles').upsert(fallbackProfile, { onConflict: 'id' });
    }
    const { data: refreshedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const finalProfile = refreshedProfile || fallbackProfile;
    finalProfile.role = normalizeRole(finalProfile, email);
    if (finalProfile.role === 'owner' && !finalProfile.access_status) finalProfile.access_status = 'approved';
    setProfile(finalProfile);

    const { data: trade } = await supabase.from('personal_trade_profiles').select('*').eq('user_id', user.id).maybeSingle();
    setTradeProfile({ ...defaultTradeProfile, ...(trade || {}) });
  }

  async function fetchAdminUsers() {
    const { data: profileRows } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: tradeRows } = await supabase.from('personal_trade_profiles').select('*');
    const tradeMap = new Map((tradeRows || []).map(row => [row.user_id, row]));
    setAdminUsers((profileRows || []).map(row => ({ ...row, tradeProfile: tradeMap.get(row.id) || null })));
  }

  const role = normalizeRole(profile, session?.user?.email);
  const isOwner = role === 'owner';
  const isAdminLike = role === 'owner' || role === 'admin';
  const approvalStatus = isOwner ? 'approved' : (profile?.access_status || 'pending');
  const onboardingComplete = Boolean(profile?.real_name) && Boolean(profile?.nickname) && Number(tradeProfile?.capital_amount || 0) > 0;
  const canEnterSystem = isOwner ? onboardingComplete : (onboardingComplete && approvalStatus === 'approved');

  async function loginWithGoogle() {
    if (!supabase) return alert('尚未設定 Supabase 環境變數。請先在 Vercel 設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_PUBLISHABLE_KEY。');
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setTradeProfile(defaultTradeProfile);
    setPage('dashboard');
  }

  async function saveTradeProfile(nextProfile) {
    setTradeProfile(nextProfile);
    if (!session?.user || !supabase) {
      alert('Demo 模式已暫存於畫面；正式儲存需登入。');
      return;
    }
    const payload = {
      ...defaultTradeProfile,
      ...nextProfile,
      user_id: session.user.id,
      capital_amount: Number(nextProfile.capital_amount || 0),
      max_risk_percent: Number(nextProfile.max_risk_percent || 0),
      monthly_target_percent: Number(nextProfile.monthly_target_percent || 0),
      max_daily_drawdown_percent: Number(nextProfile.max_daily_drawdown_percent || 0),
      max_positions: Number(nextProfile.max_positions || 1),
      cash_reserve_percent: Number(nextProfile.cash_reserve_percent || 0),
      goal_profit_amount: Number(nextProfile.goal_profit_amount || 0),
      current_profit_amount: Number(nextProfile.current_profit_amount || 0),
      goal_deadline: nextProfile.goal_deadline || null,
    };
    const { error } = await supabase.from('personal_trade_profiles').upsert(payload, { onConflict: 'user_id' });
    if (error) alert(`儲存失敗：${error.message}`);
    else alert('個人交易設定已儲存。');
  }

  async function submitOnboarding(formProfile, formTradeProfile) {
    if (!session?.user || !supabase) return;
    const accessStatus = isOwner ? 'approved' : 'pending';
    const profilePayload = {
      id: session.user.id,
      email: (session.user.email || '').toLowerCase(),
      display_name: formProfile.nickname,
      real_name: formProfile.real_name,
      nickname: formProfile.nickname,
      avatar_url: session.user.user_metadata?.avatar_url || null,
      role: role,
      access_status: accessStatus,
      application_submitted_at: new Date().toISOString(),
      approved_at: isOwner ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };
    const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
    if (profileError) return alert(`儲存基本資料失敗：${profileError.message}`);
    await saveTradeProfile(formTradeProfile);
    await hydrateUser(session.user);
    if (!isOwner) alert('申請資料已送出，請等待最高管理員審核後進入系統。');
  }

  async function updateApproval(userId, nextStatus) {
    const patch = { access_status: nextStatus, approved_at: nextStatus === 'approved' ? new Date().toISOString() : null };
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) alert(`更新失敗：${error.message}`);
    else fetchAdminUsers();
  }

  function go(pageId) {
    setPage(pageId);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function generateAiReport() {
    setAiLoading(true);
    setAiReport('');
    try {
      const resp = await fetch('/api/ai-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, tradeProfile, selectedSymbol, sectors, symbols, rules })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'AI 分析產生失敗');
      setAiReport(data.text);
    } catch (_err) {
      setAiReport(buildFallbackReport(selectedSymbol, tradeProfile));
    } finally {
      setAiLoading(false);
    }
  }

  const pageTitle = pages.find(p => p.id === page)?.label || '總覽儀表板';

  if (loading) return <div className="boot">系統載入中...</div>;

  if (!session) {
    return <AuthGate loginWithGoogle={loginWithGoogle} />;
  }

  if (!onboardingComplete) {
    return <OnboardingGate session={session} profile={profile} tradeProfile={tradeProfile} onSubmit={submitOnboarding} onLogout={logout} />;
  }

  if (!canEnterSystem) {
    return <PendingGate profile={profile} logout={logout} isOwner={isOwner} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="brand" onClick={() => go('dashboard')}>
          <span className="brand-icon">📊</span>
          <div>
            <b>台股 AI 智慧監控</b>
            <small>風大 × 浪跡核心系統</small>
          </div>
        </div>
        <div className="nav-group">功能</div>
        {pages.map(item => (
          <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => go(item.id)}>
            <span>{item.icon}</span><b>{item.label}</b>
          </button>
        ))}
        <div className="nav-footer">
          <div className="role-card">
            <span className={`badge ${role}`}>{roleLabel(role)}</span>
            <small>{profile?.nickname || profile?.display_name || profile?.email}</small>
            <small className="muted-line">{approvalLabel(approvalStatus)}</small>
          </div>
          <button className="small-btn full" onClick={logout}>登出</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setDrawerOpen(!drawerOpen)}>☰</button>
          <div className="title-block compact">
            <h1>{pageTitle}</h1>
            <p>AI 參考分析需人工確認後發布</p>
          </div>
          <button className="small-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '🌙' : '☀️'}</button>
        </header>

        <section className="content">
          {!isSupabaseConfigured && <Notice type="warn" title="尚未連接 Supabase" text="目前為 Demo 模式。上傳 Vercel 並設定環境變數後，即可使用 Google 登入與資料庫儲存。" />}
          {page === 'dashboard' && <Dashboard go={go} tradeProfile={tradeProfile} selectedSymbol={selectedSymbol} setSelectedSymbol={setSelectedSymbol} isOwner={isOwner} profile={profile} />}
          {page === 'profile' && <ProfilePage profile={profile} role={role} tradeProfile={tradeProfile} saveTradeProfile={saveTradeProfile} isOwner={isOwner} session={session} />}
          {page === 'core' && <CoreLogicPage />}
          {page === 'tools' && <ToolsPage tradeProfile={tradeProfile} selectedSymbol={selectedSymbol} setSelectedSymbol={setSelectedSymbol} />}
          {page === 'warrants' && <WarrantsPage selectedSymbol={selectedSymbol} setSelectedSymbol={setSelectedSymbol} />}
          {page === 'report' && <ReportPage generateAiReport={generateAiReport} aiReport={aiReport} aiLoading={aiLoading} selectedSymbol={selectedSymbol} />}
          {page === 'admin' && <AdminPage role={role} isAdminLike={isAdminLike} isOwner={isOwner} users={adminUsers} updateApproval={updateApproval} />}
          {page !== 'dashboard' && <BackHome go={go} />}
        </section>
      </main>
    </div>
  );
}

function AuthGate({ loginWithGoogle }) {
  return (
    <div className="gate-shell">
      <div className="gate-card large">
        <span className="eyebrow">登入後才可使用</span>
        <h1>台股 AI 智慧監控</h1>
        <p>先使用 Google 登入。第一次登入會立即進入資料填寫頁，包含本名、稱呼、可操作本金、風險承受度與獲利目標。資料送出並通過最高管理員審核後，才可進入完整系統。</p>
        <div className="rule-grid soft compact-grid">
          <div>1. Google 登入</div>
          <div>2. 首次填寫個人資料</div>
          <div>3. 最高管理員審核</div>
          <div>4. 通過後進入系統</div>
        </div>
        <button className="primary-btn wide" onClick={loginWithGoogle}>使用 Google 登入</button>
      </div>
    </div>
  );
}

function OnboardingGate({ session, profile, tradeProfile, onSubmit, onLogout }) {
  const [formProfile, setFormProfile] = useState({
    real_name: profile?.real_name || '',
    nickname: profile?.nickname || profile?.display_name || ''
  });
  const [formTrade, setFormTrade] = useState({ ...defaultTradeProfile, ...tradeProfile, goal_deadline: tradeProfile?.goal_deadline || '' });

  const updateP = (key, value) => setFormProfile(prev => ({ ...prev, [key]: value }));
  const updateT = (key, value) => setFormTrade(prev => ({ ...prev, [key]: value }));
  const bool = key => Boolean(formTrade[key]);

  return (
    <div className="gate-shell">
      <div className="gate-card form-card">
        <div className="gate-topbar">
          <div>
            <span className="eyebrow">首次登入必填</span>
            <h1>建立個人交易檔案</h1>
            <p>{session?.user?.email} 已登入。請先完成以下資料，送出後才可進入系統。</p>
          </div>
          <button className="small-btn" onClick={onLogout}>登出</button>
        </div>

        <div className="card in-gate">
          <div className="card-head"><h3>基本身分資料</h3></div>
          <div className="form-grid">
            <Field label="本名（必填）"><input value={formProfile.real_name} onChange={e => updateP('real_name', e.target.value)} placeholder="請填寫本名" /></Field>
            <Field label="希望被稱呼的名字 / 綽號（必填）"><input value={formProfile.nickname} onChange={e => updateP('nickname', e.target.value)} placeholder="例如：Jason" /></Field>
          </div>
        </div>

        <div className="card in-gate">
          <div className="card-head"><h3>交易與風險設定</h3></div>
          <div className="form-grid">
            <Field label="可操作本金"><input type="number" value={formTrade.capital_amount} onChange={e => updateT('capital_amount', e.target.value)} /></Field>
            <Field label="單筆最大虧損 %"><input type="number" step="0.1" value={formTrade.max_risk_percent} onChange={e => updateT('max_risk_percent', e.target.value)} /></Field>
            <Field label="每月目標報酬 %"><input type="number" step="0.1" value={formTrade.monthly_target_percent} onChange={e => updateT('monthly_target_percent', e.target.value)} /></Field>
            <Field label="單日心理承受虧損 %"><input type="number" step="0.1" value={formTrade.max_daily_drawdown_percent} onChange={e => updateT('max_daily_drawdown_percent', e.target.value)} /></Field>
            <Field label="最大同時持倉"><input type="number" value={formTrade.max_positions} onChange={e => updateT('max_positions', e.target.value)} /></Field>
            <Field label="保留現金比例 %"><input type="number" step="1" value={formTrade.cash_reserve_percent} onChange={e => updateT('cash_reserve_percent', e.target.value)} /></Field>
            <Field label="預期達成獲利目標金額"><input type="number" value={formTrade.goal_profit_amount} onChange={e => updateT('goal_profit_amount', e.target.value)} /></Field>
            <Field label="目前已達成獲利（可先填 0）"><input type="number" value={formTrade.current_profit_amount} onChange={e => updateT('current_profit_amount', e.target.value)} /></Field>
            <Field label="目標完成日期"><input type="date" value={formTrade.goal_deadline || ''} onChange={e => updateT('goal_deadline', e.target.value)} /></Field>
            <Field label="交易模式"><select value={formTrade.mode} onChange={e => updateT('mode', e.target.value)}><option value="conservative">保守</option><option value="balanced">平衡</option><option value="aggressive">積極</option><option value="learning">學習</option></select></Field>
          </div>

          <h4>商品偏好</h4>
          <div className="check-grid">
            {[
              ['allow_fractional', '零股'], ['allow_cash_stock', '現股'], ['allow_margin', '融資'], ['allow_stock_futures', '股票期貨'], ['allow_warrants', '權證'], ['allow_options', '選擇權'], ['can_follow_20pct_warrant_stop', '可執行權證 -20% 停損'], ['can_accept_futures_volatility', '可承受股期波動']
            ].map(([key, label]) => <label key={key} className="check"><input type="checkbox" checked={bool(key)} onChange={e => updateT(key, e.target.checked)} />{label}</label>)}
          </div>
          <Field label="補充說明"><textarea rows="3" value={formTrade.notes || ''} onChange={e => updateT('notes', e.target.value)} placeholder="例如：目前主要以現股為主，權證只做主流股。" /></Field>
        </div>

        <button
          className="primary-btn wide"
          onClick={() => onSubmit(formProfile, formTrade)}
          disabled={!formProfile.real_name || !formProfile.nickname || !Number(formTrade.capital_amount || 0)}
        >
          送出首次申請資料
        </button>
      </div>
    </div>
  );
}

function PendingGate({ profile, logout, isOwner }) {
  return (
    <div className="gate-shell">
      <div className="gate-card pending-card">
        <span className="eyebrow">審核中</span>
        <h1>{isOwner ? '請先完成資料建立' : '你的帳號正在等待審核'}</h1>
        <p>稱呼：{profile?.nickname || profile?.display_name || '未填寫'}／狀態：{approvalLabel(profile?.access_status || 'pending')}</p>
        <p>目前尚未開放進入系統主頁。最高管理員通過後，你即可使用完整功能。</p>
        <button className="secondary-btn wide" onClick={logout}>登出</button>
      </div>
    </div>
  );
}

function Notice({ type = 'info', title, text }) {
  return <div className={`notice ${type}`}><b>{title}</b><span>{text}</span></div>;
}

function Dashboard({ go, tradeProfile, selectedSymbol, setSelectedSymbol, isOwner, profile }) {
  const risk = positionSizing(tradeProfile, selectedSymbol);
  const goal = goalProgress(tradeProfile);
  const statusCards = [
    { label: '大盤狀態', value: '多方未破撐', tone: 'green' },
    { label: '主流', value: '被動元件 / 分離元件', tone: 'blue' },
    { label: '最高規則', value: '趨勢最大，點位次之', tone: 'yellow' },
    { label: 'AI 狀態', value: '參考分析待確認', tone: 'purple' }
  ];
  const personalCards = [
    { label: '目標達成度', value: `${goal.pct.toFixed(0)}%`, hint: `目前 $${formatMoney(goal.current)} / 目標 $${formatMoney(goal.target)}`, tone: 'green' },
    { label: '可操作本金', value: `$${formatMoney(tradeProfile.capital_amount)}`, hint: isOwner ? '最高管理員可看全部個人敏感資料' : '僅本人與最高管理員可看', tone: 'blue' },
    { label: '單筆最大風險', value: `$${formatMoney(risk.singleRisk)}`, hint: `${tradeProfile.max_risk_percent}% 風險模型`, tone: 'yellow' },
    { label: '權證投入上限', value: `$${formatMoney(risk.warrantBudget)}`, hint: '以 -20% 停損反推', tone: 'red' },
    { label: '選擇權權利金上限', value: `$${formatMoney(risk.optionPremiumBudget)}`, hint: '限買方 / 價差單', tone: 'purple' }
  ];

  return (
    <div className="grid-flow">
      <div className="card hero-card compact-hero">
        <div>
          <span className="eyebrow">歡迎回來</span>
          <h2>{profile?.nickname || profile?.display_name || profile?.email}</h2>
          <p>正式 V1 核心：大盤 → 主流 → 個股 → 買點 → 商品 → 風控。先判斷市場，再依個人資金與心理承受度配置商品。</p>
        </div>
        <div className="hero-actions stacked-mobile">
          <button className="primary-btn" onClick={() => go('tools')}>開啟標的工具箱</button>
          <button className="secondary-btn" onClick={() => go('profile')}>調整個人設定</button>
        </div>
      </div>

      <Card title="全球指數快覽" right={<span className="pill blue">橫向滑動</span>}>
        {marketIndices.map(group => (
          <div key={group.group} className="section-block">
            <div className="section-title">{group.group}</div>
            <div className="h-scroll">
              {group.items.map(item => <MarketChip key={item.name} item={item} />)}
            </div>
          </div>
        ))}
      </Card>

      <Card title="盤面判斷與系統狀態" right={<span className="pill purple">橫向滑動</span>}>
        <div className="h-scroll">
          {statusCards.map(card => <Ticker key={card.label} label={card.label} value={card.value} tone={card.tone} />)}
        </div>
      </Card>

      <Card title="個人目標與風險總覽" right={<span className="pill yellow">橫向滑動</span>}>
        <ProgressBlock goal={goal} deadline={tradeProfile.goal_deadline} />
        <div className="h-scroll space-top">
          {personalCards.map(card => <Kpi key={card.label} label={card.label} value={card.value} hint={card.hint} tone={card.tone} />)}
        </div>
      </Card>

      <div className="two-col">
        <Card title="主流族群排行">
          {sectors.map(s => <SectorRow key={s.name} sector={s} />)}
        </Card>
        <Card title="候選標的快覽">
          <div className="symbol-list compact">
            {symbols.slice(0, 6).map(sym => <SymbolMini key={sym.symbol} sym={sym} active={selectedSymbol.symbol === sym.symbol} onClick={() => { setSelectedSymbol(sym); go('tools'); }} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MarketChip({ item }) {
  return <div className={`market-chip ${item.tone}`}><small>{item.name}</small><b>{item.value}</b><span>{item.change}</span></div>;
}

function Ticker({ label, value, tone }) {
  return <div className={`ticker ${tone}`}><small>{label}</small><b>{value}</b></div>;
}

function ProgressBlock({ goal, deadline }) {
  return (
    <div className="progress-card">
      <div className="progress-top">
        <div>
          <small>目前目標進度</small>
          <strong>{goal.pct.toFixed(0)}%</strong>
        </div>
        <div className="align-right">
          <small>目標完成日</small>
          <strong>{deadline || '尚未設定'}</strong>
        </div>
      </div>
      <div className="progress-bar"><span style={{ width: `${goal.pct}%` }} /></div>
    </div>
  );
}

function Kpi({ label, value, hint, tone }) {
  return <div className={`kpi ${tone}`}><small>{label}</small><strong>{value}</strong><span>{hint}</span></div>;
}

function Card({ title, right, children }) {
  return <div className="card"><div className="card-head"><h3>{title}</h3>{right}</div>{children}</div>;
}

function SectorRow({ sector }) {
  return <div className="sector-row"><div><b>{sector.name}</b><span>{sector.note}</span></div><div className="score">{sector.score}</div><span className="pill green">{sector.status}</span></div>;
}

function SymbolMini({ sym, active, onClick }) {
  const status = entryStatus(sym.price, sym.support, sym.breakout);
  return <button className={`symbol-mini ${active ? 'active' : ''}`} onClick={onClick}><b>{sym.symbol} {sym.name}</b><small>{sym.type}｜{status.label}</small></button>;
}

function ProfilePage({ profile, role, tradeProfile, saveTradeProfile, isOwner, session }) {
  const [form, setForm] = useState(tradeProfile);
  useEffect(() => setForm(tradeProfile), [tradeProfile]);
  const sizing = positionSizing(form, symbols[0]);
  const goal = goalProgress(form);
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const bool = key => Boolean(form[key]);

  return (
    <div className="grid-flow">
      <Notice type="info" title="個人敏感資料權限" text="本金、心理承受度與商品偏好只有本人與最高管理員可看；一般管理員不可查看這些敏感資料。" />
      <div className="two-col">
        <Card title="登入與角色">
          <div className="info-list">
            <Info label="本名" value={profile?.real_name || '未填寫'} />
            <Info label="希望稱呼" value={profile?.nickname || profile?.display_name || '未填寫'} />
            <Info label="目前帳號" value={profile?.email || '尚未登入'} />
            <Info label="目前角色" value={roleLabel(role)} />
            <Info label="最高管理員" value={OWNER_EMAIL} />
            <Info label="最高管理員狀態" value={isOwner ? '是，寫死不可更改' : '否'} />
          </div>
          {!session && <Notice type="warn" title="尚未登入" text="正式儲存個人設定前，請先使用 Google 登入。" />}
        </Card>
        <Card title="目標與風險試算結果">
          <div className="info-list">
            <Info label="目標達成度" value={`${goal.pct.toFixed(0)}%`} />
            <Info label="單筆最大可虧損" value={`$${formatMoney(sizing.singleRisk)}`} />
            <Info label="權證建議投入上限" value={`$${formatMoney(sizing.warrantBudget)}`} />
            <Info label="選擇權權利金上限" value={`$${formatMoney(sizing.optionPremiumBudget)}`} />
            <Info label="零股練習預算" value={`$${formatMoney(sizing.fractionalBudget)}`} />
          </div>
        </Card>
      </div>
      <Card title="個人交易設定檔">
        <div className="form-grid">
          <Field label="可操作本金"><input type="number" value={form.capital_amount} onChange={e => update('capital_amount', e.target.value)} /></Field>
          <Field label="單筆最大虧損 %"><input type="number" step="0.1" value={form.max_risk_percent} onChange={e => update('max_risk_percent', e.target.value)} /></Field>
          <Field label="每月目標報酬 %"><input type="number" step="0.1" value={form.monthly_target_percent} onChange={e => update('monthly_target_percent', e.target.value)} /></Field>
          <Field label="單日心理承受虧損 %"><input type="number" step="0.1" value={form.max_daily_drawdown_percent} onChange={e => update('max_daily_drawdown_percent', e.target.value)} /></Field>
          <Field label="最大同時持倉"><input type="number" value={form.max_positions} onChange={e => update('max_positions', e.target.value)} /></Field>
          <Field label="保留現金比例 %"><input type="number" step="1" value={form.cash_reserve_percent} onChange={e => update('cash_reserve_percent', e.target.value)} /></Field>
          <Field label="預期達成獲利目標金額"><input type="number" value={form.goal_profit_amount || 0} onChange={e => update('goal_profit_amount', e.target.value)} /></Field>
          <Field label="目前已達成獲利"><input type="number" value={form.current_profit_amount || 0} onChange={e => update('current_profit_amount', e.target.value)} /></Field>
          <Field label="目標完成日期"><input type="date" value={form.goal_deadline || ''} onChange={e => update('goal_deadline', e.target.value)} /></Field>
          <Field label="交易模式"><select value={form.mode} onChange={e => update('mode', e.target.value)}><option value="conservative">保守</option><option value="balanced">平衡</option><option value="aggressive">積極</option><option value="learning">學習</option></select></Field>
        </div>
        <h4>商品偏好</h4>
        <div className="check-grid">
          {[
            ['allow_fractional', '零股'], ['allow_cash_stock', '現股'], ['allow_margin', '融資'], ['allow_stock_futures', '股票期貨'], ['allow_warrants', '權證'], ['allow_options', '選擇權'], ['can_follow_20pct_warrant_stop', '可執行權證 -20% 停損'], ['can_accept_futures_volatility', '可承受股期波動']
          ].map(([key, label]) => <label key={key} className="check"><input type="checkbox" checked={bool(key)} onChange={e => update(key, e.target.checked)} />{label}</label>)}
        </div>
        <Field label="補充說明"><textarea rows="3" value={form.notes || ''} onChange={e => update('notes', e.target.value)} /></Field>
        <button className="primary-btn" onClick={() => saveTradeProfile(form)}>儲存個人交易設定</button>
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Info({ label, value }) {
  return <div className="info"><span>{label}</span><b>{value}</b></div>;
}

function CoreLogicPage() {
  return (
    <div className="grid-flow">
      <Card title="底層邏輯優先序">
        <div className="priority-list">
          {['風大 × 浪跡交易系統', '講義 / 風大股票 3 號機彙整', '最高管理員規則', '心理防禦與權證風控報告', 'AI 參考分析'].map((item, i) => <div key={item}><strong>{i + 1}</strong><span>{item}</span></div>)}
        </div>
      </Card>
      <div className="two-col">
        <Card title="三層過濾系統">
          <Step title="1. 大盤" text="大盤未轉強，不重倉。加權、台期、費半、小娜與美債須同步觀察。" />
          <Step title="2. 主流" text="只做資金正在流入的族群，主流明確時勝率與肉量才足。" />
          <Step title="3. 個股" text="挑領頭股、二線接力、剛突破、回撐、A 點，避免雜魚與追新聞。" />
        </Card>
        <Card title="五大進場戰術">
          {['買撐：靠支撐，停損點近。', '跌破支撐：轉壓，觀察假跌破或轉手。', '不回支撐追強：只限主升段，移動停損。', '5MA 買法：強勢生命線，破線退出。', 'A 點買法：低基期轉強且風險明確。'].map(t => <div key={t} className="rule-line">{t}</div>)}
        </Card>
      </div>
      <Card title="善用一半法則">
        <p>到第一波滿足、槓桿商品獲利 30%～50%、股期獲利接近翻倍、高檔震盪變大或利多頻傳但不再創高，先出一半。剩餘部位以 5MA、突破線或帶量紅 K 低點續抱，把風險單轉成零成本利潤單。</p>
      </Card>
    </div>
  );
}

function Step({ title, text }) {
  return <div className="step"><b>{title}</b><span>{text}</span></div>;
}

function ToolsPage({ tradeProfile, selectedSymbol, setSelectedSymbol }) {
  const bands = supportBands(selectedSymbol.support);
  const status = entryStatus(selectedSymbol.price, selectedSymbol.support, selectedSymbol.breakout);
  const rec = toolRecommendation(tradeProfile, selectedSymbol);
  const pct = pctFromSupport(selectedSymbol.price, selectedSymbol.support);

  return (
    <div className="grid-flow">
      <Card title="選擇標的" right={<span className="pill blue">點選後即時計算</span>}>
        <div className="symbol-list">
          {symbols.map(sym => <SymbolMini key={sym.symbol} sym={sym} active={selectedSymbol.symbol === sym.symbol} onClick={() => setSelectedSymbol(sym)} />)}
        </div>
      </Card>
      <div className="card tool-card">
        <div className="tool-head">
          <div><span className="eyebrow">{selectedSymbol.sector}｜{selectedSymbol.type}</span><h2>{selectedSymbol.symbol} {selectedSymbol.name}</h2><p>{selectedSymbol.setup}</p></div>
          <span className={`signal ${status.level}`}>{status.label}</span>
        </div>
        <div className="price-grid">
          <Kpi label="目前價" value={formatPrice(selectedSymbol.price)} hint={`距支撐 ${pct.toFixed(2)}%`} tone="blue" />
          <Kpi label="支撐" value={formatPrice(bands.support)} hint="最佳低風險試錯點" tone="green" />
          <Kpi label="+1%" value={formatPrice(bands.plus1)} hint="可買區" tone="green" />
          <Kpi label="+2%" value={formatPrice(bands.plus2)} hint="小部位觀察" tone="yellow" />
          <Kpi label="+3%" value={formatPrice(bands.plus3)} hint="不追高警戒" tone="red" />
          <Kpi label="停損" value={formatPrice(selectedSymbol.stop)} hint="跌破假設失效" tone="red" />
        </div>
        <Notice type={status.level === 'red' ? 'warn' : 'info'} title="買點判斷" text={status.detail} />
      </div>
      <Card title="依你的個人交易設定產生的商品建議">
        <div className="tool-table">
          {rec.rows.map(row => <div key={row.tool} className={`tool-row ${row.enabled ? 'enabled' : ''}`}><b>{row.tool}</b><span>{row.verdict}</span><strong>{row.tool === '股票期貨' ? `一口停損 $${formatMoney(row.amount)}` : `建議上限 $${formatMoney(row.amount)}`}</strong></div>)}
        </div>
      </Card>
      <Card title="操作紀律提醒">
        <div className="rule-grid">
          <div>買撐：支撐 0～2% 內最佳，超過 3% 不追。</div>
          <div>追突破：突破後 +1% 內可觀察，跌回突破點是假突破。</div>
          <div>權證：-20% 絕對停損，2～3 天不發動撤離。</div>
          <div>股期：以現貨支撐停損，不補保證金凹單。</div>
          <div>選擇權：新手只做買方或價差單，不裸賣。</div>
          <div>獲利：到滿足或槓桿獲利 30%～50%，善用一半。</div>
        </div>
      </Card>
    </div>
  );
}

function WarrantsPage({ selectedSymbol, setSelectedSymbol }) {
  const candidates = demoWarrants.filter(w => w.underlying_symbol === selectedSymbol.symbol);
  return (
    <div className="grid-flow">
      <Card title="權證搜尋標的">
        <div className="symbol-list compact">
          {symbols.filter(s => s.hasWarrants).map(sym => <SymbolMini key={sym.symbol} sym={sym} active={selectedSymbol.symbol === sym.symbol} onClick={() => setSelectedSymbol(sym)} />)}
        </div>
      </Card>
      <Card title={`${selectedSymbol.symbol} ${selectedSymbol.name}｜權證黃金漏斗`} right={<a className="link-btn" href={`https://www.warrantwin.com.tw/eyuanta/Warrant/Search.aspx?SID=${selectedSymbol.symbol}`} target="_blank" rel="noreferrer">開啟元大權證網</a>}>
        <div className="rule-grid">
          <div>先確認現股可買，不是先找權證。</div><div>剩餘天數至少 60 天，波段 90 天以上。</div><div>價格 0.7～3 元，低於 0.5 元不碰。</div><div>有效槓桿 4～8 倍，大牛股可略高。</div><div>價內 5%～價外 10%。</div><div>價差槓桿比 ≤ 0.3。</div><div>流通在外 10%～80%。</div><div>元大、凱基、麥格理、群益、統一優先。</div>
        </div>
      </Card>
      <Card title="候選權證 Demo 清單">
        {candidates.length === 0 ? <Notice type="warn" title="目前無模擬候選" text="正式版會先提供元大連結，再逐步接 TWSE / TEJ / 資料商 API。" /> : <div className="warrant-list">{candidates.map(w => <WarrantRow key={w.warrant_code} warrant={w} />)}</div>}
      </Card>
    </div>
  );
}

function WarrantRow({ warrant }) {
  const score = warrantScore(warrant);
  return <div className="warrant-row"><div><b>{warrant.warrant_code} {warrant.warrant_name}</b><span>{warrant.issuer}｜{warrant.remaining_days}天｜槓桿 {warrant.effective_gearing}x｜價內外 {warrant.moneyness_percent}%</span></div><div><strong>{score}</strong><small>漏斗分</small></div><a href={warrant.external_url} target="_blank" rel="noreferrer">查詢</a></div>;
}

function ReportPage({ generateAiReport, aiReport, aiLoading, selectedSymbol }) {
  return (
    <div className="grid-flow">
      <Card title="AI 盤後分析工作流">
        <div className="priority-list">
          {['收集盤後資料', '套用風大 × 浪跡規則', '產生 AI 參考分析', '管理員人工確認', '正式發布日報'].map((s, i) => <div key={s}><strong>{i + 1}</strong><span>{s}</span></div>)}
        </div>
        <button className="primary-btn" onClick={generateAiReport} disabled={aiLoading}>{aiLoading ? '產生中...' : `產生 ${selectedSymbol.symbol} 參考分析`}</button>
      </Card>
      <Card title="AI 參考分析輸出">
        <pre className="report-box">{aiReport || '尚未產生。正式版會將內容存入 daily_reports / ai_analyses，並等待人工確認後發布。'}</pre>
      </Card>
    </div>
  );
}

function AdminPage({ role, isAdminLike, isOwner, users, updateApproval }) {
  return (
    <div className="grid-flow">
      <Notice type={isOwner ? 'info' : 'warn'} title="最高管理員寫死" text={`最高管理員固定為 ${OWNER_EMAIL}，不可由一般 UI 變更。`} />
      <Card title="權限矩陣">
        <div className="permission-table">
          <div><b>最高管理員</b><span>看所有個人敏感資料、審核新使用者、調整角色、發布策略、管理規則。</span></div>
          <div><b>管理員</b><span>可確認 AI 參考分析與公開圖層，但不可看個人本金與心理承受度。</span></div>
          <div><b>個人使用者</b><span>查看公開分析、保存自己的交易設定、私有圖層與觀察筆記。</span></div>
          <div><b>閱覽者</b><span>只能看公開圖層、公開警示與已發布日報。</span></div>
        </div>
      </Card>
      {isOwner && (
        <Card title="新申請使用者審核">
          <div className="review-list">
            {users.filter(u => u.role !== 'owner').map(user => (
              <div key={user.id} className="review-row">
                <div>
                  <b>{user.real_name || '未填本名'} / {user.nickname || user.display_name || '未填稱呼'}</b>
                  <span>{user.email}</span>
                  <small>狀態：{approvalLabel(user.access_status || 'pending')}｜本金：{user.tradeProfile ? `$${formatMoney(user.tradeProfile.capital_amount)}` : '未填寫'}</small>
                </div>
                <div className="review-actions">
                  <button className="small-btn" onClick={() => updateApproval(user.id, 'approved')}>核准</button>
                  <button className="small-btn danger" onClick={() => updateApproval(user.id, 'rejected')}>退回</button>
                </div>
              </div>
            ))}
            {users.filter(u => u.role !== 'owner').length === 0 && <div className="empty-text">目前沒有待審核資料。</div>}
          </div>
        </Card>
      )}
      <Card title="正式後端服務拆分">
        <div className="rule-grid"><div>market-worker：盤中輪詢與資料更新</div><div>pattern-engine：型態辨識與滿足目標</div><div>alert-engine：去重、冷卻、分級通知</div><div>line-gateway：LINE Messaging API 對接</div><div>report-worker：盤後日報輸出</div><div>ai-evaluator：命中率與修正差異追蹤</div></div>
      </Card>
      {!isAdminLike && <Notice type="warn" title="目前角色權限不足" text={`你的目前角色是 ${roleLabel(role)}。此頁正式版會限制部分操作。`} />}
    </div>
  );
}

function BackHome({ go }) {
  return <div className="back-home"><button className="secondary-btn" onClick={() => go('dashboard')}>🏠 回到首頁</button></div>;
}

function buildFallbackReport(sym, tradeProfile) {
  const status = entryStatus(sym.price, sym.support, sym.breakout);
  const sizing = positionSizing(tradeProfile, sym);
  return `【${sym.symbol} ${sym.name}】AI 參考分析（本頁為示意草案，需人工確認）\n\n1. 大盤與主流：先確認大盤未破關鍵支撐，且 ${sym.sector} 仍屬主流或準主流。\n2. 買點：目前 ${status.label}。\n3. 支撐：${formatPrice(sym.support)}，停損：${formatPrice(sym.stop)}，第一滿足：${formatPrice(sym.target1)}。\n4. 資金：依你的設定，單筆最大風險約 $${formatMoney(sizing.singleRisk)}。\n5. 權證：若使用權證，投入上限約 $${formatMoney(sizing.warrantBudget)}，-20% 必須停損，2～3 天不發動撤離。\n6. 結論：符合低風險買點才出手；若離支撐過遠，不追高。`;
}

createRoot(document.getElementById('root')).render(<App />);
