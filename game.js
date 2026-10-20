'use strict';
/* =========================================================
   LIFE — ひとつの人生   ゲームロジック
   ・1ターン = 1年
   ・行動選択 → 節目イベント → ランダムイベント → 年末処理（収支・老化・寿命判定）
   ========================================================= */

// ---------- ユーティリティ ----------
const $ = s => document.querySelector(s);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const r = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const chance = p => Math.random() < p;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const STATS = ['smarts', 'fitness', 'social', 'creativity', 'happy'];
const LABEL = { smarts: '知力', fitness: '体力', social: '社交', creativity: '創造', happy: '幸福', money: 'お金' };
const STAT_ICON = { smarts: '🧠', fitness: '💪', social: '🤝', creativity: '🎨', happy: '😊' };

// ---------- 性格システム（MBTI風 16タイプ） ----------
const MBTI_TYPES = {
  'INTJ': { name: '建築家', axis: 'INTJ', desc: '戦略的で知的好奇心が旺盛。知力・創造が伸びやすい。', bias: { smarts: 1.25, creativity: 1.15 } },
  'INTP': { name: '論理学者', axis: 'INTP', desc: '独自の着眼点を持つ探求者。知力が抜群に伸びやすい。', bias: { smarts: 1.35, social: 0.85 } },
  'ENTJ': { name: '指揮官', axis: 'ENTJ', desc: '大胆なリーダー。知力と社交力で人の上に立つ。', bias: { smarts: 1.2, social: 1.2 } },
  'ENTP': { name: '討論者', axis: 'ENTP', desc: '機知に富んだ挑戦者。社交と創造でチャンスを掴む。', bias: { creativity: 1.25, social: 1.15 } },
  'INFJ': { name: '提唱者', axis: 'INFJ', desc: '理想主義で洞察力に富む。知力と幸福度が安定しやすい。', bias: { smarts: 1.15, happy: 1.15 } },
  'INFP': { name: '仲介者', axis: 'INFP', desc: '感受性豊かな夢想家。創造と幸福感が伸びやすい。', bias: { creativity: 1.3, fitness: 0.85 } },
  'ENFJ': { name: '主人公', axis: 'ENFJ', desc: '情熱的でカリスマ性がある。社交と幸福度が抜群。', bias: { social: 1.3, happy: 1.1 } },
  'ENFP': { name: '運動家', axis: 'ENFP', desc: '自由奔放で創造的。社交と創造がグングン伸びる。', bias: { social: 1.2, creativity: 1.2 } },
  'ISTJ': { name: '管理者', axis: 'ISTJ', desc: '実務的で極めて誠実。知力と体力が堅実に伸びる。', bias: { smarts: 1.15, fitness: 1.15 } },
  'ISFJ': { name: '擁護者', axis: 'ISFJ', desc: '献身的で温かい。体力と幸福が安定して長寿向き。', bias: { fitness: 1.15, happy: 1.15 } },
  'ESTJ': { name: '幹部', axis: 'ESTJ', desc: '組織をまとめる統率者。体力と社交で出世に強い。', bias: { fitness: 1.2, social: 1.15 } },
  'ESFJ': { name: '領事', axis: 'ESFJ', desc: '社交的で思いやり深い。社交力とお金管理が得意。', bias: { social: 1.3, smarts: 0.9 } },
  'ISTP': { name: '巨匠', axis: 'ISTP', desc: '冷静で実践的な職人肌。体力と創造を兼ね備える。', bias: { fitness: 1.25, creativity: 1.15 } },
  'ISFP': { name: '冒険家', axis: 'ISFP', desc: '柔軟で魅力的な芸術肌。創造と感性が際立つ。', bias: { creativity: 1.25, social: 1.05 } },
  'ESTP': { name: '起業家', axis: 'ESTP', desc: 'エネルギッシュな行動派。体力と社交で道を切り拓く。', bias: { fitness: 1.25, social: 1.2 } },
  'ESFP': { name: 'エンターテイナー', axis: 'ESFP', desc: '場を明るくする人気者。社交と幸福感が常に高い。', bias: { social: 1.3, happy: 1.2 } },
};

function randomMBTI() {
  const e_i = chance(0.5) ? 'E' : 'I';
  const s_n = chance(0.5) ? 'S' : 'N';
  const t_f = chance(0.5) ? 'T' : 'F';
  const j_p = chance(0.5) ? 'J' : 'P';
  return e_i + s_n + t_f + j_p;
}
function mbtiObj(type) {
  return MBTI_TYPES[type] || MBTI_TYPES['ENFP'];
}
const EDU_LABEL = ['なし', '中卒', '高卒', '大卒', '大学院卒'];
const LEVELS = ['一般', '主任', '課長', '部長', '役員'];

// ---------- 受験・進路学校データ（偏差値帯別） ----------
const JH_SCHOOLS = [
  { id: 'elite', name: '難関私立中学校', req: 72, cost: 80, sBonus: 5, desc: '名門中高一貫校（学費80万円/年・知力↑↑）' },
  { id: 'standard', name: '私立中堅中学校', req: 52, cost: 40, sBonus: 2, desc: '学習環境の整った私立校（学費40万円/年・知力↑）' },
  { id: 'public', name: '公立中学校', req: 0, cost: 0, sBonus: 0, desc: '地元の公立中学校（学費無料）' },
];

const HS_SCHOOLS = [
  { id: 'elite', name: '超難関進学校', req: 80, sBonus: 6, desc: '東大・京大・難関大への登竜門' },
  { id: 'advance', name: '上位進学校', req: 64, sBonus: 4, desc: '大学進学実績の高い人気校' },
  { id: 'standard', name: '普通科高校', req: 48, sBonus: 2, desc: '部活と学業を両立できる標準的な高校' },
  { id: 'vocational', name: '商業・工業高校', req: 36, sBonus: 1, desc: '実践的な技術・スキルを身につける実業高校' },
];

const UNI_SCHOOLS = [
  { id: 'top', rank: 3, name: '最難関国公立大学', req: 92, desc: '旧帝大・東大・京大などの頂点（知力90+目安）' },
  { id: 'elite', rank: 2, name: '難関有名大学', req: 75, desc: '早慶・MARCH・関関同立など上位名門校' },
  { id: 'standard', rank: 1, name: '一般大学', req: 55, desc: '標準的な4年制大学' },
  { id: 'easy', rank: 0, name: '新設・中堅大学', req: 38, desc: '比較的合格しやすい私立大学' },
];

const GRAD_SCHOOLS = [
  { id: 'top', rank: 2, name: 'トップ研究科（最難関院）', req: 94, desc: '世界レベルの研究機関・高度専門研究' },
  { id: 'standard', rank: 1, name: '一般大学院研究科', req: 68, desc: '修士号取得を目指す大学院' },
];

function calcExamPassRate(effectiveSmarts, reqSmarts, maxRate = 88) {
  const diff = effectiveSmarts - reqSmarts;
  // 基準値ジャストで50%、1差ごとに約2.8%変動
  const baseRate = Math.round(50 + diff * 2.8);
  return clamp(baseRate, 3, maxRate);
}
const FAMILY = {
  rich: { label: '裕福', text: '裕福な' },
  normal: { label: 'ふつう', text: 'ごく普通の' },
  poor: { label: '貧しい', text: '貧しいながらも温かい' },
};
const FAMILY_NAMES = [
  '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤',
  '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水',
  '山崎', '森', '池田', '橋本', '阿部', '石川', '山下', '中島', '石井', '小川',
  '前田', '岡田', '長谷川', '藤田', '後藤', '近藤', '村上', '遠藤', '青木', '坂本',
  '斉藤', '福田', '西村', '藤井', '金子', '三浦', '岡本', '松田', '中川', '中野'
];

const MALE_NAMES = [
  '蓮', '悠真', '湊', '大和', '颯太', '樹', '律', '陽向', '朝陽', '翔',
  '大翔', '蒼', '悠斗', '陽太', '陸', '奏太', '悠', '結翔', '晴', '仁',
  '颯', '隼人', '翼', '拓海', '駿', '匠', '暖', '一真', '健人', '涼介',
  '海斗', '航平', '太陽', '大河', '蒼空', '怜', '亮', '大輔', '創', '直樹'
];

const FEMALE_NAMES = [
  '結衣', '葵', 'さくら', '凛', '美咲', 'ひなた', '芽依', '紬', '陽菜', '結菜',
  '莉子', '咲良', '結月', '美月', '澪', '心春', '花', '琴音', '杏', '陽葵',
  '結愛', '彩花', '遥', '優奈', '七海', '明日香', '真帆', '栞', '美桜', '茜',
  '莉央', '玲奈', '日和', '小春', '未来', '柚希', '愛梨', '紗良', '菜々美', '綾乃'
];

const GIVEN_NAMES = Array.from(new Set([...MALE_NAMES, ...FEMALE_NAMES]));

const detectGenderFromName = (name) => {
  if (!name) return null;
  const given = name.includes(' ') ? name.split(' ')[1] : name;
  if (FEMALE_NAMES.includes(given)) return 'female';
  if (MALE_NAMES.includes(given)) return 'male';
  return null;
};

const randomName = (gender = 'random') => {
  let g = gender;
  if (!g || g === 'random') g = chance(0.5) ? 'male' : 'female';
  let pool = GIVEN_NAMES;
  if (g === 'male') pool = MALE_NAMES;
  else if (g === 'female') pool = FEMALE_NAMES;
  return `${pick(FAMILY_NAMES)} ${pick(pool)}`;
};

const randomPartner = (playerGender = null, orientation = null) => {
  const pGender = playerGender || (typeof S !== 'undefined' && S ? S.gender : 'other');
  const pOrient = orientation || (typeof S !== 'undefined' && S ? S.orientation : 'hetero');
  let targetGender = 'other';
  if (pOrient === 'hetero') {
    if (pGender === 'male') targetGender = 'female';
    else if (pGender === 'female') targetGender = 'male';
    else targetGender = chance(0.5) ? 'male' : 'female';
  } else if (pOrient === 'homo') {
    if (pGender === 'male') targetGender = 'male';
    else if (pGender === 'female') targetGender = 'female';
    else targetGender = chance(0.5) ? 'male' : 'female';
  } else {
    // 'bi' or other
    targetGender = chance(0.5) ? 'male' : 'female';
  }

  let pool = GIVEN_NAMES;
  if (targetGender === 'male') pool = MALE_NAMES;
  else if (targetGender === 'female') pool = FEMALE_NAMES;

  // プレイヤー本人と同じ名前にならないように除外
  if (typeof S !== 'undefined' && S && S.name) {
    const pGiven = S.name.split(' ')[1] || S.name;
    const filtered = pool.filter(n => n !== pGiven);
    if (filtered.length) pool = filtered;
  }
  return pick(pool) + 'さん';
};

const fmtMoney = m => {
  const sign = m < 0 ? '-' : '';
  const a = Math.abs(m);
  return sign + (a >= 10000 ? (a / 10000).toFixed(a >= 100000 ? 0 : 1) + '億円' : a.toLocaleString() + '万円');
};

// ---------- 職業・才能・資産データ ----------
const JOBS = [
  // 学歴・文理不問
  { name: 'フリーター', base: 180, edu: 0, req: {}, icon: '🧃', desc: '気ままに働く自由人' },
  { name: '工場スタッフ', base: 320, edu: 1, req: { fitness: 35 }, icon: '🏭', corp: true, desc: 'ものづくりの現場を支える' },
  { name: '販売スタッフ', base: 300, edu: 1, req: { social: 38 }, icon: '🛍️', corp: true, desc: '丁寧な接客とコミュニケーション' },
  { name: '料理人', base: 350, edu: 1, req: { fitness: 38, creativity: 30 }, icon: '🍳', desc: '体力と味のセンスを磨く職人' },
  { name: '小説家・漫画家', base: 450, edu: 1, req: { creativity: 65, smarts: 45 }, icon: '🖋️', tracks: ['bun'], desc: '独自の世界観を創り出す' },
  { name: '営業職', base: 420, edu: 2, req: { social: 55, fitness: 40 }, icon: '💼', corp: true, desc: '人脈と提案力で数字を稼ぐ' },
  { name: '公務員', base: 450, edu: 2, req: { smarts: 55, fitness: 35 }, icon: '🏛️', corp: true, desc: '安定した行政サービス' },
  { name: 'デザイナー', base: 450, edu: 3, req: { creativity: 60, smarts: 40 }, icon: '🎨', desc: '視覚表現とブランディング' },
  { name: 'ミュージシャン', base: 480, edu: 0, req: { creativity: 55, social: 35 }, icon: '🎸', desc: '魂の音色と歌声で人々を魅了する' },
  { name: '商社マン', base: 800, edu: 3, req: { smarts: 68, social: 65, fitness: 50 }, icon: '🌏', corp: true, desc: '激務をタフに乗り切るグローバル人材' },

  // 理系向け
  { name: 'エンジニア', base: 550, edu: 3, req: { smarts: 60, creativity: 45 }, icon: '💻', corp: true, tracks: ['ri', 'med'], techOnly: true, desc: 'テクノロジーで課題を解決' },
  { name: '研究開発職', base: 650, edu: 3, req: { smarts: 72, creativity: 50 }, icon: '🧬', corp: true, tracks: ['ri', 'med'], techOnly: true, desc: '最先端の科学技術を探求' },
  { name: 'AI研究者', base: 950, edu: 3, req: { smarts: 82, creativity: 60 }, icon: '🔬', corp: true, tracks: ['ri'], techOnly: true, reqGrad: true, desc: '次世代人工知能の先端開発' },

  // 文系向け
  { name: '弁護士', base: 1100, edu: 3, req: { smarts: 85, social: 55 }, icon: '⚖️', tracks: ['bun'], profOnly: true, desc: '法と正義で依頼者を守る' },

  // 医療系（医歯薬）
  { name: '看護師', base: 480, edu: 3, req: { smarts: 50, fitness: 52, social: 45 }, icon: '🩺', tracks: ['med', 'ri'], profOnly: true, desc: '医療現場で患者に寄り添う' },
  { name: '医師', base: 1300, edu: 3, req: { smarts: 88, fitness: 55, social: 45 }, icon: '🥼', tracks: ['med'], profOnly: true, desc: '高い専門知識と激務に耐える体力' },
];

function trackLabel(track = null) {
  const t = track || (typeof S !== 'undefined' && S ? S.track : null);
  if (t === 'bun') return '文系';
  if (t === 'ri') return '理系';
  if (t === 'med') return '医歯薬系';
  return '';
}
const SPECIAL_JOBS = [
  { name: 'プロスポーツ選手', icon: '🏅' },
  { name: 'ミュージシャン', icon: '🎸' },
  { name: '芸能人', icon: '🌟' },
  { name: '起業家', icon: '🚀' },
  { name: '政治家', icon: '🗳️' },
];

const TRAITS = [
  { id: 'genius', icon: '🧠', name: '天才肌', desc: '知力が伸びやすく、受験や研究に強い' },
  { id: 'iron', icon: '💪', name: '鋼の肉体', desc: '体力が伸びやすく、病気や老化・激務に強い' },
  { id: 'charisma', icon: '✨', name: 'カリスマ', desc: '社交が伸びやすく、人望・営業・選挙に強い' },
  { id: 'lucky', icon: '🍀', name: '強運の持ち主', desc: '受験・起業・投資・宝くじの成功率が上がる' },
  { id: 'artist', icon: '🎨', name: '芸術センス', desc: '創造が伸びやすく、クリエイター職や副業で大活躍' },
  { id: 'beloved', icon: '💕', name: '愛され体質', desc: '社交ボーナス＆恋愛・結婚が成就しやすく夫婦円満' },
  { id: 'merchant', icon: '💰', name: '商才', desc: '給与・副業・不動産の収入が+15%アップ' },
  { id: 'optimist', icon: '☀️', name: 'ポジティブ', desc: '幸福度が上がりやすく、落ち込みにくい' },
  { id: 'absolute_pitch', icon: '🎵', name: '絶対音感', desc: '幼少期の音楽教育で開花。音楽活動や創作で圧倒的な才能を発揮' },
  { id: 'athletic_sense', icon: '⚡', name: '卓越した運動センス', desc: '幼少期から培った体幹と反射神経。スポーツや体力勝負で無類の強さを誇る' },
  { id: 'logical_mind', icon: '💻', name: 'ロジカル思考', desc: '幼少期から育まれた論理的思考力。IT・研究・ビジネスで冴え渡る' },
];

const PARTNER_TRAITS = ['優しい', '知的', '明るい', '堅実', 'ロマンチスト', '頼もしい'];
const PARTNER_JOBS = [
  { name: '会社員', inc: 120 },
  { name: '公務員', inc: 150 },
  { name: '看護師', inc: 160 },
  { name: 'デザイナー', inc: 130 },
  { name: 'エンジニア', inc: 180 },
  { name: 'フリーランス', inc: 110 },
  { name: '経営者', inc: 250 },
];
const HIGH_SCHOOL_PARTNER_ROLES = [
  { name: '高校生（同級生）', inc: 0 },
  { name: '高校生（部活仲間）', inc: 0 },
  { name: '高校生（他クラス）', inc: 0 },
  { name: '高校生（後輩）', inc: 0 },
  { name: '高校生（先輩）', inc: 0 },
  { name: '高校生（他校生）', inc: 0 },
];

function isHighSchoolStudent() {
  return typeof S !== 'undefined' && S && S.student && S.age >= 15 && S.age < 18;
}
function isJuniorHighStudent() {
  return typeof S !== 'undefined' && S && S.student && S.age >= 12 && S.age < 15;
}

const SIDE_JOBS = [
  {
    id: 'writer',
    name: '✍️ Webライティング・事務代行',
    cost: 15,
    minInc: 25,
    maxInc: 55,
    stat: 'smarts',
    trait: 'genius',
    desc: '初期費用が少なく堅実。知力が高いほど案件単価アップ（年約25〜55万円）'
  },
  {
    id: 'creator',
    name: '🎨 デザイン・動画クリエイター',
    cost: 35,
    minInc: 35,
    maxInc: 85,
    stat: 'creativity',
    trait: 'artist',
    desc: '機材投資が必要。創造力が高いと高単価案件を獲得（年約35〜85万円）'
  },
  {
    id: 'reseller',
    name: '🛒 ネット物販・せどり',
    cost: 50,
    minInc: 45,
    maxInc: 100,
    stat: 'social',
    trait: 'merchant',
    desc: '仕入れ資金と社交・交渉力が必要。波はあるが当たれば大きい（年約45〜100万円）'
  }
];

function calcSideJobIncome(side) {
  if (!side) return 0;
  const def = SIDE_JOBS.find(j => j.id === side.id) || SIDE_JOBS[0];
  const statVal = S[def.stat] || 50;
  const statRatio = clamp(statVal / 100, 0.4, 1.3);
  let base = Math.round(def.minInc + (def.maxInc - def.minInc) * (statRatio - 0.4) / 0.9);
  if (hasTrait(def.trait)) base = Math.round(base * 1.25);
  if (hasTrait('merchant')) base = Math.round(base * 1.15);
  // 市場の波（±15%）
  const wave = r(85, 115) / 100;
  return Math.max(10, Math.round(base * wave));
}

const CAT_NAMES = [
  'こむぎ', 'きなこ', 'コテツ', 'モカ', 'マロン', 'ベル', 'レオ', 'ルナ',
  'ソラ', 'ミント', 'チャチャ', 'ココ', 'タマ', 'クロ', 'シロ', 'トラ',
  'あずき', 'おもち', 'ふく', 'ラテ', 'ミケ', 'ぽんず', 'だいふく', 'ハク'
];

const HOBBIES = [
  { id: 'cook', name: '🍳 料理・燻製', icon: '🍳', desc: '食材と火加減を極める手料理（体力・幸福）', bias: 'fitness' },
  { id: 'camp', name: '🏕️ キャンプ・登山', icon: '🏕️', desc: '大自然の中で焚き火と絶景を愛でる（体力・幸福）', bias: 'fitness' },
  { id: 'photo', name: '📷 カメラ・写真', icon: '📷', desc: '光と影を切り取るアート（創造・社交）', bias: 'creativity' },
  { id: 'bonsai', name: '🪴 盆栽・園芸', icon: '🪴', desc: '四季の移ろいを鉢の上に表現する風流（創造・幸福）', bias: 'creativity' },
  { id: 'board', name: '🀄 麻雀・将棋', icon: '🀄', desc: '読みと勝負勘を研ぎ澄ます盤上の勝負（知力・社交）', bias: 'smarts' },
];

const HOUSES = [
  { id: 'country', name: '🌾 田舎の古民家・平屋', price: 800, happy: 2, rentSave: 40, icon: '🌾', desc: '自然に囲まれたスローライフ（生活費削減・毎年 幸福+2・体力+1）' },
  { id: 'condo', name: '🏢 中古マンション', price: 1500, happy: 1, rentSave: 30, icon: '🏢', desc: '家賃が浮き、毎年 幸福+1' },
  { id: 'house', name: '🏡 庭付き一戸建て', price: 3500, happy: 2, rentSave: 50, icon: '🏡', desc: '憧れのマイホーム（毎年 幸福+2）' },
  { id: 'tower', name: '🏙️ 都心タワーマンション', price: 10000, happy: 4, rentSave: 70, icon: '🏙️', desc: '最高の眺望とステータス（毎年 幸福+4・社交+1）' },
];
const CARS = [
  { id: 'compact', name: '🚗 コンパクトカー', price: 200, fx: { happy: 5, social: 2 }, desc: '休日のお出かけが快適に（幸福+5・社交+2）' },
  { id: 'suv', name: '🚙 ファミリーSUV', price: 450, fx: { happy: 8, fitness: 4 }, desc: 'アウトドアや家族旅行に最適（幸福+8・体力+4）' },
  { id: 'supercar', name: '🏎️ 高級スポーツカー', price: 1500, fx: { happy: 14, social: 8, creativity: 5 }, desc: '誰もが羨むスーパーカー（幸福+14・社交+8・創造+5）' },
];
const LUXURY_ITEMS = [
  { id: 'watch', name: '⌚ 高級機械式時計', price: 150, fx: { social: 6, happy: 5 }, desc: '一生モノの名品（社交+6・幸福+5）' },
  { id: 'dog', name: '🐶 愛犬を迎える', price: 40, fx: { happy: 10, fitness: 5 }, flag: 'pet', desc: '毎日の散歩で癒やしと体力（幸福+10・体力+5）' },
  { id: 'villa', name: '🏖️ リゾート別荘', price: 5000, fx: { happy: 18, creativity: 8, social: 6 }, desc: '週末を海辺で過ごす贅沢（幸福+18・創造+8・社交+6・毎年幸福+2）' },
];

// ---------- サウンド（Web Audio API）＆ 倍速設定 ----------
let prefs = { sound: true };
try {
  const sp = JSON.parse(localStorage.getItem('life_sim_prefs') || 'null');
  if (sp) prefs = { sound: sp.sound !== false };
} catch (e) {}

