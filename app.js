/* ==========================================================================
   GLASS Quant Terminal · Public Frontend Client
   Zero backend/crawler internals; switches cleanly between Demo Mode and API Mode
   ========================================================================== */

const CFG = Object.assign({ apiBase: '', demoMode: false }, window.GLASS_CONFIG || {})
const $ = (id) => document.getElementById(id)
const el = (tag, cls, text) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text !== undefined && text !== null) n.textContent = text
  return n
}

let currentUser = null
const state = {
  tab: 'bargains',
  mappings: {},
  source: '',
  game: '',
  keyword: '',
  minPrice: '',
  maxPrice: '',
  sort: '',
  favoritesOnly: false,
  page: 1,
  size: 20,
}

const bargainState = { game: '', minPrice: 150, includeRisky: false, sortBy: 'composite' }
const bargainCache = new Map()
let bargainAbort = null
const gamePage = { game: '' }
const charts = {}

const ROLE_BADGE_TEXT = { admin: 'ADMIN', vip: 'VIP', member: 'MEMBER' }
const GAME_DOT_COLORS = {
  '绝区零': '#e5b96f',
  '鸣潮': '#38bdf8',
  '三角洲行动': '#2ee59d',
  '三国杀移动版': '#fb7185',
  '逆水寒手游': '#a78bfa',
}

/* ---------------- Unified API Transport ---------------- */
async function apiFetch(path, init = {}) {
  if (CFG.demoMode && typeof window.GLASS_MOCK_API === 'function') {
    return window.GLASS_MOCK_API(path, init)
  }
  const base = (CFG.apiBase || '').replace(/\/$/, '')
  const opts = Object.assign({ credentials: base ? 'include' : 'same-origin' }, init)
  const res = await fetch(base + path, opts)
  if (res.status === 401 && currentUser !== null && !path.startsWith('/api/auth/')) {
    handleSessionExpired()
  }
  return res
}

function isVipOrAdmin() {
  return Boolean(currentUser && (currentUser.role === 'vip' || currentUser.role === 'admin'))
}
function isAdminUser() {
  return Boolean(currentUser && currentUser.role === 'admin')
}
function fmtMoney(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return '¥' + Math.round(Number(v)).toLocaleString()
}
function fmtSignedMoney(v) {
  const n = Math.round(Number(v || 0))
  if (n > 0) return '+¥' + n.toLocaleString()
  if (n < 0) return '-¥' + Math.abs(n).toLocaleString()
  return '¥0'
}
function td(text, cls) {
  return el('td', cls, text === undefined || text === null ? '—' : String(text))
}

let mappingsPromise = null
async function ensureMappings() {
  if (Object.keys(state.mappings.games || {}).length) return state.mappings
  if (!mappingsPromise) {
    mappingsPromise = apiFetch('/api/mappings')
      .then((r) => r.json())
      .then((m) => {
        state.mappings = m || {}
        renderAccountFilterOptions()
        return state.mappings
      })
      .finally(() => { mappingsPromise = null })
  }
  return mappingsPromise
}

function availableGames() {
  const keys = Object.keys(state.mappings.games || {})
  return keys.length ? keys : ['绝区零', '鸣潮', '三国杀移动版', '三角洲行动', '逆水寒手游']
}

/* ---------------- Auth Gate & Role Control ---------------- */
function canAccessTab(tab) {
  if (!currentUser) return false
  if (tab === 'admin') return currentUser.role === 'admin'
  if (tab === 'game') return isVipOrAdmin()
  return true
}

function applyRoleUi(user) {
  for (const btn of document.querySelectorAll('#tabs button')) {
    btn.style.display = canAccessTab(btn.dataset.tab) ? '' : 'none'
  }
  $('nav-username').textContent = user.display_name || user.username
  const badge = $('nav-role-badge')
  badge.className = 'role-badge ' + (user.role || 'member')
  badge.textContent = ROLE_BADGE_TEXT[user.role] || 'MEMBER'
  $('bargain-tab-badge').textContent = isVipOrAdmin() ? 'TOP20' : 'TOP5'
  $('url-analyzer-box').hidden = !isVipOrAdmin()
  if ($('nav-demo-pill')) $('nav-demo-pill').hidden = !CFG.demoMode
}

function setFormErr(id, msg) {
  const box = $(id)
  if (!box) return
  box.hidden = !msg
  box.textContent = msg || ''
}

function switchAuthMode(mode) {
  const isReg = mode === 'register'
  for (const b of document.querySelectorAll('#auth-tabs button')) {
    b.classList.toggle('active', b.dataset.mode === mode)
  }
  $('auth-login-form').hidden = isReg
  $('auth-register-form').hidden = !isReg
  setFormErr('login-err', '')
  setFormErr('reg-err', '')
}

async function showAuthGate(hintMsg = '') {
  $('app-nav').hidden = true
  $('app-main').hidden = true
  $('auth-gate').hidden = false
  $('auth-demo-box').hidden = !CFG.demoMode
  let needsBootstrap = false
  try {
    const st = await apiFetch('/api/auth/status').then((r) => r.json())
    needsBootstrap = Boolean(st && st.needs_bootstrap)
  } catch (e) {}
  $('auth-bootstrap-box').hidden = !needsBootstrap
  $('auth-normal-box').hidden = needsBootstrap
  if (!needsBootstrap) {
    const inv = new URLSearchParams(window.location.search).get('invite')
    if (inv) {
      switchAuthMode('register')
      $('reg-invite').value = inv.trim().toUpperCase()
    } else {
      switchAuthMode('login')
    }
    if (hintMsg) setFormErr('login-err', hintMsg)
  }
}

function handleSessionExpired() {
  currentUser = null
  state.mappings = {}
  bargainCache.clear()
  showAuthGate('登录状态已失效，请重新登录')
}

function enterAppWithUser(user) {
  currentUser = user
  $('auth-gate').hidden = true
  $('app-nav').hidden = false
  $('app-main').hidden = false
  applyRoleUi(user)
  const cleanUrl = new URL(window.location.href)
  if (cleanUrl.searchParams.has('invite')) {
    cleanUrl.searchParams.delete('invite')
    window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash)
  }
  switchTab('bargains')
  ensureMappings()
}

