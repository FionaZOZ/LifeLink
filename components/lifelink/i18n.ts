'use client';
import * as React from 'react';

export type Lang = 'en' | 'zh';

const KEY = 'lifelink:lang';

/** Single source of truth: `lifelink:lang` in localStorage (plus in-memory updates via `lifelink:lang-change`). */
export function getLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const v = window.localStorage.getItem(KEY);
  return v === 'zh' ? 'zh' : 'en';
}

export function setLangValue(l: Lang) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, l);
  window.dispatchEvent(new CustomEvent('lifelink:lang-change', { detail: l }));
}

/** Clear saved language to default (English) and notify listeners. Use on sign-out to guest. */
export function resetLangToEnglish() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('lifelink:lang-change', { detail: 'en' as Lang }));
}

export function useLang(): [Lang, (l: Lang) => void] {
  // Must match server first paint (always 'en') or Next.js raises a hydration error.
  // Never read localStorage in useState's initializer — it differs on client vs SSR.
  const [lang, setLang] = React.useState<Lang>('en');

  React.useLayoutEffect(() => {
    setLang(getLang());
  }, []);

  React.useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<Lang>).detail;
      setLang(detail ?? getLang());
    };
    const onStorage = () => setLang(getLang());
    window.addEventListener('lifelink:lang-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('lifelink:lang-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const update = React.useCallback((l: Lang) => {
    setLang(l);
    setLangValue(l);
  }, []);
  return [lang, update];
}

export const LANG_OPTIONS: { id: Lang; label: string; sub: string }[] = [
  { id: 'en', label: 'English',  sub: 'United States' },
  { id: 'zh', label: '简体中文', sub: 'Simplified Chinese' },
];

