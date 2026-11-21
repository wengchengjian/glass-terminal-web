/**
 * GLASS Quant Terminal · Client-Side Demo Mock Engine
 *
 * Activated only when `window.GLASS_CONFIG.demoMode === true`.
 * Uses 100% synthetic data & generic marketplace names (Market Alpha / Beta / Gamma)
 * so anyone can interactively preview the full UI, 3-tier RBAC, profit radar,
 * counterfactual value decomposition, and invite governance without a backend.
 */
(function () {
  const FEE_RATE = 0.08
  const SOURCES = {
    market_a: 'Market Alpha',
    market_b: 'Market Beta',
    market_c: 'Market Gamma',
  }
  const GAMES = ['绝区零', '鸣潮', '三国杀移动版', '三角洲行动', '逆水寒手游']
  const GAME_META = {
    '绝区零': { key: 'zzz', pool: 1208, engine: 'zzz_onnx_cqr', note: 'L1+L2 CQR ONNX（106维专属特征）· 去偏成交价' },
    '鸣潮': { key: 'wuwa', pool: 1384, engine: 'wuwa_onnx_cqr', note: 'L1+L2 CQR ONNX（75维专属特征）· 去偏成交价' },
    '三国杀移动版': { key: 'sgs', pool: 964, engine: 'sgs_onnx_cqr', note: 'L1+L2 CQR ONNX（55维专属特征）· 去偏成交价' },
    '三角洲行动': { key: 'delta', pool: 162, engine: 'delta_onnx_cqr', note: 'L1+L2 CQR ONNX（22维专属特征）· 去偏成交价' },
    '逆水寒手游': { key: 'nsh', pool: 176, engine: 'nsh_onnx_cqr', note: 'L1+L2 CQR ONNX（26维专属特征）· 去偏成交价' },
  }

  function profitMetrics(price, p25, p50, risky) {
    const gross = Math.round(p50 - price)
    const net = Math.round(p50 * (1 - FEE_RATE) - price)
    const safe = Math.round(p25 * (1 - FEE_RATE) - price)
    const upside = Math.round(((p50 - price) / price) * 1000) / 10
    const roi = Math.round((net / price) * 1000) / 10
    const score = net > 0 ? Math.round(net * Math.sqrt(Math.max(roi, 0) / 100) * 10) / 10 : net
    return {
      fee_rate: FEE_RATE,
      gross_profit: gross,
      net_profit: net,
      safe_profit: safe,
      upside_pct: upside,
      roi_pct: roi,
      profit_score: score,
      saving: gross,
      discount_pct: Math.round((1 - price / p50) * 1000) / 10,
      value_ratio: Math.round((p50 / price) * 1000) / 1000,
      score: Math.min(99, Math.max(10, Math.round((p50 / price) * 48))),
      is_bargain: safe > 0 && !risky,
    }
  }

  function makeSyntheticDataset() {
    const templates = {
      '绝区零': [
        { title: '官服 60级 117黄 虚狩全齐 雅2+1 叶瞬光6+1 仪玄2+1 存货180抽 16时装', price: 3660, fair: 6540, hl: ['117黄', '虚狩18金', '180抽', '16皮', '6+1叶瞬光', '2+1雅'], chars: [{ name: '叶瞬光', spec: '6+1', tier: '虚狩', amount: 2480, pct: 37.9 }, { name: '仪玄', spec: '2+1', tier: '虚狩', amount: 520, pct: 8.0 }, { name: '雅', spec: '2+1', tier: '虚狩', amount: 460, pct: 7.0 }, { name: '耀嘉音', spec: '1+1', tier: '核心拐', amount: 310, pct: 4.7 }], comps: [['base', '基础账号与练度底盘', '绳网 60 级 · 官服基准', 120], ['pulls', '存量抽数折现', '菲林+母带折合 180 抽', 290], ['vh', '虚狩核心角色与专武', '虚狩 18 金（含6+1主力）', 2840], ['lim', '其余限定角色与专武', '多队完整毕业体系', 2080], ['std', '常驻角色与音擎', '常驻高影画辅助', 360], ['cos', '时装与 S 级邦布', '16 时装 · 13 S 邦布', 850]] },
        { title: '官服 60级 雅6+1 耀嘉音2+1 存货260抽 全图鉴毕业号', price: 1850, fair: 3280, hl: ['68黄', '虚狩12金', '260抽', '6+1雅', '2+1耀嘉音'], chars: [{ name: '雅', spec: '6+1', tier: '虚狩', amount: 1420, pct: 43.3 }, { name: '耀嘉音', spec: '2+1', tier: '核心拐', amount: 390, pct: 11.9 }, { name: '柏妮思', spec: '2+1', tier: '限定', amount: 260, pct: 7.9 }], comps: [['base', '基础账号与练度底盘', '绳网 60 级 · 官服基准', 120], ['pulls', '存量抽数折现', '折合 260 抽存货', 420], ['vh', '虚狩核心角色与专武', '雅 6+1 满影画体系', 1580], ['lim', '其余限定角色与专武', '限定 S 代理人与专武', 890], ['std', '常驻角色与音擎', '常驻音擎精炼', 140], ['cos', '时装与 S 级邦布', '8 时装 · 9 S 邦布', 130]] },
        { title: '官服 58级 叶瞬光2+1 雅2+1 存货310抽 未绑三方 极品底子', price: 780, fair: 1460, hl: ['38黄', '虚狩8金', '310抽', '2+1叶瞬光', '2+1雅'], chars: [{ name: '叶瞬光', spec: '2+1', tier: '虚狩', amount: 410, pct: 28.1 }, { name: '雅', spec: '2+1', tier: '虚狩', amount: 365, pct: 25.0 }], comps: [['base', '基础账号与练度底盘', '绳网 58 级 · 官服基准', 110], ['pulls', '存量抽数折现', '折合 310 抽存货', 460], ['vh', '虚狩核心角色与专武', '双 2+1 虚狩核心', 640], ['lim', '其余限定角色与专武', '限定辅助与专武', 190], ['std', '常驻角色与音擎', '常驻基础配置', 60]] },
        { title: '官服 56级 雅0+1 耀嘉音0+1 存货420抽 高资源自抽号', price: 320, fair: 590, hl: ['18黄', '420抽', '0+1雅', '0+1耀嘉音'], chars: [{ name: '雅', spec: '0+1', tier: '虚狩', amount: 145, pct: 24.6 }, { name: '耀嘉音', spec: '0+1', tier: '核心拐', amount: 95, pct: 16.1 }], comps: [['base', '基础账号与练度底盘', '绳网 56 级 · 官服基准', 90], ['pulls', '存量抽数折现', '折合 420 抽高存量', 310], ['vh', '虚狩核心角色与专武', '雅 0+1', 120], ['lim', '其余限定角色与专武', '耀嘉音 0+1', 70]] },
        { title: '官服 60级 仪玄2+1 雅1+1 存货150抽 多队深渊满星', price: 540, fair: 920, hl: ['44黄', '虚狩6金', '150抽', '2+1仪玄'], chars: [{ name: '仪玄', spec: '2+1', tier: '虚狩', amount: 310, pct: 33.7 }, { name: '雅', spec: '1+1', tier: '虚狩', amount: 220, pct: 23.9 }], comps: [['base', '基础账号与练度底盘', '绳网 60 级 · 官服基准', 115], ['pulls', '存量抽数折现', '折合 150 抽', 210], ['vh', '虚狩核心角色与专武', '双虚狩高配', 415], ['lim', '其余限定角色与专武', '限定副C体系', 180]] },
        { title: '官服 60级 52黄 雅2+1 简2+1 存货95抽 练度拉满', price: 660, fair: 1090, hl: ['52黄', '虚狩4金', '95抽', '2+1雅', '2+1简'], chars: [{ name: '雅', spec: '2+1', tier: '虚狩', amount: 330, pct: 30.3 }, { name: '简', spec: '2+1', tier: '限定', amount: 210, pct: 19.3 }], comps: [['base', '基础账号与练度底盘', '绳网 60 级 · 官服基准', 118], ['pulls', '存量抽数折现', '折合 95 抽', 142], ['vh', '虚狩核心角色与专武', '雅 2+1', 390], ['lim', '其余限定角色与专武', '异常队满配', 340], ['cos', '时装与 S 级邦布', '6 时装 · 8 邦布', 100]] },
        { title: '官服 55级 22黄 存货220抽 耀嘉音1+1 雅0+1 急出', price: 240, fair: 430, hl: ['22黄', '220抽', '1+1耀嘉音'], chars: [{ name: '雅', spec: '0+1', tier: '虚狩', amount: 110, pct: 25.6 }], comps: [['base', '基础账号与练度底盘', '绳网 55 级', 85], ['pulls', '存量抽数折现', '折合 220 抽', 195], ['vh', '虚狩核心角色与专武', '雅 0+1', 90], ['lim', '其余限定角色与专武', '耀嘉音 1+1', 60]] },
        { title: '渠道服 60级 80黄 雅6+1 存货120抽（风控对照样本）', price: 980, fair: 1750, risky: ['渠道服', '无换绑码'], hl: ['80黄', '6+1雅', '120抽'], chars: [{ name: '雅', spec: '6+1', tier: '虚狩', amount: 720, pct: 41.1 }], comps: [['base', '基础账号与练度底盘', '绳网 60 级', 110], ['pulls', '存量抽数折现', '折合 120 抽', 180], ['vh', '虚狩核心角色与专武', '雅 6+1', 1240], ['lim', '其余限定角色与专武', '多限定队', 540], ['security', '渠道与安全属性修正', '渠道服 / 无换绑码折价', -320]] },
      ],
      '鸣潮': [
        { title: '官服 80级 76黄 满命椿6+1 守岸人2+1 今汐3+1 存货210抽', price: 1700, fair: 3300, hl: ['76黄', '满命椿', '210抽', '2+1守岸人'], chars: [{ name: '椿', spec: '6+1', tier: '核心', amount: 1280, pct: 38.8 }, { name: '今汐', spec: '3+1', tier: '核心', amount: 640, pct: 19.4 }, { name: '守岸人', spec: '2+1', tier: '核心拐', amount: 420, pct: 12.7 }], comps: [['base', '账号基础底盘', '联觉 80 级 · 官服', 120], ['pulls', '存量抽数与余波珊瑚', '星声+波纹折合 210 抽', 340], ['lim', '限定五星角色与专武', '满命主力+多专武', 2690], ['std', '常驻五星角色', '维里奈高命', 150]] },
        { title: '官服 80级 41黄 星声20875 浮金波纹32 铸潮波纹7 高抽数号', price: 210, fair: 480, hl: ['41黄', '170抽', '余波珊瑚81'], chars: [{ name: '守岸人', spec: '0+1', tier: '核心拐', amount: 95, pct: 19.8 }, { name: '忌炎', spec: '1+1', tier: '限定', amount: 80, pct: 16.7 }], comps: [['base', '账号基础底盘', '联觉 80 级', 105], ['pulls', '存量抽数与余波珊瑚', '170 抽 + 81 珊瑚', 225], ['lim', '限定五星角色与专武', '多限定五星', 135], ['std', '常驻五星角色', '常驻角色', 15]] },
        { title: '官服 80级 108黄 三满命毕业号 存货140抽 顶配声骸', price: 5480, fair: 8300, hl: ['108黄', '三满命', '140抽'], chars: [{ name: '今汐', spec: '6+5', tier: '核心', amount: 2420, pct: 29.2 }, { name: '椿', spec: '6+1', tier: '核心', amount: 1850, pct: 22.3 }], comps: [['base', '账号基础底盘', '联觉 80 级', 150], ['pulls', '存量抽数与余波珊瑚', '140 抽存货', 260], ['lim', '限定五星角色与专武', '三满命顶配体系', 7540], ['std', '常驻五星角色', '全常驻高命', 350]] },
        { title: '官服 75级 34黄 守岸人1+1 椿2+1 存货190抽 极品开荒', price: 460, fair: 840, hl: ['34黄', '190抽', '2+1椿'], chars: [{ name: '椿', spec: '2+1', tier: '核心', amount: 290, pct: 34.5 }], comps: [['base', '账号基础底盘', '联觉 75 级', 100], ['pulls', '存量抽数与余波珊瑚', '190 抽存货', 270], ['lim', '限定五星角色与专武', '椿 2+1 + 守岸人', 430], ['std', '常驻五星角色', '维里奈', 40]] },
        { title: '官服 80级 55黄 珂莱塔2+1 折枝0+1 存货120抽', price: 620, fair: 1080, hl: ['55黄', '120抽', '2+1珂莱塔'], chars: [{ name: '珂莱塔', spec: '2+1', tier: '核心', amount: 340, pct: 31.5 }], comps: [['base', '账号基础底盘', '联觉 80 级', 110], ['pulls', '存量抽数与余波珊瑚', '120 抽', 180], ['lim', '限定五星角色与专武', '冰系主力队', 720], ['std', '常驻五星角色', '常驻', 70]] },
        { title: '官服 78级 29黄 今汐0+1 存货280抽 性价比捡漏', price: 290, fair: 520, hl: ['29黄', '280抽', '0+1今汐'], chars: [{ name: '今汐', spec: '0+1', tier: '核心', amount: 140, pct: 26.9 }], comps: [['base', '账号基础底盘', '联觉 78 级', 95], ['pulls', '存量抽数与余波珊瑚', '280 抽存货', 265], ['lim', '限定五星角色与专武', '今汐 0+1', 160]] },
      ],
      '三国杀移动版': [
        { title: '官服 大将军 VIP10 史诗88 谋徐盛/神郭嘉/界钟会/神孙策 42动皮 宝珠68', price: 4500, fair: 7420, hl: ['大将军', '88史诗', '42动皮', '宝珠68'], chars: [], comps: [['base', '账号基础底盘', '官服大将军', 120], ['rank', '官阶与 VIP 等级', '大将军 · VIP10', 380], ['hero', '史诗与顶流阴间武将', '88 史诗含顶流核心', 4920], ['skin', '动态皮肤与外观', '42 动态皮肤', 1350], ['res', '宝珠 / 元宝 / 将力资源', '68 宝珠存货', 650]] },
        { title: '官服 骠骑将军 史诗32 界徐盛/神甘宁/神荀彧 14动皮 宝珠12', price: 520, fair: 940, hl: ['骠骑将军', '32史诗', '14动皮'], chars: [], comps: [['base', '账号基础底盘', '官服骠骑', 100], ['rank', '官阶与 VIP 等级', '骠骑 · VIP7', 95], ['hero', '史诗与顶流阴间武将', '32 史诗', 515], ['skin', '动态皮肤与外观', '14 动皮', 160], ['res', '宝珠 / 元宝 / 将力资源', '12 宝珠', 70]] },
        { title: '官服 领军将军 史诗18 神郭嘉/界钟会 8动皮 急出', price: 190, fair: 415, hl: ['领军将军', '18史诗', '8动皮'], chars: [], comps: [['base', '账号基础底盘', '官服基础', 90], ['rank', '官阶与 VIP 等级', '领军将军', 35], ['hero', '史诗与顶流阴间武将', '18 史诗', 190], ['skin', '动态皮肤与外观', '8 动皮', 65], ['res', '宝珠 / 元宝 / 将力资源', '元宝将力', 35]] },
      ],
      '三角洲行动': [
        { title: '官服 总资产142M 流动96M 典藏刀皮全齐 3x3安全箱 实名可改', price: 1880, fair: 2790, hl: ['总资产142M', '典藏刀皮', '3x3安全箱'], chars: [], comps: [['base', '账号基础底盘', '满级特勤处', 150], ['asset', '总资产与哈夫币', '142M 总资产 / 96M 流动', 1060], ['knife', '典藏与近战刀皮', '多款限定典藏近战', 720], ['gun', '枪皮与稀缺红皮', '高配稀缺枪皮', 860]] },
        { title: '官服 总资产68M 流动45M 怜悯/北极星刀皮 满级特勤处', price: 780, fair: 1260, hl: ['总资产68M', '双刀皮', '满级特勤'], chars: [], comps: [['base', '账号基础底盘', '满级特勤处', 130], ['asset', '总资产与哈夫币', '68M 总资产', 480], ['knife', '典藏与近战刀皮', '怜悯+北极星', 410], ['gun', '枪皮与稀缺红皮', '稀缺枪皮', 240]] },
        { title: '官服 总资产35M 流动24M 红狼/露娜皮肤 性价比入门', price: 320, fair: 510, hl: ['总资产35M', '红狼/露娜'], chars: [], comps: [['base', '账号基础底盘', '基础练度', 110], ['asset', '总资产与哈夫币', '35M 资产', 240], ['gun', '枪皮与稀缺红皮', '限定皮肤', 160]] },
      ],
      '逆水寒手游': [
        { title: '官服 素问【把酒临风】【已用天赏石23】转盘外观2 天赏发型13 馆藏8级 衣品38万', price: 1200, fair: 2750, hl: ['把酒临风', '天赏石23', '天赏发13', '双转盘'], chars: [], comps: [['base', '账号基础底盘', '逆水寒官服基准', 150], ['ts', '天赏石与累充称号', '把酒临风 · 23 天赏石', 620], ['looks', '转盘 / 发型 / 坐骑外观', '13 天赏发 · 2 转盘外观', 1780], ['scores', '馆藏 / 衣品 / 国色 / 内功', '馆藏8级 · 衣品38万', 200]] },
        { title: '官服 鸿音【名动江湖】【已用天赏石48】白发全齐 祥瑞坐骑5 馆藏10级', price: 5590, fair: 7820, hl: ['名动江湖', '天赏石48', '祥瑞坐骑5'], chars: [], comps: [['base', '账号基础底盘', '逆水寒官服基准', 160], ['ts', '天赏石与累充称号', '名动江湖 · 48 天赏石', 2140], ['looks', '转盘 / 发型 / 坐骑外观', '全白发 · 5 祥瑞坐骑', 4890], ['scores', '馆藏 / 衣品 / 国色 / 内功', '馆藏10级 · 灵韵满配', 630]] },
        { title: '官服 碎梦【把酒临风】【已用天赏石14】天赏发型6 馆藏6级 急出', price: 580, fair: 980, hl: ['把酒临风', '天赏石14', '天赏发6'], chars: [], comps: [['base', '账号基础底盘', '逆水寒官服基准', 140], ['ts', '天赏石与累充称号', '把酒临风 · 14 天赏石', 310], ['looks', '转盘 / 发型 / 坐骑外观', '6 天赏发', 410], ['scores', '馆藏 / 衣品 / 国色 / 内功', '馆藏6级', 120]] },
      ],
    }

    const srcKeys = Object.keys(SOURCES)
    const items = []
    let nextId = 10001
    for (const game of GAMES) {
      const list = templates[game] || []
      // Expand each game to 12 realistic listings by slight deterministic variations
      for (let round = 0; round < 2; round++) {
        for (let i = 0; i < list.length; i++) {
          const tpl = list[i]
          const id = nextId++
          const scale = round === 0 ? 1.0 : (0.86 + ((i * 7) % 15) * 0.015)
          const price = Math.round(tpl.price * scale)
          const fair50 = Math.round(tpl.fair * (round === 0 ? 1.0 : scale * 0.94))
          const fair25 = Math.round(fair50 * 0.84)
          const fair75 = Math.round(fair50 * 1.16)
          const list50 = Math.round(fair50 * 1.08)
          const src = srcKeys[(id + i) % srcKeys.length]
          const flags = tpl.risky || []
          const pm = profitMetrics(price, fair25, fair50, flags.length > 0)
          const comps = (tpl.comps || []).map(([k, label, detail, amt]) => {
            const scaled = Math.round(amt * (fair50 / tpl.fair))
            return { key: k, label, detail, category: k === 'base' ? 'base' : 'asset', amount: scaled, pct: Math.round((scaled / Math.max(fair50, 1)) * 1000) / 10 }
          })
          if (comps.length) {
            const diff = fair50 - comps.reduce((s, c) => s + c.amount, 0)
            comps[0].amount += diff
            comps[0].pct = Math.round((comps[0].amount / Math.max(fair50, 1)) * 1000) / 10
          }
          const chars = (tpl.chars || []).map((c) => ({ ...c, amount: Math.round(c.amount * (fair50 / tpl.fair)) }))
          items.push({
            id,
            game,
            game_id: GAME_META[game].key,
            source: src,
            source_name: SOURCES[src],
            title: round === 0 ? tpl.title : (tpl.title + ' · 次新精选'),
            url: '#demo-listing-' + id,
            price,
            list_p50: list50,
            fair_p25: fair25,
            fair_p50: fair50,
            fair_p75: fair75,
            debiased_delta: fair50 - list50,
            ...pm,
            risk_flags: flags,
            highlights: tpl.hl,
            tags: tpl.hl,
            components: comps,
            characters: chars,
            first_seen_at: '2026-11-21 19:' + String((id % 50) + 10).padStart(2, '0') + ':00',
            created_at: '2026-11-21 19:' + String((id % 50) + 10).padStart(2, '0') + ':00',
          })
        }
      }
    }
    return items
  }

  const STORAGE_KEY = 'glass_demo_state_v1'
  function loadState() {
    const baseUsers = [
      { id: 1, username: 'admin', display_name: '主理人 (Demo)', role: 'admin', is_active: true, inviter_name: '', invite_code: '', active_sessions: 1, last_login_at: '2026-11-21 20:00:00' },
      { id: 2, username: 'vip_alice', display_name: 'Alice · VIP', role: 'vip', is_active: true, inviter_name: 'admin', invite_code: 'GLS-VIP8-DEMO', active_sessions: 1, last_login_at: '2026-11-21 19:45:00' },
      { id: 3, username: 'member_bob', display_name: 'Bob · 体验成员', role: 'member', is_active: true, inviter_name: 'admin', invite_code: 'GLS-MEM5-DEMO', active_sessions: 1, last_login_at: '2026-11-21 19:10:00' },
    ]
    const baseInvites = [
      { code: 'GLS-VIP8-DEMO', role: 'vip', role_label: 'VIP 会员', max_uses: 5, used_count: 1, expires_at: '2026-12-31 23:59:59', note: '公开演示 VIP 体验码（可直接用于注册体验）', creator_name: 'admin', status: 'active', redeemed_by: [{ username: 'vip_alice' }] },
      { code: 'GLS-MEM5-DEMO', role: 'member', role_label: '普通成员', max_uses: 10, used_count: 1, expires_at: null, note: '公开演示普通成员体验码', creator_name: 'admin', status: 'active', redeemed_by: [{ username: 'member_bob' }] },
    ]
    return {
      currentUserId: null,
      users: baseUsers,
      invites: baseInvites,
      favorites: { 1: [10001, 10002], 2: [10001], 3: [] },
      accounts: makeSyntheticDataset(),
      nextUserId: 4,
      nextAccountId: 20001,
    }
  }

  let db = loadState()
  try {
    const savedUid = sessionStorage.getItem(STORAGE_KEY)
    if (savedUid) db.currentUserId = Number(savedUid) || null
  } catch (e) {}

  function setSession(uid) {
    db.currentUserId = uid
    try {
      if (uid) sessionStorage.setItem(STORAGE_KEY, String(uid))
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch (e) {}
  }

  function currentUser() {
    if (!db.currentUserId) return null
    const u = db.users.find((x) => x.id === db.currentUserId && x.is_active)
    if (!u) return null
    const isAdmin = u.role === 'admin'
    const isVip = u.role === 'vip' || isAdmin
    return {
      ...u,
      permissions: {
        can_overview: isAdmin,
        can_bargains_full: isVip,
        bargain_limit: isVip ? null : 5,
        can_valuation: isVip,
        can_trends: isVip,
        can_admin: isAdmin,
      },
    }
  }

  function resp(status, data) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    })
  }

  function genCode() {
    const alpha = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    const seg = () => Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('')
    return 'GLS-' + seg() + '-' + seg()
  }

  window.GLASS_MOCK_API = async function mockFetch(path, init = {}) {
    const method = String(init.method || 'GET').toUpperCase()
    const urlObj = new URL(path, 'https://demo.local')
    const p = urlObj.pathname
    const qs = urlObj.searchParams
    let body = {}
    if (init.body && typeof init.body === 'string') {
      try { body = JSON.parse(init.body) } catch (e) {}
    }

    // Auth endpoints
    if (p === '/api/auth/status') return resp(200, { needs_bootstrap: false, invite_only: true, demo: true })
    if (p === '/api/auth/logout') { setSession(null); return resp(200, { ok: true }) }
    if (p === '/api/auth/login') {
      const uname = String(body.username || '').trim().toLowerCase()
      const u = db.users.find((x) => x.username.toLowerCase() === uname)
      if (!u) return resp(401, { detail: 'Demo 模式可用账号：admin / vip_alice / member_bob（密码任意）' })
      if (!u.is_active) return resp(403, { detail: '该账号已被禁用' })
      setSession(u.id)
      return resp(200, { user: currentUser() })
    }
    if (p === '/api/auth/register') {
      const code = String(body.invite_code || '').trim().toUpperCase()
      const inv = db.invites.find((x) => x.code === code)
      if (!inv || inv.status !== 'active' || inv.used_count >= inv.max_uses) {
        return resp(400, { detail: '邀请码无效或已用完（Demo 可试用 GLS-VIP8-DEMO 或 GLS-MEM5-DEMO）' })
      }
      const uname = String(body.username || '').trim()
      if (uname.length < 3) return resp(400, { detail: '用户名至少 3 位' })
      if (db.users.some((x) => x.username.toLowerCase() === uname.toLowerCase())) return resp(409, { detail: '用户名已被占用' })
      inv.used_count += 1
      if (inv.used_count >= inv.max_uses) inv.status = 'exhausted'
      inv.redeemed_by.push({ username: uname })
      const u = {
        id: db.nextUserId++,
        username: uname,
        display_name: String(body.display_name || '').trim() || uname,
        role: inv.role,
        is_active: true,
        inviter_name: inv.creator_name,
        invite_code: inv.code,
        active_sessions: 1,
        last_login_at: '刚刚',
      }
      db.users.push(u)
      db.favorites[u.id] = []
      setSession(u.id)
      return resp(200, { user: currentUser() })
    }

    const user = currentUser()
    if (!user) return resp(401, { detail: '请先登录' })
    if (p === '/api/auth/me') return resp(200, { user })
    if (p === '/api/auth/password') return resp(200, { ok: true })

    const isVip = user.role === 'vip' || user.role === 'admin'
    const isAdmin = user.role === 'admin'
    const userFavs = new Set(db.favorites[user.id] || [])

    if (p === '/api/mappings') {
      const games = {}
      for (const g of GAMES) games[g] = { market_a: GAME_META[g].key }
      return resp(200, {
        sources: SOURCES,
        games,
        hot_picks: { '绝区零': ['叶瞬光', '雅', '仪玄'], '鸣潮': ['椿', '今汐', '守岸人'] },
      })
    }

    // Bargains
    const bm = p.match(/^\/api\/games\/([^/]+)\/bargains$/)
    if (bm) {
      const game = decodeURIComponent(bm[1])
      const minPrice = Number(qs.get('min_price') || 150)
      const includeRisky = qs.get('include_risky') === 'true'
      const sortBy = qs.get('sort_by') || 'composite'
      const meta = GAME_META[game] || GAME_META['绝区零']
      let list = db.accounts.filter((a) => a.game === game && a.price >= minPrice && (includeRisky || !a.risk_flags.length))
      if (sortBy === 'profit') list.sort((a, b) => b.net_profit - a.net_profit)
      else if (sortBy === 'roi') list.sort((a, b) => b.roi_pct - a.roi_pct)
      else list.sort((a, b) => (b.is_bargain - a.is_bargain) || (b.profit_score - a.profit_score))
      const shown = (isVip ? list.slice(0, 20) : list.slice(0, 5)).map((it, idx) => ({
        ...it,
        rank: idx + 1,
        favorite: userFavs.has(it.id),
      }))
      return resp(200, {
        game,
        engine: meta.engine,
        model_note: meta.note + ' (Demo)',
        sample_pool: meta.pool,
        fee_rate: FEE_RATE,
        sort_by: sortBy,
        preview_limit: isVip ? null : 5,
        locked_count: isVip ? 0 : Math.max(0, list.length - 5),
        items: shown,
      })
    }

    // Valuation breakdown
    const vm = p.match(/^\/api\/accounts\/(\d+)\/valuation$/)
    if (vm) {
      if (!isVip) return resp(403, { detail: '该功能需要 VIP 会员或管理员权限' })
      const aid = Number(vm[1])
      const it = db.accounts.find((x) => x.id === aid)
      if (!it) return resp(404, { detail: '账号不存在' })
      return resp(200, { account_id: it.id, ...it, engine: (GAME_META[it.game] || {}).engine || 'onnx_cqr' })
    }

    // On-demand URL analyzer (Demo simulation)
    if (p === '/api/analyze-url' && method === 'POST') {
      if (!isVip) return resp(403, { detail: '该功能需要 VIP 会员或管理员权限' })
      const rawUrl = String(body.url || '').trim()
      if (!rawUrl || !rawUrl.includes('.')) return resp(400, { detail: '请输入有效的商品详情页 URL' })
      const sample = db.accounts[0]
      const newId = db.nextAccountId++
      const sim = {
        ...sample,
        id: newId,
        account_id: newId,
        title: '[链接直抓示例] 官服 60级 雅2+1 叶瞬光2+1 存货240抽 12时装',
        price: 890,
        fair_p25: 1320,
        fair_p50: 1580,
        fair_p75: 1840,
        list_p50: 1690,
        debiased_delta: -110,
        url: rawUrl,
        ...profitMetrics(890, 1320, 1580, false),
      }
      sim.components = [
        { key: 'base', label: '基础账号与练度底盘', detail: '绳网 60 级 · 官服基准', category: 'base', amount: 120, pct: 7.6 },
        { key: 'pulls', label: '存量抽数折现', detail: '折合 240 抽存货', category: 'asset', amount: 360, pct: 22.8 },
        { key: 'vh', label: '虚狩核心角色与专武', detail: '双 2+1 虚狩主力', category: 'core', amount: 740, pct: 46.8 },
        { key: 'lim', label: '其余限定角色与专武', detail: '限定辅助与专武', category: 'asset', amount: 240, pct: 15.2 },
        { key: 'cos', label: '时装与 S 级邦布', detail: '12 时装', category: 'asset', amount: 120, pct: 7.6 },
      ]
      return resp(200, {
        account_id: newId,
        created: true,
        source: 'market_a',
        source_name: 'Market Alpha (Demo)',
        game_name: '绝区零',
        is_active: true,
        sold_status: 'ON_STAND',
        elapsed_ms: 285,
        valuation: sim,
      })
    }

    // Accounts explorer
    if (p === '/api/accounts') {
      let list = db.accounts.slice()
      const src = qs.get('source')
      const gname = qs.get('game_name')
      const kw = (qs.get('keyword') || '').trim().toLowerCase()
      const minP = qs.get('min_price') ? Number(qs.get('min_price')) : null
      const maxP = qs.get('max_price') ? Number(qs.get('max_price')) : null
      const favOnly = qs.get('favorite') === 'true'
      const sort = qs.get('sort') || ''
      if (src) list = list.filter((a) => a.source === src)
      if (gname) list = list.filter((a) => a.game === gname)
      if (kw) list = list.filter((a) => a.title.toLowerCase().includes(kw) || (a.tags || []).some((t) => t.toLowerCase().includes(kw)))
      if (minP != null && !Number.isNaN(minP)) list = list.filter((a) => a.price >= minP)
      if (maxP != null && !Number.isNaN(maxP)) list = list.filter((a) => a.price <= maxP)
      if (favOnly) list = list.filter((a) => userFavs.has(a.id))
      if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
      else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
      else if (sort === 'value_ratio_desc') list.sort((a, b) => b.value_ratio - a.value_ratio)
      const page = Math.max(1, Number(qs.get('page') || 1))
      const size = Math.min(50, Math.max(1, Number(qs.get('size') || 20)))
      const slice = list.slice((page - 1) * size, page * size).map((it) => ({
        ...it,
        favorite: userFavs.has(it.id),
        predicted_price: it.fair_p50,
        price_gap: Math.round(((it.price - it.fair_p50) / it.fair_p50) * 1000) / 1000,
      }))
      return resp(200, { total: list.length, page, size, items: slice })
    }

    // Favorites
    const fm = p.match(/^\/api\/favorites\/(\d+)$/)
    if (fm) {
      const aid = Number(fm[1])
      const arr = db.favorites[user.id] || []
      if (method === 'POST' && !arr.includes(aid)) arr.push(aid)
      if (method === 'DELETE') db.favorites[user.id] = arr.filter((x) => x !== aid)
      else db.favorites[user.id] = arr
      return resp(200, { ok: true, favorite: method === 'POST' })
    }

    // Trends
    const tm = p.match(/^\/api\/games\/([^/]+)\/price-trend$/)
    if (tm) {
      if (!isVip) return resp(403, { detail: '需要 VIP 权限' })
      const game = decodeURIComponent(tm[1])
      const base = game === '逆水寒手游' ? 1400 : (game === '三国杀移动版' ? 1100 : 880)
      const items = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(Date.now() - (29 - i) * 86400000)
        const day = d.toISOString().slice(0, 10)
        const wave = Math.sin(i * 0.35) * 65 + (i - 15) * 3
        const median = Math.round(base + wave)
        return { day, median, premium: Math.round(240 + Math.cos(i * 0.28) * 45), baseline: Math.round(median - 220), n: 35 + (i % 18) }
      })
      return resp(200, { game, days: 30, items })
    }
    if (p === '/api/price-model') {
      if (!isVip) return resp(403, { detail: '需要 VIP 权限' })
      return resp(200, { model: { n: 1208, r2: 0.888, per_pull: 1.52, per_void: 92, per_limited: 24, trained_at: '2026-11-21 (Demo)' } })
    }

    // Admin invites & users
    if (p === '/api/admin/invites' && method === 'GET') {
      if (!isAdmin) return resp(403, { detail: '需要管理员权限' })
      return resp(200, { items: db.invites })
    }
    if (p === '/api/admin/invites' && method === 'POST') {
      if (!isAdmin) return resp(403, { detail: '需要管理员权限' })
      const role = body.role || 'member'
      const labels = { member: '普通成员', vip: 'VIP 会员', admin: '管理员' }
      const inv = {
        code: genCode(),
        role,
        role_label: labels[role] || role,
        max_uses: Number(body.max_uses || 1),
        used_count: 0,
        expires_at: Number(body.expires_days || 0) > 0 ? '2026-12-01 00:00:00' : null,
        note: String(body.note || ''),
        creator_name: user.username,
        status: 'active',
        redeemed_by: [],
      }
      db.invites.unshift(inv)
      return resp(200, inv)
    }
    const rm = p.match(/^\/api\/admin\/invites\/([^/]+)$/)
    if (rm && method === 'DELETE') {
      if (!isAdmin) return resp(403, { detail: '需要管理员权限' })
      const code = decodeURIComponent(rm[1])
      const inv = db.invites.find((x) => x.code === code)
      if (inv) inv.status = 'revoked'
      return resp(200, { code, status: 'revoked' })
    }
    if (p === '/api/admin/users' && method === 'GET') {
      if (!isAdmin) return resp(403, { detail: '需要管理员权限' })
      return resp(200, { items: db.users })
    }
    const um = p.match(/^\/api\/admin\/users\/(\d+)$/)
    if (um && method === 'PATCH') {
      if (!isAdmin) return resp(403, { detail: '需要管理员权限' })
      const uid = Number(um[1])
      const target = db.users.find((x) => x.id === uid)
      if (!target) return resp(404, { detail: '成员不存在' })
      const activeAdmins = db.users.filter((x) => x.role === 'admin' && x.is_active).length
      if (target.role === 'admin' && target.is_active && ((body.role && body.role !== 'admin') || body.is_active === false) && activeAdmins <= 1) {
        return resp(400, { detail: '系统至少需要保留 1 名在用管理员' })
      }
      if (body.role) target.role = body.role
      if (body.is_active !== undefined) target.is_active = Boolean(body.is_active)
      return resp(200, target)
    }
    if (p.match(/^\/api\/admin\/users\/(\d+)\/(reset-password|kick)$/)) {
      if (!isAdmin) return resp(403, { detail: '需要管理员权限' })
      return resp(200, { ok: true })
    }

    return resp(404, { detail: 'Demo endpoint not implemented: ' + p })
  }
})()