/* ---------------- Navigation ---------------- */
function switchTab(name) {
  if (currentUser && !canAccessTab(name)) name = 'bargains'
  state.tab = name
  const shown = name === 'favorites' ? 'accounts' : name
  for (const view of ['bargains', 'accounts', 'game', 'admin']) {
    const node = $('view-' + view)
    if (node) node.style.display = view === shown ? '' : 'none'
  }
  for (const btn of document.querySelectorAll('#tabs button')) {
    const active = btn.dataset.tab === name
    btn.classList.toggle('active', active)
    if (active) btn.setAttribute('aria-current', 'page')
    else btn.removeAttribute('aria-current')
  }
  if (name === 'bargains') loadBargainsPage()
  if (name === 'accounts' || name === 'favorites') {
    state.favoritesOnly = name === 'favorites'
    $('accounts-heading').textContent = state.favoritesOnly ? '个人收藏' : '账号探索'
    state.page = 1
    ensureMappings().then(() => searchAccounts())
  }
  if (name === 'game') ensureMappings().then(() => loadGamePage())
  if (name === 'admin') loadAdminPage()
}

/* ---------------- Visual Gauge & Value Decomposition Modal ---------------- */
function buildGauge(item) {
  const wrap = el('div', 'gauge')
  const lo = Math.min(item.price, item.fair_p25) * 0.88
  const hi = Math.max(item.fair_p75, item.price) * 1.08
  const span = Math.max(hi - lo, 1)
  const pct = (val) => Math.max(2, Math.min(98, ((val - lo) / span) * 100))

  const track = el('div', 'gauge-track')
  const band = el('div', 'gauge-band')
  const left = pct(item.fair_p25)
  const right = pct(item.fair_p75)
  band.style.left = left + '%'
  band.style.width = Math.max(4, right - left) + '%'
  track.appendChild(band)

  const p50 = el('div', 'gauge-p50')
  p50.style.left = pct(item.fair_p50) + '%'
  p50.title = '去偏公允价 ' + fmtMoney(item.fair_p50)
  track.appendChild(p50)

  const marker = el('div', 'gauge-marker')
  marker.style.left = pct(item.price) + '%'
  marker.title = '当前买入价 ' + fmtMoney(item.price)
  track.appendChild(marker)

  const labels = el('div', 'gauge-labels')
  labels.append(
    el('span', '', 'P25 ' + fmtMoney(item.fair_p25)),
    el('span', '', 'P50 ' + fmtMoney(item.fair_p50)),
    el('span', '', 'P75 ' + fmtMoney(item.fair_p75)),
  )
  wrap.append(track, labels)
  return wrap
}

function makeExplainBtn(accountId) {
  const vip = isVipOrAdmin()
  const btn = el('button', 'btn-explain', vip ? '⚡ 价值拆解' : '🔒 VIP 拆解')
  btn.type = 'button'
  btn.onclick = (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    if (!vip) {
      $('val-modal').hidden = false
      $('val-loading').style.display = 'none'
      $('val-body').style.display = 'none'
      $('val-eyebrow').textContent = 'VIP FEATURE REQUIRED'
      $('val-title').textContent = '单账号详细价值拆解 · VIP 专享'
      $('val-engine').textContent = '需 VIP 权限'
      const errBox = $('val-error')
      errBox.textContent = '当前角色为「普通成员」。查看分模块价值瀑布与核心角色边际身价需要 VIP 会员或管理员权限。'
      errBox.style.display = ''
      return
    }
    openValuationModal(accountId)
  }
  return btn
}

