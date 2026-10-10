'use strict';
/* =====================================================================
   StudyMatch – front-end prototype (plain HTML + CSS + JS)
   ---------------------------------------------------------------------
   IMPORTANT: this is a PROTOTYPE. Everything is stored in this browser's
   localStorage. There is no server, so:
   - accounts are local to this browser (no Google/GitHub/phone sign-in)
   - the other students, groups, sessions and posts are labelled DEMO data
   - the assistant is a rule-based helper, not an AI model
   See README.txt for what a production version would need.
   ===================================================================== */

/* ---------- configuration ---------- */
const KEY = 'studymatch_prototype_v1';
// Initial, tunable weights (not scientifically validated). Sum = 100.
const WEIGHTS = { complement: 40, goal: 20, relevance: 15, schedule: 10, format: 10, context: 5 };
const LEVELS = ['Beginner', 'Needs improvement', 'Intermediate', 'Good', 'Strong'];
const SUBJECTS = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Python', 'Data Structures', 'Statistics', 'History', 'Economics'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['Morning', 'Afternoon', 'Evening'];
const POST_TYPES = {
  help: 'Ask for help', offer: 'Offer help', partner: 'Find a study partner', group: 'Study group invite',
  session: 'Study session', achievement: 'Learning achievement', resource: 'Study resource'
};
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';

/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const nowISO = () => new Date().toISOString();
const clone = o => JSON.parse(JSON.stringify(o));
const fmtDT = iso => new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtD = iso => new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24); return d < 30 ? d + ' d ago' : fmtD(iso);
}
const toLocalInput = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const colorFor = s => `hsl(${[...String(s)].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360} 45% 38%)`;
const initials = n => String(n || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const avatar = (u, cls = '') => `<span class="avatar ${cls}" style="background:${colorFor(u?.id || u?.name)}" aria-hidden="true">${esc(initials(u?.name))}</span>`;
const chips = (arr, cls = '') => (arr || []).map(x => `<span class="chip ${cls}">${esc(x)}</span>`).join('');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  match: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.5 3.5 5.7"/>',
  group: '<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M2 20c0-3 2.7-5 6-5s6 2 6 5M15 15.3c3-.6 7 .7 7 4.7"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  save: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  thumb: '<path d="M7 11v9H3v-9zM7 11l4-8c1.5 0 2.5 1 2.5 2.5V9H19a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- seed (DEMO) data ---------- */
function seed() {
  const at = (days, h) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  const hrs = h => new Date(Date.now() - h * 3600000).toISOString();
  const D = (id, name, college, dept, year, subs, prefs, bio) => ({
    id, demo: true, name, college, dept, course: dept, year, bio, location: '', onboarded: true,
    subjects: subs.map(([n, level, improve, note]) => ({ name: n, level, improve: !!improve, note: note || '' })),
    results: [], prefs: Object.assign({ size: '3-5', language: 'English', goals: '' }, prefs),
    privacy: { profile: 'public', college: true, location: false, subjects: true, availability: true, marks: false, contact: false },
    notif: { inapp: true, reminders: true }
  });
  const users = [
    D('d1', 'Priya Raman', 'Riverside College', 'Computer Science', 'Year 2', [['Mathematics', 5, 0, 'Happy to explain calculus step by step'], ['Statistics', 4], ['English', 2, 1, 'Essay structure and grammar']], { format: 'one-to-one', mode: 'online', days: ['Mon', 'Wed', 'Sat'], times: ['Evening'] }, 'Second-year CS student who loves maths.'),
    D('d2', 'Marcus Lee', 'Riverside College', 'Physics', 'Year 2', [['Physics', 5], ['Mathematics', 4], ['Chemistry', 2, 1, 'Organic reactions']], { format: 'both', mode: 'both', days: ['Tue', 'Thu', 'Sat'], times: ['Evening', 'Afternoon'] }, 'Physics major, always up for a problem set.'),
    D('d3', 'Aisha Khan', 'Northfield University', 'English Literature', 'Year 1', [['English', 5, 0, 'Essay writing and critical reading'], ['History', 4], ['Mathematics', 2, 1, 'Algebra basics']], { format: 'one-to-one', mode: 'online', days: ['Mon', 'Fri', 'Sun'], times: ['Morning', 'Evening'] }, 'Reading, writing and slowly getting better at maths.'),
    D('d4', 'Tom Becker', 'Riverside College', 'Computer Science', 'Year 3', [['Python', 5], ['Data Structures', 2, 1, 'Trees and graphs'], ['Mathematics', 3]], { format: 'group', mode: 'both', days: ['Wed', 'Sat'], times: ['Evening'] }, 'Python tutor wanting to level up on algorithms.'),
    D('d5', 'Lena Ortiz', 'Northfield University', 'Computer Science', 'Year 2', [['Data Structures', 5], ['Python', 2, 1, 'Writing clean Python'], ['Statistics', 3]], { format: 'both', mode: 'online', days: ['Sat', 'Sun', 'Wed'], times: ['Evening', 'Morning'] }, 'Algorithms nerd, learning Python properly.'),
    D('d6', 'Samir Patel', 'Riverside College', 'Chemistry', 'Year 2', [['Chemistry', 5], ['Biology', 4], ['Physics', 2, 1, 'Mechanics'], ['Economics', 3]], { format: 'group', mode: 'in-person', days: ['Tue', 'Thu'], times: ['Afternoon'] }, 'Lab-rat who needs a physics buddy.')
  ];
  const groups = [
    { id: 'g1', demo: true, name: 'Calculus Crew', subject: 'Mathematics', topic: 'Integration techniques', desc: 'Weekly problem-solving for first and second-year calculus.', goals: 'Finish past papers together.', max: 6, mode: 'online', language: 'English', college: 'Riverside College', level: 'Year 1-2', days: ['Sat'], approval: 'open', owner: 'd1', members: ['d1', 'd2'], pending: [], invited: [], link: 'https://meet.example.com/calculus-crew', created: hrs(90) },
    { id: 'g2', demo: true, name: 'Physics Weekend Review', subject: 'Physics', topic: 'Mechanics', desc: 'Revision sessions before the mechanics midterm.', goals: 'Cover all chapters at least once.', max: 5, mode: 'in-person', language: 'English', college: 'Riverside College', level: 'Year 2', days: ['Sat', 'Sun'], approval: 'request', owner: 'd2', members: ['d2', 'd6'], pending: [], invited: [], link: 'Library, study room 3', created: hrs(70) },
    { id: 'g3', demo: true, name: 'Python & Data Structures Practice', subject: 'Data Structures', topic: 'Trees and graphs', desc: 'Practice problems and mock interviews.', goals: 'Solve 20 problems together.', max: 4, mode: 'online', language: 'English', college: 'Riverside College', level: 'Year 2-3', days: ['Wed', 'Sat'], approval: 'open', owner: 'd4', members: ['d4', 'd5'], pending: [], invited: [], link: 'https://meet.example.com/py-ds', created: hrs(50) },
    { id: 'g4', demo: true, name: 'English Writing Circle', subject: 'English', topic: 'Essay feedback', desc: 'Small invite-only group for peer essay feedback.', goals: 'Improve essay structure.', max: 4, mode: 'online', language: 'English', college: 'Northfield University', level: 'Year 1', days: ['Mon', 'Fri'], approval: 'invite', owner: 'd3', members: ['d3'], pending: [], invited: [], link: 'https://meet.example.com/writing', created: hrs(30) }
  ];
  const sessions = [
    { id: 's1', demo: true, title: 'Integration practice', subject: 'Mathematics', topics: 'Substitution, by parts', desc: 'Work through 10 integrals.', start: at(2, 18), tz: TZ, duration: 60, mode: 'online', link: 'https://meet.example.com/calculus-crew', groupId: 'g1', max: 6, objectives: 'Finish 10 integrals', organizer: 'd1', participants: ['d1', 'd2'], status: 'scheduled', outcomes: {}, created: hrs(40) },
    { id: 's2', demo: true, title: 'Mechanics revision', subject: 'Physics', topics: 'Forces, energy', desc: 'Revise forces and energy.', start: at(4, 15), tz: TZ, duration: 90, mode: 'in-person', link: 'Library, study room 3', groupId: 'g2', max: 5, objectives: 'Review chapters 1-4', organizer: 'd2', participants: ['d2', 'd6'], status: 'scheduled', outcomes: {}, created: hrs(35) },
    { id: 's3', demo: true, title: 'Pair practice: trees', subject: 'Data Structures', topics: 'BST, traversal', desc: 'Solve tree problems together.', start: at(3, 19), tz: TZ, duration: 60, mode: 'online', link: 'https://meet.example.com/py-ds', groupId: 'g3', max: 4, objectives: 'Solve 5 tree problems', organizer: 'd4', participants: ['d4', 'd5'], status: 'scheduled', outcomes: {}, created: hrs(20) }
  ];
  const post = (id, type, title, desc, subjects, author, h, extra = {}) => Object.assign({ id, demo: true, type, title, desc, subjects, author, created: hrs(h), likes: [], saves: [], comments: [], reports: [] }, extra);
  const posts = [
    post('p1', 'partner', 'Maths helper wanted? I can offer help in return', 'Strong in Mathematics. Looking for a partner who can help me improve my English essays.', ['Mathematics', 'English'], 'd1', 3),
    post('p2', 'offer', 'Offering English essay feedback', 'Can review essay structure and grammar. Looking for help with algebra basics.', ['English', 'Mathematics'], 'd3', 6),
    post('p3', 'group', 'Join our Python & Data Structures practice group', 'Two spots left. We meet Wednesday and Saturday evenings.', ['Data Structures', 'Python'], 'd4', 12, { groupId: 'g3' }),
    post('p4', 'session', 'Mechanics revision this week', 'Open to anyone in the Physics Weekend Review group.', ['Physics'], 'd2', 18, { sessionId: 's2' }),
    post('p5', 'resource', 'Free statistics cheat sheet', 'I put together a one-page summary of common distributions. Ask me and I will share it.', ['Statistics'], 'd5', 30)
  ];
  return { users, groups, sessions, posts, requests: [], saved: [], dismissed: [], notifications: [], messages: [], blocks: [], reports: [], reminded: {}, session: null };
}
function load() { let d = null; try { const raw = localStorage.getItem(KEY); if (raw) d = JSON.parse(raw); } catch (e) { /* ignore */ } d = d || seed(); d.ratings = d.ratings || []; return d; }
let db = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save: browser storage is full or blocked.', 'error'); } }

/* ---------- state ---------- */
const ui = {
  tab: 'signin', obStep: 0, feedFilter: 'all', feedSort: 'relevance', openC: {}, matchTab: 'rec',
  mf: { subject: '', mode: '', format: '', college: '' }, inboxTab: 'notifications', sessTab: 'upcoming',
  gf: { q: '', subject: '', mode: '', approval: '' }, conv: null, chat: [], lastParsed: null, menu: false, confirmCb: null
};
let shellFor = null, lastRoute = '';
const me = () => db.users.find(u => u.id === db.session);
const userById = id => db.users.find(x => x.id === id);
const groupById = id => db.groups.find(x => x.id === id);
const sessionById = id => db.sessions.find(x => x.id === id);

/* ---------- matching engine ---------- */
const needsOf = u => new Set(u.subjects.filter(s => s.level <= 2 || s.improve).map(s => s.name));
const teachesOf = u => new Set(u.subjects.filter(s => s.level >= 4 && !s.improve).map(s => s.name));
const modeCompat = (a, b) => (!a || !b) ? 0.5 : (a === 'both' || b === 'both' || a === b) ? 1 : 0;
function scheduleFit(a, b) {
  const ad = a.prefs?.days || [], bd = b.prefs?.days || [];
  if (!ad.length || !bd.length) return { v: 0.5, conflict: false, common: [] };
  const common = ad.filter(d => bd.includes(d));
  if (!common.length) return { v: 0, conflict: true, common };
  const at = a.prefs.times || [], bt = b.prefs.times || [];
  const tv = (at.length && bt.length && !at.some(t => bt.includes(t))) ? 0.4 : 1;
  return { v: Math.min(1, common.length / Math.min(ad.length, bd.length)) * tv, conflict: false, common };
}
// Returns a 0-100 *estimated* compatibility score and the reasons behind it.
function matchScore(a, b) {
  const aN = needsOf(a), aT = teachesOf(a), bN = needsOf(b), bT = teachesOf(b);
  const gets = [...aN].filter(x => bT.has(x));    // what b can help a with
  const gives = [...bN].filter(x => aT.has(x));   // what a can help b with
  const fwd = aN.size ? gets.length / aN.size : 0, bwd = bN.size ? gives.length / bN.size : 0;
  const complement = (gets.length && gives.length) ? (fwd + bwd) / 2 : gets.length ? fwd * 0.65 : gives.length ? bwd * 0.4 : 0;
  const goal = aN.size ? [...aN].filter(x => { const s = b.subjects.find(z => z.name === x); return s && s.level >= 3 && !s.improve; }).length / aN.size : 0;
  const an = new Set(a.subjects.map(s => s.name)), bn = new Set(b.subjects.map(s => s.name));
  const union = new Set([...an, ...bn]); const shared = [...an].filter(x => bn.has(x));
  const relevance = union.size ? shared.length / union.size : 0;
  const sch = scheduleFit(a, b);
  const fmt = (modeCompat(a.prefs?.mode, b.prefs?.mode) + modeCompat(a.prefs?.format, b.prefs?.format)) / 2;
  const sameCollege = a.college && b.college && a.college.toLowerCase() === b.college.toLowerCase();
  const sameDept = a.dept && b.dept && a.dept.toLowerCase() === b.dept.toLowerCase();
  const context = (sameCollege ? 0.5 : 0) + ((sameDept || (a.year && a.year === b.year)) ? 0.5 : 0);
  const parts = { complement, goal, relevance, schedule: sch.v, format: fmt, context };
  let total = 0; for (const k in WEIGHTS) total += WEIGHTS[k] * parts[k];
  if (sch.conflict) total *= 0.85; // serious availability conflict
  return { score: Math.max(0, Math.min(100, Math.round(total))), parts, gets, gives, shared, common: sch.common, conflict: sch.conflict, sameCollege };
}
function explain(o, m) {
  const list = a => a.join(', ');
  let t;
  if (m.gets.length && m.gives.length) t = `Potential mutual match: ${o.name.split(' ')[0]} is strong in ${list(m.gets)}, which you want to improve, and wants help with ${list(m.gives)}, which you can teach.`;
  else if (m.gets.length) t = `${o.name.split(' ')[0]} is strong in ${list(m.gets)}, which you want to improve. They haven't listed a need you can help with yet, so this would be a one-way help request.`;
  else if (m.gives.length) t = `You could help ${o.name.split(' ')[0]} with ${list(m.gives)}. They haven't listed a subject that helps with your goals yet.`;
  else if (m.shared.length) t = `You both study ${list(m.shared.slice(0, 3))}, but there is no clear strength/need pairing yet.`;
  else t = 'Limited academic overlap based on the information both profiles share.';
  t += m.common.length ? ` Common days: ${list(m.common)}.` : (m.conflict ? ' No common study days listed.' : ' Availability not fully listed.');
  return t;
}
function isBlocked(a, b) { return db.blocks.some(x => (x.by === a && x.target === b) || (x.by === b && x.target === a)); }
function candidates(u) {
  return db.users.filter(o => o.id !== u.id && o.onboarded && !isBlocked(u.id, o.id) &&
    o.privacy.profile !== 'restricted' && o.privacy.subjects &&
    !db.dismissed.some(d => d.by === u.id && d.target === o.id));
}
function rankedMatches(u) {
  return candidates(u).map(o => ({ o, m: matchScore(u, o) })).filter(x => x.m.score > 0).sort((a, b) => b.m.score - a.m.score);
}
const activeReq = (a, b, subject) => db.requests.find(r => r.from === a && r.to === b && r.status === 'pending' && (!subject || r.subject === subject));
const acceptedPartners = uid_ => db.requests.filter(r => r.status === 'accepted' && (r.from === uid_ || r.to === uid_)).map(r => r.from === uid_ ? r.to : r.from).filter((v, i, a) => a.indexOf(v) === i && !isBlocked(uid_, v));

/* ---------- results (marks) helpers ---------- */
const pct = r => (r.system === 'marks' || r.system === 'percentage') && r.max > 0 ? Math.round(r.obtained / r.max * 1000) / 10 : null;
function resVal(r) {
  if (r.system === 'grade') return esc(r.grade);
  if (r.system === 'gpa') return `${r.obtained} / ${r.max} GPA`;
  return `${r.obtained} / ${r.max}`;
}
function validateResult(f) {
  const e = {};
  if (!f.subject.trim()) e.subject = 'Enter a subject.';
  if (!f.name.trim()) e.name = 'Enter the assessment name, e.g. Midterm.';
  if (f.system === 'grade') { if (!f.grade.trim()) e.grade = 'Enter the grade, e.g. B+.'; }
  else {
    if (f.obtained === '' || isNaN(f.obtained)) e.obtained = 'Enter the score you obtained.';
    else if (f.obtained < 0) e.obtained = 'Score cannot be negative.';
    if (f.system !== 'percentage') {
      if (f.max === '' || isNaN(f.max) || f.max <= 0) e.max = 'Enter a maximum greater than 0.';
      else if (!e.obtained && f.obtained > f.max) e.obtained = 'Score cannot be higher than the maximum.';
    } else if (!e.obtained && f.obtained > 100) e.obtained = 'A percentage cannot be above 100.';
  }
  return e;
}

/* ---------- notifications ---------- */
function notify(userId, text, link) {
  const u = userById(userId);
  if (!u || u.demo || u.notif?.inapp === false) return;
  db.notifications.unshift({ id: uid('n'), user: userId, text, link: link || 'inbox', read: false, at: nowISO() });
}
function checkReminders(u) {
  if (u.notif?.reminders === false) return;
  const soon = Date.now() + 24 * 3600000;
  db.sessions.forEach(s => {
    const k = s.id + ':' + u.id; const t = +new Date(s.start);
    if (s.status === 'scheduled' && s.participants.includes(u.id) && t > Date.now() && t < soon && !db.reminded[k]) {
      db.reminded[k] = true; notify(u.id, `Reminder: "${s.title}" starts ${fmtDT(s.start)}.`, 'sessions');
    }
  });
}

/* ---------- AI-style assistant (rule-based, labelled as such) ---------- */
const ALIASES = { 'computer science': 'Computer Science', 'data structures': 'Data Structures', 'data structure': 'Data Structures', dsa: 'Data Structures', mathematics: 'Mathematics', maths: 'Mathematics', math: 'Mathematics', calculus: 'Mathematics', algebra: 'Mathematics', english: 'English', physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', python: 'Python', programming: 'Computer Science', coding: 'Computer Science', history: 'History', economics: 'Economics', statistics: 'Statistics', stats: 'Statistics' };
function subjectsIn(text) {
  const t = text.toLowerCase(), out = [];
  Object.keys(ALIASES).sort((a, b) => b.length - a.length).forEach(k => {
    const re = new RegExp('\\b' + k + '\\b'); if (re.test(t) && !out.includes(ALIASES[k])) out.push(ALIASES[k]);
  });
  return out;
}
function parseQuery(q) {
  const t = q.toLowerCase();
  const p = { raw: q, wanted: [], offer: [], candNeeds: [], days: [], times: [], dept: /\b(my|same) (department|dept)\b/.test(t), college: /\b(my|same) (college|university|school)\b/.test(t), mode: /\bonline\b/.test(t) ? 'online' : /in[- ]person|face[- ]to[- ]face/.test(t) ? 'in-person' : '', group: /\bgroups?\b/.test(t), plan: /study plan|plan for|schedule a session/.test(t), count: 0 };
  const clauses = t.split(/\bbut\b|;|\band\b(?=\s+(?:can|who|is|also|i|help))/);
  clauses.forEach(c => {
    const subs = subjectsIn(c); if (!subs.length) return;
    if (/\bi (can|could|am|know|'m)\b|\bi'm\b|\bi can\b/.test(c) && /(teach|help|good|strong|know|tutor)/.test(c)) p.offer.push(...subs);
    else if (/(who|partner|student|someone|they)\b.*\b(wants?|needs?|looking)\b.*\b(improve|help)/.test(c)) p.candNeeds.push(...subs);
    else p.wanted.push(...subs);
  });
  ['wanted', 'offer', 'candNeeds'].forEach(k => p[k] = [...new Set(p[k])]);
  if (/evening|night/.test(t)) p.times.push('Evening'); if (/morning/.test(t)) p.times.push('Morning'); if (/afternoon/.test(t)) p.times.push('Afternoon');
  if (/weekend/.test(t)) p.days.push('Sat', 'Sun');
  const dn = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  Object.keys(dn).forEach(k => { if (new RegExp('\\b' + k + '[a-z]*\\b').test(t) && !p.days.includes(dn[k])) p.days.push(dn[k]); });
  const nm = t.match(/\b(one|two|three|four|five|\d)\s+(?:other\s+)?(students?|people|partners?|members?)/);
  if (nm) p.count = ({ one: 1, two: 2, three: 3, four: 4, five: 5 })[nm[1]] || Number(nm[1]) || 0;
  return p;
}
function describeParsed(p) {
  const b = [];
  if (p.wanted.length) b.push('someone strong in ' + p.wanted.join(', '));
  if (p.offer.length) b.push('you can teach ' + p.offer.join(', '));
  if (p.candNeeds.length) b.push('who wants help with ' + p.candNeeds.join(', '));
  if (p.days.length) b.push('on ' + p.days.join('/'));
  if (p.times.length) b.push(p.times.join('/').toLowerCase());
  if (p.dept) b.push('from your department'); if (p.college) b.push('from your college');
  if (p.mode) b.push(p.mode); if (p.count) b.push('up to ' + p.count);
  return b.join('; ');
}
function assistantSearch(p, broaden) {
  const u = me();
  const temp = clone(u);
  p.wanted.forEach(s => { const e = temp.subjects.find(x => x.name === s); if (e) e.improve = true; else temp.subjects.push({ name: s, level: 1, improve: true, note: '' }); });
  p.offer.forEach(s => { const e = temp.subjects.find(x => x.name === s); if (e) { e.level = Math.max(e.level, 4); e.improve = false; } else temp.subjects.push({ name: s, level: 4, improve: false, note: '' }); });
  let c = candidates(u);
  if (p.wanted.length) c = c.filter(o => p.wanted.some(s => teachesOf(o).has(s)));
  else if (p.offer.length) c = c.filter(o => p.offer.some(s => needsOf(o).has(s)));
  if (!broaden) {
    if (p.candNeeds.length) c = c.filter(o => p.candNeeds.some(s => needsOf(o).has(s)));
    if (p.days.length) c = c.filter(o => !(o.prefs.days || []).length || p.days.some(d => o.prefs.days.includes(d)));
    if (p.times.length) c = c.filter(o => !(o.prefs.times || []).length || p.times.some(d => o.prefs.times.includes(d)));
    if (p.dept) c = c.filter(o => o.dept && u.dept && o.dept.toLowerCase() === u.dept.toLowerCase());
    if (p.college) c = c.filter(o => o.college && u.college && o.college.toLowerCase() === u.college.toLowerCase());
    if (p.mode) c = c.filter(o => modeCompat(p.mode, o.prefs.mode) === 1);
  }
  return c.map(o => ({ o, m: matchScore(temp, o) })).sort((a, b) => b.m.score - a.m.score).slice(0, p.count || 5);
}
function assistantGroups(p, broaden) {
  let g = db.groups.filter(x => !(x.members.length >= x.max) && !x.members.includes(me().id));
  const subs = [...p.wanted, ...p.offer, ...p.candNeeds];
  if (subs.length) g = g.filter(x => subs.includes(x.subject) || subs.some(s => (x.topic || '').toLowerCase().includes(s.toLowerCase())));
  if (!broaden) {
    if (p.days.length) g = g.filter(x => p.days.some(d => x.days.includes(d)));
    if (p.mode) g = g.filter(x => x.mode === p.mode);
  }
  return g.sort((a, b) => (a.approval === 'open' ? 0 : 1) - (b.approval === 'open' ? 0 : 1)).slice(0, p.count || 5);
}
function assistantRespond(text, broaden) {
  const p = parseQuery(text); ui.lastParsed = { text, p };
  if (p.plan) return { kind: 'plan', p, text: `I can't generate a plan automatically in this prototype, but I can set up a session for you${p.wanted[0] || p.offer[0] ? ' on ' + (p.wanted[0] || p.offer[0]) : ''}. Choose "Create session" and pick a date.`, subject: p.wanted[0] || p.offer[0] || '' };
  const nothing = !p.wanted.length && !p.offer.length && !p.candNeeds.length;
  if (nothing && !(p.days.length || p.times.length || p.dept || p.college || p.mode)) return { kind: 'clarify', p, text: 'Which subject do you need help with, or which one can you teach? For example: "I can teach Python but need help with Data Structures."' };
  if (p.group) {
    const r = assistantGroups(p, broaden);
    return { kind: 'groups', p, ids: r.map(g => g.id), text: r.length ? `I found ${plural(r.length, 'open group')} from the groups in this app. I understood: ${describeParsed(p) || 'any subject'}.` : `No groups match everything you asked for. I understood: ${describeParsed(p)}.`, empty: !r.length, canBroaden: !broaden };
  }
  const r = assistantSearch(p, broaden);
  return { kind: 'students', p, ids: r.map(x => x.o.id), items: r, text: r.length ? `Here are ${plural(r.length, 'student')} from the students in this app, ranked by estimated compatibility. I understood: ${describeParsed(p)}.` : `No students match everything you asked for. I understood: ${describeParsed(p)}.`, empty: !r.length, canBroaden: !broaden };
}

/* =====================================================================
   UI helpers: toast, modal, confirm
   ===================================================================== */
function toast(msg, type = '') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600);
}
function openModal(title, body, wide) {
  closeModal();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'modal';
  o.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="iconbtn" data-act="closeModal" aria-label="Close">${ic('x')}</button></div>${body}</div>`;
  o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
  document.body.appendChild(o);
  const f = $('input,select,textarea,button.primary', o.querySelector('.modal')); if (f) f.focus();
}
function closeModal() { $('#modal')?.remove(); }
function confirmBox(text, cb, label = 'Confirm') {
  ui.confirmCb = cb;
  openModal('Please confirm', `<p>${esc(text)}</p><div class="row"><button class="btn danger" data-act="confirmYes">${esc(label)}</button><button class="btn" data-act="closeModal">Cancel</button></div>`);
}
function emptyState(title, text, btn) {
  return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(text)}</p>${btn || ''}</div>`;
}
const field = (label, name, type = 'text', val = '', extra = '', help = '') => `<div class="field"><label for="f_${name}">${label}</label><input id="f_${name}" name="${name}" type="${type}" value="${esc(val)}" ${extra}><div class="help">${help}</div><div class="err" data-for="${name}"></div></div>`;
const selectF = (label, name, opts, val, extra = '') => `<div class="field"><label for="f_${name}">${label}</label><select id="f_${name}" name="${name}" ${extra}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select><div class="err" data-for="${name}"></div></div>`;
const checkGroup = (name, opts, sel = []) => `<div class="checks">${opts.map(o => `<label><input type="checkbox" name="${name}" value="${esc(o)}" ${sel.includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('')}</div>`;
function showErrors(form, errs) {
  $$('.err[data-for]', form).forEach(el => { el.textContent = errs[el.dataset.for] || ''; });
  const first = Object.keys(errs)[0]; if (first) form.elements[first]?.focus();
}

/* =====================================================================
   Router & shell
   ===================================================================== */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, ''); const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || '', arg: parts[1] || '', q: new URLSearchParams(qs || '') };
}
const go = p => { if (location.hash === '#/' + p) render(); else location.hash = '#/' + p; };
window.addEventListener('hashchange', render);

const NAV = [['home', 'Home', 'home'], ['matches', 'Study partners', 'match'], ['assistant', 'AI match assistant', 'spark'], ['groups', 'Study groups', 'group'], ['sessions', 'Sessions', 'cal'], ['inbox', 'Notifications', 'bell'], ['messages', 'Messages', 'chat'], ['profile', 'My profile', 'user'], ['settings', 'Settings', 'settings']];
function shellHTML(u) {
  const bottom = [['home', 'Home', 'home'], ['matches', 'Partners', 'match'], ['groups', 'Groups', 'group'], ['sessions', 'Sessions', 'cal'], ['inbox', 'Inbox', 'bell']];
  return `<div class="shell">
  <aside class="side" aria-label="Main navigation">
    <a class="logo" href="#/home"><i>S</i>StudyMatch</a>
    <nav class="nav">${NAV.map(([k, l, i]) => `<a href="#/${k}" data-nav="${k}" class="${k === 'assistant' ? 'ai-link' : ''}">${ic(i)}<span>${l}</span><span class="badge hidden" data-badge="${k}"></span></a>`).join('')}</nav>
    <div class="demo-note"><b>Prototype.</b> Data is saved only in this browser. Students marked <span class="chip demo">Demo</span> are sample profiles.</div>
  </aside>
  <div>
    <header class="top">
      <a class="logo" href="#/home"><i>S</i><span>StudyMatch</span></a>
      <div class="search" role="search"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS.search}</svg><input id="gsearch" type="search" placeholder="Search students, subjects, groups, posts" aria-label="Search" autocomplete="off"></div>
      <a class="btn ai sm" href="#/assistant">${ic('spark')}<span>AI Match</span></a>
      <a class="iconbtn" href="#/inbox" aria-label="Notifications">${ic('bell')}<span class="dot hidden" data-badge="bell"></span></a>
      <div style="position:relative">
        <button class="iconbtn" data-act="toggleMenu" aria-label="Account menu" aria-haspopup="true" style="border-radius:50%;padding:0">${avatar(u, 'sm')}</button>
        <div class="menu hidden" id="menu"><a href="#/profile">View profile</a><button data-act="editProfile">Edit profile</button><a href="#/settings">Settings</a><button data-act="logout">Log out</button></div>
      </div>
    </header>
    <main id="main" tabindex="-1"></main>
  </div>
  <nav class="bottom" aria-label="Mobile navigation">${bottom.map(([k, l, i]) => `<a href="#/${k}" data-nav="${k}">${ic(i)}${l}</a>`).join('')}</nav>
  <a class="fab" href="#/assistant" aria-label="Open AI match assistant">${ic('spark')}<span>Ask AI</span></a>
