// 81-vault99.js —— v12.2 【密码箱】：秘密的安放处（记录板块）
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 每个用户的密码都不同：第一次点击密码箱时设置密码（两次输入，≥4 位）
//   · 我的秘密：自由存放心事、账号备忘、任何不想被看见的文字——未解锁时绝不显示
//   · 健康隐私分区：病历中有关 HIV / HPV / TP（梅毒）的记录与敏感复查项默认收在这里，
//     卡片从【就医数据】迁移至此（未解锁时只显示条数，不看内容）
//   · 复用旧密码体系：原健康敏感项解锁（密码 2004）全部改走密码箱密码——
//     老用户未设置密码箱密码前，旧密码 2004 仍然有效（首次进入密码箱时设置新密码即接管）
//   · 会话级解锁：解锁后 30 分钟内免输（关闭页面立即失效）；密码箱与健康敏感项同步解锁/上锁
//   · 密码哈希存储（djb2 双轮 + 随机盐）：防偷看不防专家——本地隐私层，非加密级
Object.assign(App, {
  _VAULT99_KEY: 'one-xing-vault-v1',
  _VAULT99_LEGACY_PWD: '2004', // v2.0.6 旧健康隐私密码（未设新密码前兼容）

  // ==================== 数据层 ====================
  _vault99Data() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(this._VAULT99_KEY) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};
    if (!Array.isArray(o.secrets)) o.secrets = [];
    if (typeof o.salt !== 'string' || !o.salt) o.salt = '';
    if (typeof o.pwdHash !== 'string') o.pwdHash = '';
    return o;
  },
  _vault99Save(o) {
    try { localStorage.setItem(this._VAULT99_KEY, JSON.stringify(o)); return true; } catch (e) { return false; }
  },
  _vault99HasPwd() { return !!this._vault99Data().pwdHash; },
  // djb2 双轮 + 盐（本地隐私层哈希，非加密级）
  _vault99Hash(pwd, salt) {
    let s = String(salt || '') + String(pwd == null ? '' : pwd);
    let h1 = 5381, h2 = 52711;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = ((h1 << 5) + h1 + c) >>> 0;
      h2 = ((h2 << 5) + h2 + c * (i + 7)) >>> 0;
    }
    return h1.toString(36) + '.' + h2.toString(36);
  },
  // 密码校验：已设密码箱密码 → 比对哈希；未设 → 兼容旧默认 2004（老用户平滑过渡）
  _vault99PwdOk(pwd) {
    pwd = String(pwd == null ? '' : pwd).trim();
    const o = this._vault99Data();
    if (o.pwdHash) {
      if (!pwd) return false;
      return this._vault99Hash(pwd, o.salt) === o.pwdHash;
    }
    return pwd === this._VAULT99_LEGACY_PWD;
  },
  // 会话级解锁（30 分钟；解锁密码箱 = 同步解锁健康敏感项）
  _vault99Unlocked() {
    try {
      const t = +(sessionStorage.getItem('vault_unlocked') || 0);
      return t > Date.now();
    } catch (e) { return false; }
  },
  _vault99MarkUnlocked() {
    const until = Date.now() + 30 * 60 * 1000;
    try { sessionStorage.setItem('vault_unlocked', String(until)); } catch (e) {}
    try { sessionStorage.setItem('hiv_unlocked', String(until)); } catch (e) {}
  },
  // 立即上锁（密码箱 + 健康敏感项一起锁）
  _vault99LockAll() {
    try { sessionStorage.removeItem('vault_unlocked'); } catch (e) {}
    try { sessionStorage.removeItem('hiv_unlocked'); } catch (e) {}
  },

  // ==================== 健康隐私分区数据（病历中 hiv/hpv/tp 的记录）====================
  _vault99SensRecords() {
    const d = Store.load();
    return (Array.isArray(d.medicalRecords) ? d.medicalRecords : [])
      .filter(r => r && this._healthSensMatch(`${r.disease || ''} ${(r.tags || []).join(' ')} ${(r.symptoms || []).join ? (r.symptoms || []).join(' ') : (r.symptoms || '')}`));
  },

  // ==================== 交互 ====================
  // 首次进入：设置密码（两次输入一致，≥4 位）
  vault99Setup() {
    const p1 = String((document.getElementById('v99Pwd1') || {}).value || '').trim();
    const p2 = String((document.getElementById('v99Pwd2') || {}).value || '').trim();
    if (p1.length < 4) return this._flash('密码至少 4 位——长一点的密码，守得更牢一点 🔐');
    if (p1 !== p2) return this._flash('两次输入的密码不一样——再核对一下');
    const o = this._vault99Data();
    o.salt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    o.pwdHash = this._vault99Hash(p1, o.salt);
    if (!o.createdAt) o.createdAt = new Date().toISOString();
    this._vault99Save(o);
    this._vault99MarkUnlocked();
    this._flash('🔐 密码箱已开启——这个密码也从今天起接管健康隐私解锁（旧密码 2004 作废）');
    this.render_workbench();
  },
  // 解锁
  vault99Unlock() {
    const pwd = String((document.getElementById('v99Pwd') || {}).value || '').trim();
    if (!this._vault99PwdOk(pwd)) return this._flash('密码不对——再想想（密码忘了可删除本地密码箱数据重设，但秘密会一起清空）');
    this._vault99MarkUnlocked();
    this._flash('🔓 密码箱已打开（30 分钟内免输，关闭页面自动上锁）');
    this.render_workbench();
  },
  // 立即上锁
  vault99Lock() {
    this._vault99LockAll();
    this._flash('🔒 已上锁——秘密回到黑暗里休息了');
    this.render_workbench();
  },
  // 修改密码（需已解锁）
  vault99ChangePwd() {
    const oldPwd = String((document.getElementById('v99OldPwd') || {}).value || '').trim();
    const p1 = String((document.getElementById('v99NewPwd1') || {}).value || '').trim();
    const p2 = String((document.getElementById('v99NewPwd2') || {}).value || '').trim();
    if (!this._vault99PwdOk(oldPwd)) return this._flash('旧密码不对——改不了');
    if (p1.length < 4) return this._flash('新密码至少 4 位');
    if (p1 !== p2) return this._flash('两次输入的新密码不一样');
    const o = this._vault99Data();
    o.salt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    o.pwdHash = this._vault99Hash(p1, o.salt);
    this._vault99Save(o);
    this._flash('🔐 密码已更换——旧密码从此作废');
    this.render_workbench();
  },
  // 添加秘密
  vault99Add() {
    const title = String((document.getElementById('v99Title') || {}).value || '').trim();
    const text = String((document.getElementById('v99Text') || {}).value || '').trim();
    if (!text) return this._flash('秘密的内容不能为空——哪怕只有一句话 🔐');
    if (text.length > 3000) return this._flash('这条秘密太长了（上限 3000 字）——分两条存吧');
    const o = this._vault99Data();
    o.secrets.unshift({
      id: 'vs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date: Store.today(), ts: new Date().toISOString(),
      title: title.slice(0, 60), text,
    });
    if (o.secrets.length > 200) o.secrets.length = 200;
    this._vault99Save(o);
    const ta = document.getElementById('v99Text'); if (ta) ta.value = '';
    const ti = document.getElementById('v99Title'); if (ti) ti.value = '';
    this._flash('🔐 秘密已锁进密码箱——只有解锁时才看得见');
    this.render_workbench();
  },
  vault99Del(id) {
    if (!confirm('确认删除这条秘密？（删了就找不回了）')) return;
    const o = this._vault99Data();
    o.secrets = o.secrets.filter(x => x.id !== id);
    this._vault99Save(o);
    this._flash('🗑️ 秘密已销毁');
    this.render_workbench();
  },

  // ==================== 页面 ====================
  _wbVault99(wb, W) {
    const hasPwd = this._vault99HasPwd();
    const unlocked = this._vault99Unlocked();

    // —— 首次进入：设置密码 ——
    if (!hasPwd) {
      return `<div class="card v99-hero">
        <div class="card-title"><span class="ico">🔐</span>密码箱 · 设置你的密码</div>
        <div class="v99-hero-sub">这是你的<b>私人密码箱</b>：心事、账号备忘、任何不想被看见的文字，都可以锁进来。病历中有关 <b>HIV / HPV / TP</b> 的健康隐私记录也默认收在这里。<br><b>每个用户的密码都不同——请设置你自己的密码</b>（至少 4 位；从此这个密码也接管原健康隐私解锁，旧密码作废）。密码只存在本机，忘了就只能清空密码箱重来。</div>
        <div class="ledger-form" style="margin-top:12px">
          <div class="field"><label>设置密码（≥4 位）</label><input type="password" class="input" id="v99Pwd1" placeholder="输入你想用的密码"></div>
          <div class="field"><label>再输入一次</label><input type="password" class="input" id="v99Pwd2" placeholder="再输一遍，确认没打错" onkeydown="if(event.key==='Enter')App.vault99Setup()"></div>
          <div class="btn-row"><button type="button" class="btn btn-primary" style="margin:0" onclick="App.vault99Setup()">🔐 开启密码箱</button></div>
        </div>
      </div>
      <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    }

    // —— 已设密码 · 未解锁：锁屏 ——
    if (!unlocked) {
      return `<div class="card v99-hero locked">
        <div class="card-title"><span class="ico">🔐</span>密码箱已上锁</div>
        <div class="v99-lock-ico">🔒</div>
        <div class="v99-hero-sub">里面锁着你的秘密与健康隐私（解锁后 30 分钟内免输，关闭页面自动上锁）。</div>
        <div class="ledger-form" style="margin-top:12px">
          <div class="field"><label>密码</label><input type="password" class="input" id="v99Pwd" placeholder="输入密码解锁" onkeydown="if(event.key==='Enter')App.vault99Unlock()"></div>
          <div class="btn-row"><button type="button" class="btn btn-primary" style="margin:0" onclick="App.vault99Unlock()">🔓 解锁</button></div>
        </div>
      </div>
      <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    }

    // —— 已解锁：主界面 ——
    const o = this._vault99Data();
    const sens = this._vault99SensRecords();
    const sensByKind = { hiv: [], hpv: [], tp: [] };
    sens.forEach(r => {
      const key = (r.tags || []).find(t => ['hiv', 'hpv', 'tp'].includes(t)) || (this._healthSensMatch(r.disease + '') ? (/[hpv]/i.test(r.disease) ? 'hpv' : (/梅毒|tp/i.test(r.disease) ? 'tp' : 'hiv')) : null);
      if (key && sensByKind[key]) sensByKind[key].push(r);
    });
    const checkup = this._getCheckup ? this._getCheckup() : { name: '', date: '' };
    const sensCheckup = this._healthSensMatch(checkup.name || '') ? checkup : null;
    const KIND = { hiv: { n: 'HIV', ico: '🛡️' }, hpv: { n: 'HPV', ico: '🌸' }, tp: { n: '梅毒TP', ico: '🔬' } };

    let html = `<div class="card v99-hero">
      <div class="card-title"><span class="ico">🔐</span>密码箱 · 已解锁
        <span class="sub">30 分钟无操作自动上锁 · <button type="button" class="v99-lockbtn" onclick="App.vault99Lock()">🔒 立即上锁</button></span>
      </div>
      <div class="v99-stats">
        <span>🔐 秘密 <b>${o.secrets.length}</b> 条</span>
        <span>🩺 健康隐私 <b>${sens.length}</b> 条</span>
        ${sensCheckup ? '<span>📋 敏感复查项 <b>1</b> 项</span>' : ''}
      </div>
    </div>`;

    // —— 我的秘密 ——
    html += `<div class="ledger-form">
      <div class="card-title" style="padding:0;margin:0 0 12px"><span class="ico">🗝️</span>存一条秘密</div>
      <div class="field"><label>标题（可不填）</label><input class="input" id="v99Title" placeholder="给这条秘密起个只有你懂的名字"></div>
      <div class="field"><label>内容</label><textarea id="v99Text" class="textarea" style="min-height:90px" placeholder="写下来，锁进去——从今往后它只属于这个箱子"></textarea></div>
      <div class="btn-row"><button type="button" class="btn btn-primary" style="margin:0" onclick="App.vault99Add()">🔐 锁进密码箱</button></div>
    </div>`;

    html += `<div class="section-label">我的秘密 (${o.secrets.length})</div>`;
    if (!o.secrets.length) {
      html += `<div class="empty">密码箱还空着——有些话，锁进来比烂在心里舒服。</div>`;
    }
    o.secrets.forEach(s => {
      html += `<div class="v99-item">
        <div class="v99-item-head">
          <span class="v99-when">${this.esc(s.date || '')}</span>
          <span class="v99-ops"><button title="销毁这条秘密" onclick="App.vault99Del('${s.id}')">🗑️</button></span>
        </div>
        ${s.title ? `<div class="v99-item-title">${this.esc(s.title)}</div>` : ''}
        <div class="v99-item-text">${this.esc(s.text)}</div>
      </div>`;
    });

    // —— 健康隐私（自【就医数据】感染科迁入）——
    html += `<div class="section-label">🩺 健康隐私（自就医数据迁入 · ${sens.length} 条）</div>`;
    if (!sens.length && !sensCheckup) {
      html += `<div class="empty">暂无 HIV / HPV / TP 相关记录——【就医数据】里出现这类病历时，会自动收进这里（未解锁时谁也看不见）。</div>`;
    } else {
      html += `<div class="v99-sens-note">病历中有关 HIV / HPV / TP 的记录卡片已从【就医数据】迁到这里统一看管；新增/编辑仍在就医数据页进行（${this._vault99HasPwd() && this._vault99Unlocked() ? '已解锁 · 去就 <button type="button" class="v99-link" onclick="App.gotoWb(\'illness99\')">就医数据</button>' : ''}）。</div>`;
      ['hiv', 'hpv', 'tp'].forEach(k => {
        const list = sensByKind[k];
        html += `<div class="v99-sens-kind">${KIND[k].ico} ${KIND[k].n} · ${list.length} 条</div>`;
        if (!list.length) { html += `<div class="v99-sens-empty">暂无记录</div>`; return; }
        list.slice().reverse().forEach(r => {
          const sym = Array.isArray(r.symptoms) ? r.symptoms.join('、') : (r.symptoms || '');
          html += `<div class="v99-sens-card">
            <div class="v99-item-head"><b>${this.esc(r.date || '?')}</b><span class="v99-tag">程度 ${r.severity || '-'}/5</span></div>
            <div class="v99-sens-line">${this.esc((r.onsetDate ? '始于 ' + r.onsetDate + ' · ' : '') + (sym || r.note || '记录') + (r.hospital ? ' · 就诊：' + r.hospital : '') + (r.treatment ? ' · 治疗：' + r.treatment : '') + (r.medicines && r.medicines.length ? ' · 用药：' + r.medicines.join('/') : ''))}</div>
          </div>`;
        });
      });
      if (sensCheckup) {
        html += `<div class="v99-sens-kind">📋 敏感复查项</div>
        <div class="v99-sens-card"><div class="v99-item-head"><b>${this.esc(sensCheckup.name || '隐私复查项')}</b>${sensCheckup.date ? `<span class="v99-tag">复查 ${this.esc(sensCheckup.date)}</span>` : ''}</div></div>`;
      }
    }

    // —— 修改密码 ——
    html += `<details class="v99-chg"><summary>🔑 修改密码</summary>
      <div class="ledger-form" style="margin-top:10px">
        <div class="field"><label>旧密码</label><input type="password" class="input" id="v99OldPwd" placeholder="当前密码"></div>
        <div class="field"><label>新密码（≥4 位）</label><input type="password" class="input" id="v99NewPwd1" placeholder="新密码"></div>
        <div class="field"><label>再输入一次新密码</label><input type="password" class="input" id="v99NewPwd2" placeholder="再输一遍" onkeydown="if(event.key==='Enter')App.vault99ChangePwd()"></div>
        <div class="btn-row"><button type="button" class="btn btn-ghost" style="margin:0" onclick="App.vault99ChangePwd()">🔑 确认修改</button></div>
      </div>
    </details>`;

    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
});
