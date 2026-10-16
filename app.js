"use strict";
const LIMIT = 12, TOP = 4, REL = .45, CH = 7, WP = 6, W = [2, 1, 0, -1, -2];
const COL = ["#ffaa5a", "#8ad7f8", "#ff9fc6", "#ffe15a", "#c9b8ff", "#a8e6b8"];
const ACOL = ["#a6e636", "#a8e6b8", "#fffdf0", "#ffaa5a", "#ff7a68"];
const INT = { en: ["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional"], id: ["Realistis", "Investigatif", "Artistik", "Sosial", "Kewirausahaan", "Konvensional"] };
const ANS = { en: ["Yes", "Maybe", "Don't know", "Maybe not", "No"], id: ["Ya", "Mungkin", "Tidak tahu", "Mungkin tidak", "Tidak"] };
const NICK = { en: ["The Builder", "The Thinker", "The Creator", "The Helper", "The Leader", "The Organizer"], id: ["Si Pembangun", "Si Pemikir", "Si Kreator", "Si Penolong", "Si Pemimpin", "Si Penata"] };
const FLOAT = ["f0","f1","f7","f4","f2","f8","f9","f3","f5","f6"];
const ROUTES = ["SNBP", "UTBK-SNBT", "Mandiri"];
// key, en, id, month, day, yearShift, routes(bit: SNBP1 SNBT2 Mandiri4) – dates are ESTIMATES
const EV = [["tka", "TKA test (needed for SNBP)", "Tes TKA (syarat SNBP)", 10, 26, -1, 1], ["acct", "Create your SNPMB account", "Buat akun SNPMB", 1, 12, 0, 3], ["snbp_reg", "SNBP registration", "Pendaftaran SNBP", 2, 3, 0, 1], ["snbp_res", "SNBP result", "Pengumuman SNBP", 3, 31, 0, 1], ["utbk_reg", "UTBK-SNBT registration", "Pendaftaran UTBK-SNBT", 3, 25, 0, 2], ["utbk", "UTBK test day", "Hari UTBK", 4, 21, 0, 2], ["utbk_res", "SNBT result", "Pengumuman SNBT", 5, 25, 0, 2], ["cert", "Download your UTBK certificate", "Unduh sertifikat UTBK", 6, 2, 0, 6], ["mandiri", "Mandiri: check your university", "Mandiri: cek kampusmu", 6, 1, 0, 4]];