function renderValuationModalData(data, elapsedMs) {
  $('val-loading').style.display = 'none'
  $('val-error').style.display = 'none'
  const elapsedStr = elapsedMs != null ? (' · ' + Math.max(1, Math.round(elapsedMs)) + 'ms') : ''
  $('val-eyebrow').textContent = (data.game || '') + ' · ' + (data.source_name || data.source || '') + ' · #' + data.account_id + elapsedStr
  $('val-title').textContent = data.title || ('账号 #' + data.account_id)
  $('val-engine').textContent = (data.engine || 'onnx_cqr').toUpperCase()
  const link = $('val-link')
  link.href = data.url || '#'
  link.textContent = '前往' + (data.source_name || '原商品页') + ' ↗'

  const summary = $('val-summary')
  summary.innerHTML = ''
  const addKpi = (label, value, sub, cls) => {
    const box = el('div', 'val-kpi')
    box.append(el('div', 'stat-label', label), el('div', 'stat-value mono ' + (cls || ''), value), el('div', 'stat-sub', sub || ''))
    summary.appendChild(box)
  }

  const upsideStr = data.upside_pct != null ? ('账面升值 ' + (data.upside_pct >= 0 ? '+' : '') + Math.round(data.upside_pct) + '%') : '无标价'
  const ratioStr = data.value_ratio != null ? ' · 估/买 ' + Number(data.value_ratio).toFixed(2) + 'x' : ''
  addKpi('当前买入价', fmtMoney(data.price), upsideStr + ratioStr, '')

  const debias = Number(data.debiased_delta || 0)
  addKpi('公允出手价 P50', fmtMoney(data.fair_p50), '挂牌估价 ' + fmtMoney(data.list_p50) + (debias !== 0 ? '（去偏 ' + fmtSignedMoney(debias) + '）' : ''), 'text-gold')

  const netProfit = Number(data.net_profit ?? 0)
  const roiPct = data.roi_pct != null ? ((data.roi_pct >= 0 ? '+' : '') + Math.round(data.roi_pct) + '%') : '—'
  const safeProfit = data.safe_profit != null ? fmtSignedMoney(data.safe_profit) : '—'
  addKpi(netProfit >= 0 ? '预计转手净赚' : '预计转手亏损', fmtSignedMoney(netProfit), '扣8%手续费 · 净ROI ' + roiPct + ' · P25急出 ' + safeProfit, netProfit >= 0 ? 'text-jade' : 'text-red')

  const riskFlags = data.risk_flags || []
  addKpi(
    '套利信号',
    data.is_bargain ? 'P25 急出稳赚' : (riskFlags.length ? '含风险项' : (netProfit > 0 ? '正收益空间' : '无盈利空间')),
    riskFlags.length ? ('风险：' + riskFlags.join(' / ')) : ('区间 ' + fmtMoney(data.fair_p25) + ' ~ ' + fmtMoney(data.fair_p75)),
    data.is_bargain ? 'text-jade' : (riskFlags.length ? 'text-red' : (netProfit > 0 ? 'text-cyan' : '')),
  )

  const gaugeBox = $('val-gauge')
  gaugeBox.innerHTML = ''
  if (data.price != null && data.fair_p25 != null && data.fair_p75 != null) gaugeBox.appendChild(buildGauge(data))
  const risksRow = el('div', 'val-risks')
  if (riskFlags.length) {
    for (const rf of riskFlags) risksRow.appendChild(el('span', 'pill red', '⚠ ' + rf))
  } else {
    risksRow.appendChild(el('span', 'pill blue', '✓ 安全属性正常'))
  }
  if (data.score != null) risksRow.appendChild(el('span', 'pill gold mono', '性价比评分 ' + data.score))
  gaugeBox.appendChild(risksRow)

  const comps = data.components || []
  $('val-wf-total').textContent = '合计 ' + fmtMoney(data.fair_p50)
  const wfBox = $('val-components')
  wfBox.innerHTML = ''
  const maxAbs = Math.max(1, ...comps.map((c) => Math.abs(Number(c.amount || 0))))
  for (const c of comps) {
    const amt = Number(c.amount || 0)
    const isBase = c.key === 'base' || c.category === 'base'
    const tone = isBase ? 'base' : (amt < 0 ? 'neg' : 'pos')
    const row = el('div', 'wf-row')
    const meta = el('div', 'wf-meta')
    meta.append(el('div', 'wf-label', c.label || c.key), el('div', 'wf-detail', c.detail || ''))
    const barWrap = el('div', 'wf-bar-wrap')
    const bar = el('div', 'wf-bar ' + tone)
    bar.style.width = Math.max(3, Math.min(100, (Math.abs(amt) / maxAbs) * 100)) + '%'
    barWrap.appendChild(bar)
    const val = el('div', 'wf-val ' + tone)
    val.append(document.createTextNode(isBase ? fmtMoney(amt) : fmtSignedMoney(amt)), el('span', 'wf-pct', Number(c.pct || 0).toFixed(1) + '%'))
    row.append(meta, barWrap, val)
    wfBox.appendChild(row)
  }

  const chars = data.characters || []
  const charSection = $('val-chars-section')
  const charBox = $('val-chars')
  charBox.innerHTML = ''
  if (chars.length) {
    charSection.style.display = ''
    const maxChar = Math.max(1, ...chars.map((x) => Math.abs(Number(x.amount || 0))))
    for (const ch of chars) {
      const amt = Number(ch.amount || 0)
      const isVh = ch.tier === '虚狩' || ch.tier === '核心'
      const card = el('div', 'char-card' + (isVh ? ' tier-vh' : ''))
      const top = el('div', 'char-card-top')
      top.append(el('span', 'char-name', ch.name || '—'), el('span', isVh ? 'pill gold' : (ch.tier === '核心拐' ? 'pill blue' : 'pill'), ch.tier || '限定'))
      card.appendChild(top)
      if (ch.spec) card.appendChild(el('div', 'char-spec', ch.spec))
      const amtEl = el('div', 'char-amt' + (amt < 0 ? ' neg' : ''), fmtSignedMoney(amt))
      amtEl.appendChild(el('span', 'char-pct', Number(ch.pct || 0).toFixed(1) + '%'))
      card.appendChild(amtEl)
      const bar = el('div', 'char-bar')
      bar.style.width = Math.max(6, Math.min(100, (Math.abs(amt) / maxChar) * 100)) + '%'
      card.appendChild(bar)
      charBox.appendChild(card)
    }
  } else {
    charSection.style.display = 'none'
  }
  $('val-body').style.display = ''
}

async function openValuationModal(accountId) {
  const modal = $('val-modal')
  modal.hidden = false
  $('val-loading').style.display = ''
  $('val-error').style.display = 'none'
  $('val-body').style.display = 'none'
  $('val-eyebrow').textContent = 'QUANTITATIVE DECOMPOSITION · #' + accountId
  $('val-title').textContent = '正在拆解账号价值构成…'
  $('val-engine').textContent = '计算中'
  const t0 = performance.now()
  try {
    const resp = await apiFetch('/api/accounts/' + encodeURIComponent(accountId) + '/valuation')
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.detail || ('HTTP ' + resp.status))
    renderValuationModalData(data, performance.now() - t0)
  } catch (e) {
    $('val-loading').style.display = 'none'
    $('val-title').textContent = '无法拆解该账号'
    $('val-engine').textContent = '提示'
    $('val-error').textContent = e.message || '暂无估值数据'
    $('val-error').style.display = ''
  }
}

/* ---------------- TOP 20 Bargain Profit Radar ---------------- */
function makeFavBtn(item, onChanged) {
  const star = el('span', 'fav' + (item.favorite ? ' on' : ''), item.favorite ? '★' : '☆')
  star.title = item.favorite ? '取消收藏' : '收藏'
  star.onclick = async (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    await apiFetch('/api/favorites/' + item.id, { method: item.favorite ? 'DELETE' : 'POST' })
    item.favorite = !item.favorite
    star.classList.toggle('on', item.favorite)
    star.textContent = item.favorite ? '★' : '☆'
    bargainCache.clear()
    if (onChanged) onChanged()
  }
  return star
}

function renderBargainGames() {
  const box = $('bargain-games')
  box.innerHTML = ''
  const games = availableGames()
  if (!bargainState.game || !games.includes(bargainState.game)) bargainState.game = games[0]
  for (const name of games) {
    const btn = el('button', 'game-tab' + (bargainState.game === name ? ' active' : ''))
    btn.type = 'button'
    const dot = el('span', 'game-dot')
    dot.style.background = GAME_DOT_COLORS[name] || '#e5b96f'
    dot.style.color = GAME_DOT_COLORS[name] || '#e5b96f'
    btn.append(dot, document.createTextNode(name))
    btn.onclick = () => {
      bargainState.game = name
      renderBargainGames()
      fetchBargains()
    }
    box.appendChild(btn)
  }
}