</div>`;
}
function unreadCount(u) { return db.notifications.filter(n => n.user === u.id && !n.read).length; }
function unreadMsgs(u) { return db.messages.filter(m => m.to === u.id && !m.read).length; }
function updateChrome() {
  const u = me(); if (!u) return;
  const n = unreadCount(u), mm = unreadMsgs(u), pr = db.requests.filter(r => r.to === u.id && r.status === 'pending').length;
  const set = (k, v) => $$(`[data-badge="${k}"]`).forEach(el => { el.textContent = v; el.classList.toggle('hidden', !v); });
  set('bell', n || ''); set('inbox', (n + pr) || ''); set('messages', mm || '');
  const r = parseHash(); const cur = r.name || 'home';
  $$('[data-nav]').forEach(a => { a.classList.toggle('on', a.dataset.nav === cur); if (a.dataset.nav === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
function render() {
  const root = $('#root'); const u = me();
  closeModal();
  if (!u) { shellFor = null; root.innerHTML = authView(); return; }
  if (!u.onboarded) { shellFor = null; root.innerHTML = onboardingView(u); return; }
  checkReminders(u);
  if (shellFor !== u.id) { root.innerHTML = shellHTML(u); shellFor = u.id; bindSearch(); }
  const r = parseHash();
  const views = { home: homeView, matches: matchesView, assistant: assistantView, groups: groupsView, sessions: sessionsView, inbox: inboxView, messages: messagesView, profile: profileView, settings: settingsView, search: searchView };
  const key = r.name + '/' + r.arg;
  $('#main').innerHTML = (views[r.name] || homeView)(u, r);
  updateChrome();
  if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; }
  if (r.name === 'assistant') { const c = $('#chatlog'); if (c) c.scrollTop = c.scrollHeight; }
  save();
}
function bindSearch() {
  let t; const inp = $('#gsearch'); if (!inp) return;
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const q = inp.value.trim(); if (q) go('search?q=' + encodeURIComponent(q)); }, 300); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); const q = inp.value.trim(); if (q) go('search?q=' + encodeURIComponent(q)); } });
}

/* =====================================================================
   Authentication (local to this browser)
   ===================================================================== */
function authView() {
  const su = ui.tab === 'signup';
  return `<div class="auth">
  <section class="auth-brand">
    <a class="logo" href="#/"><i>S</i>StudyMatch</a>
    <h1>Learn faster by studying with the right people.</h1>
    <p>Find classmates who are strong where you are stuck, and who want help with what you already know. Join study groups and plan sessions together.</p>
    <svg class="auth-art" viewBox="0 0 360 200" role="img" aria-label="Students studying together">
      <rect x="20" y="130" width="320" height="10" rx="5" fill="#2f4380"/>
      <circle cx="100" cy="70" r="26" fill="#9bb1ff"/><rect x="72" y="98" width="56" height="34" rx="14" fill="#6f8cf5"/>
      <circle cx="260" cy="70" r="26" fill="#ffd27a"/><rect x="232" y="98" width="56" height="34" rx="14" fill="#f2b441"/>
      <rect x="140" y="92" width="80" height="40" rx="6" fill="#fff"/><rect x="150" y="102" width="60" height="5" rx="2" fill="#c9d3f2"/><rect x="150" y="113" width="40" height="5" rx="2" fill="#c9d3f2"/>
      <path d="M180 30l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill="#a591ff"/>
    </svg>
  </section>
  <section class="auth-panel"><div class="card auth-card">
    <div class="alert info small"><b>Prototype notice:</b> accounts are stored only in this browser. Google, GitHub and phone sign-in need a real backend and are not included.</div>
    <div class="tabs" role="tablist"><button role="tab" class="${su ? '' : 'on'}" data-act="authTab" data-t="signin">Sign in</button><button role="tab" class="${su ? 'on' : ''}" data-act="authTab" data-t="signup">Create account</button></div>
    ${ui.tab === 'forgot' ? forgotForm() : su ? signupForm() : signinForm()}
  </div></section></div>`;
}
const pwField = (name, label, extra = '') => `<div class="field"><label for="f_${name}">${label}</label><div class="pw"><input id="f_${name}" name="${name}" type="password" autocomplete="${name === 'password' ? 'current-password' : 'new-password'}" ${extra}><button type="button" class="iconbtn" data-act="togglePw" aria-label="Show or hide password">${ic('eye')}</button></div><div class="err" data-for="${name}"></div></div>`;
function signinForm() {
  return `<form data-form="signin" novalidate><div class="err alert" data-for="_form"></div>
  ${field('Email', 'email', 'email', '', 'autocomplete="email" required')}${pwField('password', 'Password')}
  <button class="btn primary" style="width:100%;justify-content:center" type="submit">Sign in</button>
  <p class="small" style="margin-top:12px"><a href="#" data-act="authTab" data-t="forgot">Forgot password?</a></p></form>`;
}
function signupForm() {
  return `<form data-form="signup" novalidate><div class="err alert" data-for="_form"></div>
  ${field('Full name', 'name', 'text', '', 'autocomplete="name" required')}
  ${field('Email', 'email', 'email', '', 'autocomplete="email" required')}
  ${pwField('password', 'Password')}<div class="help" style="margin:-8px 0 12px">At least 8 characters with a letter and a number.</div>
  ${field('School or college', 'college', 'text', '', 'required')}
  ${field('Department or course', 'dept', 'text', '', '')}
  ${field('Academic year or class', 'year', 'text', '', 'placeholder="e.g. Year 2"')}
  <button class="btn primary" style="width:100%;justify-content:center" type="submit">Create account</button></form>`;
}
function forgotForm() {
  return `<div class="stack"><h3>Reset your password</h3><div class="alert warn">Email password resets need a mail service, which this browser-only prototype doesn't have. Your options: sign in with the right password, or clear this browser's prototype data and start again.</div>
  <button class="btn danger" data-act="wipeAll">Clear all prototype data</button> <button class="btn" data-act="authTab" data-t="signin">Back to sign in</button></div>`;
}
async function hashPw(pw, salt) {
  if (window.crypto?.subtle) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw)); return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  let h = 5381; for (const c of salt + pw) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'weak' + h;
}
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
async function doSignin(form) {
  const f = Object.fromEntries(new FormData(form)); const errs = {};
  if (!emailOk(f.email.trim())) errs.email = 'Enter a valid email address.';
  if (!f.password) errs.password = 'Enter your password.';
  if (Object.keys(errs).length) return showErrors(form, errs);
  const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Signing in…';
  const u = db.users.find(x => x.email === f.email.trim().toLowerCase());
  const ok = u && !u.demo && (await hashPw(f.password, u.salt)) === u.pw;
  btn.disabled = false; btn.textContent = 'Sign in';
  if (!ok) return showErrors(form, { _form: 'Email or password is incorrect.' });
  db.session = u.id; save(); toast('Welcome back, ' + u.name.split(' ')[0] + '.', 'success'); go('home');
}
async function doSignup(form) {
  const f = Object.fromEntries(new FormData(form)); const errs = {};
  if (f.name.trim().length < 2) errs.name = 'Enter your full name.';
  if (!emailOk(f.email.trim())) errs.email = 'Enter a valid email address.';
  else if (db.users.some(x => x.email === f.email.trim().toLowerCase())) errs.email = 'An account with this email already exists. Try signing in.';
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) errs.password = 'Use at least 8 characters, including a letter and a number.';
  if (!f.college.trim()) errs.college = 'Enter your school or college.';
  if (Object.keys(errs).length) return showErrors(form, errs);
  const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Creating account…';
  const salt = uid('s');
  const u = { id: uid('u'), email: f.email.trim().toLowerCase(), salt, pw: await hashPw(f.password, salt), name: f.name.trim(), college: f.college.trim(), dept: f.dept.trim(), course: f.dept.trim(), year: f.year.trim(), bio: '', location: '', onboarded: false, subjects: [], results: [], prefs: { format: 'both', mode: 'both', days: [], times: [], size: '3-5', language: 'English', goals: '' }, privacy: { profile: 'public', college: true, location: false, subjects: true, availability: true, marks: false, contact: false }, notif: { inapp: true, reminders: true }, idCard: null };
  db.users.push(u); db.session = u.id; ui.obStep = 0; save(); go('home');
}
function logout() { db.session = null; shellFor = null; ui.tab = 'signin'; save(); location.hash = '#/'; render(); }

/* =====================================================================
   Onboarding (writes straight to the user record so nothing is lost)
   ===================================================================== */
const OB_STEPS = ['Basics', 'Subjects', 'Marks', 'Preferences', 'Review'];
function onboardingView(u) {
  const s = ui.obStep; const body = [ob1, ob2, ob3, ob4, ob5][s](u);
  return `<div class="auth-panel" style="min-height:100vh"><div class="card" style="max-width:680px;width:100%">
    <div class="row between"><a class="logo" href="#/"><i>S</i>StudyMatch</a><button class="btn ghost sm" data-act="logout">Log out</button></div>
    <h1 style="margin-top:14px">Set up your profile</h1><p class="muted">Step ${s + 1} of ${OB_STEPS.length}: ${OB_STEPS[s]}</p>
    <div class="steps" aria-hidden="true">${OB_STEPS.map((_, i) => `<span class="${i <= s ? 'done' : ''}"></span>`).join('')}</div>
    <form id="obform" data-form="ob" data-ob="1" novalidate>${body}</form>
    <div class="row between" style="margin-top:18px">
      <button class="btn" data-act="obBack" ${s === 0 ? 'disabled' : ''}>Back</button>
      <div class="row">${(s === 2 || s === 3) ? '<button class="btn ghost" data-act="obNext" data-skip="1">Skip</button>' : ''}
      <button class="btn primary" data-act="${s === 4 ? 'obFinish' : 'obNext'}">${s === 4 ? 'Finish setup' : 'Continue'}</button></div></div>
  </div></div>`;
}
function ob1(u) {
  return `${field('Full name', 'name', 'text', u.name, 'required')}${field('School or college', 'college', 'text', u.college, 'required')}
  <div class="grid g2">${field('Department', 'dept', 'text', u.dept)}${field('Course or degree', 'course', 'text', u.course)}</div>
  <div class="grid g2">${field('Academic year, semester or class', 'year', 'text', u.year)}${field('Location (optional)', 'location', 'text', u.location, '', 'Hidden from others unless you choose to share it in Settings.')}</div>
  <div class="field"><label for="f_bio">Short bio (optional)</label><textarea id="f_bio" name="bio">${esc(u.bio)}</textarea></div>`;
}
function ob2(u) {
  const names = [...new Set([...SUBJECTS, ...u.subjects.map(s => s.name)])];
  const rows = u.subjects.map((s, i) => `<div class="card flat" style="margin-bottom:10px"><div class="row between"><b>${esc(s.name)}</b><button type="button" class="btn sm ghost" data-act="obToggleSubject" data-s="${esc(s.name)}">Remove</button></div>
    <div class="grid g2"><div class="field"><label for="lvl_${i}">Current level</label><select id="lvl_${i}" name="lvl_${i}">${LEVELS.map((l, k) => `<option value="${k + 1}" ${s.level === k + 1 ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>&nbsp;</label><label style="font-weight:500"><input type="checkbox" name="imp_${i}" ${s.improve ? 'checked' : ''}> I want to improve this</label></div></div>
    <div class="field"><label for="note_${i}">What do you struggle with, or what can you teach? (optional)</label><input id="note_${i}" name="note_${i}" type="text" value="${esc(s.note)}"></div></div>`).join('');
  return `<p>Pick the subjects you study. Levels "Beginner" and "Needs improvement" count as help you're looking for; "Good" and "Strong" count as things you can teach.</p>
  <div style="margin-bottom:12px">${names.map(n => `<button type="button" class="chip ${u.subjects.some(s => s.name === n) ? 'on' : ''}" data-act="obToggleSubject" data-s="${esc(n)}" aria-pressed="${u.subjects.some(s => s.name === n)}">${esc(n)}</button>`).join('')}</div>
  <div class="row" style="margin-bottom:12px"><input id="customSub" type="text" placeholder="Add another subject" style="max-width:260px" aria-label="Add another subject"><button type="button" class="btn sm" data-act="obAddCustom">Add</button></div>${rows || '<p class="muted small">No subjects chosen yet.</p>'}`;
}
function ob3(u) {
  return `<div class="alert info">Marks are optional and <b>private by default</b>. They help you track your own progress. Matching mainly uses the levels you set in the previous step.</div>
  ${resultsTable(u, true)}<button type="button" class="btn" data-act="addResult">${ic('plus')} Add a result</button>`;
}
function prefFields(p) {
  return `<div class="grid g2">${selectF('Preferred format', 'format', [['one-to-one', 'One-to-one'], ['group', 'Group'], ['both', 'Either']], p.format)}${selectF('Preferred mode', 'mode', [['online', 'Online'], ['in-person', 'In person'], ['both', 'Both']], p.mode)}</div>
  <div class="field"><label>Available days</label>${checkGroup('days', DAYS, p.days)}</div>
  <div class="field"><label>Available times</label>${checkGroup('times', TIMES, p.times)}</div>
  <div class="grid g2">${selectF('Preferred group size', 'size', [['2', 'Pair (2)'], ['3-5', 'Small (3-5)'], ['6+', 'Large (6+)'], ['any', 'No preference']], p.size)}${field('Language of communication', 'language', 'text', p.language)}</div>
  <div class="field"><label for="f_goals">Study goals</label><textarea id="f_goals" name="goals" placeholder="e.g. Pass the final exam with confidence">${esc(p.goals)}</textarea></div>`;
}
const ob4 = u => prefFields(u.prefs);
function ob5(u) {
  return `<div class="stack"><div class="card flat"><h3>${esc(u.name)}</h3><p class="muted">${esc([u.college, u.dept, u.year].filter(Boolean).join(' · '))}</p><p>${esc(u.bio)}</p><button type="button" class="btn sm" data-act="obGo" data-s="0">Edit basics</button></div>
  <div class="card flat"><h3>Subjects</h3>${u.subjects.map(s => `<div class="small">${esc(s.name)}: <b>${LEVELS[s.level - 1]}</b>${s.improve ? ' (wants to improve)' : ''}</div>`).join('') || '<p class="muted small">None</p>'}<button type="button" class="btn sm" data-act="obGo" data-s="1" style="margin-top:8px">Edit subjects</button></div>
  <div class="card flat"><h3>Study preferences</h3><p class="small">${esc(prefSummary(u.prefs))}</p><button type="button" class="btn sm" data-act="obGo" data-s="3">Edit preferences</button></div>
  <p class="small muted">${u.results.length} result(s) added. Marks stay private unless you share them.</p></div>`;
}
const prefSummary = p => `${p.format === 'both' ? 'One-to-one or group' : p.format}, ${p.mode === 'both' ? 'online or in person' : p.mode}; ${(p.days || []).join(', ') || 'no days set'}${(p.times || []).length ? ' (' + p.times.join(', ').toLowerCase() + ')' : ''}; language: ${p.language || '—'}`;
function syncOb(form) {
  const u = me(); if (!u || !form) return; const fd = new FormData(form), s = ui.obStep;
  if (s === 0) ['name', 'college', 'dept', 'course', 'year', 'location', 'bio'].forEach(k => { if (fd.has(k)) u[k] = String(fd.get(k)).trim(); });
  if (s === 1) u.subjects.forEach((x, i) => { if (fd.has('lvl_' + i)) { x.level = Number(fd.get('lvl_' + i)); x.improve = fd.has('imp_' + i); x.note = String(fd.get('note_' + i) || '').trim(); } });
  if (s === 3) readPrefs(u, fd);
  save();
}
function readPrefs(u, fd) {
  u.prefs.format = fd.get('format') || 'both'; u.prefs.mode = fd.get('mode') || 'both';
  u.prefs.days = fd.getAll('days'); u.prefs.times = fd.getAll('times');
  u.prefs.size = fd.get('size') || 'any'; u.prefs.language = String(fd.get('language') || '').trim(); u.prefs.goals = String(fd.get('goals') || '').trim();
}
function obNext(skip) {
  const u = me(); syncOb($('#obform'));
  if (!skip) {
    if (ui.obStep === 0 && (!u.name || !u.college)) return toast('Enter your name and school or college to continue.', 'error');
    if (ui.obStep === 1 && !u.subjects.length) return toast('Choose at least one subject so we can find matches.', 'error');
  }
  ui.obStep = Math.min(4, ui.obStep + 1); render();
}
function obFinish() {
  const u = me(); if (!u.subjects.length) { ui.obStep = 1; render(); return toast('Choose at least one subject first.', 'error'); }
  u.onboarded = true; ui.obStep = 0;
  // Demo only: create one sample incoming request so you can try accepting/declining.
  const top = rankedMatches(u).find(x => x.o.demo);
  if (top) {
    const subj = top.m.gives[0] || top.m.gets[0] || u.subjects[0].name;
    db.requests.push({ id: uid('r'), demo: true, from: top.o.id, to: u.id, subject: subj, message: '(Demo request) Hi! Want to study together?', format: 'online', time: '', status: 'pending', created: nowISO() });
    notify(u.id, `${top.o.name} sent you a study request (demo).`, 'inbox');
  }
  notify(u.id, 'Welcome! Your profile is ready. Check your recommended study partners.', 'matches');
  save(); toast('Profile complete. Welcome!', 'success'); go('home');
}