// ---------- storage ----------
const ls = { get(k, d) { try { const v = localStorage.getItem("jr_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem("jr_" + k, JSON.stringify(v)); } catch (e) { } } };
const S = { id: ls.get("id", true), dark: ls.get("dark", matchMedia("(prefers-color-scheme:dark)").matches), sound: ls.get("sound", true), seen: ls.get("seen", false), quiz: ls.get("quiz", null), hist: ls.get("hist", []) };
const P = Object.assign({ dream: null, route: 1, sk: [50, 50, 50, 50, 50, 50, 50], logs: [], dates: {}, custom: [] }, ls.get("p", {}));
const saveP = () => ls.set("p", P);
const t = (en, id) => S.id ? id : en, lang = () => S.id ? "id" : "en", $ = document.getElementById("app");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad = n => String(n).padStart(2, "0"), val = id => document.getElementById(id).value;
let ft_; function flash(m) { const e = document.getElementById("toast"); e.textContent = m; e.classList.add("on"); clearTimeout(ft_); ft_ = setTimeout(() => e.classList.remove("on"), 2600); }
let ac; function beep(f = 520, d = .08) { if (!S.sound) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.type = "square"; g.gain.value = .05; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) { } }

// ---------- recommender (same maths as the Android app) ----------
function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const evidence = (q, i) => q.picks.reduce((s, p, n) => s + Math.abs(Q[p][2][i]) * Math.abs(W[q.ans[n]]), 0);
const qValue = (q, k) => Q[k][2].reduce((s, w, i) => s + Math.abs(w) / (1 + evidence(q, i)), 0);
function overlap(a, b) { if (a == null) return 0; let s = 0, T = 0; for (let i = 0; i < 6; i++) { const x = Math.abs(Q[a][2][i]), y = Math.abs(Q[b][2][i]); s += Math.min(x, y); T += Math.max(x, y); } return T ? s / T : 0; }
function nextQ(q) {
  if (q.picks.length >= LIMIT) return null;
  const last = q.picks[q.picks.length - 1];
  const pool = Q.map((_, k) => k).filter(k => !q.picks.includes(k)).map(k => [k, qValue(q, k) + REL * overlap(last, k)]).sort((a, b) => b[1] - a[1]);
  return pool[Math.floor(rng(q.seed * 31 + q.picks.length * 7919 + 17)() * Math.min(CH, pool.length))][0];
}
function score(q, m) {
  let tot = 0, pos = 0;
  q.picks.forEach((p, n) => { const w = Q[p][2]; let fit = 0, qw = 0; for (let i = 0; i < 6; i++) { fit += w[i] * m[5][i]; qw += Math.abs(w[i]) * 5; } if (!qw) return; tot += W[q.ans[n]] * fit / qw; pos += Math.abs(W[q.ans[n]]); });
  return pos ? tot / pos : 0;
}
const pct = (q, k) => Math.max(0, Math.min(100, Math.round(score(q, M[k]) * 100)));
function explain(q, m) {
  const ev = [0, 0, 0, 0, 0, 0]; q.picks.forEach((p, n) => { for (let i = 0; i < 6; i++) ev[i] += W[q.ans[n]] * Q[p][2][i]; });
  return [0, 1, 2, 3, 4, 5].sort((a, b) => ev[b] * m[5][b] - ev[a] * m[5][a]).filter(i => ev[i] > 0 && m[5][i] >= 3).slice(0, 3);
}
function results(q) {
  const all = M.map((m, k) => ({ k, p: pct(q, k) })).sort((a, b) => b.p - a.p || a.k - b.k);
  const top = all.filter(x => x.p > 0).sort((a, b) => b.p - a.p || (M[a.k][1] < M[b.k][1] ? -1 : 1)).slice(0, TOP);
  const pool = all.filter(x => !top.some(y => y.k === x.k)).slice(0, WP);
  const w = pool[Math.floor(rng(q.seed * 131 + 3)() * pool.length)];
  return { top: top.map(x => ({ ...x, why: explain(q, M[x.k]) })), wild: { ...w, why: explain(q, M[w.k]) } };
}
function profile(q) { return [0, 1, 2, 3, 4, 5].map(i => { let s = 0, mx = 0; q.picks.forEach((p, n) => { const w = Q[p][2][i]; s += W[q.ans[n]] * w; mx += 2 * Math.abs(w); }); return mx ? (s / mx + 1) * 50 : 50; }); }

// ---------- universities + coach maths ----------
const UL = () => D.U.map(a => ({ n: a[0], s: a[1], c: a[2], t: a[3], sel: a[4], mask: a[5], f: [a[6], a[7]] })).concat(P.custom);
const strong = (u, f) => !!(u.mask & (1 << f)), dots = n => "●".repeat(n) + "○".repeat(3 - n), fname = f => D.FN[+S.id][f], skn = i => D.SK[S.id ? 2 : 1][i];
const lv = () => { const l = P.sk.slice(), seen = []; P.logs.filter(x => x.type == 0).forEach(x => { const a = seen[x.sk] ? .5 : .6; seen[x.sk] = 1; l[x.sk] = Math.round(l[x.sk] * (1 - a) + x.v * a); }); return l; };
const need = (u, f, s) => Math.min(100, 40 + 15 * D.ND[f][s] + (u.sel - 1) * 5);
const gaps = (u, f) => lv().map((v, s) => ({ s, v, n: need(u, f, s), g: need(u, f, s) - v, w: D.ND[f][s] })).sort((a, b) => b.g - a.g || b.w - a.w);
const ready = (u, f) => { let s = 0, w = 0; lv().forEach((v, i) => { const x = D.ND[f][i]; if (x > 0) { s += x * Math.min(1, v / need(u, f, i)); w += x; } }); return w ? Math.round(100 * s / w) : 0; };
const minutes = d => { const c = Date.now() - d * 864e5; return P.logs.filter(x => x.type == 1 && x.t >= c).reduce((a, x) => a + x.v, 0); };
const commit = () => Math.round(.6 * 60 + .4 * Math.min(100, minutes(14) * 100 / 480));
const fit = (p, u, f) => { const us = strong(u, f) ? 100 : 55, r = ready(u, f), c = commit(); return { tot: Math.max(0, Math.min(100, Math.round(.35 * p + .15 * us + .35 * r + .15 * c))), b: [p, us, r, c] }; };
const streak = () => { const days = new Set(P.logs.filter(x => x.type == 1).map(x => new Date(x.t).toDateString())); let n = 0, d = new Date(); if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1); while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); } return n; };
const cyc = () => { const d = new Date(); return d.getMonth() >= 7 ? d.getFullYear() + 1 : d.getFullYear(); };
const evDate = e => P.dates[e[0]] || `${cyc() + e[5]}-${pad(e[3])}-${pad(e[4])}`;
const until = s => { const [y, m, d] = s.split("-").map(Number), n = new Date(); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); };
const evs = () => EV.filter(e => e[6] & (1 << P.route)).map(e => ({ e, d: evDate(e) })).sort((a, b) => a.d < b.d ? -1 : 1);
function ics(list) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jurusanator//EN"], st = new Date().toISOString().replace(/[-:]|\.\d+/g, "");
  list.forEach(({ e, d }) => { const x = d.replace(/-/g, ""), n = S.id ? e[2] : e[1]; L.push("BEGIN:VEVENT", "UID:" + e[0] + x + "@jurusanator", "DTSTAMP:" + st, "DTSTART;VALUE=DATE:" + x, "SUMMARY:" + n, "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:" + n, "END:VALARM", "END:VEVENT"); });
  L.push("END:VCALENDAR");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([L.join("\r\n")], { type: "text/calendar" })); a.download = "jurusanator.ics"; document.body.appendChild(a); a.click(); a.remove();
}