function renderPodiumCard(item) {
  const card = el('a', 'podium-card rank-' + item.rank)
  card.href = item.url || '#'
  if (!CFG.demoMode) { card.target = '_blank'; card.rel = 'noopener' }
  else card.onclick = (e) => { e.preventDefault(); if (isVipOrAdmin()) openValuationModal(item.id) }

  const netProfit = Number(item.net_profit ?? 0)
  const grossProfit = Number(item.gross_profit ?? 0)
  const roiPct = Number(item.roi_pct ?? 0)
  const safeProfit = Number(item.safe_profit ?? 0)

  const head = el('div', 'podium-head')
  head.appendChild(el('span', 'rank-medal', 'NO.0' + item.rank + ' · ' + (item.source_name || item.source)))
  const rightHead = el('div', 'btn-row')
  rightHead.appendChild(el('span', 'discount-badge', '净赚 ' + fmtSignedMoney(netProfit) + ' · ' + (roiPct >= 0 ? '+' : '') + Math.round(roiPct) + '% ROI'))
  rightHead.appendChild(makeFavBtn(item))
  head.appendChild(rightHead)

  const pricing = el('div', 'podium-pricing')
  pricing.appendChild(el('div', 'podium-price', fmtMoney(item.price)))
  const fair = el('div', 'podium-fair')
  fair.append(el('strong', '', '预计净赚 ' + fmtSignedMoney(netProfit)), document.createTextNode('估出 ' + fmtMoney(item.fair_p50) + ' · 升值 ' + fmtSignedMoney(grossProfit)))
  pricing.appendChild(fair)

  const tags = el('div', 'acct-meta')
  if (safeProfit > 0) tags.appendChild(el('span', 'pill green mono', '✓ P25急出稳赚 ' + fmtSignedMoney(safeProfit)))
  for (const h of (item.highlights || []).slice(0, 5)) {
    const cls = h.includes('虚狩') || h.includes('满命') || h.includes('天赏') || h.includes('典藏') ? 'pill gold' : 'pill green'
    tags.appendChild(el('span', cls, h))
  }
  if (item.risk_flags && item.risk_flags.length) {
    for (const rf of item.risk_flags) tags.appendChild(el('span', 'pill red', '⚠ ' + rf))
  } else {
    tags.appendChild(el('span', 'pill blue', '✓ 无已知高危'))
  }

  const foot = el('div', 'podium-foot')
  foot.appendChild(el('span', 'faint mono', (item.first_seen_at || '').slice(5, 16)))
  const footActions = el('div', 'podium-foot-actions')
  footActions.append(makeExplainBtn(item.id), el('span', 'cta-link', (item.source_name || '平台') + ' ↗'))
  foot.appendChild(footActions)

  card.append(head, pricing, buildGauge(item), el('div', 'podium-title', item.title), tags, foot)
  return card
}

function renderBargainRow(item) {
  const row = el('a', 'bargain-row' + (item.is_bargain ? ' is-strong' : ''))
  row.href = item.url || '#'
  if (!CFG.demoMode) { row.target = '_blank'; row.rel = 'noopener' }
  else row.onclick = (e) => { e.preventDefault(); if (isVipOrAdmin()) openValuationModal(item.id) }

  const netProfit = Number(item.net_profit ?? 0)
  const grossProfit = Number(item.gross_profit ?? 0)
  const roiPct = Number(item.roi_pct ?? 0)
  const safeProfit = Number(item.safe_profit ?? 0)

  row.appendChild(el('div', 'rank-num', '#' + String(item.rank).padStart(2, '0')))
  const body = el('div', 'bargain-row-body')
  body.appendChild(el('div', 'bargain-row-title', item.title))
  const meta = el('div', 'acct-meta')
  meta.appendChild(el('span', 'pill blue', item.source_name || item.source))
  if (safeProfit > 0) meta.appendChild(el('span', 'pill green mono', 'P25稳赚 ' + fmtSignedMoney(safeProfit)))
  for (const h of (item.highlights || []).slice(0, 5)) meta.appendChild(el('span', 'pill', h))
  for (const rf of (item.risk_flags || [])) meta.appendChild(el('span', 'pill red', '⚠ ' + rf))
  body.appendChild(meta)

  const side = el('div', 'bargain-row-side')
  const priceLine = el('div', 'bargain-row-price')
  priceLine.append(makeFavBtn(item), document.createTextNode(fmtMoney(item.price)))
  side.append(
    priceLine,
    el('span', 'pill ' + (netProfit > 0 ? 'green' : 'red') + ' mono', '净赚 ' + fmtSignedMoney(netProfit) + ' · ' + (roiPct >= 0 ? '+' : '') + Math.round(roiPct) + '%'),
    el('div', 'bargain-row-sub', '估出 ' + fmtMoney(item.fair_p50) + ' · 升值 ' + fmtSignedMoney(grossProfit)),
    makeExplainBtn(item.id),
  )
  row.append(body, side)
  return row
}