/* =====================================================================
   Peer ratings (5 categories, out of 10, shown as rings)
   ===================================================================== */
const RATING_CATS = [['character', 'Character'], ['performance', 'Performance'], ['attitude', 'Attitude'], ['punctuality', 'Punctuality'], ['personality', 'Personality']];
function ratingsFor(id) { return db.ratings.filter(r => r.target === id); }
function ratingAverages(id) {
  const rs = ratingsFor(id), out = { count: rs.length };
  RATING_CATS.forEach(([k]) => { out[k] = rs.length ? Math.round(rs.reduce((a, r) => a + r.scores[k], 0) / rs.length * 10) / 10 : null; });
  return out;
}
function ring(label, v) {
  const R = 30, C = 2 * Math.PI * R, has = v !== null, off = has ? C * (1 - v / 10) : C, col = has ? (v >= 7 ? '#1b8f63' : '#b87400') : '#d5dbe6';
  return `<div style="text-align:center"><svg viewBox="0 0 80 80" width="92" height="92" role="img" aria-label="${esc(label)}: ${has ? v + ' out of 10' : 'no ratings yet'}">
  <circle cx="40" cy="40" r="${R}" fill="none" stroke="#e7ebf3" stroke-width="8"/>
  <circle cx="40" cy="40" r="${R}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 40 40)"/>
  <text x="40" y="38" text-anchor="middle" font-size="16" font-weight="700" fill="#14213d">${has ? v : '–'}</text><text x="40" y="52" text-anchor="middle" font-size="9" fill="#5f6b80">/ 10</text></svg><div class="small"><b>${esc(label)}</b></div></div>`;
}
function ratingsSection(t, own, partner, restricted) {
  if (restricted) return '';
  const a = ratingAverages(t.id), mine = db.ratings.find(r => r.by === me().id && r.target === t.id);
  let action = '';
  if (!own) action = partner ? `<button class="btn sm primary" data-act="ratePerson" data-u="${t.id}">${mine ? 'Edit my rating' : 'Rate ' + esc(t.name.split(' ')[0])}</button>` : '<span class="small muted">You can rate someone after a study request between you is accepted.</span>';
  return `<section class="card"><div class="row between"><h3>Peer ratings</h3>${action}</div>
  <p class="small muted">${a.count ? `Average of ${plural(a.count, 'rating')} from study partners, out of 10. Individual ratings are not shown.` : (own ? 'No one has rated you yet. Ratings from study partners appear here.' : 'No ratings yet.')}</p>
  <div class="row" style="justify-content:space-around;gap:6px">${RATING_CATS.map(([k, l]) => ring(l, a[k])).join('')}</div></section>`;
}
function rateForm(t) {
  const mine = db.ratings.find(r => r.by === me().id && r.target === t.id);
  return `<form data-form="rate" data-u="${t.id}"><p class="small muted">Rate ${esc(t.name)} from 1 to 10 in each area. Be fair and specific; they will only see the average of all ratings.</p>
  ${RATING_CATS.map(([k, l]) => { const v = mine ? mine.scores[k] : 7; return `<div class="field"><label for="r_${k}">${l}: <output>${v}</output> / 10</label><input id="r_${k}" name="${k}" type="range" min="1" max="10" step="1" value="${v}" oninput="this.previousElementSibling.querySelector('output').textContent=this.value"></div>`; }).join('')}
  <button class="btn primary" type="submit">${mine ? 'Update rating' : 'Submit rating'}</button></form>`;
}

/* =====================================================================
   Home dashboard & community feed
   ===================================================================== */