// ---------- ui helpers ----------
const mName = k => S.id ? M[k][0] : M[k][1], mAlt = k => S.id ? M[k][1] : M[k][0], mDesc = k => S.id ? M[k][2] : M[k][3];
const mCol = k => COL[M[k][5].indexOf(Math.max(...M[k][5]))];
const stk = (k, sz) => `<div class="stk" style="background:${mCol(k)};${sz ? `width:${sz}px;height:${sz}px` : ""}">${IC("f" + D.FO[k], sz ? Math.round(sz * .5) : 34)}</div>`;
const mbar = (v, c) => `<div class="mbar"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${c}"></i></div>`;
function bar() {
  return `<div class="bar"><div class="logo" data-a="home" role="button" tabindex="0">${IC("cap", 20)} JURUSANATOR</div><div class="row">
  <button class="btn sm" data-a="lang">${S.id ? "ID → EN" : "EN → ID"}</button><button class="btn sm" data-a="theme" aria-label="theme">${IC(S.dark ? "sun" : "moon", 18)}</button><button class="btn sm" data-a="sound" aria-label="sound">${IC(S.sound ? "vol" : "mute", 18)}</button></div></div>`;
}
function confetti() { const c = ["#ffe15a", "#ff9fc6", "#8ad7f8", "#a6e636", "#c9b8ff", "#ffaa5a"]; for (let i = 0; i < 46; i++) { const e = document.createElement("i"); e.className = "conf"; e.style.cssText = `left:${Math.random() * 100}vw;background:${c[i % 6]};animation-delay:${Math.random() * .8}s`; document.body.appendChild(e); setTimeout(() => e.remove(), 3600); } }
document.getElementById("bd").innerHTML = FLOAT.map((e, i) => `<div class="bc" style="left:${(i * 17 + 3) % 90}%;top:${(i * 31 + 8) % 78}%;--r:${i % 2 ? -10 : 10}deg;animation-delay:${i * .7}s;transform:rotate(${i % 2 ? 6 : -6}deg)">${IC(e, 40)}</div>`).join("");