function renderBargainPayload(data, elapsedText) {
  const podium = $('bargain-podium')
  const deck = $('bargain-list')
  const empty = $('bargain-empty')
  const items = data.items || []
  podium.innerHTML = ''
  deck.innerHTML = ''
  empty.style.display = 'none'

  $('bargain-engine-badge').textContent = data.model_note || data.engine || '估值引擎'
  $('bargain-pool-info').textContent = '扫描 ' + (data.sample_pool || 0) + ' 条有效详情 · 展示 TOP ' + items.length + ' · ' + elapsedText

  if (!items.length) {
    $('bk-max-save').textContent = '—'
    $('bk-top-ratio').textContent = '—'
    $('bk-strong-cnt').textContent = '0'
    $('bk-pool').textContent = String(data.sample_pool || 0)
    empty.style.display = ''
    $('bargain-vip-lock').hidden = true
    return
  }

  const maxNet = Math.max(...items.map((x) => Number(x.net_profit ?? 0)))
  const strongCnt = items.filter((x) => x.is_bargain).length
  const topRoi = Number(items[0].roi_pct ?? 0)
  $('bk-max-save').textContent = fmtSignedMoney(maxNet)
  $('bk-top-ratio').textContent = (topRoi >= 0 ? '+' : '') + Math.round(topRoi) + '%'
  $('bk-top-sub').textContent = '买入 ' + fmtMoney(items[0].price) + ' → 估出 ' + fmtMoney(items[0].fair_p50)
  $('bk-strong-cnt').textContent = strongCnt + ' / ' + items.length
  $('bk-pool').textContent = Number(data.sample_pool || 0).toLocaleString()

  for (const it of items.slice(0, 3)) podium.appendChild(renderPodiumCard(it))
  for (const it of items.slice(3)) deck.appendChild(renderBargainRow(it))

  const locked = Number(data.locked_count || 0)
  if (!isVipOrAdmin() && (locked > 0 || data.preview_limit)) {
    $('vip-lock-title').textContent = locked > 0 ? ('还有 ' + locked + ' 个高盈利捡漏顺位已锁定（普通成员仅限 TOP 5 预览）') : '普通成员当前为 TOP 5 预览权限'
    $('bargain-vip-lock').hidden = false
  } else {
    $('bargain-vip-lock').hidden = true
  }
}

async function fetchBargains(forceRefresh = false) {
  if (!bargainState.game) return
  const key = [bargainState.game, bargainState.minPrice, bargainState.includeRisky, bargainState.sortBy, currentUser ? currentUser.role : ''].join('|')
  if (forceRefresh) bargainCache.clear()
  else {
    const hit = bargainCache.get(key)
    if (hit && Date.now() - hit.ts < 60000) {
      renderBargainPayload(hit.data, '本地缓存 0ms')
      return
    }
  }
  if (bargainAbort) { try { bargainAbort.abort() } catch (e) {} }
  const ctrl = new AbortController()
  bargainAbort = ctrl
  $('bargain-loading').style.display = 'grid'
  const t0 = performance.now()
  try {
    const params = new URLSearchParams({
      limit: '20',
      min_price: String(bargainState.minPrice),
      include_risky: bargainState.includeRisky ? 'true' : 'false',
      sort_by: bargainState.sortBy,
    })
    if (forceRefresh) params.set('refresh', 'true')
    const resp = await apiFetch('/api/games/' + encodeURIComponent(bargainState.game) + '/bargains?' + params, { signal: ctrl.signal })
    const data = await resp.json()
    if (ctrl.signal.aborted) return
    const ms = Math.max(1, Math.round(performance.now() - t0))
    bargainCache.set(key, { ts: Date.now(), data })
    renderBargainPayload(data, ms + 'ms')
  } catch (e) {
    if (e.name === 'AbortError') return
    $('bargain-empty').textContent = '加载失败：' + e.message
    $('bargain-empty').style.display = ''
  } finally {
    if (bargainAbort === ctrl) $('bargain-loading').style.display = 'none'
  }
}

async function loadBargainsPage() {
  await ensureMappings()
  renderBargainGames()
  await fetchBargains()
}