const upcomingSessions = u => db.sessions.filter(s => s.status === 'scheduled' && new Date(s.start) > Date.now()).sort((a, b) => new Date(a.start) - new Date(b.start));
const mySessions = (u, st) => db.sessions.filter(s => s.participants.includes(u.id) && s.status === st);
function progressList(u) {
  const by = {};
  u.results.forEach(r => { const p = pct(r); if (p !== null) (by[r.subject] = by[r.subject] || []).push({ ...r, p }); });
  return Object.entries(by).filter(([, a]) => a.length >= 2).map(([subject, a]) => {
    a.sort((x, y) => new Date(x.date) - new Date(y.date)); const last = a[a.length - 1], prev = a[a.length - 2];
    return { subject, last, prev };
  });
}
function postRelevance(p, u) {
  const mine = new Set(u.subjects.map(s => s.name)), needs = needsOf(u), a = userById(p.author);
  let sc = 0; p.subjects.forEach(s => { if (mine.has(s)) sc += 3; if (needs.has(s)) sc += 3; });
  if (a && a.college && a.college === u.college) sc += 2;
  sc += Math.max(0, 3 - (Date.now() - new Date(p.created)) / 86400000);
  return sc;
}
function feedPosts(u) {
  let list = db.posts.filter(p => !p.reports.includes(u.id) && !isBlocked(u.id, p.author));
  const f = ui.feedFilter, mine = new Set(u.subjects.map(s => s.name));
  if (f === 'requests') list = list.filter(p => ['help', 'partner'].includes(p.type));
  if (f === 'groups') list = list.filter(p => p.type === 'group');
  if (f === 'upcoming') list = list.filter(p => p.type === 'session' && sessionById(p.sessionId)?.status === 'scheduled');
  if (f === 'completed') list = list.filter(p => p.type === 'achievement');
  if (f === 'college') list = list.filter(p => { const a = userById(p.author); return a && a.college && a.college === u.college && a.privacy.college !== false; });
  if (f === 'subjects') list = list.filter(p => p.subjects.some(s => mine.has(s)));
  const t = p => new Date(p.created).getTime();
  if (ui.feedSort === 'newest') list.sort((a, b) => t(b) - t(a));
  else if (ui.feedSort === 'date') list.sort((a, b) => { const sa = sessionById(a.sessionId), sb = sessionById(b.sessionId); return (sa ? +new Date(sa.start) : Infinity) - (sb ? +new Date(sb.start) : Infinity); });
  else list.sort((a, b) => postRelevance(b, u) - postRelevance(a, u));
  return list;
}
function homeView(u) {
  const h = new Date().getHours(), greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const up = mySessions(u, 'scheduled').filter(s => new Date(s.start) > Date.now()), done = mySessions(u, 'completed');
  const joined = db.groups.filter(g => g.members.includes(u.id)).length, partners = acceptedPartners(u.id).length;
  const prog = progressList(u);
  const filters = [['all', 'All posts'], ['requests', 'Study requests'], ['groups', 'Group study plans'], ['upcoming', 'Upcoming sessions'], ['completed', 'Completed sessions'], ['college', 'My college'], ['subjects', 'My subjects']];
  const upc = upcomingSessions(u).slice(0, 3);
  return `<div class="stack">
  <section class="hero"><h1>${greet}, ${esc(u.name.split(' ')[0])}!</h1><p class="muted">Find someone who can help you master your difficult subjects.</p>
    <div class="row"><a class="btn primary" href="#/matches">${ic('match')} Find a study partner</a><a class="btn" href="#/groups">${ic('group')} Find a study group</a><button class="btn" data-act="newSession">${ic('cal')} Create a study plan</button><a class="btn ai" href="#/assistant">${ic('spark')} Ask AI to find my match</a></div></section>
  <section class="grid g5" aria-label="Academic overview">
    <div class="card stat"><b>${u.subjects.length}</b><span>Current subjects</span></div>
    <div class="card stat a"><b>${needsOf(u).size}</b><span>Want to improve</span></div>
    <div class="card stat a"><b>${up.length}</b><span>Upcoming sessions</span></div>
    <div class="card stat g"><b>${done.length}</b><span>Completed sessions</span></div>
    <div class="card stat v"><b>${partners + joined}</b><span>Active partners &amp; groups</span></div>
  </section>
  ${prog.length ? `<section class="card"><h3>Recent marks vs previous</h3>${prog.map(p => `<div class="small" style="margin-bottom:6px"><b>${esc(p.subject)}</b>: ${p.last.p}% (${esc(p.last.name)}) vs ${p.prev.p}% (${esc(p.prev.name)}). <span class="muted">Different assessments may not be directly comparable.</span></div>`).join('')}</section>` : ''}
  ${(!partners && !joined) ? `<section class="card">${emptyState('No study partners or groups yet', 'Your recommended matches are ready.', '<a class="btn primary" href="#/matches">Find your first study partner</a>')}</section>` : ''}
  <section><div class="row between"><h2>Upcoming study sessions</h2><a href="#/sessions" class="small">See all</a></div>
    ${upc.length ? `<div class="grid g3">${upc.map(s => sessionCard(s, u, true)).join('')}</div>` : emptyState('No upcoming sessions', 'Plan one and invite others.', '<button class="btn" data-act="newSession">Create a session</button>')}</section>
  ${done.length ? `<section><h2>Completed sessions</h2><div class="grid g3">${done.slice(0, 3).map(s => sessionCard(s, u, true)).join('')}</div></section>` : ''}
  <section><div class="row between"><h2>Community feed</h2><button class="btn primary sm" data-act="newPost">${ic('plus')} New post</button></div>
    <div class="row" style="margin:10px 0"><div class="tabbar grow" style="margin:0;border:0">${filters.map(([k, l]) => `<button class="${ui.feedFilter === k ? 'on' : ''}" data-act="feedFilter" data-f="${k}">${l}</button>`).join('')}</div>
    <label class="sr" for="sortsel">Sort posts</label><select id="sortsel" data-feedsort style="width:auto"><option value="relevance" ${ui.feedSort === 'relevance' ? 'selected' : ''}>Most relevant</option><option value="newest" ${ui.feedSort === 'newest' ? 'selected' : ''}>Newest</option><option value="date" ${ui.feedSort === 'date' ? 'selected' : ''}>Upcoming date</option></select></div>
    <div class="stack" id="feed">${feedHTML(u)}</div></section></div>`;
}
function feedHTML(u) {
  const l = feedPosts(u);
  return l.length ? l.map(p => postCard(p, u)).join('') : `<div class="card">${emptyState('No posts here yet', 'Try another filter, or start the conversation yourself.', '<button class="btn primary" data-act="newPost">Create a post</button>')}</div>`;
}
function postCard(p, u) {
  const a = userById(p.author) || { name: 'Former student', id: 'x' }, own = p.author === u.id;
  const showCollege = a.privacy ? a.privacy.college : false;
  const liked = p.likes.includes(u.id), saved = p.saves.includes(u.id);
  let cta = '';
  if (p.type === 'group' && groupById(p.groupId)) { const g = groupById(p.groupId); cta = `<button class="btn sm primary" data-act="openGroup" data-id="${g.id}">${groupStateLabel(g, u)}</button>`; }
  else if (p.type === 'session' && sessionById(p.sessionId)) cta = `<a class="btn sm primary" href="#/sessions">View session</a>`;
  else if (['help', 'offer', 'partner'].includes(p.type) && !own && a.id !== 'x') cta = `<button class="btn sm primary" data-act="reqModal" data-to="${a.id}" data-subject="${esc(p.subjects[0] || '')}">Send request</button>`;
  const open = ui.openC[p.id];
  return `<article class="card post"><div class="meta">${avatar(a)}<div class="grow"><b>${own ? 'You' : esc(a.name)}</b> ${a.demo ? '<span class="chip demo">Demo</span>' : ''}<div class="small muted">${showCollege ? esc([a.college, a.dept].filter(Boolean).join(' · ')) + ' · ' : ''}${ago(p.created)}</div></div><span class="chip ${p.type === 'achievement' ? 'teach' : p.type === 'session' ? 'need' : ''}">${POST_TYPES[p.type]}</span></div>
  <h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><div>${chips(p.subjects)}</div>
  <div class="actions"><button class="btn sm ${liked ? 'on-btn' : ''}" data-act="like" data-id="${p.id}" aria-pressed="${liked}">${ic('thumb')} Helpful ${p.likes.length || ''}</button>
  <button class="btn sm" data-act="toggleComments" data-id="${p.id}">${ic('chat')} Comment ${p.comments.length || ''}</button>
  <button class="btn sm ${saved ? 'on-btn' : ''}" data-act="savePost" data-id="${p.id}">${ic('save')} ${saved ? 'Saved' : 'Save'}</button>
  ${cta}<span class="grow"></span>
  ${own ? `<button class="btn sm ghost" data-act="editPost" data-id="${p.id}">Edit</button><button class="btn sm ghost danger" data-act="delPost" data-id="${p.id}">${ic('trash')}<span class="sr">Delete</span></button>` : `<button class="btn sm ghost" data-act="reportPost" data-id="${p.id}">${ic('flag')} Report</button>`}</div>
  ${open ? `<div>${p.comments.map(c => `<div class="comment"><b>${esc(userById(c.by)?.name || 'Student')}</b> <span class="muted tiny">${ago(c.at)}</span><br>${esc(c.text)}</div>`).join('')}<form data-form="comment" data-id="${p.id}" class="row" style="margin-top:8px"><label class="sr" for="c_${p.id}">Write a comment</label><input id="c_${p.id}" name="text" type="text" class="grow" placeholder="Write a comment" maxlength="400" style="flex:1"><button class="btn sm primary" type="submit">Post</button></form></div>` : ''}</article>`;
}
function postForm(p) {
  p = p || { type: 'help', title: '', desc: '', subjects: [] }; const u = me();
  const myG = db.groups.filter(g => g.owner === u.id), myS = db.sessions.filter(s => s.organizer === u.id && s.status === 'scheduled');
  return `<form data-form="post" data-id="${p.id || ''}" novalidate>${selectF('Post type', 'type', Object.entries(POST_TYPES), p.type)}
  ${field('Title', 'title', 'text', p.title, 'maxlength="120" required')}
  <div class="field"><label for="f_desc">Description</label><textarea id="f_desc" name="desc" maxlength="800">${esc(p.desc)}</textarea><div class="err" data-for="desc"></div></div>
  <div class="field"><label>Subject tags</label><div class="checks">${[...new Set([...SUBJECTS, ...u.subjects.map(s => s.name)])].map(s => `<label><input type="checkbox" name="subjects" value="${esc(s)}" ${p.subjects.includes(s) ? 'checked' : ''}>${esc(s)}</label>`).join('')}</div></div>
  ${myG.length ? selectF('Link one of your groups (for group invites)', 'groupId', [['', 'None'], ...myG.map(g => [g.id, g.name])], p.groupId || '') : ''}
  ${myS.length ? selectF('Link one of your sessions (for session posts)', 'sessionId', [['', 'None'], ...myS.map(s => [s.id, s.title])], p.sessionId || '') : ''}
  <button class="btn primary" type="submit">${p.id ? 'Save changes' : 'Publish'}</button></form>`;
}

/* =====================================================================
   Study partner discovery
   ===================================================================== */