// ─────────────────────────────────────────────────────────────────────────
// Dictionary
//
// Keys are dot-namespaced by area. Format strings use {var} placeholders that
// get replaced via the second argument of t(). Missing translations fall back
// to English; missing keys fall back to the key itself so untranslated strings
// are visually obvious.
// ─────────────────────────────────────────────────────────────────────────
const DICT: Record<string, Record<Lang, string>> = {
  // ── common / shared ────────────────────────────────────────────────────
  'common.done':           { en: 'Done',           zh: '完成' },
  'common.cancel':         { en: 'Cancel',         zh: '取消' },
  'common.continue':       { en: 'Continue',       zh: '继续' },
  'common.back':           { en: 'Back',           zh: '返回' },
  'common.save':           { en: 'Save',           zh: '保存' },
  'common.next':           { en: 'Next',           zh: '下一步' },
  'common.minutes':        { en: 'min',            zh: '分钟' },
  'common.seconds':        { en: 'sec',            zh: '秒' },
  'common.bpm':            { en: 'bpm',            zh: '次/分' },
  'common.percent':        { en: '%',              zh: '%' },
  'common.signOut':        { en: 'Sign out',       zh: '登出' },
  'common.signIn':         { en: 'Sign in',        zh: '登录' },

  // ── nav / tabs ─────────────────────────────────────────────────────────
  'nav.home':              { en: 'Home',           zh: '首页' },
  'nav.profile':           { en: 'Profile',        zh: '我的' },

  // ── helper flow data (helperFlow.ts) ──────────────────────────────────
  'flow.marcus.name':      { en: 'Marcus · CPR',          zh: 'Marcus · CPR' },
  'flow.marcus.role':      { en: '0.3 mi · CPR Tier 2',   zh: '0.3 英里 · 二级 CPR' },
  'flow.marcus.enRoute':   { en: 'on the way',            zh: '在路上' },
  'flow.marcus.arrived':   { en: 'on scene · CPR',        zh: '已到场 · CPR' },
  'flow.marcus.pending':   { en: 'notified · awaiting accept', zh: '已通知 · 等待接受' },
  'flow.marcus.toast':     { en: 'Marcus accepted',       zh: 'Marcus 已接受' },
  'flow.marcus.toastSub':  { en: 'CPR Tier 2 · ETA 1:40', zh: '二级 CPR · 预计 1:40' },

  'flow.sarah.name':       { en: 'Sarah · AED',           zh: 'Sarah · AED' },
  'flow.sarah.role':       { en: '0.5 mi · bringing AED', zh: '0.5 英里 · 携带 AED' },
  'flow.sarah.enRoute':    { en: 'AED on the way',        zh: 'AED 在路上' },
  'flow.sarah.arrived':    { en: '+AED here',             zh: '+AED 已到' },
  'flow.sarah.pending':    { en: 'notified · awaiting accept', zh: '已通知 · 等待接受' },
  'flow.sarah.toast':      { en: 'Sarah accepted',        zh: 'Sarah 已接受' },
  'flow.sarah.toastSub':   { en: 'Bringing AED · ETA 2:45', zh: '携带 AED · 预计 2:45' },

  'flow.jordan.name':      { en: 'Jordan · CPR',          zh: 'Jordan · CPR' },
  'flow.jordan.role':      { en: '0.8 mi · CPR Tier 1',   zh: '0.8 英里 · 一级 CPR' },
  'flow.jordan.enRoute':   { en: 'declined',              zh: '已拒绝' },
  'flow.jordan.arrived':   { en: '—',                     zh: '—' },
  'flow.jordan.pending':   { en: 'notified',              zh: '已通知' },

  'flow.ems.name':         { en: 'EMS · ambulance',       zh: '急救 · 救护车' },
  'flow.ems.role':         { en: 'ALS unit',              zh: 'ALS 单位' },
  'flow.ems.enRoute':      { en: 'dispatched',            zh: '已派遣' },
  'flow.ems.arrived':      { en: 'on scene · ALS',        zh: '已到场 · ALS' },
  'flow.ems.pending':      { en: 'queueing',              zh: '排队中' },

  // ── HelperToast / BreathingReassess button ────────────────────────────
  'helperToast.onTheWay':       { en: 'ON THE WAY',                zh: '在路上' },
  'cpr.assist.reassess':        { en: 'Patient has started breathing', zh: '患者已恢复呼吸' },

  // ── Helper-flow row state copy ────────────────────────────────────────
  'flow.row.queueing':          { en: 'queueing',                  zh: '排队中' },
  'flow.row.awaitingAlert':     { en: 'awaiting alert',            zh: '等待警报' },
  'flow.row.arriving':          { en: 'arriving',                  zh: '即将到达' },
  'flow.row.pendingTag':        { en: 'PENDING',                   zh: '待定' },
  'flow.row.onSceneTag':        { en: 'ON SCENE',                  zh: '已到场' },
  'flow.row.dash':              { en: '—',                         zh: '—' },
  'flow.row.acceptedSuffix':    { en: '{name} accepted',           zh: '{name} 已接受' },

  // ── role switcher (demo) ───────────────────────────────────────────────
  'demo.switchRole':       { en: 'DEMO · SWITCH ROLE',  zh: '演示 · 切换角色' },
  'demo.role.guest':       { en: 'Guest',          zh: '访客' },
  'demo.role.volunteer':   { en: 'Volunteer',      zh: '志愿者' },
  'demo.role.patient':     { en: 'Patient',        zh: '患者' },
  'demo.role.both':        { en: 'Both',           zh: '同时' },
  'demo.ringVolunteer':    { en: 'RING VOLUNTEER', zh: '呼叫志愿者' },

  // ── home / guest ───────────────────────────────────────────────────────
  'home.guest.brand':      { en: 'LIFELINK',       zh: 'LIFELINK' },
  'home.guest.role':       { en: 'guest',          zh: '访客' },
  'home.guest.start':      { en: 'START',          zh: '紧急' },
  'home.guest.emergency':  { en: 'EMERGENCY',      zh: '呼救' },
  'home.guest.holdHint':   { en: 'HOLD · 1.5s',    zh: '长按 · 1.5 秒' },
  'home.guest.keepHold':   { en: 'KEEP HOLDING',   zh: '保持按住' },
  'home.guest.subtitle':   { en: 'If someone needs help, hold to begin.', zh: '若有人需要帮助，长按开始。' },
  'home.guest.noAccount':  { en: 'No account needed.', zh: '无需账户。' },
  'home.guest.becomeVolunteer':       { en: 'Become a volunteer', zh: '成为志愿者' },
  'home.guest.becomeVolunteerSub':    { en: 'Get alerted when someone nearby needs help', zh: '附近有人需要帮助时获得提醒' },

  // ── home / volunteer ───────────────────────────────────────────────────
  'home.vol.greeting':     { en: 'Hi, Marcus.',    zh: '你好，Marcus。' },
  'home.vol.role':         { en: 'Volunteer · Tier 2 CPR · 240 m radius', zh: '志愿者 · 二级 CPR · 240 米半径' },
  'home.vol.role.both':    { en: 'Volunteer + Patient · Tier 2 CPR · 240 m radius', zh: '志愿者 + 患者 · 二级 CPR · 240 米半径' },
  'home.vol.emergencyCall':{ en: 'EMERGENCY CALL', zh: '紧急呼叫' },
  'home.vol.holdIfHelp':   { en: 'Hold if someone\nneeds help', zh: '若有人需要帮助\n请长按' },
  'home.vol.hold15':       { en: 'HOLD 1.5s',      zh: '长按 1.5 秒' },
  'home.vol.keepHolding':  { en: 'KEEP HOLDING…',  zh: '保持按住…' },
  'home.vol.voice':        { en: 'VOICE: "HEY SIRI, CARDIAC EMERGENCY"', zh: '语音："嗨 Siri，心脏紧急"' },
  'home.vol.stat.responses':  { en: 'responses',   zh: '响应' },
  'home.vol.stat.savedLives': { en: 'lives saved', zh: '挽救生命' },
  'home.vol.stat.avgEta':     { en: 'min avg ETA', zh: '分钟平均到达' },
  'home.vol.onCall':       { en: 'ON CALL',        zh: '待命中' },
  'home.vol.listening':    { en: 'Listening within 240 m', zh: '监听 240 米内' },
  'home.vol.listeningSub': { en: 'Code Red alerts will reach you instantly', zh: 'Code Red 警报将即时送达' },
  'home.vol.patchTitle':   { en: 'Your patch — {bpm} BPM', zh: '你的贴片 — {bpm} 次/分' },
  'home.vol.patchSub':     { en: 'Connected · battery {pct}%', zh: '已连接 · 电量 {pct}%' },

  // ── home / patient ─────────────────────────────────────────────────────
  'home.pat.dateLabel':    { en: 'FRIDAY · 25 APR', zh: '周五 · 4 月 25 日' },
  'home.pat.greeting':     { en: 'Hi, Eleanor.',    zh: '你好，Eleanor。' },
  'home.pat.role':         { en: 'Patient · pacemaker · cardiologist Dr. Patel', zh: '患者 · 起搏器 · 心脏科医生 Patel' },
  'home.pat.patchHeader':  { en: 'YOUR LIFELINE',   zh: '你的生命线' },
  'home.pat.patchTitle':   { en: 'Patch is connected', zh: '贴片已连接' },
  'home.pat.patchSub':     { en: 'Streaming ECG · 72 BPM · battery 88%', zh: '正在传输 ECG · 72 次/分 · 电量 88%' },
  'home.pat.contactsHeader':{ en: 'YOUR CIRCLE',    zh: '你的紧急圈' },
  'home.pat.contactsTitle':{ en: 'Emergency contacts', zh: '紧急联系人' },
  'home.pat.contactsSub':  { en: '3 set up · primary: David', zh: '3 人 · 首选：David' },
  'home.pat.testTitle':    { en: 'Try a test alert', zh: '试试测试警报' },
  'home.pat.testSub':      { en: 'See what your contacts will receive', zh: '查看你的联系人会收到什么' },
  'home.pat.contactsTitle.short': { en: 'Emergency contacts', zh: '紧急联系人' },
  'home.pat.contactsSub.short':   { en: '3 people in call order', zh: '3 人按顺序呼叫' },
  'home.pat.someoneNeeds':        { en: 'SOMEONE ELSE NEEDS HELP?', zh: '其他人需要帮助？' },
  'home.pat.startForThem':        { en: 'Start an emergency for them →', zh: '为他们发起紧急呼救 →' },
  'home.aria.startEmergency':     { en: 'Start emergency — press and hold for 1.5 seconds', zh: '发起紧急 — 按住 1.5 秒' },

  // ── profile / sections ─────────────────────────────────────────────────
  'profile.title':         { en: 'Profile',        zh: '我的' },
  'profile.network':       { en: 'THE NETWORK',    zh: '网络' },
  'profile.network.title': { en: 'Two ways to be\npart of LifeLink.', zh: '加入 LifeLink\n有两种方式。' },
  'profile.network.sub':   { en: 'Set yourself up as a patient, train to respond as a volunteer — or both. Either way, you\'re in the network.', zh: '注册为患者，或培训成为响应志愿者——或两者都做。无论哪种，你都在网络里。' },
  'profile.network.stat.ems': { en: 'avg EMS',     zh: '平均急救' },
  'profile.network.stat.matters': { en: 'matters most', zh: '最关键' },
  'profile.network.stat.survival': { en: 'survival ↑', zh: '存活率 ↑' },
  'profile.whyImHere':     { en: 'WHY I\'M HERE',  zh: '我在这里的原因' },

  'profile.patientPath.title':  { en: 'I have a heart condition', zh: '我有心脏病' },
  'profile.patientPath.sub':    { en: 'Set up so others can help you', zh: '设置好让别人能帮助你' },
  'profile.patientPath.body':   { en: 'Add emergency contacts, medical info, and pair your LifeLink Patch. Your patch streams ECG when something looks wrong.', zh: '添加紧急联系人、医疗信息，并配对 LifeLink 贴片。出现异常时贴片会传输 ECG。' },
  'profile.patientPath.cta':    { en: 'Get started →', zh: '开始 →' },

  'profile.volunteerPath.title':{ en: 'I want to help someone nearby', zh: '我想帮助附近的人' },
  'profile.volunteerPath.sub':  { en: 'Get certified to respond', zh: '获得响应认证' },
  'profile.volunteerPath.body': { en: 'Get alerted when a cardiac arrest happens within 2 miles. ~15 min training + a short exam — once certified, your phone becomes a Code Red receiver.', zh: '2 英里内发生心脏骤停时收到警报。约 15 分钟培训 + 一次简短考试——认证后，你的手机就是 Code Red 接收器。' },
  'profile.volunteerPath.cta':  { en: 'Become a volunteer →', zh: '成为志愿者 →' },

  'profile.bothLater':     { en: 'Both? You can turn on the other later in your profile.', zh: '都想要？之后可以在个人页里开启另一个。' },

  'profile.haveAccount':   { en: 'HAVE AN ACCOUNT?', zh: '已有账户？' },
  'profile.signInSub':     { en: 'Pick up where you left off', zh: '从上次的地方继续' },
  'profile.withoutAccount':{ en: 'WITHOUT AN ACCOUNT', zh: '无需账户' },
  'profile.learnCpr':      { en: 'Learn CPR · 2 min refresher', zh: '学习 CPR · 2 分钟回顾' },
  'profile.privacy':       { en: 'Privacy & data', zh: '隐私与数据' },
  'profile.about':         { en: 'About LifeLink', zh: '关于 LifeLink' },

  'profile.role.volunteer':{ en: 'Volunteer · Tier 2 CPR', zh: '志愿者 · 二级 CPR' },
  'profile.role.patient':  { en: 'Patient · pacemaker (2022)', zh: '患者 · 起搏器（2022）' },

  'profile.stat.responses':{ en: 'RESPONSES',      zh: '响应次数' },
  'profile.stat.saves':    { en: 'SAVES',          zh: '挽救' },
  'profile.stat.accept':   { en: 'ACCEPT',         zh: '接受率' },

  'profile.section.certs': { en: 'CERTIFICATIONS', zh: '认证' },
  'profile.cert.cpr':      { en: 'CPR · BLS',      zh: 'CPR · BLS' },
  'profile.cert.cpr.sub':  { en: 'Renewed Feb 2026', zh: '2026 年 2 月续期' },
  'profile.cert.firstaid': { en: 'First Aid',      zh: '急救' },
  'profile.cert.firstaid.sub': { en: 'Renewed Jan 2026', zh: '2026 年 1 月续期' },
  'profile.cert.aed':      { en: 'AED Operator',   zh: 'AED 操作' },
  'profile.cert.aed.sub':  { en: 'Expires Aug 2026', zh: '2026 年 8 月到期' },

  'profile.section.prefs': { en: 'PREFERENCES',    zh: '偏好' },
  'profile.pref.autoAccept':{ en: 'Auto-accept calls under 1 mi', zh: '1 英里内自动接受' },
  'profile.pref.voice':    { en: 'Voice trigger',  zh: '语音触发' },

  'profile.section.settings': { en: 'SETTINGS',    zh: '设置' },
  'profile.setting.notifications': { en: 'Notifications', zh: '通知' },
  'profile.setting.notifications.allOn': { en: 'All alerts on', zh: '所有警报已开启' },
  'profile.setting.notifications.critical': { en: 'Critical only', zh: '仅关键警报' },
  'profile.setting.privacy':       { en: 'Privacy & data', zh: '隐私与数据' },
  'profile.setting.privacy.share': { en: 'Share location during emergencies', zh: '紧急时共享位置' },
  'profile.setting.privacy.ecg':   { en: 'Share live ECG with cardiologist', zh: '与心脏科医生共享实时 ECG' },
  'profile.setting.account':       { en: 'Account', zh: '账户' },
  'profile.setting.medical':       { en: 'Medical info', zh: '医疗信息' },
  'profile.setting.medical.sub':   { en: 'Allergies, blood type, contacts', zh: '过敏、血型、联系人' },
  'profile.setting.help':          { en: 'Help & support', zh: '帮助与支持' },
  'profile.setting.help.sub':      { en: 'FAQ, contact us', zh: '常见问题、联系我们' },
  'profile.setting.language':      { en: 'Language', zh: '语言' },

  'profile.section.setup':         { en: 'YOUR SETUP', zh: '你的设置' },
  'profile.setup.contacts':        { en: 'Emergency contacts', zh: '紧急联系人' },
  'profile.setup.contacts.sub':    { en: '3 set up · primary: David', zh: '3 人 · 首选：David' },
  'profile.setup.patch':           { en: 'LifeLink Patch', zh: 'LifeLink 贴片' },
  'profile.setup.patch.sub':       { en: 'Connected · 88% battery', zh: '已连接 · 电量 88%' },
  'profile.setup.medical':         { en: 'Medical info', zh: '医疗信息' },
  'profile.setup.medical.sub':     { en: 'HF · arrhythmia · pacemaker', zh: '心衰 · 心律失常 · 起搏器' },

  'profile.addVolunteerMode':      { en: '+ ADD VOLUNTEER MODE', zh: '+ 添加志愿者模式' },
  'profile.addVolunteerMode.body': { en: 'Train + pass exam to also receive Code Red alerts.', zh: '培训并通过考试，也可接收 Code Red 警报。' },
  'profile.addVolunteerMode.cta':  { en: 'Start training', zh: '开始培训' },

  'profile.addPatientMode':        { en: '+ ADD PATIENT MODE', zh: '+ 添加患者模式' },
  'profile.addPatientMode.body':   { en: 'Have a heart condition? Pair a LifeLink Patch and add emergency contacts.', zh: '有心脏疾病？配对 LifeLink 贴片并添加紧急联系人。' },
  'profile.addPatientMode.cta':    { en: 'Set up patient profile', zh: '设置患者档案' },

  // ── language picker ────────────────────────────────────────────────────
  'lang.title':            { en: 'Language',       zh: '语言' },
  'lang.intro':            { en: 'Choose the language LifeLink uses.', zh: '选择 LifeLink 使用的语言。' },

  // ── voice / ElevenLabs (full sentences for TTS; mirror UI language) ───
  'voice.sos.respond.1':   { en: 'Tap their shoulders firmly.', zh: '用力拍打患者的双肩。' },
  'voice.sos.respond.2':   { en: 'Shout: Are you OK?', zh: '大声问：你还好吗？' },
  'voice.sos.respond.3':   { en: 'Look for any movement, sound, or eye opening for up to ten seconds.', zh: '在最多十秒内，观察是否有动作、声音或睁眼。' },
  'voice.sos.respond.4':   { en: 'If they moved, spoke, or opened their eyes, choose they responded. If not, choose no response to continue.', zh: '若他们有动作、开口说话或睁眼，请选择有反应；否则选择无反应以继续。' },

  'voice.sos.breathe.1':   { en: 'Tilt their head back. Watch the chest.', zh: '将头后仰，观察胸部起伏。' },
  'voice.sos.breathe.2':   { en: 'Look, listen, and feel for normal breathing for no more than ten seconds. Gasping is not normal breathing.', zh: '在不超过十秒的时间内，看、听、感受是否有正常呼吸。喘息不算正常呼吸。' },
  'voice.sos.breathe.3':   { en: 'If they are breathing normally, choose that option. If they are not breathing or only gasping, start CPR now.', zh: '若呼吸正常，请选择该选项；若未呼吸或仅有喘息，请立即开始心肺复苏。' },

  'voice.sos.tutorial.1':  { en: 'Before you start compressions, place your hands like this.', zh: '在开始胸外按压之前，请先把双手像这样放好。' },
  'voice.sos.tutorial.2':  { en: 'Put the heel of one hand on the center of the chest, on the lower half of the breastbone.', zh: '将一只手的掌根放在胸部正中央、胸骨下半段。' },
  'voice.sos.tutorial.3':  { en: 'If you have a sensor patch, place it on the spot where you will press.', zh: '如果你有传感器贴片，请把它贴在你将要按压的位置。' },
  'voice.sos.tutorial.4':  { en: 'Stack your other hand on top. Heel of one, palm of the other.', zh: '另一只手叠在上面，一只手掌根、另一只手掌覆盖。' },
  'voice.sos.tutorial.5':  { en: 'Lock your elbows. Keep your arms straight with your shoulders over your hands.', zh: '伸直手臂锁紧手肘，肩膀位于双手正上方。' },
  'voice.sos.tutorial.6':  { en: 'Push about two inches deep using your whole body weight.', zh: '用全身力量向下按压约两英寸深。' },
  'voice.sos.tutorial.7':  { en: 'Push at about one hundred ten beats per minute, roughly twice per second.', zh: '以每分钟约一百一十次按压，大约每秒两次。' },
  'voice.sos.tutorial.8':  { en: 'Let the chest fully come back up between pushes. Do not lean on the chest.', zh: '每次按压之间让胸部完全回弹，不要倚靠在胸部上。' },
  'voice.sos.tutorial.9':  { en: 'When you are ready, tap start CPR.', zh: '准备好后，点击开始心肺复苏。' },

  'voice.cpr.hw.pushHarder': { en: 'Push harder. Use your body weight. Let the chest come all the way up.', zh: '再用力按压。用上全身重量。让胸口完全回弹。' },
  'voice.cpr.hw.easeDeep':   { en: 'Ease up slightly. You are a little too deep.', zh: '稍微轻一点。按压略深了。' },
  'voice.cpr.hw.speedUp':    { en: 'Speed up. Push faster with the beat.', zh: '加快。跟着节拍更快按压。' },
  'voice.cpr.hw.slowDown':   { en: 'Slow down slightly. Stay near one hundred ten beats per minute.', zh: '稍微放慢。保持在每分钟一百一十次左右。' },
  'voice.cpr.hw.keepGoing':  { en: 'Good. Keep going. Stay with the beat.', zh: '很好。继续。跟上节拍。' },

  // ── SOS / shared ──────────────────────────────────────────────────────
  'sos.banner.active':     { en: 'EMERGENCY ACTIVE · {time}', zh: '紧急中 · {time}' },
  'sos.banner.emsHere':    { en: 'EMS HERE ✓',     zh: '急救已到 ✓' },
  'sos.whatYouSee':        { en: 'WHAT DO YOU SEE?', zh: '你看到了什么？' },

  // ── SOS / responsiveness ───────────────────────────────────────────────
  'sos.resp.step':         { en: 'STEP 1 · CHECK · BEFORE WE CALL', zh: '第 1 步 · 检查 · 呼叫之前' },
  'sos.resp.title':        { en: 'Are they\nresponding?', zh: '他们\n有反应吗？' },
  'sos.resp.tap':          { en: 'Tap their shoulders firmly.', zh: '用力拍他们的肩膀。' },
  'sos.resp.shout':        { en: 'Shout:',          zh: '大声喊：' },
  'sos.resp.shoutText':    { en: '"Are you OK?"',   zh: '"你还好吗？"' },
  'sos.resp.lookFor':      { en: 'Look for any movement, sound, or eye opening — for up to 10 seconds.', zh: '观察任何动作、声音或睁眼——最多 10 秒。' },
  'sos.resp.respondedYes': { en: 'They responded',  zh: '有反应' },
  'sos.resp.respondedYes.sub': { en: 'Moved, made a sound, opened eyes', zh: '动了、发出声音或睁眼' },
  'sos.resp.respondedNo':  { en: 'NO RESPONSE',     zh: '无反应' },
  'sos.resp.respondedNo.sub':  { en: 'Continue to breathing check', zh: '继续检查呼吸' },

  // ── SOS / breathing ────────────────────────────────────────────────────
  'sos.breath.step':       { en: 'STEP 2 · CHECK · DISPATCH SENT', zh: '第 2 步 · 检查 · 已派遣' },
  'sos.breath.title':      { en: 'Are they\nbreathing?', zh: '他们\n在呼吸吗？' },
  'sos.breath.tilt':       { en: 'Tilt their head back. Watch the chest.', zh: '抬高头部。观察胸口。' },
  'sos.breath.lookListen': { en: 'Look, listen, and feel for normal breathing — for no more than 10 seconds. Gasping is', zh: '看、听、感受是否有正常呼吸——不超过 10 秒。喘息' },
  'sos.breath.notWord':    { en: 'not',              zh: '不' },
  'sos.breath.notNormal':  { en: 'normal breathing.', zh: '是正常呼吸。' },
  'sos.breath.yes':        { en: 'Breathing normally', zh: '呼吸正常' },
  'sos.breath.yesSub':     { en: 'Recovery position · stay with them', zh: '恢复体位 · 陪在他们身边' },
  'sos.breath.no':         { en: 'NOT BREATHING / GASPING', zh: '未呼吸 / 喘息' },
  'sos.breath.noSub':      { en: 'Start CPR now',    zh: '立即开始 CPR' },

  // ── SOS / dispatch (conscious) ────────────────────────────────────────
  'sos.disp.con.statusLabel': { en: '● RESPONDING · STAY WITH THEM', zh: '● 有反应 · 陪在他们身边' },
  'sos.disp.con.title':       { en: 'Help is still\non its way.', zh: '帮助仍在\n路上。' },
  'sos.disp.con.body':        { en: 'A response doesn\'t mean they\'re safe. EMS is coming — keep them awake and gather info.', zh: '有反应不代表他们安全。急救正在赶来——让他们保持清醒并收集信息。' },
  'sos.disp.con.connecting':  { en: '911 — connecting',  zh: '911 — 接通中' },
  'sos.disp.con.alerted':     { en: '3 helpers alerted', zh: '已通知 3 名响应者' },
  'sos.disp.con.address':     { en: '123 Main St · Westwood', zh: '主街 123 号 · Westwood' },
  'sos.disp.con.whileWait':   { en: 'WHILE YOU WAIT', zh: '等待时' },
  'sos.disp.con.tip1.title':  { en: 'Keep them talking.', zh: '让他们说话。' },
  'sos.disp.con.tip1.sub':    { en: 'Ask their name. Ask what happened.', zh: '问他们的名字。问发生了什么。' },
  'sos.disp.con.tip2.title':  { en: 'Note any symptoms.', zh: '记录任何症状。' },
  'sos.disp.con.tip2.sub':    { en: 'Chest pain · numbness · slurred speech.', zh: '胸痛 · 麻木 · 说话不清。' },
  'sos.disp.con.tip3.title':  { en: 'Don\'t move them.', zh: '不要移动他们。' },
  'sos.disp.con.tip3.sub':    { en: 'Unless they\'re in immediate danger.', zh: '除非他们正处于紧迫危险。' },
  'sos.disp.con.tip4.title':  { en: 'Watch for changes.', zh: '注意变化。' },
  'sos.disp.con.tip4.sub':    { en: 'If they go unresponsive again, tap below.', zh: '如再次无反应，点击下方。' },
  'sos.disp.con.collapsed':   { en: 'THEY COLLAPSED', zh: '他们倒下了' },
  'sos.disp.con.logSymptoms': { en: 'Log symptoms for EMS →', zh: '为急救记录症状 →' },

  // ── SOS / dispatch (unconscious) ──────────────────────────────────────
  'sos.disp.un.statusSent':    { en: '● UNRESPONSIVE · DISPATCH SENT',     zh: '● 无反应 · 已派遣' },
  'sos.disp.un.statusConfirm': { en: '● UNRESPONSIVE · CONFIRM TO DISPATCH', zh: '● 无反应 · 确认派遣' },
  'sos.disp.un.titleSent':     { en: 'Help is coming.\nNow check breathing.', zh: '帮助正在赶来。\n现在检查呼吸。' },
  'sos.disp.un.titleConfirm':  { en: 'Slide to call 911\nand dispatch helpers.', zh: '滑动呼叫 911\n并派遣响应者。' },
  'sos.disp.un.callBoth':      { en: 'Call 911 + alert helpers', zh: '呼叫 911 + 通知响应者' },
  'sos.disp.un.slideHelp':     { en: 'Slide the handle right to dispatch — release to cancel.', zh: '向右滑动手柄以派遣——松开以取消。' },
  'sos.disp.un.slideLabel':    { en: 'Slide to call 911', zh: '滑动呼叫 911' },
  'sos.disp.un.slideConfirmed':{ en: '911 dispatched',    zh: '911 已派遣' },
  'sos.disp.un.connecting':    { en: '911 — connecting',  zh: '911 — 接通中' },
  'sos.disp.un.ringing':       { en: 'RINGING · {time} · location sent', zh: '响铃中 · {time} · 已发送位置' },
  'sos.disp.un.waiting':       { en: '3 nearby helpers waiting', zh: '3 名附近响应者待命' },
  'sos.disp.un.closest':       { en: 'Closest 0.3 mi · AED on the way', zh: '最近 0.3 英里 · AED 在路上' },
  'sos.disp.un.notifying':     { en: 'Notifying nearby helpers…', zh: '正在通知附近响应者…' },
  'sos.disp.un.alertsSending': { en: 'Sending alerts within 2 mi', zh: '正在发送 2 英里内的警报' },
  'sos.disp.un.notifiedOne':   { en: '{n} helper notified',  zh: '已通知 {n} 名响应者' },
  'sos.disp.un.notifiedMany':  { en: '{n} helpers notified', zh: '已通知 {n} 名响应者' },
  'sos.disp.un.waitingAccept': { en: 'Waiting for accept',  zh: '等待接受' },
  'sos.disp.un.onTheWay':      { en: '{name} on the way · {a} of {n} accepted', zh: '{name} 已出发 · {n} 中 {a} 名接受' },
  'sos.disp.un.onScene':       { en: 'on scene', zh: '已到场' },
  'sos.disp.un.eta':           { en: 'ETA {time} · AED on the way', zh: '预计 {time} · AED 在路上' },
  'sos.disp.un.address':       { en: '123 Main St · Westwood Plaza', zh: '主街 123 号 · Westwood Plaza' },
  'sos.disp.un.gps':           { en: 'GPS ±4 m · tap to add floor / room', zh: 'GPS ±4 米 · 点击添加楼层 / 房间' },
  'sos.disp.un.btnNext':       { en: 'CHECK BREATHING →', zh: '检查呼吸 →' },
  'sos.disp.un.btnDisabled':   { en: 'CALL 911 FIRST',   zh: '请先呼叫 911' },

  // ── SOS / recovery ────────────────────────────────────────────────────
  'sos.rec.statusLabel':   { en: '● BREATHING NORMALLY', zh: '● 呼吸正常' },
  'sos.rec.title':         { en: 'Roll them onto\ntheir side.', zh: '将他们\n转向侧面。' },
  'sos.rec.body':          { en: 'This keeps the airway clear while help arrives.', zh: '在帮助到达前保持气道畅通。' },
  'sos.rec.step1':         { en: 'Bend the arm closest to you up by their head.', zh: '将靠近你的手臂弯起到他们头边。' },
  'sos.rec.step2':         { en: 'Pull the far knee up so the foot is flat.', zh: '将远侧的膝盖抬起，脚掌平放。' },
  'sos.rec.step3':         { en: 'Roll them toward you, head on their bent arm.', zh: '将他们朝你翻过来，头枕在弯曲的手臂上。' },
  'sos.rec.step4':         { en: 'Tilt the head back to keep the airway open.', zh: '将头向后仰以保持气道畅通。' },
  'sos.rec.alert':         { en: 'Keep watching their chest. If they stop breathing, we\'ll alert you to start CPR.', zh: '继续观察胸口。若停止呼吸，我们会提示开始 CPR。' },
  'sos.rec.recheck':       { en: 'Re-check', zh: '重新检查' },
  'sos.rec.stayMonitor':   { en: 'Stay & monitor', zh: '陪伴并监测' },
  'sos.rec.ambulanceArrived': { en: 'Ambulance arrived', zh: '救护车已到' },

  // ── SOS / complete ────────────────────────────────────────────────────
  'sos.complete.handedOff':    { en: 'HANDED OFF · {time}', zh: '已交接 · {time}' },
  'sos.complete.statusLabel':  { en: '● HELP HAS ARRIVED', zh: '● 帮助已到' },
  'sos.complete.title':        { en: 'Step back.\nLet them work.', zh: '退后。\n让他们处理。' },
  'sos.complete.body':         { en: 'You did the hardest part. EMS has taken over. Stay nearby in case they need information.', zh: '最难的部分你完成了。急救已接手。留在附近以便提供信息。' },
  'sos.complete.compressions': { en: 'COMPRESSIONS', zh: '按压次数' },
  'sos.complete.inIdealBand':  { en: 'IN IDEAL BAND', zh: '在理想范围' },
  'sos.complete.duration':     { en: 'CPR DURATION', zh: 'CPR 时长' },
  'sos.complete.whatHappened': { en: 'WHAT HAPPENED', zh: '发生了什么' },
  'sos.complete.tl1.label':    { en: 'You triggered the call', zh: '你发起了呼叫' },
  'sos.complete.tl1.sub':      { en: 'Bystander identified unresponsiveness', zh: '旁观者识别到无反应' },
  'sos.complete.tl2.label':    { en: '911 connected · 3 helpers alerted', zh: '911 接通 · 3 名响应者已通知' },
  'sos.complete.tl2.sub':      { en: 'Location and case info sent', zh: '位置与案例信息已发送' },
  'sos.complete.tl3.label':    { en: 'You started CPR', zh: '你开始了 CPR' },
  'sos.complete.tl3.sub':      { en: 'AHA protocol guided', zh: '依据 AHA 协议指导' },
  'sos.complete.tl4.label':    { en: 'Sarah arrived with AED', zh: 'Sarah 携 AED 到达' },
  'sos.complete.tl4.sub':      { en: 'Pads applied · 1 shock advised', zh: '电极片已贴 · 建议电击 1 次' },
  'sos.complete.tl5.label':    { en: 'EMS on scene', zh: '急救已到场' },
  'sos.complete.tl5.sub':      { en: 'ALS team taking over', zh: 'ALS 团队接手' },
  'sos.complete.davidNotified':{ en: 'David Tanaka notified', zh: '已通知 David Tanaka' },
  'sos.complete.davidSub':     { en: 'Primary contact · texting hospital ETA', zh: '首选联系人 · 已发送医院 ETA' },
  'sos.complete.hospital':     { en: 'Ronald Reagan UCLA · ECMO ready', zh: 'Ronald Reagan UCLA · ECMO 待命' },
  'sos.complete.hospitalSub':  { en: 'FHIR R4 bundle sent · cath lab alerted', zh: 'FHIR R4 数据已发送 · 导管室已通知' },
  'sos.complete.youSaved':     { en: 'YOU SAVED A LIFE TODAY.', zh: '你今天救了一条命。' },
  'sos.complete.recruit':      { en: 'Want to be the one alerted next time? Take the 15-min training and you\'ll get notified within 2 mi of any cardiac arrest.', zh: '想成为下次被通知的人？参加 15 分钟培训，2 英里内的心脏骤停你都会收到通知。' },
  'sos.complete.becomeVolunteer':{ en: 'Become a volunteer →', zh: '成为志愿者 →' },
  'sos.complete.done':         { en: 'Done · go home', zh: '完成 · 返回首页' },

  // ── SOS / map ──────────────────────────────────────────────────────────
  'sos.map.title':         { en: 'Nearby help & AED', zh: '附近帮助和 AED' },
  'sos.map.headerSub':     { en: '2 mi radius · {a} of {n} accepted · 4 AEDs', zh: '2 英里半径 · {n} 中 {a} 名接受 · 4 个 AED' },
  'sos.map.sheetWithScene':{ en: '{onScene} ON SCENE · {enRoute} ON THE WAY', zh: '{onScene} 已到场 · {enRoute} 在路上' },
  'sos.map.sheetEnRoute':  { en: '{enRoute} ON THE WAY', zh: '{enRoute} 在路上' },
  'sos.map.liveResponders':{ en: 'Live responders', zh: '实时响应者' },
  'sos.map.etaPrefix':     { en: 'ETA',           zh: '预计' },
  'sos.map.onScene':       { en: 'ON SCENE',      zh: '已到场' },
  'sos.map.openCpr':       { en: 'Open CPR guide →', zh: '打开 CPR 指南 →' },

  // ── CPR / tutorial ────────────────────────────────────────────────────
  'cpr.tut.beforeYouStart':{ en: 'BEFORE YOU START', zh: '开始之前' },
  'cpr.tut.title':         { en: 'Place your hands\nlike this.', zh: '把双手\n这样放置。' },
  'cpr.tut.center':        { en: '① CENTER OF CHEST', zh: '① 胸部中央' },
  'cpr.tut.center.sub':    { en: 'Lower half of breastbone', zh: '胸骨下半段' },
  'cpr.tut.center.alt':    { en: 'Hands placed on the lower half of the breastbone', zh: '双手放在胸骨下半段' },
  'cpr.tut.stack':         { en: '② STACK YOUR HANDS', zh: '② 双手叠放' },
  'cpr.tut.stack.sub':     { en: 'Heel of one, palm of the other', zh: '一只手掌根，另一只手掌覆盖其上' },
  'cpr.tut.stack.alt':     { en: 'Stacking the heel of one hand on top of the other', zh: '一只手掌根叠放在另一只手上' },
  'cpr.tut.tip1.t':        { en: 'Lock your elbows.', zh: '锁紧手肘。' },
  'cpr.tut.tip1.s':        { en: 'Arms straight, shoulders over hands.', zh: '手臂伸直，肩膀在手上方。' },
  'cpr.tut.tip2.t':        { en: 'Push 2 inches deep.', zh: '按压 5 厘米深。' },
  'cpr.tut.tip2.s':        { en: 'Use your whole body weight.', zh: '使用全身重量。' },
  'cpr.tut.tip3.t':        { en: 'Push at 110 / minute.', zh: '每分钟 110 次。' },
  'cpr.tut.tip3.s':        { en: 'About twice per second.', zh: '每秒约两次。' },
  'cpr.tut.tip4.t':        { en: 'Let chest fully recoil.', zh: '让胸口完全回弹。' },
  'cpr.tut.tip4.s':        { en: 'Don\'t lean between pushes.', zh: '按压之间不要倚靠。' },
  'cpr.tut.skip':          { en: 'Skip', zh: '跳过' },
  'cpr.tut.ready':         { en: 'I\'M READY · START CPR', zh: '我准备好了 · 开始 CPR' },
  'cpr.tut.sensorHint':    { en: 'Put the sensor on the place you\'ll press, if you have one.', zh: '若有传感器，请放在你将要按压的位置。' },
  'cpr.tut.demoProfileErr':{ en: 'Demo profile · Arduino sketch needs reflash for live data', zh: '演示档案 · 需要重新烧录 Arduino 才能接收实时数据' },

  // ── CPR / assist ──────────────────────────────────────────────────────
  'cpr.assist.push':       { en: 'PUSH', zh: '按压' },
  'cpr.assist.breathe':    { en: 'BREATHE', zh: '人工呼吸' },
  'cpr.assist.cycles':     { en: 'cycles', zh: '组' },
  'cpr.assist.compressions': { en: 'compressions', zh: '次按压' },
  'cpr.assist.cue.push1':    { en: '"Push hard. Push fast."', zh: '"用力按。快速按。"' },
  'cpr.assist.cue.push2':    { en: '"Center of the chest."', zh: '"胸部中央。"' },
  'cpr.assist.cue.push3':    { en: '"Twice per second."', zh: '"每秒两次。"' },
  'cpr.assist.cue.push4':    { en: '"Use your body weight."', zh: '"用身体的重量。"' },
  'cpr.assist.cue.push5':    { en: '"Don\'t stop pushing."', zh: '"不要停。"' },
  'cpr.assist.cue.push6':    { en: '"Stay strong — keep the rhythm."', zh: '"坚持——保持节奏。"' },
  'cpr.assist.cue.breath1':  { en: '"Tilt the head back. Pinch the nose."', zh: '"头向后仰。捏住鼻子。"' },
  'cpr.assist.cue.breath2':  { en: '"Two slow breaths — watch the chest rise."', zh: '"两次缓慢的吹气——看胸口起伏。"' },
  'cpr.assist.cue.breath3':  { en: '"Seal your mouth over theirs. Blow gently."', zh: '"用嘴包住他们的嘴。轻轻吹气。"' },
  'cpr.assist.cue.depthOk1': { en: '"Good depth. Keep going."', zh: '"深度合适。继续。"' },
  'cpr.assist.cue.depthOk2': { en: '"Solid rhythm — hold that depth."', zh: '"节奏稳定——保持深度。"' },
  'cpr.assist.cue.depthOk3': { en: '"You\'re right in the band."', zh: '"恰好在范围内。"' },
  'cpr.assist.cue.depthOk4': { en: '"Strong compressions — don\'t stop."', zh: '"按压强劲——不要停。"' },

  // ── helper / code red ─────────────────────────────────────────────────
  'helper.cr.case':        { en: 'CARDIAC ARREST · CASE #4471', zh: '心脏骤停 · 案例 #4471' },
  'helper.cr.title':       { en: 'Code\nRed.', zh: 'Code\nRed.' },
  'helper.cr.patient':     { en: 'PATIENT', zh: '患者' },
  'helper.cr.patient.name':{ en: 'Eleanor T., 67', zh: 'Eleanor T.，67 岁' },
  'helper.cr.patient.cond':{ en: 'HF · arrhythmia · pacemaker (2022)', zh: '心衰 · 心律失常 · 起搏器（2022）' },
  'helper.cr.lbl.distance':{ en: 'DISTANCE', zh: '距离' },
  'helper.cr.lbl.eta':     { en: 'ETA', zh: '预计到达' },
  'helper.cr.lbl.aed':     { en: 'AED', zh: 'AED' },
  'helper.cr.aed.onTheWay':{ en: 'on the way', zh: '在路上' },
  'helper.cr.autopass':    { en: 'AUTO-PASS IN', zh: '自动放弃倒计时' },
  'helper.cr.accept':      { en: 'ACCEPT', zh: '接受' },
  'helper.cr.decline':     { en: 'DECLINE', zh: '拒绝' },

  // ── helper / pickup-aed ───────────────────────────────────────────────
  'helper.pa.cancel':      { en: 'Cancel',         zh: '取消' },
  'helper.pa.status':      { en: '● ON THE WAY · STOP 1/2', zh: '● 前往中 · 第 1/2 站' },
  'helper.pa.title':       { en: 'Pickup AED · 7-Eleven', zh: '取 AED · 7-Eleven' },
  'helper.pa.nextTurn':    { en: 'NEXT TURN · 40 m', zh: '下个路口 · 40 米' },
  'helper.pa.turnInst':    { en: 'Right onto Olympic Blvd', zh: '右转上 Olympic 大道' },
  'helper.pa.lbl.eta':     { en: 'ETA',            zh: '预计到达' },
  'helper.pa.lbl.dist':    { en: 'DIST',           zh: '距离' },
  'helper.pa.lbl.others':  { en: 'OTHERS',         zh: '其他' },
  'helper.pa.chip.alex':   { en: 'Alex · direct',  zh: 'Alex · 直达' },
  'helper.pa.chip.sarah':  { en: 'Sarah · AED',    zh: 'Sarah · AED' },
  'helper.pa.callHint':    { en: '· tap ☎ to call Eleanor — others can join', zh: '· 点 ☎ 呼叫 Eleanor——其他人可加入' },
  'helper.pa.skipAed':     { en: 'Skip AED, go direct', zh: '跳过 AED，直接前往' },

  // ── helper / direct ───────────────────────────────────────────────────
  'helper.dir.status':     { en: '● DIRECT TO PATIENT · AED SKIPPED', zh: '● 直达患者 · 已跳过 AED' },
  'helper.dir.title':      { en: 'Eleanor T. · 67 · pacemaker', zh: 'Eleanor T. · 67 岁 · 起搏器' },
  'helper.dir.nextTurn':   { en: 'NEXT TURN · 60 m', zh: '下个路口 · 60 米' },
  'helper.dir.turnInst':   { en: 'Left onto 4th Street', zh: '左转上第 4 街' },
  'helper.dir.callHint':   { en: '· tap ☎ to call Eleanor — Sarah still bringing AED', zh: '· 点 ☎ 呼叫 Eleanor——Sarah 仍在送 AED' },
  'helper.dir.arrived':    { en: 'I\'ve arrived · Start CPR', zh: '我已到达 · 开始 CPR' },

  // ── patient / contacts ────────────────────────────────────────────────
  'pat.contacts.title':    { en: 'Emergency contacts', zh: '紧急联系人' },
  'pat.contacts.banner':   { en: 'If you collapse, we\'ll call these people', zh: '若你倒下，我们会按顺序联系这些人' },
  'pat.contacts.bannerSub':{ en: 'in this order, until someone answers.', zh: '直到有人接听。' },
  'pat.contacts.callOrder':{ en: 'CALL ORDER',     zh: '呼叫顺序' },
  'pat.contacts.role.husband':    { en: 'Husband · primary', zh: '丈夫 · 首选' },
  'pat.contacts.role.daughter':   { en: 'Daughter',          zh: '女儿' },
  'pat.contacts.role.cardio':     { en: 'Cardiologist',      zh: '心脏科医生' },
  'pat.contacts.share':    { en: 'Share live ECG with cardiologist', zh: '与心脏科医生共享实时 ECG' },
  'pat.contacts.shareSub': { en: 'Only during an active emergency', zh: '仅在紧急中' },
  'pat.contacts.cta':      { en: 'Pair your patch', zh: '配对你的贴片' },

  // ── patient / hardware ────────────────────────────────────────────────
  'pat.hw.title':          { en: 'LifeLink Hardware', zh: 'LifeLink 硬件' },
  'pat.hw.heartBeat':      { en: 'HEART BEAT',     zh: '心跳' },
  'pat.hw.patchHeader':    { en: 'YOUR PATCH',     zh: '你的贴片' },
  'pat.hw.patchBody':      { en: 'Adhesive CPR assist patch. Stays on the chest so a helper can apply chest compressions in the right spot during an emergency.', zh: '粘贴式 CPR 辅助贴片。贴在胸口，紧急时帮助者可以在正确位置进行胸外按压。' },
  'pat.hw.where':          { en: 'WHERE TO STICK IT', zh: '贴在哪里' },
  'pat.hw.where.location': { en: 'Lower-left chest', zh: '左下胸部' },
  'pat.hw.where.body':     { en: 'Below the breast, slightly toward the side. Skin must be clean & dry.', zh: '乳房下方，略偏侧面。皮肤必须清洁干燥。' },
  'pat.hw.where.video':    { en: 'Watch 30s video', zh: '观看 30 秒视频' },
  'pat.hw.row.lastUsage':  { en: 'Last usage',     zh: '上次使用' },
  'pat.hw.row.lastUsage.val': { en: '12 Apr · CPR drill · 2 min', zh: '4 月 12 日 · CPR 演练 · 2 分钟' },
  'pat.hw.row.watchBatt':  { en: 'Apple Watch battery', zh: 'Apple Watch 电量' },
  'pat.hw.row.watchBatt.notConnected': { en: 'Not connected', zh: '未连接' },
  'pat.hw.row.adhesive':   { en: 'Adhesive',       zh: '粘性' },
  'pat.hw.row.adhesive.val':{ en: 'Replace in 4 days', zh: '4 天后更换' },
  'pat.hw.row.firmware':   { en: 'Firmware',       zh: '固件' },
  'pat.hw.row.firmware.val':{ en: 'Up to date',    zh: '已是最新' },

  // ── call screen ───────────────────────────────────────────────────────
  'call.calling':          { en: 'CALLING…',       zh: '呼叫中…' },
  'call.connected':        { en: 'CONNECTED · {time}', zh: '已接通 · {time}' },
  'call.group':            { en: 'GROUP CALL · {time}', zh: '群组通话 · {time}' },
  'call.eleanor':          { en: 'Eleanor T.',     zh: 'Eleanor T.' },
  'call.eleanor.sub':      { en: '67 · pacemaker', zh: '67 岁 · 起搏器' },
  'call.openHint':         { en: 'Group is open · Alex and Sarah can join', zh: '群组已开启 · Alex 和 Sarah 可加入' },
  'call.you':              { en: 'You',            zh: '我' },
  'call.alex':             { en: 'Alex',           zh: 'Alex' },
  'call.sarah':            { en: 'Sarah',          zh: 'Sarah' },
  'call.role.you':         { en: 'Marcus',         zh: 'Marcus' },
  'call.role.alex':        { en: 'direct route',   zh: '直达路线' },
  'call.role.sarah':       { en: 'with AED',       zh: '携带 AED' },
  'call.inCall':           { en: 'in call',        zh: '通话中' },
  'call.joining':          { en: 'joining…',       zh: '加入中…' },
  'call.aria.minimize':    { en: 'Minimize call to floating window', zh: '将通话缩小为悬浮窗' },
  'call.aria.mute':        { en: 'Mute',           zh: '静音' },
  'call.aria.end':         { en: 'End call',       zh: '挂断' },
  'call.aria.speaker':     { en: 'Speaker',        zh: '扬声器' },

  // ── CPR / assist · patch banner ───────────────────────────────────────
  'cpr.assist.patch.offline':       { en: 'PATCH OFFLINE · PLUG IN TO CONNECT', zh: '贴片离线 · 插入以连接' },
  'cpr.assist.patch.unsupported':   { en: 'WEB SERIAL UNSUPPORTED',             zh: '不支持 Web Serial' },
  'cpr.assist.patch.connecting':    { en: 'PATCH CONNECTING…',                  zh: '贴片连接中…' },
  'cpr.assist.patch.readyTap':      { en: 'PATCH READY · TAP TO VIEW {name}',   zh: '贴片就绪 · 点击查看 {name}' },
  'cpr.assist.patch.readyTapDemo':  { en: 'PATCH READY · TAP TO VIEW {name} · DEMO', zh: '贴片就绪 · 点击查看 {name} · 演示' },
  'cpr.assist.patch.readyTap.fallbackName': { en: 'PROFILE',                    zh: '档案' },
  'cpr.assist.patch.streaming':     { en: 'PATCH STREAMING · LOADING PROFILE… ({n})', zh: '贴片传输中 · 加载档案… ({n})' },
  'cpr.assist.patch.waiting':       { en: 'PATCH WAITING FOR DATA',             zh: '贴片等待数据中' },
  'cpr.assist.patch.demoSyncErr':   { en: 'Demo profile · Arduino sketch needs reflash for live data', zh: '演示档案 · Arduino 程序需重刷以获取实时数据' },

  // ── CPR / assist · header / stats ─────────────────────────────────────
  'cpr.assist.cycleTag':            { en: '● CPR · CYCLE {n}',                  zh: '● CPR · 第 {n} 组' },
  'cpr.assist.stat.compressions':   { en: 'COMPRESSIONS',                       zh: '按压次数' },
  'cpr.assist.stat.compressions.sub': { en: 'since you started',                zh: '自开始以来' },
  'cpr.assist.stat.cycles':         { en: 'CYCLES',                             zh: '循环' },
  'cpr.assist.stat.cycles.sub':     { en: '30:2 completed',                     zh: '已完成 30:2' },
  'cpr.assist.stat.rate':           { en: 'RATE',                               zh: '频率' },
  'cpr.assist.stat.rate.sub':       { en: 'bpm target',                         zh: '次/分目标' },
  'cpr.assist.stat.recoil':         { en: 'RECOIL',                             zh: '回弹' },
  'cpr.assist.stat.recoil.sub':     { en: 'let go fully',                       zh: '完全松开' },
  'cpr.assist.stat.count':          { en: 'COUNT',                              zh: '计数' },
  'cpr.assist.stat.count.sub':      { en: 'sensor live',                        zh: '传感器实时' },
  'cpr.assist.stat.bpmStatus.building': { en: 'bpm · building rate…',           zh: '次/分 · 计算中…' },
  'cpr.assist.stat.bpmStatus.ok':       { en: 'bpm · ok',                       zh: '次/分 · 正常' },
  'cpr.assist.stat.bpmStatus.tooSlow':  { en: 'bpm · too slow',                 zh: '次/分 · 过慢' },
  'cpr.assist.stat.bpmStatus.tooFast':  { en: 'bpm · too fast',                 zh: '次/分 · 过快' },

  // ── CPR / assist · phase ring + depth bar ─────────────────────────────
  'cpr.assist.ring.tiltPinch':      { en: 'tilt head · pinch nose',             zh: '抬头 · 捏鼻' },
  'cpr.assist.depth.title':         { en: 'COMPRESSION DEPTH',                  zh: '按压深度' },
  'cpr.assist.depth.target':        { en: 'TARGET 5.0–6.0 cm',                  zh: '目标 5.0–6.0 厘米' },
  'cpr.assist.depth.soft':          { en: 'SOFT',                               zh: '过浅' },
  'cpr.assist.depth.ideal':         { en: 'IDEAL',                              zh: '理想' },
  'cpr.assist.depth.hard':          { en: 'HARD',                               zh: '过深' },
  'cpr.assist.depth.cuePushHarder': { en: '"Push harder · {d} cm. Use your body weight."', zh: '"再用力些 · {d} 厘米。用上身体重量。"' },
  'cpr.assist.depth.cueEaseUp':     { en: '"Ease up — {d} cm is too deep."',    zh: '"轻一点——{d} 厘米过深。"' },

  // ── Apple Watch card ──────────────────────────────────────────────────
  'aw.status.connecting':       { en: 'CONNECTING…',                  zh: '连接中…' },
  'aw.status.live':             { en: 'APPLE WATCH · LIVE',           zh: 'APPLE WATCH · 实时' },
  'aw.status.disconnected':     { en: 'APPLE WATCH · LOST CONNECTION', zh: 'APPLE WATCH · 连接已断' },
  'aw.status.error':            { en: 'APPLE WATCH · ERROR',          zh: 'APPLE WATCH · 错误' },
  'aw.status.idle':             { en: 'APPLE WATCH',                  zh: 'APPLE WATCH' },
  'aw.bpm':                     { en: 'BPM',                          zh: '次/分' },
  'aw.live.from':               { en: 'Live from {device}',           zh: '来自 {device} 的实时数据' },
  'aw.live.fromYour':           { en: 'Live from your Apple Watch',   zh: '来自你的 Apple Watch' },
  'aw.deviceFallback':          { en: 'Apple Watch',                  zh: 'Apple Watch' },
  'aw.action.disconnect':       { en: 'Disconnect',                   zh: '断开' },
  'aw.action.pairing':          { en: 'Pairing your Apple Watch…',    zh: '正在配对你的 Apple Watch…' },
  'aw.action.tapToStart':       { en: 'Tap to start streaming',       zh: '点击开始传输' },
  'aw.action.connect':          { en: 'Connect Apple Watch',          zh: '连接 Apple Watch' },
  'aw.idle.title':              { en: 'Heart beat from your Apple Watch', zh: '来自你 Apple Watch 的心跳' },
  'aw.idle.sub':                { en: 'Pair your watch to stream a live reading.', zh: '配对手表以接收实时读数。' },
  'aw.idle.connecting.title':   { en: 'Looking for your watch…',      zh: '正在寻找你的手表…' },
  'aw.idle.connecting.sub':     { en: 'Pick the right device in the system chooser.', zh: '在系统选择器中选择正确的设备。' },
  'aw.idle.disconnected.title': { en: 'Watch disconnected',           zh: '手表已断开' },
  'aw.idle.disconnected.sub':   { en: 'Reconnect to resume the live reading.', zh: '重新连接以恢复实时读数。' },
  'aw.idle.error.title':        { en: 'Couldn’t connect',        zh: '无法连接' },
  'aw.idle.error.sub':          { en: 'Something went wrong while pairing.', zh: '配对时出错。' },

  // ── CPR / shared (toolbar + mini-live) ────────────────────────────────
  'cpr.shared.beatOn':          { en: 'BEAT ON',                      zh: '节拍开' },
  'cpr.shared.beatOff':         { en: 'BEAT OFF',                     zh: '节拍关' },
  'cpr.shared.heyLifeLink':     { en: 'HEY LIFELINK',                 zh: '嘿 LIFELINK' },
  'cpr.shared.listening':       { en: 'LISTENING…',                   zh: '聆听中…' },
  'cpr.shared.onCall':          { en: 'ON CALL',                      zh: '通话中' },
  'cpr.shared.joinCall':        { en: 'JOIN CALL',                    zh: '加入通话' },
  'cpr.shared.muted':           { en: 'MUTED',                        zh: '已静音' },
  'cpr.shared.mute':            { en: 'MUTE',                         zh: '静音' },
  'cpr.shared.aria.unmute':     { en: 'Unmute',                       zh: '取消静音' },
  'cpr.shared.aria.mute':       { en: 'Mute',                         zh: '静音' },
  'cpr.shared.mini.onScene':    { en: 'HELPER ON SCENE',              zh: '响应者已到场' },
  'cpr.shared.mini.alerting':   { en: 'ALERTING NEARBY HELPERS',      zh: '正在通知附近响应者' },
  'cpr.shared.mini.coming':     { en: 'HELP IS COMING',               zh: '帮助正在赶来' },
  'cpr.shared.mini.tapExpand':  { en: 'TAP TO EXPAND ↗',              zh: '点击展开 ↗' },

  // ── Patient profile sheet ─────────────────────────────────────────────
  'cpr.profile.aria':           { en: 'Patient profile loaded from LifeLink Patch', zh: '从 LifeLink 贴片读取的患者档案' },
  'cpr.profile.loaded':         { en: 'PATCH PROFILE LOADED',         zh: '贴片档案已加载' },
  'cpr.profile.syncErr':        { en: 'local — backend sync failed',  zh: '本地 — 后端同步失败' },
  'cpr.profile.syncedAt':       { en: 'Synced to LifeLink server · {time}', zh: '已同步至 LifeLink 服务器 · {time}' },
  'cpr.profile.reading':        { en: 'Reading from patch…',          zh: '正在从贴片读取…' },
  'cpr.profile.unknown':        { en: 'Unknown patient',              zh: '未知患者' },
  'cpr.profile.dob':            { en: 'DOB {dob}',                    zh: '出生日期 {dob}' },
  'cpr.profile.field.bloodType':{ en: 'BLOOD TYPE',                   zh: '血型' },
  'cpr.profile.field.allergies':{ en: 'ALLERGIES',                    zh: '过敏' },
  'cpr.profile.field.conditions':{ en: 'CONDITIONS',                  zh: '健康状况' },
  'cpr.profile.field.medications':{ en: 'MEDICATIONS',                zh: '药物' },
  'cpr.profile.field.emergency':{ en: 'EMERGENCY CONTACT',            zh: '紧急联系人' },
  'cpr.profile.field.physician':{ en: 'PHYSICIAN',                    zh: '主治医生' },
  'cpr.profile.field.notes':    { en: 'NOTES',                        zh: '备注' },
  'cpr.profile.dash':           { en: '—',                            zh: '—' },
  'cpr.profile.gotIt':          { en: 'Got it · start CPR →',         zh: '了解 · 开始 CPR →' },
};

// ─────────────────────────────────────────────────────────────────────────
export function t(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let str = entry ? (entry[lang] ?? entry.en ?? key) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export function useT(): { t: (key: string, vars?: Record<string, string | number>) => string; lang: Lang } {
  const [lang] = useLang();
  const tr = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => t(key, lang, vars),
    [lang],
  );
  return { t: tr, lang };
}