/* ---------------- On-Demand URL Analyzer ---------------- */
async function analyzeProductUrl() {
  const input = $('analyze-url-input')
  const btn = $('btn-analyze-url')
  const status = $('analyze-url-status')
  const rawUrl = (input.value || '').trim()
  if (!rawUrl) {
    status.hidden = false
    status.className = 'url-analyzer-status err'
    status.textContent = '请粘贴商品详情页链接（Demo 模式可输入任意 https://example.com/item/1 体验）'
    return
  }
  btn.disabled = true
  btn.textContent = '分析中…'
  status.hidden = false
  status.className = 'url-analyzer-status faint'
  status.textContent = '正在识别平台、抓取详情并计算去偏公允价与盈利空间…'
  try {
    const resp = await apiFetch('/api/analyze-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rawUrl }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.detail || ('HTTP ' + resp.status))
    bargainCache.clear()
    status.className = 'url-analyzer-status ok'
    if (data.valuation) {
      const v = data.valuation
      status.textContent = '已分析入库 · ' + data.source_name + ' · ' + data.game_name + ' · 买 ' + fmtMoney(v.price) + ' / 估出 ' + fmtMoney(v.fair_p50) + ' / 预计净赚 ' + fmtSignedMoney(v.net_profit) + ' · ' + Math.round(data.elapsed_ms) + 'ms'
      $('val-modal').hidden = false
      renderValuationModalData(v, data.elapsed_ms)
    } else {
      status.textContent = '已入库 · ' + data.game_name + ' · ' + (data.valuation_note || '暂无估值模型')
    }
  } catch (e) {
    status.className = 'url-analyzer-status err'
    status.textContent = '分析失败：' + (e.message || '请检查链接')
  } finally {
    btn.disabled = false
    btn.textContent = '⚡ 立即分析'
  }
}

/* ---------------- Account Explorer ---------------- */
function renderAccountFilterOptions() {
  const sel = $('f-source')
  if (sel) {
    sel.innerHTML = '<option value="">全部</option>'
    for (const [k, label] of Object.entries(state.mappings.sources || {})) {
      const opt = document.createElement('option')
      opt.value = k
      opt.textContent = label
      sel.appendChild(opt)
    }
  }
  const chips = $('game-chips')
  if (chips) {
    chips.innerHTML = ''
    for (const name of availableGames()) {
      const btn = el('button', 'chip' + (state.game === name ? ' active' : ''), name)
      btn.type = 'button'
      btn.onclick = () => {
        state.game = state.game === name ? '' : name
        state.page = 1
        renderAccountFilterOptions()
        searchAccounts()
      }
      chips.appendChild(btn)
    }
  }
}

async function searchAccounts() {
  $('acct-loading').style.display = ''
  const params = new URLSearchParams({ page: String(state.page), size: String(state.size) })
  if (state.source) params.set('source', state.source)
  if (state.game) params.set('game_name', state.game)
  if (state.keyword) params.set('keyword', state.keyword)
  if (state.minPrice !== '') params.set('min_price', state.minPrice)
  if (state.maxPrice !== '') params.set('max_price', state.maxPrice)
  if (state.sort) params.set('sort', state.sort)
  if (state.favoritesOnly) params.set('favorite', 'true')
  try {
    const data = await apiFetch('/api/accounts?' + params).then((r) => r.json())
    const items = data.items || []
    $('acct-count').textContent = (state.favoritesOnly ? '个人收藏 ' : '共 ') + (data.total || 0) + ' 条'
    const list = $('acct-list')
    list.innerHTML = ''
    if (!items.length) {
      list.appendChild(el('div', 'empty', state.favoritesOnly ? '还没有收藏任何账号' : '没有匹配的账号'))
      $('pager').innerHTML = ''
      return
    }
    for (const a of items) {
      const card = el('a', 'acct')
      card.href = a.url || '#'
      card.style.color = 'inherit'
      if (!CFG.demoMode) { card.target = '_blank'; card.rel = 'noopener' }
      else card.onclick = (e) => { e.preventDefault(); if (isVipOrAdmin()) openValuationModal(a.id) }

      const main = el('div', 'acct-main')
      main.appendChild(el('div', 'acct-title', a.title || '（无标题）'))
      const meta = el('div', 'acct-meta')
      meta.append(el('span', 'pill blue', a.source_name || (state.mappings.sources || {})[a.source] || a.source))
      if (a.game) meta.appendChild(el('span', 'pill', a.game))
      for (const t of (a.tags || []).slice(0, 5)) meta.appendChild(el('span', 'pill green', t))
      main.appendChild(meta)

      const side = el('div', 'acct-side')
      side.append(
        makeFavBtn(a, () => { if (state.favoritesOnly) searchAccounts() }),
        el('div', 'price', fmtMoney(a.price)),
      )
      if (a.predicted_price) {
        const gap = Number(a.price_gap || 0)
        const cheap = gap <= -0.1
        side.appendChild(el('div', 'pred' + (cheap ? ' low' : ''), '参考 ' + fmtMoney(a.predicted_price)))
      }
      side.appendChild(el('div', 'source-tag', (a.created_at || '').slice(0, 16)))
      const actions = el('div', 'acct-side-actions')
      actions.appendChild(makeExplainBtn(a.id))
      side.appendChild(actions)
      card.append(main, side)
      list.appendChild(card)
    }

    const pager = $('pager')
    pager.innerHTML = ''
    const pages = Math.ceil((data.total || 0) / state.size) || 1
    if (pages > 1) {
      for (let p = 1; p <= Math.min(pages, 8); p++) {
        const b = el('button', p === state.page ? 'active' : '', String(p))
        b.onclick = () => { state.page = p; searchAccounts() }
        pager.appendChild(b)
      }
    }
  } finally {
    $('acct-loading').style.display = 'none'
  }
}

/* ---------------- Market Trends ---------------- */
function chartTheme() {
  const dark = document.documentElement.getAttribute('data-theme') !== 'light'
  return {
    text: dark ? '#98a2b3' : '#556070',
    gold: dark ? '#e5b96f' : '#a57220',
    jade: dark ? '#2ee59d' : '#0f8a57',
  }
}

function drawLineChart(id, items, key, label, color) {
  if (typeof Chart === 'undefined') return
  const canvas = $(id)
  if (!canvas) return
  if (charts[id]) charts[id].destroy()
  Chart.defaults.color = chartTheme().text
  charts[id] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: items.map((x) => x.day),
      datasets: [{ label, data: items.map((x) => x[key]), borderColor: color, backgroundColor: 'transparent', tension: 0.3, pointRadius: 2 }],
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
  })
}

async function loadGamePage() {
  const games = availableGames()
  if (!gamePage.game || !games.includes(gamePage.game)) gamePage.game = games[0]
  const box = $('game-picks')
  box.innerHTML = ''
  for (const name of games) {
    const chip = el('div', 'chip' + (gamePage.game === name ? ' active' : ''), name)
    chip.onclick = () => { gamePage.game = name; loadGamePage() }
    box.appendChild(chip)
  }
  const [mResp, tResp] = await Promise.all([
    apiFetch('/api/price-model?game=' + encodeURIComponent(gamePage.game)).then((r) => r.json()),
    apiFetch('/api/games/' + encodeURIComponent(gamePage.game) + '/price-trend?days=30&agent=' + encodeURIComponent($('agent-trend-name').value.trim())).then((r) => r.json()),
  ])
  const m = mResp.model
  $('model-info').textContent = m ? ('N=' + m.n + ' · R²=' + m.r2 + ' · 更新于 ' + (m.trained_at || '')) : ''
  const items = tResp.items || []
  const th = chartTheme()
  drawLineChart('chart-game-price', items, 'median', '账号中位价', th.gold)
  drawLineChart('chart-agent-price', items, 'premium', ($('agent-trend-name').value.trim() || '核心角色') + ' 溢价', th.jade)
}

/* ---------------- Admin Invite & Member Console ---------------- */
function copyText(text, btn) {
  const prev = btn ? btn.textContent : ''
  const done = () => {
    if (btn) { btn.textContent = '已复制 ✓'; setTimeout(() => { btn.textContent = prev }, 1400) }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => prompt('请复制：', text))
  } else {
    prompt('请复制：', text)
  }
}

