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
  _ta99: { tab: 'home', moments: 'ta', row: null, invite: null, msg: '' },

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

  TA99_SQL: `-- 一人行 ·【Ta】情侣空间 · 自动搭建器（开发者执行一次即可，之后所有用户自动搭建）
-- 一次性把 ta99_init() 函数本身建好；之后 App 检测到表缺失时自动调用此函数完成全部搭建
-- v12.9.47b：① 开头先 DROP 再 CREATE 修复版 ta99_claim（老库粘贴这段 SQL 即修复——OR REPLACE 改不了参数名）；② ta99_init 每次调用都 DROP+CREATE 刷新 RPC 函数（幂等升级，不动数据）
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

create or replace function public.ta99_init() returns json
language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  -- 幂等检查：表已存在则跳过建表（避免覆盖数据）；RPC 函数仍在下方 create or replace 自刷新——老库自动升级到修复版
  select count(*) into cnt from information_schema.tables
    where table_schema = 'public' and table_name = 'invites99';
  if cnt = 0 then

  -- 建表 invites99
  execute 'create table public.invites99 (
    code text primary key,
    owner uuid not null references auth.users on delete cascade,
    claimed_by uuid references auth.users on delete cascade,
    created_at timestamptz not null default now()
  )';
  execute 'alter table public.invites99 enable row level security';
  execute 'drop policy if exists "inv_own" on public.invites99';
  execute 'create policy "inv_own" on public.invites99 for all to authenticated using (auth.uid() = owner) with check (auth.uid() = owner)';

  -- 建表 couples99
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

  -- 建 RPC 函数（v12.9.47b：先 DROP 再 CREATE——OR REPLACE 无法改参数名 code→p_code，老库会撞 42P13）
  execute 'drop function if exists public.ta99_claim(text)';
  execute 'create function public.ta99_claim(p_code text) returns json language plpgsql security definer set search_path = public as $f$ declare inv record; me uuid := auth.uid(); begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; select * into inv from public.invites99 where public.invites99.code = upper(p_code) for update; if not found then return json_build_object(''ok'', false, ''msg'', ''邀请码不存在''); end if; if inv.owner = me then return json_build_object(''ok'', false, ''msg'', ''这是你自己的邀请码——要输入Ta的''); end if; if inv.claimed_by is not null then return json_build_object(''ok'', false, ''msg'', ''邀请码已被使用''); end if; if exists (select 1 from public.couples99 where user_a = me or user_b = me) then return json_build_object(''ok'', false, ''msg'', ''你已有另一半''); end if; if exists (select 1 from public.couples99 where user_a = inv.owner or user_b = inv.owner) then return json_build_object(''ok'', false, ''msg'', ''对方已绑定他人''); end if; update public.invites99 set claimed_by = me where public.invites99.code = inv.code; insert into public.couples99 (user_a, user_b, since) values (inv.owner, me, current_date); return json_build_object(''ok'', true); end $f$';

  execute 'create or replace function public.ta99_write(target text, data jsonb) returns json language plpgsql security definer set search_path = public as $f$ declare me uuid := auth.uid(); n int; begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; if target = ''share_a'' then update public.couples99 set share_a = data, updated_at = now() where user_a = me; elsif target = ''share_b'' then update public.couples99 set share_b = data, updated_at = now() where user_b = me; elsif target = ''extra'' then update public.couples99 set extra = data, updated_at = now() where user_a = me or user_b = me; elsif target = ''since'' then update public.couples99 set since = (data ->> ''d'')::date, updated_at = now() where user_a = me or user_b = me; else return json_build_object(''ok'', false, ''msg'', ''参数不对''); end if; get diagnostics n = row_count; if n = 0 then return json_build_object(''ok'', false, ''msg'', ''还没绑定另一半''); end if; return json_build_object(''ok'', true); end $f$';

  execute 'create or replace function public.ta99_leave() returns json language plpgsql security definer set search_path = public as $f$ declare me uuid := auth.uid(); n int; begin if me is null then return json_build_object(''ok'', false, ''msg'', ''请先登录''); end if; delete from public.couples99 where user_a = me or user_b = me; get diagnostics n = row_count; delete from public.invites99 where owner = me; return json_build_object(''ok'', n > 0); end $f$';

  execute 'revoke execute on function public.ta99_claim(text) from anon, public';
  execute 'revoke execute on function public.ta99_write(text, jsonb) from anon, public';
  execute 'revoke execute on function public.ta99_leave() from anon, public';
  execute 'grant execute on function public.ta99_claim(text) to authenticated';
  execute 'grant execute on function public.ta99_write(text, jsonb) to authenticated';
  execute 'grant execute on function public.ta99_leave() to authenticated';

  return json_build_object('ok', true, 'created', cnt = 0, 'msg', case when cnt = 0 then 'initialized' else 'upgraded' end);
end $$;

revoke all on function public.ta99_init() from anon, public;
grant execute on function public.ta99_init() to authenticated;`,

  // 精简提示 SQL（仅当 ta99_init 函数本身也不存在时显示给开发者 · 一次即可）
  TA99_INIT_HINT:
    '检测到【Ta】自动搭建函数 ta99_init() 还未部署——请到 Supabase SQL Editor 执行下方 SQL 一次（仅此一次），之后所有终端用户首次进入【Ta】时自动搭建完成。',

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
    this.ta99Refresh(); // 异步拉取云端（邀请码/情侣行），完成后局部刷新 #ta99-body
    return `<div id="ta99-body">${this._ta99Render()}</div>`;
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
      if (el && this._wbView === 'ta99') el.innerHTML = this._ta99Render();
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
      const { error } = await this._c99.client.rpc('ta99_write', { target, data: this._ta99Snapshot() });
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
      <div style="font-size:12.5px;color:#64748b;margin-top:6px;line-height:1.9">输入对方的邀请码，成为彼此的另一半<br>看见彼此的打卡 · 经济 · 医疗近况<br>一起签到连心，一起记你们的日子</div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="App.navigate('sync')">🔐 先去登录云账号</button>
      <div style="font-size:11.5px;color:#94a3b8;margin-top:8px">【Ta】需要云账号识别彼此（和【同步】是同一套账号，注册一次全 App 通用）</div>
    </div>`;
  },

  // ==================== 视图：未绑定 ====================
  _ta99BindView() {
    const t = this._ta99;
    const inv = t.invite;
    const code = (inv && !inv.claimed_by && inv.code) || '';
    return `
    <div class="card">
      <div class="card-title"><span class="ico">💌</span>我的邀请码<span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">发给Ta · Ta在【记录 → Ta】里输入并绑定</span></div>
      ${code ? `
        <div class="ta99-code">${this.esc(code)}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99Copy()">📋 复制邀请码</button>
          <button class="btn btn-ghost" onclick="App.ta99GenCode()">↻ 换一个</button>
        </div>` : `
        <div style="font-size:12.5px;color:var(--text-soft);line-height:1.8;margin:6px 0 10px">还没有邀请码——点下面的按钮生成一个，发给你的另一半。</div>
        <div style="text-align:center"><button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99GenCode()">✨ 生成我的邀请码</button></div>`}
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">❤️</span>输入Ta的邀请码</div>
      <div class="field" style="margin:6px 0 10px"><input id="ta99-code-in" class="input" inputmode="numeric" maxlength="6" placeholder="6 位数字" style="letter-spacing:4px;text-align:center;font-size:16px" onkeydown="if(event.key==='Enter')App.ta99Bind()"></div>
      <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0" onclick="App.ta99Bind()">💞 绑定</button>
      <div style="font-size:11.5px;color:#94a3b8;margin-top:8px;line-height:1.7">绑定后：可以看见彼此的打卡 / 经济 / 医疗近况（健康隐私永不上传）；有需要两个人都签到的情侣签到；纪念日互相提醒；还能互相设置打卡。</div>
    </div>
    ${(t.msg && t.msg.indexOf('首次部署') >= 0) ? `
    <div class="card">
      <div class="card-title"><span class="ico">🛠️</span>首次部署<span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">仅开发者执行一次</span></div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7">检测到自动搭建函数 <code>ta99_init()</code> 还未部署——复制下方 SQL 到 Supabase SQL Editor 执行一次即可，之后<b>所有用户</b>首次进入【Ta】时自动搭建完成，无需任何手动操作。
        <a href="javascript:void(0)" style="color:#e11d48" onclick="App.ta99ToggleSQL()">展开 SQL</a></div>
      <div style="font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 10px;margin-top:8px;line-height:1.7">🔗 当前连接项目：<b>${this.esc(this._ta99Host())}</b> · SQL 必须在<b>这个项目</b>里执行</div>
      <div id="ta99-sql" style="display:none"><pre class="c99-sql">${this.esc(this.TA99_SQL)}</pre></div>
    </div>` : ''}`;
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
    return this._ta99HomeView(row, extra, myPos);
  },

  // —— 主页：hero + 导航卡 ——
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
    // v12.9.22 深化：小纸条未读 / 心愿单进度 / 每日一问状态
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
    return `
    <div class="card ta99-hero">
      <div class="ta99-hero-cats">${this._pet99CatHtml({ px: 58 })}<span class="ta99-hero-heart">❤</span><span class="pxcat ta99-cat-r" style="width:58px;height:61.6px;background-size:calc(58px*8) 61.6px"></span></div>
      ${since ? `
        <div class="ta99-days-num">${days}</div>
        <div class="ta99-days-lbl">在一起的第 ${days} 天</div>
        <div class="ta99-since">自 ${this.esc(since)} · <a href="javascript:void(0)" onclick="App.ta99Tab('anni')">改日子</a></div>`
      : `
        <div style="font-size:14px;font-weight:800;margin-top:14px">你们还没有记录在一起的日子</div>
        <button class="btn btn-primary" style="background:linear-gradient(90deg,#e11d48,#fb7185);border:0;margin-top:10px" onclick="App.ta99Tab('anni')">🎂 去设置</button>`}
      <div style="margin-top:10px"><a href="javascript:void(0)" style="font-size:11.5px;color:#94a3b8" onclick="App.ta99Refresh(true)">刷新Ta的近况 ↻</a></div>
    </div>
    <div class="wb-entry-grid">
      <div class="card wb-entry-card" onclick="App.ta99Tab('sign')">
        <div class="wb-ico">💞</div><div class="wb-name">情侣签到</div><div class="wb-hint">${this.esc(signSub)}</div>
      </div>
      <div class="card wb-entry-card" onclick="App.ta99Tab('moments')">
        <div class="wb-ico">🫧</div><div class="wb-name">Ta的近况</div><div class="wb-hint">打卡 · 经济 · 医疗</div>
      </div>
      <div class="card wb-entry-card" onclick="App.ta99Tab('anni')">
        <div class="wb-ico">🎂</div><div class="wb-name">纪念日</div><div class="wb-hint">${this.esc(anniSub)}</div>
      </div>
      <div class="card wb-entry-card" onclick="App.ta99Tab('todos')">
        <div class="wb-ico">📝</div><div class="wb-name">互相打卡</div><div class="wb-hint">我给Ta ${mineForTa} 件 · Ta给我 ${taForMe} 件</div>
      </div>
      <div class="card wb-entry-card${noteUnread ? ' ta99-pulse' : ''}" onclick="App.ta99Tab('notes')">
        <div class="wb-ico">💌</div><div class="wb-name">小纸条</div><div class="wb-hint">${this.esc(notesSub)}</div>
      </div>
      <div class="card wb-entry-card" onclick="App.ta99Tab('wishes')">
        <div class="wb-ico">🌠</div><div class="wb-name">心愿单</div><div class="wb-hint">${this.esc(wishesSub)}</div>
      </div>
      <div class="card wb-entry-card" onclick="App.ta99Tab('qa')">
        <div class="wb-ico">💬</div><div class="wb-name">每日一问</div><div class="wb-hint">${this.esc(qaSub)}</div>
      </div>
    </div>
    <div style="text-align:center;margin:16px 0 4px"><button class="btn btn-ghost btn-sm" onclick="App.ta99Leave()">解除绑定</button></div>`;
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
    });
    const s = ((this._ta99.row || {}).extra || {}).sign || {};
    const cur = s[Store.today()] || {};
    this._flash(cur.a && cur.b ? '💞 今天你们连心啦！' : '已签到——等Ta也签到后，今天就连心了');
  },

  // —— 子页：Ta的近况 / 我的近况 ——
  _ta99MomentsView(row, myPos) {
    const which = this._ta99.moments === 'me' ? 'me' : 'ta';
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
      <div style="font-size:11.5px;color:#94a3b8;line-height:1.7;margin-top:6px">打卡近 7 日 · 经济本月 · 医疗摘要——只共享克制的数据近况，明细留在各自的手机里。</div>
    </div>
    ${this._ta99ShareHtml(which === 'ta' ? taShare : myShare, which === 'ta')}`;
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
      <div class="ta99-share-note">🔒 HIV / HPV / TP 等健康隐私记录不参与共享，仍锁在各自的密码箱里</div>
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
        return `<div class="ta99-item">
          <span class="ta99-item-tx"><b>${this.esc(a.n || '')}</b><span style="color:#94a3b8"> · ${this.esc(a.d || '')}</span></span>
          <span class="ta99-item-side">${nd === 0 ? '<b style="color:#e11d48">就是今天 🎉</b>' : `还差 <b style="color:#e11d48">${nd}</b> 天`}</span>
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
