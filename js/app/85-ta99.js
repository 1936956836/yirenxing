// 85-ta99.js —— v12.8 【Ta】情侣空间：邀请码绑定 · 数据共享 · 情侣签到 · 纪念日 · 互相设置打卡
//   v12.9.22 深化：💌 小纸条（含定时信）· 🌠 心愿单 · 💬 每日一问——全部存 couples99.extra（_ta99Mutate 写回），无需改表
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 定位：【记录】板块子页（App.gotoWb('ta99')），入口是记录页第一张导航卡
// 架构：Supabase 云端（需登录云账号，与同步页同一套账号体系）——
//   · invites99 表：邀请码（我生成 → 发给Ta → Ta输入即绑定）
//   · couples99 表：情侣行（user_a/user_b + share_a/share_b 双方共享快照 + extra 共同数据）
//   · 绑定/写入/解除走 security definer RPC（ta99_claim / ta99_write / ta99_leave），表 RLS 仅成员可读
//   · 共享内容（克制摘要，不导明细库）：打卡近 7 日 / 经济本月 / 医疗摘要与近期记录
//   · 隐私红线：HIV / HPV / TP 等健康隐私记录永不出密码箱，不进入共享快照
// 风格：克制表达 —— 主页一张 hero + 七张导航卡；每个子页只做一件事；留白多、层级少、玫瑰色单点缀
Object.assign(App, {
  _ta99: { tab: 'home', moments: 'ta', momentsLk: 'daily', row: null, invite: null, msg: '' },

  // ===== 自动搭建：ta99_init() 幂等函数 =====
  // 终端用户首次进入【Ta】时，App 会自动 RPC 调用 ta99_init() 完成全部建表/RLS/函数搭建——
  // 用户无需任何手动操作。开发者只需在 Supabase SQL Editor 执行「一次」下方 SQL（仅建 ta99_init 函数本身）。
  // 一旦 ta99_init 存在，所有终端用户都自动一键搭建完成。
  // 用 ES6 反引号模板字符串：单引号直接写、PostgreSQL 双单引号 '' 转义也直接写
  // v12.9.47 邀请码绑定修复：老库 ta99_claim(code) 的参数名 code 与 invites99.code 列名冲突，
  //   PL/pgSQL 变量冲突默认直接报错（42702 column reference "code" is ambiguous）→ 输入对方邀请码必失败。
  //   修复：参数改名 p_code + 所有列引用全限定。此 SQL 在 Supabase SQL Editor 执行一次即全项目生效（不动任何数据）。
  TA99_FIX_SQL: `-- 一人行 ·【Ta】邀请码绑定修复（v12.9.47b · 修正版）
-- 修复：输入对方邀请码报错 column reference "code" is ambiguous（参数名与列名冲突）。
-- ⚠️ v2 修正：PG 不允许 CREATE OR REPLACE 改参数名（42P13 cannot change name of input parameter），
--    必须 DROP 后再 CREATE——本段已按此顺序写好，直接整段执行即可。
drop function if exists public.ta99_claim(text);
create function public.ta99_claim(p_code text) returns json
language plpgsql security definer set search_path = public as $f$
declare inv record; me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false, 'msg', '请先登录'); end if;
  select * into inv from public.invites99 where public.invites99.code = upper(p_code) for update;
  if not found then return json_build_object('ok', false, 'msg', '邀请码不存在'); end if;
  if inv.owner = me then return json_build_object('ok', false, 'msg', '这是你自己的邀请码——要输入Ta的'); end if;
  if inv.claimed_by is not null then return json_build_object('ok', false, 'msg', '邀请码已被使用'); end if;
  if exists (select 1 from public.couples99 where user_a = me or user_b = me) then return json_build_object('ok', false, 'msg', '你已有另一半'); end if;
  if exists (select 1 from public.couples99 where user_a = inv.owner or user_b = inv.owner) then return json_build_object('ok', false, 'msg', '对方已绑定他人'); end if;
  update public.invites99 set claimed_by = me where public.invites99.code = inv.code;
  insert into public.couples99 (user_a, user_b, since) values (inv.owner, me, current_date);
  return json_build_object('ok', true);
end $f$;
revoke execute on function public.ta99_claim(text) from anon, public;
grant execute on function public.ta99_claim(text) to authenticated;
notify pgrst, 'reload schema';`,

  // v12.9.48 终极升级包：邮箱直绑（ta99_bind/accept/deny + bindreq99 表）+ 自升级器 ta99_upgrade()
  // —— 这是【最后一次】需要手动执行的 SQL：今后情侣空间新功能全部走 couples99.extra 扩展位，
  //    不再改云端表结构；App 检测到缺件时会自动调用 ta99_upgrade() 补齐，无需再粘贴任何 SQL。
  TA99_SQL: `-- 一人行 ·【Ta】情侣空间 · 终极升级 v12.9.48（最后一次手动执行 SQL）
-- ① 修复邀请码函数；② 新增「邮箱直绑」：输Ta的邮箱发起 → Ta点「接受」→ 绑定完成（邀请码降为备用）
-- ③ 自升级器：App 以后检测到云端缺件时自动调用 ta99_upgrade() 补齐，无需再手动执行 SQL
create or replace function public.ta99_upgrade() returns json
language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  -- ① 基础两表（已存在则跳过，不动数据）
  select count(*) into cnt from information_schema.tables where table_schema = 'public' and table_name = 'invites99';
  if cnt = 0 then
    execute 'create table public.invites99 (
      code text primary key,
      owner uuid not null references auth.users on delete cascade,
      claimed_by uuid references auth.users on delete cascade,
      created_at timestamptz not null default now()
    )';
    execute 'alter table public.invites99 enable row level security';
    execute 'drop policy if exists "inv_own" on public.invites99';
    execute 'create policy "inv_own" on public.invites99 for all to authenticated using (auth.uid() = owner) with check (auth.uid() = owner)';
    execute 'create table public.couples99 (
      id uuid primary key default gen_random_uuid(),
      user_a uuid not null references auth.users on delete cascade,
      user_b uuid not null references auth.users on delete cascade,
      since date,
      share_a jsonb,
      share_b jsonb,
      extra jsonb,
      updated_at timestamptz not null default now()
    )';
    execute 'alter table public.couples99 enable row level security';
    execute 'drop policy if exists "cpl_member" on public.couples99';
    execute 'create policy "cpl_member" on public.couples99 for all to authenticated using (auth.uid() = user_a or auth.uid() = user_b) with check (auth.uid() = user_a or auth.uid() = user_b)';
  end if;

  -- ② 邀请码函数（DROP 后重建：参数名 code→p_code，OR REPLACE 不允许改名）
  execute 'drop function if exists public.ta99_claim(text)';
  execute 'create function public.ta99_claim(p_code text) returns json language plpgsql security definer set search_path = public as $f$ declare inv record; me uuid := auth.uid(); begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; select * into inv from public.invites99 where public.invites99.code = upper(p_code) for update; if not found then return json_build_object(''ok'', false, ''msg'', ''邀请码不存在''); end if; if inv.owner = me then return json_build_object(''ok'', false, ''msg'', ''这是你自己的邀请码——要输入Ta的''); end if; if inv.claimed_by is not null then return json_build_object(''ok'', false, ''msg'', ''邀请码已被使用''); end if; if exists (select 1 from public.couples99 where user_a = me or user_b = me) then return json_build_object(''ok'', false, ''msg'', ''你已有另一半''); end if; if exists (select 1 from public.couples99 where user_a = inv.owner or user_b = inv.owner) then return json_build_object(''ok'', false, ''msg'', ''对方已绑定他人''); end if; update public.invites99 set claimed_by = me where public.invites99.code = inv.code; insert into public.couples99 (user_a, user_b, since) values (inv.owner, me, current_date); return json_build_object(''ok'', true); end $f$';

  -- ③ 绑定请求表（邮箱直绑的核心：from 发起人 · to 接收人 · note 发起人邮箱 · to_email 对方邮箱）
  select count(*) into cnt from information_schema.tables where table_schema = 'public' and table_name = 'bindreq99';
  if cnt = 0 then
    execute 'create table public.bindreq99 (
      id uuid primary key default gen_random_uuid(),
      from_user uuid not null references auth.users on delete cascade,
      to_user uuid not null references auth.users on delete cascade,
      note text,
      to_email text,
      created_at timestamptz not null default now()
    )';
    execute 'alter table public.bindreq99 enable row level security';
  end if;
  execute 'drop policy if exists "bindreq_rw" on public.bindreq99';
  execute 'create policy "bindreq_rw" on public.bindreq99 for all to authenticated using (auth.uid() = from_user or auth.uid() = to_user) with check (auth.uid() = from_user)';

  -- ④ 邮箱直绑三函数
  execute 'create or replace function public.ta99_bind(p_email text) returns json language plpgsql security definer set search_path = public as $f$ declare me uuid := auth.uid(); partner uuid; mymail text; begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; select id, email into partner, mymail from auth.users where lower(email) = lower(btrim(p_email)) limit 1; if partner is null then return json_build_object(''ok'', false, ''msg'', ''这个邮箱还没有注册一人行云账号——让Ta先用这个邮箱注册并登录一次''); end if; if partner = me then return json_build_object(''ok'', false, ''msg'', ''不能绑定自己哦''); end if; if exists (select 1 from public.couples99 where user_a = me or user_b = me) then return json_build_object(''ok'', false, ''msg'', ''你已有另一半''); end if; if exists (select 1 from public.couples99 where user_a = partner or user_b = partner) then return json_build_object(''ok'', false, ''msg'', ''对方已绑定他人''); end if; delete from public.bindreq99 where from_user = me or to_user = me or to_user = partner or from_user = partner; insert into public.bindreq99 (from_user, to_user, note, to_email) values (me, partner, mymail, lower(btrim(p_email))); return json_build_object(''ok'', true); end $f$';
  execute 'create or replace function public.ta99_accept(p_from uuid) returns json language plpgsql security definer set search_path = public as $f$ declare me uuid := auth.uid(); n int; begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; delete from public.bindreq99 where from_user = p_from and to_user = me; get diagnostics n = row_count; if n = 0 then return json_build_object(''ok'', false, ''msg'', ''这条绑定请求已不存在（可能已被撤回）''); end if; if exists (select 1 from public.couples99 where user_a = me or user_b = me) then return json_build_object(''ok'', false, ''msg'', ''你已有另一半''); end if; if exists (select 1 from public.couples99 where user_a = p_from or user_b = p_from) then return json_build_object(''ok'', false, ''msg'', ''对方已绑定他人''); end if; insert into public.couples99 (user_a, user_b, since) values (p_from, me, current_date); delete from public.bindreq99 where from_user in (me, p_from) or to_user in (me, p_from); return json_build_object(''ok'', true); end $f$';
  execute 'create or replace function public.ta99_deny(p_from uuid) returns json language plpgsql security definer set search_path = public as $f$ declare me uuid := auth.uid(); begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; delete from public.bindreq99 where from_user = p_from and to_user = me; return json_build_object(''ok'', true); end $f$';

  -- ⑤ 写入 / 解绑照旧刷新一遍
  execute 'create or replace function public.ta99_write(target text, data jsonb) returns json language plpgsql security definer set search_path = public as $f$ declare me uuid := auth.uid(); n int; begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; if target = ''share_a'' then update public.couples99 set share_a = data, updated_at = now() where user_a = me; elsif target = ''share_b'' then update public.couples99 set share_b = data, updated_at = now() where user_b = me; elsif target = ''extra'' then update public.couples99 set extra = data, updated_at = now() where user_a = me or user_b = me; elsif target = ''since'' then update public.couples99 set since = (data ->> ''d'')::date, updated_at = now() where user_a = me or user_b = me; else return json_build_object(''ok'', false, ''msg'', ''参数不对''); end if; get diagnostics n = row_count; if n = 0 then return json_build_object(''ok'', false, ''msg'', ''还没绑定另一半''); end if; return json_build_object(''ok'', true); end $f$';
  execute 'create or replace function public.ta99_leave() returns json language plpgsql security definer set search_path = public as $f$ declare me uuid := auth.uid(); n int; begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; delete from public.couples99 where user_a = me or user_b = me; get diagnostics n = row_count; delete from public.invites99 where owner = me; delete from public.bindreq99 where from_user = me or to_user = me; return json_build_object(''ok'', n > 0); end $f$';

  -- ⑥ 权限收紧（anon/public 一律不可执行）
  execute 'revoke execute on function public.ta99_claim(text) from anon, public';
  execute 'revoke execute on function public.ta99_write(text, jsonb) from anon, public';
  execute 'revoke execute on function public.ta99_leave() from anon, public';
  execute 'revoke execute on function public.ta99_bind(text) from anon, public';
  execute 'revoke execute on function public.ta99_accept(uuid) from anon, public';
  execute 'revoke execute on function public.ta99_deny(uuid) from anon, public';
  execute 'grant execute on function public.ta99_claim(text) to authenticated';
  execute 'grant execute on function public.ta99_write(text, jsonb) to authenticated';
  execute 'grant execute on function public.ta99_leave() to authenticated';
  execute 'grant execute on function public.ta99_bind(text) to authenticated';
  execute 'grant execute on function public.ta99_accept(uuid) to authenticated';
  execute 'grant execute on function public.ta99_deny(uuid) to authenticated';

  notify pgrst, 'reload schema';
  return json_build_object('ok', true, 'v', '12.9.48');
end $$;

-- ta99_init 变成升级器入口（老 App 调 init 也自动走升级，一个入口两代 App 通用）
create or replace function public.ta99_init() returns json
language plpgsql security definer set search_path = public as $$
begin
  return public.ta99_upgrade();
end $$;

revoke all on function public.ta99_upgrade() from anon, public;
grant execute on function public.ta99_upgrade() to authenticated;
revoke all on function public.ta99_init() from anon, public;
grant execute on function public.ta99_init() to authenticated;

-- 立即执行：把当前库升到 v12.9.48（幂等，可重复执行，不动任何数据）
select public.ta99_upgrade();`,

  // 精简提示 SQL（仅当云端连自升级器都没有时显示 · 这是最后一次）
  TA99_INIT_HINT:
    '检测到云端还没有【Ta】的升级组件——请到 Supabase SQL Editor 执行下方 SQL 一次（这是最后一次手动执行），之后所有升级 App 会自动完成。',

  // ===== v12.9.22 每日一问题库（克制温和 · 按日期确定性选题：两人同一天看到同一题）=====
  TA99_QA_BANK: [
    '今天有什么小事让你觉得还不错？',
    '如果周末完全属于你们俩，你想怎么过？',
    '你最想和Ta一起去的一个地方是哪里？为什么是那里？',
    '最近Ta做的哪件事让你心里一暖？',
    '压力大的日子里，你希望被怎样安慰？',
    '你最近在为什么事情努力？',
    'Ta身上哪个小习惯你觉得很可爱？',
    '今年你们最值得纪念的一天是哪天？发生了什么？',
    '你小时候最喜欢的一件事是什么？',
    '最近有哪句话一直记在心里？',
    '你理想中"老了以后的一天"是什么样子？',
    '最近有没有什么想学的东西？',
    '你们之间有没有一个只属于你们的梗？',
    '今天身体感觉怎么样？累不累？',
    '你最近一次开怀大笑是因为什么？',
    '如果可以立刻吃一样东西，你想吃什么？',
    'Ta做过的哪顿饭让你印象最深？',
    '你希望对方多做一些的小事是什么？',
    '你希望对方少做一些的小事是什么？',
    '最近睡觉睡得好吗？梦里有什么？',
    '你觉得自己最近最大的变化是什么？',
    '在一起以来，你觉得自己变得更好的地方是哪里？',
    '你最喜欢和Ta一起做的安静的事是什么？',
    '有没有一部想和Ta一起看的电影/剧？',
    '有没有一首歌让你想起Ta？',
    '你的"电量满格"需要什么？',
    '什么事情会让你瞬间心情变好？',
    '你最近在担心什么？说出来会不会轻一点？',
    '你对未来一年最大的期待是什么？',
    '你们第一次见面时，你对Ta的第一印象是什么？',
    '你有没有什么从没告诉过Ta的小心思？',
    '如果给现在的你们拍一张照片，你想在哪里拍？',
    '你希望你们一直保持的仪式感是什么？',
    '你觉得自己被爱着的瞬间是什么时候？',
    '今天想对Ta说的一句实话是什么？',
  ],

  // ==================== 主入口 ====================
  _wbTa99(wb, W) {
    this.ta99Refresh(); // 异步拉取云端（邀请码/情侣行/绑定请求），完成后局部刷新 #ta99-body
    this._ta99Poll();   // v12.9.48 轻轮询：对方发起绑定 / 接受时自动出现，不用手动刷新
    setTimeout(() => { try { this.ta99FlowBind(); } catch (e) {} }, 0);   // v12.9.49 封面流首次接线
    return `<div id="ta99-body">${this._ta99Render()}</div>`;
  },
  // v12.9.48 绑定轻轮询（20s）：只查绑定状态，变化才局部重绘；正在输入邮箱/邀请码时跳过本轮
  // v12.9.49 已绑定态升级：改为 45s 共同数据轮询——对方发约会卡 / 更新目标 / 农场浇水 / 上传相册，
  //   停留在本页时自动出现（updated_at 变了才拉全量重绘，平时零流量）
  _ta99Poll() {
    clearInterval(this.__ta99PollInt);
    this.__ta99RowUpd = null;
    this.__ta99PollInt = setInterval(async () => {
      const c = this._c99, t = this._ta99;
      if (!document.getElementById('ta99-body') || !c || !c.client || !c.user) return;
      // —— 已绑定：共同数据轮询（45s 节流）——
      if (t.row) {
        try {
          const now = Date.now();
          if (now - (this.__ta99RowAt || 0) < 45000) return;
          this.__ta99RowAt = now;
          const { data: row } = await c.client.from('couples99').select('id, updated_at')
            .or(`user_a.eq.${c.user.id},user_b.eq.${c.user.id}`).maybeSingle();
          if (row && this.__ta99RowUpd && row.updated_at !== this.__ta99RowUpd) {
            await this.ta99Refresh(true);   // 对方有动作：全量刷新（重绘当前子页）
          }
          if (row) this.__ta99RowUpd = row.updated_at;
        } catch (e) {}
        return;
      }
      try {
        const ae = document.activeElement;
        if (ae && (ae.id === 'ta99-email-in' || ae.id === 'ta99-code-in')) return;
        const { data: reqs, error } = await c.client.from('bindreq99')
          .select('id, from_user, to_user, note, to_email, created_at')
          .or(`from_user.eq.${c.user.id},to_user.eq.${c.user.id}`)
          .order('created_at', { ascending: false }).limit(5);
        if (error) return;
        const bindIn = (reqs || []).find(r => r.to_user === c.user.id) || null;
        const bindOut = (!bindIn && (reqs || []).find(r => r.from_user === c.user.id)) || null;
        const sig = JSON.stringify([bindIn, bindOut]);
        if (sig !== t.__bindSig || t.needUpgrade) {
          t.__bindSig = sig;
          t.bindIn = bindIn;
          t.bindOut = bindOut;
          t.needUpgrade = false;
          this._ta99Rerender();
        }
        // 对方已接受：情侣行出现 → 停轮询，全量刷新进已绑定视图
        const { data: row } = await c.client.from('couples99').select('id')
          .or(`user_a.eq.${c.user.id},user_b.eq.${c.user.id}`).maybeSingle();
        if (row) { clearInterval(this.__ta99PollInt); await this.ta99Refresh(true); }
      } catch (e) {}
    }, 20000);
  },
  _ta99Render() {
    const c = this._c99;
    if (!c || !c.client || c.state === 'sdk-missing') {
      return `<div class="card ta99-hero">
        <div class="card-title" style="justify-content:center"><span class="ico">❤️</span>Ta · 情侣空间</div>
        <div class="empty">当前处于离线模式（单文件版未联网）——联网刷新后即可使用【Ta】。</div>
      </div>`;
    }
    if (!c.user) return this._ta99LoginView();
    const t = this._ta99;
    const msg = t.msg ? `<div class="ta99-msg">${t.msg}</div>` : '';
    if (t.row) return msg + this._ta99BoundView();
    return msg + this._ta99BindView();
  },
  _ta99Rerender() {
    try {
      const el = document.getElementById('ta99-body');
      if (el && this._wbView === 'ta99') {
        el.innerHTML = this._ta99Render();
        // v12.9.49 封面流：主页渲染后接线 3D 轮播（滑动/点按）
        if (this._ta99.tab === 'home' || !this._ta99.tab) this.ta99FlowBind();
      }
    } catch (e) {}
  },
  _ta99Msg(text) {
    this._ta99.msg = text;
    try {
      const el = document.getElementById('ta99-msg');
      if (el) el.innerHTML = text;
      else this._ta99Rerender();
    } catch (e) {}
  },

  // ==================== 云端拉取 / 共享推送 ====================
  // v12.9.15 当前连接项目（显示用）：App 实际连的 Supabase 项目域名——建表 SQL 必须在这个项目里执行
  _ta99Host() {
    try { return ((this._c99.cfg || {}).url || '').replace(/^https?:\/\//, '').replace(/\/$/, '') || '未配置'; } catch (e) { return '未配置'; }
  },
  async ta99Refresh(force) {
    const c = this._c99, t = this._ta99;
    if (!c || !c.client || !c.user) return;
    try {
      let invite = null;
      const { data: invs, error: e1 } = await c.client.from('invites99')
        .select('code, claimed_by, created_at').eq('owner', c.user.id)
        .order('created_at', { ascending: false }).limit(1);
      if (!e1 && invs && invs.length) invite = invs[0];
      const { data: row, error: e2 } = await c.client.from('couples99')
        .select('*').or(`user_a.eq.${c.user.id},user_b.eq.${c.user.id}`).maybeSingle();
      const missT = (em) => /does not exist|Could not find|not found|PGRST205/i.test(em || '');
      if ((e1 && missT(e1.message)) || (e2 && missT(e2.message))) {
        // v12.9.30 自动搭建：表缺失时自动调用 ta99_init() 完成全部搭建——用户无需任何手动操作
        // 仅当 ta99_init 函数本身也不存在时，才会显示「开发者首次部署」提示
        t.msg = '⚙️ 正在自动搭建【Ta】空间…';
        this._ta99Rerender();
        const initResult = await this._ta99Init();
        if (initResult && initResult.ok) {
          // 搭建成功：重新拉取一次（这次应该能拿到表）
          t.msg = '';
          await this.ta99Refresh(true);
          return;
        }
        // 搭建失败（多数情况是 ta99_init 函数本身还没部署）：显示开发者部署提示
        t.msg = initResult && initResult.needDeploy
          ? `🛠️ 首次部署提示：${this.TA99_INIT_HINT}`
          : ('⚠️ 自动搭建失败：' + (initResult && initResult.error || '请稍后重试'));
      } else if (e2 || e1) {
        t.msg = '⚠️ ' + ((e2 || e1).message || '云端读取失败');
      } else {
        t.msg = '';
      }
      // v12.9.48 邮箱直绑：拉取绑定请求（我收到的 bindIn / 我发出的 bindOut）
      let bindIn = null, bindOut = null;
      const { data: reqs, error: e3 } = await c.client.from('bindreq99')
        .select('id, from_user, to_user, note, to_email, created_at')
        .or(`from_user.eq.${c.user.id},to_user.eq.${c.user.id}`)
        .order('created_at', { ascending: false }).limit(5);
      if (!e3 && reqs) {
        bindIn = reqs.find(r => r.to_user === c.user.id) || null;
        bindOut = (!bindIn && reqs.find(r => r.from_user === c.user.id)) || null;
      }
      if (e3 && missT(e3.message)) {
        // 云端缺新表：先试自升级器（老库连升级器都没有 → 显示「最后一次 SQL」卡片）
        if (!t.__upTry) {
          t.__upTry = 1;
          const { error: ue } = await c.client.rpc('ta99_upgrade');
          if (!ue) { t.__upTry = 0; await this.ta99Refresh(true); return; }
          if (missT(ue.message)) t.needUpgrade = true;
        } else t.needUpgrade = true;
      } else t.needUpgrade = false;
      t.bindIn = bindIn;
      t.bindOut = bindOut;
      t.__bindSig = JSON.stringify([bindIn, bindOut]);
      t.row = row || null;
      t.invite = invite;
      // v12.9.38 旧版残留邀请码自动换代：云端若还挂着旧版生成的「字母+数字」码（新版输入框只收 6 位数字
      //   会导致 Ta 永远输不进去），未使用时自动重生成一张 6 位纯数字码，一代内自愈
      if (invite && !invite.claimed_by && !/^\d{6}$/.test(String(invite.code || ''))) {
        await this.ta99GenCode();
        return;
      }
      // 已绑定：把我的近况快照推上去（3 分钟节流；强制刷新时立即推）
      if (row) {
        const last = +(Store.getSetting('ta99_share_pushed', '0') || 0);
        if (force || !last || Date.now() - last > 180000) this._ta99PushShare(row);
      }
    } catch (e) {}
    this._ta99Rerender();
  },
  // v12.9.30 自动搭建：调用 ta99_init() RPC 完成全部建表/RLS/RPC 函数
  // 返回 { ok, created, needDeploy, error } ——needDeploy=true 表示 ta99_init 函数本身未部署
  async _ta99Init() {
    const c = this._c99;
    if (!c || !c.client || !c.user) return { ok: false, error: '未登录' };
    try {
      const { data, error } = await c.client.rpc('ta99_init');
      if (error) {
        // ta99_init 函数本身不存在（开发者还没部署）——需要显示部署提示
        if (/(does not exist|Could not find|not found|PGRST205|function)/i.test(error.message || '')) {
          return { ok: false, needDeploy: true };
        }
        return { ok: false, error: error.message || 'RPC 调用失败' };
      }
      return { ok: !!(data && data.ok), created: !!(data && data.created), data };
    } catch (e) {
      return { ok: false, error: e.message || '网络异常' };
    }
  },
  _ta99MyPos(row) { return (row.user_a === this._c99.user.id) ? 'a' : 'b'; },
  async _ta99PushShare(row) {
    const target = this._ta99MyPos(row) === 'a' ? 'share_a' : 'share_b';
    try {
      const data = this._ta99Snapshot();
      // v12.9.68 【此时此刻】：安卓端附加设备状态快照（系统采集按权限中心开关过滤 + 运动学习内部业务）
      try { const lk = await this._lk99Snapshot(); if (lk) data.lookus = lk; } catch (e) {}
      const { error } = await this._c99.client.rpc('ta99_write', { target, data });
      if (!error) Store.setSetting('ta99_share_pushed', String(Date.now()));
    } catch (e) {}
  },
  // RPC 统一出口（错误就地提示）
  async _ta99Rpc(fn, args) {
    try {
      const { data, error } = await this._c99.client.rpc(fn, args);
      if (error) { this._ta99Msg('❌ ' + (error.message || '操作失败') + (/(does not exist|Could not find|not found)/i.test(error.message || '') ? '（可能还没执行【Ta】建表 SQL）' : '')); return null; }
      return data;
    } catch (e) { this._ta99Msg('❌ 网络异常：' + (e.message || '')); return null; }
  },
  // extra 读写改写：先拉最新情侣行 → 本地改 → RPC 整体写回 → 重新拉取渲染（减少互相覆盖）
  async _ta99Mutate(fn) {
    const c = this._c99, t = this._ta99;
    if (!c.client || !c.user) return;
    try {
      const { data: row } = await c.client.from('couples99')
        .select('*').or(`user_a.eq.${c.user.id},user_b.eq.${c.user.id}`).maybeSingle();
      if (row) t.row = row;
    } catch (e) {}
    const row = t.row;
    if (!row) return this._ta99Msg('❌ 还没有绑定另一半');
    const extra = JSON.parse(JSON.stringify(row.extra || {}));
    fn(extra, this._ta99MyPos(row));
    const r = await this._ta99Rpc('ta99_write', { target: 'extra', data: extra });
    if (r && r.ok) await this.ta99Refresh(true);
  },

  // ==================== 绑定相关动作 ====================
  async ta99GenCode() {
    const c = this._c99;
    if (!c.client || !c.user) return;
    // v12.9.30 邀请码改为 6 位纯数字（避免字母大小写导致的绑定失败 bug）
    let code = '';
    for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10);
    try {
      // 一张有效：旧的未使用邀请码作废
      await c.client.from('invites99').delete().eq('owner', c.user.id).is('claimed_by', null);
      const { error } = await c.client.from('invites99').insert({ code, owner: c.user.id });
      if (error) {
        const m = /duplicate/i.test(error.message || '') ? '生成撞码了，再点一次就好' : (error.message || '生成失败');
        return this._ta99Msg('❌ ' + m + (/does not exist|Could not find|not found|PGRST205/i.test(error.message || '') ? `（App 连接的项目 <b>${this._ta99Host()}</b> 还没建【Ta】的表——SQL 要在这个项目里执行）` : ''));
      }
      this._ta99.msg = '';
      await this.ta99Refresh(true);
    } catch (e) { this._ta99Msg('❌ 网络异常：' + (e.message || '')); }
  },
  async ta99Bind() {
    // v12.9.30 修复邀请码正确但无法绑定的 bug：
    //   ① 邀请码统一为 6 位纯数字（避免字母大小写差异）；
    //   ② 校验严格化：必须是 6 位数字（去除所有非数字字符后判断），不再宽松放行；
    //   ③ 去掉 toUpperCase（数字无大小写，避免误转）。
    // v12.9.47 修复云端 "column reference code is ambiguous"：
    //   云端函数参数已改名 p_code（消除与 invites99.code 列名的 PL/pgSQL 冲突）——
    //   新库传 { p_code }；若还是旧签名（老库人工修过但保留参数名 code）自动回退 { code }；
    //   若旧版函数本身带冲突 → 拦截报错并给出一键修复指引（粘贴 TA99_FIX_SQL 一次即全项目生效）。
    const raw = (((document.getElementById('ta99-code-in') || {}).value) || '').trim();
    const code = raw.replace(/\D/g, '');   // 只保留数字
    if (code.length !== 6) return this._ta99Msg('❌ 邀请码格式不对（6 位数字）');
    const c = this._c99;
    if (!c || !c.client || !c.user) return;
    this._ta99Msg('💞 正在绑定…');
    const call = async (args) => {
      try {
        const { data, error } = await c.client.rpc('ta99_claim', args);
        if (error) return { __err: error.message || 'RPC 调用失败' };
        return data;
      } catch (e) { return { __err: e.message || '网络异常' }; }
    };
    let r = await call({ p_code: code });
    // 老库兼容：函数参数还叫 code（PostgREST 按参数名匹配 → 换名重试）
    if (r && r.__err && /could not find|does not exist|not found|pgrst204|schema cache/i.test(r.__err)) {
      r = await call({ code });
    }
    if (r && r.__err) {
      if (/ambiguous/i.test(r.__err)) return this._ta99FixModal(r.__err);
      return this._ta99Msg('❌ ' + r.__err + (/(does not exist|Could not find|not found|PGRST205)/i.test(r.__err) ? '（可能还没执行【Ta】建表 SQL）' : ''));
    }
    if (r && r.ok) {
      this._ta99.msg = '';
      this._flash('💞 绑定成功！欢迎来到你们的空间');
      await this.ta99Refresh(true);
    } else if (r && r.msg) {
      this._ta99Msg('❌ ' + r.msg);
    }
  },

  // v12.9.47 老库冲突修复指引：云端 ta99_claim 旧定义参数名与列名冲突 → 一键复制修复 SQL
  _ta99FixModal(errMsg) {
    this._ta99Msg('');   // 清掉「正在绑定…」
    this._modal('🛠️ 邀请码绑定修复指引', `
      <div style="font-size:12.5px;color:#b91c1c;font-weight:700;margin-bottom:8px">检测到云端函数冲突：${this.esc(errMsg)}</div>
      <div style="font-size:12.5px;color:#475569;line-height:1.9">
        这是云端 <b>ta99_claim</b> 函数旧定义的问题（参数名与列名冲突），和你们输入的邀请码无关。<br>
        <b>修复方法</b>：项目主人打开 <b>Supabase → SQL Editor</b>，粘贴下方 SQL 执行一次即可（对数据零影响）。执行完回到这里重新输入邀请码就能绑定成功：
      </div>
      <textarea id="ta99FixSql" readonly style="width:100%;height:170px;margin-top:10px;font-size:10px;font-family:monospace;line-height:1.6;border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#f8fafc;color:#334155;box-sizing:border-box">${this.esc(this.TA99_FIX_SQL)}</textarea>`,
      [
        {
          label: '📋 复制修复 SQL', onClick: () => {
            const ta = document.getElementById('ta99FixSql');
            const txt = this.TA99_FIX_SQL;
            const done = () => this._flash('✅ 已复制——到 Supabase SQL Editor 粘贴执行一次，然后回来重新绑定');
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done, () => { if (ta) { ta.select(); } this._flash('复制失败——请手动全选上方文本复制'); }); return false; }
            } catch (e) {}
            if (ta) { ta.select(); try { document.execCommand('copy'); done(); } catch (e) { this._flash('复制失败——请手动全选上方文本复制'); } }
            return false;
          },
        },
        { label: '知道了', primary: true },
      ]);
  },
  // —— v12.9.48 邮箱直绑动作 ——
  async ta99BindEmail() {
    const c = this._c99;
    if (!c || !c.client || !c.user) return;
    const el = document.getElementById('ta99-email-in');
    const email = String((el && el.value) || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this._ta99Msg('❌ 邮箱格式不对——填Ta登录一人行用的那个邮箱');
    this._ta99Msg('💌 正在发起…');
    const r = await this._ta99Rpc('ta99_bind', { p_email: email });
    if (r && r.ok) {
      await this.ta99Refresh(true);
      this._flash('💌 已发起——等Ta打开一人行的【Ta】点「接受」');
    } else if (r && r.msg) this._ta99Msg('❌ ' + r.msg);
  },
  async ta99AcceptEmail(from) {
    const r = await this._ta99Rpc('ta99_accept', { p_from: from });
    if (r && r.ok) {
      this._ta99.msg = '';
      this._flash('💞 绑定成功！欢迎来到你们的空间');
      await this.ta99Refresh(true);
    } else if (r && r.msg) this._ta99Msg('❌ ' + r.msg);
  },
  async ta99DenyEmail(from) {
    const r = await this._ta99Rpc('ta99_deny', { p_from: from });
    if (r && r.ok) {
      this._ta99.msg = '';
      await this.ta99Refresh(true);
      this._flash('已婉拒这条绑定请求');
    }
  },
  async ta99WithdrawBind() {
    const c = this._c99, t = this._ta99;
    if (!c || !c.client || !t.bindOut) return;
    try {
      await c.client.from('bindreq99').delete().eq('id', t.bindOut.id);
      await this.ta99Refresh(true);
      this._flash('已撤回绑定请求');
    } catch (e) { this._ta99Msg('❌ 网络异常：' + (e.message || '')); }
  },

  async ta99Leave() {
    if (!confirm('确定解除绑定吗？\n\n你们的情侣空间数据（情侣签到 / 纪念日 / 互相设置的打卡）将从云端删除，且不可恢复。')) return;
    const r = await this._ta99Rpc('ta99_leave');
    if (r && r.ok) {
      this._ta99.msg = '';
      this._ta99.row = null;
      this._ta99.invite = null;
      this._flash('已解除绑定');
      await this.ta99Refresh(true);
    } else if (r) this._ta99Msg('❌ ' + (r.msg || '操作失败'));
  },
  ta99Copy() {
    const code = ((this._ta99.invite || {}).code) || '';
    if (!code) return;
    const ok = () => this._flash('已复制邀请码：' + code);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(ok, () => this._flash('复制失败，请手动抄写：' + code));
        return;
      }
    } catch (e) {}
    this._flash('复制失败，请手动抄写：' + code);
  },
  ta99ToggleSQL() {
    try {
      const el = document.getElementById('ta99-sql');
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    } catch (e) {}
  },

  // ==================== 我的共享快照（克制摘要：打卡/经济/医疗）====================
  _ta99Snapshot() {
    const today = Store.today();
    const ym = today.slice(0, 7);
    // —— 打卡近 7 日（当日打卡项数）——
    const h = Store.getHabit99();
    const days = [];
    let todayN = 0;
    for (let i = 6; i >= 0; i--) {
      const dk = this._hb99DkOff(-i);
      const n = Object.keys((h.days || {})[dk] || {}).length;
      if (i === 0) todayN = n;
      days.push({ d: dk.slice(5), n });
    }
    // —— 经济本月 ——
    const led = Store.getLedger() || [];
    let monthExpense = 0, monthIncome = 0, todayExpense = 0, monthViolation = 0;
    led.forEach(e => {
      const d = e.date || '';
      if (e.type === 'income') { if (d.startsWith(ym)) monthIncome += (+e.amount || 0); }
      else {
        if (d.startsWith(ym)) { monthExpense += (+e.amount || 0); if (e.violation) monthViolation += (+e.amount || 0); }
        if (d === today) todayExpense += (+e.amount || 0);
      }
    });
    const r2 = v => Math.round((+v || 0) * 100) / 100;
    const recentLed = led.filter(e => e.type !== 'income').slice(0, 5)
      .map(e => ({ d: (e.date || '').slice(5), cat: String(e.category || '').slice(0, 10), amt: r2(e.amount) }));
    // —— 医疗摘要（健康隐私 HIV/HPV/TP 不出密码箱）——
    let mr = { total: 0, acuteCount: 0, sev4plus: 0, list: [] };
    try { mr = Store.listMedicalRecords({}) || mr; } catch (e) {}
    const sens = r => {
      try {
        const sym = Array.isArray(r.symptoms) ? r.symptoms.join(' ') : (r.symptoms || '');
        return this._healthSensMatch(`${r.disease || ''} ${(r.tags || []).join(' ')} ${sym}`);
      } catch (e) { return true; }
    };
    const safeList = (mr.list || []).filter(r => !sens(r));
    const recentMed = safeList.slice(0, 5).map(r => ({ d: (r.date || '').slice(5), disease: String(r.disease || '').slice(0, 24), type: r.type, severity: +r.severity || 1 }));
    return {
      ts: new Date().toISOString(),
      habit: { days, todayN },
      ledger: { monthExpense: r2(monthExpense), monthIncome: r2(monthIncome), todayExpense: r2(todayExpense), monthViolation: r2(monthViolation), recent: recentLed },
      medical: { total: safeList.length, acute: safeList.filter(r => r.type === 'acute').length, chronic: safeList.filter(r => r.type === 'chronic').length, sev4plus: safeList.filter(r => +r.severity >= 4).length, recent: recentMed },
    };
  },

  // ==================== 子页切换 ====================
  ta99Tab(k) {
    this._ta99.tab = k;
    this._ta99.msg = '';
    this._ta99Rerender();
    try { window.scrollTo({ top: 0 }); } catch (e) {}
  },
  ta99Moments(w) {
    this._ta99.moments = w;
    this._ta99Rerender();
  },

  // ==================== 视图：未登录 ====================
  _ta99LoginView() {
    return `<div class="card ta99-hero">
      <div class="ta99-hero-cats">${this._pet99CatHtml({ px: 58 })}<span class="ta99-hero-heart">❤</span><span class="pxcat ta99-cat-r" style="width:58px;height:61.6px;background-size:calc(58px*8) 61.6px"></span></div>
      <div style="font-size:16px;font-weight:800;margin-top:14px">Ta · 情侣空间</div>
      <div style="font-size:12.5px;color:#64748b;margin-top:6px;line-height:1.9">输入Ta的邮箱发起绑定，Ta点一下「接受」即成<br>看见彼此的打卡 · 经济 · 医疗近况<br>一起签到连心，一起记你们的日子</div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="App.navigate('sync')">🔐 先去登录云账号</button>
      <div style="font-size:11.5px;color:#94a3b8;margin-top:8px">【Ta】需要云账号识别彼此（和【同步】是同一套账号，注册一次全 App 通用）</div>
    </div>`;
  },

  // ==================== 视图：未绑定 ====================
  // v12.9.48 重构：邮箱直绑为主入口（输Ta的登录邮箱 → Ta点「接受」即完成），邀请码降为备用
  _ta99BindView() {
    const t = this._ta99;
    const inv = t.invite;
    const code = (inv && !inv.claimed_by && inv.code) || '';
    const inReq = t.bindIn, outReq = t.bindOut;
    return `
    ${inReq ? `
    <div class="card" style="border:1.5px solid #fda4af;background:linear-gradient(180deg,#fff1f2,#fff)">
      <div class="card-title"><span class="ico">💌</span>收到绑定请求</div>
      <div style="font-size:13px;line-height:1.9;margin:4px 0 10px"><b>${this.esc(inReq.note || '一位用户')}</b> 想和你绑定情侣空间<br><small style="color:#94a3b8">认得这个邮箱再接受——绑定后彼此可见打卡 / 经济 / 医疗近况</small></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99AcceptEmail('${inReq.from_user}')">💞 接受</button>
        <button class="btn btn-ghost" onclick="App.ta99DenyEmail('${inReq.from_user}')">婉拒</button>
      </div>
    </div>` : ''}
    ${outReq ? `
    <div class="card" style="border:1.5px solid #fecdd3">
      <div class="card-title"><span class="ico">⏳</span>等待Ta确认</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.9">已向 <b>${this.esc(outReq.to_email || '对方')}</b> 发起绑定——等Ta打开一人行的【Ta】点「接受」就连上了。</div>
      <button class="btn btn-ghost" style="margin-top:8px" onclick="App.ta99WithdrawBind()">↩ 撤回请求</button>
    </div>` : ''}
    ${!inReq && !outReq ? `
    <div class="card">
      <div class="card-title"><span class="ico">💌</span>邮箱直绑<span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">最快方式 · 不用邀请码</span></div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.8;margin:2px 0 8px">输入 <b>Ta 登录一人行用的邮箱</b>，发起绑定——Ta那边点一下「接受」就完成。</div>
      <div class="field" style="margin:6px 0 10px"><input id="ta99-email-in" class="input" type="email" placeholder="Ta的云账号邮箱" onkeydown="if(event.key==='Enter')App.ta99BindEmail()"></div>
      <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99BindEmail()">💌 发起绑定</button>
      <div style="font-size:11.5px;color:#94a3b8;margin-top:8px;line-height:1.7">绑定后：可以看见彼此的打卡 / 经济 / 医疗近况（健康隐私永不上传）；情侣签到 · 纪念日 · 互相设置打卡。</div>
    </div>` : ''}
    ${t.needUpgrade ? `
    <div class="card" style="border:1.5px solid #fde68a;background:#fffbeb">
      <div class="card-title"><span class="ico">🛠️</span>云端升级（最后一次）</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7">云端还没有「邮箱直绑」组件——复制下方 SQL 到 Supabase SQL Editor 执行一次即可，执行完回到这里自动出现邮箱直绑。
        <a href="javascript:void(0)" style="color:#e11d48" onclick="App.ta99ToggleSQL()">展开 SQL</a></div>
      <div style="font-size:12px;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:6px 10px;margin-top:8px;line-height:1.7">🔗 当前连接项目：<b>${this.esc(this._ta99Host())}</b> · SQL 必须在<b>这个项目</b>里执行</div>
      <div id="ta99-sql" style="display:none"><pre class="c99-sql">${this.esc(this.TA99_SQL)}</pre></div>
    </div>` : ''}
    ${(t.msg && (t.msg.indexOf('首次部署') >= 0 || t.msg.indexOf('升级组件') >= 0)) && !t.needUpgrade ? `
    <div class="card">
      <div class="card-title"><span class="ico">🛠️</span>首次部署</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7">检测到云端还没有【Ta】的搭建组件——复制下方 SQL 到 Supabase SQL Editor 执行一次即可。
        <a href="javascript:void(0)" style="color:#e11d48" onclick="App.ta99ToggleSQL()">展开 SQL</a></div>
      <div style="font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 10px;margin-top:8px;line-height:1.7">🔗 当前连接项目：<b>${this.esc(this._ta99Host())}</b> · SQL 必须在<b>这个项目</b>里执行</div>
      <div id="ta99-sql" style="display:none"><pre class="c99-sql">${this.esc(this.TA99_SQL)}</pre></div>
    </div>` : ''}
    <div class="card">
      <div class="card-title"><span class="ico">🔢</span>备用：邀请码<span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">邮箱直绑的备用方式</span></div>
      ${code ? `
        <div style="font-size:11.5px;color:#94a3b8;margin-bottom:6px">我的邀请码（发给Ta）：</div>
        <div class="ta99-code">${this.esc(code)}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99Copy()">📋 复制</button>
          <button class="btn btn-ghost" onclick="App.ta99GenCode()">↻ 换一个</button>
        </div>` : `
        <div style="font-size:12.5px;color:var(--text-soft);line-height:1.8;margin:6px 0 10px">生成一个 6 位数字码发给Ta，Ta输入后绑定。</div>
        <div style="text-align:center"><button class="btn btn-ghost" onclick="App.ta99GenCode()">✨ 生成邀请码</button></div>`}
      <div class="field" style="margin:10px 0 8px"><input id="ta99-code-in" class="input" inputmode="numeric" maxlength="6" placeholder="输入Ta的邀请码（6 位数字）" style="letter-spacing:4px;text-align:center;font-size:16px" onkeydown="if(event.key==='Enter')App.ta99Bind()"></div>
      <button class="btn btn-ghost" onclick="App.ta99Bind()">💞 用邀请码绑定</button>
    </div>`;
  },

  // ==================== 视图：已绑定（主页 + 四张导航卡 + 子页）====================
  _ta99BoundView() {
    const t = this._ta99;
    const row = t.row || {};
    const extra = row.extra || {};
    const myPos = this._ta99MyPos(row);
    if (t.tab === 'sign') return this._ta99SignView(extra, myPos);
    if (t.tab === 'moments') return this._ta99MomentsView(row, myPos);
    if (t.tab === 'anni') return this._ta99AnniView(row);
    if (t.tab === 'todos') return this._ta99TodosView(row, myPos);
    if (t.tab === 'notes') return this._ta99NotesView(row, myPos);
    if (t.tab === 'wishes') return this._ta99WishesView(row, myPos);
    if (t.tab === 'qa') return this._ta99QaView(row, myPos);
    // v12.9.49 六大新功能
    if (t.tab === 'dates') return this._ta99DatesView(row, myPos);
    if (t.tab === 'goals') return this._ta99GoalsView(row, myPos);
    if (t.tab === 'farm') return this._ta99FarmView(row, myPos);
    if (t.tab === 'album') return this._ta99AlbumView(row, myPos);
    if (t.tab === 'places') return this._ta99PlacesView(row, myPos);
    if (t.tab === 'dress') return this._ta99DressView(row, myPos);
    return this._ta99HomeView(row, extra, myPos);
  },

  // —— 主页：v12.9.49 封面流重做（中间最大 · 两边立体翘起 · 左右滑有透视景深）——
  _ta99HomeView(row, extra, myPos) {
    const since = row.since || '';
    const days = since ? Math.max(0, Math.round((new Date(Store.today()) - new Date(since)) / 86400000)) : 0;
    // 导航卡副标
    const sign = ((extra.sign || {})[Store.today()]) || {};
    const meS = !!sign[myPos], taS = !!sign[myPos === 'a' ? 'b' : 'a'];
    const signSub = (meS && taS) ? '今天已连心 💞' : (meS ? '我签了，等Ta' : (taS ? 'Ta签了，就差你' : '今天还没签到'));
    const annis = Array.isArray(extra.anni) ? extra.anni : [];
    const nextAnni = annis.map(a => this._ta99NextDays(a.d)).sort((x, y) => x - y)[0];
    const anniSub = annis.length
      ? (nextAnni === 0 ? '就是今天 🎉' : `最近的还差 ${nextAnni} 天`)
      : (since ? `在一起 ${days} 天` : '把重要的日子记进来');
    const todos = Array.isArray(extra.todos) ? extra.todos : [];
    const mineForTa = todos.filter(x => x.by === myPos).length;
    const taForMe = todos.filter(x => x.by !== myPos).length;
    const notes = Array.isArray(extra.notes) ? extra.notes : [];
    const noteUnread = this._ta99NoteUnread(extra, myPos);
    const notesSub = noteUnread > 0
      ? `有 ${noteUnread} 张新纸条 💌`
      : (notes.length ? `你们互通了 ${notes.length} 张` : '给Ta写一张小纸条');
    const wishes = Array.isArray(extra.wishes) ? extra.wishes : [];
    const wishOpen = wishes.filter(x => !x.done).length;
    const wishesSub = wishes.length
      ? (wishOpen ? `${wishOpen} 个心愿待完成` : '心愿都完成啦 🌠')
      : '把想一起做的记下来';
    const qa = extra.qa || {};
    const qToday = qa[Store.today()] || {};
    const meQ = !!qToday[myPos], taQ = !!((qToday[myPos === 'a' ? 'b' : 'a']));
    const qaSub = (meQ && taQ) ? '今天的问答完成 💬' : (meQ ? '已答 · 等Ta' : (taQ ? 'Ta答了，就差你' : '今天的问题还没答'));
    // v12.9.49 新功能副标
    const dates = Array.isArray(extra.dates) ? extra.dates : [];
    const datePend = dates.filter(x => x.st === 'pending').length;
    const datesSub = datePend ? `有 ${datePend} 个约会待回应 💘` : (dates.length ? `最近约过 ${dates.filter(x => x.st === 'yes').length} 次` : '发一张约会邀请卡');
    const goals = Array.isArray(extra.goals) ? extra.goals : [];
    const goalOpen = goals.filter(x => !x.done).length;
    const goalsSub = goals.length
      ? (goalOpen ? `${goalOpen} 个目标进行中 · 总进度 ${Math.round(goals.filter(x => !x.done).reduce((a, g) => a + Math.min(1, (g.cur || 0) / Math.max(1, g.target || 1)), 0) / Math.max(1, goalOpen) * 100)}%` : '目标都完成啦 🏅')
      : '一起攒钱旅行 / 减肥 / 学做饭';
    const farm = extra.farm || {};
    const plots = Array.isArray(farm.plots) ? farm.plots : [];
    const farmReady = plots.filter(p => p.crop && !p.done && this._ta99FarmReady(p)).length;
    const farmSub = plots.filter(p => p.crop && !p.done).length
      ? (farmReady ? `${farmReady} 块地成熟啦，快收获 🌾` : `${plots.filter(p => p.crop && !p.done).length} 块地在长 · 记得浇水`)
      : '开一块地，一起种点什么';
    const album = Array.isArray(extra.album) ? extra.album : [];
    const albumSub = album.length ? `${album.length} 张回忆 · 最近 ${new Date(album[0].ts).toISOString().slice(0, 10)}` : '上传第一张合照';
    const places = Array.isArray(extra.places) ? extra.places : [];
    const placesSub = places.length ? `一起去过 ${places.length} 个地方` : '记下你们的第一站';
    const sweet = +extra.sweet || 0;
    const dressSub = `甜蜜值 ${sweet} · ${sweet >= 300 ? '像素情侣' : sweet >= 150 ? '星空' : '粉爱心'}主题`;
    // 封面流卡池（中卡最大 · 两侧透视）
    const flow = [
      { k: 'sign', ico: '💞', n: '情侣签到', sub: signSub, grad: 'linear-gradient(150deg,#fecdd3,#fbcfe8,#fff)' },
      { k: 'dates', ico: '💘', n: '约会邀请', sub: datesSub, grad: 'linear-gradient(150deg,#fda4af,#fecdd3,#fff)' },
      { k: 'farm', ico: '🌾', n: '情侣农场', sub: farmSub, grad: 'linear-gradient(150deg,#bbf7d0,#d9f99d,#fff)' },
      { k: 'goals', ico: '🏆', n: '共同目标', sub: goalsSub, grad: 'linear-gradient(150deg,#fde68a,#fef3c7,#fff)' },
      { k: 'album', ico: '📷', n: '回忆相册', sub: albumSub, grad: 'linear-gradient(150deg,#c7d2fe,#e0e7ff,#fff)' },
      { k: 'notes', ico: '💌', n: '小纸条', sub: notesSub, grad: 'linear-gradient(150deg,#fbcfe8,#fce7f3,#fff)' },
      { k: 'moments', ico: '🫧', n: 'Ta的近况', sub: '此刻 · 打卡 · 经济 · 医疗', grad: 'linear-gradient(150deg,#bae6fd,#e0f2fe,#fff)' },
      { k: 'anni', ico: '🎂', n: '纪念日', sub: anniSub, grad: 'linear-gradient(150deg,#fef08a,#fefce8,#fff)' },
      { k: 'places', ico: '👣', n: '双人足迹', sub: placesSub, grad: 'linear-gradient(150deg,#a7f3d0,#d1fae5,#fff)' },
      { k: 'todos', ico: '📝', n: '互相打卡', sub: `我给Ta ${mineForTa} 件 · Ta给我 ${taForMe} 件`, grad: 'linear-gradient(150deg,#ddd6fe,#ede9fe,#fff)' },
      { k: 'wishes', ico: '🌠', n: '心愿单', sub: wishesSub, grad: 'linear-gradient(150deg,#bfdbfe,#dbeafe,#fff)' },
      { k: 'qa', ico: '💬', n: '每日一问', sub: qaSub, grad: 'linear-gradient(150deg,#fbcfe8,#ffe4e6,#fff)' },
      { k: 'dress', ico: '👑', n: '专属装扮', sub: dressSub, grad: 'linear-gradient(150deg,#e9d5ff,#f5d0fe,#fff)' },
    ];
    // 装扮主题（v12.9.49 extra.dress.theme · 甜蜜值解锁）
    const theme = ((extra.dress || {}).theme) || 'pink';
    return `
    <div class="card ta99-hero ta99-theme-${this.esc(theme)}">
      <div class="ta99-hero-cats">${this._pet99CatHtml({ px: 58 })}<span class="ta99-hero-heart">❤</span><span class="pxcat ta99-cat-r" style="width:58px;height:61.6px;background-size:calc(58px*8) 61.6px"></span></div>
      ${since ? `
        <div class="ta99-days-num">${days}</div>
        <div class="ta99-days-lbl">在一起的第 ${days} 天</div>
        <div class="ta99-since">自 ${this.esc(since)} · <a href="javascript:void(0)" onclick="App.ta99Tab('anni')">改日子</a></div>`
      : `
        <div style="font-size:14px;font-weight:800;margin-top:14px">你们还没有记录在一起的日子</div>
        <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0;margin-top:10px" onclick="App.ta99Tab('anni')">🎂 去设置</button>`}
      <div class="ta99-sweet">💕 甜蜜值 <b>${sweet}</b><i>Lv.${Math.floor(sweet / 100)}</i></div>
      <div style="margin-top:8px"><a href="javascript:void(0)" style="font-size:11.5px;color:#94a3b8" onclick="App.ta99Refresh(true)">刷新Ta的近况 ↻</a></div>
    </div>
    <div class="ta99-flow" id="ta99Flow">
      <div class="ta99-flow-stage" id="ta99FlowStage">
        ${flow.map((f, i) => `
        <div class="ta99-cover" data-i="${i}" data-k="${f.k}" style="background:${f.grad}">
          <div class="ta99-cover-ico">${f.ico}</div>
          <div class="ta99-cover-n">${f.n}</div>
          <div class="ta99-cover-sub">${this.esc(f.sub)}</div>
          <div class="ta99-cover-go">进入 ›</div>
        </div>`).join('')}
      </div>
      <div class="ta99-flow-hint">← 左右滑动 · 点中间的卡片进入 →</div>
    </div>
    <div style="text-align:center;margin:16px 0 4px"><button class="btn btn-ghost btn-sm" onclick="App.ta99Leave()">解除绑定</button></div>`;
  },

  // v12.9.49 封面流引擎：中心卡最大 · 两侧 rotateY 立体翘起 + 景深；拖动/点侧卡换位，点中卡进入
  ta99FlowBind() {
    const stage = document.getElementById('ta99FlowStage');
    if (!stage || stage.__ta99FlowBound) return;
    stage.__ta99FlowBound = true;
    const covers = Array.from(stage.querySelectorAll('.ta99-cover'));
    let center = 0;
    const apply = () => {
      covers.forEach((c, i) => {
        const off = i - center;
        const abs = Math.abs(off);
        if (abs > 2) { c.style.opacity = '0'; c.style.pointerEvents = 'none'; c.style.transform = 'translateX(' + (off > 0 ? 130 : -130) + '%) rotateY(' + (-off * 34) + 'deg) scale(.7)'; return; }
        c.style.opacity = abs === 0 ? '1' : (abs === 1 ? '.92' : '.66');
        c.style.pointerEvents = '';
        c.style.transform = 'translateX(' + (off * 52) + '%) rotateY(' + (-off * 34) + 'deg) translateZ(' + (-abs * 46) + 'px) scale(' + (1 - abs * 0.16) + ')';
        c.classList.toggle('center', abs === 0);
      });
    };
    apply();
    stage.addEventListener('pointerdown', (e) => { stage.__x = e.clientX; stage.__moved = 0; });
    stage.addEventListener('pointermove', (e) => {
      if (stage.__x === undefined) return;
      const dx = e.clientX - stage.__x;
      stage.__moved = Math.max(stage.__moved || 0, Math.abs(dx));
    });
    stage.addEventListener('pointerup', (e) => {
      if (stage.__x === undefined) return;
      const dx = e.clientX - stage.__x;
      stage.__x = undefined;
      if (Math.abs(dx) > 42) {                       // 滑动换位
        center = Math.max(0, Math.min(covers.length - 1, center + (dx < 0 ? 1 : -1)));
        this._sfx99('liquid');
        apply();
      } else if ((stage.__moved || 0) < 8) {          // 点按：侧卡居中 / 中卡进入
        const card = e.target.closest('.ta99-cover');
        if (card) {
          const i = +card.dataset.i;
          if (i !== center) { center = i; this._sfx99('liquid'); apply(); }
          else { this._sfx99('tap'); this.ta99Tab(card.dataset.k); }
        }
      }
    });
  },

  // —— 子页：情侣签到 ——
  _ta99SignView(extra, myPos) {
    const sign = extra.sign || {};
    const today = Store.today();
    const cur = sign[today] || {};
    const meS = !!cur[myPos], taS = !!cur[myPos === 'a' ? 'b' : 'a'];
    // 连续连心天数（今天未完成不打断，从昨天起算）
    let streak = 0;
    for (let i = 0; i < 3650; i++) {
      const s = sign[this._hb99DkOff(-i)];
      if (s && s.a && s.b) streak++;
      else if (i === 0) continue;
      else break;
    }
    let total = 0;
    for (const k in sign) if (sign[k] && sign[k].a && sign[k].b) total++;
    // 近 14 日连心点阵
    const dots = [];
    for (let i = 13; i >= 0; i--) {
      const dk = this._hb99DkOff(-i);
      const s = sign[dk] || {};
      const st = (s.a && s.b) ? 2 : ((s.a || s.b) ? 1 : 0);
      dots.push(`<span class="ta99-dot d${st}" title="${dk}"></span>`);
    }
    return `
    <div class="card">
      <div class="card-title"><span class="ico">💞</span>今日情侣签到
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div class="ta99-sign-status">
        <div><span class="ta99-sign-ava">${this._pet99CatHtml({ px: 44, act: meS ? 'coq' : 'idle' })}</span><b>${meS ? '已签到' : '未签到'}</b><span>我</span></div>
        <div class="ta99-sign-heart ${meS && taS ? 'on' : ''}">❤</div>
        <div><span class="ta99-sign-ava"><span class="pxcat ta99-cat-r ${taS ? '' : 'ta99-dim'}" style="width:44px;height:46.75px;background-size:calc(44px*8) 46.75px"></span></span><b>${taS ? '已签到' : '未签到'}</b><span>Ta</span></div>
      </div>
      <div style="text-align:center;margin-top:6px">
        ${meS
          ? (taS ? '<div class="ta99-both">今天已连心 💞 继续保持呀</div>' : '<div class="ta99-wait">你签好了——等Ta也签到，今天就连心啦</div>')
          : `<button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99Sign()">💞 签到</button>`}
      </div>
      <div style="font-size:11.5px;color:#94a3b8;margin-top:10px;line-height:1.7">情侣签到需要<b>两个人都签到</b>才算完成——那一天会记进你们的连心日历。</div>
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">🌅</span>连心记录</div>
      <div class="ta99-kv">
        <div><b>${streak}</b><span>连续连心</span></div>
        <div><b>${total}</b><span>累计连心</span></div>
      </div>
      <div class="ta99-dots">${dots.join('')}</div>
      <div class="ta99-share-note">近 14 日：<i class="ta99-dot d2"></i> 两人都签 <i class="ta99-dot d1"></i> 只签了一人 <i class="ta99-dot d0"></i> 都没签</div>
    </div>`;
  },
  async ta99Sign() {
    const row = this._ta99.row;
    if (!row) return;
    await this._ta99Mutate((extra, myPos) => {
      extra.sign = extra.sign || {};
      extra.sign[Store.today()] = Object.assign({}, extra.sign[Store.today()] || {});
      extra.sign[Store.today()][myPos] = new Date().toISOString();
      // v12.9.49 甜蜜值：情侣签到 +2（双方共享）
      extra.sweet = (+extra.sweet || 0) + 2;
    });
    const s = ((this._ta99.row || {}).extra || {}).sign || {};
    const cur = s[Store.today()] || {};
    this._flash(cur.a && cur.b ? '💞 今天你们连心啦！（甜蜜值 +2）' : '已签到——等Ta也签到后，今天就连心了（甜蜜值 +2）');
  },

  // —— 子页：Ta的近况 / 我的近况（v12.9.68 双板块：此时此刻 | 日常近况）——
  _ta99MomentsView(row, myPos) {
    const which = this._ta99.moments === 'me' ? 'me' : 'ta';
    // 【此时此刻】仅安卓原生客户端可用（iOS/网页隐藏该 tab，其余互通数据不受影响）
    const lkOn = !!(this._lk99On && this._lk99On());
    const lkTab = lkOn && this._ta99.momentsLk === 'now' ? 'now' : 'daily';
    const myShare = myPos === 'a' ? row.share_a : row.share_b;
    const taShare = myPos === 'a' ? row.share_b : row.share_a;
    return `
    <div class="card">
      <div class="card-title"><span class="ico">🫧</span>近况
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div class="ta99-chips">
        <button class="ta99-chip ${which === 'ta' ? 'on' : ''}" onclick="App.ta99Moments('ta')">Ta的近况</button>
        <button class="ta99-chip ${which === 'me' ? 'on' : ''}" onclick="App.ta99Moments('me')">我的近况</button>
      </div>
      ${lkOn ? `
      <div class="ta99-chips lk99-tabs" style="margin-top:8px">
        <button class="ta99-chip ${lkTab === 'now' ? 'on' : ''}" onclick="App.ta99MomentsTab('now')">🫧 此时此刻</button>
        <button class="ta99-chip ${lkTab === 'daily' ? 'on' : ''}" onclick="App.ta99MomentsTab('daily')">🌿 日常近况</button>
      </div>` : ''}
      <div style="font-size:11.5px;color:#94a3b8;line-height:1.7;margin-top:6px">${lkTab === 'now'
        ? '设备实时状态同步（安卓）——App 使用 · 位置 · 充电 · 通话 · 夜间亮屏，双方知情授权后互见'
        : '打卡近 7 日 · 经济本月 · 医疗摘要——只共享克制的数据近况，明细留在各自的手机里。'}</div>
    </div>
    ${lkTab === 'now'
      ? (this._lk99View ? this._lk99View(row, myPos) : '')
      : this._ta99ShareHtml(which === 'ta' ? taShare : myShare, which === 'ta')}`;
  },
  // v12.9.68 近况双板块切换（此时此刻 / 日常近况）
  ta99MomentsTab(k) {
    this._ta99.momentsLk = k === 'now' ? 'now' : 'daily';
    this._ta99Rerender();
  },
  _ta99ShareHtml(snap, isTa) {
    if (!snap || !snap.ts) {
      return `<div class="card"><div class="empty">${isTa ? 'Ta还没有打开过【Ta】空间——等Ta登录进来看看你，Ta的近况就会出现在这里' : '你的共享快照还没有生成——稍等片刻会自动生成'}</div></div>`;
    }
    const h = snap.habit || { days: [], todayN: 0 };
    const l = snap.ledger || {};
    const m = snap.medical || {};
    const who = isTa ? 'Ta' : '我';
    const max = Math.max(1, (h.days || []).reduce((s, x) => Math.max(s, +x.n || 0), 0));
    const fmt = v => (+v || 0).toFixed(2);
    let s = '';
    s += `<div class="card">
      <div class="card-title"><span class="ico">🌿</span>${who}的打卡 · 近 7 日</div>
      <div class="ta99-bars">${(h.days || []).map(x => `
        <div class="ta99-bar" title="${x.d}：${x.n} 项"><i style="height:${Math.round((x.n || 0) / max * 36) + 4}px"></i><em>${(x.d || '').slice(-2)}</em></div>`).join('')}
      </div>
      <div class="ta99-share-note">今日已打卡 <b style="color:#059669">${h.todayN || 0}</b> 项</div>
    </div>`;
    s += `<div class="card">
      <div class="card-title"><span class="ico">💰</span>${who}的经济 · 本月</div>
      <div class="ta99-kv">
        <div><b>¥${fmt(l.monthExpense)}</b><span>本月支出</span></div>
        <div><b>¥${fmt(l.monthIncome)}</b><span>本月收入</span></div>
        <div><b>¥${fmt(l.todayExpense)}</b><span>今日支出</span></div>
      </div>
      ${(l.recent || []).length ? `<div style="margin-top:8px">${l.recent.map(x => `
        <div class="ta99-item"><span class="ta99-item-tx">${x.d} · ${this.esc(x.cat || '消费')} ¥${fmt(x.amt)}</span></div>`).join('')}</div>` : ''}
      ${l.monthViolation > 0 ? `<div class="ta99-share-note" style="color:#b45309">本月违规消费 ¥${fmt(l.monthViolation)}（如游戏充值/彩票等）</div>` : ''}
    </div>`;
    const TYP = { chronic: '慢病', acute: '急症', visit: '就诊' };
    s += `<div class="card">
      <div class="card-title"><span class="ico">🩺</span>${who}的医疗 · 摘要</div>
      <div class="ta99-kv">
        <div><b>${m.total || 0}</b><span>记录总数</span></div>
        <div><b>${m.chronic || 0}</b><span>慢性病</span></div>
        <div><b>${m.sev4plus || 0}</b><span>较重记录</span></div>
      </div>
      ${(m.recent || []).length ? `<div style="margin-top:8px">${m.recent.map(x => `
        <div class="ta99-item"><span class="ta99-item-tx">${x.d} · ${this.esc(x.disease || '')}<span class="ta99-tag ${x.type === 'chronic' ? 'chr' : (x.type === 'visit' ? 'vis' : 'acu')}">${TYP[x.type] || '记录'}</span></span></div>`).join('')}</div>`
        : `<div class="ta99-share-note">暂无（可共享的）医疗记录</div>`}
      <div class="ta99-share-note">🔒 ${this._isAuthorizedAccount && this._isAuthorizedAccount() ? 'HIV / HPV / TP 等健康隐私记录不参与共享，仍锁在各自的密码箱里' : '涉及个人健康的隐私记录不参与共享，仍锁在各自的密码箱里'}</div>
    </div>
    <div class="ta99-share-time">${who}更新于 ${new Date(snap.ts).toLocaleString('zh-CN')}</div>`;
    return s;
  },

  // —— 子页：纪念日 ——
  _ta99AnniView(row) {
    const extra = row.extra || {};
    const annis = Array.isArray(extra.anni) ? extra.anni.slice() : [];
    annis.sort((a, b) => this._ta99NextDays(a.d) - this._ta99NextDays(b.d));
    const since = row.since || '';
    return `
    <div class="card">
      <div class="card-title"><span class="ico">🎂</span>纪念日
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      ${since ? `
        <div class="ta99-anni-hero">
          <div class="ta99-anni-name">在一起</div>
          <div class="ta99-anni-days">第 ${Math.max(0, Math.round((new Date(Store.today()) - new Date(since)) / 86400000))} 天 · 下一个周年还有 ${this._ta99NextDays(since)} 天</div>
          <div style="font-size:11.5px;color:#94a3b8">自 ${this.esc(since)}</div>
        </div>`
      : `<div class="ta99-anni-hero">
          <div class="ta99-anni-name">在一起的日子</div>
          <div style="display:flex;gap:8px;justify-content:center;align-items:center;margin-top:8px;flex-wrap:wrap">
            <input id="ta99-since-d" type="date" class="input" style="width:auto">
            <button class="btn btn-primary btn-sm" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99SetSince()">记下这一天</button>
          </div>
        </div>`}
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">📅</span>你们的日子（${annis.length}）</div>
      ${annis.length ? annis.map(a => {
        const nd = this._ta99NextDays(a.d);
        const escapedN = (a.n || '').replace(/'/g, "\\'");
        return `<div class="ta99-item">
          <span class="ta99-item-tx"><b>${this.esc(a.n || '')}</b><span style="color:#94a3b8"> · ${this.esc(a.d || '')}</span></span>
          <span class="ta99-item-side">${nd === 0 ? '<b style="color:#e11d48">就是今天 🎉</b>' : `还差 <b style="color:#e11d48">${nd}</b> 天`}</span>
          <button class="ta99-edit" title="修改" onclick="App.ta99EditAnni('${a.id}', '${escapedN}', '${a.d}')">✎</button>
          <button class="ta99-x" title="删除" onclick="App.ta99DelAnni('${a.id}')">×</button>
        </div>`;
      }).join('') : '<div class="empty">还没有纪念日——第一次见面、第一次旅行…都值得记下来</div>'}
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <input id="ta99-anni-n" class="input" style="flex:1;min-width:140px" maxlength="20" placeholder="名字（如：第一次见面）">
        <input id="ta99-anni-d" type="date" class="input" style="width:auto">
        <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99AddAnni()">添加</button>
      </div>
    </div>`;
  },
  _ta99NextDays(dateStr) { // 距下一次周年（含今日）的天数
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return 9999;
    const t = Store.today();
    const y = +t.slice(0, 4);
    const md = dateStr.slice(5);
    for (const c of [y + '-' + md, (y + 1) + '-' + md]) {
      if (c >= t) return Math.round((new Date(c) - new Date(t)) / 86400000);
    }
    return 0;
  },
  async ta99SetSince() {
    const d = ((document.getElementById('ta99-since-d') || {}).value) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return this._ta99Msg('❌ 选一个你们在一起的日期');
    const r = await this._ta99Rpc('ta99_write', { target: 'since', data: { d } });
    if (r && r.ok) { this._flash('已记下：' + d); await this.ta99Refresh(true); }
  },
  async ta99AddAnni() {
    const n = (((document.getElementById('ta99-anni-n') || {}).value) || '').trim();
    const d = (((document.getElementById('ta99-anni-d') || {}).value) || '').trim();
    if (!n) return this._ta99Msg('❌ 先写纪念日名字（如：第一次见面）');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return this._ta99Msg('❌ 选一个日期');
    this._ta99.msg = '';
    await this._ta99Mutate(extra => {
      extra.anni = Array.isArray(extra.anni) ? extra.anni : [];
      extra.anni.push({ id: 'an_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), n: n.slice(0, 20), d });
    });
  },
  async ta99DelAnni(id) {
    await this._ta99Mutate(extra => {
      extra.anni = (extra.anni || []).filter(a => a.id !== id);
    });
  },
  // —— v12.9.69 纪念日编辑（修复缺少修改按钮的bug）——
  ta99EditAnni(id, n, d) {
    this._modal('📝 修改纪念日', `
      <div style="font-size:12.5px;color:#475569;line-height:2">改个名字、换个日期：</div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <input id="ta99-anni-edit-n" class="input" style="flex:1;min-width:140px" maxlength="20" placeholder="名字" value="${this.esc(n || '')}">
        <input id="ta99-anni-edit-d" type="date" class="input" style="width:auto" value="${this.esc(d || '')}">
      </div>`, [
      {
        label: '保存修改', primary: true, onClick: () => {
          const nn = (((document.getElementById('ta99-anni-edit-n') || {}).value) || '').trim();
          const dd = (((document.getElementById('ta99-anni-edit-d') || {}).value) || '').trim();
          if (!nn) { this._flash('❌ 名字不能为空'); return false; }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dd)) { this._flash('❌ 选一个日期'); return false; }
          (async () => {
            await this._ta99Mutate(extra => {
              const list = extra.anni = Array.isArray(extra.anni) ? extra.anni : [];
              const it = list.find(a => a.id === id);
              if (it) { it.n = nn.slice(0, 20); it.d = dd; }
            });
            this._flash('✅ 已修改');
          })();
          return false;
        }
      },
      { label: '取消' }
    ]);
  },

  // —— 子页：互相设置打卡 ——
  _ta99TodosView(row, myPos) {
    const todos = Array.isArray((row.extra || {}).todos) ? row.extra.todos : [];
    const forTa = todos.filter(x => x.by === myPos);         // 我给Ta布置的
    const forMe = todos.filter(x => x.by !== myPos);         // Ta给我布置的
    const rowHtml = (x, isMine) => `
      <div class="ta99-item">
        <span class="ta99-item-tx">${x.done ? '<s style="color:#94a3b8">' : '<b>'}${this.esc(x.text || '')}${x.done ? '</s>' : '</b>'}</span>
        <span class="ta99-item-side">
          ${x.done ? `<span class="ta99-tag ok">已完成</span>` : (isMine ? '' : `<button class="btn btn-primary btn-sm" style="margin:0;background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99ToggleTodo('${x.id}')">✓ 完成</button>`)}
          <button class="ta99-x" title="删除" onclick="App.ta99DelTodo('${x.id}')">×</button>
        </span>
      </div>`;
    return `
    <div class="card">
      <div class="card-title"><span class="ico">📝</span>互相设置打卡
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7">给Ta布置一个今日打卡（多喝水 / 早睡 / 记账…），Ta完成了才算数——你们的小小约定。</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="ta99-todo-inp" class="input" style="flex:1" maxlength="60" placeholder="给Ta布置的打卡（如：今晚 11 点前睡）" onkeydown="if(event.key==='Enter')App.ta99AddTodo()">
        <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99AddTodo()">布置</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">🎯</span>我给Ta布置的（${forTa.length}）</div>
      ${forTa.length ? forTa.map(x => rowHtml(x, false)).join('') : '<div class="empty">还没给Ta布置过——轻轻推Ta一下</div>'}
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">🌠</span>Ta给我布置的（${forMe.length}）</div>
      ${forMe.length ? forMe.map(x => rowHtml(x, true)).join('') : '<div class="empty">Ta还没有给你布置打卡</div>'}
    </div>`;
  },
  async ta99AddTodo() {
    const text = ((((document.getElementById('ta99-todo-inp') || {}).value) || '')).trim();
    if (!text) return this._ta99Msg('❌ 先写要布置的打卡内容');
    this._ta99.msg = '';
    await this._ta99Mutate((extra, myPos) => {
      extra.todos = Array.isArray(extra.todos) ? extra.todos : [];
      extra.todos.unshift({ id: 'td_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), by: myPos, text: text.slice(0, 60), date: Store.today(), done: null });
    });
  },
  async ta99ToggleTodo(id) {
    await this._ta99Mutate((extra, myPos) => {
      const it = (extra.todos || []).find(x => x.id === id);
      if (!it || it.by === myPos) return; // 只能完成"布置给我的"
      it.done = it.done ? null : new Date().toISOString();
    });
    this._flash('已完成一件Ta布置的打卡 🌠');
  },
  async ta99DelTodo(id) {
    await this._ta99Mutate(extra => {
      extra.todos = (extra.todos || []).filter(x => x.id !== id);
    });
  },

  // ==================== v12.9.22 子页：小纸条（异步微情书 · 含定时信）====================
  // 数据（extra.notes）：[{ id, by: 'a'|'b', text, ts, show }] —— show 是定时信的送达日（YYYY-MM-DD，空=立刻）
  // 已读（extra.seen）：{ a: ms, b: ms } 各自最后打开纸条页的时间——未读数 = 对方发来且送达且晚于我上次看的
  _ta99NoteUnread(extra, myPos) {
    const ta = myPos === 'a' ? 'b' : 'a';
    const seen = +(((extra.seen || {})[myPos]) || 0);
    const today = Store.today();
    return (extra.notes || []).filter(n =>
      n.by === ta && (!n.show || n.show <= today) && +n.ts > seen
    ).length;
  },
  _ta99NoteBubble(n, myPos) {
    const mine = n.by === myPos;
    const today = Store.today();
    const timed = n.show && n.show > today; // 定时信未到点：内容封存
    const time = (() => { try { return new Date(+n.ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } })();
    return `
      <div class="ta99-note ${mine ? 'from-me' : 'from-ta'}">
        ${timed
          ? `<div class="ta99-note-lock">🔒 一封定时信 · 将于 ${this.esc(n.show)} 送达</div>`
          : `<div class="ta99-note-tx">${this.esc(n.text)}</div>`}
        <div class="ta99-note-meta">${mine ? '我' : 'Ta'} · ${time}${n.show && !timed ? ' · 定时信' : ''}
          ${mine ? `<button class="ta99-x" style="margin-left:4px" title="撤回" onclick="App.ta99DelNote('${n.id}')">×</button>` : ''}
        </div>
      </div>`;
  },
  _ta99NotesView(row, myPos) {
    const extra = row.extra || {};
    const notes = (Array.isArray(extra.notes) ? extra.notes : []).slice(); // 新的在前
    const unread = this._ta99NoteUnread(extra, myPos);
    if (unread > 0) setTimeout(() => this.ta99MarkNotesSeen(), 600); // 打开即已读（延迟避开本次渲染，写回后自然重绘一次）
    return `
    <div class="card">
      <div class="card-title"><span class="ico">💌</span>小纸条
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7">想说的那句话不着急说出口——写下来，Ta打开【Ta】就能看见。</div>
      <div class="field" style="margin-top:8px"><textarea id="ta99-note-inp" class="input" rows="2" maxlength="200" placeholder="写给Ta的话（200 字以内）"></textarea></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px">
        <label style="font-size:11.5px;color:#94a3b8;white-space:nowrap">⏳ 定时信（可选）</label>
        <input id="ta99-note-show" type="date" class="input" style="width:auto;flex:0 0 auto">
        <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99SendNote()">送出 💌</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">✉️</span>你们互通的纸条（${notes.length}）</div>
      ${notes.length ? notes.map(n => this._ta99NoteBubble(n, myPos)).join('') : '<div class="empty">还没有纸条——第一句话由你开始</div>'}
      ${notes.length ? '<div class="ta99-share-note">最多保留最近 100 张；收到的纸条不能撤回，是Ta的心意</div>' : ''}
    </div>`;
  },
  async ta99SendNote() {
    const text = ((((document.getElementById('ta99-note-inp') || {}).value) || '')).trim();
    const show = ((((document.getElementById('ta99-note-show') || {}).value) || '')).trim();
    if (!text) return this._ta99Msg('❌ 先写点什么给Ta');
    if (show && !/^\d{4}-\d{2}-\d{2}$/.test(show)) return this._ta99Msg('❌ 定时送达的日期不对');
    this._ta99.msg = '';
    await this._ta99Mutate((extra, myPos) => {
      extra.notes = Array.isArray(extra.notes) ? extra.notes : [];
      extra.notes.unshift({ id: 'nt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), by: myPos, text: text.slice(0, 200), ts: Date.now(), show: show || '' });
      if (extra.notes.length > 100) extra.notes.length = 100; // 克制：只留最近 100 张
    });
    this._flash(show && show > Store.today() ? '📮 定时信已封好，' + show + ' 自动送达' : '💌 小纸条已送达');
  },
  async ta99DelNote(id) {
    await this._ta99Mutate((extra, myPos) => {
      extra.notes = (extra.notes || []).filter(n => !(n.id === id && n.by === myPos)); // 只能撤回自己的
    });
  },
  async ta99MarkNotesSeen() {
    await this._ta99Mutate((extra, myPos) => {
      extra.seen = extra.seen || {};
      extra.seen[myPos] = Date.now();
    });
  },

  // ==================== v12.9.22 子页：心愿单（两人共同 · 谁都能许 · 谁都能完成）====================
  // 数据（extra.wishes）：[{ id, by, text, ts, done(ms|null), doneBy, doneTs }]
  _ta99WishesView(row, myPos) {
    const wishes = Array.isArray((row.extra || {}).wishes) ? (row.extra || {}).wishes : [];
    const open = wishes.filter(x => !x.done);
    const done = wishes.filter(x => x.done).slice(0, 10); // 已完成只展示最近 10 条，保持克制
    const rowHtml = (x) => `
      <div class="ta99-item" style="${x.done ? 'opacity:.62' : ''}">
        <span class="ta99-item-tx">${x.done ? '<s style="color:#94a3b8">' : '<b>'}${this.esc(x.text || '')}${x.done ? '</s>' : '</b>'}
          <span class="ta99-tag ${x.by === myPos ? 'vis' : 'chr'}">${x.by === myPos ? '我许的' : 'Ta许的'}</span></span>
        <span class="ta99-item-side">
          ${x.done
            ? `<span class="ta99-tag ok">✓ ${(x.doneBy === myPos ? '我' : 'Ta')}完成</span>`
            : `<button class="btn btn-primary btn-sm" style="margin:0;background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99ToggleWish('${x.id}')">一起去完成 ✓</button>`}
          <button class="ta99-x" title="删除" onclick="App.ta99DelWish('${x.id}')">×</button>
        </span>
      </div>`;
    return `
    <div class="card">
      <div class="card-title"><span class="ico">🌠</span>心愿单
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7">想一起看的电影、想一起去的地方、想一起养成的习惯——许下来，谁先完成都算你们的。</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="ta99-wish-inp" class="input" style="flex:1" maxlength="60" placeholder="一起想做的事（如：一起看一次日出）" onkeydown="if(event.key==='Enter')App.ta99AddWish()">
        <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99AddWish()">许愿</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">🎯</span>进行中（${open.length}）</div>
      ${open.length ? open.map(rowHtml).join('') : '<div class="empty">没有进行中的心愿——许一个吧</div>'}
    </div>
    ${done.length ? `
    <div class="card">
      <div class="card-title"><span class="ico">✅</span>已完成（近 10 条）</div>
      ${done.map(rowHtml).join('')}
    </div>` : ''}`;
  },
  async ta99AddWish() {
    const text = ((((document.getElementById('ta99-wish-inp') || {}).value) || '')).trim();
    if (!text) return this._ta99Msg('❌ 先写下想一起做的事');
    this._ta99.msg = '';
    await this._ta99Mutate((extra, myPos) => {
      extra.wishes = Array.isArray(extra.wishes) ? extra.wishes : [];
      extra.wishes.unshift({ id: 'ws_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), by: myPos, text: text.slice(0, 60), ts: Date.now(), done: null, doneBy: '', doneTs: 0 });
    });
  },
  async ta99ToggleWish(id) {
    await this._ta99Mutate((extra, myPos) => {
      const it = (extra.wishes || []).find(x => x.id === id);
      if (!it) return;
      if (it.done) { it.done = null; it.doneBy = ''; it.doneTs = 0; }
      else { it.done = Date.now(); it.doneBy = myPos; it.doneTs = Date.now(); }
    });
    this._flash('又完成一个一起的心愿 🌠');
  },
  async ta99DelWish(id) {
    await this._ta99Mutate(extra => {
      extra.wishes = (extra.wishes || []).filter(x => x.id !== id);
    });
  },

  // ==================== v12.9.22 子页：每日一问（同题各答 · 答完互相可见）====================
  // 数据（extra.qa）：{ 'YYYY-MM-DD': { q: 题目文本, a, b: 各自答案, aTs, bTs } }——题目按日期确定性从题库选
  _ta99QaIdx(dk) {
    let h = 0;
    for (const ch of String(dk)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % this.TA99_QA_BANK.length;
  },
  _ta99QaView(row, myPos) {
    const qa = (row.extra || {}).qa || {};
    const dk = Store.today();
    const ta = myPos === 'a' ? 'b' : 'a';
    const today = qa[dk] || null;
    const myAns = today ? today[myPos] : '';
    const taAns = today ? today[ta] : '';
    const both = !!(myAns && taAns);
    const question = this.TA99_QA_BANK[this._ta99QaIdx(dk)];
    const history = Object.keys(qa).filter(k => k !== dk && qa[k] && qa[k].a && qa[k].b)
      .sort((x, y) => (x < y ? 1 : -1)).slice(0, 7); // 最近 7 个已完成的问答
    const ansBubble = (who, text, ts) => `
      <div class="ta99-note ${who === 'me' ? 'from-me' : 'from-ta'}">
        <div class="ta99-note-tx">${this.esc(text)}</div>
        <div class="ta99-note-meta">${who === 'me' ? '我' : 'Ta'} · ${(() => { try { return new Date(+ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } })()}</div>
      </div>`;
    return `
    <div class="card">
      <div class="card-title"><span class="ico">💬</span>每日一问 · ${dk.slice(5).replace('-', '/')}
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div class="ta99-q-q">「${this.esc(question)}」</div>
      ${!myAns ? `
        <div class="field" style="margin-top:8px"><textarea id="ta99-qa-inp" class="input" rows="2" maxlength="300" placeholder="你的答案（只有Ta能看见）"></textarea></div>
        <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0;margin-top:6px" onclick="App.ta99AnswerQa()">写下答案</button>
        <div style="font-size:11.5px;color:#94a3b8;margin-top:8px;line-height:1.7">两个人<b>都写下答案后</b>，才能互相看见——先诚实地写给自己。</div>`
      : `
        ${ansBubble('me', myAns, today[myPos + 'Ts'])}
        ${both
          ? ansBubble('ta', taAns, today[ta + 'Ts'])
          : `<div class="ta99-share-note">你的答案已写下——等Ta也写下Ta的，答案就会互相亮出来 ✨</div>`}
        ${!both ? `
          <div style="margin-top:8px"><a href="javascript:void(0)" style="font-size:11.5px;color:#94a3b8" onclick="App.ta99EditQa()">✎ 想改一下我的答案</a></div>
          <div id="ta99-qa-edit" style="display:none;margin-top:6px">
            <div class="field"><textarea id="ta99-qa-inp" class="input" rows="2" maxlength="300">${this.esc(myAns)}</textarea></div>
            <button class="btn btn-primary btn-sm" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0;margin-top:4px" onclick="App.ta99AnswerQa()">更新答案</button>
          </div>` : ''}`}
    </div>
    ${history.length ? `
    <div class="card">
      <div class="card-title"><span class="ico">📖</span>最近一起答过的</div>
      ${history.map(k => `
        <div class="ta99-q-hist">
          <div class="ta99-q-hist-d">${k.slice(5).replace('-', '/')}</div>
          <div class="ta99-q-hist-q">「${this.esc(qa[k].q || '')}」</div>
          <div class="ta99-q-hist-a"><b>我：</b>${this.esc(qa[k][myPos] || '')}</div>
          <div class="ta99-q-hist-a"><b>Ta：</b>${this.esc(qa[k][ta] || '')}</div>
        </div>`).join('')}
    </div>` : ''}`;
  },
  ta99EditQa() {
    try {
      const el = document.getElementById('ta99-qa-edit');
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    } catch (e) {}
  },
  async ta99AnswerQa() {
    const text = ((((document.getElementById('ta99-qa-inp') || {}).value) || '')).trim();
    if (!text) return this._ta99Msg('❌ 先写下你的答案');
    this._ta99.msg = '';
    const dk = Store.today();
    await this._ta99Mutate((extra, myPos) => {
      extra.qa = extra.qa || {};
      const day = extra.qa[dk] = extra.qa[dk] || { q: this.TA99_QA_BANK[this._ta99QaIdx(dk)], a: '', b: '' };
      day[myPos] = text.slice(0, 300);
      day[myPos + 'Ts'] = Date.now();
      // 克制：只保留最近 90 天的问答
      const keys = Object.keys(extra.qa).sort();
      while (keys.length > 90) delete extra.qa[keys.shift()];
    });
    this._flash('💬 今天的答案已写下');
  },
});

// ==================== v12.9.49 情侣空间 · 六大新功能 ====================
// 约会邀请（AI 文案）/ 共同目标 / 情侣农场 / 回忆相册 / 双人足迹 / 专属装扮 + 甜蜜值
// 全部存 couples99.extra（ta99_write 扩展位 · 无需任何新表），双方 45 秒轻轮询互见
Object.assign(App, {

  // ===== 甜蜜值（签到 +2 · 约会应答 +10 · 目标完成 +15 · 农场收获 +5，双方共享）=====
  TA99_SWEET_RULE: '签到 +2 · 约会赴约 +10 · 完成共同目标 +15 · 农场收获 +5 · 每日一问双方作答 +3',
  async _ta99SweetAdd(n, why) {
    await this._ta99Mutate((extra) => {
      extra.sweet = (+extra.sweet || 0) + (n || 0);
    });
    if (why) this._flash('💕 甜蜜值 +' + n + '（' + why + '）');
  },

  // ==================== 💘 约会邀请（AI 文案生成 + 三种回应）====================
  TA99_DATE_TYPES: ['吃饭', '看电影', '逛街', '旅行', '宅家', '看海', '展览', '咖啡'],
  TA99_DATE_TIMES: ['今天晚上', '明天下午', '周末全天', '下周都可以', '今晚就有空'],
  TA99_DATE_PLACES: ['咖啡馆', '那家餐厅', '电影院', '公园', '海边', '展览馆', '家里沙发', '老地方'],
  TA99_DATE_ANS: [
    { k: 'yes', n: '必须答应！', ico: '💖' },
    { k: 'yes', n: '等你好久了', ico: '🥰' },
    { k: 'wait', n: '让我先看看时间', ico: '🤔' },
  ],
  _ta99DatesView(row, myPos) {
    const dates = Array.isArray(row.extra.dates) ? row.extra.dates : [];
    const pend = dates.filter(x => x.st === 'pending' && x.by !== myPos);
    const mine = dates.filter(x => x.by === myPos);
    const got = dates.filter(x => x.by !== myPos);
    return `
    <div class="card">
      <div class="card-title"><span class="ico">💘</span>AI 约会邀请
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.8">选类型 / 时间 / 地点 → AI 写一张浪漫邀请卡（可自己改文案）→ 发给Ta。Ta可以「必须答应！」「等你好久了」或「让我先看看时间」——回应同步你们俩。</div>
      <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0;margin-top:10px" onclick="App.ta99DateNew()">✍️ 写一张邀请卡</button>
    </div>
    ${pend.length ? `<div class="card" style="border:2px solid #fda4af;background:linear-gradient(180deg,#fff1f2,#fff)">
      <div class="card-title"><span class="ico">💌</span>Ta 约你（待回应）</div>
      ${pend.map(x => `
        <div class="ta99-date-card">
          <div class="ta99-date-txt">“${this.esc(x.text)}”</div>
          <div class="ta99-date-meta">${this.esc(x.type)} · ${this.esc(x.time)} · ${this.esc(x.place)} · 来自Ta</div>
          <div class="ta99-date-acts">
            ${this.TA99_DATE_ANS.map(a => `<button type="button" class="btn btn-sm${a.k === 'yes' ? ' btn-primary' : ' btn-ghost'}" onclick="App.ta99DateAnswer('${x.id}','${a.n.replace(/'/g, '')}')">${a.ico} ${a.n}</button>`).join('')}
          </div>
        </div>`).join('')}
    </div>` : ''}
    ${got.length ? `<div class="card" style="margin-top:14px"><div class="card-title"><span class="ico">📥</span>Ta 发过的邀请</div>
      ${got.map(x => this._ta99DateRow(x, false)).join('')}</div>` : ''}
    ${mine.length ? `<div class="card" style="margin-top:14px"><div class="card-title"><span class="ico">📤</span>我发起的邀请</div>
      ${mine.map(x => this._ta99DateRow(x, true)).join('')}</div>` : ''}`;
  },
  _ta99DateRow(x, isMine) {
    const st = x.st === 'pending' ? '<span class="cs99-st st-idle">⏳ 等Ta回应</span>'
      : (x.st === 'yes' ? '<span class="cs99-st st-use">💖 已答应</span>' : '<span class="cs99-st st-sold">🤔 Ta再看看时间</span>');
    return `<div class="ta99-date-card ${x.by !== undefined ? '' : ''}">
      <div class="ta99-date-txt">“${this.esc(x.text)}”</div>
      <div class="ta99-date-meta">${this.esc(x.type)} · ${this.esc(x.time)} · ${this.esc(x.place)}${x.ans ? ' · Ta回应：' + this.esc(x.ans) : ''} ${st}
        ${isMine ? `<a href="javascript:void(0)" style="font-size:11.5px;color:#94a3b8;margin-left:8px" onclick="App.ta99DateDel('${x.id}')">删除</a>` : ''}</div>
    </div>`;
  },
  ta99DateNew() {
    const sel = (id, arr) => `<div class="cs99-sel-cats" id="${id}">${arr.map((v, i) => `<button type="button" class="cs99-sel-cat${i === 0 ? ' on' : ''}" data-v="${v}">${v}</button>`).join('')}</div>`;
    this._modal('💘 写一张约会邀请卡', `
      <div class="cs99-form">
        <div class="cs99-f-row"><label>① 约会类型</label>${sel('d99-type', this.TA99_DATE_TYPES)}</div>
        <div class="cs99-f-row"><label>② 时间</label>${sel('d99-time', this.TA99_DATE_TIMES)}</div>
        <div class="cs99-f-row"><label>③ 地点</label>${sel('d99-place', this.TA99_DATE_PLACES)}</div>
        <div class="cs99-f-row"><label>④ 邀请文案（AI 会先写一版，可以自己改）</label>
          <textarea id="d99-text" maxlength="120" style="width:100%;min-height:70px;border-radius:10px;border:1px solid #cbd5e1;padding:8px;font-size:13px" placeholder="点下方「让AI写」生成，或直接自己写"></textarea>
        </div>
      </div>`,
      [
        { label: '✨ 让AI写一版', keep: true, onClick: async () => {
            const g = (id) => { const b = document.querySelector('#' + id + ' .cs99-sel-cat.on'); return b ? b.dataset.v : ''; };
            const t = document.getElementById('d99-text');
            t.value = '（阿福正在帮你写…）';
            t.value = await this._ta99DateGen(g('d99-type'), g('d99-time'), g('d99-place'));
            return false;   // keep 弹窗开着
          } },
        { label: '💘 发送给Ta', primary: true, onClick: async () => {
            const g = (id) => { const b = document.querySelector('#' + id + ' .cs99-sel-cat.on'); return b ? b.dataset.v : ''; };
            const text = (document.getElementById('d99-text').value || '').trim();
            if (!text) { this._flash('❌ 先写点文案（或点「让AI写一版」）'); return false; }
            await this._ta99Mutate((extra, myPos) => {
              extra.dates = Array.isArray(extra.dates) ? extra.dates : [];
              extra.dates.unshift({ id: 'd' + Date.now().toString(36), type: g('d99-type'), time: g('d99-time'), place: g('d99-place'), text: text.slice(0, 120), by: myPos, st: 'pending', ans: '', ts: Date.now() });
              if (extra.dates.length > 40) extra.dates.length = 40;
            });
            this._flash('💘 邀请卡已送达——Ta下次打开就能看到');
            if (this._notify99SystemPush) this._notify99SystemPush('ta99', '约会邀请', '有人给你准备了一个小Moment，快去【Ta】看看 💌', 'ta99');
            this.ta99Tab('dates');
          } },
        { label: '取消' },
      ]);
    setTimeout(() => {
      ['d99-type', 'd99-time', 'd99-place'].forEach(id => {
        const box = document.getElementById(id);
        if (box) box.querySelectorAll('.cs99-sel-cat').forEach(b => b.addEventListener('click', () => {
          box.querySelectorAll('.cs99-sel-cat').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
        }));
      });
    }, 50);
  },
  // AI 文案：配置过阿福 AI 用 LLM；没配置走本地模板（永远可用）
  async _ta99DateGen(type, time, place) {
    try {
      const st = this._afuAIState ? this._afuAIState() : { ok: false };
      if (st.ok) {
        const cfg = st.cfg;
        const isWorker = cfg.mode === 'worker';
        const headers = { 'Content-Type': 'application/json' };
        if (!isWorker) headers['Authorization'] = 'Bearer ' + cfg.key;
        const url = isWorker ? this._afuAIEndpoint(cfg) : cfg.base.replace(/\/+$/, '') + '/chat/completions';
        const sys = '你是「一人行」App 的约会邀请文案师。写一句浪漫、真诚、克制的中文约会邀请（30-60字），用第一人称「我」对「宝贝」说，必须自然提到约会类型、时间与地点，甜而不腻，结尾像在等一个回答。只输出邀请正文，不要引号不要解释。';
        const res = await fetch(url, {
          method: 'POST', headers,
          body: JSON.stringify({
            model: isWorker ? 'glm-4-flash' : (cfg.model || 'deepseek-chat'),
            messages: [{ role: 'system', content: sys }, { role: 'user', content: `约会类型：${type}；时间：${time}；地点：${place}` }],
            temperature: 0.8, max_tokens: 120,
          }),
        });
        const j = await res.json().catch(() => ({}));
        const reply = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        if (reply) return reply.trim().slice(0, 120);
      }
    } catch (e) {}
    // 本地模板兜底（阿福 AI 未配置也能用）
    const T = [
      `致我的宝贝：我已经紧张到写了个专属邀请卡——${time}，想认真约你去${place}${type === '吃饭' ? '吃一顿好吃的' : type}。你愿意来吗？`,
      `有人给你准备了一个小Moment，${time}想约你去${place}${type}，你愿意来吗？`,
      `宝贝，${time}的${place}，缺一个你。${type}计划已就位，就差你点头。`,
      `想约你${type}这件事想了很久——${time}，${place}，不见不散好吗？`,
    ];
    return T[Math.floor(Math.random() * T.length)];
  },
  async ta99DateAnswer(id, ans) {
    const yes = ans.indexOf('必须') !== -1 || ans.indexOf('等你好久') !== -1;
    await this._ta99Mutate((extra) => {
      const d = (extra.dates || []).find(x => x.id === id);
      if (d) { d.st = yes ? 'yes' : 'wait'; d.ans = ans; d.ansTs = Date.now(); }
    });
    if (yes) {
      await this._ta99SweetAdd(10, '赴约邀请');
      this._flash('💖 已答应——记得赴约呀（甜蜜值 +10，双方都有）');
    } else {
      this._flash('🤔 已回应「' + ans + '」——Ta会看到的');
    }
    this.ta99Tab('dates');
  },
  async ta99DateDel(id) {
    await this._ta99Mutate((extra) => { extra.dates = (extra.dates || []).filter(x => x.id !== id); });
    this._flash('🗑️ 邀请卡已删除');
    this.ta99Tab('dates');
  },

  // ==================== 🏆 共同目标（双方共更进度 · 完成解锁徽章双份奖励）====================
  _ta99GoalsView(row, myPos) {
    const goals = Array.isArray(row.extra.goals) ? row.extra.goals : [];
    const badges = Array.isArray(row.extra.badges) ? row.extra.badges : [];
    return `
    <div class="card">
      <div class="card-title"><span class="ico">🏆</span>共同目标
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.8">一起攒钱旅行 / 一起减肥 / 一起学做饭——双方都能更新进度，进度条实时共享；完成解锁<b>情侣徽章</b> + 宝石奖励（双方各一份）。</div>
      <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0;margin-top:10px" onclick="App.ta99GoalAdd()">🎯 创建共同目标</button>
      ${badges.length ? `<div style="margin-top:12px;font-size:12px;color:#92400e">🏅 已解锁徽章：${badges.map(b => this.esc(b)).join(' · ')}</div>` : ''}
    </div>
    ${goals.length ? goals.map(g => {
      const pct = Math.min(100, Math.round((g.cur || 0) / Math.max(1, g.target || 1) * 100));
      return `<div class="card" style="margin-top:14px${g.done ? ';opacity:.72' : ''}">
        <div class="card-title"><span class="ico">${g.done ? '🏅' : '🎯'}</span>${this.esc(g.title)}
          ${g.done ? '<span class="cs99-st st-use">已完成</span>' : ''}
          <a href="javascript:void(0)" style="font-size:11.5px;color:#94a3b8;margin-left:8px" onclick="App.ta99GoalDel('${g.id}')">删除</a></div>
        <div class="cs99-bar" style="margin-top:8px"><i style="width:${pct}%;background:linear-gradient(90deg,#f472b6,#fb7185)"></i></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <span style="font-size:13px"><b>${g.cur || 0}</b> / ${g.target || 0} ${this.esc(g.unit || '')}</span>
          ${g.done ? '' : `<span>
            <button type="button" class="btn btn-sm btn-ghost" onclick="App.ta99GoalUpd('${g.id}',1)">+1</button>
            <button type="button" class="btn btn-sm btn-ghost" onclick="App.ta99GoalUpd('${g.id}',5)">+5</button>
            <button type="button" class="btn btn-sm btn-primary" onclick="App.ta99GoalDone('${g.id}')">完成 🏅</button>
          </span>`}
        </div>
      </div>`;
    }).join('') : '<div class="empty" style="margin:18px 0">还没有共同目标——创建第一个吧</div>'}`;
  },
  ta99GoalAdd() {
    this._modal('🎯 创建共同目标', `
      <div class="cs99-form">
        <div class="cs99-f-row"><label>目标（如：一起攒钱去海边旅行）</label><input id="g99-title" type="text" maxlength="24" placeholder="你们想一起完成的事"></div>
        <div class="cs99-f-2col">
          <div class="cs99-f-row"><label>总量（数字）</label><input id="g99-target" type="number" inputmode="numeric" min="1" value="100"></div>
          <div class="cs99-f-row"><label>单位</label><input id="g99-unit" type="text" maxlength="6" placeholder="元 / 次 / 公斤"></div>
        </div>
      </div>`,
      [{ label: '创建', primary: true, onClick: async () => {
          const title = (document.getElementById('g99-title').value || '').trim();
          const target = Math.max(1, +document.getElementById('g99-target').value || 1);
          const unit = (document.getElementById('g99-unit').value || '').trim();
          if (!title) { this._flash('❌ 先写下目标'); return false; }
          await this._ta99Mutate((extra, myPos) => {
            extra.goals = Array.isArray(extra.goals) ? extra.goals : [];
            extra.goals.unshift({ id: 'g' + Date.now().toString(36), title: title.slice(0, 24), target, unit, cur: 0, by: myPos, done: false, ts: Date.now() });
          });
          this._flash('🎯 共同目标已创建——喊Ta一起来更新进度');
          this.ta99Tab('goals');
        } }, { label: '取消' }]);
  },
  async ta99GoalUpd(id, n) {
    await this._ta99Mutate((extra) => {
      const g = (extra.goals || []).find(x => x.id === id);
      if (g && !g.done) g.cur = Math.max(0, (g.cur || 0) + n);
    });
    this._sfx99('tap');
    this.ta99Tab('goals');
  },
  async ta99GoalDone(id) {
    let title = '';
    await this._ta99Mutate((extra) => {
      const g = (extra.goals || []).find(x => x.id === id);
      if (g && !g.done) { g.done = true; g.doneAt = Date.now(); title = g.title; extra.badges = Array.isArray(extra.badges) ? extra.badges : []; extra.badges.push('🏆 ' + title); }
    });
    if (title) {
      await this._ta99SweetAdd(15, '完成共同目标');
      try {
        if (!this._dev99) {
          const r = this._rpg99Data(); r.exp += 3; this._rpg99Save(r);
          if (this._pet99Data) { const p = this._pet99Data(); p.points += 2; this._pet99Save(p); }
        }
      } catch (e) {}
      this._flash('🏅 目标完成——情侣徽章解锁 · 经验 +3 · 宝石 +2（Ta那边打开也会领到Ta的一份）· 甜蜜值 +15');
      if (this._notify99SystemPush) this._notify99SystemPush('ta99', '共同目标达成', '你们一起完成了「' + title + '」🎉', 'ta99');
    }
    this.ta99Tab('goals');
  },
  async ta99GoalDel(id) {
    await this._ta99Mutate((extra) => { extra.goals = (extra.goals || []).filter(x => x.id !== id); });
    this._flash('🗑️ 目标已删除');
    this.ta99Tab('goals');
  },

  // ==================== 🌾 情侣农场（同耕一块地 · 双方各浇一次算一天 · 收获双份奖励）====================
  TA99_CROPS: [
    { k: 'sunflower', n: '向日葵', ico: '🌻', days: 3 },
    { k: 'strawberry', n: '草莓', ico: '🍓', days: 2 },
    { k: 'carrot', n: '胡萝卜', ico: '🥕', days: 2 },
    { k: 'tomato', n: '番茄', ico: '🍅', days: 3 },
    { k: 'tulip', n: '郁金香', ico: '🌷', days: 4 },
  ],
  _ta99FarmDays(p) {   // 已完成生长天数：双方都在同一天浇过水才算一天
    const days = p.water || {};
    let n = 0;
    for (const dk in days) if (days[dk] && days[dk].a && days[dk].b) n++;
    return n;
  },
  _ta99FarmReady(p) {
    const crop = this.TA99_CROPS.find(c => c.k === p.crop);
    return crop ? this._ta99FarmDays(p) >= crop.days : false;
  },
  _ta99FarmView(row, myPos) {
    const farm = row.extra.farm || {};
    const plots = Array.isArray(farm.plots) ? farm.plots : [null, null, null, null];
    return `
    <div class="card">
      <div class="card-title"><span class="ico">🌾</span>情侣农场
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.8">同一块地，两个人一起种：一方播种 → 双方每天各浇一次水（都浇了才算一天）→ 成熟收获 <b>+5 甜蜜值 + 双方各一份宝石</b>。轮作越勤，农场越旺。</div>
    </div>
    <div class="ta99-farm-grid">
      ${plots.map((p, i) => {
        if (!p || !p.crop) return `<div class="ta99-plot empty" onclick="App.ta99FarmPlant(${i})"><span>➕</span><small>开垦播种</small></div>`;
        const crop = this.TA99_CROPS.find(c => c.k === p.crop) || { ico: '🌱', n: '作物', days: 3 };
        const days = this._ta99FarmDays(p);
        const ready = this._ta99FarmReady(p);
        const watered = (p.water || {})[Store.today()] || {};
        const meW = !!watered[myPos], taW = !!watered[myPos === 'a' ? 'b' : 'a'];
        return `<div class="ta99-plot ${ready ? 'ready' : ''} ${p.done ? 'done' : ''}">
          <div class="ta99-plot-ico">${p.done ? '🧺' : (ready ? crop.ico : '🌱')}</div>
          <div class="ta99-plot-n">${crop.n} · ${days}/${crop.days} 天</div>
          <div class="ta99-plot-water">今天浇水：${meW ? '✅我' : '⬜我'} ${taW ? '✅Ta' : '⬜Ta'}</div>
          ${p.done ? `<div class="ta99-plot-sub">已收获归仓</div>` : (ready
            ? `<button type="button" class="btn btn-sm btn-primary" onclick="App.ta99FarmHarvest(${i})">🌾 收获</button>`
            : `<button type="button" class="btn btn-sm btn-ghost" onclick="App.ta99FarmWater(${i})">💧 浇水</button>`)}
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:11.5px;color:#94a3b8;text-align:center;margin-top:10px">农场数据双方共享（云端 extra）· 收获时对方也会收到通知领奖励</div>`;
  },
  ta99FarmPlant(i) {
    this._modal('🌱 播种', `
      <div class="cs99-sel-cats" id="f99-crops">${this.TA99_CROPS.map((c, j) => `<button type="button" class="cs99-sel-cat${j === 0 ? ' on' : ''}" data-k="${c.k}">${c.ico} ${c.n} · ${c.days}天</button>`).join('')}</div>`,
      [{ label: '播种', primary: true, onClick: async () => {
          const b = document.querySelector('#f99-crops .cs99-sel-cat.on');
          if (!b) return false;
          await this._ta99Mutate((extra) => {
            extra.farm = extra.farm || {};
            const plots = extra.farm.plots = Array.isArray(extra.farm.plots) ? extra.farm.plots : [null, null, null, null];
            plots[i] = { crop: b.dataset.k, plantedAt: Date.now(), water: {}, done: false };
          });
          this._flash('🌱 种下去了——记得每天来浇水');
          this.ta99Tab('farm');
        } }, { label: '取消' }]);
    setTimeout(() => {
      const box = document.getElementById('f99-crops');
      if (box) box.querySelectorAll('.cs99-sel-cat').forEach(b => b.addEventListener('click', () => {
        box.querySelectorAll('.cs99-sel-cat').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      }));
    }, 50);
  },
  async ta99FarmWater(i) {
    let dup = false, taW = false;
    await this._ta99Mutate((extra, myPos) => {
      extra.farm = extra.farm || {};
      const plots = extra.farm.plots = Array.isArray(extra.farm.plots) ? extra.farm.plots : [null, null, null, null];
      const p = plots[i];
      if (!p || p.done) return;
      p.water = p.water || {};
      const today = p.water[Store.today()] = p.water[Store.today()] || { a: 0, b: 0 };
      if (today[myPos]) { dup = true; return; }
      today[myPos] = 1;
      taW = !!today[myPos === 'a' ? 'b' : 'a'];
    });
    if (dup) { this._flash('💧 你今天浇过啦——等Ta也来浇一次，就长一天'); return; }
    this._sfx99('liquid');
    this._flash(taW ? '💧 你们今天都浇过了——作物长了一天！' : '💧 浇好了——Ta今天也浇一次才算一天哦');
    this.ta99Tab('farm');
  },
  async ta99FarmHarvest(i) {
    let cropN = '';
    await this._ta99Mutate((extra) => {
      extra.farm = extra.farm || {};
      const plots = extra.farm.plots = Array.isArray(extra.farm.plots) ? extra.farm.plots : [null, null, null, null];
      const p = plots[i];
      if (p && !p.done) { p.done = true; p.doneAt = Date.now(); cropN = (this.TA99_CROPS.find(c => c.k === p.crop) || {}).n || '作物'; }
    });
    if (cropN) {
      await this._ta99SweetAdd(5, '农场收获');
      try {
        if (!this._dev99) {
          const r = this._rpg99Data(); r.exp += 2; this._rpg99Save(r);
          if (this._pet99Data) { const p = this._pet99Data(); p.points += 1; this._pet99Save(p); }
        }
      } catch (e) {}
      this._flash(`🌾 收获了「${cropN}」——甜蜜值 +5 · 经验 +2 · 宝石 +1（Ta打开农场也会领到Ta的一份）`);
      if (this._notify99SystemPush) this._notify99SystemPush('ta99', '农场收获', '你们的' + cropN + '成熟收获啦 🌾', 'ta99');
    }
    this.ta99Tab('farm');
  },

  // ==================== 📷 回忆相册（共同上传 · 时间线 · 纪念日识别）====================
  _ta99AlbumView(row, myPos) {
    const album = Array.isArray(row.extra.album) ? row.extra.album : [];
    const annis = Array.isArray(row.extra.anni) ? row.extra.anni : [];
    return `
    <div class="card">
      <div class="card-title"><span class="ico">📷</span>回忆相册
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.8">共同上传照片，自动生成时间线；配一句当时的心情。纪念日临近时阿福会提醒你们翻翻这里（最多保留 24 张，云端共享）。</div>
      <label class="btn btn-primary" style="display:inline-block;background:linear-gradient(90deg,#e11d48,#fb7185);border:0;margin-top:10px">
        📤 上传一张回忆<input type="file" accept="image/*" style="display:none" onchange="App.ta99AlbumUpload(this)">
      </label>
      ${annis.length ? `<div style="margin-top:10px;font-size:12px;color:#92400e">🎂 纪念日：${annis.map(a => this.esc(a.n || a.d)).join(' · ')}</div>` : ''}
    </div>
    ${album.length ? album.map(p => `
      <div class="ta99-photo-card">
        <img src="${p.img}" alt="回忆" onclick="this.classList.toggle('zoom')">
        <div class="ta99-photo-meta">
          <span>${new Date(p.ts).toISOString().slice(0, 10)} · ${p.by === myPos ? '我上传' : 'Ta上传'}</span>
          ${p.note ? `<em>${this.esc(p.note)}</em>` : ''}
          <a href="javascript:void(0)" style="font-size:11px;color:#94a3b8" onclick="App.ta99AlbumDel('${p.id}')">删除</a>
        </div>
      </div>`).join('') : '<div class="empty" style="margin:18px 0">相册还是空的——上传第一张合照吧</div>'}`;
  },
  ta99AlbumUpload(input) {
    const f = input && input.files && input.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // 压缩：480px JPEG 0.62（extra 云端共享 · 控制单张体积）
          const cv = document.createElement('canvas');
          const scale = Math.min(1, 480 / Math.max(img.width, img.height));
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          const data = cv.toDataURL('image/jpeg', 0.62);
          if (data.length > 90000) { this._flash('⚠️ 这张图有点大，换一张或裁小一点再传'); return; }
          this._modal('📝 这张回忆', `
            <div style="text-align:center"><img src="${data}" style="max-width:100%;border-radius:12px"></div>
            <input id="p99-note" type="text" maxlength="40" placeholder="配一句当时的心情（可选）" style="width:100%;margin-top:10px;border-radius:10px;border:1px solid #cbd5e1;padding:8px;font-size:13px">`,
            [{ label: '存进相册', primary: true, onClick: async () => {
                const note = (document.getElementById('p99-note').value || '').trim();
                await this._ta99Mutate((extra, myPos) => {
                  extra.album = Array.isArray(extra.album) ? extra.album : [];
                  extra.album.unshift({ id: 'p' + Date.now().toString(36), img: data, note, by: myPos, ts: Date.now() });
                  if (extra.album.length > 24) extra.album.length = 24;   // 云端克制：最多 24 张
                });
                this._flash('📷 回忆已存进你们的时间线');
                if (this._notify99SystemPush) this._notify99SystemPush('ta99', '回忆相册', '对方往你们的相册里添了一张新回忆 📷', 'ta99');
                this.ta99Tab('album');
              } }, { label: '取消' }]);
        } catch (err) { this._flash('⚠️ 这张图处理不了，换一张试试'); }
      };
      img.src = e.target.result;
    };
    rd.readAsDataURL(f);
  },
  async ta99AlbumDel(id) {
    await this._ta99Mutate((extra) => { extra.album = (extra.album || []).filter(x => x.id !== id); });
    this._flash('🗑️ 已删除');
    this.ta99Tab('album');
  },

  // ==================== 👣 双人足迹（一起去过的地方 · 联动足迹点亮）====================
  _ta99PlacesView(row, myPos) {
    const places = Array.isArray(row.extra.places) ? row.extra.places : [];
    return `
    <div class="card">
      <div class="card-title"><span class="ico">👣</span>双人足迹
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.8">记录你们一起去过的地方——城市、街角、海边、小店都算。你自己的 34 省足迹点亮在【记录 → 足迹】，这里是「我们一起」的地图。</div>
      <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0;margin-top:10px" onclick="App.ta99PlaceAdd()">📍 记下这一站</button>
      <button class="btn btn-ghost" style="margin-left:8px" onclick="App.gotoWb('footprints99')">🧭 看我的足迹点亮</button>
    </div>
    ${places.length ? places.map(p => `
      <div class="cs99-item" style="margin-top:12px">
        <span class="cs99-ico emoji">📍</span>
        <div class="cs99-mid">
          <div class="cs99-name">${this.esc(p.place)}</div>
          <div class="cs99-sub">${p.date || ''} · ${p.by === myPos ? '我记的' : 'Ta记的'}${p.note ? ' · ' + this.esc(p.note) : ''}</div>
        </div>
        <div class="cs99-right"><div class="cs99-acts"><button type="button" class="btn btn-ghost btn-sm" onclick="App.ta99PlaceDel('${p.id}')">删除</button></div></div>
      </div>`).join('') : '<div class="empty" style="margin:18px 0">还没有一起去过的地方——从第一站开始记吧</div>'}`;
  },
  ta99PlaceAdd() {
    this._modal('📍 记下这一站', `
      <div class="cs99-form">
        <div class="cs99-f-row"><label>地方（城市 / 街角 / 海边 / 小店…）</label><input id="pl99-place" type="text" maxlength="20" placeholder="如：鼓浪屿"></div>
        <div class="cs99-f-2col">
          <div class="cs99-f-row"><label>日期</label><input id="pl99-date" type="date" value="${Store.today()}"></div>
          <div class="cs99-f-row"><label>备注（可选）</label><input id="pl99-note" type="text" maxlength="30" placeholder="发生了什么"></div>
        </div>
      </div>`,
      [{ label: '记下', primary: true, onClick: async () => {
          const place = (document.getElementById('pl99-place').value || '').trim();
          if (!place) { this._flash('❌ 地方不能为空'); return false; }
          await this._ta99Mutate((extra, myPos) => {
            extra.places = Array.isArray(extra.places) ? extra.places : [];
            extra.places.unshift({ id: 'pl' + Date.now().toString(36), place: place.slice(0, 20), date: document.getElementById('pl99-date').value || Store.today(), note: (document.getElementById('pl99-note').value || '').trim(), by: myPos, ts: Date.now() });
          });
          this._flash('📍 足迹已记下——你们的地图又亮了一点');
          this.ta99Tab('places');
        } }, { label: '取消' }]);
  },
  async ta99PlaceDel(id) {
    await this._ta99Mutate((extra) => { extra.places = (extra.places || []).filter(x => x.id !== id); });
    this._flash('🗑️ 已删除');
    this.ta99Tab('places');
  },

  // ==================== 👑 专属装扮（主页皮肤 + 情侣头像框 · 甜蜜值解锁）====================
  TA99_THEMES: [
    { k: 'pink', n: '粉爱心', need: 0, d: '默认 · 柔和粉爱心' },
    { k: 'star', n: '星空', need: 150, d: '深蓝星夜 · 星星点缀' },
    { k: 'pixel', n: '像素情侣', need: 300, d: '像素风 · 情侣色调' },
  ],
  _ta99DressView(row, myPos) {
    const sweet = +row.extra.sweet || 0;
    const dress = row.extra.dress || {};
    const cur = dress.theme || 'pink';
    return `
    <div class="card">
      <div class="card-title"><span class="ico">👑</span>专属装扮
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.ta99Tab('home')">← 返回</button></div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.8">情侣空间主页皮肤 + 情侣头像框——绑定即解锁粉爱心，<b>甜蜜值</b>涨上去解锁更多（${this.TA99_SWEET_RULE}）。装扮对双方同时生效。</div>
      <div class="cs99-sel-cats" style="margin-top:10px">
        ${this.TA99_THEMES.map(t => {
          const lock = sweet < t.need;
          return `<button type="button" class="cs99-sel-cat${cur === t.k ? ' on' : ''}${lock ? ' lock' : ''}" ${lock ? `onclick="App._flash('🔒 甜蜜值 ${t.need} 解锁——签到/约会/目标/农场都涨甜蜜值')"` : `onclick="App.ta99DressSet('${t.k}')"`}>${lock ? '🔒 ' : ''}${t.n}${t.need ? ` · ${t.need}` : ''}</button>`;
        }).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="card-title"><span class="ico">💕</span>甜蜜值 ${sweet} · Lv.${Math.floor(sweet / 100)}</div>
      <div class="cs99-bar" style="margin-top:8px"><i style="width:${sweet % 100}%;background:linear-gradient(90deg,#f472b6,#fb7185)"></i></div>
      <div style="font-size:12px;color:var(--text-soft);margin-top:8px;line-height:1.8">当前主题「${(this.TA99_THEMES.find(t => t.k === cur) || {}).n}」· 情侣头像框随绑定自动解锁 💞<br>${this.TA99_SWEET_RULE}</div>
    </div>`;
  },
  async ta99DressSet(k) {
    await this._ta99Mutate((extra) => {
      extra.dress = extra.dress || {};
      extra.dress.theme = k;
    });
    this._sfx99('success');
    this._flash('👑 主题已更换——你们的专属风格');
    this.ta99Tab('home');
  },
});