async function loadAdminPage() {
  if (!isAdminUser()) return
  const [invRes, usrRes] = await Promise.all([
    apiFetch('/api/admin/invites').then((r) => r.json()),
    apiFetch('/api/admin/users').then((r) => r.json()),
  ])
  const invites = invRes.items || []
  const users = usrRes.items || []
  $('inv-count').textContent = '共 ' + invites.length + ' 条'
  const invRows = $('invite-rows')
  invRows.innerHTML = ''
  $('invite-empty').style.display = invites.length ? 'none' : ''
  for (const inv of invites) {
    const tr = el('tr')
    tr.appendChild(td(inv.code, 'mono'))
    const rc = td(''); rc.appendChild(el('span', 'role-badge ' + inv.role, ROLE_BADGE_TEXT[inv.role] || inv.role)); tr.appendChild(rc)
    tr.appendChild(td(inv.used_count + ' / ' + inv.max_uses, 'mono'))
    tr.appendChild(td(inv.expires_at ? inv.expires_at.slice(0, 16) : '永久有效', 'faint mono'))
    tr.appendChild(td(inv.note || '—', 'faint'))
    tr.appendChild(td((inv.redeemed_by || []).map((x) => x.username).join(', ') || '—', 'faint'))
    tr.appendChild(td(inv.creator_name || '—', 'faint'))
    const sc = td('')
    sc.appendChild(el('span', 'pill ' + (inv.status === 'active' ? 'green' : inv.status === 'revoked' ? 'red' : 'orange'), inv.status === 'active' ? '可用' : inv.status === 'exhausted' ? '已用完' : inv.status === 'expired' ? '已过期' : '已作废'))
    tr.appendChild(sc)
    const ac = td(''); ac.style.textAlign = 'right'
    const rowBtns = el('span', 'btn-row'); rowBtns.style.justifyContent = 'flex-end'
    const cp = el('button', 'chip', '复制链接')
    cp.onclick = () => copyText(window.location.origin + window.location.pathname + '?invite=' + encodeURIComponent(inv.code), cp)
    rowBtns.appendChild(cp)
    if (inv.status === 'active') {
      const rev = el('button', 'chip', '作废')
      rev.onclick = async () => {
        if (!confirm('确认作废邀请码 ' + inv.code + '？')) return
        await apiFetch('/api/admin/invites/' + encodeURIComponent(inv.code), { method: 'DELETE' })
        loadAdminPage()
      }
      rowBtns.appendChild(rev)
    }
    ac.appendChild(rowBtns)
    tr.appendChild(ac)
    invRows.appendChild(tr)
  }

  $('user-count').textContent = '共 ' + users.length + ' 人'
  const uRows = $('user-rows')
  uRows.innerHTML = ''
  for (const u of users) {
    const tr = el('tr')
    tr.appendChild(td(u.username + (u.display_name && u.display_name !== u.username ? ('（' + u.display_name + '）') : '')))
    const roleCell = td('')
    const sel = document.createElement('select')
    sel.className = 'role-select'
    for (const [val, lbl] of [['member', '普通成员'], ['vip', 'VIP 会员'], ['admin', '管理员']]) {
      const opt = document.createElement('option'); opt.value = val; opt.textContent = lbl; opt.selected = u.role === val
      sel.appendChild(opt)
    }
    sel.onchange = async () => {
      const resp = await apiFetch('/api/admin/users/' + u.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: sel.value }) })
      if (!resp.ok) { const b = await resp.json(); alert(b.detail || '修改失败'); sel.value = u.role; return }
      loadAdminPage()
    }
    roleCell.appendChild(sel)
    tr.appendChild(roleCell)
    const st = td(''); st.appendChild(el('span', 'pill ' + (u.is_active ? 'green' : 'red'), u.is_active ? '正常' : '已禁用')); tr.appendChild(st)
    tr.appendChild(td(u.inviter_name ? (u.inviter_name + ' · ' + (u.invite_code || '')) : '初始化', 'faint mono'))
    tr.appendChild(td(String(u.active_sessions || 0), 'mono'))
    tr.appendChild(td(u.last_login_at ? u.last_login_at.slice(0, 16) : '—', 'faint mono'))
    const ac = td(''); ac.style.textAlign = 'right'
    const btns = el('span', 'btn-row'); btns.style.justifyContent = 'flex-end'
    const toggle = el('button', 'chip', u.is_active ? '禁用' : '启用')
    toggle.onclick = async () => {
      const r = await apiFetch('/api/admin/users/' + u.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !u.is_active }) })
      if (!r.ok) { const b = await r.json(); alert(b.detail || '失败'); return }
      loadAdminPage()
    }
    const kick = el('button', 'chip', '踢下线')
    kick.onclick = async () => { await apiFetch('/api/admin/users/' + u.id + '/kick', { method: 'POST' }); loadAdminPage() }
    btns.append(toggle, kick)
    ac.appendChild(btns)
    tr.appendChild(ac)
    uRows.appendChild(tr)
  }
}

/* ---------------- Event Wiring & Boot ---------------- */
function syncThemeButtons() {
  const dark = document.documentElement.getAttribute('data-theme') !== 'light'
  for (const id of ['btn-theme', 'btn-auth-theme']) {
    const b = $(id)
    if (b) { b.textContent = dark ? '☀' : '☾'; b.title = dark ? '切换到宣纸亮色' : '切换到黑曜暗色' }
  }
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', next)
  try { localStorage.setItem('glass:theme', next) } catch (e) {}
  syncThemeButtons()
  if (state.tab === 'game') loadGamePage()
}
syncThemeButtons()
$('btn-theme').onclick = toggleTheme
$('btn-auth-theme').onclick = toggleTheme
$('brand-home').onclick = () => switchTab('bargains')
$('btn-game-to-bargains').onclick = () => { if (gamePage.game) bargainState.game = gamePage.game; switchTab('bargains') }

document.querySelectorAll('#tabs button').forEach((btn) => { btn.onclick = () => switchTab(btn.dataset.tab) })
$('btn-refresh-bargains').onclick = () => fetchBargains(true)
$('btn-analyze-url').onclick = analyzeProductUrl
$('analyze-url-input').onkeyup = (e) => { if (e.key === 'Enter') analyzeProductUrl() }
$('bargain-sort-chips').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return
  bargainState.sortBy = b.dataset.sort || 'composite'
  for (const x of $('bargain-sort-chips').querySelectorAll('button')) x.classList.toggle('active', x === b)
  fetchBargains()
}
$('bargain-min-chips').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return
  bargainState.minPrice = Number(b.dataset.min || 150)
  for (const x of $('bargain-min-chips').querySelectorAll('button')) x.classList.toggle('active', x === b)
  fetchBargains()
}
$('bargain-include-risky').onchange = (e) => { bargainState.includeRisky = Boolean(e.target.checked); fetchBargains() }