// ---------- screens ----------
let screen = S.seen ? "home" : "welcome", view = null, um = null, tab = "fit", last = "";
function render() {
  document.documentElement.dataset.theme = S.dark ? "dark" : "light"; document.documentElement.lang = lang();
  const y = scrollY, changed = screen !== last;
  $.className = "wrap" + (screen === "coach" ? " hasnav" : "");
  $.innerHTML = bar() + `<div class="${changed ? "fade" : ""}">${V[screen]()}</div>`;
  scrollTo(0, changed ? 0 : y); last = screen;
}
function welcome() {
  return `<div class="card" style="text-align:center;max-width:680px;margin:6vh auto 0"><div class="bounce" style="color:var(--forest)">${IC("cap", 84, 2)}</div><br><span class="tag">${t("WELCOME", "SELAMAT DATANG")}</span><h1>Jurusanator</h1>
  <p>${t("Not sure what to study? Answer a few quick questions, meet the majors that fit you, then plan your way to your dream university.", "Bingung mau kuliah apa? Jawab beberapa pertanyaan singkat, temukan jurusan yang cocok, lalu rencanakan jalanmu ke kampus impian.")}</p>
  <button class="btn main" data-a="enter">${t("LET'S GO", "AYO MULAI")} →</button></div>`;
}
function dreamCard() {
  const d = P.dream, u = d && UL()[d.u];
  if (!u) return `<div class="card mt" style="background:var(--yellow)"><span class="tag" style="background:var(--paper)">${t("YOUR DREAM", "IMPIANMU")}</span><h2>${t("No dream university yet", "Belum ada kampus impian")}</h2><p class="muted">${t("Finish the quiz, pick a major and choose a university to unlock your coach.", "Selesaikan kuis, pilih jurusan dan kampus untuk membuka coach.")}</p><button class="btn yel" data-a="dream">${t("PICK MY DREAM UNIVERSITY", "PILIH KAMPUS IMPIANKU")}</button></div>`;
  const f = fit(d.pct, u, D.FO[d.m]), nx = evs().find(x => until(x.d) >= 0);
  return `<div class="card mt" style="background:var(--lime)"><span class="tag">${t("YOUR DREAM", "IMPIANMU")}</span><div class="row" style="margin:14px 0">${stk(d.m, 64)}<div><h2>${esc(mName(d.m))}</h2><b>${esc(u.n)}</b><br><small class="muted">${esc(u.c)} · ${u.t}</small></div></div>
  <div class="row sb"><b>${t("FIT POINTS ", "POIN KECOCOKAN ")}${f.tot}/100</b>${nx ? `<small>${t("Next: ", "Berikutnya: ")}${esc(S.id ? nx.e[2] : nx.e[1])} · ${t("in " + until(nx.d) + " days (estimate)", until(nx.d) + " hari lagi (perkiraan)")}</small>` : ""}</div>
  <div style="margin:10px 0 16px">${mbar(f.tot, "var(--forest)")}</div><button class="btn main" data-a="coachopen">${t("OPEN MY PLAN", "BUKA RENCANAKU")}</button></div>`;
}
function home() {
  const q = S.quiz, going = q && q.picks.length > 0 && q.picks.length < LIMIT;
  return `<div class="hero"><div><span class="tag">${t("FIND YOUR DIRECTION", "TEMUKAN ARAHMU")}</span><h1>${t("Which major fits you?", "Jurusan apa yang cocok?")}</h1>
  <p class="muted" style="font-size:18px">${t("Answer a few questions, find majors that fit you, then get a plan to reach your dream university.", "Jawab beberapa pertanyaan, temukan jurusan yang cocok, lalu dapatkan rencana menuju kampus impianmu.")}</p>
  <div class="chips"><span class="chip">${LIMIT} ${t("QUESTIONS", "PERTANYAAN")}</span><span class="chip" style="background:var(--pink)">${M.length} ${t("MAJORS", "JURUSAN")}</span><span class="chip" style="background:var(--sky)">${UL().length} ${t("UNIVERSITIES", "KAMPUS")}</span></div>
  <div class="row">${going ? `<button class="btn main" data-a="resume">${t("CONTINUE", "LANJUTKAN")} ${q.picks.length}/${LIMIT}</button><button class="btn" data-a="start">${t("NEW QUIZ", "KUIS BARU")}</button>` : `<button class="btn main" data-a="start">${t("START THE QUIZ", "MULAI KUIS")} →</button>`}<button class="btn sm" data-a="intro">${t("REPLAY INTRO", "PUTAR ULANG INTRO")}</button></div>
  <p class="muted" style="font-size:13px">${t("Suggestions are a guide, not a decision. Always check official sources.", "Saran hanyalah panduan, bukan keputusan. Selalu cek sumber resmi.")}</p></div>
  <div class="card" style="font-size:clamp(46px,8vw,86px);text-align:center;background:var(--lime);line-height:1.35;transform:rotate(2deg)">${["f0","f1","f7","f4","f2","f8","f9","f3","f5"].map(x=>`<span class="hi">${IC(x,38)}</span>`).join("")}</div></div>${dreamCard()}${histView()}`;
}
function histView() {
  if (!S.hist.length) return "";
  return `<div class="card mt"><div class="row sb"><span class="tag" style="background:var(--mint)">${t("PAST RESULTS", "HASIL SEBELUMNYA")}</span><button class="btn sm" data-a="clear">${t("CLEAR", "HAPUS")}</button></div>
  ${S.hist.map((h, i) => `<div class="hist"><div><b>${esc(mName(h.top))}</b> · ${h.p}%<br><small class="muted">${new Date(h.t).toLocaleDateString(S.id ? "id-ID" : "en-US")}</small></div><button class="btn sm" data-a="open" data-i="${i}">${t("OPEN", "BUKA")}</button></div>`).join("")}</div>`;
}
function quiz() {
  const q = S.quiz, k = nextQ(q);
  return `<div class="qcard card"><div class="row sb"><span class="tag">${q.picks.length + 1}/${LIMIT}</span><button class="btn sm" data-a="home">${IC("close", 14)} ${t("HOME", "BERANDA")}</button></div>
  <div class="prog" style="margin-top:14px"><i style="width:${q.picks.length / LIMIT * 100}%"></i></div>
  <div class="q">${esc(S.id ? Q[k][0] : Q[k][1])}</div>
  <div class="ans">${ANS[lang()].map((a, i) => `<button class="btn" style="background:${ACOL[i]}" data-a="ans" data-i="${i}" data-k="${k}"><span>${a}</span><kbd>${i + 1}</kbd></button>`).join("")}</div>
  ${q.picks.length ? `<div style="margin-top:18px"><button class="btn sm" data-a="undo">↩ ${t("UNDO", "KEMBALI")}</button></div>` : ""}</div>`;
}
function card(r, kind, rank) {
  const badge = kind === "wild" ? t("+1 WILDCARD · TRY IT TOO", "+1 KARTU LIAR · COBA JUGA") : rank === 0 ? t("#1 BEST MATCH", "#1 PALING COCOK") : "#" + (rank + 1);
  return `<div class="card res ${kind === "wild" ? "wild" : rank === 0 ? "hero1 span2" : ""}"><span class="tag">${badge}</span>
  <div class="row" style="margin:16px 0">${stk(r.k)}<div><h2>${esc(mName(r.k))}</h2><small class="muted">${esc(mAlt(r.k))}</small></div></div>
  <p>${esc(mDesc(r.k))}</p><div class="row sb"><span class="pct">${r.p}%</span><small class="muted">${t("MATCH", "KECOCOKAN")}</small></div>${mbar(r.p, mCol(r.k))}
  <div class="chips">${r.why.length ? r.why.map(i => `<span class="chip" style="background:${COL[i]}">${INT[lang()][i]}</span>`).join("") : `<span class="chip">${t("OVERALL PROFILE", "PROFIL KESELURUHAN")}</span>`}</div>
  <button class="btn main" style="font-size:16px;padding:12px 20px" data-a="plan" data-k="${r.k}" data-p="${r.p}">${t("PLAN THIS", "RENCANAKAN INI")} →</button></div>`;
}
function resultsView() {
  const q = view, R = results(q), pr = profile(q), top = pr.indexOf(Math.max(...pr)), explorer = pr[top] < 55;
  return `<div class="row sb"><button class="btn sm" data-a="home">← ${t("HOME", "BERANDA")}</button><button class="btn sm" data-a="start">${t("NEW QUIZ", "KUIS BARU")}</button></div>
  <h1 style="font-size:clamp(30px,5vw,56px)">${t("Your top matches", "Jurusan paling cocok")}</h1><p class="muted">${t("Based on your answers. Tap PLAN THIS to choose a university and start your plan.", "Berdasarkan jawabanmu. Ketuk RENCANAKAN INI untuk memilih kampus dan memulai rencana.")}</p>
  ${R.top.length ? `<div class="grid g3">${R.top.map((r, i) => card(r, "top", i)).join("")}${card(R.wild, "wild")}</div>` : `<div class="card"><h2>${t("No strong match yet", "Belum ada yang kuat cocok")}</h2><p>${t("Try again and use more 'Yes' or 'Maybe' for things you enjoy.", "Coba lagi dan pakai lebih banyak 'Ya' atau 'Mungkin' untuk hal yang kamu suka.")}</p></div>`}
  <div class="card mt"><span class="tag" style="background:var(--mint)">${t("YOUR INTEREST MAP", "PETA MINATMU")}</span>
  <h2 style="margin-top:12px">${t("You are ", "Kamu adalah ")}${explorer ? t("The Explorer", "Si Penjelajah") : NICK[lang()][top]}</h2>
  <div class="imap">${pr.map((v, i) => `<div><div class="l"><span>${INT[lang()][i]}</span><span>${Math.round(v)}%</span></div>${mbar(v, COL[i])}</div>`).join("")}</div>
  <p class="muted" style="font-size:13px">${t("50% means neutral. Higher means you lean towards it.", "50% berarti netral. Makin tinggi berarti kamu condong ke sana.")}</p></div>`;
}
function univ() {
  const { k } = um, f = D.FO[k], L = UL().map((u, i) => ({ u, i })).sort((a, b) => strong(b.u, f) - strong(a.u, f) || a.u.n.localeCompare(b.u.n));
  return `<div class="row sb"><button class="btn sm" data-a="back">← ${t("BACK", "KEMBALI")}</button></div>
  <div class="row mt">${stk(k, 90)}<div><span class="tag">${t("CHOOSE A UNIVERSITY", "PILIH KAMPUS")}</span><h1 style="font-size:clamp(28px,4.5vw,48px);margin:8px 0">${esc(mName(k))}</h1></div></div>
  <p class="muted">${t("Field: ", "Bidang: ")}<b>${fname(f)}</b>. ${t("Universities known for this field come first. This is a general reputation guide, not a ranking. Always check the official program list and accreditation.", "Kampus yang dikenal di bidang ini tampil lebih dulu. Ini panduan reputasi umum, bukan peringkat. Selalu cek daftar program studi dan akreditasi resmi.")}</p>
  <details class="card" style="background:var(--yellow);margin:18px 0"><summary>＋ ${t("ADD YOUR OWN UNIVERSITY", "TAMBAH KAMPUSMU SENDIRI")}</summary><div class="f">
  <input id="un" placeholder="${t("University name", "Nama kampus")}" maxlength="60"><input id="uc" placeholder="${t("City", "Kota")}" maxlength="40">
  <select id="ut"><option>PTN</option><option>PTS</option><option>Poltek</option></select>
  <select id="us"><option value="1">${t("Entry: easier ●○○", "Masuk: lebih mudah ●○○")}</option><option value="2" selected>${t("Entry: competitive ●●○", "Masuk: kompetitif ●●○")}</option><option value="3">${t("Entry: very competitive ●●●", "Masuk: sangat ketat ●●●")}</option></select>
  <button class="btn main" style="font-size:16px" data-a="addU">${t("ADD UNIVERSITY", "TAMBAH KAMPUS")}</button></div></details>
  <div class="grid g3">${L.map(({ u, i }) => `<div class="card pick" role="button" tabindex="0" data-a="pick" data-i="${i}" style="${strong(u, f) ? "background:var(--lime)" : ""};cursor:pointer"><div class="row sb"><div class="row" style="gap:8px;flex-wrap:nowrap">${xlogo(u, 36)}<h3 style="margin:0;font-size:16px">${esc(u.n)}</h3></div>${u.custom ? `<button class="btn sm" data-a="delU" data-i="${i}" aria-label="delete">${IC("trash", 16)}</button>` : ""}</div>
  <small class="muted" style="font-family:var(--mono)">${esc(u.c)} · ${u.t} · ${dots(u.sel)}</small>${strong(u, f) ? `<div style="margin-top:8px"><span class="tag" style="font-size:11px">${t("KNOWN FOR THIS", "DIKENAL DI SINI")}</span></div>` : ""}</div>`).join("")}</div>
  <p class="muted" style="font-size:12px">${t("●●● = very competitive entry (an estimate).", "●●● = persaingan masuk sangat ketat (perkiraan).")}</p>`;
}
const TABS = [["fit", IC("target", 22), "Fit", "Cocok"], ["prep", IC("book", 22), "Prep", "Persiapan"], ["plan", IC("cal", 22), "Plan", "Jadwal"], ["prog", IC("chart", 22), "Progress", "Progres"]];
function coach() {
  const d = P.dream, u = d && UL()[d.u];
  if (!u) return `<div class="card"><h2>${t("Pick a dream university first", "Pilih kampus impian dulu")}</h2><button class="btn main" data-a="dream">${t("PICK MY DREAM UNIVERSITY", "PILIH KAMPUS IMPIANKU")}</button></div>`;
  const f = D.FO[d.m], ft = fit(d.pct, u, f);
  const body = { fit: tFit, prep: tPrep, plan: tPlan, prog: tProg }[tab](u, f, d, ft);
  return `<div class="coach"><nav class="nav">${TABS.map(x => `<button class="tb ${tab === x[0] ? "on" : ""}" data-a="tab" data-i="${x[0]}"><span>${x[1]}</span>${t(x[2], x[3])}</button>`).join("")}</nav><div class="stack">${body}</div></div>`;
}
function tFit(u, f, d, ft) {
  const g = gaps(u, f), weak = g.filter(x => x.g > 0).slice(0, 3), str = [...g].reverse().filter(x => x.g <= 0).slice(0, 3), facts = u.f[+S.id];
  const nm = [t("Interest", "Minat"), t("University", "Kampus"), t("Readiness", "Kesiapan"), t("Commitment", "Komitmen")], cl = ["var(--sky)", "var(--yellow)", "var(--limehi)", "var(--pink)"];
  const li = (a, c) => a.length ? a.map(x => `<div style="margin:8px 0"><div class="l row sb"><b>${D.SK[0][x.s]} · ${skn(x.s)}</b><small>${x.v}/${x.n}</small></div>${mbar(x.v / x.n * 100, c)}</div>`).join("") : `<p class="muted">—</p>`;
  return `<div class="card" style="background:var(--lime)"><div class="row sb"><div class="row">${stk(d.m, 72)}<div><span class="tag">${t("YOUR DREAM", "IMPIANMU")}</span><h2>${esc(mName(d.m))}</h2><b>${esc(u.n)}</b> <small class="muted">${esc(u.c)} · ${u.t} · ${dots(u.sel)}</small></div></div><button class="btn sm" data-a="change">${t("CHANGE", "UBAH")}</button></div></div>
  <div class="two"><div class="card"><span class="tag" style="background:var(--mint)">${t("FIT POINTS", "POIN KECOCOKAN")}</span><div class="big">${ft.tot}<small>/100</small></div>
  ${ft.b.map((v, i) => `<div style="margin:9px 0"><div class="l row sb"><b>${nm[i]}</b><small>${v}</small></div>${mbar(v, cl[i])}</div>`).join("")}<p class="muted" style="font-size:12px">${t("A mix of interest (35%), university (15%), readiness (35%) and commitment (15%).", "Gabungan minat (35%), kampus (15%), kesiapan (35%) dan komitmen (15%).")}</p></div>
  <div class="stack"><div class="card"><span class="tag" style="background:var(--limehi)">💪 ${t("STRENGTHS", "KEKUATAN")}</span>${li(str, "var(--limehi)")}</div><div class="card"><span class="tag" style="background:var(--coral)">⚠️ ${t("WEAKNESSES", "KELEMAHAN")}</span>${li(weak, "var(--coral)")}</div></div></div>
  <div class="two"><div class="card"><span class="tag">📅 ${t("THIS WEEK", "MINGGU INI")}</span><p class="muted">${t("Suggested study sessions (45 min each):", "Sesi belajar yang disarankan (45 menit):")}</p>${weak.length ? weak.map(x => `<p><b>${skn(x.s)}</b> — ${Math.max(1, Math.min(4, Math.ceil(x.g / 10)))} × 45 ${t("min", "mnt")}</p>`).join("") : `<p>${t("You are on target everywhere. Keep practising with mock tests!", "Kamu sudah sesuai target. Terus latihan dengan tryout!")}</p>`}</div>
  <div class="card" style="background:var(--sky)"><span class="tag" style="background:var(--paper)">ℹ️ ${t("ABOUT THE CAMPUS", "TENTANG KAMPUS")}</span>${facts && facts.length ? facts.map(x => `<p>${esc(x)}</p>`).join("") : `<p>${t("Custom university. Check its official website for details.", "Kampus buatanmu. Cek situs resminya untuk detail.")}</p>`}<small class="muted">${t("Always double-check on the official website.", "Selalu cek ulang di situs resmi.")}</small></div></div>`;
}
function tPrep(u, f) {
  return `<div class="card"><span class="tag">${t("RATE YOURSELF (UTBK SKILLS)", "NILAI DIRIMU (SUBTES UTBK)")}</span><p class="muted">${t("Drag each slider to how strong you feel today. Targets are a rough guide, not official requirements.", "Geser tiap slider sesuai kemampuanmu saat ini. Target hanya panduan kasar, bukan syarat resmi.")}</p>
  ${D.SK[0].map((c, i) => `<div class="sl"><div class="l"><span><b>${c}</b> · ${skn(i)}</span><b id="v${i}">${P.sk[i]}</b></div><input type="range" min="0" max="100" value="${P.sk[i]}" data-sk="${i}"><small class="muted">${t("Target", "Target")} ≈ ${need(u, f, i)}</small></div>`).join("")}</div>
  <div class="card" style="background:var(--yellow)"><span class="tag" style="background:var(--paper)">${t("TOPICS TO EXPLORE", "TOPIK UNTUK DIPELAJARI")} · ${fname(f)}</span>${D.FT[+S.id][f].map(x => `<p>✔ ${esc(x)}</p>`).join("")}</div>`;
}
function tPlan() {
  const list = evs();
  return `<div class="card"><span class="tag">${t("ENTRY ROUTE", "JALUR MASUK")}</span><div class="row" style="margin:14px 0">${ROUTES.map((r, i) => `<button class="btn sm ${P.route === i ? "on" : ""}" data-a="route" data-i="${i}">${r}</button>`).join("")}</div>
  <p class="muted" style="font-size:13px">${t("Dates are estimates based on the last official schedule. Edit any date; check snpmb.id for the official announcement.", "Tanggal adalah perkiraan dari jadwal resmi terakhir. Ubah tanggal bila perlu; cek snpmb.id untuk pengumuman resmi.")}</p>
  ${list.map(({ e, d }) => { const n = until(d); return `<div class="ev"><div><b>${esc(S.id ? e[2] : e[1])}</b><br><small class="muted">${n >= 0 ? t("in " + n + " days", n + " hari lagi") : t(-n + " days ago", -n + " hari lalu")}</small></div><input type="date" value="${d}" data-ev="${e[0]}"></div>`; }).join("")}
  <div style="margin-top:16px"><button class="btn main" style="font-size:16px" data-a="ics">📆 ${t("ADD TO CALENDAR (.ics)", "TAMBAH KE KALENDER (.ics)")}</button></div></div>`;
}
function tProg() {
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const m = P.logs.filter(x => x.type == 1 && new Date(x.t).toDateString() == d.toDateString()).reduce((a, x) => a + x.v, 0); return { m, l: d.toLocaleDateString(S.id ? "id-ID" : "en-US", { weekday: "short" }) }; });
  const mx = Math.max(60, ...days.map(x => x.m)), opts = D.SK[0].map((c, i) => `<option value="${i}">${c} · ${skn(i)}</option>`).join("");
  return `<div class="two"><div class="card" style="background:var(--lime)"><span class="tag">🔥 ${t("STREAK", "BERUNTUN")}</span><div class="big">${streak()}<small> ${t("days", "hari")}</small></div><p class="muted">${minutes(7)} ${t("minutes studied in the last 7 days", "menit belajar dalam 7 hari terakhir")}</p></div>
  <div class="card"><span class="tag" style="background:var(--sky)">${t("LAST 7 DAYS (MIN)", "7 HARI TERAKHIR (MNT)")}</span><div class="bars" style="margin-top:14px">${days.map(x => `<div><small>${x.m}</small><i style="height:${x.m / mx * 80}px"></i>${x.l}</div>`).join("")}</div></div></div>
  <div class="two"><div class="card"><span class="tag">${t("LOG STUDY TIME", "CATAT WAKTU BELAJAR")}</span><div class="f"><select id="ss">${opts}</select><input id="sm" type="number" min="5" max="600" value="45"><button class="btn main" style="font-size:16px" data-a="logS">${t("SAVE SESSION", "SIMPAN SESI")}</button></div></div>
  <div class="card"><span class="tag" style="background:var(--pink)">${t("LOG A MOCK TEST SCORE", "CATAT NILAI TRYOUT")}</span><div class="f"><select id="ms">${opts}</select><input id="mv" type="number" min="0" max="100" value="60"><button class="btn main" style="font-size:16px" data-a="logM">${t("SAVE SCORE", "SIMPAN NILAI")}</button></div></div></div>
  ${P.logs.length ? `<div class="card"><span class="tag" style="background:var(--mint)">${t("RECENT", "TERBARU")}</span>${P.logs.slice(-8).reverse().map(x => `<div class="hist"><span><b>${D.SK[0][x.sk]}</b> · ${x.type ? x.v + " " + t("min", "mnt") : t("mock", "tryout") + " " + x.v}</span><small class="muted">${new Date(x.t).toLocaleDateString(S.id ? "id-ID" : "en-US")}</small></div>`).join("")}</div>` : ""}`;
}
const V = { welcome, home, quiz, results: resultsView, univ, coach };

