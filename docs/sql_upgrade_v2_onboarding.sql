-- 台股 AI 智慧監控 v2 升級 SQL
-- 目的：新增首次登入申請欄位、審核狀態、個人目標進度欄位

alter table public.profiles
  add column if not exists real_name text,
  add column if not exists nickname text,
  add column if not exists access_status text not null default 'pending' check (access_status in ('pending','approved','rejected')),
  add column if not exists application_submitted_at timestamptz,
  add column if not exists approved_at timestamptz;

alter table public.personal_trade_profiles
  add column if not exists goal_profit_amount numeric(14,2) not null default 0,
  add column if not exists current_profit_amount numeric(14,2) not null default 0,
  add column if not exists goal_deadline date;

comment on column public.profiles.real_name is '使用者本名，首次登入必填。';
comment on column public.profiles.nickname is '希望被稱呼的名字或綽號。';
comment on column public.profiles.access_status is '帳號審核狀態：pending / approved / rejected。';
comment on column public.personal_trade_profiles.goal_profit_amount is '使用者預期達成的累計獲利目標金額。';
comment on column public.personal_trade_profiles.current_profit_amount is '目前已達成獲利，可用於進度條。';
comment on column public.personal_trade_profiles.goal_deadline is '目標完成日期。';

update public.profiles
set access_status = 'approved',
    approved_at = coalesce(approved_at, now())
where lower(email) = lower(public.owner_email());