$('f-source').onchange = (e) => { state.source = e.target.value; state.page = 1; searchAccounts() }
$('f-sort').onchange = (e) => { state.sort = e.target.value; state.page = 1; searchAccounts() }
$('f-keyword').onkeyup = (e) => { if (e.key === 'Enter') { state.keyword = e.target.value; state.page = 1; searchAccounts() } }
$('f-min').onchange = (e) => { state.minPrice = e.target.value; state.page = 1; searchAccounts() }
$('f-max').onchange = (e) => { state.maxPrice = e.target.value; state.page = 1; searchAccounts() }
$('btn-reset').onclick = () => {
  state.source = ''; state.game = ''; state.keyword = ''; state.minPrice = ''; state.maxPrice = ''; state.sort = ''; state.page = 1
  $('f-source').value = ''; $('f-keyword').value = ''; $('f-min').value = ''; $('f-max').value = ''; $('f-sort').value = ''
  renderAccountFilterOptions(); searchAccounts()
}
$('btn-agent-trend').onclick = loadGamePage
$('agent-trend-name').onkeyup = (e) => { if (e.key === 'Enter') loadGamePage() }

$('btn-close-val').onclick = () => { $('val-modal').hidden = true }
$('val-modal').onclick = (e) => { if (e.target === $('val-modal')) $('val-modal').hidden = true }
$('btn-open-pwd').onclick = () => { $('pwd-old').value = ''; $('pwd-new').value = ''; $('pwd-new2').value = ''; setFormErr('pwd-msg', ''); $('pwd-modal').hidden = false }
$('btn-close-pwd').onclick = () => { $('pwd-modal').hidden = true }
$('pwd-modal').onclick = (e) => { if (e.target === $('pwd-modal')) $('pwd-modal').hidden = true }
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { $('val-modal').hidden = true; $('pwd-modal').hidden = true }
})

$('auth-tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) switchAuthMode(b.dataset.mode) }
document.querySelectorAll('[data-demo-user]').forEach((btn) => {
  btn.onclick = async () => {
    const r = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: btn.dataset.demoUser, password: 'demo-password' }),
    })
    const d = await r.json()
    if (r.ok && d.user) enterAppWithUser(d.user)
  }
})

$('auth-bootstrap-form').onsubmit = async (e) => {
  e.preventDefault()
  setFormErr('boot-err', '')
  if ($('boot-pass').value !== $('boot-pass2').value) { setFormErr('boot-err', '两次输入的密码不一致'); return }
  const r = await apiFetch('/api/auth/bootstrap', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: $('boot-user').value.trim(), display_name: $('boot-display').value.trim(), password: $('boot-pass').value }),
  })
  const d = await r.json()
  if (!r.ok) { setFormErr('boot-err', d.detail || '初始化失败'); return }
  enterAppWithUser(d.user)
}

$('auth-login-form').onsubmit = async (e) => {
  e.preventDefault()
  setFormErr('login-err', '')
  const r = await apiFetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: $('login-user').value.trim(), password: $('login-pass').value }),
  })
  const d = await r.json()
  if (!r.ok) { setFormErr('login-err', d.detail || '登录失败'); return }
  $('login-pass').value = ''
  enterAppWithUser(d.user)
}

$('auth-register-form').onsubmit = async (e) => {
  e.preventDefault()
  setFormErr('reg-err', '')
  if ($('reg-pass').value !== $('reg-pass2').value) { setFormErr('reg-err', '两次输入的密码不一致'); return }
  const r = await apiFetch('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invite_code: $('reg-invite').value.trim().toUpperCase(), username: $('reg-user').value.trim(), display_name: $('reg-display').value.trim(), password: $('reg-pass').value }),
  })
  const d = await r.json()
  if (!r.ok) { setFormErr('reg-err', d.detail || '注册失败'); return }
  enterAppWithUser(d.user)
}

$('btn-logout').onclick = async () => {
  await apiFetch('/api/auth/logout', { method: 'POST' })
  currentUser = null
  state.mappings = {}
  bargainCache.clear()
  await showAuthGate()
}

$('pwd-form').onsubmit = async (e) => {
  e.preventDefault()
  const m = $('pwd-msg')
  m.className = 'auth-error'
  if ($('pwd-new').value !== $('pwd-new2').value) { setFormErr('pwd-msg', '两次输入的新密码不一致'); return }
  const r = await apiFetch('/api/auth/password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_password: $('pwd-old').value, new_password: $('pwd-new').value }),
  })
  const d = await r.json()
  if (!r.ok) { setFormErr('pwd-msg', d.detail || '修改失败'); return }
  m.className = 'auth-error ok'
  setFormErr('pwd-msg', '密码已修改')
  setTimeout(() => { $('pwd-modal').hidden = true }, 800)
}

$('btn-create-invite').onclick = async () => {
  const r = await apiFetch('/api/admin/invites', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: $('inv-role').value, max_uses: Number($('inv-max-uses').value || 1), expires_days: Number($('inv-expires').value || 0), note: $('inv-note').value.trim() }),
  })
  const d = await r.json()
  if (!r.ok) { alert(d.detail || '签发失败'); return }
  $('inv-created-code').textContent = d.code + '（' + (d.role_label || d.role) + '）'
  $('inv-created-box').hidden = false
  $('btn-copy-inv-code').onclick = () => copyText(d.code, $('btn-copy-inv-code'))
  $('btn-copy-inv-link').onclick = () => copyText(window.location.origin + window.location.pathname + '?invite=' + encodeURIComponent(d.code), $('btn-copy-inv-link'))
  $('inv-note').value = ''
  loadAdminPage()
}
$('btn-refresh-admin').onclick = loadAdminPage

;(async function boot() {
  try {
    const r = await apiFetch('/api/auth/me')
    if (r.ok) {
      const d = await r.json()
      if (d && d.user) { enterAppWithUser(d.user); return }
    }
  } catch (e) {}
  await showAuthGate()
})()