// ---------- actions (return false = skip the re-render) ----------
function startQuiz() { S.quiz = { seed: (Math.random() * 2 ** 31) | 0 || 1, picks: [], ans: [] }; ls.set("quiz", S.quiz); screen = "quiz"; }
function finish() {
  const q = S.quiz, R = results(q); view = q;
  if (R.top.length) { S.hist.unshift({ t: Date.now(), top: R.top[0].k, p: R.top[0].p, q }); S.hist = S.hist.slice(0, 10); ls.set("hist", S.hist); }
  S.quiz = null; ls.set("quiz", null); screen = "results"; render(); confetti(); beep(880, .2); return false;
}
const A = {
  lang() { S.id = !S.id; ls.set("id", S.id); }, theme() { S.dark = !S.dark; ls.set("dark", S.dark); }, sound() { S.sound = !S.sound; ls.set("sound", S.sound); beep(); },
  enter() { S.seen = true; ls.set("seen", true); screen = "home"; beep(660); }, intro() { screen = "welcome"; }, home() { screen = "home"; }, back() { screen = view ? "results" : "home"; },
  start() { startQuiz(); beep(); }, resume() { screen = "quiz"; },
  undo() { S.quiz.picks.pop(); S.quiz.ans.pop(); ls.set("quiz", S.quiz); },
  clear() { S.hist = []; ls.set("hist", []); }, open(d) { view = S.hist[+d.i].q; screen = "results"; },
  ans(d) { const q = S.quiz; q.picks.push(+d.k); q.ans.push(+d.i); ls.set("quiz", q); beep(380 + 80 * (4 - d.i)); if (q.picks.length >= LIMIT) return finish(); },
  plan(d) { um = { k: +d.k, p: +d.p }; screen = "univ"; beep(600); },
  dream() { if (S.hist.length) { view = S.hist[0].q; screen = "results"; flash(t("Tap PLAN THIS on a major.", "Ketuk RENCANAKAN INI pada sebuah jurusan.")); } else startQuiz(); },
  change() { um = { k: P.dream.m, p: P.dream.pct }; screen = "univ"; },
  pick(d) { P.dream = { m: um.k, u: +d.i, pct: um.p }; saveP(); screen = "coach"; tab = "fit"; flash(t("Dream university saved! 🎉", "Kampus impian tersimpan! 🎉")); beep(760, .15); },
  addU() { const n = val("un").trim(); if (!n) { flash(t("Type a university name first.", "Isi nama kampus dulu.")); return false; } P.custom.push({ n, s: n.split(/\s+/).map(w => w[0]).join("").slice(0, 5).toUpperCase(), c: val("uc").trim() || "-", t: val("ut"), sel: +val("us"), mask: 1 << D.FO[um.k], f: [[], []], custom: 1 }); saveP(); flash(t("University added ✔", "Kampus ditambahkan ✔")); },
  delU(d) { const ci = +d.i - D.U.length; if (ci < 0) return false; P.custom.splice(ci, 1); if (P.dream) { if (P.dream.u === +d.i) P.dream = null; else if (P.dream.u > +d.i) P.dream.u--; } saveP(); flash(t("Removed", "Dihapus")); },
  coachopen() { screen = "coach"; }, tab(d) { tab = d.i; },
  route(d) { P.route = +d.i; saveP(); }, ics() { ics(evs()); flash(t("Calendar file downloaded", "File kalender diunduh")); return false; },
  logS() { const v = Math.max(5, Math.min(600, +val("sm") || 0)); P.logs.push({ t: Date.now(), type: 1, sk: +val("ss"), v }); P.logs = P.logs.slice(-300); saveP(); flash(t("Session saved 🔥", "Sesi tersimpan 🔥")); },
  logM() { const v = Math.max(0, Math.min(100, +val("mv") || 0)); P.logs.push({ t: Date.now(), type: 0, sk: +val("ms"), v }); P.logs = P.logs.slice(-300); saveP(); flash(t("Score saved", "Nilai tersimpan")); }
};
$.addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b || !A[b.dataset.a]) return;
  e.stopPropagation(); if (A[b.dataset.a](b.dataset) !== false) render();
});
$.addEventListener("input", e => { const i = e.target.dataset.sk; if (i != null) { P.sk[i] = +e.target.value; document.getElementById("v" + i).textContent = e.target.value; saveP(); } });
$.addEventListener("change", e => { const k = e.target.dataset.ev; if (k && e.target.value) { P.dates[k] = e.target.value; saveP(); render(); } });
document.addEventListener("keydown", e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (screen === "quiz" && /^[1-5]$/.test(e.key)) { const b = $.querySelector(`[data-a=ans][data-i="${e.key - 1}"]`); b && b.click(); }
  else if ((e.key === "Enter" || e.key === " ") && e.target.getAttribute && e.target.getAttribute("role") === "button") { e.preventDefault(); e.target.click(); }
});
render();