function availSummary(o) { const d = o.prefs.days || [], t = o.prefs.times || []; return d.length ? d.join(', ') + (t.length ? ' · ' + t.join('/').toLowerCase() : '') : 'Not listed'; }
function matchCard(o, m, u) {
  const saved = db.saved.some(s => s.by === u.id && s.target === o.id), pending = activeReq(u.id, o.id);
  const cls = m.score >= 70 ? '' : m.score >= 40 ? 'mid' : 'low';
  const teach = o.subjects.filter(s => s.level >= 4 && !s.improve).map(s => s.name), need = [...needsOf(o)];
  return `<article class="card match"><div class="row" style="align-items:flex-start">${avatar(o)}<div class="grow"><b>${esc(o.name)}</b> ${o.demo ? '<span class="chip demo">Demo</span>' : ''}
  <div class="small muted">${o.privacy.college ? esc([o.college, o.dept, o.year].filter(Boolean).join(' · ')) : 'Institution hidden'}</div></div>
  <div class="score ${cls}" title="Estimated compatibility, not a guarantee">${m.score}<small>est. compatibility</small></div></div>
  <div class="why">${esc(explain(o, m))}</div>
  <div class="small"><b>Can help with:</b> ${chips(teach, 'teach') || '<span class="muted">—</span>'}</div>
  <div class="small"><b>Wants help with:</b> ${chips(need, 'need') || '<span class="muted">—</span>'}</div>
  ${o.privacy.availability ? `<div class="small muted">Availability: ${esc(availSummary(o))} · ${esc(o.prefs.format === 'both' ? 'One-to-one or group' : o.prefs.format)}, ${esc(o.prefs.mode === 'both' ? 'online or in person' : o.prefs.mode)}</div>` : ''}
  <div class="row" style="margin-top:12px"><a class="btn sm" href="#/profile/${o.id}">View profile</a>
  <button class="btn sm primary" data-act="reqModal" data-to="${o.id}" data-subject="${esc(m.gets[0] || m.gives[0] || '')}" ${pending ? 'disabled' : ''}>${pending ? 'Request sent' : 'Send study request'}</button>
  <button class="btn sm ${saved ? 'on-btn' : ''}" data-act="saveMatch" data-id="${o.id}">${ic('save')} ${saved ? 'Saved' : 'Save match'}</button>
  <button class="btn sm ghost" data-act="dismiss" data-id="${o.id}">Not interested</button></div></article>`;
}
function matchesView(u) {
  let list = ui.matchTab === 'saved'
    ? db.saved.filter(s => s.by === u.id).map(s => userById(s.target)).filter(o => o && !isBlocked(u.id, o.id)).map(o => ({ o, m: matchScore(u, o) }))
    : rankedMatches(u);
  const f = ui.mf;
  if (f.subject) list = list.filter(x => x.o.subjects.some(s => s.name === f.subject));
  if (f.mode) list = list.filter(x => modeCompat(f.mode, x.o.prefs.mode) === 1);
  if (f.format) list = list.filter(x => modeCompat(f.format, x.o.prefs.format) === 1);
  if (f.college) list = list.filter(x => x.o.college === u.college);
  const names = [...new Set([...SUBJECTS, ...u.subjects.map(s => s.name)])];
  const noSubjects = !u.subjects.length;
  return `<div class="page-head"><div><h1>Study partners</h1><p class="muted">Ranked by how well your strengths and goals complement each other. Scores are estimates.</p></div><a class="btn ai" href="#/assistant">${ic('spark')} Ask the assistant</a></div>
  <div class="tabbar"><button class="${ui.matchTab === 'rec' ? 'on' : ''}" data-act="matchTab" data-t="rec">Recommended</button><button class="${ui.matchTab === 'saved' ? 'on' : ''}" data-act="matchTab" data-t="saved">Saved</button></div>
  <div class="card flat row" style="margin-bottom:14px">
    <div style="min-width:150px"><label for="mf_subject">Subject</label><select id="mf_subject" data-mf="subject"><option value="">Any</option>${names.map(n => `<option ${f.subject === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
    <div style="min-width:130px"><label for="mf_mode">Study mode</label><select id="mf_mode" data-mf="mode"><option value="">Any</option><option value="online" ${f.mode === 'online' ? 'selected' : ''}>Online</option><option value="in-person" ${f.mode === 'in-person' ? 'selected' : ''}>In person</option></select></div>
    <div style="min-width:130px"><label for="mf_format">Format</label><select id="mf_format" data-mf="format"><option value="">Any</option><option value="one-to-one" ${f.format === 'one-to-one' ? 'selected' : ''}>One-to-one</option><option value="group" ${f.format === 'group' ? 'selected' : ''}>Group</option></select></div>
    <label style="margin:18px 0 0;font-weight:500"><input type="checkbox" data-mf="college" ${f.college ? 'checked' : ''}> My institution only</label></div>
  ${noSubjects ? '<div class="alert warn">Add subjects and levels to your profile to get recommendations.</div>' : ''}
  <details class="card flat small" style="margin-bottom:14px"><summary>How scoring works</summary><p style="margin-top:8px">Estimated compatibility (0-100) combines: ${Object.entries(WEIGHTS).map(([k, v]) => `${k} ${v}%`).join(', ')}. Weights are initial settings in <code>WEIGHTS</code> at the top of script.js and are not scientifically validated. Marks are never used to rank people.</p></details>
  <div class="grid g2">${list.map(x => matchCard(x.o, x.m, u)).join('')}</div>
  ${list.length ? '' : `<div class="card">${emptyState(ui.matchTab === 'saved' ? 'No saved matches' : 'No matches found', ui.matchTab === 'saved' ? 'Save people from the Recommended tab.' : 'Try clearing filters, or search for a study group instead.', '<a class="btn" href="#/groups">Browse study groups</a>')}</div>`}`;
}

/* =====================================================================
   AI match assistant (rule-based – clearly labelled)
   ===================================================================== */
const PROMPTS = ['Find someone who is good at Mathematics and can help me prepare for my exam.', 'I can teach Python but need help with Data Structures.', 'Find a group studying physics this weekend.', 'I need two students from my department who are available in the evening.', 'Find a study partner who wants to improve English and can help me with Chemistry.', 'Create a study plan for my upcoming examination.'];
function botEntry(e, u) {
  let cards = '';
  if (e.kind === 'students' && e.items) cards = `<div class="grid g2" style="margin-top:8px">${e.items.map(x => { const o = userById(x.o.id); return o ? matchCard(o, x.m, u) : ''; }).join('')}</div>`;
  if (e.kind === 'groups') cards = `<div class="grid g2" style="margin-top:8px">${e.ids.map(id => groupById(id)).filter(Boolean).map(g => groupCard(g, u)).join('')}</div>`;
  const actions = e.kind === 'plan' ? `<div class="row" style="margin-top:8px"><button class="btn ai sm" data-act="newSession" data-subject="${esc(e.subject)}">Create session</button></div>`
    : e.empty ? `<div class="row" style="margin-top:8px">${e.canBroaden ? '<button class="btn sm" data-act="broaden">Broaden search (relax time, department and their needs)</button>' : ''}<a class="btn sm" href="#/groups">Browse groups</a></div>` : '';
  return `<div class="bubble bot ai-b">${esc(e.text)}</div>${cards ? `<div class="bubble wide bot">${cards}</div>` : ''}${actions}`;
}
function assistantView(u) {
  return `<div class="page-head"><div><h1>AI match assistant</h1><p class="muted">Describe who you're looking for in plain language.</p></div><button class="btn" data-act="newChat">New search</button></div>
  <div class="alert info"><b>Rule-based assistant, no AI model connected.</b> It reads your message for subjects, days and times, then ranks real students and groups in this app with the same matching engine. It cannot contact anyone for you; you send requests yourself. A real language model would need a server and an API key (see README).</div>
  <div class="card"><div class="chat" id="chatlog" aria-live="polite">
    ${ui.chat.length ? ui.chat.map(e => e.role === 'me' ? `<div class="bubble me">${esc(e.text)}</div>` : botEntry(e, u)).join('') : `<div class="bubble bot ai-b">Hi ${esc(u.name.split(' ')[0])}! Tell me what you need help with and what you can teach. Try one of these:</div><div class="row">${PROMPTS.map(p => `<button class="chip ai" data-act="prompt" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div>`}
  </div>
  <form data-form="assistant" class="row" style="margin-top:12px"><label class="sr" for="aq">Your request</label><input id="aq" name="q" type="text" class="grow" placeholder="e.g. I can teach Python but need help with data structures" autocomplete="off" style="flex:1"><button class="btn ai" type="submit">${ic('send')} Send</button></form></div>`;
}

/* =====================================================================
   Study groups
   ===================================================================== */
function groupState(g, u) {
  if (g.members.includes(u.id)) return 'joined';
  if (g.pending.includes(u.id)) return 'pending';
  if (g.invited.includes(u.id)) return 'invited';
  if (g.members.length >= g.max) return 'full';
  if (g.approval === 'invite') return 'invite';
  return g.approval === 'request' ? 'request' : 'open';
}
const GL = { joined: 'Joined', pending: 'Request pending', invited: 'Accept invitation', full: 'Full', invite: 'Invite required', request: 'Request to join', open: 'Join group' };
const groupStateLabel = (g, u) => GL[groupState(g, u)];
function nextSession(g) { return db.sessions.filter(s => s.groupId === g.id && s.status === 'scheduled' && new Date(s.start) > Date.now()).sort((a, b) => new Date(a.start) - new Date(b.start))[0]; }
function groupCard(g, u) {
  const st = groupState(g, u), org = userById(g.owner), ns = nextSession(g);
  return `<article class="card"><div class="row between" style="align-items:flex-start"><div><h3>${esc(g.name)}</h3><div>${chips([g.subject, g.topic].filter(Boolean))}</div></div><span class="chip ${st === 'joined' ? 'teach' : st === 'pending' || st === 'invited' ? 'need' : ''}">${GL[st]}</span></div>
  <p class="small">${esc(g.desc)}</p>
  <div class="small muted">Organizer: ${esc(org?.name || 'Former student')}${org?.demo ? ' (demo)' : ''} · ${esc(g.college || '')} ${g.level ? '· ' + esc(g.level) : ''}</div>
  <div class="small muted">${g.members.length}/${g.max} members · ${esc(g.mode)} · ${esc(g.language || '')} · ${g.approval === 'open' ? 'open' : g.approval === 'request' ? 'approval required' : 'invite only'}</div>
  <div class="small ${ns ? '' : 'muted'}">${ns ? 'Next session: ' + fmtDT(ns.start) : 'No session scheduled yet'}</div>
  <div class="row" style="margin-top:12px"><button class="btn sm primary" data-act="openGroup" data-id="${g.id}">View group</button></div></article>`;
}
function filteredGroups(u) {
  const f = ui.gf, q = f.q.toLowerCase();
  return db.groups.filter(g => (!q || [g.name, g.subject, g.topic, g.desc, g.college].join(' ').toLowerCase().includes(q)) && (!f.subject || g.subject === f.subject) && (!f.mode || g.mode === f.mode) && (!f.approval || g.approval === f.approval));
}
function groupListHTML(u) {
  const l = filteredGroups(u);
  return l.length ? l.map(g => groupCard(g, u)).join('') : `<div class="card" style="grid-column:1/-1">${emptyState('No groups match', 'Clear a filter or create the group you were looking for.', '<button class="btn primary" data-act="newGroup">Create a group</button>')}</div>`;
}
function groupsView(u) {
  const f = ui.gf, names = [...new Set([...SUBJECTS, ...db.groups.map(g => g.subject)])];
  return `<div class="page-head"><div><h1>Study groups</h1><p class="muted">Join a group or start your own.</p></div><button class="btn primary" data-act="newGroup">${ic('plus')} Create group</button></div>
  <div class="card flat row" style="margin-bottom:14px"><div class="grow" style="min-width:180px"><label for="gf_q">Search groups</label><input id="gf_q" type="search" data-gf="q" value="${esc(f.q)}" placeholder="Name, subject, topic"></div>
  <div><label for="gf_s">Subject</label><select id="gf_s" data-gf="subject"><option value="">Any</option>${names.map(n => `<option ${f.subject === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
  <div><label for="gf_m">Mode</label><select id="gf_m" data-gf="mode"><option value="">Any</option><option value="online" ${f.mode === 'online' ? 'selected' : ''}>Online</option><option value="in-person" ${f.mode === 'in-person' ? 'selected' : ''}>In person</option></select></div>
  <div><label for="gf_a">Joining</label><select id="gf_a" data-gf="approval"><option value="">Any</option><option value="open" ${f.approval === 'open' ? 'selected' : ''}>Open</option><option value="request" ${f.approval === 'request' ? 'selected' : ''}>Approval required</option><option value="invite" ${f.approval === 'invite' ? 'selected' : ''}>Invite only</option></select></div></div>
  <div class="grid g2" id="grouplist">${groupListHTML(u)}</div>`;
}
function groupForm(g) {
  g = g || { name: '', subject: me().subjects[0]?.name || '', topic: '', desc: '', goals: '', max: 5, mode: 'online', language: me().prefs.language || 'English', days: [], approval: 'open', link: '' };
  const names = [...new Set([...SUBJECTS, g.subject].filter(Boolean))];
  return `<form data-form="group" data-id="${g.id || ''}" novalidate>${field('Group name', 'name', 'text', g.name, 'maxlength="80" required')}
  <div class="grid g2">${selectF('Subject', 'subject', names, g.subject)}${field('Topic', 'topic', 'text', g.topic)}</div>
  <div class="field"><label for="f_desc">Description</label><textarea id="f_desc" name="desc">${esc(g.desc)}</textarea></div>
  <div class="field"><label for="f_goals">Learning goals</label><textarea id="f_goals" name="goals">${esc(g.goals)}</textarea></div>
  <div class="grid g2">${field('Maximum members', 'max', 'number', g.max, 'min="2" max="50"')}${selectF('Format', 'mode', [['online', 'Online'], ['in-person', 'In person']], g.mode)}</div>
  <div class="grid g2">${field('Language', 'language', 'text', g.language)}${selectF('Joining', 'approval', [['open', 'Open: anyone can join'], ['request', 'Approval required'], ['invite', 'Invite only']], g.approval)}</div>
  <div class="field"><label>Usual days</label>${checkGroup('days', DAYS, g.days)}</div>
  ${field('Meeting link or location', 'link', 'text', g.link, '', 'Only shown to members.')}
  <button class="btn primary" type="submit">${g.id ? 'Save changes' : 'Create group'}</button></form>`;
}
function groupModal(g, u) {
  const own = g.owner === u.id, st = groupState(g, u), member = g.members.includes(u.id);
  const sess = db.sessions.filter(s => s.groupId === g.id && s.status !== 'cancelled');
  const partners = acceptedPartners(u.id).filter(id => !g.members.includes(id) && !g.invited.includes(id));
  let btn = '';
  if (st === 'joined' && !own) btn = `<button class="btn danger" data-act="leaveGroup" data-id="${g.id}">Leave group</button>`;
  else if (['open', 'request', 'invited'].includes(st)) btn = `<button class="btn primary" data-act="joinGroup" data-id="${g.id}">${GL[st]}</button>`;
  else if (st !== 'joined') btn = `<button class="btn" disabled>${GL[st]}</button>`;
  return `<div class="stack"><div>${chips([g.subject, g.topic].filter(Boolean))}<span class="chip">${esc(g.mode)}</span><span class="chip">${g.members.length}/${g.max} members</span></div>
  <p>${esc(g.desc)}</p>${g.goals ? `<p class="small"><b>Goals:</b> ${esc(g.goals)}</p>` : ''}
  <p class="small muted">${member ? 'Meeting: ' + esc(g.link || 'not set') : 'Meeting link or location is shown to members only.'}</p>
  <div class="row">${btn}${own ? `<button class="btn" data-act="editGroup" data-id="${g.id}">Edit</button><button class="btn" data-act="newSession" data-group="${g.id}">Schedule session</button><button class="btn danger" data-act="delGroup" data-id="${g.id}">Delete group</button>` : ''}</div>
  <div><h3>Members</h3>${g.members.map(id => { const m = userById(id); return `<div class="row" style="margin-bottom:6px">${avatar(m, 'sm')}<span class="grow">${esc(m?.name || 'Former student')}${m?.demo ? ' <span class="chip demo">Demo</span>' : ''}${id === g.owner ? ' <span class="chip">Organizer</span>' : ''}</span>${own && id !== u.id ? `<button class="btn sm danger" data-act="removeMember" data-id="${g.id}" data-u="${id}">Remove</button>` : ''}</div>`; }).join('')}</div>
  ${own && g.pending.length ? `<div><h3>Join requests</h3>${g.pending.map(id => `<div class="row" style="margin-bottom:6px"><span class="grow">${esc(userById(id)?.name || 'Student')}</span><button class="btn sm green" data-act="approveJoin" data-id="${g.id}" data-u="${id}">Approve</button><button class="btn sm" data-act="declineJoin" data-id="${g.id}" data-u="${id}">Decline</button></div>`).join('')}</div>` : ''}
  ${own && partners.length ? `<form data-form="invite" data-id="${g.id}" class="row"><label class="sr" for="inv">Invite a study partner</label><select id="inv" name="uid" class="grow" style="flex:1">${partners.map(id => `<option value="${id}">${esc(userById(id)?.name)}</option>`).join('')}</select><button class="btn sm" type="submit">Invite</button></form>` : ''}
  ${sess.length ? `<div><h3>Sessions</h3>${sess.map(s => `<div class="small">${esc(s.title)} · ${fmtDT(s.start)} · ${s.status}</div>`).join('')}</div>` : ''}</div>`;
}

/* =====================================================================
   Study sessions
   ===================================================================== */
function sessionStatus(s) {
  if (s.status === 'completed') return ['Completed', 'teach'];
  if (s.status === 'cancelled') return ['Cancelled', 'red'];
  return new Date(s.start) < Date.now() ? ['Time passed: update status', 'need'] : ['Upcoming', 'need'];
}
function sessionCard(s, u, compact) {
  const org = userById(s.organizer), g = s.groupId ? groupById(s.groupId) : null;
  const isOrg = s.organizer === u.id, inS = s.participants.includes(u.id), [lab, cls] = sessionStatus(s), out = s.outcomes[u.id];
  let acts = '';
  if (compact) acts = `<a class="btn sm" href="#/sessions">Open</a>`;
  else if (s.status === 'scheduled') {
    if (isOrg) acts = `<button class="btn sm" data-act="editSession" data-id="${s.id}">Edit</button><button class="btn sm green" data-act="completeSession" data-id="${s.id}">Mark completed</button><button class="btn sm danger" data-act="cancelSession" data-id="${s.id}">Cancel session</button>`;
    else if (inS) acts = `<button class="btn sm danger" data-act="leaveSession" data-id="${s.id}">Leave</button>`;
    else if (s.participants.length >= s.max) acts = `<button class="btn sm" disabled>Full</button>`;
    else if (g && !g.members.includes(u.id)) acts = `<button class="btn sm" data-act="openGroup" data-id="${g.id}">Join the group first</button>`;
    else acts = `<button class="btn sm primary" data-act="joinSession" data-id="${s.id}">Join session</button>`;
  } else if (s.status === 'completed' && inS) acts = `<button class="btn sm primary" data-act="recordOutcome" data-id="${s.id}">${out ? 'Edit my notes' : 'Record what I studied'}</button>`;
  return `<article class="card sess ${s.status === 'completed' ? 'done' : s.status === 'cancelled' ? 'cancel' : ''}"><div class="row between"><h3 style="margin:0">${esc(s.title)}</h3><span class="chip ${cls}">${lab}</span></div>
  <div>${chips([s.subject])}</div><div class="small muted">Host: ${esc(g ? g.name : org?.name || 'Student')}${!g && org?.demo ? ' (demo)' : ''}</div>
  <div class="small">${fmtDT(s.start)} · ${s.duration} min · ${esc(s.mode)}</div><div class="small muted">${s.participants.length}/${s.max} participants</div>
  ${!compact && inS && s.link ? `<div class="small"><b>${s.mode === 'online' ? 'Link' : 'Location'}:</b> ${esc(s.link)}</div>` : ''}
  ${!compact && s.topics ? `<div class="small muted">Topics: ${esc(s.topics)}</div>` : ''}
  ${out ? `<div class="comment small"><b>Your notes:</b> ${esc(out.covered || '')}${out.learned ? '<br>Learned: ' + esc(out.learned) : ''}${out.remaining ? '<br>Still difficult: ' + esc(out.remaining) : ''}${out.helped ? '<br>Did it help? ' + esc(out.helped) : ''}${out.rating ? ' · Rating ' + out.rating + '/5' : ''}</div>` : ''}
  ${acts ? `<div class="row" style="margin-top:10px">${acts}</div>` : ''}</article>`;
}
function sessionsView(u) {
  const t = ui.sessTab; let l;
  if (t === 'upcoming') l = db.sessions.filter(s => s.status === 'scheduled').sort((a, b) => new Date(a.start) - new Date(b.start));
  else if (t === 'completed') l = db.sessions.filter(s => s.status === 'completed' && s.participants.includes(u.id)).sort((a, b) => new Date(b.start) - new Date(a.start));
  else l = db.sessions.filter(s => s.status === 'cancelled' && (s.participants.includes(u.id) || s.organizer === u.id));
  return `<div class="page-head"><div><h1>Study sessions</h1><p class="muted">Times are shown in ${esc(TZ)}. A session is only completed when its organizer marks it so.</p></div><button class="btn primary" data-act="newSession">${ic('plus')} Create session</button></div>
  <div class="tabbar">${[['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled']].map(([k, n]) => `<button class="${t === k ? 'on' : ''}" data-act="sessTab" data-t="${k}">${n}</button>`).join('')}</div>
  <div class="grid g2">${l.map(s => sessionCard(s, u)).join('') || `<div class="card" style="grid-column:1/-1">${emptyState('Nothing here yet', t === 'upcoming' ? 'Plan a session and invite people to join.' : 'Sessions will appear here.', t === 'upcoming' ? '<button class="btn primary" data-act="newSession">Create a session</button>' : '')}</div>`}</div>`;
}
function sessionForm(s, preset) {
  const u = me(); const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0);
  s = s || { title: '', subject: preset?.subject || u.subjects[0]?.name || '', topics: '', desc: '', start: d.toISOString(), duration: 60, mode: 'online', link: '', groupId: preset?.group || '', max: 4, objectives: '' };
  const names = [...new Set([...SUBJECTS, s.subject].filter(Boolean))];
  const myG = db.groups.filter(g => g.members.includes(u.id));
  return `<form data-form="session" data-id="${s.id || ''}" novalidate>${field('Session title', 'title', 'text', s.title, 'maxlength="100" required')}
  <div class="grid g2">${selectF('Subject', 'subject', names, s.subject)}${field('Topics', 'topics', 'text', s.topics)}</div>
  <div class="field"><label for="f_desc">Description</label><textarea id="f_desc" name="desc">${esc(s.desc)}</textarea></div>
  <div class="grid g2">${field('Start date and time', 'start', 'datetime-local', toLocalInput(new Date(s.start)), 'required', 'Time zone: ' + esc(TZ))}${field('Duration (minutes)', 'duration', 'number', s.duration, 'min="10" max="480"')}</div>
  <div class="grid g2">${selectF('Format', 'mode', [['online', 'Online'], ['in-person', 'In person']], s.mode)}${field('Maximum participants', 'max', 'number', s.max, 'min="2" max="100"')}</div>
  ${field('Meeting link or location', 'link', 'text', s.link, '', 'Only shown to participants.')}
  ${selectF('Associated group (optional)', 'groupId', [['', 'None'], ...myG.map(g => [g.id, g.name])], s.groupId)}
  <div class="field"><label for="f_obj">Learning objectives</label><textarea id="f_obj" name="objectives">${esc(s.objectives)}</textarea></div>
  <button class="btn primary" type="submit">${s.id ? 'Save changes' : 'Create session'}</button></form>`;
}
function outcomeForm(s) {
  const o = s.outcomes[me().id] || {};
  return `<form data-form="outcome" data-id="${s.id}"><p class="small muted">Only you and your own records see this. Completing a session doesn't claim your grades improved.</p>
  <div class="field"><label for="f_covered">Topics covered and tasks completed</label><textarea id="f_covered" name="covered">${esc(o.covered || '')}</textarea></div>
  <div class="field"><label for="f_learned">What did you learn?</label><textarea id="f_learned" name="learned">${esc(o.learned || '')}</textarea></div>
  <div class="field"><label for="f_rem">Remaining difficulties</label><textarea id="f_rem" name="remaining">${esc(o.remaining || '')}</textarea></div>
  <div class="grid g2">${selectF('Did the session help?', 'helped', [['', 'Skip'], ['Yes', 'Yes'], ['Somewhat', 'Somewhat'], ['No', 'No']], o.helped || '')}${selectF('Rating (optional)', 'rating', [['', 'Skip'], ...[1, 2, 3, 4, 5].map(n => [n, n + ' / 5'])], o.rating || '')}</div>
  <label style="font-weight:500"><input type="checkbox" name="share"> Share a post about this session in the community feed</label>
  <button class="btn primary" type="submit" style="margin-top:12px">Save notes</button></form>`;
}

/* =====================================================================
   Inbox: notifications & study requests, then messages
   ===================================================================== */
function requestCard(r, u) {
  const incoming = r.to === u.id, o = userById(incoming ? r.from : r.to);
  const st = { pending: ['Pending', 'need'], accepted: ['Accepted', 'teach'], declined: ['Declined', 'red'], cancelled: ['Cancelled', ''] }[r.status];
  let acts = '';
  if (r.status === 'pending' && incoming) acts = `<button class="btn sm green" data-act="reqAnswer" data-id="${r.id}" data-a="accepted">Accept</button><button class="btn sm" data-act="reqAnswer" data-id="${r.id}" data-a="declined">Decline</button>`;
  if (r.status === 'pending' && !incoming) {
    acts = `<button class="btn sm danger" data-act="reqCancel" data-id="${r.id}">Cancel request</button>`;
    if (o?.demo) acts += `<button class="btn sm" data-act="demoReply" data-id="${r.id}" data-a="accepted">Demo: accept as ${esc(o.name.split(' ')[0])}</button><button class="btn sm ghost" data-act="demoReply" data-id="${r.id}" data-a="declined">Demo: decline</button>`;
  }
  if (r.status === 'accepted') acts = `<button class="btn sm" data-act="openChat" data-u="${o?.id}">Message</button>`;
  return `<article class="card"><div class="row" style="align-items:flex-start">${avatar(o)}<div class="grow"><b>${incoming ? 'From' : 'To'} ${esc(o?.name || 'Former student')}</b> ${o?.demo ? '<span class="chip demo">Demo</span>' : ''}<div class="small muted">${ago(r.created)} · ${esc(r.subject || 'General')} · ${esc(r.format)}${r.time ? ' · proposed ' + fmtDT(r.time) : ''}</div></div><span class="chip ${st[1]}">${st[0]}</span></div>
  ${r.message ? `<p class="small" style="margin-top:8px">${esc(r.message)}</p>` : ''}${acts ? `<div class="row" style="margin-top:8px">${acts}</div>` : ''}</article>`;
}
function inboxView(u) {
  const t = ui.inboxTab, ns = db.notifications.filter(n => n.user === u.id), un = ns.filter(n => !n.read).length;
  const reqs = db.requests.filter(r => r.from === u.id || r.to === u.id).sort((a, b) => new Date(b.created) - new Date(a.created));
  const pend = reqs.filter(r => r.status === 'pending' && r.to === u.id).length;
  const body = t === 'notifications'
    ? `<div class="row between" style="margin-bottom:10px"><span class="muted small">${un} unread</span><button class="btn sm" data-act="readAll" ${un ? '' : 'disabled'}>Mark all as read</button></div><div class="stack">${ns.map(n => `<article class="card ${n.read ? '' : 'sess'}" style="padding:12px 14px"><div class="row between"><div>${esc(n.text)}<div class="tiny muted">${ago(n.at)}</div></div><div class="row"><button class="btn sm" data-act="openNotif" data-id="${n.id}">Open</button>${n.read ? '' : `<button class="btn sm ghost" data-act="readOne" data-id="${n.id}">Mark read</button>`}</div></div></article>`).join('') || `<div class="card">${emptyState('You are all caught up', 'Requests, invitations and reminders will show up here.')}</div>`}</div>`
    : `<div class="stack">${reqs.map(r => requestCard(r, u)).join('') || `<div class="card">${emptyState('No study requests yet', 'Send a request from a match card to get started.', '<a class="btn primary" href="#/matches">Find a study partner</a>')}</div>`}</div>`;
  return `<div class="page-head"><h1>Notifications &amp; requests</h1></div><div class="tabbar"><button class="${t === 'notifications' ? 'on' : ''}" data-act="inboxTab" data-t="notifications">Notifications ${un ? `(${un})` : ''}</button><button class="${t === 'requests' ? 'on' : ''}" data-act="inboxTab" data-t="requests">Study requests ${pend ? `(${pend} new)` : ''}</button></div>${body}`;
}
const convId = (a, b) => [a, b].sort().join('|');
function messagesView(u) {
  const ps = acceptedPartners(u.id).map(userById).filter(Boolean);
  if (!ps.length) return `<div class="page-head"><h1>Messages</h1></div><div class="card">${emptyState('No conversations yet', 'You can message someone once a study request between you has been accepted. Contact details are never shared as a shortcut.', '<a class="btn primary" href="#/matches">Find a study partner</a>')}</div>`;
  if (!ui.conv || !ps.some(p => p.id === ui.conv)) ui.conv = ps[0].id;
  const o = userById(ui.conv), cid = convId(u.id, o.id);
  const msgs = db.messages.filter(m => m.conv === cid).sort((a, b) => new Date(a.at) - new Date(b.at));
  db.messages.forEach(m => { if (m.conv === cid && m.to === u.id) m.read = true; });
  return `<div class="page-head"><h1>Messages</h1></div><div class="msgs"><div class="card" style="padding:8px">${ps.map(p => { const un = db.messages.filter(m => m.from === p.id && m.to === u.id && !m.read).length; return `<button class="conv ${p.id === ui.conv ? 'on' : ''}" data-act="openChat" data-u="${p.id}">${avatar(p, 'sm')}<span class="grow">${esc(p.name)}</span>${un ? `<span class="badge">${un}</span>` : ''}</button>`; }).join('')}</div>
  <div class="card"><div class="row between"><b>${esc(o.name)}</b><span><button class="btn sm" data-act="ratePerson" data-u="${o.id}">Rate</button> <button class="btn sm ghost danger" data-act="blockUser" data-u="${o.id}">Block</button></span></div>
  ${o.demo ? '<div class="alert info small" style="margin-top:8px">Demo student: they will not reply in this prototype.</div>' : ''}
  <div class="chat" style="margin:12px 0;min-height:200px" id="thread">${msgs.map(m => `<div class="bubble ${m.from === u.id ? 'me' : 'bot'}">${esc(m.text)}<div class="tiny" style="opacity:.7">${ago(m.at)}</div></div>`).join('') || '<p class="muted small">No messages yet. Say hello!</p>'}</div>
  <form data-form="message" data-u="${o.id}" class="row"><label class="sr" for="msgtext">Message</label><input id="msgtext" name="text" type="text" class="grow" maxlength="1000" placeholder="Write a message" autocomplete="off" style="flex:1"><button class="btn primary" type="submit">${ic('send')} Send</button></form></div></div>`;
}

/* =====================================================================
   Profile
   ===================================================================== */
function trendChart(arr) {
  const w = 320, h = 110, pad = 22, xs = arr.map((_, i) => pad + i * ((w - 2 * pad) / (arr.length - 1))), ys = arr.map(r => h - pad - (r.p / 100) * (h - 2 * pad));
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:340px" role="img" aria-label="Score trend">${[0, 50, 100].map(v => `<line x1="${pad}" x2="${w - pad}" y1="${h - pad - v / 100 * (h - 2 * pad)}" y2="${h - pad - v / 100 * (h - 2 * pad)}" stroke="#e2e7ef"/><text x="2" y="${h - pad - v / 100 * (h - 2 * pad) + 4}" font-size="9" fill="#5f6b80">${v}</text>`).join('')}
  <polyline fill="none" stroke="#14213d" stroke-width="2" points="${xs.map((x, i) => x + ',' + ys[i]).join(' ')}"/>${xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3.5" fill="#1b8f63"><title>${esc(arr[i].name)}: ${arr[i].p}%</title></circle>`).join('')}</svg>`;
}
function resultsTable(u, own, list) {
  const rs = (list || u.results).slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  if (!rs.length) return own ? emptyState('No results added yet', 'Add recent and past results to track your own progress. They stay private.') : '';
  return `<div class="tablewrap"><table class="table"><thead><tr><th>Subject</th><th>Assessment</th><th>Result</th><th>%</th><th>Date / term</th>${own ? '<th>Shared</th><th></th>' : ''}</tr></thead><tbody>${rs.map(r => `<tr><td>${esc(r.subject)}</td><td>${esc(r.name)}${r.notes ? `<div class="tiny muted">${esc(r.notes)}</div>` : ''}</td><td>${resVal(r)}</td><td>${pct(r) !== null ? pct(r) + '%' : '—'}</td><td>${r.date ? fmtD(r.date) : ''}${r.term ? '<div class="tiny muted">' + esc(r.term) + '</div>' : ''}</td>${own ? `<td>${r.shared ? '<span class="chip teach">Shared</span>' : '<span class="chip">Private</span>'}</td><td style="white-space:nowrap"><button class="btn sm ghost" data-act="editResult" data-id="${r.id}">Edit</button><button class="btn sm ghost danger" data-act="delResult" data-id="${r.id}">${ic('trash')}<span class="sr">Delete</span></button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function resultForm(r) {
  r = r || { subject: '', name: '', system: 'marks', obtained: '', max: 100, grade: '', date: '', term: '', notes: '', shared: false }; const u = me();
  return `<form data-form="result" data-id="${r.id || ''}" data-sys="${r.system}" novalidate>
  <div class="field"><label for="f_subject">Subject</label><input id="f_subject" name="subject" list="subjlist" value="${esc(r.subject)}" required><datalist id="subjlist">${[...new Set([...SUBJECTS, ...u.subjects.map(s => s.name)])].map(s => `<option value="${esc(s)}">`).join('')}</datalist><div class="err" data-for="subject"></div></div>
  ${field('Assessment or exam name', 'name', 'text', r.name, 'placeholder="e.g. Midterm"')}
  ${selectF('Grading system', 'system', [['marks', 'Marks (obtained / maximum)'], ['percentage', 'Percentage'], ['gpa', 'GPA / CGPA'], ['grade', 'Letter or other grade']], r.system, 'data-sysselect')}
  <div class="grid g2"><div class="sys-num">${field('Obtained', 'obtained', 'number', r.obtained, 'step="any" min="0"')}</div><div class="sys-max">${field('Maximum', 'max', 'number', r.max, 'step="any" min="0"', 'For GPA enter the scale, e.g. 4 or 10.')}</div></div>
  <div class="sys-grade">${field('Grade', 'grade', 'text', r.grade)}</div>
  <div class="grid g2">${field('Date', 'date', 'date', r.date)}${field('Semester or term', 'term', 'text', r.term)}</div>
  ${field('Notes (optional)', 'notes', 'text', r.notes)}
  <label style="font-weight:500"><input type="checkbox" name="shared" ${r.shared ? 'checked' : ''}> Allow other students to see this result (only if "Marks" visibility is also on in Settings)</label>
  <div class="row" style="margin-top:12px"><button class="btn primary" type="submit">${r.id ? 'Save changes' : 'Add result'}</button></div></form>`;
}
function applySys(form) {
  const s = form.querySelector('[name=system]').value; form.dataset.sys = s;
  $('.sys-num', form).classList.toggle('hidden', s === 'grade'); $('.sys-max', form).classList.toggle('hidden', s === 'grade' || s === 'percentage'); $('.sys-grade', form).classList.toggle('hidden', s !== 'grade');
}
function profileView(u, r) {
  const t = r.arg && r.arg !== u.id ? userById(r.arg) : u;
  if (!t) return `<div class="card">${emptyState('Profile not found', 'This student may have deleted their account.', '<a class="btn" href="#/home">Back home</a>')}</div>`;
  if (t.id !== u.id && isBlocked(u.id, t.id)) return `<div class="card">${emptyState('Profile unavailable', 'You cannot view this profile.')}</div>`;
  const own = t.id === u.id, pv = t.privacy, restricted = !own && pv.profile === 'restricted';
  const partner = acceptedPartners(u.id).includes(t.id);
  const showSubjects = own || (pv.subjects && !restricted), showAvail = own || (pv.availability && !restricted);
  const teach = t.subjects.filter(s => s.level >= 4 && !s.improve).map(s => s.name), need = [...needsOf(t)];
  const sharedRes = t.results.filter(x => x.shared && pv.marks);
  const by = {}; t.results.forEach(x => { const p = pct(x); if (p !== null && (own || sharedRes.includes(x))) (by[x.subject] = by[x.subject] || []).push({ ...x, p }); });
  const charts = Object.entries(by).filter(([, a]) => a.length >= 3).map(([s, a]) => { a.sort((x, y) => new Date(x.date) - new Date(y.date)); return `<div><b class="small">${esc(s)}</b>${trendChart(a)}</div>`; }).join('');
  const comps = own ? progressList(t) : [];
  return `<div class="stack">
  <section class="card"><div class="row" style="align-items:flex-start">${avatar(t, 'lg')}<div class="grow"><h1 style="margin-bottom:2px">${esc(t.name)} ${t.demo ? '<span class="chip demo">Demo</span>' : ''}</h1>
  <div class="muted">${own || (pv.college && !restricted) ? esc([t.college, t.dept, t.course !== t.dept ? t.course : '', t.year].filter(Boolean).join(' · ')) : 'Institution not shared'}</div>
  ${(own || pv.location) && t.location ? `<div class="small muted">${esc(t.location)}</div>` : ''}${restricted ? '<div class="small muted">This student has a restricted profile.</div>' : `<p style="margin-top:8px">${esc(t.bio)}</p>`}
  ${partner && pv.contact && t.email ? `<div class="small">Contact: ${esc(t.email)}</div>` : ''}</div>
  <div class="row">${own ? `<button class="btn primary" data-act="editProfile">Edit profile</button>` : `<button class="btn primary" data-act="reqModal" data-to="${t.id}" data-subject="">Send study request</button><button class="btn" data-act="blockUser" data-u="${t.id}">Block</button><button class="btn ghost" data-act="reportUser" data-u="${t.id}">${ic('flag')} Report</button>`}</div></div></section>
  ${ratingsSection(t, own, partner, restricted)}
  ${showSubjects ? `<section class="card"><div class="row between"><h3>Subjects and levels</h3>${own ? '<button class="btn sm" data-act="addSubject">Add subject</button>' : ''}</div>
  <p class="small"><b>Can teach:</b> ${chips(teach, 'teach') || '—'}</p><p class="small"><b>Wants help with:</b> ${chips(need, 'need') || '—'}</p>
  <div class="tablewrap"><table class="table"><thead><tr><th>Subject</th><th>Level</th><th>Notes</th>${own ? '<th></th>' : ''}</tr></thead><tbody>${t.subjects.map((s, i) => `<tr><td>${esc(s.name)}</td><td>${LEVELS[s.level - 1]}${s.improve ? ' · improving' : ''}</td><td>${esc(s.note)}</td>${own ? `<td style="white-space:nowrap"><button class="btn sm ghost" data-act="editSubject" data-i="${i}">Edit</button><button class="btn sm ghost danger" data-act="delSubject" data-i="${i}">${ic('trash')}<span class="sr">Remove</span></button></td>` : ''}</tr>`).join('') || '<tr><td colspan="4" class="muted">No subjects yet.</td></tr>'}</tbody></table></div></section>` : ''}
  ${showAvail ? `<section class="card"><div class="row between"><h3>Study preferences and availability</h3>${own ? '<button class="btn sm" data-act="editPrefs">Edit</button>' : ''}</div><p class="small">${esc(prefSummary(t.prefs))}</p>${t.prefs.goals ? `<p class="small"><b>Goals:</b> ${esc(t.prefs.goals)}</p>` : ''}</section>` : ''}
  ${own ? `<section class="card"><div class="row between"><h3>Marks and academic history ${ic('lock')}</h3><button class="btn sm primary" data-act="addResult">${ic('plus')} Add result</button></div><p class="small muted">Private by default. Percentages are calculated as obtained ÷ maximum × 100 for marks and percentage results.</p>
  ${comps.length ? `<div class="alert ok small">${comps.map(c => `<div><b>${esc(c.subject)}:</b> ${c.last.p}% (${esc(c.last.name)}) vs ${c.prev.p}% (${esc(c.prev.name)}), a change of ${Math.round((c.last.p - c.prev.p) * 10) / 10} points. Different assessments may not be directly comparable.</div>`).join('')}</div>` : ''}
  ${resultsTable(t, true)}${charts ? `<div class="grid g2" style="margin-top:12px">${charts}</div>` : (t.results.length ? '<p class="small muted">Trend charts appear once a subject has 3 or more percentage-based results.</p>' : '')}</section>
  <section class="card"><h3>School or college ID card ${ic('lock')}</h3><p class="small muted">Optional and private: it is never shown on your profile or in the feed. Uploading it does <b>not</b> verify you; institutional verification would be a separate process.</p>
  ${t.idCard ? `<div class="row"><img src="${t.idCard.dataUrl}" alt="Your uploaded ID card preview" style="max-width:220px;border-radius:10px;border:1px solid var(--line)"><div><div class="chip">Not verified</div><div class="small muted">${esc(t.idCard.name)}</div></div></div><div class="row" style="margin-top:10px"><label class="btn sm" for="idfile">Replace</label><button class="btn sm danger" data-act="removeId">Remove</button></div>` : '<label class="btn" for="idfile">Upload image</label>'}
  <input id="idfile" class="sr" type="file" accept="image/png,image/jpeg,image/webp" data-idfile><div class="help">PNG, JPG or WebP, up to 1 MB. Stored only in this browser in the prototype.</div></section>` : sharedRes.length ? `<section class="card"><h3>Results shared with you</h3>${resultsTable(t, false, sharedRes)}</section>` : ''}
  </div>`;
}

/* =====================================================================
   Settings & search
   ===================================================================== */
function settingsView(u) {
  const sw = (key, label, help, on, attr = 'data-priv') => `<label class="switch"><span><b>${label}</b><div class="small muted">${help}</div></span><input type="checkbox" ${attr}="${key}" ${on ? 'checked' : ''}></label>`;
  const blocked = db.blocks.filter(b => b.by === u.id);
  return `<div class="page-head"><h1>Settings</h1></div><div class="stack">
  <section class="card"><h3>Account</h3><form data-form="account" novalidate><div class="grid g2">${field('Name', 'name', 'text', u.name)}${field('Email', 'email', 'email', u.email || '')}</div><button class="btn primary" type="submit">Save account</button></form></section>
  <section class="card"><h3>Change password</h3><form data-form="password" novalidate><div class="grid g2">${pwField('current', 'Current password')}${pwField('next', 'New password')}</div><button class="btn" type="submit">Update password</button></form><p class="small muted">Connected sign-in providers: none (email and password only in this prototype). Active session: this browser.</p></section>
  <section class="card"><h3>Profile privacy</h3>${sw('profile', 'Public profile', 'Turn off to hide yourself from recommendations and show only your name.', u.privacy.profile === 'public')}${sw('college', 'Show college and department', '', u.privacy.college)}${sw('location', 'Show location', 'Never shared as live location.', u.privacy.location)}${sw('subjects', 'Show subjects and levels', 'Needed to appear in matches.', u.privacy.subjects)}${sw('availability', 'Show availability', '', u.privacy.availability)}${sw('marks', 'Allow sharing of marks', 'Only results you mark as shared are visible. Off = nothing is visible.', u.privacy.marks)}${sw('contact', 'Show email to accepted study partners', 'Never shown publicly.', u.privacy.contact)}</section>
  <section class="card"><h3>Study preferences</h3><p class="small">${esc(prefSummary(u.prefs))}</p><button class="btn" data-act="editPrefs">Edit preferences</button> <a class="btn" href="#/profile">Edit subjects</a></section>
  <section class="card"><h3>Notifications</h3>${sw('inapp', 'In-app notifications', '', u.notif.inapp !== false, 'data-np')}${sw('reminders', 'Session reminders (within 24 hours)', 'Shown in-app when you open StudyMatch.', u.notif.reminders !== false, 'data-np')}<p class="small muted">Email, push and SMS notifications need a backend and are not available in this prototype.</p></section>
  <section class="card"><h3>Safety</h3>${blocked.map(b => `<div class="row between" style="margin-bottom:6px"><span>${esc(userById(b.target)?.name || 'Student')}</span><button class="btn sm" data-act="unblock" data-u="${b.target}">Unblock</button></div>`).join('') || '<p class="muted small">You haven\'t blocked anyone.</p>'}<p class="small muted">Reports you submit: ${db.reports.filter(r => r.by === u.id).length}. Reports are stored locally; there is no moderation team in this prototype.</p></section>
  <section class="card"><h3>Delete account</h3><p class="small">Deletes your profile, marks, ratings, uploaded ID image, posts, requests, messages and memberships from this browser immediately.</p><button class="btn danger" data-act="deleteAccount">Delete my account</button></section></div>`;
}
function searchView(u, r) {
  const q = (r.q.get('q') || '').trim(), ql = q.toLowerCase();
  if (!q) return `<div class="card">${emptyState('Search StudyMatch', 'Type in the search bar to find students, groups, sessions and posts.')}</div>`;
  const has = (...a) => a.join(' ').toLowerCase().includes(ql);
  const stu = candidates(u).filter(o => has(o.name, o.college, o.dept, o.subjects.map(s => s.name).join(' ')));
  const grp = db.groups.filter(g => has(g.name, g.subject, g.topic, g.desc));
  const ses = db.sessions.filter(s => s.status !== 'cancelled' && has(s.title, s.subject, s.topics));
  const pst = db.posts.filter(p => !isBlocked(u.id, p.author) && has(p.title, p.desc, p.subjects.join(' ')));
  const sec = (t, a, f) => a.length ? `<section><h2>${t}</h2><div class="grid g2">${a.map(f).join('')}</div></section>` : '';
  const none = !stu.length && !grp.length && !ses.length && !pst.length;
  return `<div class="page-head"><h1>Results for “${esc(q)}”</h1></div><div class="stack">
  ${sec('Students', stu, o => matchCard(o, matchScore(u, o), u))}${sec('Study groups', grp, g => groupCard(g, u))}${sec('Sessions', ses, s => sessionCard(s, u, true))}${sec('Posts', pst, p => postCard(p, u))}
  ${none ? `<div class="card">${emptyState('No results', 'Check the spelling or try a subject name like “Mathematics”.')}</div>` : ''}</div>`;
}

/* =====================================================================
   Actions (clicks)
   ===================================================================== */
const A = {};
const showGroup = id => { const g = groupById(id); if (g) openModal(g.name, groupModal(g, me()), true); };
const refreshGroup = id => { render(); showGroup(id); };

A.closeModal = closeModal;
A.confirmYes = () => { const cb = ui.confirmCb; ui.confirmCb = null; closeModal(); if (cb) cb(); };
A.toggleMenu = () => $('#menu').classList.toggle('hidden');
A.logout = logout;
A.authTab = d => { ui.tab = d.t; render(); };
A.togglePw = (d, el) => { const i = el.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; };
A.wipeAll = () => confirmBox('This deletes every account and all data stored by this prototype in this browser.', () => { localStorage.removeItem(KEY); db = seed(); ui.tab = 'signin'; shellFor = null; location.hash = '#/'; render(); toast('Prototype data cleared.'); }, 'Clear everything');

/* onboarding */
A.obBack = () => { syncOb($('#obform')); ui.obStep = Math.max(0, ui.obStep - 1); render(); };
A.obNext = d => obNext(!!d.skip);
A.obFinish = obFinish;
A.obGo = d => { syncOb($('#obform')); ui.obStep = Number(d.s); render(); };
A.obToggleSubject = d => {
  syncOb($('#obform')); const u = me(), i = u.subjects.findIndex(s => s.name === d.s);
  if (i >= 0) u.subjects.splice(i, 1); else u.subjects.push({ name: d.s, level: 3, improve: false, note: '' });
  render();
};
A.obAddCustom = () => {
  syncOb($('#obform')); const u = me(), n = $('#customSub').value.trim();
  if (!n) return toast('Type a subject name first.', 'error');
  if (n.length > 40) return toast('Subject names can be up to 40 characters.', 'error');
  if (!u.subjects.some(s => s.name.toLowerCase() === n.toLowerCase())) u.subjects.push({ name: n, level: 3, improve: false, note: '' });
  render();
};

/* feed & posts */
A.feedFilter = d => { ui.feedFilter = d.f; render(); };
A.like = d => { const p = db.posts.find(x => x.id === d.id), u = me(); const i = p.likes.indexOf(u.id); if (i >= 0) p.likes.splice(i, 1); else p.likes.push(u.id); render(); };
A.toggleComments = d => { ui.openC[d.id] = !ui.openC[d.id]; render(); };
A.savePost = d => { const p = db.posts.find(x => x.id === d.id), u = me(); const i = p.saves.indexOf(u.id); if (i >= 0) p.saves.splice(i, 1); else p.saves.push(u.id); toast(i >= 0 ? 'Removed from saved posts.' : 'Post saved.'); render(); };
A.newPost = () => openModal('Create a post', postForm());
A.editPost = d => { const p = db.posts.find(x => x.id === d.id); if (p && p.author === me().id) openModal('Edit post', postForm(p)); };
A.delPost = d => confirmBox('Delete this post? This cannot be undone.', () => { const p = db.posts.find(x => x.id === d.id); if (!p || p.author !== me().id) return toast('You can only delete your own posts.', 'error'); db.posts = db.posts.filter(x => x.id !== d.id); render(); toast('Post deleted.', 'success'); }, 'Delete post');
A.reportPost = d => confirmBox('Report this post? It will be hidden for you and recorded as reported.', () => { const p = db.posts.find(x => x.id === d.id), u = me(); db.reports.push({ id: uid('rp'), by: u.id, type: 'post', target: d.id, at: nowISO() }); p.reports.push(u.id); render(); toast('Reported. The post is now hidden for you.'); }, 'Report');

/* matches & requests */
A.matchTab = d => { ui.matchTab = d.t; render(); };
A.saveMatch = d => { const u = me(), i = db.saved.findIndex(s => s.by === u.id && s.target === d.id); if (i >= 0) db.saved.splice(i, 1); else db.saved.push({ by: u.id, target: d.id, at: nowISO() }); toast(i >= 0 ? 'Removed from saved.' : 'Match saved.'); render(); };
A.dismiss = d => { db.dismissed.push({ by: me().id, target: d.id }); toast('Got it. We won\'t suggest this person again.'); render(); };
A.reqModal = d => {
  const u = me(), o = userById(d.to); if (!o) return;
  if (isBlocked(u.id, o.id)) return toast('You can\'t send a request to this student.', 'error');
  const names = [...new Set([...SUBJECTS, ...u.subjects.map(s => s.name), ...o.subjects.map(s => s.name)])];
  openModal('Send a study request to ' + o.name.split(' ')[0], `<form data-form="request" data-to="${o.id}" novalidate>${selectF('Subject', 'subject', names, d.subject || names[0])}
  ${selectF('Proposed format', 'format', [['online', 'Online'], ['in-person', 'In person']], 'online')}
  ${field('Proposed time (optional)', 'time', 'datetime-local', '')}
  <div class="field"><label for="f_message">Message (optional)</label><textarea id="f_message" name="message" maxlength="400" placeholder="Say what you'd like to work on"></textarea></div>
  <p class="small muted">${o.demo ? 'This is a demo student. After sending, use the "Demo" buttons under Study requests to simulate their reply.' : 'They will see your request and can accept or decline.'}</p>
  <div class="err alert" data-for="_form"></div><button class="btn primary" type="submit">Send request</button></form>`);
};
A.reqAnswer = d => { const r = db.requests.find(x => x.id === d.id), u = me(); if (!r || r.to !== u.id || r.status !== 'pending') return toast('This request can no longer be changed.', 'error'); r.status = d.a; notify(r.from, `${u.name} ${d.a} your study request.`, 'inbox'); toast('Request ' + d.a + '.', 'success'); render(); };
A.reqCancel = d => { const r = db.requests.find(x => x.id === d.id); if (!r || r.from !== me().id || r.status !== 'pending') return; r.status = 'cancelled'; toast('Request cancelled.'); render(); };
A.demoReply = d => { const r = db.requests.find(x => x.id === d.id), o = userById(r.to); if (!r || r.status !== 'pending' || !o?.demo) return; r.status = d.a; notify(r.from, `${o.name} ${d.a} your study request (demo reply).`, 'inbox'); toast('Demo reply recorded.'); render(); };
A.inboxTab = d => { ui.inboxTab = d.t; render(); };
A.readAll = () => { const u = me(); db.notifications.forEach(n => { if (n.user === u.id) n.read = true; }); render(); };
A.readOne = d => { const n = db.notifications.find(x => x.id === d.id); if (n) n.read = true; render(); };
A.openNotif = d => { const n = db.notifications.find(x => x.id === d.id); if (n) { n.read = true; go(n.link || 'inbox'); } };
A.openChat = d => { ui.conv = d.u; go('messages'); };
A.blockUser = d => confirmBox('Block this student? You will no longer see each other, and pending requests between you are cancelled.', () => {
  const u = me(); db.blocks.push({ by: u.id, target: d.u }); db.requests.forEach(r => { if (r.status === 'pending' && ((r.from === u.id && r.to === d.u) || (r.from === d.u && r.to === u.id))) r.status = 'cancelled'; });
  ui.conv = null; toast('Student blocked.'); go('home');
}, 'Block');
A.unblock = d => { db.blocks = db.blocks.filter(b => !(b.by === me().id && b.target === d.u)); toast('Unblocked.'); render(); };
A.ratePerson = d => { const u = me(), t = userById(d.u); if (!t || t.id === u.id) return; if (!acceptedPartners(u.id).includes(t.id)) return toast('You can rate someone after a study request between you is accepted.', 'error'); openModal('Rate ' + t.name.split(' ')[0], rateForm(t)); };
A.reportUser = d => confirmBox('Report this student for review?', () => { db.reports.push({ id: uid('rp'), by: me().id, type: 'user', target: d.u, at: nowISO() }); toast('Report recorded.'); }, 'Report');

/* assistant */
function runAssistant(text, broaden) {
  text = text.trim(); if (!text) return;
  if (!broaden) ui.chat.push({ role: 'me', text });
  ui.chat.push(Object.assign({ role: 'bot' }, assistantRespond(text, broaden)));
  render(); $('#aq')?.focus();
}
A.prompt = d => runAssistant(d.p);
A.broaden = () => { if (ui.lastParsed) runAssistant(ui.lastParsed.text, true); };
A.newChat = () => { ui.chat = []; ui.lastParsed = null; render(); };

/* groups */
A.newGroup = () => openModal('Create a study group', groupForm(), true);
A.openGroup = d => showGroup(d.id);
A.editGroup = d => { const g = groupById(d.id); if (g && g.owner === me().id) openModal('Edit group', groupForm(g), true); };
A.delGroup = d => confirmBox('Delete this group? Its scheduled sessions will be cancelled.', () => {
  const g = groupById(d.id), u = me(); if (!g || g.owner !== u.id) return toast('Only the organizer can delete this group.', 'error');
  db.sessions.forEach(s => { if (s.groupId === g.id && s.status === 'scheduled') { s.status = 'cancelled'; s.participants.forEach(p => p !== u.id && notify(p, `"${s.title}" was cancelled because the group was deleted.`, 'sessions')); } });
  db.posts.forEach(p => { if (p.groupId === g.id) p.groupId = ''; });
  db.groups = db.groups.filter(x => x.id !== g.id); render(); toast('Group deleted.', 'success');
}, 'Delete group');
A.joinGroup = d => {
  const g = groupById(d.id), u = me(), st = groupState(g, u);
  if (st === 'open' || st === 'invited') {
    if (g.members.length >= g.max) return toast('This group is full.', 'error');
    if (g.members.includes(u.id)) return;
    g.invited = g.invited.filter(x => x !== u.id); g.members.push(u.id); notify(g.owner, `${u.name} joined ${g.name}.`, 'groups'); toast('You joined ' + g.name + '.', 'success');
  } else if (st === 'request') { g.pending.push(u.id); notify(g.owner, `${u.name} asked to join ${g.name}.`, 'groups'); toast('Request sent to the organizer.', 'success'); }
  else return toast('You can\'t join this group right now.', 'error');
  refreshGroup(g.id);
};
A.leaveGroup = d => confirmBox('Leave this group?', () => {
  const g = groupById(d.id), u = me(); g.members = g.members.filter(x => x !== u.id);
  db.sessions.forEach(s => { if (s.groupId === g.id && s.status === 'scheduled') s.participants = s.participants.filter(x => x !== u.id); });
  render(); toast('You left the group.'); }, 'Leave');
A.removeMember = d => confirmBox('Remove this member from the group?', () => {
  const g = groupById(d.id); if (!g || g.owner !== me().id || d.u === g.owner) return;
  g.members = g.members.filter(x => x !== d.u); db.sessions.forEach(s => { if (s.groupId === g.id && s.status === 'scheduled') s.participants = s.participants.filter(x => x !== d.u); });
  notify(d.u, `You were removed from ${g.name}.`, 'groups'); refreshGroup(g.id); toast('Member removed.'); }, 'Remove');
A.approveJoin = d => {
  const g = groupById(d.id); if (!g || g.owner !== me().id) return;
  if (g.members.length >= g.max) return toast('The group is full. Raise the capacity first.', 'error');
  g.pending = g.pending.filter(x => x !== d.u); if (!g.members.includes(d.u)) g.members.push(d.u);
  notify(d.u, `You were approved to join ${g.name}.`, 'groups'); toast('Member approved.', 'success'); refreshGroup(g.id);
};
A.declineJoin = d => { const g = groupById(d.id); if (!g || g.owner !== me().id) return; g.pending = g.pending.filter(x => x !== d.u); notify(d.u, `Your request to join ${g.name} was declined.`, 'groups'); refreshGroup(g.id); };

/* sessions */
A.newSession = d => openModal('Create a study session', sessionForm(null, { subject: d.subject, group: d.group }), true);
A.sessTab = d => { ui.sessTab = d.t; render(); };
A.editSession = d => { const s = sessionById(d.id); if (s && s.organizer === me().id) openModal('Edit session', sessionForm(s), true); };
A.cancelSession = d => confirmBox('Cancel this session? Participants will be notified.', () => {
  const s = sessionById(d.id), u = me(); if (!s || s.organizer !== u.id) return toast('Only the organizer can cancel.', 'error');
  s.status = 'cancelled'; s.participants.forEach(p => p !== u.id && notify(p, `"${s.title}" was cancelled.`, 'sessions')); render(); toast('Session cancelled.'); }, 'Cancel session');
A.completeSession = d => {
  const s = sessionById(d.id), future = new Date(s.start) > Date.now();
  confirmBox(future ? 'This session is scheduled for the future. Mark it as completed anyway?' : 'Mark this session as completed? Participants can then record what they studied.', () => {
    const u = me(); if (!s || s.organizer !== u.id) return toast('Only the organizer can complete a session.', 'error');
    s.status = 'completed'; s.participants.forEach(p => p !== u.id && notify(p, `"${s.title}" was marked completed. Record what you studied.`, 'sessions')); ui.sessTab = 'completed'; render(); toast('Session completed. Add your notes.', 'success'); }, 'Mark completed');
};
A.joinSession = d => {
  const s = sessionById(d.id), u = me(), g = s.groupId ? groupById(s.groupId) : null;
  if (s.status !== 'scheduled') return toast('This session is no longer open.', 'error');
  if (s.participants.includes(u.id)) return;
  if (s.participants.length >= s.max) return toast('This session is full.', 'error');
  if (g && !g.members.includes(u.id)) return toast('Join the group first.', 'error');
  s.participants.push(u.id); notify(s.organizer, `${u.name} joined "${s.title}".`, 'sessions'); toast('You joined the session.', 'success'); render();
};
A.leaveSession = d => { const s = sessionById(d.id), u = me(); s.participants = s.participants.filter(x => x !== u.id); notify(s.organizer, `${u.name} left "${s.title}".`, 'sessions'); toast('You left the session.'); render(); };
A.recordOutcome = d => { const s = sessionById(d.id); if (s && s.participants.includes(me().id) && s.status === 'completed') openModal('What did you study?', outcomeForm(s)); };

/* profile */
A.editProfile = () => { const u = me(); $('#menu')?.classList.add('hidden'); openModal('Edit profile', `<form data-form="profile" novalidate>${field('Full name', 'name', 'text', u.name)}${field('School or college', 'college', 'text', u.college)}
  <div class="grid g2">${field('Department', 'dept', 'text', u.dept)}${field('Course or degree', 'course', 'text', u.course)}</div><div class="grid g2">${field('Academic year / semester', 'year', 'text', u.year)}${field('Location', 'location', 'text', u.location)}</div>
  <div class="field"><label for="f_bio">Bio</label><textarea id="f_bio" name="bio" maxlength="300">${esc(u.bio)}</textarea></div><button class="btn primary" type="submit">Save changes</button></form>`); };
const subjectForm = i => {
  const u = me(), s = i === undefined ? { name: '', level: 3, improve: false, note: '' } : u.subjects[i];
  return `<form data-form="subject" data-i="${i ?? ''}" novalidate><div class="field"><label for="f_name">Subject</label><input id="f_name" name="name" list="sl" value="${esc(s.name)}" ${i !== undefined ? 'readonly' : ''}><datalist id="sl">${SUBJECTS.map(x => `<option value="${x}">`).join('')}</datalist><div class="err" data-for="name"></div></div>
  ${selectF('Current level', 'level', LEVELS.map((l, k) => [k + 1, l]), s.level)}<label style="font-weight:500"><input type="checkbox" name="improve" ${s.improve ? 'checked' : ''}> I want to improve this subject</label>
  ${field('What do you struggle with, or what can you teach?', 'note', 'text', s.note)}<button class="btn primary" type="submit">Save subject</button></form>`;
};
A.addSubject = () => openModal('Add subject', subjectForm());
A.editSubject = d => openModal('Edit subject', subjectForm(Number(d.i)));
A.delSubject = d => confirmBox('Remove this subject from your profile?', () => { me().subjects.splice(Number(d.i), 1); render(); toast('Subject removed.'); }, 'Remove');
A.editPrefs = () => openModal('Study preferences', `<form data-form="prefs">${prefFields(me().prefs)}<button class="btn primary" type="submit">Save preferences</button></form>`);
A.addResult = () => openModal('Add a result', resultForm());
A.editResult = d => openModal('Edit result', resultForm(me().results.find(r => r.id === d.id)));
A.delResult = d => confirmBox('Delete this result?', () => { const u = me(); u.results = u.results.filter(r => r.id !== d.id); render(); toast('Result deleted.'); }, 'Delete');
A.removeId = () => confirmBox('Remove your uploaded ID card image?', () => { me().idCard = null; render(); toast('ID card removed.'); }, 'Remove');
A.deleteAccount = () => openModal('Delete your account', `<form data-form="delete"><p>This permanently removes your data from this browser. Type <b>DELETE</b> to confirm.</p><div class="field"><label for="f_confirm" class="sr">Type DELETE</label><input id="f_confirm" name="confirm" type="text" autocomplete="off"><div class="err" data-for="confirm"></div></div><button class="btn danger" type="submit">Permanently delete my account</button></form>`);

document.addEventListener('click', e => {
  const menu = $('#menu'); if (menu && !menu.classList.contains('hidden') && !e.target.closest('#menu') && !e.target.closest('[data-act=toggleMenu]')) menu.classList.add('hidden');
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const fn = A[t.dataset.act]; if (!fn) return;
  if (t.tagName === 'A') e.preventDefault();
  try { fn(t.dataset, t); } catch (err) { console.error(err); toast('Something went wrong. Please try again.', 'error'); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && e.target.id === 'customSub') { e.preventDefault(); A.obAddCustom(); }
});

/* =====================================================================
   Forms (submits)
   ===================================================================== */
const FORMS = {};
FORMS.signin = f => doSignin(f);
FORMS.signup = f => doSignup(f);
FORMS.ob = () => obNext(false);
FORMS.comment = (f, d) => {
  const t = new FormData(f).get('text').trim(); if (!t) return;
  const p = db.posts.find(x => x.id === d.id), u = me(); p.comments.push({ id: uid('c'), by: u.id, text: t, at: nowISO() });
  if (p.author !== u.id) notify(p.author, `${u.name} commented on your post "${p.title}".`, 'home'); render();
};
FORMS.post = (f, d) => {
  const fd = new FormData(f), u = me(), errs = {}, title = fd.get('title').trim(), desc = fd.get('desc').trim();
  if (title.length < 3) errs.title = 'Enter a title of at least 3 characters.';
  if (desc.length < 5) errs.desc = 'Add a short description.';
  if (Object.keys(errs).length) return showErrors(f, errs);
  const data = { type: fd.get('type'), title, desc, subjects: fd.getAll('subjects'), groupId: fd.get('groupId') || '', sessionId: fd.get('sessionId') || '' };
  if (d.id) { const p = db.posts.find(x => x.id === d.id); if (!p || p.author !== u.id) return toast('You can only edit your own posts.', 'error'); Object.assign(p, data); toast('Post updated.', 'success'); }
  else { db.posts.unshift({ id: uid('p'), author: u.id, created: nowISO(), likes: [], saves: [], comments: [], reports: [], ...data }); toast('Post published.', 'success'); }
  render();
};
FORMS.request = (f, d) => {
  const fd = new FormData(f), u = me(), o = userById(d.to), subject = fd.get('subject');
  if (!o || isBlocked(u.id, o.id)) return showErrors(f, { _form: 'You can\'t send a request to this student.' });
  if (activeReq(u.id, o.id, subject)) return showErrors(f, { _form: 'You already have a pending request to this student for ' + subject + '.' });
  const time = fd.get('time') ? new Date(fd.get('time')).toISOString() : '';
  db.requests.push({ id: uid('r'), from: u.id, to: o.id, subject, message: fd.get('message').trim(), format: fd.get('format'), time, status: 'pending', created: nowISO() });
  notify(o.id, `${u.name} sent you a study request for ${subject}.`, 'inbox'); closeModal(); toast('Request sent to ' + o.name.split(' ')[0] + '.', 'success'); render();
};
FORMS.group = (f, d) => {
  const fd = new FormData(f), u = me(), errs = {}, name = fd.get('name').trim(), max = Number(fd.get('max'));
  const g = d.id ? groupById(d.id) : null;
  if (name.length < 3) errs.name = 'Enter a group name of at least 3 characters.';
  if (!(max >= 2 && max <= 50)) errs.max = 'Capacity must be between 2 and 50.';
  else if (g && max < g.members.length) errs.max = `This group already has ${g.members.length} members.`;
  if (Object.keys(errs).length) return showErrors(f, errs);
  const data = { name, subject: fd.get('subject'), topic: fd.get('topic').trim(), desc: fd.get('desc').trim(), goals: fd.get('goals').trim(), max, mode: fd.get('mode'), language: fd.get('language').trim(), days: fd.getAll('days'), approval: fd.get('approval'), link: fd.get('link').trim() };
  if (g) { if (g.owner !== u.id) return toast('Only the organizer can edit this group.', 'error'); Object.assign(g, data); toast('Group updated.', 'success'); render(); showGroup(g.id); }
  else { const ng = { id: uid('g'), owner: u.id, college: u.college, level: u.year, members: [u.id], pending: [], invited: [], created: nowISO(), ...data }; db.groups.unshift(ng); toast('Group created.', 'success'); render(); showGroup(ng.id); }
};
FORMS.invite = (f, d) => { const g = groupById(d.id), id = new FormData(f).get('uid'); if (!g || g.owner !== me().id || g.members.includes(id) || g.invited.includes(id)) return; g.invited.push(id); notify(id, `You were invited to join ${g.name}.`, 'groups'); toast('Invitation sent.', 'success'); refreshGroup(g.id); };
FORMS.session = (f, d) => {
  const fd = new FormData(f), u = me(), errs = {}, title = fd.get('title').trim(), start = new Date(fd.get('start')), dur = Number(fd.get('duration')), max = Number(fd.get('max'));
  const s = d.id ? sessionById(d.id) : null, gid = fd.get('groupId');
  if (title.length < 3) errs.title = 'Enter a title of at least 3 characters.';
  if (isNaN(start)) errs.start = 'Choose a start date and time.';
  else if (!s && start < new Date()) errs.start = 'Choose a time in the future.';
  if (!(dur >= 10 && dur <= 480)) errs.duration = 'Duration must be 10-480 minutes.';
  if (!(max >= 2 && max <= 100)) errs.max = 'Capacity must be between 2 and 100.';
  else if (s && max < s.participants.length) errs.max = `Already ${s.participants.length} participants.`;
  if (gid && !groupById(gid)?.members.includes(u.id)) errs.groupId = 'You must be a member of that group.';
  if (Object.keys(errs).length) return showErrors(f, errs);
  const data = { title, subject: fd.get('subject'), topics: fd.get('topics').trim(), desc: fd.get('desc').trim(), start: start.toISOString(), tz: TZ, duration: dur, mode: fd.get('mode'), link: fd.get('link').trim(), groupId: gid, max, objectives: fd.get('objectives').trim() };
  if (s) { if (s.organizer !== u.id) return toast('Only the organizer can edit.', 'error'); Object.assign(s, data); s.participants.forEach(p => p !== u.id && notify(p, `"${s.title}" was updated. New time: ${fmtDT(s.start)}.`, 'sessions')); toast('Session updated. Participants notified.', 'success'); }
  else { db.sessions.push({ id: uid('s'), organizer: u.id, participants: [u.id], status: 'scheduled', outcomes: {}, created: nowISO(), ...data }); if (gid) groupById(gid).members.forEach(m => m !== u.id && notify(m, `New session in ${groupById(gid).name}: "${title}".`, 'sessions')); toast('Session created.', 'success'); }
  ui.sessTab = 'upcoming'; render(); if (location.hash.indexOf('sessions') < 0 && location.hash.indexOf('home') < 0) go('sessions');
};
FORMS.outcome = (f, d) => {
  const fd = new FormData(f), s = sessionById(d.id), u = me();
  if (!s || s.status !== 'completed' || !s.participants.includes(u.id)) return toast('You can only add notes to sessions you attended that were completed.', 'error');
  const o = { covered: fd.get('covered').trim(), learned: fd.get('learned').trim(), remaining: fd.get('remaining').trim(), helped: fd.get('helped'), rating: fd.get('rating') };
  if (!o.covered && !o.learned) return toast('Add what you covered or learned first.', 'error');
  s.outcomes[u.id] = o;
  if (fd.get('share')) db.posts.unshift({ id: uid('p'), author: u.id, created: nowISO(), type: 'achievement', title: 'Completed: ' + s.title, desc: o.learned || o.covered, subjects: [s.subject], likes: [], saves: [], comments: [], reports: [] });
  closeModal(); toast('Notes saved.', 'success'); render();
};
FORMS.message = (f, d) => {
  const u = me(), t = new FormData(f).get('text').trim(); if (!t) return;
  if (!acceptedPartners(u.id).includes(d.u)) return toast('You can message someone only after a study request is accepted.', 'error');
  db.messages.push({ id: uid('m'), conv: convId(u.id, d.u), from: u.id, to: d.u, text: t, at: nowISO(), read: false });
  notify(d.u, `New message from ${u.name}.`, 'messages'); render(); $('#msgtext')?.focus(); const th = $('#thread'); if (th) th.scrollTop = th.scrollHeight;
};
FORMS.assistant = f => { const q = new FormData(f).get('q'); runAssistant(q); };
FORMS.rate = (f, d) => {
  const u = me(), fd = new FormData(f), scores = {};
  if (d.u === u.id || !acceptedPartners(u.id).includes(d.u)) return toast('You can only rate accepted study partners.', 'error');
  for (const [k] of RATING_CATS) { const v = Number(fd.get(k)); if (!Number.isInteger(v) || v < 1 || v > 10) return toast('Each rating must be between 1 and 10.', 'error'); scores[k] = v; }
  const ex = db.ratings.find(r => r.by === u.id && r.target === d.u);
  if (ex) { ex.scores = scores; ex.at = nowISO(); } else db.ratings.push({ id: uid('rt'), by: u.id, target: d.u, scores, at: nowISO() });
  notify(d.u, `${u.name} rated you as a study partner.`, 'profile'); closeModal(); render(); toast('Rating saved.', 'success');
};
FORMS.profile = f => {
  const fd = new FormData(f), u = me();
  if (fd.get('name').trim().length < 2) return showErrors(f, { name: 'Enter your name.' });
  ['name', 'college', 'dept', 'course', 'year', 'location', 'bio'].forEach(k => u[k] = fd.get(k).trim()); closeModal(); render(); toast('Profile updated.', 'success');
};
FORMS.subject = (f, d) => {
  const fd = new FormData(f), u = me(), name = fd.get('name').trim(), data = { level: Number(fd.get('level')), improve: fd.has('improve'), note: fd.get('note').trim() };
  if (d.i !== '') Object.assign(u.subjects[Number(d.i)], data);
  else {
    if (!name) return showErrors(f, { name: 'Enter a subject.' });
    if (u.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return showErrors(f, { name: 'You already added this subject.' });
    u.subjects.push({ name, ...data });
  }
  closeModal(); render(); toast('Subject saved.', 'success');
};
FORMS.prefs = f => { readPrefs(me(), new FormData(f)); closeModal(); render(); toast('Preferences saved.', 'success'); };
FORMS.result = (f, d) => {
  const fd = new FormData(f), u = me(), sys = fd.get('system');
  const v = { subject: fd.get('subject'), name: fd.get('name'), system: sys, obtained: fd.get('obtained'), max: sys === 'percentage' ? 100 : fd.get('max'), grade: fd.get('grade') };
  const errs = validateResult(v); if (Object.keys(errs).length) return showErrors(f, errs);
  const rec = { subject: v.subject.trim(), name: v.name.trim(), system: sys, obtained: sys === 'grade' ? null : Number(v.obtained), max: sys === 'grade' ? null : Number(v.max), grade: sys === 'grade' ? v.grade.trim() : '', date: fd.get('date'), term: fd.get('term').trim(), notes: fd.get('notes').trim(), shared: fd.has('shared') };
  if (d.id) Object.assign(u.results.find(r => r.id === d.id), rec); else u.results.push({ id: uid('res'), ...rec });
  closeModal(); render(); toast('Result saved. It is private unless you share it.', 'success');
};
FORMS.account = f => {
  const fd = new FormData(f), u = me(), errs = {}, email = fd.get('email').trim().toLowerCase();
  if (fd.get('name').trim().length < 2) errs.name = 'Enter your name.';
  if (!emailOk(email)) errs.email = 'Enter a valid email.'; else if (db.users.some(x => x.id !== u.id && x.email === email)) errs.email = 'That email is already in use.';
  if (Object.keys(errs).length) return showErrors(f, errs);
  u.name = fd.get('name').trim(); u.email = email; render(); toast('Account saved.', 'success');
};
FORMS.password = async f => {
  const fd = new FormData(f), u = me(), errs = {};
  if ((await hashPw(fd.get('current'), u.salt)) !== u.pw) errs.current = 'Current password is incorrect.';
  const n = fd.get('next'); if (n.length < 8 || !/[A-Za-z]/.test(n) || !/\d/.test(n)) errs.next = 'Use at least 8 characters, including a letter and a number.';
  if (Object.keys(errs).length) return showErrors(f, errs);
  u.salt = uid('s'); u.pw = await hashPw(n, u.salt); f.reset(); toast('Password updated.', 'success'); save();
};
FORMS.delete = f => {
  if (new FormData(f).get('confirm').trim() !== 'DELETE') return showErrors(f, { confirm: 'Type DELETE exactly to confirm.' });
  const u = me(), id = u.id;
  db.posts = db.posts.filter(p => p.author !== id); db.posts.forEach(p => { p.likes = p.likes.filter(x => x !== id); p.saves = p.saves.filter(x => x !== id); p.comments = p.comments.filter(c => c.by !== id); });
  db.requests = db.requests.filter(r => r.from !== id && r.to !== id); db.messages = db.messages.filter(m => m.from !== id && m.to !== id);
  db.notifications = db.notifications.filter(n => n.user !== id); db.saved = db.saved.filter(s => s.by !== id && s.target !== id); db.dismissed = db.dismissed.filter(s => s.by !== id && s.target !== id);
  db.ratings = db.ratings.filter(r => r.by !== id && r.target !== id); db.blocks = db.blocks.filter(b => b.by !== id && b.target !== id); db.reports = db.reports.filter(r => r.by !== id);
  const owned = db.groups.filter(g => g.owner === id).map(g => g.id);
  db.sessions = db.sessions.filter(s => s.organizer !== id && !owned.includes(s.groupId));
  db.sessions.forEach(s => { s.participants = s.participants.filter(x => x !== id); delete s.outcomes[id]; });
  db.groups = db.groups.filter(g => g.owner !== id); db.groups.forEach(g => { g.members = g.members.filter(x => x !== id); g.pending = g.pending.filter(x => x !== id); g.invited = g.invited.filter(x => x !== id); });
  db.users = db.users.filter(x => x.id !== id); db.session = null; shellFor = null; save(); location.hash = '#/'; render(); toast('Your account and data were deleted.');
};
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
  const h = FORMS[f.dataset.form]; if (!h) return;
  try { const r = h(f, f.dataset); if (r && r.catch) r.catch(err => { console.error(err); toast('Something went wrong. Please try again.', 'error'); }); }
  catch (err) { console.error(err); toast('Something went wrong. Please try again.', 'error'); }
});

/* =====================================================================
   Inputs & changes (filters, privacy toggles, uploads)
   ===================================================================== */
let gfTimer;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.closest('form[data-ob]')) syncOb(t.closest('form'));
  if (t.dataset.gf === 'q') { ui.gf.q = t.value; clearTimeout(gfTimer); gfTimer = setTimeout(() => { const l = $('#grouplist'); if (l) l.innerHTML = groupListHTML(me()); }, 200); }
});
document.addEventListener('change', e => {
  const t = e.target, u = me();
  if (t.closest('form[data-ob]')) syncOb(t.closest('form'));
  if (t.matches('[data-sysselect]')) applySys(t.closest('form'));
  if (t.dataset.mf !== undefined) { ui.mf[t.dataset.mf] = t.type === 'checkbox' ? t.checked : t.value; render(); }
  if (t.dataset.gf !== undefined && t.dataset.gf !== 'q') { ui.gf[t.dataset.gf] = t.value; const l = $('#grouplist'); if (l) l.innerHTML = groupListHTML(u); }
  if (t.dataset.feedsort !== undefined) { ui.feedSort = t.value; render(); }
  if (t.dataset.priv && u) { const k = t.dataset.priv; u.privacy[k] = k === 'profile' ? (t.checked ? 'public' : 'restricted') : t.checked; save(); toast('Privacy setting saved.'); }
  if (t.dataset.np && u) { u.notif[t.dataset.np] = t.checked; save(); toast('Notification setting saved.'); }
  if (t.matches('[data-idfile]') && u) {
    const file = t.files[0]; if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast('Please choose a PNG, JPG or WebP image.', 'error');
    if (file.size > 1048576) return toast('That file is over 1 MB. Choose a smaller image.', 'error');
    const rd = new FileReader();
    rd.onload = () => { u.idCard = { name: file.name, dataUrl: rd.result, at: nowISO() }; render(); toast('ID card saved privately. It is not verified.', 'success'); };
    rd.onerror = () => toast('Could not read that file. Try again.', 'error');
    rd.readAsDataURL(file);
  }
});
// Show/hide the right fields when the result form opens (modal is added after render)
new MutationObserver(() => { const f = $('#modal form[data-form=result]'); if (f && !f.dataset.ready) { f.dataset.ready = '1'; applySys(f); } }).observe(document.body, { childList: true, subtree: true });

/* ---------- boot ---------- */
render();