let audioCtx = null;
function playSE(type = 'click') {
  if (!prefs.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const notes = {
      click: [[520, 0.05, 'sine', 0.06]],
      good: [[523, 0.07, 'triangle', 0.08], [659, 0.09, 'triangle', 0.08, 0.06]],
      bad: [[330, 0.09, 'sine', 0.07], [247, 0.14, 'sine', 0.07, 0.08]],
      event: [[587, 0.07, 'sine', 0.07], [880, 0.12, 'sine', 0.07, 0.06]],
      fanfare: [[523, 0.08, 'triangle', 0.09], [659, 0.08, 'triangle', 0.09, 0.07], [784, 0.08, 'triangle', 0.09, 0.14], [1046, 0.22, 'triangle', 0.1, 0.21]],
    }[type] || [[440, 0.05, 'sine', 0.05]];

    notes.forEach(([freq, dur, wave, vol, delay = 0]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(vol, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  } catch (e) {}
}

function applyPrefsUI() {
  document.body.classList.remove('fast-mode');
  const sb = $('#btn-sound');
  if (sb) {
    sb.textContent = prefs.sound ? '🔊 音ON' : '🔇 音OFF';
    sb.classList.toggle('on', prefs.sound);
  }
}
function savePrefs() {
  try { localStorage.setItem('life_sim_prefs', JSON.stringify(prefs)); } catch (e) {}
  applyPrefsUI();
}

// ---------- コレクション・殿堂入りメタデータ ----------
function loadMeta() {
  let res = { ach: {}, jobs: {}, traits: {}, titles: {}, hof: [], totalLives: 0 };
  try {
    const m = JSON.parse(localStorage.getItem('life_sim_meta') || 'null');
    if (m) res = { ach: m.ach || {}, jobs: m.jobs || {}, traits: m.traits || {}, titles: m.titles || {}, hof: m.hof || [], totalLives: m.totalLives || (m.hof ? m.hof.length : 0) };
  } catch (e) {}
  if (!res.hof.length) {
    try {
      const best = JSON.parse(localStorage.getItem('life_sim_best') || 'null');
      if (best && best.name) {
        res.hof.push({
          name: best.name, gen: best.gen || 1, age: best.age || 80,
          score: best.score || 0, rank: best.rank || 'B', title: best.title || '市民', wealth: best.wealth || 0,
        });
      }
    } catch (e) {}
  }
  return res;
}
function saveMeta(m) {
  try { localStorage.setItem('life_sim_meta', JSON.stringify(m)); } catch (e) {}
}
function recordMetaTraitAndJob() {
  if (!S) return;
  const m = loadMeta();
  (S.traits || []).forEach(t => { m.traits[t] = true; });
  if (S.job && S.job.name) m.jobs[S.job.name] = true;
  saveMeta(m);
}


// ---------- 人生アルバム（メモリアルスナップ） ----------
function addAlbumSnap(snap) {
  if (!S) return;
  if (!Array.isArray(S.album)) S.album = [];
  if (S.album.some(s => s.id === snap.id)) return;
  const entry = {
    id: snap.id,
    age: typeof snap.age === 'number' ? snap.age : S.age,
    icon: snap.icon || '📸',
    title: snap.title,
    desc: snap.desc,
    tag: snap.tag || 'メモリアル',
  };
  S.album.push(entry);
  const isModalActive = document.body.classList.contains('modal-open') || !$('#modal')?.hidden;
  if (isModalActive) {
    S._pendingSnap = entry;
  } else {
    toast(`📸 アルバムにスナップ「${snap.title}」を記録！`, []);
  }
  updateAlbumBadge();
}

function updateAlbumBadge() {
  const el = $('#album-badge-count');
  if (el) {
    const count = (S && Array.isArray(S.album)) ? S.album.length : 0;
    el.textContent = `${count}枚`;
  }
}

function renderSnapCardHtml(snap) {
  return `
    <div class="snap-card" data-snap-id="${escapeHtml(snap.id)}">
      <div class="snap-photo">
        <span class="snap-icon">${snap.icon}</span>
      </div>
      <div class="snap-meta">
        <span class="snap-age">${snap.age}歳</span>
        <span class="snap-tag">${escapeHtml(snap.tag)}</span>
      </div>
      <div class="snap-title" title="${escapeHtml(snap.title)}">${escapeHtml(snap.title)}</div>
      <div class="snap-desc">${escapeHtml(snap.desc)}</div>
    </div>
  `;
}

function openAlbumModal() {
  playSE('click');
  const album = (S && Array.isArray(S.album)) ? S.album : [];
  if (!album.length) {
    runEvent({
      badge: 'ALBUM',
      icon: '📸',
      title: '人生アルバム',
      text: 'まだアルバムに写真がありません。人生の節目を迎えると自動で思い出が記録されていきます！',
      choices: [{ label: '閉じる', cancel: true, fn: () => '' }],
    });
    return;
  }

  const cardsHtml = album.map(s => renderSnapCardHtml(s)).join('');
  const html = `
    <p style="font-size:.84rem;color:var(--muted);margin-bottom:8px;">これまでの人生で記録された思い出のスナップ（全${album.length}枚）</p>
    <div class="album-modal-grid">${cardsHtml}</div>
  `;

  runEvent({
    badge: 'ALBUM',
    icon: '📸',
    title: `${S.name}の人生アルバム（${album.length}枚）`,
    html,
    choices: [
      { label: '閉じる', cancel: true, fn: () => '' },
    ],
  });
}

function renderEndAlbum() {
  const box = $('#end-album');
  if (!box) return;
  const album = (S && Array.isArray(S.album)) ? S.album : [];
  if (!album.length) {
    box.innerHTML = `<p style="font-size:.82rem;color:var(--muted);padding:8px;">アルバムの記録がありません。</p>`;
    return;
  }
  box.innerHTML = album.map(s => renderSnapCardHtml(s)).join('');
}

// ---------- 状態 ----------
let S = null;
let busy = false;

function hasTrait(id) {
  return !!(S && Array.isArray(S.traits) && S.traits.includes(id));
}
function traitObj(id) {
  return TRAITS.find(t => t.id === id);
}

function ensureState(s) {
  if (!s) return s;
  if (typeof s.gen !== 'number') s.gen = 1;
  if (!s.gender) s.gender = 'other';
  if (!s.orientation) s.orientation = 'hetero';
  if (!s.mbti) s.mbti = randomMBTI();
  if (!Array.isArray(s.traits) || !s.traits.length) {
    s.traits = shuffle(TRAITS.slice(0, 8)).slice(0, 2).map(t => t.id);
  }
  if (!s.lesson) s.lesson = null;
  if (!s.lastJob) s.lastJob = null;
  if (!s.lastInvestSummary) s.lastInvestSummary = null;
  if (!Array.isArray(s.album)) s.album = [];
  if (!s.hobby) s.hobby = null;
  if (typeof s.hobbyLevel !== 'number') s.hobbyLevel = 0;
  if (typeof s.actedLifestyleYear !== 'number') s.actedLifestyleYear = 0;
  if (!s.club) s.club = null;
  if (!s.hsActivity) s.hsActivity = null;
  if (typeof s.turnActed !== 'boolean') s.turnActed = false;
  if (!s.pendingActionId) s.pendingActionId = null;
  // 旧ステータス(health, looks)からの移行
  if (typeof s.fitness !== 'number') s.fitness = typeof s.health === 'number' ? s.health : 60;
  if (typeof s.social !== 'number') s.social = typeof s.looks === 'number' ? s.looks : 50;
  if (typeof s.creativity !== 'number') s.creativity = typeof s.smarts === 'number' ? Math.round(s.smarts * 0.85) : 50;
  if (typeof s.smarts !== 'number') s.smarts = 50;
  if (typeof s.happy !== 'number') s.happy = 65;

  if (typeof s.partnerLove !== 'number') s.partnerLove = s.partner ? 70 : 0;
  if (s.partner && !s.partnerInfo) {
    s.partnerInfo = { trait: pick(PARTNER_TRAITS), job: pick(PARTNER_JOBS) };
  }
  const parentGiven = (s.name || '').split(' ')[1] || s.name || '';
  if (!Array.isArray(s.kids)) s.kids = [];
  s.kids = s.kids.map(k => typeof k === 'number'
    ? { name: pick(GIVEN_NAMES.filter(n => n !== parentGiven) || GIVEN_NAMES), birth: k, smarts: r(40, 65), supported: false, job: null, stage7: true, stage18: false, indep: false }
    : k);
  if (!s.assets) {
    s.assets = { house: s.flags && s.flags.house ? 'house' : null, car: null, items: [], stock: 0, estate: 0 };
  }
  if (!Array.isArray(s.assets.items)) s.assets.items = [];
  if (typeof s.assets.stock !== 'number') s.assets.stock = 0;
  if (typeof s.assets.estate !== 'number') s.assets.estate = 0;
  if (s.sideJob === undefined) s.sideJob = null;
  else if (s.sideJob && typeof s.sideJob.level === 'number' && !s.sideJob.id) {
    s.sideJob = { id: 'writer', name: '✍️ Webライティング・事務代行' };
  }
  if (s.jh === undefined) s.jh = null;
  if (s.uni === undefined) s.uni = null;
  if (s.gradSchool === undefined) s.gradSchool = null;
  if (typeof s.ronin !== 'number') s.ronin = 0;
  if (typeof s.gradYears !== 'number') s.gradYears = 0;
  if (s.track === undefined) s.track = null;
  if (typeof s.actedLoveYear !== 'number') s.actedLoveYear = -1;
  if (typeof s.actedCareerYear !== 'number') s.actedCareerYear = -1;
  if (typeof s.lastWorldYear !== 'number') s.lastWorldYear = -99;
  if (typeof s.lastColdYear !== 'number') s.lastColdYear = -99;
  if (!s.worldHistory) s.worldHistory = {};
  if (!Array.isArray(s.history)) s.history = [{ age: s.age || 0, happy: s.happy || 60, fitness: s.fitness || 60, wealth: s.money || 0 }];
  return s;
}

function formatEduString() {
  if (typeof S === 'undefined' || !S) return 'なし';
  const tL = trackLabel();
  const tStr = tL ? `・${tL}` : '';
  if (S.student) return stageLabel();
  if (S.edu === 4) return `大学院卒（${S.gradSchool || '修士'}${tStr}）`;
  if (S.edu === 3) return `大卒（${S.uni || (S.uniRank >= 2 ? '難関大学' : '一般大学')}${tStr}）`;
  if (S.edu === 2) return `高卒（${S.hs || '高校'}${tStr}）`;
  if (S.edu === 1) return `中卒（${S.jh || '中学'}）`;
  return 'なし';
}

function newLife(name, gender = 'random', orientation = 'hetero') {
  let finalGender = gender;
  if (!finalGender || finalGender === 'random') {
    finalGender = chance(0.5) ? 'male' : 'female';
  }
  const finalOrientation = orientation || 'hetero';

  let fam = chance(0.2) ? 'rich' : chance(0.75) ? 'normal' : 'poor';
  let initMoney = fam === 'rich' ? 50 : 0;
  let gen = 1;
  let traits = shuffle(TRAITS).slice(0, chance(0.45) ? 2 : 1).map(t => t.id);
  let house = null;
  let bonusStat = 0;
  const mbti = randomMBTI();

  S = ensureState({
    name, gender: finalGender, orientation: finalOrientation,
    age: 0, gen, mbti, traits, family: fam, album: [],
    smarts: clamp(r(20, 36) + (fam === 'rich' ? 4 : 0) + (traits.includes('genius') ? 8 : 0) + bonusStat),
    fitness: clamp(r(24, 38) + (traits.includes('iron') ? 10 : 0)),
    social: clamp(r(22, 38) + (traits.includes('charisma') ? 8 : 0) + bonusStat),
    creativity: clamp(r(22, 38) + (traits.includes('artist') ? 10 : 0)),
    happy: clamp(r(62, 78) + (traits.includes('optimist') ? 8 : 0)),
    money: initMoney,
    edu: 0, student: false, jh: null, hs: null, track: null, uni: null, uniRank: 0, gradSchool: null, ronin: 0, gradYears: 0,
    job: null, retired: false, sideJob: null,
    partner: null, partnerLove: 0, partnerInfo: null, married: false, kids: [],
    assets: { house, car: null, items: [], stock: 0, estate: 0 },
    actedLoveYear: -1, actedCareerYear: -1,
    lastWorldYear: -99, worldHistory: {},
    lastColdYear: -99,
    flags: house ? { house: true } : {}, once: {}, happySum: 0, years: 0, log: [],
    history: [], tmp: null, cause: null,
  });
  S.history = [{ age: 0, happy: S.happy, fitness: S.fitness, wealth: totalWealth() }];
  recordMetaTraitAndJob();
}

function setPartner(name, love = 65, specificJob = null) {
  S.partner = name;
  addAlbumSnap({ id: 'first_love', age: S.age, icon: '💕', title: '運命の恋人成立', desc: `${name}と気持ちが通じ合い、特別な関係がスタートした！`, tag: '恋愛' });
  S.partnerLove = clamp(love + (hasTrait('beloved') ? 10 : 0));
  let jobObj = specificJob;
  if (!jobObj) {
    if (isHighSchoolStudent()) {
      jobObj = pick(HIGH_SCHOOL_PARTNER_ROLES);
    } else if (isJuniorHighStudent()) {
      jobObj = { name: '中学生（同級生）', inc: 0 };
    } else if (S && S.student && S.age >= 18) {
      const studentJobs = [
        { name: '大学生（同級生）', inc: 30 },
        { name: '大学生（他大学）', inc: 30 },
        ...PARTNER_JOBS
      ];
      jobObj = pick(studentJobs);
    } else {
      jobObj = pick(PARTNER_JOBS);
    }
  }
  S.partnerInfo = {
    trait: pick(PARTNER_TRAITS),
    job: jobObj,
  };
}

function addKid() {
  const parentGiven = (S.name || '').split(' ')[1] || S.name || '';
  const used = [...S.kids.map(k => k.name), parentGiven];
  const pool = GIVEN_NAMES.filter(n => !used.includes(n));
  const kName = pick(pool.length ? pool : GIVEN_NAMES.filter(n => n !== parentGiven) || GIVEN_NAMES);
  const kid = {
    name: kName,
    birth: S.age,
    smarts: clamp(r(35, 65) + Math.round(S.smarts * 0.2)),
    supported: false,
    job: null,
    stage7: false,
    stage18: false,
    indep: false,
  };
  S.kids.push(kid);
  if (S.kids.length === 1) {
    addAlbumSnap({ id: 'first_baby', age: S.age, icon: '👶', title: '我が子の誕生', desc: `「${kid.name}」を腕に抱き、親としての新たな人生が始まった。`, tag: '家族' });
  }
  return kid;
}

function fx(obj) {
  const mbti = S && S.mbti ? mbtiObj(S.mbti) : null;
  const bias = mbti ? mbti.bias : {};

  for (const rawK in obj) {
    let k = rawK;
    // 古いステータスキーの互換性マッピング
    if (k === 'health') k = 'fitness';
    if (k === 'looks') k = 'social';

    let v = obj[rawK];
    if (k === 'money') {
      S.money += v;
    } else {
      // 才能補正
      if (k === 'smarts' && v > 0 && hasTrait('genius')) v = Math.ceil(v * 1.35);
      if (k === 'fitness' && v > 0 && hasTrait('iron')) v = Math.ceil(v * 1.35);
      if (k === 'fitness' && v < 0 && hasTrait('iron')) v = Math.ceil(v * 0.65);
      if (k === 'social' && v > 0 && hasTrait('charisma')) v = Math.ceil(v * 1.35);
      if (k === 'creativity' && v > 0 && hasTrait('artist')) v = Math.ceil(v * 1.35);
      if (k === 'happy' && v > 0 && hasTrait('optimist')) v = Math.ceil(v * 1.3);
      if (k === 'happy' && v < 0 && hasTrait('optimist')) v = Math.ceil(v * 0.7);

      // 性格（MBTI）補正
      if (v > 0 && bias[k]) {
        v = Math.round(v * bias[k]);
      }

      // 80以上の「プロの壁・伸び悩み（逓減）」: 80を超えると練習によるステータス上昇が緩やかに
      if (v > 0 && S[k] !== undefined && S[k] >= 80) {
        v = Math.max(1, Math.floor(v * 0.45));
      }

      if (S[k] !== undefined) {
        S[k] = clamp(S[k] + v);
      }
    }
  }
}
const snap = () => ({ smarts: S.smarts, fitness: S.fitness, social: S.social, creativity: S.creativity, happy: S.happy, money: S.money });
const diff = b => Object.keys(b).map(k => ({ k, v: S[k] - b[k] })).filter(x => x.v !== 0);
const chipsHTML = d => d.map(x =>
  `<span class="chip ${x.k} ${x.v > 0 ? 'up' : 'down'}">${STAT_ICON[x.k] || (x.k === 'money' ? '💰' : '')} ${LABEL[x.k]} ${x.v > 0 ? '+' : ''}${x.v}${x.k === 'money' ? '万' : ''}</span>`).join('');

function setJob(j) {
  S.job = { name: j.name, base: j.base, level: 0, corp: !!j.corp, icon: j.icon };
  S.retired = false;
  S.lastJob = { name: j.name, icon: j.icon, level: 0 };
  recordMetaTraitAndJob();
}
// 公的年金計算（65歳以降、生涯支給）
const pension = () => {
  if (!S || S.age < 65) return 0;
  let p = 75; // 国民基礎年金（約75万円/年）
  if (S.edu >= 4) p += 35; // 大卒厚生年金加算
  if (S.flags && (S.flags.executive || S.flags.ceo)) p += 50; // 役員・高所得者加算
  else if (S.job) p += 25;
  return p; // 約100万〜185万円/年
};

const salary = () => {
  if (!S.job) return 0;
  let raw = S.job.base * (1 + S.job.level * 0.3) * (hasTrait('merchant') ? 1.15 : 1);
  // 役職定年（60歳以上の再雇用は給与65%）
  if (S.reemployed) raw *= 0.65;
  // 顧問・名誉職への移行（給与50%）
  if (S.advisor) raw *= 0.50;
  return Math.round(raw);
};
const jobTitle = () => {
  if (!S.job) {
    if (S.retired) return S.lastJob ? `元・${S.lastJob.name}` : '退職済み（シニア）';
    return S.student ? '学生' : '無職';
  }
  return S.job.corp && S.job.level > 0 ? `${S.job.name}（${LEVELS[S.job.level]}）` : S.job.name;
};

function stage() {
  const a = S.age;
  if (a < 3) return 'baby';
  if (a < 6) return 'kid';
  if (S.student) {
    if (a < 12) return 'elem';
    if (a < 18) return S.ronin ? 'jobless' : 'teen';
    return S.ronin ? 'jobless' : 'college';
  }
  if (S.retired) return 'senior';
  if (S.job && S.job.name === 'プロスポーツ選手') return 'athlete';
  if (S.job && S.job.name === 'ミュージシャン') return 'musician';
  return S.job ? 'worker' : 'jobless';
}
function stageLabel() {
  if (S.ronin) return `大学受験浪人生（${S.ronin}浪目）`;
  const st = stage();
  if (st === 'athlete') return 'プロアスリート';
  if (st === 'musician') return 'ミュージシャン';
  if (st === 'elem') return '小学生';
  if (st === 'teen') {
    if (S.age < 15) return S.jh ? `中学生（${S.jh}）` : '中学生';
    return `高校生（${S.hs || '高校'}）`;
  }
  if (st === 'college') {
    if (S.gradSchool) return `大学院生（${S.gradSchool}）`;
    if (S.uni) return `大学生（${S.uni}）`;
    return S.uniRank >= 2 ? '大学生（難関大）' : '大学生';
  }
  return { baby: '赤ちゃん', kid: '幼児', elem: '小学生', worker: '社会人', athlete: 'プロアスリート', jobless: '求職中', senior: 'セカンドライフ' }[st];
}

function currentOccupationBadge() {
  if (S.ronin) return `📚 浪人生（${S.ronin}浪目）`;
  const st = stage();
  if (st === 'baby') return '🍼 赤ちゃん';
  if (st === 'kid') return '⚽ 幼児';
  if (st === 'elem') return '🎒 小学生';
  if (st === 'teen') {
    if (S.age < 15) return S.jh ? `🏫 中学生（${S.jh}）` : '🏫 中学生';
    return S.hs ? `🎓 高校生（${S.hs}）` : '🎓 高校生';
  }
  if (st === 'college') {
    if (S.gradSchool) return `🎓 大学院生（${S.gradSchool}）`;
    if (S.uni) return `🎓 大学生（${S.uni}）`;
    return S.uniRank >= 2 ? '🎓 大学生（難関大）' : '🎓 大学生';
  }
  if (S.retired) return S.lastJob ? `🕊️ 年金生活（元・${S.lastJob.name}）` : '🕊️ 年金生活';
  if (S.job) {
    const icon = S.job.icon || '💼';
    return `${icon} ${jobTitle()}`;
  }
  return '🔍 求職中';
}

// ---------- 行動 ----------
const ACTIONS = {
  baby: [
    { icon: '🍼', label: 'すくすく育つ', desc: '寝て、泣いて、笑って。', fn() { fx({ fitness: r(1, 3), smarts: r(0, 2), happy: r(0, 2) }); return pick(['はじめて寝返りをうった！', '家族に囲まれ、すくすく育った。', 'はじめて言葉を話した！', 'よちよち歩きを始めた。', 'たくさん笑って、たくさん眠った。']); } },
  ],
  kid: [
    { icon: '⚽', label: '外で元気に遊ぶ', desc: '体力↑ 幸福↑', fn() { fx({ fitness: r(2, 4), happy: r(1, 3) }); return '公園を走り回って遊んだ。'; } },
    { icon: '📚', label: '絵本を読む', desc: '知力↑ 創造↑', fn() { fx({ smarts: r(2, 4), creativity: r(1, 3) }); return '絵本の世界に夢中になった。'; } },
    { icon: '🖍️', label: 'お絵かき・ブロック', desc: '創造↑↑', fn() { fx({ creativity: r(3, 5), happy: r(1, 2) }); return '夢中で絵や工作をつくった。'; } },
    { icon: '🏠', label: '家族と過ごす', desc: '幸福↑↑ 社交↑', fn() { fx({ happy: r(3, 5), social: r(1, 2) }); return '家族と穏やかな時間を過ごした。'; } },
  ],
  elem: [
    {
      icon: '⚽', label: 'サッカースクールで特訓', desc: '体力↑↑ 運動センス開花',
      cond: () => S.lesson === 'soccer',
      fn() {
        fx({ fitness: r(2, 4), happy: r(1, 2) });
        S.sportSkill = (S.sportSkill || 0) + 1;
        if (!hasTrait('athletic_sense') && chance(0.20 + S.fitness / 200)) {
          S.traits.push('athletic_sense');
          playSE('fanfare');
          return '華麗なドリブルで相手をごぼう抜き！卓越した運動センスに目覚めた！（スポーツ基礎 Lv.' + S.sportSkill + '）';
        }
        return '雨の日も泥だらけになってシュート練習を重ねた！足腰が着実に強くなる！（スポーツ基礎 Lv.' + S.sportSkill + '）';
      }
    },
    {
      icon: '🎹', label: 'ピアノの練習・発表会曲', desc: '創造↑↑ 絶対音感開花',
      cond: () => S.lesson === 'piano',
      fn() {
        fx({ creativity: r(2, 4), smarts: r(1, 2), happy: r(1, 2) });
        S.musicSkill = (S.musicSkill || 0) + 1;
        if (!hasTrait('absolute_pitch') && chance(0.20 + S.creativity / 200)) {
          S.traits.push('absolute_pitch');
          playSE('fanfare');
          return '街のクラクションや鳥のさえずりがドレミで聴こえる！「絶対音感」が開花した！（音楽基礎 Lv.' + S.musicSkill + '）';
        }
        return '難しいクラシックの課題曲をノーミスで弾ききった！先生から絶賛！（音楽基礎 Lv.' + S.musicSkill + '）';
      }
    },
    {
      icon: '💻', label: 'キッズプログラミング', desc: '知力↑↑ ロジカル思考開花',
      cond: () => S.lesson === 'coding',
      fn() {
        fx({ smarts: r(2, 4), creativity: r(1, 2), happy: r(1, 2) });
        S.techSkill = (S.techSkill || 0) + 1;
        if (!hasTrait('logical_mind') && chance(0.20 + S.smarts / 200)) {
          S.traits.push('logical_mind');
          playSE('fanfare');
          return '複雑なアルゴリズムの仕組みを直感的に理解！「ロジカル思考」が開花した！（IT基礎 Lv.' + S.techSkill + '）';
        }
        return '自作のミニゲームを完成させた！友達に遊んでもらって大好評！（IT基礎 Lv.' + S.techSkill + '）';
      }
    },
    {
      icon: '🎨', label: '絵画教室で創作', desc: '創造↑↑ 芸術センス開花',
      cond: () => S.lesson === 'art',
      fn() {
        fx({ creativity: r(2, 4), happy: r(1, 3) });
        S.artSkill = (S.artSkill || 0) + 1;
        if (!hasTrait('artist') && chance(0.18 + S.creativity / 200)) {
          S.traits.push('artist');
          playSE('fanfare');
          return '豊かな色彩と構図で審査員を唸らせた！「芸術センス」に目覚めた！（創作基礎 Lv.' + S.artSkill + '）';
        }
        return 'キャンバスに思い描いた世界を自由に描き、コンクールに出品した！（創作基礎 Lv.' + S.artSkill + '）';
      }
    },
    {
      icon: '🏕️', label: '仲間と秘密基地づくり', desc: '社交↑↑ 幸福↑↑',
      cond: () => S.lesson === 'free',
      fn() {
        fx({ social: r(2, 4), happy: r(3, 5) });
        return '裏山に廃材を集めて最高の秘密基地を作った！かけがえのない友情が芽生えた。';
      }
    },
    { icon: '✏️', label: '勉強する', desc: '知力↑↑ 幸福↓', fn() { fx({ smarts: r(2, 3), happy: -1 }); return 'コツコツ勉強に励んだ。'; } },
    { icon: '🏃', label: '運動する', desc: '体力↑↑ 社交↑', fn() { fx({ fitness: r(2, 3), social: r(0, 1) }); return 'スポーツで汗を流した。'; } },
    { icon: '🤝', label: '友達と遊ぶ', desc: '社交↑↑ 幸福↑', fn() { fx({ social: r(2, 3), happy: r(2, 3) }); return '友達と毎日のように遊んだ。'; } },
    { icon: '🎨', label: '工作・読書・創作', desc: '創造↑↑ 知力↑', fn() { fx({ creativity: r(2, 3), smarts: 1 }); return '自由な発想で創作を楽しんだ。'; } },
    { icon: '🎮', label: 'ゲームをする', desc: '幸福↑ 体力↓', fn() { fx({ happy: r(2, 3), smarts: r(-1, 1), fitness: -1 }); return 'ゲームに熱中した。'; } },
  ],
  teen: [
    {
      icon: '⚽', label: '強豪運動部で猛特訓', desc: '体力↑↑ スカウト注目度UP',
      cond: () => S.club === 'sports',
      fn() {
        fx({ fitness: r(3, 5), social: r(1, 2), happy: r(1, 2) });
        S.sportSkill = (S.sportSkill || 0) + 1;
        const scoutBonus = S.sportSkill >= 3 ? 0.2 : 0;
        if (chance(0.18 + S.fitness / 300 + scoutBonus)) {
          S.flags.athlete_star = true;
          playSE('fanfare');
          return '県大会で圧巻のスーパープレーを連発！観客を沸かせスカウト評価が急上昇！（部活練度 Lv.' + S.sportSkill + '）';
        }
        return '朝練から居残りまで走り込み！強靭なスタミナと根性が身についた！（部活練度 Lv.' + S.sportSkill + '・スカウト注目度UP）';
      }
    },
    {
      icon: '🎸', label: '軽音・バンド活動に没頭', desc: '創造↑↑ デビューへの道',
      cond: () => S.club === 'music',
      fn() {
        fx({ creativity: r(3, 5), social: r(1, 3), happy: r(2, 3) });
        S.musicSkill = (S.musicSkill || 0) + 1;
        const talentBonus = S.musicSkill >= 3 ? 0.2 : 0;
        if (chance(0.18 + S.creativity / 300 + talentBonus)) {
          S.flags.music_talent = true;
          playSE('fanfare');
          return 'オリジナル曲をライブで初披露！会場中が一体となる熱狂の渦を生み出した！（音楽練度 Lv.' + S.musicSkill + '）';
        }
        return 'スタジオに籠もってリフとボーカルを徹底練習！新曲のレパートリーが増えた！（音楽練度 Lv.' + S.musicSkill + '）';
      }
    },
    {
      icon: '💻', label: '自作アプリ・IT開発', desc: '知力↑↑ 起業・開発への道',
      cond: () => S.club === 'tech',
      fn() {
        fx({ smarts: r(3, 5), creativity: r(1, 2) });
        S.techSkill = (S.techSkill || 0) + 1;
        if (chance(0.18 + S.smarts / 300 + (S.techSkill >= 3 ? 0.2 : 0))) {
          S.flags.tech_geek = true;
          playSE('fanfare');
          return '開発した便利アプリがSNSで大拡散！数万ダウンロードを突破！（開発練度 Lv.' + S.techSkill + '）';
        }
        return '最新のプログラミング言語をマスターし、Webサービスを形にした！（開発練度 Lv.' + S.techSkill + '）';
      }
    },
    {
      icon: '🎨', label: '同人誌・イラスト創作', desc: '創造↑↑ 幸福↑ クリエイターへの道',
      cond: () => S.club === 'art',
      fn() {
        fx({ creativity: r(3, 5), happy: r(2, 3) });
        S.artSkill = (S.artSkill || 0) + 1;
        if (chance(0.18 + S.creativity / 300 + (S.artSkill >= 3 ? 0.2 : 0))) {
          S.flags.art_talent = true;
          playSE('fanfare');
          return 'ネットに投稿したイラストが大バズり！人気クリエイターとして認知！（創作練度 Lv.' + S.artSkill + '）';
        }
        return 'ペンタブを握りしめ、自分だけの世界観を描き殴った！（創作練度 Lv.' + S.artSkill + '）';
      }
    },
    { icon: '📖', label: '勉強に打ち込む', desc: '知力↑↑↑ 幸福↓', fn() { fx({ smarts: r(4, 6), happy: -r(1, 3) }); return '机にかじりついて勉強した。'; } },
    { icon: '🏀', label: '気軽にスポーツを楽しむ', desc: '体力↑↑ 社交↑', cond: () => !S.club || S.club === 'study', fn() { fx({ fitness: r(3, 5), social: r(1, 3), happy: r(1, 2) }); return '友達と放課後の校庭でスポーツを楽しんだ！'; } },
    { icon: '🎨', label: '創作・趣味を極める', desc: '創造↑↑↑', cond: () => !S.club || S.club === 'study' || S.club === 'sports', fn() { fx({ creativity: r(4, 6), happy: r(1, 2) }); return '自分の世界を広げる創作に没頭した。'; } },
    { icon: '🤝', label: '仲間と青春を謳歌', desc: '社交↑↑ 幸福↑↑', fn() { fx({ social: r(3, 5), happy: r(4, 6), smarts: -r(0, 2) }); return '友達と最高の思い出を作った。'; } },
    { icon: '🍔', label: 'アルバイト', desc: 'お金↑ 体力↓', cond: () => S.age >= 16, fn() { fx({ money: r(30, 60), fitness: -1, social: 1 }); return 'アルバイトでお小遣いを稼いだ。'; } },
  ],
  college: [
    {
      icon: '🎓', label: '学業・研究に励む', desc: '知力↑↑↑',
      fn() {
        fx({ smarts: r(4, 7) });
        return S.gradSchool ? '大学院で先端研究と論文執筆に没頭した！' : '講義とゼミの研究に打ち込んだ。';
      }
    },
    { icon: '🎸', label: 'サークル・創作活動', desc: '創造↑↑ 社交↑', cond: () => !S.gradSchool, fn() { fx({ creativity: r(3, 5), social: r(2, 4), happy: r(3, 5) }); return 'サークル仲間と作品や企画に熱中した。'; } },
    { icon: '🥂', label: '合コン・人脈づくり', desc: '社交↑↑↑ お金↓', fn() { fx({ social: r(4, 6), money: -15, happy: r(2, 4) }); return '新しい出会いや人脈を広げた。'; } },
    { icon: '☕', label: 'アルバイト', desc: 'お金↑↑ 体力↓', fn() { fx({ money: r(80, 130), fitness: -1 }); return 'バイトでお金を稼いだ。'; } },
    { icon: '🏋️', label: '筋トレ・体力作り', desc: '体力↑↑ 幸福↑', fn() { fx({ fitness: r(3, 5), happy: r(1, 2), money: -10 }); return 'ジムに通って体力を鍛え上げた。'; } },
  ],
  worker: [
    {
      icon: '🔥', label: '仕事に励む', desc: '昇進・昇給のチャンス｜体力消費', fn() {
        // 激務による体力と幸福のコスト
        fx({ fitness: -r(2, 4), happy: -r(1, 2) });

        // 過労リスク：体力が30未満で無理して働くと体調不良・医療費
        if (S.fitness < 30 && chance(0.35)) {
          fx({ fitness: -r(5, 8), happy: -6, money: -25 });
          playSE('bad');
          return '激務がたたり過労でダウン…！通院と療養を余儀なくされた。（医療費 -25万円）';
        }

        const j = S.job;

        // 起業家（上限5,000万円、成長率は12〜15%に抑制）
        if (j.name === '起業家') {
          const cap = 5000;
          if (j.base < cap && chance(0.18 + (hasTrait('merchant') ? 0.08 : 0) + S.social / 500)) {
            const rate = j.base > 2000 ? 1.08 : 1.14;
            j.base = Math.min(cap, Math.round(j.base * rate));
            fx({ happy: 4 });
            playSE('fanfare');
            return '新規事業が軌道に乗り、着実に業績を伸ばした！';
          }
          if (chance(0.08)) {
            j.base = Math.max(200, Math.round(j.base * 0.88));
            fx({ happy: -3 });
            return '市場環境の変化により業績がやや落ち込んだ…';
          }
          return '会社経営に全力を注いだ。';
        }

        // ミュージシャン（上限2,800万円）
        if (j.name === 'ミュージシャン') {
          const cap = 2800;
          if (j.base < cap && chance(0.18 + S.creativity / 400 + (hasTrait('charisma') ? 0.1 : 0))) {
            const rate = j.base > 1500 ? 1.07 : 1.13;
            j.base = Math.min(cap, Math.round(j.base * rate));
            fx({ happy: 5, creativity: 2 });
            playSE('fanfare');
            return '新曲が音楽番組の注目曲に選ばれ、知名度とギャラがアップした！';
          }
          return 'ライブ活動と地道な曲作りに打ち込んだ。';
        }

        // 小説家・漫画家（上限3,000万円）
        if (j.name === '小説家・漫画家') {
          const cap = 3000;
          if (j.base < cap && chance(0.20 + S.creativity / 400 + (hasTrait('artist') ? 0.1 : 0))) {
            const rate = j.base > 1500 ? 1.07 : 1.13;
            j.base = Math.min(cap, Math.round(j.base * rate));
            fx({ happy: 5, creativity: 2 });
            playSE('fanfare');
            return '連載が好評を博し、単行本の重版が決まった！';
          }
          return '原稿と向き合い、執筆に打ち込んだ。';
        }

        // 一般企業員（昇進ペースの適正化）
        if (j.corp && j.level < 4 && chance(0.08 + (S.smarts + S.social) / 1000 + (hasTrait('lucky') ? 0.05 : 0))) {
          j.level++; fx({ happy: 5 }); if (j.level >= 3) S.flags.executive = true;
          playSE('fanfare');
          return `日頃の実績が評価され、昇進して${LEVELS[j.level]}になった！`;
        }

        // 個人専門職・自由業（上限1,800万円、小幅昇給+4%）
        if (!j.corp) {
          const cap = 1800;
          if (j.base < cap && chance(0.20 + S.creativity / 450)) {
            j.base = Math.min(cap, Math.round(j.base * 1.04));
            fx({ happy: 2 });
            return '確かな仕事ぶりでリピート案件が増加し、少し単価が上がった！';
          }
        }

        return '仕事に全力を注いだ。';
      }
    },
    { icon: '🌇', label: '定時で帰る', desc: '幸福↑↑ 体力↑', fn() { fx({ happy: r(3, 5), fitness: r(0, 2) }); return 'プライベートを大切にした。'; } },
    { icon: '📘', label: '自己投資・資格', desc: '知力↑↑ お金↓', fn() { fx({ smarts: r(2, 4), money: -30 }); return '資格の勉強やセミナーに通った。'; } },
    { icon: '🤝', label: '人脈開拓・会食', desc: '社交↑↑ お金↓', fn() { fx({ social: r(3, 5), money: -25, happy: 1 }); return '社外の勉強会や交流会に参加した。'; } },
    { icon: '🥗', label: '健康管理・ジム', desc: '体力↑↑', fn() { fx({ fitness: r(3, 5), money: -10 }); return 'ジム通いと自炊を習慣にした。'; } },
    { icon: '🥂', label: '贅沢をする', desc: '幸福↑↑↑ お金↓↓', fn() { fx({ happy: r(5, 8), money: -r(80, 150) }); return '高級レストランや買い物を満喫した。'; } },
    { icon: '🔄', label: '転職活動', desc: '新しい職場を探す', fn() { return { text: '転職活動を始めた。', then: jobHuntEvent() }; } },
  ],
  athlete: [
    {
      icon: '🏟️', label: '試合で結果を出す', desc: '年俸更改・成績向上のチャンス',
      fn() {
        fx({ fitness: -r(2, 4) });
        const j = S.job;
        const perfRoll = S.fitness + (hasTrait('iron') ? 15 : 0) + (hasTrait('lucky') ? 10 : 0) + r(0, 30);
        const injuryChance = hasTrait('iron') ? 0.04 : 0.09;

        if (chance(injuryChance)) {
          fx({ fitness: -r(5, 8), happy: -5 });
          playSE('bad');
          return 'シーズン中に激しい接触で負傷…長期離脱となり苦しいリハビリを余儀なくされた。';
        }
        if (perfRoll >= 95) {
          j.base = Math.round(j.base * (1.3 + (hasTrait('lucky') ? 0.1 : 0)));
          fx({ happy: 8, social: 3 });
          playSE('fanfare');
          return `シーズンMVP・主要タイトルを獲得！大歓声を浴び、年俸が ${fmtMoney(salary())} に大幅アップ！`;
        }
        if (perfRoll >= 65) {
          j.base = Math.round(j.base * 1.12);
          fx({ happy: 4 });
          playSE('good');
          return `主力選手としてチームの勝利に大きく貢献！活躍が評価され年俸が ${fmtMoney(salary())} に上がった！`;
        }
        fx({ happy: -2 });
        return '相手の厳しいマークと不調に苦しみ、思うような結果を残せない悔しいシーズンとなった。';
      }
    },
    {
      icon: '🏋️', label: '肉体改造・猛特訓', desc: '体力↑↑ 幸福↓',
      fn() {
        fx({ fitness: r(4, 7), happy: -r(1, 3) });
        return '極限まで肉体を追い込み、強靭なフィジカルと研ぎ澄まされた技術を手に入れた！';
      }
    },
    {
      icon: '🧘', label: '徹底的なボディケア', desc: '体力↑↑ 幸福↑ お金↓',
      fn() {
        fx({ fitness: r(3, 5), happy: r(3, 5), money: -20 });
        return '専属トレーナーによるマッサージや食事管理で、万全のコンディションを整えた。';
      }
    },
    {
      icon: '📺', label: 'メディア・ファン交流', desc: '社交↑↑ 幸福↑ お金↑',
      fn() {
        const bonus = r(40, 90);
        fx({ social: r(3, 5), happy: r(2, 4), money: bonus });
        return `スポーツ番組やファン感謝イベントに出演！スポンサー料や出演料（+${fmtMoney(bonus)}）を得た！`;
      }
    },
    {
      icon: '🥂', label: '祝勝会で贅沢をする', desc: '幸福↑↑↑ お金↓↓',
      fn() {
        fx({ happy: r(6, 9), money: -r(80, 160) });
        return 'チームメイトたちと高級店で美酒に酔いしれ、勝利の喜びに浸った！';
      }
    },
    {
      icon: '👟', label: '現役引退・転身', desc: 'スパイクを脱ぎ、新たな道へ',
      confirm: '本当に現役を引退しますか？\n（プロスポーツ選手としてのキャリアを終え、新しい仕事を探します）',
      fn() {
        const bonus = Math.round(salary() * 0.6);
        fx({ money: bonus, happy: 2 });
        S.job = null;
        playSE('good');
        return {
          text: `ファンや仲間に惜しまれつつ現役引退を発表した。特別功労金 ${fmtMoney(bonus)} を受け取り、新たな人生へ進む！`,
          then: jobHuntEvent()
        };
      }
    },
  ],
  musician: [
    {
      icon: '🎵', label: '新曲の作詞・作曲', desc: '創造↑↑ 知力↑ 名曲誕生の予感',
      fn() {
        fx({ creativity: r(3, 6) + (hasTrait('artist') ? 2 : 0) + (hasTrait('absolute_pitch') ? 3 : 0), smarts: r(1, 3), fitness: -1 });
        if (chance(0.25 + S.creativity / 300)) {
          fx({ happy: 6 });
          playSE('fanfare');
          return '魂を揺さぶる至高のメロディが降りてきた！文句なしの自信作が完成！';
        }
        return 'ピアノとギターを抱え、夜を徹して新曲のデモテープを練り上げた。';
      }
    },
    {
      icon: '🎤', label: '全国ライブツアー', desc: '社交↑↑ 体力↓ ファン急増・臨時ボーナス',
      fn() {
        const bonus = Math.round(salary() * r(0.3, 0.7));
        fx({ social: r(3, 6) + (hasTrait('charisma') ? 2 : 0), fitness: -r(2, 4), happy: r(3, 6), money: bonus });
        playSE('good');
        return `熱狂の全国ツアーを完走！会場の一体感に鳥肌が立った！特別興行収入（+${fmtMoney(bonus)}）を獲得！`;
      }
    },
    {
      icon: '💿', label: 'アルバムリリース', desc: '運と実力で大ヒット判定！一攫千金',
      fn() {
        fx({ fitness: -2 });
        const eff = S.creativity + S.social + (hasTrait('absolute_pitch') ? 25 : 0) + (hasTrait('lucky') ? 15 : 0);
        if (chance(0.20 + eff / 400)) {
          const hitMoney = Math.round(salary() * r(1.8, 3.5));
          fx({ money: hitMoney, happy: 10, social: 5 });
          if (S.job) S.job.base = Math.round(S.job.base * 1.3);
          playSE('fanfare');
          return `アルバムがオリコン週間1位を獲得＆ミリオンセラー達成！街中に自分の歌が鳴り響く！（印税 +${fmtMoney(hitMoney)}）`;
        }
        const modest = Math.round(salary() * 0.4);
        fx({ money: modest, happy: 2 });
        return `ニューアルバムをリリース。熱心なファンに支えられ手堅いヒットとなった。（印税 +${fmtMoney(modest)}）`;
      }
    },
    {
      icon: '📺', label: 'フェス・テレビ出演', desc: '社交↑ 幸福↑ 知名度UP',
      fn() {
        const bonus = Math.round(salary() * 0.25);
        fx({ social: r(2, 5), happy: r(3, 5), money: bonus });
        return `大型夏フェスや音楽番組に出演！観客の大歓声を浴びて知名度がさらに上がった！（出演料 +${fmtMoney(bonus)}）`;
      }
    },
    {
      icon: '👟', label: '音楽活動休止・転身', desc: '楽器を置き、新しい道へ',
      confirm: '本当に音楽活動に一区切りをつけますか？\n（プロミュージシャンとしてのキャリアを終え、新しい仕事を探します）',
      fn() {
        const bonus = Math.round(salary() * 0.5);
        fx({ money: bonus, happy: 2 });
        S.job = null;
        playSE('good');
        return {
          text: `万雷の拍手の中、ラストライブを終えて活動休止を発表した。新たな人生へ進む！（功労金 +${fmtMoney(bonus)}）`,
          then: jobHuntEvent()
        };
      }
    }
  ],
  jobless: [
    {
      icon: '📖', label: '受験勉強に専念する', desc: '知力↑↑↑ 幸福↓',
      cond: () => !!S.ronin,
      fn() { fx({ smarts: r(6, 10), happy: -2, fitness: -1 }); return '予備校と自習室に籠もり、必死で受験勉強に打ち込んだ！'; }
    },
    { icon: '📝', label: '就職活動', desc: '仕事を探す', cond: () => !S.ronin, fn() { return { text: '就職活動に励んだ。', then: jobHuntEvent() }; } },
    { icon: '🚧', label: '日雇いバイト', desc: 'お金↑ 体力↓', fn() { fx({ money: r(60, 120), fitness: -2 }); return S.ronin ? '予備校代を稼ぐためバイトをした。' : '日雇いの仕事で食いつないだ。'; } },
    { icon: '🛋️', label: 'のんびり過ごす', desc: '幸福↑ 知力↓', fn() { fx({ happy: r(2, 4), smarts: -1 }); return '何もせずのんびり過ごした。'; } },
    { icon: '📚', label: '資格の勉強', desc: '知力↑↑', cond: () => !S.ronin, fn() { fx({ smarts: r(3, 5), money: -10 }); return '再起を目指して勉強した。'; } },
  ],
  senior: [
    { icon: '📖', label: '読書・脳トレに励む', desc: '知力↑↑ 幸福↑', fn() { fx({ smarts: r(3, 6), happy: r(2, 4) }); return '名著を読み耽り、脳トレで知的好奇心を刺激した。頭がスッキリ冴えわたる！'; } },
    { icon: '🌿', label: '毎朝の体操・健康づくり', desc: '体力↑↑ 幸福↑', fn() { fx({ fitness: r(3, 6), happy: r(2, 4) }); return 'ラジオ体操とストレッチで足腰を鍛えた。まだまだ現役の元気さだ！'; } },
    { icon: '🎨', label: '趣味・創作を楽しむ', desc: '幸福↑↑ 創造↑', fn() { fx({ happy: r(3, 6) + (hasTrait('artist') ? 2 : 0), creativity: r(2, 4) }); return '趣味に没頭する充実した日々。豊かな感性が研ぎ澄まされる。'; } },
    {
      icon: '☕', label: '地域交流・ボランティア', desc: '社交↑↑ 幸福↑', fn() {
        const fam = (S.married ? 1 : 0) + S.kids.length;
        fx({ happy: r(3, 6), social: r(3, 5) });
        return fam ? '家族や地域の仲間と語らい、温かい絆を感じた。' : '地域のボランティア活動で頼りにされ、生きがいを感じた。';
      }
    },
    { icon: '🧳', label: 'のんびり温泉・旅行', desc: '幸福↑↑↑ お金↓', fn() { fx({ money: -r(40, 90), happy: r(7, 12) }); return '名湯に浸かり、これまでの豊かな人生を噛みしめた。'; } },
  ],
};

// ---------- 就職活動・転職活動 ----------
function jobHuntEvent() {
  const isMidCareer = !!(S.job && S.job.name !== 'フリーター');
  const currentJobName = S.job ? S.job.name : null;

  const uniBonus = (S.uniRank === 3 ? 18 : S.uniRank === 2 ? 12 : S.uniRank === 1 ? 6 : 0)
    + (S.edu >= 4 ? 14 : 0)
    + (hasTrait('genius') ? 8 : 0);
  const socBonus = hasTrait('charisma') ? 10 : 0;
  const fitBonus = hasTrait('iron') ? 8 : 0;
  const creBonus = hasTrait('artist') ? 10 : 0;

  const checkJobEligibility = j => {
    const reasons = [];

    // 1. 学歴要件
    if (S.edu < j.edu) {
      reasons.push(`要: ${EDU_LABEL[j.edu]}以上`);
    }

    // 2. ステータス要件（新マルチステータス判定）
    const req = j.req || {};
    if (req.smarts && S.smarts + uniBonus < req.smarts) {
      reasons.push(`要: 知力${req.smarts}（現在${S.smarts}）`);
    }
    if (req.social && S.social + socBonus < req.social) {
      reasons.push(`要: 社交${req.social}（現在${S.social}）`);
    }
    if (req.fitness && S.fitness + fitBonus < req.fitness) {
      reasons.push(`要: 体力${req.fitness}（現在${S.fitness}）`);
    }
    if (req.creativity && S.creativity + creBonus < req.creativity) {
      reasons.push(`要: 創造${req.creativity}（現在${S.creativity}）`);
    }

    // 3. 転職（中途採用）時の現実的フィルタリング
    if (isMidCareer) {
      if (j.profOnly) {
        if (j.name === '医師' && currentJobName !== '医師') reasons.push('要: 医師経験（中途未経験不可）');
        if (j.name === '弁護士' && currentJobName !== '弁護士') reasons.push('要: 弁護士経験（中途未経験不可）');
        if (j.name === '看護師' && currentJobName !== '看護師' && currentJobName !== '医師') reasons.push('要: 看護師経験（中途未経験不可）');
      }
      if (j.name === 'AI研究者') {
        const canResearch = ['AI研究者', 'エンジニア', '研究開発職'].includes(currentJobName) || (S.edu >= 4 && S.track === 'ri');
        if (!canResearch) reasons.push('要: 技術職経験または理系院卒');
      }
      if (j.techOnly) {
        const isTechCareer = ['エンジニア', 'AI研究者', '研究開発職'].includes(currentJobName);
        const isScienceGrad = S.track === 'ri' || S.track === 'med' || S.hs === '商業・工業高校';
        if (!isTechCareer && !isScienceGrad) reasons.push('要: 技術職経験または理系専攻');
      }
    }

    // 4. 文系・理系の専攻フィルタリング（新卒および未経験時）
    if (j.tracks && j.tracks.length) {
      const myTrack = S.track;
      const matchesTrack = myTrack && j.tracks.includes(myTrack);
      const isVocationalTech = S.hs === '商業・工業高校' && j.tracks.includes('ri');
      const isAlreadyInJob = currentJobName === j.name;

      if (!matchesTrack && !isVocationalTech && !isAlreadyInJob) {
        const trackNames = j.tracks.map(t => trackLabel(t)).join('/');
        reasons.push(`要: ${trackNames}専攻`);
      }
    }

    // 5. 大学院修了要件（AI研究者）
    if (j.reqGrad && S.edu < 4 && S.uniRank < 3 && currentJobName !== j.name) {
      reasons.push('要: 大学院修了');
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
  };

  // 全職業をチェック（フリーター以外）
  const evaluatedJobs = JOBS.filter(j => j.name !== 'フリーター').map(j => {
    const res = checkJobEligibility(j);
    return {
      job: j,
      eligible: res.eligible,
      reasons: res.reasons
    };
  });

  // 選べる職業（内定獲得）を年収降順でソート
  const availableList = evaluatedJobs.filter(x => x.eligible).sort((a, b) => b.job.base - a.job.base);
  // 選べない職業（ロック）を年収降順でソート
  const lockedList = evaluatedJobs.filter(x => !x.eligible).sort((a, b) => b.job.base - a.job.base);

  const choices = [];

  // 1. 選べる職業（光るボタン）
  availableList.forEach(({ job: j }) => {
    let diffHtml = '';
    if (S.job && S.job.base) {
      const diffVal = j.base - salary();
      const diffClass = diffVal > 0 ? 'up' : diffVal < 0 ? 'down' : '';
      diffHtml = `<span class="job-income-diff ${diffClass}">（現在比 ${diffVal >= 0 ? '+' : ''}${fmtMoney(diffVal)}）</span>`;
    }
    const isSameJob = S.job && S.job.name === j.name;
    const badgeText = isSameJob ? '現在の職種（同業他社）' : '✨ 内定獲得！';
    const badgeClass = isSameJob ? 'current' : 'offer';

    choices.push({
      className: 'job-offer',
      html: `
        <div class="job-card-top">
          <div class="job-card-title">${j.icon} ${j.name}</div>
          <div class="job-card-income">${fmtMoney(j.base)}/年${diffHtml}</div>
        </div>
        ${j.desc ? `<div class="job-card-desc">${j.desc}</div>` : ''}
        <div class="job-badge-row">
          <span class="job-status-badge ${badgeClass}">${badgeText}</span>
        </div>
      `,
      confirm: () => S.job ? `現在の仕事「${jobTitle()}（年収 ${fmtMoney(salary())}）」を辞めて、「${j.name}（年収 ${j.base}万円）」へ転職しますか？` : '',
      fn() {
        setJob(j);
        fx({ happy: 4 });
        playSE('good');
        return isMidCareer
          ? `転職成功！【${j.name}】としての新たなキャリアをスタートした！`
          : `内定承諾！【${j.name}】として社会人の第一歩を踏み出した！`;
      }
    });
  });

  // 2. 選べない職業（暗いロックボタン）
  lockedList.forEach(({ job: j, reasons }) => {
    choices.push({
      className: 'job-locked',
      disabled: true,
      html: `
        <div class="job-card-top">
          <div class="job-card-title">${j.icon} ${j.name}</div>
          <div class="job-card-income">${fmtMoney(j.base)}/年</div>
        </div>
        ${j.desc ? `<div class="job-card-desc">${j.desc}</div>` : ''}
        <div class="job-badge-row">
          ${reasons.map(r => `<span class="job-req-badge">🔒 ${r}</span>`).join('')}
        </div>
      `,
      fn() {}
    });
  });

  // 3. フリーター（誰でも選べるセーフティネット）
  choices.push({
    className: 'choice-freeter',
    label: '🧃 フリーターになる（年収 180万円）',
    sub: '学歴・経歴不問 ｜ 気ままに働く自由人',
    confirm: () => S.job && S.job.name !== 'フリーター' ? `現在の仕事「${jobTitle()}（年収 ${fmtMoney(salary())}）」を辞めて、フリーター（年収 180万円）になりますか？` : '',
    danger: !!(S.job && S.job.name !== 'フリーター'),
    fn() { setJob(JOBS[0]); return 'フリーターとして気ままに働くことにした。'; }
  });

  // 4. 今の仕事を続ける（キャンセルボタン：フッター固定）
  if (S.job) {
    choices.push({ label: '今の仕事を続ける（転職を見送る）', cancel: true, fn: () => '転職は見送り、現在の職場でキャリアを継続することにした。' });
  }

  const titleText = isMidCareer ? '🔄 転職活動' : '📨 就職活動';
  const mainText = availableList.length
    ? (isMidCareer
      ? `学歴・専攻（${formatEduString()}）とキャリアを評価され、${availableList.length}社から中途内定を獲得！転職先を選択しよう。`
      : `就職活動の結果、学歴・専攻（${formatEduString()}）と実力で${availableList.length}社から内定を獲得！どこに就職する？`)
    : (isMidCareer
      ? '希望求人の採用基準に届かなかった…。現在の仕事を続けよう。'
      : '今回の就職活動では正社員の内定が出なかった…フリーターなどで経験を積もう。');

  return {
    icon: isMidCareer ? '🔄' : '📨',
    title: titleText,
    text: mainText,
    choices,
  };
}

function payTuition(type = 'uni', rank = 1) {
  if (S.family === 'rich') return '学費は裕福な両親が全額支援してくれた。';
  if (type === 'jh') {
    if (rank >= 2) {
      if (S.family === 'normal') { fx({ money: -60 }); return '私立中学の学費を家計から工面してもらった。'; }
      fx({ money: -120 }); return '苦しい家計の中で無理して私立中学に通わせてもらった。';
    }
    return '';
  }
  if (type === 'grad') {
    if (S.family === 'normal') { fx({ money: -150 }); return '大学院の学費の一部を自分で工面した。'; }
    fx({ money: -300 }); return '大学院の学費と生活費を奨学金で賄うことにした。';
  }
  // 大学
  if (rank >= 3) { // 国公立
    if (S.family === 'normal') return '国公立大学のため学費が抑えられ、両親が支援してくれた！';
    fx({ money: -150 }); return '奨学金を借りて国公立大学に進学した。';
  }
  if (rank === 2) { // 難関私立
    if (S.family === 'normal') { fx({ money: -250 }); return '私立大学の学費の一部を自分で負担することに。'; }
    fx({ money: -450 }); return '多額の奨学金を借りて私立大学に進学した。';
  }
  if (S.family === 'normal') { fx({ money: -200 }); return '学費の一部を自分で負担することに。'; }
  fx({ money: -400 }); return '奨学金を借りて進学した。';
}

// ---------- 人生の節目 ----------
// 習い事選択イベント
function chooseLessonEvent() {
  return {
    icon: '🎨', title: '放課後の習い事選び', badge: '小学校入学',
    text: 'ピカピカのランドセルを背負って春から小学生！\n放課後の時間を何に使って自分の可能性を伸ばす？',
    choices: [
      {
        label: '⚽ サッカースクール・水泳教室に通う',
        sub: '体力↑↑｜運動センス開花のチャンス',
        fn() {
          S.lesson = 'soccer';
          addAlbumSnap({ id: 'lesson_soccer', age: S.age, icon: '⚽', title: 'サッカースクール開始', desc: '放課後はグラウンドを駆け回り、強い足腰と反射神経を鍛え始めた！', tag: '才能' });
          fx({ fitness: 5, happy: 2 });
          return 'ボールを追いかけ、プールで泳ぎ、強い足腰と反射神経を鍛え始めた！';
        }
      },
      {
        label: '🎹 ピアノ・音楽教室に通う',
        sub: '創造↑↑ 知力↑｜絶対音感開花のチャンス',
        fn() {
          S.lesson = 'piano';
          addAlbumSnap({ id: 'lesson_piano', age: S.age, icon: '🎹', title: 'ピアノ教室に通い始める', desc: '澄んだ美しい音色に魅せられ、毎日の練習に夢中になり始めた！', tag: '才能' });
          fx({ creativity: 5, smarts: 2, happy: 2 });
          return '鍵盤に触れると澄んだ音が響く！毎日楽しそうにピアノの前に座り始めた。';
        }
      },
      {
        label: '💻 キッズプログラミング教室に通う',
        sub: '知力↑↑ 創造↑｜ロジカル思考開花のチャンス',
        fn() {
          S.lesson = 'coding';
          addAlbumSnap({ id: 'lesson_coding', age: S.age, icon: '💻', title: 'プログラミング学習開始', desc: 'ブロックを組み立ててプログラムが動いた感動に目を輝かせた！', tag: '才能' });
          fx({ smarts: 6, creativity: 2, happy: 1 });
          return '画面の中のパズルやブロックコードを動かせた！論理的な発想に夢中になった！';
        }
      },
      {
        label: '🎨 お絵かき・造形教室に通う',
        sub: '創造↑↑ 幸福↑｜芸術センス開花のチャンス',
        fn() {
          S.lesson = 'art';
          addAlbumSnap({ id: 'lesson_art', age: S.age, icon: '🎨', title: '造形・お絵かき教室開始', desc: 'キャンバスに色彩豊かな自由な世界を描き、先生に褒められた！', tag: '才能' });
          fx({ creativity: 6, happy: 3 });
          return '絵の具と粘土で自由な世界を表現！先生にもその豊かな色彩を褒められた！';
        }
      },
      {
        label: '🏕️ 習い事はせず、友達と自由に外遊び！',
        sub: '社交↑↑ 幸福↑↑｜たくましい社会性',
        fn() {
          S.lesson = 'free';
          fx({ social: 6, happy: 5 });
          return '放課後のチャイムと同時に公園へ直行！泥だらけになって仲間と遊び尽くした！';
        }
      }
    ]
  };
}

// 部活動選択イベント
function chooseClubEvent() {
  return {
    icon: '🏫', title: '中学校の部活動選び', badge: '中学校入学',
    text: '春からいよいよ中学生！\n3年間、放課後の青春のエネルギーを何に捧げる？',
    choices: [
      {
        label: '⚽ 運動部（サッカー/野球/バスケ/陸上）',
        sub: '体力↑↑ 社交↑｜プロアスリートへの第一歩',
        fn() {
          S.club = 'sports';
          addAlbumSnap({ id: 'club_sports', age: S.age, icon: '⚽', title: '中学校の運動部に入部', desc: '先輩たちの迫力あるプレーに圧倒されつつ、厳しい練習に食らいつき始めた！', tag: '青春' });
          if (S.lesson === 'soccer' || hasTrait('athletic_sense')) {
            fx({ fitness: 6, social: 3, happy: 4 });
            S.flags.sports_regular = true;
            return '小学生からの経験が活き、1年生にして即レギュラー抜擢！チームの中心選手に！';
          }
          fx({ fitness: 5, social: 2, happy: 2 });
          return '先輩たちの迫力に圧倒されつつ、厳しい練習に食らいつき始めた！';
        }
      },
      {
        label: '🎷 吹奏楽部・軽音楽部（音楽系）',
        sub: '創造↑↑ 社交↑｜バンド・音楽家への道',
        fn() {
          S.club = 'music';
          addAlbumSnap({ id: 'club_music', age: S.age, icon: '🎷', title: '吹奏楽・軽音楽部に入部', desc: '光り輝く楽器を手にして、仲間と音を重ねる楽しさに目覚めた！', tag: '青春' });
          if (S.lesson === 'piano' || hasTrait('absolute_pitch')) {
            fx({ creativity: 6, social: 3, happy: 4 });
            S.flags.music_talent = true;
            return '抜群の音感とリズム感で即パートリーダーに指名！周囲の憧れの的に！';
          }
          fx({ creativity: 5, happy: 3 });
          return '初めて持つ楽器のピカピカの輝きに感動！夢中で基礎練習を始めた。';
        }
      },
      {
        label: '💻 パソコン・科学部（IT系）',
        sub: '知力↑↑ 創造↑｜エンジニア・起業への道',
        fn() {
          S.club = 'tech';
          addAlbumSnap({ id: 'club_tech', age: S.age, icon: '💻', title: 'パソコン・科学部に入部', desc: '放課後のPCルームに籠もり、仲間と未知のコードの世界へ没頭した！', tag: '青春' });
          if (S.lesson === 'coding' || hasTrait('logical_mind')) {
            fx({ smarts: 6, creativity: 3, happy: 3 });
            S.flags.tech_geek = true;
            return '自作プログラムの腕前を披露し、部内No.1の天才ハッカーとして一目置かれた！';
          }
          fx({ smarts: 5, happy: 2 });
          return '部室のパソコンでプログラミングと電子工作の基礎を学び始めた！';
        }
      },
      {
        label: '🎨 美術部・文芸同好会（創作系）',
        sub: '創造↑↑ 幸福↑｜クリエイターへの道',
        fn() {
          S.club = 'art';
          addAlbumSnap({ id: 'club_art', age: S.age, icon: '🎨', title: '美術・アート部に入部', desc: '油絵の具と石膏像に囲まれ、自分だけの表現を追い求め始めた！', tag: '青春' });
          if (S.lesson === 'art' || hasTrait('artist')) {
            fx({ creativity: 6, happy: 4 });
            S.flags.art_talent = true;
            return 'コンクール出品作の下描きを見て顧問の先生が大絶賛！';
          }
          fx({ creativity: 5, happy: 2 });
          return '静かな部室で油絵やデッサンに没頭する心地よい時間を手に入れた。';
        }
      },
      {
        label: '📖 帰宅部（受験勉強特化・自由時間）',
        sub: '知力↑↑ 幸福↑｜高校受験対策',
        fn() {
          S.club = 'study';
          fx({ smarts: 6, happy: 3 });
          return '部活には入らず塾通いに集中！難関高校合格に向けてコツコツと学力を蓄えた！';
        }
      }
    ]
  };
}

function milestone(a) {
  // 5歳（6歳になる春）：小学校入学 ＆ 習い事選び
  if (a === 5) {
    addAlbumSnap({
      id: 'elem_enter', age: 6, icon: '🎒',
      title: '小学校入学式',
      desc: 'ピカピカのランドセルを背負い、期待と不安を胸に校門をくぐった。',
      tag: '学校'
    });
    return {
      icon: '🎒', title: '小学校入学', text: 'ピカピカのランドセルを背負って、春から小学生！',
      choices: [{
        label: 'いってきます！',
        fn() {
          S.student = true;
          fx({ happy: 3 });
          return {
            text: '新しい友達がたくさんできた。',
            then: chooseLessonEvent()
          };
        }
      }]
    };
  }

  // 6歳以降で習い事がまだ未設定の場合のフォールバック
  if (a >= 6 && a <= 10 && S.student && !S.lesson) {
    return chooseLessonEvent();
  }

  // 11歳：中学進学（中学受験の選択 ＆ 合格/進学と同時に部活動選びへ）
  if (a === 11 && S.student) {
    const choices = [];
    JH_SCHOOLS.forEach(sch => {
      if (sch.id === 'public') {
        choices.push({
          label: `🏫 ${sch.name}に進学する（学費無料）`,
          fn() {
            S.jh = sch.name;
            fx({ happy: 2 });
            return {
              text: '地元の公立中学校に進学した。',
              then: chooseClubEvent()
            };
          }
        });
      } else {
        const eff = S.smarts + (hasTrait('genius') ? 6 : 0) + (hasTrait('lucky') ? 4 : 0);
        const maxR = sch.id === 'elite' ? 76 : 88;
        const rate = calcExamPassRate(eff, sch.req, maxR);
        choices.push({
          label: `📝 ${sch.name}を受験する（合格率 ${rate}% ｜ ${sch.desc}）`,
          fn() {
            if (chance(rate / 100)) {
              S.jh = sch.name;
              fx({ happy: 7, smarts: sch.sBonus });
              playSE('fanfare');
              return {
                text: `見事合格！${sch.name}に入学した！ ${payTuition('jh', sch.id === 'elite' ? 2 : 1)}`,
                then: chooseClubEvent()
              };
            }
            S.jh = '公立中学校';
            fx({ happy: -4 });
            playSE('bad');
            return {
              text: '惜しくも不合格…。地元の公立中学校に進学した。',
              then: chooseClubEvent()
            };
          }
        });
      }
    });
    return {
      icon: '🏫', title: '中学進路・受験選択',
      text: '小学6年生。\n中学受験に挑戦するか、地元の公立中学校に進学するか決める時がきた。',
      choices
    };
  }

  // 12歳（中1）時点で部活がまだ未選択の場合のフォールバック
  if (a >= 12 && a <= 14 && S.student && !S.club) {
    return chooseClubEvent();
  }

  // 13歳（中2〜中3）：中学部活・活動の集大成大会
  if (a === 13 && S.student && S.club) {
    if (S.club === 'sports') {
      const isStar = (S.fitness >= 55 || (S.sportSkill && S.sportSkill >= 2) || hasTrait('athletic_sense') || S.flags.sports_regular);
      return {
        icon: '🏅', title: '中総体・都道府県大会の激闘', badge: '中学生の集大成',
        text: '3年間の汗と涙の結晶。全国につながる大舞台の幕が上がった！',
        choices: [{
          label: '全力で勝利を目指す！',
          fn() {
            if (isStar && chance(0.65)) {
              S.flags.athlete_star = true;
              fx({ fitness: 5, happy: 8, social: 4 });
              playSE('fanfare');
              return '神がかったプレー連発でチームを県大会優勝へ導いた！強豪高校の推薦スカウトの視線を集めた！';
            }
            fx({ fitness: 3, social: 3, happy: 3 });
            return '惜しくも敗れたが、チームメイトと抱き合い涙した。一生ものの友情と根性を得た！';
          }
        }]
      };
    } else if (S.club === 'music') {
      const isMusician = (S.creativity >= 55 || (S.musicSkill && S.musicSkill >= 2) || hasTrait('absolute_pitch') || S.flags.music_talent);
      return {
        icon: '🎺', title: '全日本コンクール ＆ 文化祭ライブ', badge: '中学生の集大成',
        text: 'ホールに響く調律の音。全校生徒が詰めかけた文化祭ステージ！',
        choices: [{
          label: '魂を込めて演奏する！',
          fn() {
            if (isMusician && chance(0.65)) {
              S.flags.music_talent = true;
              fx({ creativity: 5, happy: 8, social: 4 });
              playSE('fanfare');
              return 'コンクールで金賞を受賞！文化祭ライブでは全校生徒のアンコールを巻き起こし一躍ヒーローに！';
            }
            fx({ creativity: 3, happy: 4 });
            return 'スポットライトを浴びて演奏しきった！音楽で人の心を揺さぶる快感を知った！';
          }
        }]
      };
    } else if (S.club === 'tech') {
      return {
        icon: '💻', title: 'U-15 ジュニアプログラミングコンテスト', badge: '中学生の集大成',
        text: '自作アプリやWebサービスを全国のITコンテストへ応募した！',
        choices: [{
          label: '結果発表を待つ',
          fn() {
            if (S.smarts >= 60 || hasTrait('logical_mind') || S.flags.tech_geek) {
              S.flags.tech_geek = true;
              fx({ smarts: 6, happy: 8 });
              playSE('fanfare');
              return '見事全国優秀賞を受賞！ネットでも「中学生が作った神アプリ」と話題になった！';
            }
            fx({ smarts: 4, happy: 3 });
            return '入選を果たし、全国の同年代の技術者たちと刺激的な交流を持てた！';
          }
        }]
      };
    } else if (S.club === 'art') {
      return {
        icon: '🎨', title: '都道府県学生美術展・同人出展', badge: '中学生の集大成',
        text: '半年かけて描き上げた大作を美術展に出品した！',
        choices: [{
          label: '審査結果を見届ける',
          fn() {
            if (S.creativity >= 60 || hasTrait('artist') || S.flags.art_talent) {
              S.flags.art_talent = true;
              fx({ creativity: 6, happy: 8 });
              playSE('fanfare');
              return '知事賞・特選を受賞！美術館に自分の絵が堂々と飾られ、記念写真を撮った！';
            }
            fx({ creativity: 4, happy: 3 });
            return '佳作入選！来場者から「素敵な絵ですね」と声をかけられ誇らしかった。';
          }
        }]
      };
    }
  }

  // 14歳：高校受験（複数の偏差値帯から選択）
  if (a === 14 && S.student) {
    const jhBonus = S.jh === '難関私立中学校' ? 8 : S.jh === '私立中堅中学校' ? 4 : 0;
    const choices = HS_SCHOOLS.map(sch => {
      const eff = S.smarts + jhBonus + (hasTrait('genius') ? 6 : 0) + (hasTrait('lucky') ? 4 : 0);
      const maxR = sch.id === 'elite' ? 78 : sch.id === 'advance' ? 88 : 95;
      const rate = calcExamPassRate(eff, sch.req, maxR);
      return {
        label: `📝 ${sch.name}を受験する（合格率 ${rate}% ｜ ${sch.desc}）`,
        fn() {
          if (chance(rate / 100)) {
            S.hs = sch.name;
            fx({ happy: 6, smarts: sch.sBonus });
            playSE('fanfare');
            return `見事合格！${sch.name}に入学した！`;
          }
          // 不合格時は滑り止め（1ランク下）へ
          const nextDown = HS_SCHOOLS.find(h => h.req < sch.req) || HS_SCHOOLS[HS_SCHOOLS.length - 1];
          S.hs = nextDown.name;
          fx({ happy: -4 });
          playSE('bad');
          return `不合格…。滑り止めの「${nextDown.name}」に進学することになった。`;
        }
      };
    });
    choices.push({
      label: '💼 中学卒業後、就職する',
      confirm: '高校へは進学せず、中卒のまま就職しますか？\n（後から高校・大学へ進学することはできなくなります）',
      danger: true,
      fn() { S.student = false; S.edu = 1; return { text: '社会に出ることにした。', then: jobHuntEvent() }; }
    });
    return {
      icon: '📝', title: '高校受験・進路選択',
      text: '中学3年生。\n自分の学力と将来を見据え、受験する高校を選択しよう。',
      choices
    };
  }

  // 15歳：高校での文理選択
  if (a === 15 && S.student && S.hs && !S.track) {
    if (S.hs === '商業・工業高校') {
      return {
        icon: '🛠️', title: '専門学科・専攻コース選択',
        badge: '高校1年生',
        text: '実業高校での専攻コースを決める時期がきた。\n実践的な技術・スキルを磨く分野を選択しよう。',
        choices: [
          {
            label: '💻 工業・IT・情報技術コース（理系・技術系）',
            sub: 'プログラミングや工学技術を学び、エンジニアや研究・技術職を目指す',
            fn() {
              S.track = 'ri';
              fx({ smarts: 3, happy: 2 });
              return '【情報技術コース】を選択！現場で役立つIT・技術スキルを徹底的に学ぶ！';
            }
          },
          {
            label: '📊 商業・簿記・ビジネスコース（文系・実務系）',
            sub: '会計・ビジネス法務を学び、営業職・事務職・公務員を目指す',
            fn() {
              S.track = 'bun';
              fx({ smarts: 2, happy: 2 });
              return '【商業ビジネスコース】を選択！資格取得やビジネス実務を身につける！';
            }
          }
        ]
      };
    }
    return {
      icon: '🧭', title: '高校での文理選択',
      badge: '高校1年生',
      text: '高校でのこれからの履修コースを決める「文理選択」の時期がやってきた。\n自分の得意分野や将来の大学進学・職業を見据えてコースを選択しよう。',
      choices: [
        {
          label: '📚 文系コース（国語・地歴公民・英語中心）',
          sub: '営業・公務員・商社・出版・法律（弁護士）などを目指す',
          fn() {
            S.track = 'bun';
            fx({ smarts: 2, happy: 2 });
            return '【文系コース】を選択！社会科学や言語・教養を深く学んでいく！';
          }
        },
        {
          label: '🔬 理系コース（数学・理科・情報中心）',
          sub: 'エンジニア・研究開発・IT・AI研究者などを目指す',
          fn() {
            S.track = 'ri';
            fx({ smarts: 3, happy: 2 });
            return '【理系コース】を選択！高度な数学や物理・化学、プログラミングを探求していく！';
          }
        },
        {
          label: '🩺 医歯薬・医療系コース（超難関・数理特化）',
          sub: '医師・看護師・医療専門職を目指す（ハイレベルな学力が必要）',
          fn() {
            S.track = 'med';
            fx({ smarts: 4, happy: 1 });
            return '【医歯薬コース】を選択！将来の医師・医療従事者を目指し、徹底した猛勉強を開始する！';
          }
        }
      ]
    };
  }

  // 大学受験イベントジェネレータ（現役17歳 / 浪人18歳以降共通）
  const getUniExamEvent = (isRonin = false) => {
    if (!S.track) S.track = 'bun'; // 文理未選択時のフォールバック
    const hsBonus = S.hs === '超難関進学校' ? 8 : S.hs === '上位進学校' ? 4 : S.hs === '普通科高校' ? 1 : 0;
    const roninBonus = S.ronin ? Math.min(S.ronin * 6, 12) : 0;
    const trackSuffix = S.track === 'med' ? '（医学・医療系）' : S.track === 'ri' ? '（理工・情報系）' : '（法・文・経済系）';

    const choices = UNI_SCHOOLS.map(sch => {
      const eff = S.smarts + hsBonus + roninBonus + (hasTrait('genius') ? 6 : 0) + (hasTrait('lucky') ? 4 : 0);
      const maxR = sch.rank === 3 ? 78 : sch.rank === 2 ? 88 : sch.rank === 1 ? 95 : 98;
      const rate = calcExamPassRate(eff, sch.req, maxR);
      const uniFullName = `${sch.name}${trackSuffix}`;
      return {
        label: `🎓 ${uniFullName}を受験する（合格率 ${rate}% ｜ ${sch.desc}）`,
        fn() {
          if (chance(rate / 100)) {
            S.student = true;
            S.ronin = 0;
            S.edu = 2; // 大学在学
            S.uni = uniFullName;
            addAlbumSnap({ id: 'uni_enter', age: S.age, icon: '🎓', title: '大学合格・進学', desc: `見事【${uniFullName}】に合格！憧れのキャンパスへ。`, tag: '学業' });
            S.uniRank = sch.rank;
            fx({ happy: 8 + sch.rank * 2 });
            playSE('fanfare');
            return `桜咲く！見事【${uniFullName}】に合格した！ ` + payTuition('uni', sch.rank);
          }
          // 受験失敗時の処理
          playSE('bad');
          fx({ happy: -6 });
          // 不合格時イベント（浪人 or 滑り止め進学 or 就職）へ分岐
          return {
            text: `惜しくも【${uniFullName}】は不合格となってしまった…。`,
            then: {
              icon: '🌧️', title: '大学受験不合格の通知',
              badge: '進路の決断',
              text: '志望校の不合格通知が届いた…。\n悔しさをバネに「浪人」して再挑戦するか、滑り止めの大学へ進学するか、就職するか決断しよう。',
              choices: [
                {
                  label: '🔥 諦めずにもう1年、浪人して再挑戦する',
                  confirm: '浪人生として来年の大学受験を目指しますか？（※1年間受験勉強に専念できます）',
                  fn() {
                    S.student = true;
                    S.ronin = (S.ronin || 0) + 1;
                    fx({ happy: -2, smarts: 4 });
                    playSE('good');
                    return `浪人生活（${S.ronin}浪目）を決意！予備校に通い、捲土重来を期して猛勉強を始める！`;
                  }
                },
                {
                  label: '🏫 滑り止めの大学（一般・新設大学）に進学する',
                  fn() {
                    S.student = true;
                    S.ronin = 0;
                    S.edu = 2;
                    S.uni = S.track === 'med' ? '一般大学（看護・医療技術系）' : S.track === 'ri' ? '一般大学（理工系）' : '一般大学（文系）';
                    S.uniRank = 1;
                    fx({ happy: 2 });
                    return `気持ちを切り替え、滑り止めの「${S.uni}」に進学することにした。 ` + payTuition('uni', 1);
                  }
                },
                {
                  label: '💼 進学を諦め、高卒として就職する',
                  confirm: '大学進学を諦め、高卒として社会に出て就職しますか？',
                  fn() {
                    S.student = false;
                    S.ronin = 0;
                    S.edu = 2;
                    return { text: 'スーツに身を包み、社会へ踏み出した。', then: jobHuntEvent() };
                  }
                }
              ]
            }
          };
        }
      };
    });

    // 特別進路1: プロスポーツ選手（ドラフト・スカウト・入団テスト）
    const canTryAthlete = !isRonin && (S.flags.scouted_pro || S.flags.athlete_star || S.club === 'sports' || hasTrait('athletic_sense') || hasTrait('iron'));
    if (canTryAthlete) {
      if (S.flags.scouted_pro) {
        choices.unshift({
          label: '🏅 【ドラフト1位指名】プロ球団・クラブへ入団！',
          special: true,
          sub: '契約金5000万円｜初年度年俸1200万円｜プロスポーツ選手',
          fn() {
            S.student = false; S.edu = 2;
            setJob({ name: 'プロスポーツ選手', base: 1200, icon: '🏅' });
            addAlbumSnap({ id: 'pro_draft1', age: 18, icon: '🏅', title: 'ドラフト1位契約', desc: '契約金5000万円でプロ球団へ入団！華々しいプロ人生の開幕。', tag: '栄光' });
            S.flags.pro = true;
            fx({ money: 5000, happy: 15, social: 8 });
            playSE('fanfare');
            return 'ドラフト1位でプロ契約締結！契約金5000万円を受け取り、夢のプロアスリート人生が開幕！';
          }
        });
      } else {
        choices.unshift({
          label: '🏅 プロ入りテスト（トライアウト）に挑戦する',
          special: true,
          sub: '幼少期からの経験で合格率UP｜プロスポーツ選手',
          fn() {
            S.student = false; S.edu = 2;
            const skillBonus = (S.sportSkill ? Math.min(0.35, S.sportSkill * 0.06) : 0);
            const bonusRate = (S.lesson === 'soccer' ? 0.15 : 0) + (S.flags.athlete_star ? 0.2 : 0) + (hasTrait('athletic_sense') ? 0.2 : 0) + (hasTrait('iron') ? 0.15 : 0) + skillBonus;
            if (chance(S.fitness / 110 + bonusRate)) {
              setJob({ name: 'プロスポーツ選手', base: 850, icon: '🏅' });
              S.flags.pro = true;
              fx({ happy: 12, money: 1000, social: 5 });
              playSE('fanfare');
              return '合格！過酷なトライアウトを勝ち抜き、プロスポーツ選手として契約を勝ち取った！';
            }
            fx({ happy: -8 });
            return { text: '惜しくも入団テストに落ちてしまった…気持ちを切り替えて次の道を探そう。', then: jobHuntEvent() };
          }
        });
      }
    }

    // 特別進路2: ミュージシャン（メジャーデビュー / バンドマン）
    const canTryMusic = !isRonin && (S.flags.major_debut_offer || S.flags.music_talent || S.club === 'music' || hasTrait('absolute_pitch') || hasTrait('artist') || S.creativity >= 65);
    if (canTryMusic) {
      if (S.flags.major_debut_offer) {
        choices.unshift({
          label: '🎸 【メジャーデビュー決定】プロミュージシャンとして契約！',
          special: true,
          sub: '契約金1500万円｜初年度年収600万円｜大型新人アーティスト',
          fn() {
            S.student = false; S.edu = 2;
            setJob({ name: 'ミュージシャン', base: 600, icon: '🎸' });
            addAlbumSnap({ id: 'major_debut_snap', age: 18, icon: '🎸', title: 'メジャー契約締結', desc: '大手レーベルからメジャーデビュー！全国へ歌声を届ける。', tag: '栄光' });
            S.flags.star = true;
            fx({ money: 1500, happy: 15, social: 8 });
            playSE('fanfare');
            return '大手レーベルから華々しくメジャーデビュー！契約金1500万円を手に、全国へ歌声を届ける！';
          }
        });
      } else {
        choices.unshift({
          label: '🎸 プロミュージシャンを目指して音楽の世界へ！',
          special: true,
          sub: 'オーディション挑戦 / 下積みインディーズ',
          fn() {
            S.student = false; S.edu = 2;
            const skillBonus = (S.musicSkill ? Math.min(0.35, S.musicSkill * 0.06) : 0);
            const rate = (S.creativity / 100) + (hasTrait('absolute_pitch') ? 0.25 : 0) + (hasTrait('artist') ? 0.15 : 0) + (S.flags.music_talent ? 0.2 : 0) + skillBonus;
            if (chance(rate)) {
              setJob({ name: 'ミュージシャン', base: 480, icon: '🎸' });
              fx({ happy: 12, social: 5, money: 300 });
              playSE('fanfare');
              return 'オーディションに合格！新人アーティストとしてレコード契約を掴み取った！';
            }
            setJob({ name: 'ミュージシャン', base: 240, icon: '🎸' });
            fx({ happy: 4 });
            return 'メジャー契約は逃したものの、ライブハウスで下積みするインディーズバンドマンとして活動開始！';
          }
        });
      }
    }

    // 特別進路3: 若手IT起業家
    const canTryTech = !isRonin && (S.flags.tech_star || S.flags.tech_geek || S.club === 'tech' || hasTrait('logical_mind') || S.smarts >= 75);
    if (canTryTech) {
      if (S.flags.tech_star) {
        choices.unshift({
          label: '🚀 【VC出資確約】大型シード資金を得てITベンチャー起業！',
          sub: '出資資金3000万円｜初年度年収800万円｜若手注目起業家',
          special: true,
          fn() {
            S.student = false; S.edu = 2;
            setJob({ name: '起業家', base: 800, icon: '🚀' });
            S.flags.founder = true;
            fx({ money: 3000, happy: 15, smarts: 8 });
            playSE('fanfare');
            return '著名VCから出資資金3000万円を調達！若きカリスマCEOとして業界に旋風を巻き起こす！';
          }
        });
      } else if (chance(0.65)) {
        choices.unshift({
          label: '🚀 自作サービスを元に高校発ITベンチャーを起業する！',
          sub: '起業家として社会へ｜知力と技術で勝負',
          special: true,
          fn() {
            S.student = false; S.edu = 2;
            setJob({ name: '起業家', base: 500, icon: '🚀' });
            S.flags.founder = true;
            fx({ happy: 10, smarts: 5, money: 500 });
            playSE('fanfare');
            return 'VCからの初期出資を取り付け、高校発ベンチャーを創業！若手CEOとして名乗りを上げた！';
          }
        });
      }
    }

    // 特別進路4: プロイラストレーター・デザイナー
    const canTryArt = !isRonin && (S.flags.art_star || S.club === 'art' || hasTrait('artist') || S.creativity >= 72);
    if (canTryArt) {
      if (S.flags.art_star) {
        choices.unshift({
          label: '🎨 【大型専属契約】プロのクリエイター・デザイナーとして独立！',
          sub: '専属契約金800万円｜初年度年収500万円｜気鋭のアーティスト',
          special: true,
          fn() {
            S.student = false; S.edu = 2;
            setJob({ name: 'デザイナー', base: 500, icon: '🎨' });
            S.flags.star = true;
            fx({ money: 800, happy: 14, creativity: 8, social: 6 });
            playSE('fanfare');
            return '大手デザイン事務所と専属契約！契約金800万円を手に、若き人気クリエイターとして始動！';
          }
        });
      } else if (chance(0.6)) {
        choices.unshift({
          label: '🎨 フリーランスのイラストレーター・作家として活動開始！',
          sub: '創作の世界へ｜独創性とセンスで勝負',
          special: true,
          fn() {
            S.student = false; S.edu = 2;
            setJob({ name: '小説家・漫画家', base: 350, icon: '🖋️' });
            fx({ happy: 8, creativity: 5, money: 200 });
            playSE('fanfare');
            return '自作作品の連載・制作契約を獲得！プロの創作作家としての一歩を踏み出した！';
          }
        });
      }
    }

    choices.push({
      label: '💼 大学へは行かず、高卒で就職する',
      confirm: '大学受験はせず、高卒で就職しますか？\n（大卒以上が条件のエリート職・専門職には就けなくなります）',
      fn() { S.student = false; S.ronin = 0; S.edu = 2; return { text: '社会に出て自立する道を選んだ。', then: jobHuntEvent() }; }
    });

    return {
      icon: '🌸',
      title: isRonin ? `大学再受験（${S.ronin}浪目）` : '大学受験・高校卒業後の進路',
      text: isRonin
        ? '浪人して迎えた受験シーズン。\n1年間の努力の成果をぶつける時だ！'
        : '高校3年生。\n複数の偏差値帯から挑戦する大学を選択しよう。',
      choices
    };
  };

  // 16歳（高2）：全国大会・フェス・コンペ・スカウトの視線
  if (a === 16 && S.student && (S.flags.athlete_star || S.flags.music_talent || S.flags.tech_geek || S.flags.art_star || S.club === 'sports' || S.club === 'music' || S.club === 'tech' || S.club === 'art')) {
    if (S.flags.athlete_star || S.club === 'sports') {
      return {
        icon: '🏟️', title: 'インターハイの激闘とドラフト候補選出', badge: '高校2年生',
        text: '全国大会のスタンドには、プロ球団やJリーグのスカウト陣の姿が。',
        choices: [{
          label: '全国の舞台で全てを出し切る！',
          special: true,
          fn() {
            const skillScore = (S.fitness || 0) + (S.sportSkill ? S.sportSkill * 4 : 0);
            if (skillScore >= 75 || hasTrait('athletic_sense') || hasTrait('iron')) {
              S.flags.scouted_pro = true;
              addAlbumSnap({ id: 'hs_interhigh', age: 16, icon: '🏟️', title: 'インターハイの栄光', desc: '全国ベスト4に進出！プロ球団のスカウト陣を熱狂させた。', tag: '栄光' });
              fx({ fitness: 4, happy: 10, social: 5 });
              playSE('fanfare');
              return '全国ベスト4に進出！長年の猛練習が実を結び、「ドラフト上位候補」としてスカウトの目を釘付けにした！';
            }
            fx({ fitness: 3, happy: 4 });
            return '全国の強豪と死闘を繰り広げ、プロ入りへの手応えと課題を掴んだ！';
          }
        }]
      };
    } else if (S.flags.music_talent || S.club === 'music') {
      return {
        icon: '🎸', title: '10代限定ロックフェス・メジャー争奪戦', badge: '高校2年生',
        text: '応募総数3000組を超えるティーンズフェスの決勝ステージ！',
        choices: [{
          label: '全力のシャウトと演奏を叩きつける！',
          special: true,
          fn() {
            const musicScore = (S.creativity || 0) + (S.musicSkill ? S.musicSkill * 4 : 0);
            if (musicScore >= 75 || hasTrait('absolute_pitch') || hasTrait('artist')) {
              S.flags.major_debut_offer = true;
              addAlbumSnap({ id: 'hs_musicfest', age: 16, icon: '🎸', title: 'ティーンズフェス優勝', desc: '応募総数3000組の頂点に立ち、メジャー契約を打診された！', tag: '栄光' });
              fx({ creativity: 4, happy: 10, social: 6 });
              playSE('fanfare');
              return 'グランプリを獲得！圧倒的な演奏と楽曲の完成度に、大手レコード会社からメジャーデビューを打診された！';
            }
            fx({ creativity: 3, happy: 5 });
            return '準グランプリを獲得！インディーズレーベルから声がかかり、注目を集めた！';
          }
        }]
      };
    } else if (S.flags.tech_geek || S.club === 'tech') {
      return {
        icon: '💻', title: '全国高校生プログラミングコンテスト ＆ 自作アプリのバズ', badge: '高校2年生',
        text: '独自に開発したWEBサービス・自作アプリを全国コンテストに出品した！',
        choices: [{
          label: '自作プロダクトの熱烈プレゼンに挑む！',
          special: true,
          fn() {
            const techScore = (S.smarts || 0) + (S.creativity || 0) / 2 + (S.techSkill ? S.techSkill * 4 : 0);
            if (techScore >= 75 || hasTrait('logical_mind') || hasTrait('genius')) {
              S.flags.tech_star = true;
            addAlbumSnap({ id: 'hs_techcontest', age: 16, icon: '💻', title: 'プロコン最優秀賞', desc: '自作アプリが10万DLを突破！VCから出資の打診が殺到した。', tag: '栄光' });
              S.flags.tech_geek = true;
              fx({ smarts: 5, creativity: 3, happy: 10, money: 50 });
              playSE('fanfare');
              return '最優秀賞グランプリを受賞！アプリは10万DLを記録し、著名VCやIT企業から出資と業務提携のオファーが殺到した！';
            }
            S.flags.tech_geek = true;
            fx({ smarts: 3, creativity: 2, happy: 5 });
            return '入賞を果たした！全国の天才高校生エンジニアたちと繋がり、確かな自信を得た！';
          }
        }]
      };
    } else if (S.flags.art_star || S.club === 'art') {
      return {
        icon: '🎨', title: '高校生国際美術展 ＆ 全国デザインコンペ', badge: '高校2年生',
        text: '半年かけて描き上げた大作油絵とグラフィックを全国展覧会に出展した！',
        choices: [{
          label: '魂を込めた作品で勝負する！',
          special: true,
          fn() {
            const artScore = (S.creativity || 0) + (S.artSkill ? S.artSkill * 4 : 0);
            if (artScore >= 75 || hasTrait('artist') || hasTrait('charisma')) {
              S.flags.art_star = true;
            addAlbumSnap({ id: 'hs_artexhib', age: 16, icon: '🎨', title: '高校美術展大臣賞', desc: '大作油絵が文部科学大臣賞を受賞！若き天才と称賛された。', tag: '栄光' });
              fx({ creativity: 6, happy: 10, social: 5, looks: 2 });
              playSE('fanfare');
              return '文部科学大臣賞を受賞！圧倒的な表現力と独創性が絶賛され、若手クリエイターとしてメディアに特集された！';
            }
            fx({ creativity: 4, happy: 5 });
            return '秀作賞に入選！全国の一流の作品群に刺激を受け、表現者としての視野が大きく広がった！';
          }
        }]
      };
    }
  }

  // 17歳：現役大学受験
  if (a === 17 && S.student && !S.ronin) {
    return getUniExamEvent(false);
  }

  // 18歳以降：浪人中の大学再受験（浪人している限り毎年春に発生）
  if (a >= 18 && a <= 22 && S.student && S.ronin > 0) {
    return getUniExamEvent(true);
  }

  if (a === 19) return {
    icon: '👘', title: '成人式', text: '二十歳を迎え、成人式に出席した。',
    choices: [{ label: '大人の仲間入り', fn() { fx({ happy: 3 }); return '懐かしい顔ぶれと再会した。'; } }]
  };

  // 大学卒業の節目（浪人年数分シフト: 21 + ronin歳）
  const gradAge = 21 + (S.gradYears || 0);
  if (a === gradAge && S.student && !S.ronin && !S.gradSchool) {
    const choices = [
      {
        label: '💼 就職活動をして社会に出る',
        fn() {
          S.student = false;
          S.edu = 3; // 大卒
          return { text: '4年間の大学生活を終え、学士の学位を手にした！', then: jobHuntEvent() };
        }
      }
    ];

    // 大学院進学の選択肢
    GRAD_SCHOOLS.forEach(gs => {
      const uniBonus = S.uniRank === 3 ? 8 : S.uniRank === 2 ? 4 : 0;
      const eff = S.smarts + uniBonus + (hasTrait('genius') ? 6 : 0) + (hasTrait('lucky') ? 4 : 0);
      const maxR = gs.rank === 2 ? 76 : 90;
      const gRate = calcExamPassRate(eff, gs.req, maxR);
      choices.push({
        label: `🔬 ${gs.name}を受験する（合格率 ${gRate}% ｜ 2年制修士課程）`,
        fn() {
          if (chance(gRate / 100)) {
            S.student = true;
            S.gradSchool = gs.name;
            S.gradYears = (S.gradYears || 0) + 2; // 大学院2年間追加
            fx({ smarts: 6, happy: 6 });
            playSE('fanfare');
            return `大学院入試に合格！【${gs.name}】に進学し、高度な専門研究の道へ進む！ ` + payTuition('grad', gs.rank);
          }
          fx({ happy: -4 });
          playSE('bad');
          S.student = false;
          S.edu = 3;
          return { text: '大学院入試は不合格だった。大学卒業として就職活動をすることにした。', then: jobHuntEvent() };
        }
      });
    });

    return {
      icon: '🎓', title: '大学卒業・進路選択',
      text: '4年間の大学生活が修了する。\n就職して社会に出るか、大学院に進学してさらなる専門性を極めるか？',
      choices
    };
  }

  // 大学院修了の節目
  if (S.gradSchool && a === gradAge && S.student) {
    return {
      icon: '🏛️', title: '大学院修了（修士号取得）',
      text: '2年間の大学院研究生活を終え、修士論文が受理された！\n修士（マスター）の学位を取得！',
      choices: [
        {
          label: '💼 高度専門人材として就職活動へ',
          fn() {
            S.student = false;
            S.edu = 4; // 大学院卒
            fx({ smarts: 5, happy: 8 });
            playSE('fanfare');
            return { text: '大学院を優秀な成績で修了した！', then: jobHuntEvent() };
          }
        }
      ]
    };
  }
  if (a === 34 && S.job && S.job.name === 'プロスポーツ選手') return {
    icon: '🏟️', title: '現役引退', text: '体力の限界を感じ、引退を決意した。',
    choices: [{ label: '第二のキャリアへ', fn() { S.job = null; fx({ money: 500, happy: -3 }); return '盛大な引退セレモニーが開かれた。'; } }]
  };
  if (a === 34 && S.job && S.job.name === 'ミュージシャン') return {
    icon: '🎸', title: '35歳 — 音楽家としての円熟と進路',
    text: '若き情熱から成熟期へ。これからの音楽活動のスタンスを決める時がきた。',
    choices: [
      {
        label: '🔥 生涯現役！ロック魂を燃やし続ける！',
        sub: '給与維持｜創造性↑↑',
        fn() { fx({ happy: 5, creativity: 5 }); return '「魂に定年などない！」生涯現役のアーティストとして歌い続けることを誓った！'; }
      },
      {
        label: '🎧 音楽プロデューサー・作詞作曲家へ転身',
        sub: '安定印税収入｜給与+30%',
        fn() {
          if (S.job) S.job.base = Math.round(S.job.base * 1.3);
          fx({ happy: 6, smarts: 4 });
          return '後進のアーティストを育てる名プロデューサーとして音楽業界で確固たる地位を築いた！';
        }
      }
    ]
  };
  if (a === 59) {
    // 60歳：還暦と役職定年・キャリア選択
    const isLeader = S.flags.ceo || S.flags.founder || S.flags.executive || S.flags.politician || (S.job && ['医師', '弁護士', '大学教授'].includes(S.job.name));
    if (isLeader) {
      return {
        icon: '🎴', title: '還暦 — 指導者としての決断', badge: '60歳',
        text: '60歳の還暦を迎えた。組織のトップ・第一線として、今後の身の振り方を決める時がきた。',
        choices: [
          {
            label: '🏛️ 生涯現役！トップとして陣頭指揮を執る',
            sub: '給与100%維持｜毎年体力に負荷',
            fn() {
              fx({ happy: 4 });
              return '「引退などまだ早い！」生涯現役を宣言し、力強く組織を牽引し続ける！';
            }
          },
          {
            label: '🤝 後進に道を譲り、名誉会長・顧問へ就任',
            sub: '給与50%｜自由な時間が増加｜幸福↑↑',
            fn() {
              S.advisor = true;
              fx({ happy: 8 });
              return '後進へバトンタッチし、最高顧問として穏やかに見守る立場へ就任した。';
            }
          },
          {
            label: '💐 ここで完全引退！悠々自適の余生へ',
            sub: '多額の退職慰労金｜シニア生活へ',
            fn() {
              const b = Math.round(salary() * 2.5);
              fx({ money: b, happy: 10 });
              S.job = null; S.retired = true;
              return `第一線を退き完全リタイア！退職慰労金 ${fmtMoney(b)} を受け取った！`;
            }
          }
        ]
      };
    } else if (S.job) {
      return {
        icon: '🎴', title: '還暦 — 役職定年とこれからの働き方', badge: '60歳',
        text: '60歳の節目。一般企業では役職定年の時期を迎え、これからの働き方を選択できる。',
        choices: [
          {
            label: '💼 再雇用制度で65歳まで働く',
            sub: '給与65%で勤務継続｜生活基盤を維持',
            fn() {
              S.reemployed = true;
              fx({ happy: 2 });
              return 'シニア社員として再雇用契約を締結。65歳の完全定年までマイペースに働く！';
            }
          },
          {
            label: '💐 早期定年退職を選ぶ',
            sub: '退職金を受け取り、ゆとりある余生へ',
            fn() {
              const b = Math.round(salary() * 1.5);
              fx({ money: b, happy: 6 });
              S.job = null; S.retired = true;
              return `早期定年退職を決意！退職金 ${fmtMoney(b)} を受け取り、新たな人生へ！`;
            }
          }
        ]
      };
    } else {
      return {
        icon: '🎴', title: '還暦', badge: '60歳',
        text: '60歳。人生の大きな節目。赤いちゃんちゃんこで家族や仲間に祝ってもらった！',
        choices: [{ label: '人生まだまだこれから！', fn() { fx({ happy: 5 }); return '豊かなセカンドライフを歩んでいこう。'; } }]
      };
    }
  }

  if (a === 64 && !S.retired) {
    const isLeader = S.flags.ceo || S.flags.founder || S.flags.politician || (S.job && ['医師', '弁護士'].includes(S.job.name));
    if (isLeader) {
      return {
        icon: '🏅', title: '65歳 — 名誉の節目と年金開始', badge: '65歳',
        text: '65歳を迎えた。公的年金の受給資格を得たが、指導者としてどう進むか？',
        choices: [
          {
            label: '🏛️ まだまだ現役続行！',
            sub: '給与＋公的年金を両方受給',
            fn() { fx({ happy: 3 }); return '生涯現役の気概を保ちつつ、年金受給も開始！'; }
          },
          {
            label: '💐 勇退して顧問・名誉職へ',
            sub: '退職慰労金を受け取り、年金生活へ',
            fn() {
              const b = Math.round(salary() * 2);
              fx({ money: b, happy: 8 });
              S.job = null; S.retired = true;
              return `名誉の勇退！退職慰労金 ${fmtMoney(b)} を受け取り、悠々自適の生活へ。`;
            }
          }
        ]
      };
    } else {
      return {
        icon: '💐', title: '満期定年退職 ＆ 年金受給開始', badge: '65歳',
        text: S.job ? `65歳。長年勤め上げた${S.job.name}の職を満期定年で退職する日がやってきた。` : '65歳。公的年金の受給が本格スタートする。',
        choices: [{
          label: '第二の人生へ乾杯！',
          fn() {
            let t = 'これからは公的年金を受給しながら、自分のペースで生きていく。';
            if (S.job) {
              S.lastJob = { name: S.job.name, icon: S.job.icon, level: S.job.level || 0 };
              const b = Math.round(salary() * 1.8);
              fx({ money: b });
              t = `長年の勤務、本当にお疲れさまでした！退職金 ${fmtMoney(b)} を受け取った！`;
            }
            S.job = null; S.retired = true; fx({ happy: 8 });
            addAlbumSnap({ id: 'retire_snap', age: 65, icon: '💐', title: '満期定年退職の佳き日', desc: '長年勤め上げた職場を無事卒業。温かい拍手と花束に包まれた。', tag: '余生' });
            return t;
          }
        }]
      };
    }
  }
  if (a === 99) return {
    icon: '🎂', title: '百寿', text: 'ついに100歳！市長から祝い状が届いた。',
    choices: [{ label: 'ありがたい', fn() { fx({ happy: 10 }); return ''; } }]
  };
  return null;
}

function divorce() {
  S.married = false; S.partner = null; S.partnerLove = 0; S.partnerInfo = null;
  fx({ happy: -10, money: -Math.max(0, Math.round(S.money * 0.3)) });
  S.flags.divorced = true;
  return '離婚が成立した。財産の一部を失った。';
}

// ---------- ライフメニュー（能動アクション：恋愛・資産・キャリア） ----------
function openLoveMenu() {
  const acted = S.actedLoveYear === S.age;
  const choices = [];
  let statusText = '';

  if (!S.partner) {
    statusText = `現在：独身・恋人なし\n${acted ? '（※今年の出会いアクションは実行済みです）' : '自分から積極的に出会いを探せます（年1回）'}`;
    const loveBonus = hasTrait('beloved') ? 0.15 : 0;
    const isHS = isHighSchoolStudent();
    choices.push({
      label: isHS ? '🏫 学校や身の回りに出会いを探す（無料）' : '🏫 友人の紹介・身の回りで探す（無料）',
      disabled: acted,
      fn() {
        S.actedLoveYear = S.age;
        if (chance(0.35 + S.social / 180 + loveBonus)) {
          const p = randomPartner();
          setPartner(p, 65);
          fx({ happy: 8 });
          playSE('good');
          if (isHS) {
            const role = S.partnerInfo.job.name.replace('高校生（', '').replace('）', '');
            return `学校生活の中で${role}で${S.partnerInfo.trait}な${p}と放課後に意気投合し、付き合うことになった！甘酸っぱい高校生カップルの誕生だ！`;
          }
          return `友人の紹介で${S.partnerInfo.trait}な${S.partnerInfo.job.name}の${p}と意気投合し、付き合うことになった！`;
        }
        fx({ happy: -1 });
        return isHS ? '今年はピンとくる出会いや進展はなかった…。' : '今年はピンとくる出会いがなかった…。';
      }
    });
    if (S.age >= 18) {
      choices.push({
        label: '📱 マッチングアプリで探す（5万円）',
        disabled: acted || S.money < 5,
        fn() {
          S.actedLoveYear = S.age;
          fx({ money: -5 });
          if (chance(0.6 + S.social / 200 + loveBonus)) {
            const p = randomPartner();
            setPartner(p, 65);
            fx({ happy: 8 });
            playSE('good');
            return `アプリで出会った${S.partnerInfo.trait}な${S.partnerInfo.job.name}の${p}と交際をスタートした！`;
          }
          fx({ happy: -2 });
          return '何度か食事に行ったが、交際には至らなかった。';
        }
      });
    }
    if (S.age >= 20) {
      choices.push({
        label: '🥂 婚活パーティー・街コンに参加（15万円）',
        disabled: acted || S.money < 15,
        fn() {
          S.actedLoveYear = S.age;
          fx({ money: -15 });
          if (chance(0.82 + S.social / 300 + loveBonus)) {
            const p = randomPartner();
            setPartner(p, 78);
            fx({ happy: 10 });
            playSE('fanfare');
            return `素敵な出会いがあり、${S.partnerInfo.trait}な${S.partnerInfo.job.name}の${p}と真剣交際を始めた！`;
          }
          fx({ happy: -2 });
          return '良い出会いはなかったが、美味しい料理を楽しんだ。';
        }
      });
    }
  } else if (!S.married) {
    const isHS = isHighSchoolStudent() || (S.partnerInfo && S.partnerInfo.job && S.partnerInfo.job.name.includes('高校生'));
    const pInfo = S.partnerInfo ? `（${S.partnerInfo.trait}・${S.partnerInfo.job.name}）` : '';
    const propRate = clamp(Math.round(S.partnerLove * 0.8 + S.happy * 0.2 + (hasTrait('beloved') ? 12 : 0)), 15, 99);
    statusText = isHS
      ? `恋人：${S.partner}${pInfo}\n親密度：💖 ${S.partnerLove}%\n高校生活を一緒に過ごす大切な恋人です。`
      : `恋人：${S.partner}${pInfo}\n親密度：💖 ${S.partnerLove}%（結婚すると共働き収入 +${S.partnerInfo ? S.partnerInfo.job.inc : 120}万/年）`;

    if (isHS) {
      choices.push({
        label: `🥤 放課後デートに出かける（1,000円）${acted ? '［今年済］' : ''}`,
        disabled: acted || S.money < 0.1,
        fn() {
          S.actedLoveYear = S.age;
          S.partnerLove = clamp(S.partnerLove + r(12, 20));
          fx({ money: -0.1, happy: r(4, 7) });
          playSE('good');
          return `${S.partner}と放課後にカフェや公園に寄り道し、楽しい時間を過ごした！（親密度 ${S.partnerLove}%）`;
        }
      });
      choices.push({
        label: '🎁 記念日やお揃いのプレゼントを贈る（5,000円）',
        disabled: S.money < 0.5,
        fn() {
          S.partnerLove = clamp(S.partnerLove + r(15, 25));
          fx({ money: -0.5, happy: r(3, 6) });
          playSE('good');
          return `${S.partner}にお揃いのストラップや文房具をプレゼントした！大喜びしてくれた！（親密度 ${S.partnerLove}%）`;
        }
      });
    } else {
      choices.push({
        label: `🎡 デートに出かける（3万円）${acted ? '［今年済］' : ''}`,
        disabled: acted || S.money < 3,
        fn() {
          S.actedLoveYear = S.age;
          S.partnerLove = clamp(S.partnerLove + r(12, 20));
          fx({ money: -3, happy: r(4, 7) });
          playSE('good');
          return `${S.partner}と楽しいデートを過ごした！（親密度 ${S.partnerLove}%）`;
        }
      });
      choices.push({
        label: '🎁 サプライズプレゼントを贈る（15万円）',
        disabled: S.money < 15,
        fn() {
          S.partnerLove = clamp(S.partnerLove + r(15, 25));
          fx({ money: -15, happy: r(3, 6) });
          playSE('good');
          return `${S.partner}は大喜びしてくれた！（親密度 ${S.partnerLove}%）`;
        }
      });
    }
    if (S.age >= 18) {
      choices.push({
        label: `💍 プロポーズする（指輪・式代 80万円｜成功率 ${propRate}%）`,
        disabled: acted || S.money < 80,
        confirm: () => `指輪・挙式費用（80万円）を用意して、${S.partner}にプロポーズしますか？\n（現在の成功率：${propRate}%）`,
        fn() {
          S.actedLoveYear = S.age;
          if (chance(propRate / 100)) {
            S.married = true; S.flags.married = true;
            addAlbumSnap({ id: 'wedding', age: S.age, icon: '💍', title: '永遠の誓い・結婚式', desc: `最愛の伴侶「${S.partner}」と手を取り合い、生涯を共にする誓いを立てた！`, tag: '家族' });
            S.partnerLove = clamp(S.partnerLove + 15);
            fx({ money: -80, happy: 16 });
            playSE('fanfare');
            return `${S.partner}にプロポーズ大成功！祝福に包まれて結婚した！`;
          }
          S.partnerLove = clamp(S.partnerLove - 12);
          fx({ happy: -6 });
          playSE('bad');
          return '「まだ心の準備が…」と断られてしまった。もう少し絆を深めよう。';
        }
      });
    }
    choices.push({
      label: '💔 別れを切り出す',
      danger: true,
      confirm: () => `本当に恋人の${S.partner}と別れますか？\n（これまでの親密度はすべて失われ、元には戻せません）`,
      fn() {
        const p = S.partner;
        S.partner = null; S.partnerLove = 0; S.partnerInfo = null;
        fx({ happy: -5 });
        return `${p}と別れ、それぞれの道を歩むことにした。`;
      }
    });
  } else {
    const pInfo = S.partnerInfo ? `（${S.partnerInfo.trait}・${S.partnerInfo.job.name} +${S.partnerInfo.job.inc}万/年）` : '';
    const kidsDesc = S.kids.length ? S.kids.map(k => `${k.name}(${S.age - k.birth}歳)`).join('、') : 'なし';
    statusText = `配偶者：${S.partner}${pInfo}\n夫婦仲：💖 ${S.partnerLove}% ｜ 子ども：${kidsDesc}`;
    choices.push({
      label: `🍽️ 記念日ディナー・夫婦デート（5万円）${acted ? '［今年済］' : ''}`,
      disabled: acted || S.money < 5,
      fn() {
        S.actedLoveYear = S.age;
        S.partnerLove = clamp(S.partnerLove + r(12, 20));
        fx({ money: -5, happy: r(5, 8) });
        playSE('good');
        return `${S.partner}と素敵な時間を過ごし、夫婦の絆が深まった！（夫婦仲 ${S.partnerLove}%）`;
      }
    });
    if (S.age >= 18 && S.age <= 46 && S.kids.length < 4) {
      const babyRate = clamp(Math.round(65 + S.partnerLove * 0.2 - Math.max(0, S.age - 35) * 2 + (hasTrait('beloved') ? 10 : 0)), 20, 95);
      choices.push({
        label: `👶 子どもを望む・妊活（10万円｜授かり率 ${babyRate}%）`,
        disabled: acted || S.money < 10,
        fn() {
          S.actedLoveYear = S.age;
          fx({ money: -10 });
          if (chance(babyRate / 100)) {
            const kid = addKid();
            S.partnerLove = clamp(S.partnerLove + 10);
            fx({ happy: 15 });
            playSE('fanfare');
            return `待望の第${S.kids.length}子「${kid.name}」が誕生した！家族がさらに賑やかになった！`;
          }
          fx({ happy: -2 });
          return '今年は授からなかったが、パートナーと支え合った。';
        }
      });
    }
    const youngKids = S.kids.filter(k => S.age - k.birth < 18);
    if (youngKids.length > 0) {
      choices.push({
        label: `📚 子どもの教育・習い事（15万円）${acted ? '［今年済］' : ''}`,
        disabled: acted || S.money < 15,
        fn() {
          S.actedLoveYear = S.age;
          fx({ money: -15, happy: 6 });
          youngKids.forEach(k => { k.smarts = clamp((k.smarts || 50) + r(8, 14)); });
          playSE('good');
          return `子どもたちの習い事や学習を応援し、才能が大きく伸びた！`;
        }
      });
    }
    choices.push({
      label: `✈️ 家族旅行へ行く（30万円）${acted ? '［今年済］' : ''}`,
      disabled: acted || S.money < 30,
      fn() {
        S.actedLoveYear = S.age;
        S.partnerLove = clamp(S.partnerLove + 15);
        fx({ money: -30, happy: r(8, 12) });
        playSE('good');
        return '家族みんなで旅行に出かけ、かけがえのない思い出を作った！';
      }
    });
    choices.push({
      label: '🎁 パートナーへ感謝の贈り物（20万円）',
      disabled: S.money < 20,
      fn() {
        S.partnerLove = clamp(S.partnerLove + 18);
        fx({ money: -20, happy: 5 });
        playSE('good');
        return `${S.partner}に日頃の感謝を込めてプレゼントを贈った！（夫婦仲 ${S.partnerLove}%）`;
      }
    });
    choices.push({
      label: '💔 離婚を切り出す',
      danger: true,
      confirm: () => `本当に配偶者の${S.partner}と離婚しますか？\n（財産分与で貯金の30%を失い、パートナーの共働き収入もなくなります）`,
      fn() { return divorce(); }
    });
  }

  choices.push({ label: '閉じる', cancel: true, fn: () => '' });
  return { icon: '💕', title: '恋愛・家族メニュー', text: statusText, choices };
}

function currentHouseObj() {
  return HOUSES.find(h => h.id === S.assets.house) || null;
}
function currentCarObj() {
  return CARS.find(c => c.id === S.assets.car) || null;
}
function estateRentIncome() {
  // 実質利回り 3.5% (商才で4.2%)
  const rate = hasTrait('merchant') ? 0.042 : 0.035;
  return Math.round(S.assets.estate * rate);
}

function openLifestyleMenu() {
  const acted = S.actedLifestyleYear === S.age;
  const choices = [];
  const hobbyObj = S.hobby ? HOBBIES.find(h => h.id === S.hobby) : null;
  const hasPet = !!S.flags.pet;
  const petName = S.assets.items.includes('dog') ? '愛犬' : (S.flags.petName || '愛猫');
  const petIcon = S.assets.items.includes('dog') ? '🐕' : '🐈';

  // 1. ペット関連アクション
  if (!hasPet) {
    choices.push({
      label: '🐾 保護犬・保護猫の里親になる（譲渡費 5万円）',
      sub: '新しい家族を迎える｜生涯の癒やしと活力',
      disabled: S.money < 5,
      silent: true,
      fn() {
        return {
          then: {
            icon: '🐾', title: '里親の決断',
          text: '保護シェルターにやってきた。\nどの子を新しい家族として迎えますか？',
          choices: [
            {
              label: '🐶 人懐っこい保護犬を迎える',
              fn() {
                fx({ money: -5, happy: 10, fitness: 5 });
                S.flags.pet = true;
                if (!S.assets.items.includes('dog')) S.assets.items.push('dog');
                addAlbumSnap({ id: 'pet_welcome', age: S.age, icon: '🐶', title: '新しい家族（愛犬）', desc: '保護犬を迎え入れた！元気いっぱいにしっぽを振って迎えてくれる。', tag: '家族' });
                playSE('good');
                return { text: '愛犬が家族の一員になった！毎日の散歩やふれあいで元気をもらえる！', then: openLifestyleMenu() };
              }
            },
            {
              label: '🐱 おっとりした保護猫を迎える',
              fn() {
                fx({ money: -5, happy: 12 });
                S.flags.pet = true;
                const cName = pick(CAT_NAMES);
                S.flags.petName = cName;
                addAlbumSnap({ id: 'pet_welcome', age: S.age, icon: '🐱', title: '新しい家族（愛猫）', desc: `「${cName}」と名付け、保護猫を家族に迎えた。`, tag: '家族' });
                playSE('good');
                return { text: `「${cName}」が家族の一員になった！ゴロゴロと喉を鳴らして甘えてくる。`, then: openLifestyleMenu() };
              }
            },
            { label: '今回は見送る', cancel: true, fn: () => ({ then: openLifestyleMenu() }) }
          ]
        } };
      }
    });
  } else {
    choices.push({
      label: `${petIcon} ${petName}とふれあう・散歩する（年1回・無料）${acted ? '［今年済］' : ''}`,
      sub: 'ストレス解消｜幸福↑ 体力↑',
      disabled: acted,
      fn() {
        S.actedLifestyleYear = S.age;
        if (chance(0.25)) {
          fx({ happy: 8, fitness: 3, social: 3 });
          playSE('good');
          return `${petName}と散歩中、近所のペット仲間と意気投合！楽しい世間話で心が温まった！`;
        } else if (chance(0.12)) {
          fx({ happy: 10, money: 5 });
          playSE('fanfare');
          return `${petName}が茂みから落とし物の小銭入れ（5万円）を発見！交番でお礼を受け取った！`;
        }
        fx({ happy: 6, fitness: 2 });
        playSE('good');
        return `${petName}と一緒にのんびり過ごした。温かいぬくもりに日々の疲れが癒やされていく…。`;
      }
    });
  }

  // 2. 趣味・ライフワーク関連
  if (!hobbyObj) {
    HOBBIES.forEach(h => {
      choices.push({
        label: `${h.name}を始める（初期費用 10万円）`,
        sub: h.desc,
        disabled: S.money < 10,
        confirm: () => `${h.name}を始めますか？\n（初期費用：10万円\n特徴：${h.desc}）`,
        fn() {
          S.hobby = h.id;
          S.hobbyLevel = 1;
          fx({ money: -10, happy: 6 });
          playSE('good');
          addAlbumSnap({ id: 'hobby_start', age: S.age, icon: h.icon, title: `趣味「${h.name}」開始`, desc: `生涯夢中になれるライフワークとして${h.name}を始めた！`, tag: '趣味' });
          return `【${h.name}】をスタート！道具を揃え、休日の楽しみがグッと増えた！`;
        }
      });
    });
  } else {
    const nextLv = (S.hobbyLevel || 1) + 1;
    const isMax = (S.hobbyLevel || 1) >= 5;
    choices.push({
      label: isMax
        ? `✨ ${hobbyObj.name}（達人の境地・Lv5 MAX）${acted ? '［今年済］' : ''}`
        : `🎨 ${hobbyObj.name}の腕を磨く（Lv${S.hobbyLevel || 1} → Lv${nextLv}｜費用5万円）${acted ? '［今年済］' : ''}`,
      sub: isMax ? '生涯のライフワーク｜毎年高い幸福度と精神の充実' : '熟練度UP｜展示会やコンクールで入賞のチャンス',
      disabled: acted || isMax || S.money < 5,
      fn() {
        S.actedLifestyleYear = S.age;
        S.hobbyLevel = Math.min(5, (S.hobbyLevel || 1) + 1);
        fx({ money: -5, happy: 8 });
        const curLv = S.hobbyLevel;
        if (curLv === 3) {
          fx({ happy: 10, social: 5 });
          playSE('fanfare');
          addAlbumSnap({ id: 'hobby_master', age: S.age, icon: '🏆', title: `${hobbyObj.name}でコンクール入賞`, desc: '長年の熱意が認められ、地域の作品展で見事入賞を果たした！', tag: '栄光' });
          return `【${hobbyObj.name}】がLv3に到達！作品展・コンクールで入賞を果たし、仲間から一目置かれる存在に！`;
        } else if (curLv === 5) {
          fx({ happy: 16, social: 8, creativity: 5 });
          playSE('fanfare');
          addAlbumSnap({ id: 'hobby_legend', age: S.age, icon: '👑', title: `${hobbyObj.name}の名人`, desc: '道を極め、専門誌やメディアで特集されるほどの腕前へ登り詰めた！', tag: '栄光' });
          return `【${hobbyObj.name}】が最高峰のLv5（名人）に到達！専門誌やメディアで特集され、生涯の誇りとなった！`;
        }
        playSE('good');
        return `【${hobbyObj.name}】の腕前がLv${curLv}にアップ！技術と知識が深まり、ますます没頭している！`;
      }
    });

    choices.push({
      label: `🔄 別の新しい趣味に乗り換える（10万円）`,
      disabled: acted || S.money < 10,
      silent: true,
      fn() {
        return {
          then: {
            icon: '🔄', title: '趣味の変更',
          text: '現在の趣味から、新しいライフワークへ乗り換えますか？',
          choices: [
            ...HOBBIES.filter(h => h.id !== S.hobby).map(h => ({
              label: `${h.name}を始める（10万円）`,
              fn() {
                S.hobby = h.id;
                S.hobbyLevel = 1;
                fx({ money: -10, happy: 4 });
                playSE('good');
                return { text: `新しい趣味として【${h.name}】をスタートした！`, then: openLifestyleMenu() };
              }
            })),
            { label: '今の趣味を続ける', cancel: true, fn: () => ({ then: openLifestyleMenu() }) }
          ]
        } };
      }
    });
  }

  choices.push({ label: '閉じる', cancel: true, fn: () => '' });

  return {
    icon: '🌿', title: '趣味・ペット（ライフスタイル）',
    text: `日々の暮らしを彩る趣味やペットとのふれあい。\n現在：${hobbyObj ? `${hobbyObj.name}（Lv${S.hobbyLevel || 1}）` : '趣味未設定'} ｜ ペット：${hasPet ? `${petIcon} ${petName}` : 'なし'}`,
    choices
  };
}

function openAssetMenu() {
  const hObj = currentHouseObj();
  const cObj = currentCarObj();
  const estateRent = estateRentIncome();
  const text = `💰 貯金：${fmtMoney(S.money)}\n📈 株式・投信：${fmtMoney(S.assets.stock)} ｜ 🏢 収益不動産：${fmtMoney(S.assets.estate)}（家賃 +${fmtMoney(estateRent)}/年）\n🏠 住まい：${hObj ? hObj.name : '賃貸'} ｜ 🚗 愛車：${cObj ? cObj.name : 'なし'}`;

  return {
    icon: '🏦', title: '資産運用・ショップ', text,
    choices: [
      { label: `📈 株式・インデックス投資（現在 ${fmtMoney(S.assets.stock)}）`, silent: true, fn: () => ({ then: openStockMenu() }) },
      { label: `🏢 収益不動産オーナー（家賃 +${fmtMoney(estateRent)}/年）`, silent: true, fn: () => ({ then: openEstateMenu() }) },
      { label: `🏠 住まいを購入・住み替え（現在：${hObj ? hObj.name : '賃貸'}）`, silent: true, fn: () => ({ then: openHouseMenu() }) },
      { label: '🚗 愛車・ステータス品ショップ', silent: true, fn: () => ({ then: openLuxuryMenu() }) },
      {
        label: '🎰 海外カジノ・VIPルームの大勝負（1回 500万円）',
        sub: '勝率48%｜勝利で純利+500万円',
        disabled: S.money < 500,
        confirm: '本当に500万円を賭けてカジノの大勝負に挑みますか？（負けると500万円を一瞬で失います）',
        fn() {
          if (chance(0.48 + (hasTrait('lucky') ? 0.08 : 0))) {
            fx({ money: 500, happy: 18 });
            playSE('fanfare');
            addAlbumSnap({ id: 'casino_win', age: S.age, icon: '🎰', title: 'カジノVIPで大勝利！', desc: '一世一代の大勝負を制し、テーブルのチップを総ざらいした！', tag: '勝負' });
            return '【大勝利！】ディーラーの手を完全に読み切り、500万円の純利益を獲得！会場に歓声が響き渡った！';
          }
          fx({ money: -500, happy: -14 });
          playSE('bad');
          return '【敗北…】チップはすべてハウスに回収された…。冷や汗を流しながらカジノを後にした…。';
        }
      },
      { label: '閉じる', cancel: true, fn: () => '' },
    ]
  };
}

function openStockMenu() {
  const choices = [
    {
      label: '💹 100万円 投資する',
      disabled: S.money < 100,
      fn() { fx({ money: -100 }); S.assets.stock += 100; playSE('good'); return { text: 'インデックス投信を100万円分購入した！', then: openAssetMenu() }; }
    },
    {
      label: '💹 500万円 投資する',
      disabled: S.money < 500,
      fn() { fx({ money: -500 }); S.assets.stock += 500; playSE('good'); return { text: '株式ポートフォリオに500万円投資した！', then: openAssetMenu() }; }
    },
    {
      label: '💹 2,000万円 投資する',
      disabled: S.money < 2000,
      confirm: '2,000万円を大型ファンドに投資しますか？',
      fn() { fx({ money: -2000 }); S.assets.stock += 2000; playSE('good'); return { text: '2,000万円を大型ファンドに投資した！', then: openAssetMenu() }; }
    },
  ];
  if (S.assets.stock > 0) {
    choices.push({
      label: `💴 保有株をすべて売却して現金化（+${fmtMoney(S.assets.stock)}）`,
      confirm: () => `保有している株式・投信（${fmtMoney(S.assets.stock)}）をすべて売却して現金化しますか？`,
      fn() {
        const v = S.assets.stock;
        S.assets.stock = 0;
        fx({ money: v });
        return { text: `運用資産を売却し、${fmtMoney(v)}を現金化した。`, then: openAssetMenu() };
      }
    });
  }
  choices.push({ label: '← 資産メニューに戻る', cancel: true, silent: true, fn: () => ({ then: openAssetMenu() }) });
  return {
    icon: '📈', title: '株式・インデックス投資',
    text: `現在の運用残高：${fmtMoney(S.assets.stock)}（貯金：${fmtMoney(S.money)}）\n世界経済の波に応じて年末に価格が変動します（目安 -15%〜+18%）。数年に一度の市場暴落や好況の波があり、知力や性格によってリスクを抑えられます。`,
    choices,
  };
}

function openEstateMenu() {
  const rent = estateRentIncome();
  const choices = [
    {
      label: '🏢 区分マンション投資（500万円｜家賃 +18万/年）',
      disabled: S.money < 500,
      fn() { fx({ money: -500 }); S.assets.estate += 500; playSE('good'); return { text: '収益用ワンルームを購入！安定した家賃収入（年利約3.5%）が入るようになった！', then: openAssetMenu() }; }
    },
    {
      label: '🏘️ 一棟アパート購入（3,000万円｜家賃 +105万/年）',
      disabled: S.money < 3000,
      confirm: '3,000万円で一棟アパートを購入しますか？',
      fn() { fx({ money: -3000 }); S.assets.estate += 3000; playSE('fanfare'); return { text: '一棟アパートのオーナーになった！毎年の家賃収入がアップ！（※築年数による修繕リスクあり）', then: openAssetMenu() }; }
    },
    {
      label: '🏙️ 都心商業ビル購入（1億円｜家賃 +350万/年）',
      disabled: S.money < 10000,
      confirm: '1億円で都心商業ビルを購入しますか？',
      fn() { fx({ money: -10000 }); S.assets.estate += 10000; playSE('fanfare'); return { text: '都心のビルを一棟買いした！強固な家賃収入基盤を手に入れた！', then: openAssetMenu() }; }
    },
  ];
  if (S.assets.estate > 0) {
    const sellPrice = Math.round(S.assets.estate * 0.9);
    choices.push({
      label: `💴 不動産をすべて売却（+${fmtMoney(sellPrice)}｜手数料10%）`,
      danger: true,
      confirm: () => `保有している不動産（${fmtMoney(S.assets.estate)}）をすべて売却しますか？\n（売却手数料10%が差し引かれて +${fmtMoney(sellPrice)} の受取となり、毎年の家賃収入がなくなります）`,
      fn() {
        S.assets.estate = 0;
        fx({ money: sellPrice });
        return { text: `保有不動産を売却し、${fmtMoney(sellPrice)}を受け取った。`, then: openAssetMenu() };
      }
    });
  }
  choices.push({ label: '← 資産メニューに戻る', cancel: true, silent: true, fn: () => ({ then: openAssetMenu() }) });
  return {
    icon: '🏢', title: '収益不動産オーナー',
    text: `保有不動産：${fmtMoney(S.assets.estate)}（年間家賃収入：+${fmtMoney(rent)}）\n不動産は安定したインカムゲインを生み出します（目安 実質年利約3.5%）。時折、設備の修繕やリフォーム費用が発生します。`,
    choices,
  };
}

function openHouseMenu() {
  const cur = currentHouseObj();
  const tradeIn = cur ? Math.round(cur.price * 0.8) : 0;
  const choices = HOUSES.map(h => {
    const owned = S.assets.house === h.id;
    const netCost = h.price - tradeIn;
    return {
      label: owned
        ? `${h.name}（現在居住中）`
        : `${h.name}（${tradeIn ? `住み替え差額 ${fmtMoney(netCost)}` : fmtMoney(h.price)}）`,
      sub: owned ? '' : h.desc,
      disabled: owned || S.money < netCost,
      confirm: () => `${h.name}を ${fmtMoney(netCost)} で購入しますか？`,
      fn() {
        fx({ money: -netCost, happy: h.happy * 4, looks: h.id === 'tower' ? 6 : 2 });
        S.assets.house = h.id;
        addAlbumSnap({ id: 'buy_house_' + h.id, age: S.age, icon: h.icon || '🏠', title: `夢のマイホーム「${h.name}」`, desc: `${h.name}を購入！家族と共に過ごすかけがえのない城を手に入れた。`, tag: '住まい' });
        S.flags.house = true;
        playSE('fanfare');
        return { text: `${h.name}を購入した！理想のマイホーム生活が始まる！`, then: openAssetMenu() };
      }
    };
  });
  choices.push({ label: '← 資産メニューに戻る', cancel: true, silent: true, fn: () => ({ then: openAssetMenu() }) });
  return {
    icon: '🏠', title: '住まいを購入・住み替え',
    text: `現在の住まい：${cur ? `${cur.name}（下取り査定 ${fmtMoney(tradeIn)}）` : '賃貸'}｜貯金：${fmtMoney(S.money)}\n持ち家を購入すると毎年の生活費（家賃）が節約されます。`,
    choices,
  };
}

function openLuxuryMenu() {
  const choices = [];
  CARS.forEach(c => {
    const owned = S.assets.car === c.id;
    choices.push({
      label: owned ? `${c.name}（所有中）` : `${c.name}（${fmtMoney(c.price)}）`,
      sub: owned ? '' : c.desc,
      disabled: owned || S.money < c.price,
      confirm: c.price >= 450 ? `${c.name}を ${fmtMoney(c.price)} で購入しますか？` : '',
      fn() {
        fx({ money: -c.price, ...c.fx });
        S.assets.car = c.id;
        playSE('good');
        return { text: `${c.name}を納車した！ドライブが最高に楽しい！`, then: openAssetMenu() };
      }
    });
  });
  LUXURY_ITEMS.forEach(item => {
    const owned = S.assets.items.includes(item.id);
    choices.push({
      label: owned ? `${item.name}（所有中）` : `${item.name}（${fmtMoney(item.price)}）`,
      sub: owned ? '' : item.desc,
      disabled: owned || S.money < item.price,
      confirm: item.price >= 500 ? `${item.name}を ${fmtMoney(item.price)} で購入しますか？` : '',
      fn() {
        fx({ money: -item.price, ...item.fx });
        S.assets.items.push(item.id);
        if (item.flag) S.flags[item.flag] = true;
        playSE('good');
        return { text: `${item.name}を手に入れた！`, then: openAssetMenu() };
      }
    });
  });
  choices.push({ label: '← 資産メニューに戻る', cancel: true, silent: true, fn: () => ({ then: openAssetMenu() }) });
  return {
    icon: '🚗', title: '愛車・ステータス品ショップ',
    text: `貯金：${fmtMoney(S.money)}\n自分へのご褒美やステータス品を購入して、幸福度や魅力を高められます。`,
    choices,
  };
}

function openCareerMenu() {
  const acted = S.actedCareerYear === S.age;
  const choices = [];
  const curSide = S.sideJob ? (SIDE_JOBS.find(j => j.id === S.sideJob.id) || { name: S.sideJob.name }) : null;
  const curEst = S.sideJob ? calcSideJobIncome(S.sideJob) : 0;
  const sideText = curSide ? `${curSide.name}（年 約${fmtMoney(curEst)}｜健康-1/年）` : 'なし';

  if (!S.sideJob) {
    SIDE_JOBS.forEach(j => {
      choices.push({
        label: `${j.name}（初期費用 ${j.cost}万円）${acted ? '［今年済］' : ''}`,
        disabled: acted || S.money < j.cost,
        confirm: () => `${j.name}を始めますか？\n（初期費用：${j.cost}万円\n特徴：${j.desc}\n※本業との両立により、毎年健康が -1 されます）`,
        fn() {
          S.actedCareerYear = S.age;
          S.sideJob = { id: j.id, name: j.name };
          fx({ money: -j.cost, smarts: 1 });
          playSE('good');
          const est = calcSideJobIncome(S.sideJob);
          return `【${j.name}】をスタート！\n本人の能力に応じて年約 +${fmtMoney(est)} の副収入が見込めるようになった！（本業と両立のため健康管理に注意）`;
        }
      });
    });
  } else {
    // 既に副業をしている場合：他の副業への乗り換え、または撤退
    choices.push({
      label: `🛑 現在の副業（${curSide.name}）をやめる`,
      disabled: acted,
      confirm: '現在の副業をやめますか？（副収入はなくなりますが、過労や健康への負担は解消されます）',
      fn() {
        S.actedCareerYear = S.age;
        const oldName = curSide.name;
        S.sideJob = null;
        fx({ happy: 2 });
        playSE('good');
        return `【${oldName}】をやめた。時間と心にゆとりが戻り、穏やかに過ごせるようになった。`;
      }
    });
    // 別の副業への乗り換え
    SIDE_JOBS.filter(j => j.id !== S.sideJob.id).forEach(j => {
      choices.push({
        label: `🔄 ${j.name} へ乗り換える（費用 ${j.cost}万円）${acted ? '［今年済］' : ''}`,
        disabled: acted || S.money < j.cost,
        confirm: () => `現在の副業から【${j.name}】へ乗り換えますか？（初期費用：${j.cost}万円）`,
        fn() {
          S.actedCareerYear = S.age;
          S.sideJob = { id: j.id, name: j.name };
          fx({ money: -j.cost });
          playSE('good');
          const est = calcSideJobIncome(S.sideJob);
          return `副業を【${j.name}】へ切り替えた！年約 +${fmtMoney(est)} の副収入が見込める！`;
        }
      });
    });
  }

  if (!S.job || S.job.name !== '起業家') {
    const sideBonus = S.sideJob ? 15 : 0;
    const startRate = clamp(Math.round(25 + S.smarts * 0.45 + sideBonus + (hasTrait('merchant') ? 12 : 0) + (hasTrait('lucky') ? 10 : 0)), 15, 95);
    choices.push({
      label: `🚀 会社を設立して起業する（開業資金 300万円｜成功率 ${startRate}%）`,
      disabled: acted || S.money < 300,
      confirm: () => `開業資金300万円を投じて会社を設立し、起業に挑戦しますか？\n（成功率：${startRate}%｜成功すると現在の本業から起業家へ転身します）`,
      fn() {
        S.actedCareerYear = S.age;
        fx({ money: -300 });
        if (chance(startRate / 100)) {
          S.student = false;
          const sideEst = S.sideJob ? calcSideJobIncome(S.sideJob) : 0;
          const initBase = 1200 + Math.round(sideEst * 0.8);
          setJob({ name: '起業家', base: initBase, icon: '🚀' });
          S.flags.founder = true;
          fx({ happy: 14, smarts: 4 });
          playSE('fanfare');
          return `起業は大成功！年商規模・年収${fmtMoney(initBase)}の社長になった！`;
        }
        fx({ happy: -8, smarts: 3 });
        playSE('bad');
        return '起業に挑戦したが軌道に乗らず、資金300万円を失った…しかし貴重な経験を得た。';
      }
    });
  } else {
    choices.push({
      label: `🏢 新規事業・大型投資を行う（資金 500万円）${acted ? '［今年済］' : ''}`,
      disabled: acted || S.money < 500,
      confirm: '資金500万円を投じて新規事業・大型投資を行いますか？',
      fn() {
        S.actedCareerYear = S.age;
        fx({ money: -500 });
        if (chance(0.55 + S.smarts / 250 + (hasTrait('merchant') ? 0.1 : 0))) {
          S.job.base = Math.round(S.job.base * 1.35);
          fx({ happy: 10 });
          playSE('fanfare');
          return `新規事業が大ヒット！役員報酬（年収）が ${fmtMoney(S.job.base)} に拡大した！`;
        }
        fx({ happy: -4 });
        return '新規事業は思うように伸びなかったが、本業は堅調だ。';
      }
    });
  }

  if (S.age >= 25 && (!S.job || S.job.name !== '政治家')) {
    const electRate = clamp(Math.round(15 + S.social * 0.4 + S.smarts * 0.3 + (hasTrait('charisma') ? 18 : 0) + (hasTrait('lucky') ? 10 : 0)), 10, 92);
    choices.push({
      label: `🗳️ 選挙に出馬して政治家を目指す（供託金 300万円｜当選率 ${electRate}%）`,
      disabled: acted || S.money < 300,
      confirm: () => `供託金300万円を支払って選挙に出馬しますか？\n（当選率：${electRate}%｜当選すると現在の職業から政治家へ転身し、落選すると供託金は失われます）`,
      fn() {
        S.actedCareerYear = S.age;
        fx({ money: -300 });
        if (chance(electRate / 100)) {
          S.student = false;
          setJob({ name: '政治家', base: 1400, icon: '🗳️' });
          S.flags.politician = true;
          fx({ happy: 15, looks: 5 });
          playSE('fanfare');
          return '見事当選！多くの有権者の支持を集め、政治家としてのキャリアをスタートした！';
        }
        fx({ happy: -6 });
        playSE('bad');
        return '惜しくも落選し、供託金300万円を失った…。';
      }
    });
  }

  if (!S.student && !S.retired) {
    choices.push({
      label: `📝 求人を探して就職・転職活動をする${acted ? '［今年済］' : ''}`,
      disabled: acted,
      fn() {
        S.actedCareerYear = S.age;
        return { text: 'キャリアアップを目指して求人を探した。', then: jobHuntEvent() };
      }
    });
  }

  choices.push({ label: '閉じる', cancel: true, fn: () => '' });
  return {
    icon: '🚀', title: 'キャリア・副業・起業メニュー',
    text: `現在の本業：${jobTitle()}（年収 ${S.job ? fmtMoney(salary()) : '0万円'}）\n副業：${sideText}\n💡 副業を育てておくと、毎年の副収入が増えるだけでなく「起業」の成功率と初期年商が大きく跳ね上がります！`,
    choices,
  };
}

// ---------- 子どもの成長イベント（18歳進学） ----------
function checkKidMilestone() {
  for (const k of S.kids) {
    const kAge = S.age - k.birth;
    if (kAge === 18 && !k.stage18) {
      k.stage18 = true;
      return {
        icon: '🎓', title: `${k.name}の進路選択`,
        text: `子どもの「${k.name}」が18歳になり、高校卒業後の進路を相談された。`,
        choices: [
          {
            label: '🏫 大学の学費を全額支援する（200万円）',
            disabled: S.money < 200,
            fn() {
              k.supported = true;
              k.smarts = clamp((k.smarts || 50) + 25);
              fx({ money: -200, happy: 8 });
              playSE('good');
              return `${k.name}の大学進学を全力で応援した！「お父さん・お母さん、ありがとう！」`;
            }
          },
          {
            label: '📚 奨学金を借りて大学へ進学させる（無料）',
            fn() {
              k.smarts = clamp((k.smarts || 50) + 12);
              fx({ happy: 3 });
              return `${k.name}は自分の力で奨学金を借りて大学へ進学した。`;
            }
          },
          {
            label: '💼 高校卒業後に就職して自立させる',
            fn() {
              fx({ happy: 2 });
              return `${k.name}は高校卒業後、社会人としての一歩を踏み出した。`;
            }
          },
        ]
      };
    }
  }
  return null;
}

// ---------- ランダムイベント ----------
const EVENTS = [
  {
    id: 'lost', icon: '😢', title: '迷子になった', min: 3, max: 6, once: true, text: 'お祭りの人混みで家族とはぐれてしまった…', choices: [
      { label: '大声で泣く', fn() { fx({ happy: -2 }); return '泣き声を聞いた家族がすぐに見つけてくれた。'; } },
      { label: 'お巡りさんに助けを求める', fn() { fx({ smarts: 2, happy: 1 }); return '勇気を出して助けを求めた。しっかり者だと褒められた！'; } }]
  },
  {
    id: 'transfer', icon: '🧒', title: '転校生がやってきた', min: 7, max: 12, once: true, text: 'クラスに転校生がやってきた。ひとりで寂しそうにしている。', choices: [
      { label: '話しかける', fn() { fx({ happy: 4, looks: 2 }); S.flags.bestfriend = true; return '意気投合し、一生の親友になった！'; } },
      { label: '様子を見る', fn() { return '結局、あまり話す機会はなかった。'; } }]
  },
  {
    id: 'bully', icon: '🛑', title: 'いじめを目撃', min: 8, max: 15, once: true, text: 'クラスメイトがいじめられている場面に遭遇した。', choices: [
      { label: '勇気を出して止める', fn() { if (chance(0.6)) { fx({ happy: 5, looks: 3 }); return 'いじめは止まり、みんなから一目置かれるようになった。'; } fx({ happy: -4, health: -3 }); return '標的が自分に移ってしまった…。それでも後悔はしていない。'; } },
      { label: '先生に相談する', fn() { fx({ smarts: 2, happy: 2 }); return '先生が対応してくれて、事態は収まった。'; } },
      { label: '見て見ぬふり', fn() { fx({ happy: -5 }); return '心にずっと小さなトゲが刺さったままだ。'; } }]
  },
  {
    id: 'wallet', icon: '👛', title: '財布を拾った', min: 8, max: 90, once: true, text: '道端に分厚い財布が落ちている。', choices: [
      { label: '交番に届ける', fn() { fx({ happy: 4 }); if (chance(0.3 + (hasTrait('lucky') ? 0.2 : 0))) { fx({ money: 10 }); return '持ち主から丁寧なお礼（10万円）を受け取った！'; } return '持ち主は涙ながらに感謝してくれた。'; } },
      { label: 'こっそり自分のものに', fn() { fx({ money: 5, happy: -5 }); return '5万円を手に入れたが、罪悪感が消えない…'; } }]
  },
  {
    id: 'cat', icon: '🐱', title: '迷い猫', min: 8, max: 85, once: true, text: '雨の中、震える子猫を見つけた。', choices: [
      {
        label: '家に連れて帰る',
        fn() {
          fx({ happy: 8, money: S.age >= 18 ? -10 : 0 });
          S.flags.pet = true;
          const catName = pick(CAT_NAMES);
          S.flags.petName = catName;
          playSE('good');
          return `「${catName}」と名付け、家族の一員になった。`;
        }
      },
      { label: 'そっと立ち去る', fn() { fx({ happy: -2 }); return '振り返ると、子猫はまだこちらを見ていた。'; } }]
  },
  // --- 風邪（発生率大幅低減・クールダウン4年・健康度反映） ---
  {
    id: 'cold', icon: '🤒', title: 'ひどい風邪', min: 3, max: 110,
    p: 0.25,
    cond: () => (!S.lastColdYear || S.age - S.lastColdYear >= 4) && (!hasTrait('iron') || chance(0.4)) && (S.fitness < 80 || chance(0.35)),
    text: '高熱が出て寝込んでしまった。',
    choices: [
      {
        label: 'すぐ病院へ行く',
        fn() {
          S.lastColdYear = S.age;
          fx({ health: -1, money: S.age >= 18 ? -2 : 0 });
          return '早めの治療ですぐに回復した。';
        }
      },
      {
        label: '気合いで治す',
        fn() {
          S.lastColdYear = S.age;
          if (chance(S.fitness / 120 + (hasTrait('iron') ? 0.2 : 0))) {
            fx({ health: 1 });
            return '持ち前の体力で乗り切った！';
          }
          fx({ health: -r(5, 8) });
          return 'こじらせて長引いてしまった…';
        }
      }
    ]
  },
  // --- 子ども時代のイベント群 ---
  {
    id: 'secret_base', icon: '🌳', title: '秘密基地づくり', min: 6, max: 12, once: true,
    text: '近所の雑木林の奥に、誰も知らない秘密の場所を見つけた！',
    choices: [
      {
        label: '本格的な砦を作る',
        fn() {
          fx({ smarts: 3, happy: 5, health: -1 });
          playSE('good');
          return '段ボールや木の枝を集めて立派な基地を完成させた！最高の秘密基地だ！';
        }
      },
      {
        label: 'お菓子を持ち寄って語り合う',
        fn() {
          fx({ happy: 6, looks: 1 });
          return '持ち寄った駄菓子を食べながら、日が暮れるまで語り合った。';
        }
      }
    ]
  },
  {
    id: 'bicycle', icon: '🚲', title: '補助輪なしの挑戦', min: 4, max: 8, once: true,
    text: '自転車の補助輪を外し、一人で乗る練習をすることになった！',
    choices: [
      {
        label: '何度転んでも立ち上がる',
        fn() {
          fx({ health: 4, happy: 4 });
          playSE('good');
          return '擦り傷を作りながらもペダルをこぎ続け、ついに風を切って走れるようになった！';
        }
      },
      {
        label: '家族に後ろを支えてもらう',
        fn() {
          fx({ happy: 5, smarts: 1 });
          return '家族の温かい励ましを受けながら、少しずつ乗れるようになった。';
        }
      }
    ]
  },
  {
    id: 'bug_hunt', icon: '🐛', title: '夏の昆虫採集', min: 5, max: 11,
    text: '夏休みの早朝、クワガタやカブトムシを探しに森へ出かけた。',
    choices: [
      {
        label: '樹液の出ている木をじっくり探す',
        fn() {
          if (chance(0.5 + (hasTrait('lucky') ? 0.2 : 0))) {
            fx({ smarts: 3, happy: 6 });
            playSE('good');
            return '大きなノコギリクワガタを発見！大興奮で虫かごに入れた！';
          }
          fx({ smarts: 2, happy: 2 });
          return 'セミばかりだったが、森の生き物に詳しくなった。';
        }
      },
      {
        label: '友達と競争して虫を捕まえる',
        fn() {
          fx({ health: 3, happy: 4 });
          return '汗だくになりながら森を駆け回り、たくさんの昆虫を捕まえた！';
        }
      }
    ]
  },
  {
    id: 'sports_day', icon: '🏃', title: '運動会の徒競走', min: 6, max: 15,
    text: '秋の大運動会！ピストルの音が響き、徒競走がスタートした！',
    choices: [
      {
        label: '1位を目指して全力疾走！',
        fn() {
          if (chance(S.fitness / 120 + (hasTrait('iron') ? 0.2 : 0))) {
            fx({ health: 3, looks: 3, happy: 6 });
            playSE('fanfare');
            return '見事1位でゴールテープを切った！割れんばかりの大歓声を浴びた！';
          }
          fx({ health: 2, happy: 2 });
          return '惜しくも2位だったが、最後まで全力で走り抜けた！';
        }
      },
      {
        label: '転ばないようにマイペース',
        fn() {
          fx({ happy: 2 });
          return '怪我なく無事にゴールし、お弁当を美味しく食べた。';
        }
      }
    ]
  },
  {
    id: 'art_craft', icon: '🎨', title: '図画工作コンクール', min: 7, max: 14,
    text: '図工の時間に作った作品が、コンクールに出品されることになった。',
    choices: [
      {
        label: 'こだわりの技法で仕上げる',
        fn() {
          if (chance(S.smarts / 130 + (hasTrait('artist') ? 0.35 : 0.1))) {
            fx({ smarts: 4, looks: 3, happy: 7 });
            playSE('fanfare');
            return '見事に入選！体育館の正面に作品が展示され、みんなから称賛された！';
          }
          fx({ smarts: 3, happy: 2 });
          return '入賞は逃したものの、ものづくりの楽しさを実感した。';
        }
      },
      {
        label: '自由な発想で作る',
        fn() {
          fx({ happy: 4, smarts: 1 });
          return '独創的すぎる形になったが、先生から個性的だと褒められた！';
        }
      }
    ]
  },
  {
    id: 'library_book', icon: '📖', title: '図書室の出会い', min: 7, max: 14,
    text: '雨の日の放課後、静かな図書室で分厚い図鑑や物語本を開いた。',
    choices: [
      {
        label: '夢中で読みふける',
        fn() {
          fx({ smarts: 5, happy: 3 });
          playSE('good');
          return '知的好奇心を強く刺激され、世界の広さと未知の知識に魅了された！';
        }
      },
      {
        label: '挿絵を真似してノートに描く',
        fn() {
          fx({ looks: 2, smarts: 2, happy: 3 + (hasTrait('artist') ? 3 : 0) });
          return '素敵なイラストを描き上げ、友達に見せて喜ばれた！';
        }
      }
    ]
  },
  {
    id: 'candy_shop', icon: '🪙', title: '駄菓子屋のくじ', min: 6, max: 12,
    text: 'お小遣いを握りしめて、放課後にレトロな駄菓子屋へやってきた。',
    choices: [
      {
        label: '1回50円の運試しクジを引く',
        fn() {
          if (chance(0.35 + (hasTrait('lucky') ? 0.3 : 0))) {
            fx({ happy: 6 });
            playSE('good');
            return 'なんと特等の大きなスーパーボールとお菓子セットが当たった！大興奮！';
          }
          fx({ happy: 2 });
          return 'ハズレだったが、おまけのラムネをもらって笑顔になった。';
        }
      },
      {
        label: '好きなお菓子をじっくり選ぶ',
        fn() {
          fx({ happy: 4 });
          return 'ポテトスナックやすもも漬けを買い、ベンチで美味しく食べた。';
        }
      }
    ]
  },
  {
    id: 'neighborhood_dog', icon: '🐶', title: '通学路のワンちゃん', min: 3, max: 10,
    text: '通学路の庭先で、人懐っこい大きな犬が尻尾を振って見つめてきた。',
    choices: [
      {
        label: '優しく頭をなでる',
        fn() {
          fx({ happy: 5, looks: 1 });
          return '気持ちよさそうに目を細めてすり寄ってきた！すっかり仲良しになった。';
        }
      },
      {
        label: '笑顔で手を振って通り過ぎる',
        fn() {
          fx({ happy: 2 });
          return 'ワンちゃんも「ワン！」と元気に挨拶を返してくれた。';
        }
      }
    ]
  },
  {
    id: 'snow_day', icon: '❄️', title: '大雪の朝', min: 5, max: 13,
    text: '朝起きると一面の大雪！学校も臨時休校になった！',
    choices: [
      {
        label: '友達と巨大なかまくらを作る',
        fn() {
          fx({ health: 3, happy: 6 });
          playSE('good');
          return 'みんなで雪を積み上げ、中に入れる立派なかまくらを完成させた！';
        }
      },
      {
        label: 'こたつでみかんを食べながらのんびり',
        fn() {
          fx({ happy: 4, health: 1 });
          return '温かい部屋で雪景色を眺めながら、至福の時間を過ごした。';
        }
      }
    ]
  },
  {
    id: 'school_trip', icon: '🎒', title: '修学旅行の消灯後', min: 10, max: 15, once: true,
    text: '修学旅行の宿で消灯時間を過ぎたが、興奮してみんな眠れそうにない。',
    choices: [
      {
        label: '布団の中で恋バナを始める',
        fn() {
          fx({ happy: 6, looks: 2 });
          return '「誰が好きなの？」と夜遅くまで語り明かし、かけがえのない思い出になった！';
        }
      },
      {
        label: '静かに枕投げ大会を開戦',
        fn() {
          fx({ health: 2, happy: 4 });
          return '熱いバトルが繰り広げられたが、先生の見回りに気付いて一斉に寝たふりをした！';
        }
      },
      {
        label: '明日のためにぐっすり眠る',
        fn() {
          fx({ health: 3, happy: 1 });
          return '翌日の班別行動に万全の体調で臨むことができた。';
        }
      }
    ]
  },
  {
    id: 'music_recital', icon: '🎵', title: '音楽の発表会', min: 6, max: 14, once: true,
    text: '地域の音楽発表会で、ステージ上で演奏することになった。',
    choices: [
      {
        label: '練習の成果を堂々と披露する',
        fn() {
          if (chance(S.creativity / 130 + (hasTrait('artist') ? 0.3 : 0.1))) {
            fx({ looks: 4, happy: 7, smarts: 2 });
            playSE('fanfare');
            return '見事な演奏で会場から拍手喝采を浴びた！大きな自信がついた！';
          }
          fx({ looks: 2, happy: 3 });
          return '少し緊張して指が震えたが、最後まで一生懸命演奏しきった。';
        }
      },
      {
        label: '深呼吸して落ち着いて弾く',
        fn() {
          fx({ smarts: 2, happy: 3 });
          return 'ミスなく丁寧に弾き終え、ホッと胸をなでおろした。';
        }
      }
    ]
  },
  {
    id: 'meteor_shower', icon: '🌌', title: '流星群の夜', min: 7, max: 15, once: true,
    text: '今夜は数年に一度の流星群が見られる特別な夜。屋上へ星を見に行った。',
    choices: [
      {
        label: '流れ星に将来の夢を祈る',
        fn() {
          fx({ happy: 7, smarts: 3 });
          playSE('good');
          return '幾筋もの光が夜空を駆け抜けた！心に刻まれる感動の夜になった。';
        }
      },
      {
        label: '星座早見盤で星を探す',
        fn() {
          fx({ smarts: 4, happy: 4 });
          return '満天の星空から星座を見つけ出し、宇宙へのロマンが広がった。';
        }
      }
    ]
  },
  {
    id: 'first_cook', icon: '🍳', title: 'はじめての料理', min: 8, max: 14, once: true,
    text: '家族のために、自分で夕飯のおかずを一品作ってみることにした！',
    choices: [
      {
        label: 'ふわとろオムライスに挑戦',
        fn() {
          if (chance(0.6 + S.smarts / 200)) {
            fx({ happy: 6, smarts: 2 });
            playSE('good');
            return '綺麗なオムライスが完成！「美味しい！」と家族みんなが大絶賛してくれた！';
          }
          fx({ happy: 3, smarts: 1 });
          return '形は少し崩れたけれど、味は上々！家族が喜んで食べてくれた。';
        }
      },
      {
        label: '基本の野菜サラダを作る',
        fn() {
          fx({ happy: 3, health: 1 });
          return '包丁に気をつけながら丁寧に野菜を切り、食卓を彩った。';
        }
      }
    ]
  },
  {
    id: 'class_leader', icon: '🏫', title: '学級委員・係決め', min: 9, max: 15,
    text: '新学期、クラスのまとめ役や各係を決める学級会が開かれた。',
    choices: [
      {
        label: '学級委員・リーダーに立候補する',
        fn() {
          if (chance(S.social / 130 + S.smarts / 200 + (hasTrait('charisma') ? 0.3 : 0))) {
            fx({ looks: 4, smarts: 3, happy: 4 });
            playSE('good');
            return 'みんなの推薦で学級委員に選出！クラスの頼れるリーダーになった！';
          }
          fx({ looks: 2, happy: 2 });
          return '激戦の末に副委員長となり、クラスを支えることになった。';
        }
      },
      {
        label: '生き物係・図書係を希望する',
        fn() {
          fx({ smarts: 2, happy: 3 });
          return '水槽の魚や植物の世話を熱心に行い、先生から感謝された。';
        }
      },
      {
        label: '目立たない係で堅実にいく',
        fn() {
          fx({ happy: 1 });
          return '自分の仕事をきっちりこなし、平穏な学期を過ごした。';
        }
      }
    ]
  },
  {
    id: 'contest', icon: '🎤', title: 'のど自慢大会', min: 10, max: 30, once: true, text: '地元ののど自慢大会のポスターが目に入った。', choices: [
      { label: '出場する！', fn() { if (chance((S.social + S.creativity) / 240 + 0.1 + (hasTrait('charisma') ? 0.2 : 0))) { fx({ happy: 8, looks: 4 }); playSE('fanfare'); return '見事優勝！ちょっとした有名人になった。'; } fx({ happy: -2, looks: 1 }); return '緊張で声が裏返った…でも良い経験になった。'; } },
      { label: '客席から応援', fn() { fx({ happy: 1 }); return '楽しいひとときだった。'; } }]
  },
  {
    id: 'nightgame', icon: '🎮', title: '新作ゲームの発売日', min: 12, max: 30, text: 'ずっと待っていたゲームが発売された！明日は大事な日だけど…', choices: [
      { label: '徹夜でプレイ', fn() { fx({ happy: 5, health: -3, smarts: -1 }); return '最高だった。でも翌日はボロボロ。'; } },
      { label: 'ぐっと我慢して寝る', fn() { fx({ smarts: 1, health: 1 }); return '自制心が少し鍛えられた。'; } }]
  },
  {
    id: 'confess', icon: '💌', title: '告白された', min: 14, max: 35, cond: () => !S.partner,
    text: () => {
      S.tmp = randomPartner();
      if (isHighSchoolStudent()) {
        const spot = pick(['放課後の教室で', '夕暮れの校舎裏で', '部活終わりの帰り道']);
        return `${spot}、同じ高校の${S.tmp}から「ずっと好きでした…！付き合ってください！」と告白された！`;
      }
      if (isJuniorHighStudent()) {
        return `放課後の下駄箱で手紙をもらい、同級生の${S.tmp}から「好きです」と告白された！`;
      }
      return `${S.tmp}から「ずっと好きでした」と告白された！`;
    },
    choices: [
      {
        label: '付き合う',
        fn() {
          setPartner(S.tmp, 70);
          fx({ happy: 8 });
          playSE('good');
          if (isHighSchoolStudent()) {
            return `${S.tmp}（${S.partnerInfo.trait}な高校生）と付き合うことになった！甘酸っぱい高校生活の始まりだ！`;
          }
          if (isJuniorHighStudent()) {
            return `${S.tmp}（${S.partnerInfo.trait}な同級生）と付き合うことになった。`;
          }
          return `${S.tmp}（${S.partnerInfo.trait}）と付き合うことになった。`;
        }
      },
      { label: 'ごめんなさい', fn() { fx({ happy: -1 }); return '丁重にお断りした。'; } }
    ]
  },
  {
    id: 'hs_bunkasai', icon: '🎆', title: '文化祭の後夜祭', min: 15, max: 17, cond: () => isHighSchoolStudent(),
    text: () => S.partner
      ? `文化祭のフィナーレ。グラウンドのキャンプファイヤーを、恋人の${S.partner}と一緒に眺めている。`
      : '文化祭の後夜祭。賑やかなフォークダンスで、気になる同級生と目が合った…！',
    choices: [
      {
        label: () => S.partner ? 'そっと手を繋ぐ' : '思い切って話しかけてみる',
        fn() {
          if (S.partner) {
            S.partnerLove = clamp(S.partnerLove + 15);
            fx({ happy: 10 });
            playSE('good');
            return `${S.partner}は優しく握り返してくれた。最高の青春の思い出になった！（親密度 ${S.partnerLove}%）`;
          }
          if (chance(0.35 + S.social / 160 + (hasTrait('beloved') ? 0.2 : 0))) {
            const p = randomPartner();
            setPartner(p, 70);
            fx({ happy: 10, looks: 2 });
            playSE('fanfare');
            return `意気投合し、後夜祭の最後に${p}と付き合うことになった！甘酸っぱい青春の始まり！`;
          }
          fx({ happy: 3 });
          return '楽しい会話で盛り上がり、良い思い出になった。';
        }
      },
      {
        label: '友達と一緒に盛り上がる',
        fn() {
          fx({ happy: 4 });
          return 'クラスメイトたちと大騒ぎして青春を満喫した！';
        }
      }
    ]
  },
  {
    id: 'hs_study_date', icon: '📖', title: '放課後の勉強会', min: 15, max: 17, cond: () => isHighSchoolStudent() && !!S.partner,
    text: () => `期末テスト前。放課後の図書室で恋人の${S.partner}と二人で勉強することになった。`,
    choices: [
      {
        label: '真面目に教え合いながら勉強する',
        fn() {
          S.partnerLove = clamp(S.partnerLove + 10);
          fx({ smarts: 2, happy: 5 });
          playSE('good');
          return `${S.partner}と教え合いながら集中して勉強した！二人ともテストの手応えはバッチリ！（知力+2、親密度 ${S.partnerLove}%）`;
        }
      },
      {
        label: 'おしゃべりしてイチャイチャする',
        fn() {
          S.partnerLove = clamp(S.partnerLove + 15);
          fx({ happy: 7, smarts: -1 });
          playSE('good');
          return `勉強そっちのけでおしゃべりに夢中になり、楽しい時間を過ごした！（親密度 ${S.partnerLove}%、テスト勉強は…？）`;
        }
      }
    ]
  },
  {
    id: 'hs_school_trip', icon: '⛩️', title: '修学旅行の自由行動', min: 16, max: 16, once: true, cond: () => isHighSchoolStudent(),
    text: () => S.partner
      ? `高校2年生の修学旅行。自由行動の班別研修で、恋人の${S.partner}と一緒に名所を巡る約束をした！`
      : '高校2年生の修学旅行。歴史ある街並みを散策する自由行動の時間だ。',
    choices: [
      {
        label: () => S.partner ? 'お揃いのお守りを買う' : '友達と名所を満喫する',
        fn() {
          if (S.partner) {
            S.partnerLove = clamp(S.partnerLove + 15);
            fx({ happy: 8 });
            playSE('good');
            return `${S.partner}と二人でお揃いの縁結びお守りを買った！一生忘れられない思い出になった！（親密度 ${S.partnerLove}%）`;
          }
          fx({ happy: 6, smarts: 1 });
          return '名所を巡り、歴史と文化に触れる充実した時間を過ごした！';
        }
      },
      {
        label: '美味しいご当地スイーツを食べ歩く',
        fn() {
          fx({ happy: 6, health: 1 });
          return '名物のスイーツをお腹いっぱい食べて大満足！';
        }
      }
    ]
  },
  {
    id: 'meet', icon: '💞', title: '運命の出会い？', min: 20, max: 50, p: 1.5, cond: () => !S.partner,
    text: () => { S.tmp = randomPartner(); return `友人の紹介で${S.tmp}と出会った。気になる…！`; }, choices: [
      { label: '積極的にアプローチ', fn() { if (chance(0.25 + S.social / 150 + (hasTrait('beloved') ? 0.2 : 0))) { setPartner(S.tmp, 70); fx({ happy: 8 }); playSE('good'); return `想いが通じ、${S.tmp}と交際を始めた！`; } fx({ happy: -4 }); return '残念、振られてしまった…'; } },
      { label: '友達のままでいる', fn() { return '良い友人関係が続いた。'; } }]
  },
  {
    id: 'propose', icon: '💍', title: 'プロポーズ', min: 20, max: 60, p: 2, cond: () => S.partner && !S.married,
    text: () => `${S.partner}との交際も順調。そろそろ将来を考える時期かもしれない。`, choices: [
      { label: 'プロポーズする', fn() { if (chance(0.75 + S.happy / 400 + (hasTrait('beloved') ? 0.15 : 0))) { S.married = true; S.flags.married = true; S.partnerLove = clamp(S.partnerLove + 15); fx({ happy: 15, money: -100 }); playSE('fanfare'); return `${S.partner}と結婚した！温かい式を挙げた。`; } S.partner = null; S.partnerLove = 0; S.partnerInfo = null; fx({ happy: -10 }); return 'まさかの返事…二人は別々の道を歩むことになった。'; } },
      { label: 'まだ早い', fn() { if (chance(0.25)) { const p = S.partner; S.partner = null; S.partnerLove = 0; S.partnerInfo = null; fx({ happy: -6 }); return `煮え切らない態度に、${p}は去っていった…`; } return 'もう少し今の関係を楽しむことにした。'; } }]
  },
  {
    id: 'baby', icon: '👶', title: '新しい命', min: 24, max: 44, p: 2, cond: () => S.married && S.kids.length < 4,
    text: 'パートナーと子どもについて話し合った。', choices: [
      { label: '子どもを迎えたい', fn() { if (chance(0.75)) { const kid = addKid(); fx({ happy: 14 }); playSE('fanfare'); return `第${S.kids.length}子「${kid.name}」が誕生した！`; } fx({ happy: -2 }); return 'なかなか授からなかった…。'; } },
      { label: '今はまだ', fn() { return '二人の時間を大切にすることにした。'; } }]
  },
  {
    id: 'crisis', icon: '💔', title: '夫婦の危機', min: 25, max: 85, p: 1.5, cond: () => S.married && (S.happy < 45 || S.partnerLove < 40),
    text: () => `${S.partner}とのすれ違いが続いている…`, choices: [
      { label: 'じっくり話し合う', fn() { if (chance(0.6 + (hasTrait('beloved') ? 0.2 : 0))) { S.partnerLove = clamp(S.partnerLove + 20); fx({ happy: 6 }); return '本音で語り合い、絆が深まった。'; } return '話し合いは決裂した。' + divorce(); } },
      { label: '離婚を切り出す', danger: true, confirm: () => `本当に配偶者の${S.partner}と離婚しますか？\n（財産分与で貯金の30%を失い、パートナーの共働き収入もなくなります）`, fn() { return divorce(); } }]
  },
  {
    id: 'bf_business', icon: '🤝', title: '親友からの誘い', min: 26, max: 55, once: true, cond: () => S.flags.bestfriend,
    text: '小学生時代の親友と再会し、一緒にビジネスプロジェクトをやらないかと誘われた！', choices: [
      { label: '一緒に挑戦する', fn() { fx({ money: 250, happy: 8, smarts: 3 }); playSE('fanfare'); return '親友とのプロジェクトは大成功！250万円の報酬と最高の達成感を得た！'; } },
      { label: '応援だけする', fn() { fx({ happy: 3 }); return '親友の挑戦を温かく応援した。'; } }]
  },
  {
    id: 'lottery', icon: '🎫', title: '宝くじ売り場', min: 20, max: 90, text: '年末ジャンボ宝くじが発売中。「1等 3億円」の文字が輝いている。', choices: [
      { label: '10枚買う（3,000円）', fn() { const x = Math.random(); const mult = hasTrait('lucky') ? 2.5 : 1; if (x < 0.004 * mult) { fx({ money: 30000, happy: 20 }); S.flags.lottery = true; playSE('fanfare'); return '……1等当選！！！ 3億円を手にした！'; } if (x < 0.04 * mult) { fx({ money: 100, happy: 6 }); playSE('good'); return '3等当選！100万円が当たった！'; } return '全部ハズレだった。夢を買ったと思おう。'; } },
      { label: '買わない', fn() { return '堅実に生きることにした。'; } }]
  },
  {
    id: 'invest', icon: '📈', title: '投資の誘い', min: 25, max: 70, cond: () => S.money >= 100, text: '知人から「絶対に儲かる」投資話を持ちかけられた。', choices: [
      { label: '100万円投資する', fn() { const x = Math.random(); if (x < 0.3 + S.smarts / 500 + (hasTrait('lucky') ? 0.15 : 0)) { fx({ money: 150, happy: 5 }); playSE('good'); return '大当たり！250万円になって戻ってきた。'; } if (x < 0.75) { fx({ money: -40 }); return '少し損をしてしまった。'; } fx({ money: -100, happy: -6 }); return '詐欺だった…。100万円が消えた。'; } },
      { label: 'インデックス投資にする', fn() { fx({ money: -50, smarts: 1 }); S.assets.stock += 65; return '50万円をインデックス投信に積み立て、65万円に増えた！'; } },
      { label: '断る', fn() { return 'うまい話には裏がある。'; } }]
  },
  {
    id: 'boss', icon: '😤', title: '理不尽な上司', min: 18, max: 64, cond: () => S.job && S.job.corp, text: '上司に理不尽な理由で怒鳴られた。', choices: [
      { label: '堂々と反論する', fn() { if (chance(S.smarts / 150)) { fx({ happy: 5 }); return '論理的な反論に上司も納得。周囲の評価が上がった！'; } fx({ happy: -5 }); return '関係が悪化し、職場の居心地が悪くなった…'; } },
      { label: 'ぐっとこらえる', fn() { fx({ happy: -3, health: -2 }); return 'ストレスが溜まった…'; } },
      { label: '辞表を叩きつける', danger: true, confirm: () => `本当に今の仕事「${jobTitle()}」に辞表を出して退職しますか？\n（無職になり、本業の収入がなくなります）`, fn() { const j = S.job.name; S.job = null; fx({ happy: 4 }); return `${j}を辞めた。スッキリしたが、明日からどうしよう。`; } }]
  },
  {
    id: 'scout', icon: '📸', title: '芸能スカウト', min: 15, max: 28, once: true, cond: () => (S.social >= 65 || S.creativity >= 65 || hasTrait('charisma')), text: '街を歩いていると、芸能事務所のスカウトに声をかけられた！', choices: [
      { label: '芸能界に挑戦する', confirm: '現在の生活・仕事を離れて芸能界デビューに挑戦しますか？（失敗する可能性もあります）', fn() { if (chance((S.social + S.creativity) / 250 + (hasTrait('charisma') ? 0.2 : 0))) { S.student = false; setJob({ name: '芸能人', base: 900, icon: '🌟' }); S.flags.star = true; fx({ happy: 10, looks: 5 }); playSE('fanfare'); return 'デビューは大成功！一躍人気者になった！'; } fx({ happy: -5 }); return 'オーディションに落ち続け、夢を諦めた…'; } },
      { label: '断る', fn() { return '平穏な暮らしを選んだ。'; } }]
  },
  {
    id: 'sports', icon: '🏅', title: 'スポーツの才能', min: 13, max: 16, once: true, cond: () => (S.fitness >= 72 || hasTrait('iron')) && S.student, text: '部活の顧問から「君にはプロになれる才能がある」と言われた。', choices: [
      { label: 'プロを目指して練習漬け', fn() { S.flags.athlete = true; fx({ health: 6, smarts: -3 }); return '毎日限界まで練習に打ち込んだ。'; } },
      { label: '趣味として続ける', fn() { fx({ happy: 3 }); return '楽しくスポーツを続けた。'; } }]
  },
  {
    id: 'startup', icon: '🚀', title: '起業のひらめき', min: 26, max: 55, once: true, cond: () => S.smarts >= 55 && S.job && S.job.name !== '起業家', text: '画期的なビジネスのアイデアを思いついた！', choices: [
      { label: '会社を辞めて起業する', danger: true, confirm: () => `本当に現在の仕事「${jobTitle()}」を辞め、開業資金300万円を投じて起業に挑戦しますか？\n（失敗すると300万円を失い無職になります）`, fn() { fx({ money: -300 }); if (chance(0.2 + S.smarts / 250 + (hasTrait('merchant') ? 0.15 : 0))) { setJob({ name: '起業家', base: 1500, icon: '🚀' }); S.flags.founder = true; fx({ happy: 12 }); playSE('fanfare'); return '事業は大成功！一代で会社を築き上げた！'; } S.job = null; fx({ happy: -10 }); return '事業は失敗…。300万円の借金と挫折だけが残った。'; } },
      { label: '安定を選ぶ', fn() { return 'アイデアはノートの片隅にしまった。'; } }]
  },
  {
    id: 'abroad', icon: '✈️', title: '留学のチャンス', min: 18, max: 21, once: true, cond: () => S.student, text: '大学の交換留学プログラムに応募できるらしい。', choices: [
      { label: '留学する', fn() { fx({ smarts: 8, happy: 6, money: -100 }); S.flags.abroad = true; playSE('good'); return '海外で1年間を過ごし、視野が大きく広がった！'; } },
      { label: '見送る', fn() { return '日本で学業を続けることにした。'; } }]
  },
  {
    id: 'restructure', icon: '📉', title: 'リストラの通告', min: 40, max: 63, once: true, cond: () => S.job && S.job.corp, text: '会社の業績悪化で、早期退職を勧められた。', choices: [
      { label: '退職金をもらって辞める', danger: true, confirm: '割増退職金（500万円）を受け取って会社を退職しますか？（無職になります）', fn() { fx({ money: 500, happy: -5 }); S.job = null; return '割増退職金500万円を受け取り、会社を去った。'; } },
      { label: 'しがみつく', fn() { if (chance(0.5)) { fx({ happy: -3 }); return 'なんとか会社に残ることができた。'; } S.job.level = Math.max(0, S.job.level - 1); fx({ happy: -8 }); return '降格処分になってしまった…'; } }]
  },
  {
    id: 'headhunt', icon: '💴', title: 'ヘッドハンティング', min: 28, max: 55, once: true, cond: () => S.job && S.smarts >= 65, text: 'ライバル企業から好条件での引き抜きの話が来た。', choices: [
      { label: '移籍する', fn() { S.job.base = Math.round(S.job.base * 1.3); fx({ happy: 3 }); playSE('good'); return '年収が大幅にアップした！'; } },
      { label: '今の会社に残る', fn() { fx({ happy: 2 }); return '恩義を大切にした。'; } }]
  },
  {
    id: 'checkup', icon: '🩺', title: '健康診断の結果', min: 35, max: 90, text: '健康診断で「要注意」の判定が出た。', choices: [
      { label: '生活習慣を改める', fn() { fx({ health: 6, happy: -2 }); return '食事と運動を見直し、数値が改善した。'; } },
      { label: '気にしない', fn() { if (chance(0.5)) return '特に問題はなかった…今のところは。'; fx({ health: -8 }); return '放置したツケが回ってきた…'; } }]
  },
  {
    id: 'illness', icon: '🏥', title: '大きな病気', min: 40, max: 110, p: 0.8, text: '精密検査で、重い病気が見つかった。', choices: [
      { label: '最先端の治療を受ける（300万円）', fn() { fx({ money: -300 }); if (chance(0.85 + (hasTrait('iron') ? 0.1 : 0))) { fx({ health: -5 }); return '治療は成功し、無事に回復した。'; } fx({ health: -20 }); return '治療の甲斐なく、体は弱ってしまった…'; } },
      { label: '標準治療を受ける（50万円）', fn() { fx({ money: -50 }); if (chance(0.6 + (hasTrait('iron') ? 0.15 : 0))) { fx({ health: -10 }); return 'つらい治療を乗り越えた。'; } fx({ health: -25 }); return '病は体を深く蝕んだ…'; } }]
  },
  {
    id: 'house', icon: '🏠', title: 'マイホームの掘り出し物件', min: 28, max: 55, once: true, cond: () => !S.assets.house && S.money >= 1200, text: '条件の良いマンションが相場より安く売りに出されている！', choices: [
      { label: '購入する（1,200万円）', confirm: '1,200万円で掘り出し物の中古マンションを購入しますか？', fn() { fx({ money: -1200, happy: 12 }); S.assets.house = 'condo'; S.flags.house = true; playSE('fanfare'); return '掘り出し物のマイホームを手に入れた！'; } },
      { label: '見送る', fn() { return '今回は見送ることにした。'; } }]
  },
  {
    id: 'care', icon: '🧓', title: '親の介護', min: 45, max: 65, once: true,
    cond: () => !S.flags.parent_deceased,
    text: '年老いた親に介護が必要になった。',
    choices: [
      {
        label: '自分で介護する（100万円）',
        fn() {
          S.flags.parent_care = true;
          fx({ happy: -4, health: -3, money: -100 });
          return '仕事と両立しながら懸命に介護を続けた。親は何度も感謝の言葉をかけてくれた。';
        }
      },
      {
        label: '施設にお願いする（400万円）',
        disabled: () => !S || S.money < 400,
        fn() {
          S.flags.parent_care = true;
          fx({ money: -400, happy: -2 });
          return '手厚い介護施設にお願いし、週末ごとにできる限り面会に通った。';
        }
      }
    ]
  },
  {
    id: 'reunion', icon: '🍻', title: '同窓会のお知らせ', min: 28, max: 75, text: '久しぶりに同窓会の案内が届いた。', choices: [
      { label: '参加する', fn() { fx({ happy: 5, money: -2 }); if (!S.partner && chance(0.25)) { setPartner(randomPartner(), 72); return `懐かしい話に花が咲き、${S.partner}と交際することに！`; } return '懐かしい顔ぶれと楽しい時間を過ごした。'; } },
      { label: '欠席する', fn() { return '今の生活を優先した。'; } }]
  },
  {
    id: 'volunteer', icon: '🤝', title: 'ボランティア募集', min: 15, max: 85, text: '被災地支援のボランティアを募集している。', choices: [
      { label: '参加する', fn() { fx({ happy: 5, health: -1, smarts: 1 }); return '人の役に立てる喜びを知った。'; } },
      { label: '寄付だけする', fn() { fx({ money: S.age >= 18 ? -3 : 0, happy: 2 }); return '少額だが寄付をした。'; } }]
  },
  {
    id: 'travel', icon: '🗺️', title: '旅行の誘い', min: 18, max: 85, text: '友人から旅行に誘われた。', choices: [
      { label: '行く！', fn() { fx({ happy: 6, money: -20 }); return '一生ものの思い出ができた。'; } },
      { label: '今回はパス', fn() { return '家でゆっくり過ごした。'; } }]
  },
  {
    id: 'grandchild', icon: '👼', title: '孫の誕生', min: 50, max: 95, once: true, cond: () => S.kids.some(k => S.age - k.birth >= 25), text: '独立した子どもから「赤ちゃんが生まれた」と連絡があった！', choices: [
      { label: 'すぐに会いに行く', fn() { fx({ happy: 12 }); S.flags.grandchild = true; playSE('fanfare'); return '小さな手を握り、涙がこぼれた。'; } }]
  },
  {
    id: 'parentloss', icon: '🕯️', title: '親との別れ', min: 50, max: 75, once: true,
    cond: () => !S.flags.parent_deceased,
    text: () => S.flags.parent_care
      ? '長年の介護の末、親が家族に見守られながら静かに息を引き取った。'
      : '実家の親が静かに息を引き取ったと連絡が入った。',
    choices: [
      {
        label: '感謝を伝える',
        fn() {
          S.flags.parent_deceased = true;
          let inheritText = '';
          if (S.family === 'rich') {
            fx({ money: 300 });
            inheritText = ' 実家の遺産（300万円）を相続した。';
          } else if (S.family === 'normal') {
            fx({ money: 50 });
            inheritText = ' 実家の預貯金（50万円）を形見として受け取った。';
          }
          fx({ happy: -6, smarts: 2 });
          return `「今まで育ててくれてありがとう」——最後に温かく見送ることができた。${inheritText}`;
        }
      }
    ]
  },
  {
    id: 'hobby', icon: '🎨', title: '新しい趣味', min: 60, max: 100, text: 'カルチャーセンターで面白そうな講座を見つけた。', choices: [
      { label: '始めてみる', fn() { fx({ happy: 6, smarts: 3 }); return '新しい仲間ができ、毎日が楽しくなった。'; } },
      { label: '今さらいいよ', fn() { fx({ happy: -1 }); return 'いつも通りの毎日を過ごした。'; } }]
  },
];

// ---------- ワールドイベント（社会・世界トレンド） ----------
const WORLD_EVENTS = [
  // --- 経済・ビジネス・金融 ---
  {
    id: 'w_tech_boom', icon: '🚀', title: 'IT・AI技術革命の波',
    badge: 'WORLD NEWS', isWorld: true,
    min: 16, max: 80,
    text: '世界的なAI・ITテクノロジー革命が到来！関連企業の株価が高騰し、デジタルスキルの需要が急増している。',
    choices: [
      {
        label: '💻 AIやプログラミングを独学で学ぶ',
        fn() {
          const techBonus = hasTrait('genius') ? 6 : 3;
          fx({ smarts: r(3, 5) + techBonus, happy: 2 });
          playSE('good');
          return '新時代のテクノロジーを学び、知力と視野が大きく広がった！';
        }
      },
      {
        label: '📈 ハイテク関連株に投資する（50万円）',
        cond: () => S.money >= 50,
        fn() {
          fx({ money: -50 });
          if (chance(0.65 + (hasTrait('lucky') ? 0.2 : 0) + (hasTrait('merchant') ? 0.1 : 0))) {
            const gain = r(120, 250);
            fx({ money: gain, happy: 8 });
            playSE('fanfare');
            return `ハイテク株が大化け！+${gain}万円のリターンを得た！`;
          }
          fx({ money: 15, happy: -3 });
          return 'バブルが一時調整し、リターンはわずか15万円にとどまった。';
        }
      },
      {
        label: '☕ 静観していつもの日常を過ごす',
        fn() { return '時代の変化をニュースで眺めながらマイペースに過ごした。'; }
      }
    ]
  },
  {
    id: 'w_financial_crisis', icon: '📉', title: '世界金融危機・大不況',
    badge: 'WORLD NEWS', isWorld: true,
    min: 22, max: 90,
    text: '大手金融機関の破綻をきっかけに、世界的な信用収縮と大不況が勃発。株価の急落とボーナスカットの嵐が吹き荒れる。',
    choices: [
      {
        label: '🛡️ 守りに徹して徹底的に節約する',
        fn() {
          fx({ happy: -3, smarts: 2 });
          return '無駄な出費を削り、嵐が過ぎ去るのをじっと耐えた。';
        }
      },
      {
        label: '🛒 バーゲンセールと見て株を買い増す（100万円）',
        cond: () => S.money >= 100,
        fn() {
          fx({ money: -100 });
          if (chance(0.6 + (hasTrait('merchant') ? 0.2 : 0) + (hasTrait('lucky') ? 0.15 : 0))) {
            const ret = r(200, 350);
            fx({ money: ret, happy: 10 });
            playSE('fanfare');
            return `逆張り投資が見事に的中！底値で仕込んだ資産が+${ret}万円に化けた！`;
          }
          fx({ money: 40, happy: -5 });
          return '不況が長引き、資産は目減りした。回復には時間がかかりそうだ…';
        }
      },
      {
        label: '💼 自分のスキルを磨きリスクに備える',
        fn() {
          fx({ smarts: 4, happy: 1 });
          return '資格勉強や人脈作りに励み、どんな不況にも負けない力をつけた。';
        }
      }
    ]
  },
  {
    id: 'w_crypto_craze', icon: '🪙', title: '暗号資産・デジタル通貨ブーム',
    badge: 'WORLD NEWS', isWorld: true,
    min: 18, max: 70,
    text: '怪しくも魅力的な暗号資産（仮想通貨）が世界中で話題沸騰。「一晩で億り人」のニュースが連日飛び交っている。',
    choices: [
      {
        label: '🎲 夢を見て全力投機する（100万円）',
        cond: () => S.money >= 100,
        fn() {
          fx({ money: -100 });
          if (chance(0.4 + (hasTrait('lucky') ? 0.35 : 0))) {
            const jackpot = r(300, 800);
            fx({ money: jackpot, happy: 14 });
            playSE('fanfare');
            return `爆益達成！草コインが急騰し、一気に+${jackpot}万円を手に入れた！`;
          }
          fx({ happy: -8 });
          playSE('bad');
          return '買った翌日に大暴落！投資した100万円がほぼ藻屑と消えた…';
        }
      },
      {
        label: '🧪 お小遣い程度で少額体験（10万円）',
        cond: () => S.money >= 10,
        fn() {
          fx({ money: -10 });
          const ret = chance(0.5) ? 25 : 5;
          fx({ money: ret, smarts: 2 });
          return `最新金融の仕組みを学び、${ret}万円になって返ってきた。良い勉強になった。`;
        }
      },
      {
        label: '🙅‍♂️ 手を出さず堅実に暮らす',
        fn() { fx({ happy: 1 }); return '浮ついた話には乗らず、自分の生活を大切にした。'; }
      }
    ]
  },
  {
    id: 'w_real_estate_surge', icon: '🏙️', title: '都市部・不動産バブル',
    badge: 'WORLD NEWS', isWorld: true,
    min: 24, max: 85,
    text: '都市部の再開発と海外マネーの流入により、不動産価格が記録的な高騰を見せている。',
    choices: [
      {
        label: '🏢 持ち家・不動産の価値を実感する',
        cond: () => !!(S.flags.house || S.assets.estate > 0),
        fn() {
          const gain = S.assets.estate > 0 ? r(200, 500) : 100;
          fx({ money: gain, happy: 8 });
          playSE('fanfare');
          return `所有不動産の資産価値が急上昇！売却益や含み益で実質+${gain}万円の恩恵を受けた！`;
        }
      },
      {
        label: '📑 不動産関連の資格・知識を身につける',
        fn() {
          fx({ smarts: 4 });
          return '宅建や資産運用の本を読み漁り、不動産の知識を深めた。';
        }
      },
      {
        label: '☕ 「高すぎて手が出ない」と苦笑い',
        cond: () => !S.flags.house && S.assets.estate === 0,
        fn() {
          fx({ happy: -1 });
          return '庶民には手の届かない価格高騰をニュースで見送った。';
        }
      }
    ]
  },
  {
    id: 'w_inflation_wave', icon: '💸', title: '世界的なインフレと円安の波',
    badge: 'WORLD NEWS', isWorld: true,
    min: 20, max: 95,
    text: '原材料高と為替の急激な変動により、身の回りの食料品や日用品の価格が次々と値上げされている。',
    choices: [
      {
        label: '🥦 徹底した自炊・ポイ活・節約で対抗',
        fn() {
          fx({ smarts: 3, happy: 2 });
          return '生活の知恵をフル活用！無駄を削ぎ落として賢く乗り切った。';
        }
      },
      {
        label: '🌏 グローバル視点で外貨・海外資産を勉強',
        fn() {
          fx({ smarts: 4, looks: 1 });
          return '国際経済への関心が高まり、知性と教養が身についた。';
        }
      },
      {
        label: '👛 仕方ないと値上げを受け入れる（20万円）',
        cond: () => S.money >= 20,
        fn() {
          fx({ money: -20, happy: -2 });
          return '生活水準を落とさず出費を受け入れた。家計に少し痛手となった。';
        }
      }
    ]
  },
  {
    id: 'w_job_hunting_ice', icon: '🧊', title: '就職戦線・超買い手市場の嵐',
    badge: 'WORLD NEWS', isWorld: true,
    min: 18, max: 28,
    text: '景気後退により企業の採用枠が大幅縮小。「就職氷河期」の厳しい寒風が若者たちを直撃している。',
    choices: [
      {
        label: '📚 ひたすら自己研鑽と資格取得に励む',
        fn() {
          fx({ smarts: 6, health: -2 });
          return '図書館にこもり徹底的に学んだ。周囲と圧倒的な差をつける実力がついた！';
        }
      },
      {
        label: '🤝 人との繋がりやインターンで活路を開く',
        fn() {
          fx({ looks: 4, happy: 2 });
          return '持ち前のコミュニケーション力で味方を増やし、道を切り開いた！';
        }
      },
      {
        label: '🧘 無理せずマイペースに時期を待つ',
        fn() {
          fx({ happy: 3, smarts: -1 });
          return '焦らず今できることをして、心の平穏を保った。';
        }
      }
    ]
  },

  // --- カルチャー・エンタメ・社会現象 ---
  {
    id: 'w_short_video_craze', icon: '📱', title: '縦型ショート動画の大爆発',
    badge: 'WORLD NEWS', isWorld: true,
    min: 10, max: 65,
    text: 'テンポの良いショート動画プラットフォームが世界を席巻！誰もが手軽にクリエイターになれる時代へ。',
    choices: [
      {
        label: '🎬 自分も動画を制作して投稿してみる',
        fn() {
          if (chance(0.35 + (S.creativity / 160) + (hasTrait('charisma') ? 0.25 : 0) + (hasTrait('artist') ? 0.2 : 0))) {
            const fans = r(100, 300);
            fx({ looks: 6, happy: 8, money: fans });
            playSE('fanfare');
            return `動画が大バズり！一夜にしてインフルエンサーとなり、収益+${fans}万円を獲得！`;
          }
          fx({ looks: 2, happy: 1 });
          return '数千回再生にとどまったが、クリエイティブな楽しさに目覚めた。';
        }
      },
      {
        label: '🍿 おすすめ動画を観て夜更かしを満喫',
        fn() {
          fx({ happy: 5, health: -2 });
          return '面白くて止められない！時間を忘れてコンテンツを満喫した。';
        }
      },
      {
        label: '📵 デジタルデトックスを試みる',
        fn() {
          fx({ health: 3, smarts: 2 });
          return 'スマホを置き、リアルな読書や自然を楽しんで心身がすっきりした。';
        }
      }
    ]
  },
  {
    id: 'w_global_games', icon: '🏅', title: '自国開催！世界スポーツの祭典',
    badge: 'WORLD NEWS', isWorld: true,
    min: 8, max: 95,
    text: '自国を舞台に世界的なスポーツの祭典が開幕！街は世界中からの観光客で沸き立ち、祝祭の熱気に包まれる。',
    choices: [
      {
        label: '🎫 現地で観戦し、熱い声援を送る（15万円）',
        cond: () => S.money >= 15,
        fn() {
          fx({ money: -15, happy: 12 });
          playSE('fanfare');
          return '世紀の瞬間を目の当たりにし、一生忘れられない感動と熱狂を味わった！';
        }
      },
      {
        label: '🤝 語学ボランティアとして参加する',
        fn() {
          fx({ smarts: 3, looks: 4, happy: 6 });
          return '海外の人々と笑顔で交流し、かけがえのない絆と国際感覚を得た！';
        }
      },
      {
        label: '📺 自宅のテレビで家族・友人と観戦',
        fn() {
          fx({ happy: 4 });
          return '連日のメダルラッシュに日本中が湧き、楽しい夏を過ごした。';
        }
      }
    ]
  },
  {
    id: 'w_sauna_boom', icon: '🧖', title: '空前のサウナ・温活ブーム',
    badge: 'WORLD NEWS', isWorld: true,
    min: 15, max: 80,
    text: '「ととのう」が国民的流行語に！全国各地に個性派サウナやスパ施設が続々オープンしている。',
    choices: [
      {
        label: '🔥 サウナに通い詰めて「ととのう」（5万円）',
        cond: () => S.money >= 5,
        fn() {
          fx({ money: -5, health: 6, happy: 6 });
          playSE('good');
          return '水風呂と外気浴で脳内麻薬がドバドバ！深いリフレッシュで肌艶も良くなった。';
        }
      },
      {
        label: '🛀 自宅のお風呂で長風呂＆反復浴',
        fn() {
          fx({ health: 3, happy: 2 });
          return '入浴剤を入れてのんびり汗を流し、良い睡眠が取れるようになった。';
        }
      },
      {
        label: '🙅 熱いのも冷たいのも苦手',
        fn() { return 'マイペースに過ごした。'; }
      }
    ]
  },
  {
    id: 'w_retro_pop', icon: '📻', title: '昭和・平成レトロブーム再燃',
    badge: 'WORLD NEWS', isWorld: true,
    min: 12, max: 95,
    text: 'カセットテープや純喫茶、往年のシティポップが世界中で大流行！ノスタルジックな美しさが再評価されている。',
    choices: [
      {
        label: '☕ レトロ喫茶巡りやレコード集めに没頭（10万円）',
        cond: () => S.money >= 10,
        fn() {
          fx({ money: -10, happy: 7, looks: 3 });
          return '古き良きカルチャーの温かみに癒やされ、充実した趣味の時間を楽しんだ。';
        }
      },
      {
        label: '📦 実家や押し入れの不用品をフリマ出品',
        fn() {
          const m = r(20, 60);
          fx({ money: m, smarts: 2 });
          return `昔のゲームやグッズが高値で売れ、思わぬ臨時収入+${m}万円をゲット！`;
        }
      },
      {
        label: '🎶 懐かしの名曲を配信で聴く',
        fn() { fx({ happy: 3 }); return 'どこか懐かしいメロディに心が洗われた。'; }
      }
    ]
  },
  {
    id: 'w_oshi_culture', icon: '💖', title: '国民的「推し活」大ブーム',
    badge: 'WORLD NEWS', isWorld: true,
    min: 12, max: 60,
    text: 'アイドルや二次元キャラ、アーティストを情熱的に応援する「推し活」が社会現象に！',
    choices: [
      {
        label: '🎉 運命の「推し」に出会い全力で応援（30万円）',
        cond: () => S.money >= 30,
        fn() {
          fx({ money: -30, happy: 14 });
          playSE('fanfare');
          return '「推しは生きる活力！」遠征やグッズで財布は軽くなったが、人生が虹色に輝き始めた！';
        }
      },
      {
        label: '🌸 程よい距離感でまったり楽しむ（5万円）',
        cond: () => S.money >= 5,
        fn() {
          fx({ money: -5, happy: 5 });
          return '日々のちょっとした癒やしとして推しを楽しんだ。';
        }
      },
      {
        label: '👀 周りの熱狂を微笑ましく見守る',
        fn() { return '好きなものに夢中になれる人々を眩しく眺めた。'; }
      }
    ]
  },
  {
    id: 'w_sweets_frenzy', icon: '🧁', title: '大行列！新感覚スイーツの爆発的ブーム',
    badge: 'WORLD NEWS', isWorld: true,
    min: 8, max: 80,
    text: '海外発の見た目も華やかな新感覚スイーツが大流行！街中に行列ができ、SNSはスイーツの写真で溢れかえっている。',
    choices: [
      {
        label: '🏃 2時間並んで話題のスイーツをゲット！（1万円）',
        cond: () => S.money >= 1,
        fn() {
          fx({ money: -1, happy: 6, looks: 1 });
          return '絶品！一口食べた瞬間に幸せが口いっぱいに広がった！';
        }
      },
      {
        label: '👩‍🍳 家でレシピを再現してみる',
        fn() {
          fx({ smarts: 2, happy: 3 });
          return '手作りスイーツに挑戦！思いのほか美味しくできて家族や友人に喜ばれた。';
        }
      },
      {
        label: '🙅 行列を見て素通りする',
        fn() { return 'ブームが落ち着くのを待つことにした。'; }
      }
    ]
  },

  // --- 異常気象・地球環境・自然現象 ---
  {
    id: 'w_heatwave', icon: '☀️', title: '観測史上最高の猛暑列島',
    badge: 'WORLD NEWS', isWorld: true,
    min: 5, max: 105,
    text: '40度超えが連発する歴史的な酷暑の夏！連日熱中症警戒アラートが鳴り響く。',
    choices: [
      {
        label: '🏡 最新の省エネ高機能エアコンを導入（20万円）',
        cond: () => S.money >= 20,
        fn() {
          fx({ money: -20, health: 3, happy: 4 });
          return '部屋の中はオアシス！体調を崩すことなく快適な夏を過ごした。';
        }
      },
      {
        label: '🏊 避暑地やプールへ涼を求めて避難（5万円）',
        cond: () => S.money >= 5,
        fn() {
          fx({ money: -5, happy: 5 });
          return '高原の冷涼な風に癒やされ、夏の素敵な思い出ができた。';
        }
      },
      {
        label: '💦 扇風機と水分補給で気合いで耐える',
        fn() {
          if (chance(0.4 - (hasTrait('iron') ? 0.25 : 0))) {
            fx({ health: -6, happy: -3 });
            return '夏バテでぐったり…体力を大きく消耗してしまった。';
          }
          fx({ happy: -1 });
          return 'アイスを食べてなんとか厳しい夏を耐え抜いた。';
        }
      }
    ]
  },
  {
    id: 'w_blizzard', icon: '❄️', title: '数十年に一度の記録的寒波',
    badge: 'WORLD NEWS', isWorld: true,
    min: 5, max: 105,
    text: '列島を包む大寒波！都市部でも記録的な大雪となり、交通機関が麻痺する。',
    choices: [
      {
        label: '🍲 こたつで温かい鍋を囲んで家族団らん',
        fn() {
          fx({ happy: 6, health: 2 });
          return '外は吹雪でも部屋の中はポカポカ。心温まるひとときを過ごした。';
        }
      },
      {
        label: '⛷️ パウダースノーを求めてゲレンデへ（15万円）',
        cond: () => S.money >= 15,
        fn() {
          fx({ money: -15, health: 4, happy: 7 });
          return '最高の雪質でウィンタースポーツを満喫！心地よい疲労感を味わった。';
        }
      },
      {
        label: '⛄ 雪かきに追われ腰を痛める',
        fn() {
          fx({ health: -2, happy: -1 });
          return '朝から雪かきで筋肉痛…冬の厳しさを痛感した。';
        }
      }
    ]
  },
  {
    id: 'w_pandemic_stayhome', icon: '😷', title: '世界的な感染症流行とおうち時間',
    badge: 'WORLD NEWS', isWorld: true,
    min: 8, max: 100,
    text: '未知のウイルスが世界的に大流行。外出自粛とリモート生活が日常となる。',
    choices: [
      {
        label: '📚 おうち時間を活かして読書と資格勉強',
        fn() {
          fx({ smarts: 6, health: 1 });
          return '膨大な読書と勉強時間を確保でき、知識と集中力が大幅にアップした！';
        }
      },
      {
        label: '🎮 ネットゲームや映画三昧でのんびり',
        fn() {
          fx({ happy: 6, health: -2 });
          return '誰にも気兼ねせずサブスクやゲームを思う存分堪能した。';
        }
      },
      {
        label: '🧼 徹底した健康管理と自炊で免疫力アップ',
        fn() {
          fx({ health: 5, happy: 2 });
          return 'バランスの良い食事と適度な運動で、病気知らずの強い体を作った！';
        }
      }
    ]
  },
  {
    id: 'w_celestial_comet', icon: '☄️', title: '夜空を裂く大彗星の接近',
    badge: 'WORLD NEWS', isWorld: true,
    min: 5, max: 105,
    text: '数百年に一度の巨大彗星が地球に最接近！夜空に美しく巨大な尾を引く神秘的な光景が広がる。',
    choices: [
      {
        label: '🔭 天体望遠鏡を買って星空を見上げる（8万円）',
        cond: () => S.money >= 8,
        fn() {
          fx({ money: -8, happy: 9, smarts: 3 });
          playSE('good');
          return '息をのむ美しさ！宇宙の神秘とロマンに深く心を揺さぶられた。';
        }
      },
      {
        label: '🌠 大切な人と一緒に夜空を見つめる',
        fn() {
          if (S.partner) S.partnerLove = clamp(S.partnerLove + 10);
          fx({ happy: 8 });
          return '流れる星に願いを込めた。忘れられない静かで美しい夜となった。';
        }
      },
      {
        label: '📷 スマホで写真を撮ってみる',
        fn() { fx({ happy: 2 }); return 'ぼやけた光が写ったが、良い記念になった。'; }
      }
    ]
  },

  // --- 科学・未来技術 ---
  {
    id: 'w_space_tourism', icon: '🛸', title: '民間宇宙旅行の商業フライト成功',
    badge: 'WORLD NEWS', isWorld: true,
    min: 20, max: 90,
    text: '一般人が宇宙へ行ける時代が到来！青い地球を宇宙空間から眺める民間ツアーの募集が始まった。',
    choices: [
      {
        label: '🚀 宇宙旅行チケットを購入して宇宙へ！（1億円）',
        cond: () => S.money >= 10000,
        fn() {
          fx({ money: -10000, happy: 25, looks: 15 });
          S.flags.space = true;
          playSE('fanfare');
          return '漆黒の宇宙に浮かぶ青い母星を目撃！人類史上ひと握りの宇宙旅行者となった！';
        }
      },
      {
        label: '📺 宇宙中継を観て科学の進歩に胸を熱くする',
        fn() {
          fx({ smarts: 4, happy: 4 });
          return '人類のフロンティア精神に胸が高鳴った！';
        }
      },
      {
        label: '💭 いつか安くなったら行ってみたい',
        fn() { return '遠い未来に思いを馳せた。'; }
      }
    ]
  },
  {
    id: 'w_anti_aging_med', icon: '🧬', title: '画期的な若返り・長寿医療の実用化',
    badge: 'WORLD NEWS', isWorld: true,
    min: 45, max: 95,
    text: '細胞の老化を巻き戻す革新的な医療技術が発表され、先進国で認可された！',
    choices: [
      {
        label: '💉 最先端の若返りセラピーを受ける（300万円）',
        cond: () => S.money >= 300,
        fn() {
          fx({ money: -300, health: 18, looks: 12, happy: 10 });
          playSE('fanfare');
          return '肌のハリと活力が劇的に蘇り、肉体年齢が10歳若返った！';
        }
      },
      {
        label: '🥗 自然な食事と睡眠で健康寿命を伸ばす',
        fn() {
          fx({ health: 4, happy: 3 });
          return '日常の丁寧な暮らしこそ最高のアンチエイジングだと実感した。';
        }
      },
      {
        label: '🍂 年相応の老いを受け入れる',
        fn() {
          fx({ happy: 2, smarts: 2 });
          return 'しわや白髪も人生の年輪として愛おしんだ。';
        }
      }
    ]
  },
  {
    id: 'w_ev_autonomous', icon: '🚗', title: '完全自動運転EVの本格普及',
    badge: 'WORLD NEWS', isWorld: true,
    min: 18, max: 90,
    text: 'ハンドルを握る必要のない完全自動運転EVが公道を走り始め、移動の概念が根底から覆る。',
    choices: [
      {
        label: '🚘 最新の自動運転EVを購入する（500万円）',
        cond: () => S.money >= 500,
        fn() {
          fx({ money: -500, happy: 12, looks: 8 });
          playSE('fanfare');
          return '移動時間が極上の書斎・リビングに早変わり！圧倒的な未来を体感した！';
        }
      },
      {
        label: '🚖 自動運転タクシーでお出かけ（1万円）',
        cond: () => S.money >= 1,
        fn() {
          fx({ money: -1, happy: 3, smarts: 2 });
          return '無人でスイスイ走る車内に未来を感じてワクワクした。';
        }
      },
      {
        label: '🕹️ 自分でハンドルを握る運転が好き',
        fn() { fx({ happy: 1 }); return 'クラシックな車の操縦感を愛し続けた。'; }
      }
    ]
  },
  {
    id: 'w_universal_translator', icon: '🌐', title: '同時通訳イヤホンの誕生（言葉の壁の消滅）',
    badge: 'WORLD NEWS', isWorld: true,
    min: 12, max: 85,
    text: 'あらゆる言語をリアルタイムで双方向通訳するスマートイヤホンが世界中で爆発的普及！',
    choices: [
      {
        label: '🎧 イヤホンを片手に海外の人々と語り合う（3万円）',
        cond: () => S.money >= 3,
        fn() {
          fx({ money: -3, smarts: 5, looks: 4, happy: 5 });
          playSE('good');
          return '言葉の壁が消えた！世界中の文化と直に触れ合い、国際交流を満喫した。';
        }
      },
      {
        label: '📖 それでも自分の力で語学を勉強する',
        fn() {
          fx({ smarts: 5, happy: 2 });
          return '機械に頼らず自分の言葉で伝える美しさを大切にした。';
        }
      },
      {
        label: '☕ 「すごい時代になった」と感心する',
        fn() { return 'テクノロジーの進歩に感心しながらのんびり過ごした。'; }
      }
    ]
  },

  // --- 法律・制度・働き方 ---
  {
    id: 'w_tax_reform', icon: '🏛️', title: '消費税・税制改革の波',
    badge: 'WORLD NEWS', isWorld: true,
    min: 20, max: 95,
    text: '社会保障費の増大に伴い、税制の改正が断行される。国民の家計防衛意識が高まる。',
    choices: [
      {
        label: '💡 家計の見直しと資産防衛策を徹底',
        fn() {
          fx({ smarts: 4, money: 10 });
          return '固定費を削減し、増税分を上回るお金の知識と余裕を手に入れた！';
        }
      },
      {
        label: '🛒 増税前に必要なものをまとめ買い（20万円）',
        cond: () => S.money >= 20,
        fn() {
          fx({ money: -20, happy: 3 });
          return '欲しかった家電や日用品を賢く揃え、満足感を得た。';
        }
      },
      {
        label: '💸 「税金高すぎる…」と愚痴をこぼす',
        fn() { fx({ happy: -2 }); return 'ため息をつきながらレシートを眺めた。'; }
      }
    ]
  },
  {
    id: 'w_silver_society', icon: '👴', title: '人生100年時代！シニア活躍社会へ',
    badge: 'WORLD NEWS', isWorld: true,
    min: 55, max: 95,
    text: '元気な高齢者が社会をリードする「人生100年時代」へ法改正！定年の撤廃やシニア向け講座が盛況に。',
    choices: [
      {
        label: '🌟 まだまだ現役！新しい仕事や役職に挑戦',
        fn() {
          fx({ smarts: 4, happy: 6, money: 30 });
          playSE('good');
          return '培った経験を活かして大活躍！生きがいと臨時収入を得た！';
        }
      },
      {
        label: '🎨 地域のサークルやボランティアで仲間作り',
        fn() {
          fx({ happy: 7, health: 3 });
          return '同年代の温かい友人が増え、毎日が笑顔に包まれた。';
        }
      },
      {
        label: '🍵 予定通り悠々自適のんびり隠居生活',
        fn() { fx({ happy: 3, health: 1 }); return '縁側でお茶を飲み、穏やかな時間を愛した。'; }
      }
    ]
  },
  {
    id: 'w_cashless_society', icon: '💳', title: 'キャッシュレス・ポイント経済戦争',
    badge: 'WORLD NEWS', isWorld: true,
    min: 15, max: 80,
    text: 'スマホ決済各社によるポイント大盤振る舞いキャンペーンが加熱！街は還元バブルに沸く。',
    choices: [
      {
        label: '📱 キャンペーンを駆使してポイ活を極める',
        fn() {
          const pt = r(15, 40);
          fx({ money: pt, smarts: 2, happy: 3 });
          return `賢く還元をゲット！年間で実質+${pt}万円相当の得をした！`;
        }
      },
      {
        label: '👛 面倒なので現金払いを貫く',
        fn() { return 'お札と小銭の手触りを信じてマイペースに過ごした。'; }
      }
    ]
  },
  {
    id: 'w_workstyle_flex', icon: '🏖️', title: '週休3日制・柔軟な働き方の普及',
    badge: 'WORLD NEWS', isWorld: true,
    min: 22, max: 62,
    text: '労働環境の改善が進み、大手企業を中心に選択的週休3日制やフレックス勤務が広がる。',
    choices: [
      {
        label: '🚀 増えた休日で副業にコミットする',
        fn() {
          const sideGain = r(20, 60);
          fx({ money: sideGain, smarts: 3 });
          return `副業ビジネスが軌道に乗り、+${sideGain}万円の副収入を達成！`;
        }
      },
      {
        label: '👨‍👩‍👧 家族やパートナーと過ごす時間を増やす',
        fn() {
          if (S.partner) S.partnerLove = clamp(S.partnerLove + 10);
          fx({ happy: 8, health: 3 });
          playSE('good');
          return '家族とゆっくり語り合い、心の底から満たされる日々を送った。';
        }
      },
      {
        label: '😴 趣味と休養で心身をフルチャージ',
        fn() {
          fx({ health: 5, happy: 5 });
          return '平日の疲れがすっかり取れ、健康的な生活リズムを取り戻した。';
        }
      }
    ]
  }
];

function pickWorldEvent() {
  if (!S) return null;
  // 最低3年間のインターバル（連続発生防止）
  if (S.age - (S.lastWorldYear || -99) < 3) return null;

  // 発生率: 18%（平均5〜6年に1回）
  if (!chance(0.18)) return null;

  const valid = WORLD_EVENTS.filter(e => {
    if (S.age < e.min || S.age > e.max) return false;
    // 一生のうちに同じイベントが何回も重ならないよう、一度起きたイベントは直近20年間は除外
    if (S.worldHistory && S.worldHistory[e.id] && S.age - S.worldHistory[e.id] < 20) return false;
    if (e.cond && !e.cond()) return false;
    return true;
  });

  if (!valid.length) return null;
  const picked = pick(valid);
  S.lastWorldYear = S.age;
  if (!S.worldHistory) S.worldHistory = {};
  S.worldHistory[picked.id] = S.age;
  return picked;
}

function pickEvent() {
  const c = EVENTS.filter(e => S.age >= e.min && S.age <= e.max && !(e.once && S.once[e.id]) && (!e.cond || e.cond()));
  if (!c.length) return null;
  const total = c.reduce((s, e) => s + (e.p || 1), 0);
  let x = Math.random() * total;
  for (const e of c) { x -= (e.p || 1); if (x <= 0) { S.once[e.id] = true; return e; } }
  return null;
}

// ---------- 年末処理・寿命 ----------
function deathCheck() {
  const a = S.age;
  if (S.fitness <= 0) return '衰弱・大病';
  let p = a < 60 ? 0.0008 + (S.fitness < 20 ? 0.04 : 0) : 0.006 * Math.exp((a - 60) / 9);
  p *= (1.6 - S.fitness / 100) * (hasTrait('iron') ? 0.72 : 1);
  if (S.happy < 15) p *= 1.35; // 精神的疲弊によるリスク増加
  if (a >= 115) p = 1;
  if (Math.random() < p) return a < 40 ? pick(['不慮の事故', '突然の病']) : a < 78 ? '病気' : '老衰';
  return null;
}

function yearEnd() {
  const a = S.age;
  const rawJobInc = S.job ? salary() : (S.retired ? 180 : 0);
  const partnerInc = (S.married && S.partnerInfo) ? S.partnerInfo.job.inc : 0;
  const sideInc = S.sideJob ? calcSideJobIncome(S.sideJob) : 0;
  if (S.sideJob) {
    // 本業と副業の両立による疲労（体力-1）
    fx({ fitness: hasTrait('iron') ? 0 : -1 });
  }
  const estateInc = estateRentIncome();
  const filialInc = a >= 60 ? S.kids.filter(k => k.indep && k.supported).length * 40 : 0;

  // 累進課税・社会保険料（所得に応じた現実的課税負担）
  let taxRate = 0;
  if (rawJobInc > 2000) taxRate = 0.42;
  else if (rawJobInc > 1200) taxRate = 0.35;
  else if (rawJobInc > 700) taxRate = 0.28;
  else if (rawJobInc > 400) taxRate = 0.20;
  else if (rawJobInc > 200) taxRate = 0.12;
  const jobInc = Math.round(rawJobInc * (1 - taxRate));

  // 不動産の維持・修繕イベント判定
  let estateMaintenance = 0;
  if (S.assets.estate > 0 && chance(0.08)) {
    estateMaintenance = Math.round(S.assets.estate * (r(2, 4) / 100));
  }

  // 株式投資の変動（好不況サイクル＆信託報酬＆金融所得課税）
  let stockGain = 0;
  if (S.assets.stock > 0) {
    let rate = 0;
    const isCrash = chance(0.11); // 約9年に1度の景気後退・調整局面
    const isBoom = chance(0.08);  // 約12年に1度の好況・バブル
    if (isCrash) {
      rate = -r(12, 26);
      if (hasTrait('lucky')) rate = Math.round(rate * 0.65);
      if (S.mbti && ['INTJ', 'ISTJ'].includes(S.mbti)) rate = Math.round(rate * 0.75);
    } else if (isBoom) {
      rate = r(8, 18) + (hasTrait('lucky') ? 3 : 0);
    } else {
      // 通常相場（中央値0%近傍、知力や商才でわずかにプラス期待値）
      rate = r(-9, 8) + Math.floor(S.smarts / 60) + (hasTrait('merchant') ? 1 : 0);
    }
    // 資産規模によるリターンの安定収束（3000万円以上、1億円以上でスケーリング）
    if (S.assets.stock > 10000) {
      rate = Math.round(rate * 0.60);
    } else if (S.assets.stock > 3000) {
      rate = Math.round(rate * 0.80);
    }
    let rawGain = Math.round(S.assets.stock * (rate / 100));
    // 運用管理費用・信託報酬（年0.4%、最低1万円）
    const trustFee = Math.max(1, Math.round(S.assets.stock * 0.004));
    rawGain -= trustFee;

    // プラス益には金融所得課税20%が適用
    if (rawGain > 0) {
      rawGain = Math.round(rawGain * 0.80);
    }
    stockGain = rawGain;
    S.assets.stock = Math.max(0, S.assets.stock + stockGain);
  }
  const netEstate = S.assets.estate > 0 ? (estateRent - estateMaintenance) : 0;
  if (S.assets.stock > 0 || S.assets.estate > 0) {
    S.lastInvestSummary = {
      stockGain,
      estateRent: netEstate,
      total: stockGain + netEstate,
      year: S.age,
    };
  } else {
    S.lastInvestSummary = null;
  }

  // 超富裕層（金融資産10億円超）に対する資産管理費・富裕税（年1.2%）
  let wealthTax = 0;
  const totalFin = S.assets.stock + S.assets.estate;
  if (totalFin > 100000) {
    wealthTax = Math.round(totalFin * 0.012);
  }

  // 借金の利息負担（年利14%）
  let debtInterest = 0;
  if (S.money < 0) {
    debtInterest = Math.max(5, Math.round(Math.abs(S.money) * 0.14));
    S.money -= debtInterest;
  }

  const hObj = currentHouseObj();
  let cost = 0;
  if (!S.student && a >= 15) {
    const depKids = S.kids.filter(k => a - k.birth < 22).length;
    // 基本生活費（年齢・家族構成）
    cost = 100 + (a >= 18 ? 40 : 0) + (S.married ? 60 : 0) + depKids * 50;
    if (hObj && hObj.id === 'country') {
      cost = Math.round(cost * 0.7); // 田舎スローライフ生活費30%カット
      fx({ fitness: 1, happy: 2 });
    }
    // 老後（70代・80代）の医療費・健康ケア費用の増加
    if (a >= 70) {
      const oldAgeMedical = (a >= 80 ? 80 : 40) + (S.fitness < 40 ? 50 : 0);
      cost += oldAgeMedical;
    }
    if (hObj) cost = Math.max(40, cost - hObj.rentSave);
    cost += estateMaintenance;
  }

  const pensionInc = pension();
  const inc = jobInc + partnerInc + sideInc + estateInc + filialInc + pensionInc;
  S.money += inc - cost - wealthTax;

  // 住まい・別荘・パートナーによる年間ボーナス
  if (hObj) fx({ happy: hObj.happy, social: hObj.id === 'tower' ? 1 : 0 });
  if (S.assets.items.includes('villa')) fx({ happy: 2, creativity: 1 });
  if (S.partner) {
    if (S.partnerLove >= 80) fx({ happy: 2 });
    const decay = hasTrait('beloved') ? 1 : 2;
    S.partnerLove = clamp(S.partnerLove - decay);
  }

  if (a >= 40) {
    const ageDmg = a >= 80 ? 3 : a >= 60 ? 2 : 1;
    S.fitness = clamp(S.fitness - (hasTrait('iron') ? Math.max(1, ageDmg - 1) : ageDmg));
  }
  // 65歳以降の知力・創造性・社交の緩やかな加齢減衰（何もしないと衰えるが、シニア行動で維持可能）
  if (a >= 65) {
    if (chance(0.4) && !hasTrait('genius')) S.smarts = clamp(S.smarts - 1);
    if (chance(0.4) && !hasTrait('artist')) S.creativity = clamp(S.creativity - 1);
    if (chance(0.35) && !hasTrait('charisma')) S.social = clamp(S.social - 1);
  }

  // 借金による精神的ストレス
  if (a >= 18 && S.money < -100) {
    S.happy = clamp(S.happy - (S.money < -500 ? 5 : 3));
  }
  if (S.happy > 80) S.happy -= 1;
  if (S.happy < 20) S.happy += 1;

  S.happySum += S.happy; S.years++;
  const cause = deathCheck();
  if (cause) {
    S.history.push({ age: S.age, happy: S.happy, fitness: S.fitness, wealth: totalWealth() });
    S.cause = cause;
    return true;
  }

  S.age++;
  S.history.push({ age: S.age, happy: S.happy, fitness: S.fitness, wealth: totalWealth() });
  addSep(S.age, inc, cost, stockGain);

  // 子どもの成長ログ（7歳入学・22歳独立）
  S.kids.forEach((k, i) => {
    const kAge = S.age - k.birth;
    if (kAge === 7 && !k.stage7) {
      k.stage7 = true;
      addLog('🎒', `第${i + 1}子「${k.name}」が小学校に入学した！`, [], true);
    }
    if (kAge === 22 && !k.indep) {
      k.indep = true;
      k.job = k.smarts >= 80 ? pick(['医師', '弁護士', 'AI研究者'])
        : k.smarts >= 60 ? pick(['エンジニア', '公務員', '商社マン'])
        : pick(['営業職', '販売スタッフ', '料理人']);
      addLog('🎓', `第${i + 1}子「${k.name}」が独立し、${k.job}として働き始めた！${k.supported ? '（老後に仕送りをしてくれます）' : ''}`, [], true);
    }
  });

  // パートナーの成長・卒業処理（高校・中学卒業）
  if (S.partner && S.partnerInfo && S.partnerInfo.job) {
    if (S.partnerInfo.job.name.includes('高校生') && S.age >= 18) {
      const nextJob = chance(0.65)
        ? { name: '大学生', inc: 30 }
        : pick(PARTNER_JOBS);
      S.partnerInfo.job = nextJob;
      addLog('🎓', `恋人の「${S.partner}」も高校を卒業し、${nextJob.name}としての新生活をスタートした！`, [], true);
    } else if (S.partnerInfo.job.name.includes('中学生') && S.age >= 15) {
      const nextJob = pick(HIGH_SCHOOL_PARTNER_ROLES);
      S.partnerInfo.job = nextJob;
      addLog('🏫', `恋人の「${S.partner}」も中学を卒業し、高校生になった！`, [], true);
    }
  }

  return false;
}

// ---------- ログ ----------
function renderSingleLog(item) {
  const li = document.createElement('li');
  if (item.type === 'sep') {
    li.className = 'sep';
    const net = (item.inc || 0) - (item.cost || 0);
    const stockTxt = item.stockGain ? ` / 株${item.stockGain >= 0 ? '+' : ''}${item.stockGain}万` : '';
    li.textContent = item.inc || item.cost || item.stockGain
      ? `${item.age}歳 ｜ 前年収支 ${net >= 0 ? '+' : ''}${net}万${stockTxt}`
      : `${item.age}歳`;
  } else {
    if (item.major) li.className = 'major';
    li.innerHTML = `<span class="l-icon">${item.icon}</span><div>${item.text}${item.d && item.d.length ? `<div class="chips">${chipsHTML(item.d)}</div>` : ''}</div>`;
  }
  $('#log').prepend(li);
}

let currentTab = 'action';

function switchTab(tab, silent = false) {
  if (!silent) playSE('click');
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const isActive = panel.dataset.tabPanel === tab;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
}

function addLog(icon, text, d = [], major = false) {
  const item = { type: 'log', age: S.age, icon, text, d, major };
  S.log.push(item);
  renderSingleLog(item);
  saveCurrentGame();
}

function addSep(age, inc, cost, stockGain = 0) {
  const item = { type: 'sep', age, inc, cost, stockGain };
  S.log.push(item);
  renderSingleLog(item);
  saveCurrentGame();
}

function rebuildLogs(logs) {
  $('#log').innerHTML = '';
  logs.forEach(l => renderSingleLog(l));
}

// ---------- 描画 ----------
function totalWealth() {
  return S.money + (S.assets ? S.assets.stock + S.assets.estate : 0);
}

function renderAll() {
  updateAlbumBadge();
  ensureState(S);
  applyPrefsUI();
  const st = stage();
  document.body.dataset.stage = st;
  $('#hud-name').textContent = S.name;
  if ($('#hud-stage')) $('#hud-stage').textContent = stageLabel();
  if ($('#hud-job')) $('#hud-job').innerHTML = currentOccupationBadge();

  const traitsBox = $('#hud-traits');
  if (traitsBox) {
    const genChip = '';
    const m = S.mbti ? mbtiObj(S.mbti) : null;
    const mbtiChip = m ? `<button type="button" class="trait-chip mbti clickable" onclick="showMbtiDetail('${m.axis}')" title="${m.axis}（${m.name}）の説明を表示">🌱 ${m.axis}（${m.name}） ℹ️</button>` : '';
    const tChips = (S.traits || []).map(id => {
      const t = traitObj(id);
      return t ? `<button type="button" class="trait-chip clickable" onclick="showTraitDetail('${t.id}')" title="${t.name}の説明を表示">${t.icon} ${t.name} ℹ️</button>` : '';
    }).join('');
    traitsBox.innerHTML = genChip + mbtiChip + tChips;
  }

  const ageEl = $('#hud-age');
  if (ageEl.textContent !== String(S.age)) { ageEl.textContent = S.age; ageEl.classList.remove('pop'); void ageEl.offsetWidth; ageEl.classList.add('pop'); }
  $('#hud-lifebar').style.width = Math.min(S.age, 100) + '%';
  const finAssets = S.assets.stock + S.assets.estate;
  $('#hud-money').innerHTML = finAssets > 0
    ? `<span class="ib">貯金 ${fmtMoney(S.money)}</span><span class="ib">（資産 ${fmtMoney(finAssets)}）</span>`
    : `貯金 ${fmtMoney(S.money)}`;

  const miniStats = $('#mini-stats');
  if (miniStats) {
    miniStats.innerHTML = STATS.map(k => `
      <div class="mini-stat" title="タップしてステータス・プロフィール詳細を表示">
        <div class="mini-stat-top">
          <span class="mini-stat-label"><i class="mini-stat-ic">${STAT_ICON[k]}</i><span class="mini-stat-txt">${LABEL[k]}</span></span>
          <b class="mini-stat-val">${S[k]}</b>
        </div>
        <div class="mini-bar"><div class="bar-fill ${k} ${S[k] < 20 ? 'low' : ''}" style="width:${S[k]}%"></div></div>
      </div>`).join('');
  }

  const STAT_LEVELS = {
    smarts: [
      { min: 85, label: '天才・学者級', cls: 'top' },
      { min: 70, label: '難関大・エリート', cls: 'high' },
      { min: 50, label: '優秀・聡明', cls: 'mid' },
      { min: 30, label: '人並み・標準', cls: 'normal' },
      { min: 0,  label: '勉強不足・苦手', cls: 'low' },
    ],
    fitness: [
      { min: 85, label: 'アスリート級', cls: 'top' },
      { min: 70, label: '強靭・タフネス', cls: 'high' },
      { min: 50, label: '健康優良・元気', cls: 'mid' },
      { min: 30, label: '人並み・標準', cls: 'normal' },
      { min: 0,  label: '疲労蓄積・低調', cls: 'low' },
    ],
    social: [
      { min: 85, label: '圧倒的カリスマ', cls: 'top' },
      { min: 70, label: '人望厚い人気者', cls: 'high' },
      { min: 50, label: '良好なコミュ力', cls: 'mid' },
      { min: 30, label: '人並み・標準', cls: 'normal' },
      { min: 0,  label: '対人関係に悩み', cls: 'low' },
    ],
    creativity: [
      { min: 85, label: '鬼才クリエイター', cls: 'top' },
      { min: 70, label: '豊かな表現力', cls: 'high' },
      { min: 50, label: 'アイデアマン', cls: 'mid' },
      { min: 30, label: '人並み・標準', cls: 'normal' },
      { min: 0,  label: '発想に悩み中', cls: 'low' },
    ],
    happy: [
      { min: 85, label: 'この上ない幸福', cls: 'top' },
      { min: 70, label: '充実・多幸感', cls: 'high' },
      { min: 50, label: '穏やかで満足', cls: 'mid' },
      { min: 30, label: '波のある日常', cls: 'normal' },
      { min: 0,  label: '限界・ストレス', cls: 'low' },
    ],
  };

  const getStatLevel = (key, val) => {
    const list = STAT_LEVELS[key] || [];
    for (const item of list) {
      if (val >= item.min) return item;
    }
    return { label: '標準', cls: 'normal' };
  };

  $('#stats').innerHTML = STATS.map(k => {
    const lvl = getStatLevel(k, S[k]);
    return `
      <div class="stat-card ${k}">
        <div class="stat-head">
          <span class="stat-name">${STAT_ICON[k]} ${LABEL[k]}</span>
          <span class="stat-level-badge ${k} ${lvl.cls}">${lvl.label}</span>
          <b class="stat-num">${S[k]}</b>
        </div>
        <div class="bar"><div class="bar-fill ${k} ${S[k] < 20 ? 'low' : ''}" style="width:${S[k]}%"></div></div>
      </div>`;
  }).join('');

  const finalEduText = formatEduString();
  const partner = S.married
    ? `${S.partner}（💖${S.partnerLove}%）`
    : S.partner ? `恋人：${S.partner}（💖${S.partnerLove}%）` : 'なし';
  const sideInc = S.sideJob ? calcSideJobIncome(S.sideJob) : 0;
  const partnerInc = (S.married && S.partnerInfo) ? S.partnerInfo.job.inc : 0;
  const passiveInc = sideInc + estateRentIncome() + partnerInc;
  const genderLabel = { male: '男性', female: '女性', other: 'その他・指定なし' }[S.gender] || 'その他';
  const orientLabel = { hetero: '異性', homo: '同性', bi: '両性・誰でも' }[S.orientation] || '異性';

  const basicItems = [
    { ic: '🏠', label: '生まれ・実家', val: FAMILY[S.family].label },
    { ic: '🚻', label: '性別・指向', val: `${genderLabel}（対象：${orientLabel}）` },
    { ic: '🧩', label: '性格タイプ', val: S.mbti ? `${S.mbti}（${mbtiObj(S.mbti).name}）` : '未設定', isMbti: true },
    { ic: '✨', label: '生まれの才能', val: (S.traits || []).map(id => traitObj(id)?.name).filter(Boolean).join('・') || 'なし', isTrait: true },
  ];

  const careerItems = [
    { ic: '🎓', label: '学歴', val: finalEduText },
    { ic: '💼', label: '職業・役職', val: jobTitle() },
    { ic: '💴', label: '本業年収', val: S.job ? fmtMoney(salary()) : S.retired ? '年金 180万円' : '—' },
  ];
  if (S.sideJob) {
    const sj = SIDE_JOBS.find(j => j.id === S.sideJob.id) || { name: S.sideJob.name };
    careerItems.push({ ic: '💻', label: '副業', val: `${sj.name}（年 +${fmtMoney(sideInc)}）` });
  }
  if (passiveInc > 0) {
    careerItems.push({ ic: '📈', label: '副収入・共働き', val: `+${fmtMoney(passiveInc)}/年` });
  }

  const lifeItems = [];
  if (finAssets > 0) {
    lifeItems.push({ ic: '🏦', label: '運用資産', val: fmtMoney(finAssets) });
  }
  lifeItems.push({ ic: S.married ? '💍' : '💖', label: 'パートナー', val: partner });
  const kidsText = (S.kids && S.kids.length)
    ? `${S.kids.length}人（${S.kids.map(k => k.name).join('・')}）`
    : 'なし';
  lifeItems.push({ ic: '👶', label: '子ども', val: kidsText });
  const hObj = currentHouseObj();
  if (hObj) lifeItems.push({ ic: '🏠', label: '住まい', val: hObj.name });
  else if (S.flags.house) lifeItems.push({ ic: '🏠', label: '住まい', val: '持ち家' });
  else lifeItems.push({ ic: '🏠', label: '住まい', val: '実家 / 賃貸' });

  const cObj = currentCarObj();
  if (cObj) lifeItems.push({ ic: '🚗', label: '愛車', val: cObj.name });
  if (S.flags.pet) {
    const pets = [];
    if (S.assets.items.includes('dog')) pets.push('🐶 愛犬');
    const catName = S.flags.petName || 'こむぎ';
    pets.push(`🐱 ${catName}`);
    lifeItems.push({ ic: '🐾', label: 'ペット', val: pets.join('・') });
  }

  const sections = [
    { title: '👤 基本・パーソナリティ', items: basicItems },
    { title: '💼 キャリア・収入', items: careerItems },
    { title: '🏡 暮らし・家族・資産', items: lifeItems },
  ];

  const fmtProfileVal = (item) => {
    const s = item.val;
    if (!s || s === 'なし' || s === '—') return `<span class="val-none">${s}</span>`;
    if (item.isMbti && S.mbti) {
      return `
        <div class="val-with-btn">
          <span class="p-badge mbti">${S.mbti}</span> <span class="sub-val">${mbtiObj(S.mbti).name}</span>
          <button type="button" class="btn-info-inline" onclick="showMbtiDetail('${S.mbti}')" title="性格の詳細説明を表示">説明 ℹ️</button>
        </div>`;
    }
    if (item.isTrait) {
      if (S.traits && S.traits.length > 0) {
        return `
          <div class="val-with-btn">
            ${(S.traits || []).map(id => {
              const t = traitObj(id);
              return `<button type="button" class="p-badge trait clickable" onclick="showTraitDetail('${id}')" title="${t?.name}の詳細説明を表示">${t?.icon || ''}${t?.name} ℹ️</button>`;
            }).join(' ')}
          </div>`;
      }
      return `<span class="val-none">なし</span>`;
    }
    if (s.includes('（') && s.endsWith('）')) {
      const idx = s.indexOf('（');
      return `<span class="main-val">${s.slice(0, idx)}</span><span class="sub-val">${s.slice(idx)}</span>`;
    }
    if (s.includes('・')) {
      return s.split('・').map(p => `<span class="ib">${p}</span>`).join('・');
    }
    return `<span class="main-val">${s}</span>`;
  };

  $('#profile').innerHTML = sections.map(sec => `
    <div class="profile-group">
      <div class="profile-group-title">${sec.title}</div>
      <div class="profile-group-items">
        ${sec.items.map(it => `
          <div class="profile-item">
            <div class="pi-label"><span class="pi-icon">${it.ic}</span><span>${it.label}</span></div>
            <div class="pi-val">${fmtProfileVal(it)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  renderActions();
  renderLifeMenu();
  saveCurrentGame();
}

function currentActions() {
  return (ACTIONS[stage()] || []).filter(a => !a.cond || a.cond());
}

let lastRenderedActionKey = null;

function renderActions(force = false) {
  const box = $('#actions');
  const acts = currentActions();
  const actKey = `${S.age}_${stage()}_${acts.map(a => a.label).join('|')}`;

  $('#action-heading').textContent = S.age < 3 ? `${S.age}歳 ― すくすく成長中` : `${S.age}歳の1年をどう過ごす？`;

  const investBanner = $('#invest-summary-banner');
  if (investBanner) {
    if (S.lastInvestSummary && S.lastInvestSummary.year === S.age - 1) {
      const isum = S.lastInvestSummary;
      const totalSign = isum.total > 0 ? '+' : '';
      const totalCls = isum.total > 0 ? 'isb-pos' : isum.total < 0 ? 'isb-neg' : 'isb-zero';
      const stockSign = isum.stockGain > 0 ? '+' : '';
      const stockText = isum.stockGain !== 0 ? `株式 ${stockSign}${fmtMoney(isum.stockGain)}` : '';
      const estateSign = isum.estateRent > 0 ? '+' : '';
      const estateText = isum.estateRent !== 0 ? `不動産 ${estateSign}${fmtMoney(isum.estateRent)}` : '';
      const details = [stockText, estateText].filter(Boolean).join(' ｜ ');

      investBanner.hidden = false;
      investBanner.style.display = 'flex';
      investBanner.innerHTML = `
        <span class="isb-tag">📈 運用成果</span>
        <span class="isb-total ${totalCls}">年間損益: <b>${totalSign}${fmtMoney(isum.total)}</b></span>
        ${details ? `<span class="isb-detail">（${details}）</span>` : ''}
      `;
    } else {
      investBanner.hidden = true;
      investBanner.style.display = 'none';
      investBanner.innerHTML = '';
    }
  }

  // ターン（年齢・行動一覧）が変わっていない場合は、DOM再生成によるチラつき・再アニメーションを防ぎdisabled状態のみ更新
  if (!force && lastRenderedActionKey === actKey && box.children.length === acts.length) {
    [...box.children].forEach(b => { b.disabled = busy; });
    return;
  }

  lastRenderedActionKey = actKey;
  box.innerHTML = '';
  acts.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'action';
    b.id = `action-${i + 1}`;
    b.style.animationDelay = `${i * 40}ms`;
    b.disabled = busy;
    const descHtml = a.desc.includes(' ')
      ? a.desc.split(' ').map(p => `<span class="ib">${highlightStatText(escapeHtml(p))}</span>`).join(' ')
      : highlightStatText(escapeHtml(a.desc));
    b.innerHTML = `<span class="a-key">${i + 1}</span><span class="a-icon">${a.icon}</span><span class="a-label">${a.label}</span><span class="a-desc">${descHtml}</span>`;
    b.onclick = () => { b.blur(); doAction(a); };
    box.appendChild(b);
  });
}

function renderLifeMenu() {
  const wrap = $('#life-menu-wrap');
  const banner = $('#life-menu-banner');
  const box = $('#life-menu');
  if (!wrap || !box) return;
  if (!S || S.age < 15) {
    wrap.hidden = true;
    if (banner) banner.hidden = true;
    return;
  }
  wrap.hidden = false;
  if (banner) {
    banner.hidden = false;
    const jumpBtn = $('#btn-jump-life-menu');
    if (jumpBtn && !jumpBtn.dataset.bound) {
      jumpBtn.dataset.bound = 'true';
      jumpBtn.onclick = () => {
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    }
  }
  box.innerHTML = '';

  const hobbyObj = S.hobby ? HOBBIES.find(h => h.id === S.hobby) : null;
  const petText = S.flags.pet ? (S.assets.items.includes('dog') ? '愛犬' : (S.flags.petName || '愛猫')) : 'なし';
  const hobbySub = hobbyObj ? `${hobbyObj.name.split(' ')[1]} Lv${S.hobbyLevel || 1} ｜ ペット:${petText}` : `趣味・ペット（${petText}）`;

  const menus = [
    {
      icon: '💕', label: '恋愛・家族',
      sub: S.married ? `配偶者 💖${S.partnerLove}%・子${S.kids.length}人` : S.partner ? `恋人 💖${S.partnerLove}%` : '出会い・デート・結婚',
      fn: () => openLoveMenu(),
    },
    {
      icon: '🌿', label: '趣味・ペット',
      sub: hobbySub,
      fn: () => openLifestyleMenu(),
    },
  ];
  if (S.age >= 18) {
    const fin = S.assets.stock + S.assets.estate;
    menus.push({
      icon: '🏦', label: '資産・ショップ',
      sub: fin > 0 ? `運用 ${fmtMoney(fin)}` : '住宅・車・投資・買い物',
      fn: () => openAssetMenu(),
    });
    const sideEst = S.sideJob ? calcSideJobIncome(S.sideJob) : 0;
    const sideName = S.sideJob ? (SIDE_JOBS.find(j => j.id === S.sideJob.id)?.name.split(' ')[1] || '副業') : '';
    menus.push({
      icon: '🚀', label: 'キャリア・起業',
      sub: S.sideJob ? `${sideName} 約+${fmtMoney(sideEst)}/年` : '副業・転職・起業・選挙',
      fn: () => openCareerMenu(),
    });
  }

  // 既存のボタン要素があれば内容・disabledのみ更新して再生成のチラつきを防ぐ
  if (box.children.length === menus.length) {
    [...box.children].forEach((b, i) => {
      const m = menus[i];
      b.disabled = busy;
      const subEl = b.querySelector('.lb-sub');
      if (subEl && subEl.textContent !== m.sub) subEl.textContent = m.sub;
      b.onclick = async () => {
        if (busy) return;
        b.blur();
        playSE('click');
        busy = true;
        renderActions();
        renderLifeMenu();
        await runEvent(m.fn());
        busy = false;
        renderAll();
      };
    });
    return;
  }

  box.innerHTML = '';
  menus.forEach(m => {
    const b = document.createElement('button');
    b.className = 'life-btn';
    b.disabled = busy;
    b.innerHTML = `<span class="lb-icon">${m.icon}</span><span class="lb-body"><span class="lb-label">${m.label}</span><span class="lb-sub">${m.sub}</span></span>`;
    b.onclick = async () => {
      if (busy) return;
      b.blur();
      playSE('click');
      busy = true;
      renderActions();
      renderLifeMenu();
      await runEvent(m.fn());
      busy = false;
      renderAll();
    };
    box.appendChild(b);
  });
}

let toastTimer = null;

function showStatFloats(d) {
  if (!d || !d.length) return;
  d.forEach((item, idx) => {
    const statIdx = STATS.indexOf(item.k);
    let targetEl = null;
    if (statIdx >= 0) {
      const miniStats = document.querySelectorAll('.mini-stat');
      if (miniStats && miniStats[statIdx]) {
        targetEl = miniStats[statIdx];
      }
    } else if (item.k === 'money') {
      targetEl = $('#hud-money');
    }

    let x = window.innerWidth / 2;
    let y = 140;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top;
      targetEl.classList.remove('stat-flash');
      void targetEl.offsetWidth;
      targetEl.classList.add('stat-flash');
    }

    const floatEl = document.createElement('div');
    const isUp = item.v > 0;
    const sign = isUp ? '+' : '';
    const unit = item.k === 'money' ? '万' : '';
    const icon = STAT_ICON[item.k] || (item.k === 'money' ? '💰' : '');

    floatEl.className = `stat-float-pop ${item.k} ${isUp ? 'up' : 'down'}`;
    floatEl.innerHTML = `<i>${icon}</i><span>${sign}${item.v}${unit}</span>`;

    floatEl.style.left = `${x + (idx - (d.length - 1) / 2) * 22}px`;
    floatEl.style.top = `${y}px`;
    floatEl.style.animationDelay = `${idx * 70}ms`;

    document.body.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 1400);
  });
}

function toast(text, d = [], manualDismiss = false) {
  return new Promise(resolve => {
    const t = $('#toast');
    if (!t) { resolve(); return; }
    
    t.innerHTML = `
      <div class="toast-main">
        <span class="toast-msg">${text}</span>
        ${d && d.length ? `<span class="chips">${chipsHTML(d)}</span>` : ''}
      </div>
      <button type="button" class="toast-close-btn" title="閉じる">✕</button>
    `;
    t.classList.add('show');
    if (d && d.length) showStatFloats(d);

    let closed = false;
    const closeToast = () => {
      if (closed) return;
      closed = true;
      t.classList.remove('show');
      t.onclick = null;
      resolve();
    };

    const closeBtn = t.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        playSE('click');
        closeToast();
      };
    }
    t.onclick = () => {
      playSE('click');
      closeToast();
    };

    clearTimeout(toastTimer);
    if (!manualDismiss) {
      toastTimer = setTimeout(closeToast, 2800);
    }
  });
}

const escapeHtml = str => String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function highlightStatText(text) {
  if (!text) return '';
  const str = String(text);
  return str
    .replace(/(知力[↑↓+\-0-9万%億〜~]*)/g, '<span class="stat-tag smarts">$1</span>')
    .replace(/(体力[↑↓+\-0-9万%億〜~]*)/g, '<span class="stat-tag fitness">$1</span>')
    .replace(/(社交[↑↓+\-0-9万%億〜~]*)/g, '<span class="stat-tag social">$1</span>')
    .replace(/(創造(?:性)?[↑↓+\-0-9万%億〜~]*)/g, '<span class="stat-tag creativity">$1</span>')
    .replace(/(幸福(?:度)?[↑↓+\-0-9万%億〜~]*)/g, '<span class="stat-tag happy">$1</span>')
    .replace(/((?:貯金|資産|年収|費用|給与)[↑↓+\-0-9万%億〜~]*)/g, '<span class="stat-tag money">$1</span>');
}

function formatChoiceSub(text) {
  if (!text) return '';
  const tokens = String(text).split(/([｜|―])/);
  return tokens.map(t => {
    const trimmed = t.trim();
    if (trimmed === '｜' || trimmed === '|' || trimmed === '―') {
      return `<span class="choice-sep">${trimmed}</span>`;
    }
    const escaped = escapeHtml(trimmed);
    const highlighted = highlightStatText(escaped);
    if (trimmed.length > 0 && trimmed.length <= 18) {
      return `<span class="ib">${highlighted}</span>`;
    }
    return highlighted;
  }).filter(Boolean).join(' ');
}

function formatChoiceLabel(c) {
  const specialBadge = c.special ? '<span class="choice-special-badge">🌟 特別進路</span> ' : '';
  const rawLabel = typeof c.label === 'function' ? c.label() : c.label;
  const subText = c.sub || '';

  if (subText) {
    return `<span class="choice-main">${specialBadge}${escapeHtml(rawLabel)}</span><span class="choice-sub">${formatChoiceSub(subText)}</span>`;
  }

  // 「―」で区切られた説明文がある場合
  if (String(rawLabel).includes('―')) {
    const dashParts = String(rawLabel).split('―');
    const mainPart = dashParts[0].trim();
    const subPart = dashParts.slice(1).join('―').trim();
    return `<span class="choice-main">${escapeHtml(mainPart)}</span><span class="choice-sub">${formatChoiceSub(subPart)}</span>`;
  }

  // 「（...）」または「(...)」を含む長いテキストを、メイン行動と補足・条件に分割
  const parenMatch = String(rawLabel).match(/^(.+?)[（(](.+?)[）)](.*)$/);
  if (parenMatch) {
    const mainPart = parenMatch[1].trim();
    const detailPart = (parenMatch[2] + (parenMatch[3] ? ' ' + parenMatch[3].trim() : '')).trim();
    if (detailPart.length > 2) {
      return `<span class="choice-main">${escapeHtml(mainPart)}</span><span class="choice-sub">${formatChoiceSub(detailPart)}</span>`;
    }
  }

  return `<span class="choice-main">${escapeHtml(rawLabel)}</span>`;
}

function openModal() {
  const modal = $('#modal');
  modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal() {
  const modal = $('#modal');
  modal.hidden = true;
  modal.onclick = null;
  document.body.classList.remove('modal-open');
  if (S && S._pendingSnap) {
    delete S._pendingSnap;
  }
}

// ---------- モーダル ----------
function runEvent(ev) {
  return new Promise(resolve => {
    const modal = $('#modal'), card = $('#modal-card'), box = $('#modal-choices');
    const closeBtn = $('#modal-close');
    const footerEl = $('#modal-footer');
    card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    const isWorld = ev.badge === 'WORLD NEWS' || ev.isWorld;
    card.classList.toggle('world-news', !!isWorld);
    $('#modal-age').textContent = ev.badge || (S && $('#screen-game').classList.contains('active') ? `AGE ${S.age}` : 'MAIN MENU');
    $('#modal-icon').textContent = ev.icon;
    $('#modal-title').textContent = ev.title;
    const textEl = $('#modal-text');
    if (ev.html) {
      textEl.classList.add('is-html');
      textEl.innerHTML = typeof ev.html === 'function' ? ev.html() : ev.html;
    } else {
      textEl.classList.remove('is-html');
      textEl.textContent = typeof ev.text === 'function' ? ev.text() : ev.text;
    }
    card.classList.toggle('has-col-wrap', !!textEl.querySelector('.col-wrap'));
    $('#modal-chips').innerHTML = '';
    box.innerHTML = '';
    if (footerEl) {
      footerEl.innerHTML = '';
      footerEl.hidden = true;
    }

    const visibleChoices = ev.choices.filter(c => !c.cond || c.cond());
    const hasCancel = visibleChoices.some(c => c.cancel);
    const closeCancel = () => {
      playSE('click');
      closeModal();
      resolve();
    };
    if (closeBtn) {
      closeBtn.hidden = !hasCancel;
      closeBtn.onclick = hasCancel ? () => { closeBtn.blur(); closeCancel(); } : null;
    }
    modal.onclick = hasCancel ? (e => { if (e.target === modal) closeCancel(); }) : null;

    visibleChoices.forEach((c, i) => {
      const b = document.createElement('button');
      const isSinglePrimary = visibleChoices.length === 1;
      b.className = 'choice' + (isSinglePrimary ? ' primary' : c.cancel ? ' cancel' : c.dangerFill ? ' danger-fill' : c.danger ? ' danger' : '') + (c.special ? ' choice-special' : '') + (c.className ? ' ' + c.className : '');
      b.id = `choice-${i + 1}`;
      b.disabled = typeof c.disabled === 'function' ? !!c.disabled() : !!c.disabled;
      if (c.html) {
        b.innerHTML = typeof c.html === 'function' ? c.html() : c.html;
      } else {
        b.innerHTML = formatChoiceLabel(c);
      }

      const executeChoice = () => {
        if (closeBtn) closeBtn.hidden = true;
        modal.onclick = null;
        if (footerEl) {
          footerEl.innerHTML = '';
          footerEl.hidden = true;
        }
        const before = S ? snap() : {};
        let res = c.fn();
        if (typeof res === 'string') res = { text: res };
        if (c.silent) {
          if (res && res.then) runEvent(res.then).then(resolve);
          else { closeModal(); resolve(); }
          return;
        }
        const d = S ? diff(before) : [];
        if (S) {
          addLog(ev.icon, res.text ? `<b>${ev.title}</b>：${res.text}` : `<b>${ev.title}</b>`, d, true);
          renderAll();
        }
        const finish = () => {
          playSE('click');
          if (res && res.then) runEvent(res.then).then(resolve);
          else { closeModal(); resolve(); }
        };
        if (!res.text && !d.length) { finish(); return; }
        card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
        $('#modal-icon').textContent = ev.icon;
        $('#modal-title').textContent = ev.title;
        textEl.classList.remove('is-html');
        textEl.textContent = res.text || '';
        let cHtml = chipsHTML(d);
        if (S && S._pendingSnap) {
          cHtml += `<span class="chip snap-chip">📸 スナップ「${escapeHtml(S._pendingSnap.title)}」</span>`;
          delete S._pendingSnap;
        }
        $('#modal-chips').innerHTML = cHtml;
        box.innerHTML = '';
        const nb = document.createElement('button');
        nb.className = 'choice primary';
        nb.id = 'choice-ok';
        nb.textContent = res.then ? '次へ' : 'OK';
        nb.onclick = () => { nb.blur(); finish(); };
        box.appendChild(nb);
      };

      b.onclick = () => {
        b.blur();
        if (c.cancel && !c.confirm) {
          if (closeBtn) closeBtn.hidden = true;
          modal.onclick = null;
          if (footerEl) {
            footerEl.innerHTML = '';
            footerEl.hidden = true;
          }
          playSE('click');
          if (c.silent) {
            let res = c.fn();
            if (typeof res === 'string') res = { text: res };
            if (res && res.then) runEvent(res.then).then(resolve);
            else { closeModal(); resolve(); }
            return;
          }
          if (c.fn) {
            let res = c.fn();
            if (typeof res === 'string') res = { text: res };
            if (res && res.then) { runEvent(res.then).then(resolve); return; }
          }
          closeModal();
          resolve();
          return;
        }
        playSE('click');
        const confirmMsg = typeof c.confirm === 'function' ? c.confirm() : c.confirm;
        if (confirmMsg) {
          if (closeBtn) closeBtn.hidden = true;
          modal.onclick = null;
          if (footerEl) {
            footerEl.innerHTML = '';
            footerEl.hidden = true;
          }
          card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
          const rawL = typeof c.label === 'function' ? c.label() : c.label;
          $('#modal-icon').textContent = '⚠️';
          $('#modal-title').textContent = `確認：${rawL}`;
          textEl.classList.remove('is-html');
          textEl.textContent = confirmMsg;
          $('#modal-chips').innerHTML = '';
          box.innerHTML = '';

          const yesBtn = document.createElement('button');
          yesBtn.className = 'choice ' + (c.danger ? 'danger-fill' : 'primary');
          yesBtn.id = 'choice-1';
          yesBtn.textContent = 'はい、実行する';
          yesBtn.onclick = () => {
            yesBtn.blur();
            playSE('click');
            executeChoice();
          };

          const noBtn = document.createElement('button');
          noBtn.className = 'choice cancel';
          noBtn.id = 'choice-2';
          noBtn.textContent = 'やめておく（戻る）';
          noBtn.onclick = () => {
            noBtn.blur();
            playSE('click');
            runEvent(ev).then(resolve);
          };

          box.appendChild(yesBtn);
          box.appendChild(noBtn);
          return;
        }
        executeChoice();
      };

      if (c.cancel && visibleChoices.length > 1 && footerEl) {
        footerEl.appendChild(b);
        footerEl.hidden = false;
      } else {
        box.appendChild(b);
      }
    });
    openModal();
  });
}

function showMbtiDetail(mbtiKey) {
  const m = mbtiObj(mbtiKey);
  if (!m) return;
  const statNames = {
    smarts: '🧠 知力',
    fitness: '💪 体力',
    social: '🤝 社交',
    creativity: '🎨 創造',
    happy: '😊 幸福'
  };
  const biasRows = [];
  if (m.bias) {
    for (const [k, v] of Object.entries(m.bias)) {
      const upDown = v >= 1.0 ? 'up' : 'down';
      const mark = v >= 1.0 ? '📈' : '📉';
      const pct = Math.round(v * 100);
      biasRows.push(`<div class="bias-item ${upDown}"><span>${statNames[k] || k}</span><b>${mark} ×${v}（${pct}%）</b></div>`);
    }
  }

  const html = `
    <div class="detail-modal-body">
      <div class="detail-type-badge">${m.axis}</div>
      <h3 class="detail-type-title">「${m.name}」</h3>
      <p class="detail-type-desc">${m.desc}</p>
      <div class="detail-section">
        <div class="detail-sec-head">📊 ステータス成長補正</div>
        <div class="bias-grid">
          ${biasRows.length ? biasRows.join('') : '<div class="bias-item">標準バランス型（等倍）</div>'}
        </div>
      </div>
      <p class="detail-note">※行動や選択肢による該当ステータスの獲得量に補正ボーナスがかかります。</p>
    </div>
  `;

  playSE('click');
  runEvent({
    badge: 'PERSONALITY INFO',
    icon: '🌱',
    title: `性格：${m.axis}（${m.name}）`,
    html: html,
    choices: [
      { label: '閉じる', cancel: true, fn() {} }
    ]
  });
}

function showTraitDetail(traitId) {
  const t = traitObj(traitId);
  if (!t) return;
  const html = `
    <div class="detail-modal-body">
      <div class="detail-type-badge trait">${t.icon}</div>
      <h3 class="detail-type-title">「${t.name}」</h3>
      <p class="detail-type-desc">${t.desc}</p>
      <div class="detail-section">
        <div class="detail-sec-head">✨ 才能の特徴</div>
        <div class="trait-feature-box">
          生まれつき授かった固有の才能です。生涯にわたって成長や進学・就職、収入や成功率等に強力な効果を発揮します。
        </div>
      </div>
    </div>
  `;

  playSE('click');
  runEvent({
    badge: 'TALENT INFO',
    icon: t.icon || '✨',
    title: `才能：${t.name}`,
    html: html,
    choices: [
      { label: '閉じる', cancel: true, fn() {} }
    ]
  });
}

window.showMbtiDetail = showMbtiDetail;
window.showTraitDetail = showTraitDetail;

// ---------- 1年の進行 ----------
async function doAction(act) {
  if (busy || !S) return;
  playSE('click');
  busy = true;
  renderActions();
  renderLifeMenu();

  // 行動選択済みフラグと保留中イベントの記録（リロード時の不正やり直し防止）
  S.turnActed = true;
  if (act.label === '転職活動' || act.label === '就職活動') {
    S.pendingActionId = 'jobHunt';
  } else {
    S.pendingActionId = null;
  }

  const before = snap();
  let res = act.fn();
  if (typeof res === 'string') res = { text: res };
  const d = diff(before);
  addLog(act.icon, res.text, d);
  renderAll(); // リアルタイム自動セーブ（S.turnActed = true が確実に保持される）

  // 行動結果トーストを表示（手動で「✕」ボタンを押すまで待機してじっくり読ませる）
  await toast(res.text, d, true);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const triggerEvent = async (ev) => {
    if (!ev) return;
    await sleep(200);
    playSE('event');
    await runEvent(ev);
  };

  if (res.then) await triggerEvent(res.then);
  S.pendingActionId = null;
  const ms = milestone(S.age);
  if (ms) await triggerEvent(ms);
  const kms = checkKidMilestone();
  if (kms) await triggerEvent(kms);

  // ワールドイベント（社会・世界トレンド）判定
  const wev = pickWorldEvent();
  if (wev) {
    await triggerEvent(wev);
  } else if (S.age >= 3 && chance(0.6)) {
    // 通常のランダム個人イベント
    const ev = pickEvent();
    if (ev) await triggerEvent(ev);
  }

  const dead = yearEnd();
  S.turnActed = false;
  S.pendingActionId = null;
  busy = false;
  renderAll();

  if (dead) {
    busy = true;
    renderActions();
    renderLifeMenu();
    await sleep(600);
    playSE('bad');
    await runEvent({
      icon: '🕊️', title: '人生の終わり',
      text: S.cause === '老衰'
        ? `${S.name}は${S.age}歳で、${S.kids.length || S.married ? '家族に見守られながら' : '穏やかに'}眠るように息を引き取った。`
        : `${S.name}は${S.age}歳で、${S.cause}によりこの世を去った。`,
      choices: [{ label: '人生を振り返る', fn: () => '' }],
    });
    busy = false;
    showEnd();
  }
}

// ---------- エンディング・人生グラフ ----------
const ALL_ACHIEVEMENTS = [
  { icon: '🎂', name: '百寿者', check: (s) => s.age >= 100 },
  { icon: '🐢', name: '長寿', check: (s) => s.age >= 90 },
  { icon: '💰', name: '億万長者', check: (s, w) => w >= 10000 },
  { icon: '📈', name: '大投資家', check: (s, w, f) => f >= 5000 },
  { icon: '🎓', name: '博識', check: (s) => s.smarts >= 90 },
  { icon: '🤝', name: '人脈王', check: (s) => s.social >= 90 },
  { icon: '💪', name: '鋼鉄の肉体', check: (s) => s.fitness >= 90 },
  { icon: '🎨', name: '偉大な創作者', check: (s) => s.creativity >= 90 },
  { icon: '💍', name: '生涯の伴侶', check: (s) => s.married },
  { icon: '👨‍👩‍👧‍👦', name: '大家族', check: (s) => s.kids.length >= 3 },
  { icon: '👼', name: '孫に会えた', check: (s) => !!s.flags.grandchild },
  { icon: '🏢', name: '出世頭', check: (s) => !!s.flags.executive },
  { icon: '🚀', name: '起業家', check: (s) => !!s.flags.founder },
  { icon: '🗳️', name: '国会議員', check: (s) => !!s.flags.politician },
  { icon: '🌟', name: 'スター', check: (s) => !!s.flags.star },
  { icon: '🏅', name: 'プロアスリート', check: (s) => !!s.flags.pro },
  { icon: '✈️', name: '留学経験', check: (s) => !!s.flags.abroad },
  { icon: '🏠', name: 'マイホーム', check: (s) => !!s.flags.house },
  { icon: '🏙️', name: 'セレブ生活', check: (s) => s.assets && (s.assets.house === 'tower' || s.assets.car === 'supercar' || s.assets.items.includes('villa')) },
  { icon: '🐱', name: 'ペットと暮らした', check: (s) => !!s.flags.pet },
  { icon: '🛸', name: '宇宙旅行者', check: (s) => !!s.flags.space },
  { icon: '🤞', name: '親友', check: (s) => !!s.flags.bestfriend },
  { icon: '🎰', name: '強運', check: (s) => !!s.flags.lottery },
  { icon: '💼', name: '天職の極み', check: (s) => (s.job && s.job.level >= 3) || !!(s.flags && (s.flags.executive || s.flags.pro || s.flags.star)) },
  { icon: '🌟', name: '多角経営の覇者', check: (s, w, f) => (!!s.sideJob && w >= 2500) || (s.assets && s.assets.estate >= 3000) },
  { icon: '😊', name: '幸せな人生', check: (s, w, f, avg) => avg >= 70 },
];

function evaluate() {
  const avg = Math.round(S.happySum / Math.max(1, S.years));
  const wealth = totalWealth();
  const finAssets = S.assets ? S.assets.stock + S.assets.estate : 0;
  const ach = ALL_ACHIEVEMENTS.map(a => ({
    icon: a.icon,
    name: a.name,
    on: a.check(S, wealth, finAssets, avg),
  }));
  const got = ach.filter(a => a.on).length;

  // 基本スコア（幸福度・年齢・実績・資産）
  let baseScore = avg * 0.55 + Math.min(S.age, 100) * 0.18 + got * 2.2 + (wealth >= 0 ? Math.min(12, wealth / 1200) : -8);

  // 【多軸評価：生き様ボーナス】
  let styleBonus = 0;
  let lifeStyle = '王道';

  // 1. 太く短いロックスター型（30〜55歳で夭折しても圧倒的な実績や才能・名声があれば高ランク）
  if (S.age <= 55 && (S.flags.founder || S.flags.ceo || S.flags.star || S.flags.pro || (S.job && S.job.name === 'ミュージシャン') || got >= 6)) {
    const youthImpact = (got * 3.5) + (S.smarts >= 80 ? 8 : 0) + (S.creativity >= 80 ? 8 : 0) + (wealth >= 5000 ? 10 : 0);
    styleBonus += Math.min(32, youthImpact);
    lifeStyle = '閃光';
  }

  // 2. 波乱万丈・不屈の逆転劇型（借金や離婚・大病を乗り越えて生き抜いたドラマ）
  if (S.flags.divorced || S.cause === '衰弱・大病' || (S.money < 0 && wealth > 1000)) {
    styleBonus += 14;
    lifeStyle = '不屈';
  }

  // 3. 清貧の名人・家庭円満型（資産控えめでも高い幸福度と大家族）
  if (wealth < 5000 && avg >= 78 && S.married && S.kids.length >= 2) {
    styleBonus += 16;
    lifeStyle = '清貧の名匠';
  }

  // 4. 学術・文化の探求者（知力・創造性がともにトップレベル）
  if (S.smarts >= 85 && S.creativity >= 85) {
    styleBonus += 12;
  }

  const score = Math.max(0, Math.round(baseScore + styleBonus));
  const rank = score >= 85 ? 'S' : score >= 72 ? 'A' : score >= 60 ? 'B' : score >= 45 ? 'C' : 'D';

  let title = '平凡で愛おしい人生';
  if (S.age < 30) title = '駆け抜けた短い命';
  else if (S.flags.politician) title = '国を動かした政治家';
  else if (S.flags.star) title = '時代を彩ったスター';
  else if (S.flags.founder) title = '一代で財を成した起業家';
  else if (S.flags.pro) title = '夢を叶えたアスリート';
  else if (wealth >= 5000 && (S.flags.founder || S.sideJob)) title = '時代の寵児';
  else if (wealth >= 10000) title = '大富豪';
  else if (finAssets >= 5000) title = '伝説の投資家';
  else if (S.age >= 100) title = '百年を生きた賢者';
  else if (S.kids.length >= 3) title = '大家族の大黒柱';
  else if (S.job && ['医師', '弁護士', 'AI研究者'].includes(S.job.name) || S.flags.executive) title = '社会を支えたエリート';
  else if (avg >= 70) title = '幸せを掴んだ人';
  else if (avg < 35) title = '波乱万丈の人生';
  else if (wealth < 0) title = '借金と共に生きた人';
  return { avg, ach, got, score, rank, title, wealth };
}

function renderChart() {
  const box = $('#end-chart');
  if (!box) return;
  const hist = (S.history && S.history.length > 1) ? S.history : [{ age: 0, happy: 60, fitness: 60, wealth: 0 }, { age: S.age || 1, happy: S.happy, fitness: S.fitness, wealth: totalWealth() }];
  const W = 600, H = 140, padX = 24, padY = 14;
  const maxAge = Math.max(1, hist[hist.length - 1].age);
  const maxW = Math.max(500, ...hist.map(h => Math.max(0, h.wealth)));

  const xOf = age => padX + (age / maxAge) * (W - padX * 2);
  const yOfStat = v => H - padY - (clamp(v, 0, 100) / 100) * (H - padY * 2);
  const yOfWealth = w => H - padY - (clamp(w, 0, maxW) / maxW) * (H - padY * 2);

  const ptsHappy = hist.map(h => `${xOf(h.age).toFixed(1)},${yOfStat(h.happy).toFixed(1)}`).join(' ');
  const ptsFit = hist.map(h => `${xOf(h.age).toFixed(1)},${yOfStat(h.fitness || h.health || 50).toFixed(1)}`).join(' ');
  const ptsWealth = hist.map(h => `${xOf(h.age).toFixed(1)},${yOfWealth(h.wealth).toFixed(1)}`).join(' ');

  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line x1="${padX}" y1="${yOfStat(50)}" x2="${W - padX}" y2="${yOfStat(50)}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 4"/>
      <polyline fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${ptsWealth}"/>
      <polyline fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${ptsFit}"/>
      <polyline fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${ptsHappy}"/>
      <text x="${padX}" y="${H - 1}" fill="#9aa0c3" font-size="11">0歳</text>
      <text x="${W / 2}" y="${H - 1}" fill="#9aa0c3" font-size="11" text-anchor="middle">${Math.round(maxAge / 2)}歳</text>
      <text x="${W - padX}" y="${H - 1}" fill="#9aa0c3" font-size="11" text-anchor="end">${maxAge}歳</text>
    </svg>
    <div class="chart-legend">
      <span><i style="background:#fbbf24"></i>幸福度</span>
      <span><i style="background:#34d399"></i>体力</span>
      <span><i style="background:#a78bfa"></i>総資産（最大 ${fmtMoney(maxW)}）</span>
    </div>
  `;
}

function showEnd() {
  const e = evaluate();
  playSE('fanfare');
  document.body.dataset.stage = 'end';
  $('#end-name').textContent = S.name;
  $('#end-span').textContent = `享年 ${S.age}歳 ｜ 死因：${S.cause}`;
  const rankLower = (e.rank || 'c').toLowerCase();
  const rankSubMap = { s: 'LEGEND', a: 'GREAT', b: 'GOOD', c: 'NORMAL', d: 'HARD' };
  $('#end-rank').className = `rank rank-${rankLower}`;
  $('#end-rank').innerHTML = `<span class="rank-letter">${e.rank}</span><span class="rank-sub">${rankSubMap[rankLower] || ''}</span>`;
  $('#end-title').textContent = e.title;
  $('#end-score').innerHTML = `<span class="score-label">SCORE</span><b class="score-num">${e.score.toLocaleString()}</b>`;
  const finalEdu = formatEduString();
  const stats = [
    ['平均幸福度', e.avg], ['最終総資産', fmtMoney(e.wealth)], ['学歴', finalEdu],
    ['最終職業', jobTitle()], ['家族', `${S.married ? '配偶者あり' : '独身'}・子${S.kids.length}人`], ['実績', `${e.got} / ${e.ach.length}`],
  ];
  $('#end-stats').innerHTML = stats.map(([a, b]) => `<div class="end-stat"><small>${a}</small><b>${b}</b></div>`).join('');
  lastShare = buildShareData(e, finalEdu);
  renderChart();
  renderEndAlbum();
  $('#end-ach').innerHTML = e.ach.map(a => `<span class="${a.on ? 'on' : 'off'}">${a.icon} ${a.name}</span>`).join('');
  $('#end-timeline').innerHTML = S.log.filter(l => l.major).map(l => `<li><span class="t-age">${l.age}歳</span><span>${l.icon} ${l.text}</span></li>`).join('');

  // コレクション＆殿堂入り記録の保存
  const finalJob = jobTitle();
  const finalFamily = `${S.married ? '配偶者あり' : '独身'}・子${S.kids.length}人`;
  const finalAchText = `${e.got} / ${e.ach.length}`;
  const hofEntry = {
    name: S.name, gen: S.gen || 1, age: S.age, cause: S.cause || '大往生',
    score: e.score, rank: e.rank, title: e.title, wealth: e.wealth,
    avg: e.avg, eduLabel: finalEdu, job: finalJob,
    family: finalFamily, achText: finalAchText,
  };
  const meta = loadMeta();
  e.ach.forEach(a => { if (a.on) meta.ach[a.name] = true; });
  meta.titles[e.title] = true;
  (S.traits || []).forEach(t => { meta.traits[t] = true; });
  if (S.job && S.job.name) meta.jobs[S.job.name] = true;
  if (S.lastJob && S.lastJob.name) meta.jobs[S.lastJob.name] = true;
  meta.totalLives = (meta.totalLives || 0) + 1;
  meta.hof.push(hofEntry);
  meta.hof.sort((a, b) => b.score - a.score);
  meta.hof = meta.hof.slice(0, 10);
  saveMeta(meta);

  const best = JSON.parse(localStorage.getItem('life_sim_best') || 'null');
  if (!best || e.score > best.score) {
    localStorage.setItem('life_sim_best', JSON.stringify(hofEntry));
  }

  clearCurrentGame();
  showScreen('screen-end');
}

// ---------- 結果シェア ----------
let lastShare = null;

function buildShareData(e, finalEdu = null) {
  const nameLabel = S.name;
  const job = jobTitle();
  const family = `${S.married ? '配偶者あり' : '独身'}・子${S.kids.length}人`;
  const eduStr = finalEdu || formatEduString();
  const stats = [
    ['平均幸福度', String(e.avg)], ['最終総資産', fmtMoney(e.wealth)], ['学歴', eduStr],
    ['最終職業', job], ['家族', family], ['実績', `${e.got} / ${e.ach.length}`],
  ];
  const url = /^https?:/.test(location.protocol) ? location.href.split('#')[0] : '';
  const text = [
    '🌱 LIFE ― ひとつの人生',
    `${nameLabel}の人生が幕を閉じました。享年${S.age}歳（${S.cause}）`,
    `🏅 ランク ${e.rank}「${e.title}」 SCORE ${e.score}`,
    `😊 平均幸福度 ${e.avg} ／ 💰 総資産 ${fmtMoney(e.wealth)}`,
    `🎓 学歴 ${eduStr} ／ 💼 ${job}`,
    `👨‍👩‍👧 ${family} ／ 🎖️ 実績 ${e.got}/${e.ach.length}`,
    `📸 人生アルバム：${(S && S.album) ? S.album.length : 0}枚の思い出`, 
    '#LIFEひとつの人生',
    url,
  ].filter(Boolean).join('\n');
  return {
    nameLabel, rank: e.rank, title: e.title, score: e.score,
    age: S.age, cause: S.cause, subtitle: `享年 ${S.age}歳 ｜ 死因：${S.cause}`,
    stats, text, url,
  };
}

function buildHofShareData(h, rankIdx = 0) {
  const nameLabel = h.name;
  const causePart = h.cause ? `（${h.cause}）` : '';
  const stats = [
    ['平均幸福度', h.avg !== undefined ? String(h.avg) : '—'],
    ['最終総資産', fmtMoney(h.wealth || 0)],
    ['学歴', h.eduLabel || '—'],
    ['最終職業', h.job || '—'],
    ['家族', h.family || '一般家庭'],
    ['実績', h.achText || `殿堂入り #${rankIdx + 1}`],
  ];
  const url = /^https?:/.test(location.protocol) ? location.href.split('#')[0] : '';
  const detailLine = [
    h.job ? `💼 ${h.job}` : '',
    h.family ? `👨‍👩‍👧 ${h.family}` : '',
    h.achText ? `🎖️ 実績 ${h.achText}` : '',
  ].filter(Boolean).join(' ／ ');
  const text = [
    `🌱 LIFE ― ひとつの人生（殿堂入り #${rankIdx + 1}）`,
    `${nameLabel}の人生記録：享年${h.age}歳${causePart}`,
    `🏅 ランク ${h.rank}「${h.title}」 SCORE ${h.score}`,
    `${h.avg !== undefined ? `😊 平均幸福度 ${h.avg} ／ ` : ''}💰 総資産 ${fmtMoney(h.wealth || 0)}`,
    detailLine,
    '#LIFEひとつの人生',
    url,
  ].filter(Boolean).join('\n');
  return {
    nameLabel, rank: h.rank, title: h.title, score: h.score,
    age: h.age, cause: h.cause || '殿堂入り記録',
    subtitle: h.cause ? `享年 ${h.age}歳 ｜ 死因：${h.cause}` : `享年 ${h.age}歳 ｜ 殿堂入り #${rankIdx + 1}`,
    stats, text, url,
  };
}

function buildCollectionShareData(m) {
  const allJobs = [...JOBS, ...SPECIAL_JOBS];
  const achGot = ALL_ACHIEVEMENTS.filter(a => m.ach[a.name]).length;
  const jobGot = allJobs.filter(j => m.jobs[j.name]).length;
  const traitGot = TRAITS.filter(t => m.traits[t.id]).length;
  const top = m.hof && m.hof[0] ? m.hof[0] : null;
  const stats = [
    ['実績コンプ', `${achGot} / ${ALL_ACHIEVEMENTS.length}`],
    ['職業図鑑', `${jobGot} / ${allJobs.length}`],
    ['才能図鑑', `${traitGot} / ${TRAITS.length}`],
    ['殿堂入り数', `${(m.hof || []).length}人`],
    ['歴代最高資産', top ? fmtMoney(top.wealth || 0) : '—'],
  ];
  const url = /^https?:/.test(location.protocol) ? location.href.split('#')[0] : '';
  const text = [
    '🌱 LIFE ― ひとつの人生（コレクション図鑑）',
    top ? `🏆 歴代1位：${top.name}（享年${top.age}歳）ランク ${top.rank}「${top.title}」SCORE ${top.score}` : '📖 コレクション記録',
    `🎖️ 実績 ${achGot}/${ALL_ACHIEVEMENTS.length} ／ 💼 職業 ${jobGot}/${allJobs.length} ／ 🧬 才能 ${traitGot}/${TRAITS.length}`,
    '#LIFEひとつの人生',
    url,
  ].filter(Boolean).join('\n');
  return {
    nameLabel: top ? `歴代1位：${top.name}` : 'コレクション図鑑',
    rank: top ? top.rank : '📖',
    title: top ? top.title : '人生の記録者',
    score: top ? top.score : achGot * 10,
    age: top ? top.age : 0,
    cause: '',
    subtitle: `殿堂入り：${(m.hof || []).length}人 ｜ 実績 ${achGot}/${ALL_ACHIEVEMENTS.length}`,
    stats, text, url,
  };
}

function makeShareImage(d) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const font = "'Zen Maru Gothic', 'Hiragino Sans', 'Meiryo', sans-serif";
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0b16'); bg.addColorStop(1, '#241a4a');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.8, H * 0.15, 10, W * 0.8, H * 0.15, 520);
  glow.addColorStop(0, 'rgba(244,114,182,.35)'); glow.addColorStop(1, 'rgba(244,114,182,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = '#9aa0c3'; g.font = `600 34px ${font}`;
  g.fillText('🌱 LIFE ― ひとつの人生', W / 2, 110);
  g.fillStyle = '#eef0ff'; g.font = `800 64px ${font}`;
  g.fillText(d.nameLabel, W / 2, 230);
  g.fillStyle = '#9aa0c3'; g.font = `500 32px ${font}`;
  g.fillText(d.subtitle || `享年 ${d.age}歳 ｜ 死因：${d.cause}`, W / 2, 290);
  const cg = g.createLinearGradient(W / 2 - 120, 340, W / 2 + 120, 580);
  cg.addColorStop(0, '#a78bfa'); cg.addColorStop(1, '#f472b6');
  g.fillStyle = cg; g.beginPath(); g.arc(W / 2, 460, 120, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#160f2b'; g.font = `800 130px ${font}`;
  g.fillText(d.rank, W / 2, 505);
  g.fillStyle = '#eef0ff'; g.font = `700 58px ${font}`;
  g.fillText(`「${d.title}」`, W / 2, 665);
  g.fillStyle = '#fbbf24'; g.font = `700 44px ${font}`;
  g.fillText(`SCORE ${d.score}`, W / 2, 735);
  const colW = 440, rowH = 120, x0 = (W - colW * 2 - 30) / 2, y0 = 800;
  d.stats.forEach(([a, b], i) => {
    const x = x0 + (i % 2) * (colW + 30), y = y0 + Math.floor(i / 2) * (rowH + 20);
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.roundRect(x, y, colW, rowH, 24); g.fill();
    g.fillStyle = '#9aa0c3'; g.font = `500 26px ${font}`; g.fillText(a, x + colW / 2, y + 42);
    g.fillStyle = '#eef0ff'; g.font = `700 36px ${font}`;
    let t = String(b);
    while (g.measureText(t).width > colW - 30 && t.length > 2) t = t.slice(0, -2) + '…';
    g.fillText(t, x + colW / 2, y + 92);
  });
  g.fillStyle = '#9aa0c3'; g.font = `500 28px ${font}`;
  g.fillText('#LIFEひとつの人生', W / 2, H - 50);
  return c;
}

async function openShareModal(targetData = null, opts = {}) {
  const d = targetData || lastShare;
  if (!d) return;
  playSE('click');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const p = runEvent({
    badge: 'SHARE',
    icon: '📤',
    title: `シェア：${d.nameLabel}`,
    html: `
      <textarea id="share-text" class="share-text" readonly rows="7">${esc(d.text)}</textarea>
      <div class="share-btns">
        <button type="button" id="share-native" class="choice primary">📤 共有する</button>
        <button type="button" id="share-copy" class="choice">📋 テキストをコピー</button>
        <button type="button" id="share-x" class="choice">𝕏 で投稿する</button>
        <button type="button" id="share-img" class="choice">🖼️ 結果カードを画像保存</button>
      </div>
      <div id="share-msg" class="share-msg"></div>`,
    choices: [{ label: opts.fromCollection ? '← コレクション図鑑に戻る' : '閉じる', cancel: true, fn: () => '' }],
  });
  const msg = t => { const m = $('#share-msg'); if (m) m.textContent = t; };
  const copyText = async () => {
    try { await navigator.clipboard.writeText(d.text); return true; } catch (err) {
      const ta = $('#share-text'); ta.select();
      try { return document.execCommand('copy'); } catch (e2) { return false; }
    }
  };
  $('#share-native').onclick = async () => {
    playSE('click');
    if (navigator.share) {
      try { await navigator.share({ title: 'LIFE ― ひとつの人生', text: d.text }); msg('共有しました！'); }
      catch (err) { if (err.name !== 'AbortError') msg('共有できませんでした。コピーをお試しください。'); }
    } else {
      msg((await copyText()) ? 'この環境は共有に未対応のため、テキストをコピーしました。' : 'コピーできませんでした。テキストを長押し/選択してください。');
    }
  };
  $('#share-copy').onclick = async () => {
    playSE('click');
    msg((await copyText()) ? 'コピーしました！' : 'コピーできませんでした。テキストを選択してコピーしてください。');
  };
  $('#share-x').onclick = () => {
    playSE('click');
    const u = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(d.text);
    window.open(u, '_blank', 'noopener');
  };
  $('#share-img').onclick = async () => {
    playSE('click');
    try {
      const cv = makeShareImage(d);
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      const file = new File([blob], 'life-result.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: d.text }); msg('画像を共有しました！'); return; }
        catch (err) { if (err.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'life-result.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      msg('画像を保存しました！');
    } catch (err) {
      console.error(err);
      msg('画像を作成できませんでした。');
    }
  };
  await p;
  if (opts.fromCollection) {
    await openCollectionModal();
  }
}

// ---------- コレクション図鑑モーダル ----------
async function openCollectionModal() {
  playSE('click');
  const m = loadMeta();
  const allJobs = [...JOBS, ...SPECIAL_JOBS];
  const achGot = ALL_ACHIEVEMENTS.filter(a => m.ach[a.name]).length;
  const jobGot = allJobs.filter(j => m.jobs[j.name]).length;
  const traitGot = TRAITS.filter(t => m.traits[t.id]).length;

  const hofHTML = m.hof.length
    ? `<ol class="hof-list">${m.hof.map((h, i) => `
        <li class="hof-item">
          <span class="hof-rank">${i + 1}</span>
          <div class="hof-main">
            <b>${h.name}（享年${h.age}歳）</b>
            <small>「${h.title}」｜総資産 ${fmtMoney(h.wealth || 0)}</small>
          </div>
          <div class="hof-right">
            <span class="hof-score">${h.rank} / ${h.score}pt</span>
            <button type="button" class="hof-share-btn" data-hof-idx="${i}" title="この人生の記録をシェア">📤 共有</button>
          </div>
        </li>`).join('')}</ol>`
    : `<p style="color:var(--muted);font-size:.85rem;">まだ殿堂入り記録がありません。人生を最後まで歩むと記録されます。</p>`;

  const achHTML = ALL_ACHIEVEMENTS.map(a =>
    `<span class="col-badge ${m.ach[a.name] ? 'on' : 'off'}">${a.icon} ${a.name}</span>`
  ).join('');

  const jobHTML = allJobs.map(j =>
    `<span class="col-badge ${m.jobs[j.name] ? 'on' : 'off'}">${j.icon} ${j.name}</span>`
  ).join('');

  const traitHTML = TRAITS.map(t =>
    `<span class="col-badge ${m.traits[t.id] ? 'on' : 'off'}" title="${t.desc}">${t.icon} ${t.name}</span>`
  ).join('');

  const html = `
    <div class="col-wrap">
      <div>
        <div class="col-sec-title">🏆 歴代ベスト人生（殿堂入り TOP10）</div>
        ${hofHTML}
      </div>
      <div>
        <div class="col-sec-title">🎖️ 実績コレクション（${achGot} / ${ALL_ACHIEVEMENTS.length}）</div>
        <div class="col-badges">${achHTML}</div>
      </div>
      <div>
        <div class="col-sec-title">💼 職業図鑑（${jobGot} / ${allJobs.length}）</div>
        <div class="col-badges">${jobHTML}</div>
      </div>
      <div>
        <div class="col-sec-title">🧬 才能図鑑（${traitGot} / ${TRAITS.length}）</div>
        <div class="col-badges">${traitHTML}</div>
      </div>
    </div>
  `;

  let selectedHofIdx = null;
  let shareSummary = false;
  const p = runEvent({
    badge: 'COLLECTION',
    icon: '📖',
    title: 'コレクション図鑑・殿堂入り',
    html,
    choices: [
      {
        label: '📤 図鑑・歴代記録のまとめをシェア',
        silent: true,
        fn: () => { shareSummary = true; return ''; },
      },
      { label: '閉じる', cancel: true, fn: () => '' },
    ],
  });

  document.querySelectorAll('.hof-share-btn').forEach(btn => {
    btn.onclick = () => {
      selectedHofIdx = parseInt(btn.dataset.hofIdx, 10);
      const closeBtn = $('#modal-close');
      if (closeBtn) closeBtn.click();
    };
  });

  await p;
  if (selectedHofIdx !== null && m.hof[selectedHofIdx]) {
    await openShareModal(buildHofShareData(m.hof[selectedHofIdx], selectedHofIdx), { fromCollection: true });
  } else if (shareSummary) {
    await openShareModal(buildCollectionShareData(m), { fromCollection: true });
  }
}

// ---------- 画面遷移・初期化 ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
  try {
    if (id === 'screen-game') {
      localStorage.setItem('life_sim_active_screen', 'game');
    } else if (id === 'screen-start') {
      localStorage.setItem('life_sim_active_screen', 'start');
    } else if (id === 'screen-end') {
      localStorage.removeItem('life_sim_active_screen');
    }
  } catch (e) {}
}

function renderBest() {
  const best = JSON.parse(localStorage.getItem('life_sim_best') || 'null');
  $('#best-record').innerHTML = best
    ? `🏆 最高記録：<b>${best.rank}</b>（${best.score}点）${best.name} ― 「${best.title}」享年${best.age}`
    : '';
}

function getSavedGame() {
  const saved = localStorage.getItem('life_sim_current');
  if (!saved) return null;
  try {
    const data = JSON.parse(saved);
    if (data && data.name && !data.cause) return data;
  } catch (e) {}
  return null;
}

let selectedGender = 'random';
let selectedOrientation = 'hetero';

function initStartOptions() {
  document.querySelectorAll('#gender-chips .opt-chip').forEach(chip => {
    chip.onclick = () => {
      playSE('click');
      document.querySelectorAll('#gender-chips .opt-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedGender = chip.dataset.gender;
      const input = $('#input-name');
      // ランダムボタンで生成された名前が入っている場合、選んだ性別に合わせて名前も自動更新
      if (input.dataset.isRandom === 'true') {
        let gen = selectedGender;
        if (!gen || gen === 'random') gen = chance(0.5) ? 'male' : 'female';
        const newN = randomName(gen);
        input.value = newN;
        input.dataset.genGender = gen;
      } else if (!input.value.trim()) {
        input.placeholder = `名前を入力（空欄で${chip.textContent.trim()}のランダム名）`;
      }
    };
  });
  document.querySelectorAll('#orientation-chips .opt-chip').forEach(chip => {
    chip.onclick = () => {
      playSE('click');
      document.querySelectorAll('#orientation-chips .opt-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedOrientation = chip.dataset.orientation;
    };
  });
}
initStartOptions();

function doStartNewGame() {
  playSE('fanfare');
  const inputEl = $('#input-name');
  const inputVal = inputEl.value.trim();
  let finalGender = selectedGender;

  // 性別がランダム（おまかせ）の場合
  if (!finalGender || finalGender === 'random') {
    // 1) ユーザーが手入力またはランダム生成した名前から性別を判定
    const detected = detectGenderFromName(inputVal);
    if (detected) {
      finalGender = detected;
    } else if (inputEl.dataset.genGender) {
      finalGender = inputEl.dataset.genGender;
    } else {
      // 2) 名前が空欄などの場合はここで50%で性別を確定
      finalGender = chance(0.5) ? 'male' : 'female';
    }
  }

  // 確定した finalGender に合致した名前を使用（空欄ならその性別で生成）
  const name = inputVal || randomName(finalGender);
  newLife(name, finalGender, selectedOrientation);
  addAlbumSnap({
    id: 'birth', age: 0, icon: '🍼',
    title: 'この世に誕生！',
    desc: '家族の祝福を受け、この広い世界に元気な産声をあげて誕生した。',
    tag: '生誕'
  });
  $('#log').innerHTML = '';
  busy = false;
  switchTab('action', true);
  addSep(0, 0, 0);
  const tNames = (S.traits || []).map(id => traitObj(id)?.name).filter(Boolean).join('・');
  const gText = { male: '男の子', female: '女の子', other: '子ども' }[S.gender] || '子ども';
  addLog('👶', `${FAMILY[S.family].text}家庭に、元気な${gText}として${S.name}が誕生した。（才能：${tNames}）`, [], true);
  showScreen('screen-game');
  renderAll();
}

async function startGame() {
  const saved = getSavedGame();
  if (saved) {
    playSE('click');
    await runEvent({
      badge: 'NEW GAME',
      icon: '⚠️',
      title: '確認：新しく生まれる',
      text: `現在進行中のデータ「${saved.name}（${saved.age}歳）」があります。\n新しく生まれると現在の進行データは上書きされますが、よろしいですか？`,
      choices: [
        { label: 'はい、新しく生まれる', dangerFill: true, silent: true, fn: () => { doStartNewGame(); return ''; } },
        { label: 'やめておく（戻る）', cancel: true, fn: () => '' },
      ],
    });
    return;
  }
  doStartNewGame();
}

// ---------- セーブ・ロード・再開 ----------
function saveCurrentGame() {
  if (!S || S.cause) return;
  try {
    localStorage.setItem('life_sim_current', JSON.stringify(S));
  } catch (e) {
    console.warn('Auto-save failed', e);
  }
}

function clearCurrentGame() {
  localStorage.removeItem('life_sim_current');
  updateResumeBtn();
}

function updateResumeBtn() {
  const resumeBtn = $('#btn-resume');
  const infoSpan = $('#resume-info');
  if (!resumeBtn) return;
  const data = getSavedGame();
  if (data) {
    infoSpan.textContent = `（${data.name}・${data.age}歳）`;
    resumeBtn.disabled = false;
  } else {
    infoSpan.textContent = '（データなし）';
    resumeBtn.disabled = true;
  }
}

async function checkPendingTurn() {
  if (!S || !S.turnActed) return;
  busy = true;
  renderActions();
  renderLifeMenu();

  const pendingId = S.pendingActionId;
  S.pendingActionId = null;

  if (pendingId === 'jobHunt') {
    // 転職・就職活動モーダルを復帰（カードの選び直しは不可）
    playSE('event');
    await runEvent(jobHuntEvent());
  }

  const ms = milestone(S.age);
  if (ms) await runEvent(ms);
  const kms = checkKidMilestone();
  if (kms) await runEvent(kms);

  const dead = yearEnd();
  S.turnActed = false;
  S.pendingActionId = null;
  busy = false;
  renderAll();

  if (dead) {
    busy = true;
    renderActions();
    renderLifeMenu();
    playSE('bad');
    await runEvent({
      icon: '🕊️', title: '人生の終わり',
      text: S.cause === '老衰'
        ? `${S.name}は${S.age}歳で、${S.kids.length || S.married ? '家族に見守られながら' : '穏やかに'}眠るように息を引き取った。`
        : `${S.name}は${S.age}歳で、${S.cause}によりこの世を去った。`,
      choices: [{ label: '人生を振り返る', fn: () => '' }],
    });
    busy = false;
    showEnd();
  }
}

function resumeGame(auto = false) {
  const data = getSavedGame();
  if (!data) return false;
  try {
    if (!auto) playSE('click');
    S = ensureState(data);
    busy = false;
    switchTab('action', true);
    rebuildLogs(S.log || []);
    showScreen('screen-game');
    renderAll();
    if (!auto) {
      toast(`おかえりなさい！ ${S.name}（${S.age}歳）の人生を再開しました`, []);
    }
    if (S.turnActed) {
      setTimeout(() => { checkPendingTurn(); }, 150);
    }
    return true;
  } catch (e) {
    console.error('Failed to resume game', e);
  }
  return false;
}

function returnToMainMenu() {
  if (busy) return;
  playSE('click');
  saveCurrentGame();
  document.body.dataset.stage = 'start';
  renderBest();
  updateResumeBtn();
  showScreen('screen-start');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});
if ($('#mini-stats')) {
  $('#mini-stats').onclick = () => switchTab(currentTab === 'status' ? 'action' : 'status');
}

$('#btn-start').onclick = () => startGame();
$('#btn-resume').onclick = () => resumeGame();
$('#btn-collection').onclick = () => openCollectionModal();
const albumBtn = $('#btn-open-album');
if (albumBtn) albumBtn.onclick = () => openAlbumModal();
$('#btn-share').onclick = () => openShareModal();
$('#btn-sound').onclick = () => { prefs.sound = !prefs.sound; savePrefs(); if (prefs.sound) playSE('good'); };
$('#input-name').addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });
$('#btn-random-name').onclick = () => {
  playSE('click');
  let gen = selectedGender;
  if (!gen || gen === 'random') {
    gen = chance(0.5) ? 'male' : 'female';
  }
  const generated = randomName(gen);
  const input = $('#input-name');
  input.value = generated;
  input.dataset.genGender = gen;
  input.dataset.isRandom = 'true';
};
$('#input-name').addEventListener('input', () => {
  const input = $('#input-name');
  input.dataset.isRandom = 'false';
  delete input.dataset.genGender;
});
$('#btn-restart').onclick = () => {
  playSE('click');
  document.body.dataset.stage = 'start';
  renderBest();
  updateResumeBtn();
  const input = $('#input-name');
  input.value = '';
  delete input.dataset.genGender;
  delete input.dataset.isRandom;
  showScreen('screen-start');
};
if ($('#btn-menu')) {
  $('#btn-menu').onclick = () => returnToMainMenu();
}

document.addEventListener('keydown', e => {
  const n = parseInt(e.key, 10);
  const modal = $('#modal');
  if (!modal.hidden) {
    const closeBtn = $('#modal-close');
    if (e.key === 'Escape' && closeBtn && !closeBtn.hidden) {
      e.preventDefault();
      closeBtn.click();
      return;
    }
    const btns = [...$('#modal-choices').querySelectorAll('button:not(:disabled)')];
    if (e.key === 'Enter' && btns.length === 1) { e.preventDefault(); btns[0].click(); }
    else if (n >= 1 && n <= btns.length) btns[n - 1].click();
    return;
  }
  if ($('#screen-game').classList.contains('active') && currentTab === 'action' && !busy && n >= 1) {
    const acts = currentActions();
    if (n <= acts.length) doAction(acts[n - 1]);
  }
});

// ダブルタップによる意図しないズームイン・拡大の防止 (iOS/Android)
document.addEventListener('dblclick', (e) => {
  e.preventDefault();
}, { passive: false });

document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// モーダル背景領域のタッチスクロール防止
const modalEl = $('#modal');
if (modalEl) {
  modalEl.addEventListener('touchmove', e => {
    if (e.target === modalEl) {
      e.preventDefault();
    }
  }, { passive: false });
}

// 起動時：プレイ中データがあれば直接ゲームを再開、なければスタート画面
applyPrefsUI();
renderBest();
updateResumeBtn();

const savedGameData = getSavedGame();
const lastActiveScreen = localStorage.getItem('life_sim_active_screen');
if (savedGameData && lastActiveScreen !== 'start') {
  resumeGame(true);
} else {
  showScreen('screen-start');
}

window.__getS = () => S;
window.__setS = v => { S = v; };
window.showEnd = showEnd;
window.showScreen = showScreen;
window.showStatFloats = showStatFloats;
window.renderAll = renderAll;
window.evaluate = evaluate;
window.pension = pension;
window.currentActions = currentActions;
window.yearEnd = yearEnd;
