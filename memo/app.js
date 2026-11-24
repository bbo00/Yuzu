/* 유자 메모 v2 — 카톡 채팅방 스타일 메모장 */
(function () {
  'use strict';

  /* ==================== 상수 ==================== */
  var APP_ID = 'yuzumemo';
  var VERSION = 'v2.1';
  var LS_DATA = 'yuzumemo.v2.data';
  var LS_V1 = 'yuzumemo.data.v1';
  var LS_CFG = 'yuzumemo.sync.v1';
  var LS_PIN = 'yuzumemo.pin.v1';
  var LS_UI = 'yuzumemo.v2.ui';
  var SYNC_BASE = 'https://mantledb.sh/v2/';
  var SYNC_PART_MAX = 58000;
  var SYNC_PARTS_PER_NS = 88;
  var PHOTO_MAX_CHARS = 150000;

  var COLORS = [
    { k: 'blue', bg: '#cfe4f8', ink: '#33587d' },
    { k: 'yellow', bg: '#ffe98f', ink: '#7a6200' },
    { k: 'pink', bg: '#ffd7e0', ink: '#8a4155' },
    { k: 'mint', bg: '#cdf0e0', ink: '#2f6a55' },
    { k: 'lilac', bg: '#e3dcff', ink: '#524a86' },
    { k: 'peach', bg: '#ffdfc9', ink: '#8a5a34' },
    { k: 'green', bg: '#ddf0c6', ink: '#4d6a2c' },
    { k: 'gray', bg: '#e9eaee', ink: '#5c6068' }
  ];

  var I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 6-6 6 6 6"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.4" cy="12" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="18.6" cy="12" r="1.75"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19.4V5.4"/><path d="m6 11.2 6-6 6 6"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.4" y="4.6" width="17.2" height="14.8" rx="3.2"/><circle cx="8.9" cy="9.7" r="1.5"/><path d="m4.6 17.6 4.9-4.6 3.2 3 2.5-2.4 4.2 4"/></svg>',
    bubble: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 11.6c0 4-3.8 7.2-8.4 7.2-1 0-2-.1-2.9-.4L4 20.2l1.5-3.9c-1.2-1.3-1.9-2.9-1.9-4.7 0-4 3.8-7.2 8.4-7.2s8.4 3.2 8.4 7.2Z"/><circle cx="8.6" cy="11.7" r=".95" fill="currentColor" stroke="none"/><circle cx="12" cy="11.7" r=".95" fill="currentColor" stroke="none"/><circle cx="15.4" cy="11.7" r=".95" fill="currentColor" stroke="none"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.6" y="10.2" width="14.8" height="10.2" rx="3"/><path d="M8.4 10.2V7.6a3.6 3.6 0 0 1 7.2 0v2.6"/></svg>'
  };

  var GLYPH = I.bubble;

  var data = null;
  var syncCfg = null;
  var ui = {
    tab: 'chat', roomId: '', filter: 'all', q: '', sort: 'recent',
    calY: 0, calM: 0, calDay: '', photoRoom: '', draft: ''
  };
  var calCursor = { y: 0, m: 0 };

  /* ==================== 유틸 ==================== */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(ts) {
    var d = new Date(Number(ts) || Date.now());
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function dayLabel(ts) {
    var d = new Date(Number(ts) || Date.now());
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WD[d.getDay()] + '요일';
  }
  function mdLabel(ts) {
    var d = new Date(Number(ts) || Date.now());
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WD[d.getDay()] + '요일';
  }
  function fmtTime(ts) {
    var d = new Date(Number(ts) || Date.now());
    var h = d.getHours(), m = d.getMinutes();
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 === 0 ? 12 : h % 12) + ':' + pad(m);
  }
  function fmtRoomTime(ts) {
    if (!ts) return '';
    var d = new Date(Number(ts));
    var now = new Date();
    if (dateKey(ts) === dateKey(now.getTime())) return fmtTime(ts);
    var y = new Date(now.getTime() - 86400000);
    if (dateKey(ts) === dateKey(y.getTime())) return '어제';
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.';
  }
  function urlList(text) {
    var out = [], seen = {};
    String(text || '').replace(/https?:\/\/[^\s<>"']+/gi, function (m) {
      var u = m.replace(/[).,!?]+$/, '');
      if (!seen[u]) { seen[u] = 1; out.push(u); }
      return m;
    });
    return out;
  }
  function hostOf(u) {
    try { return new URL(/^[a-z]+:\/\//i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); }
    catch (e) { return String(u || '').slice(0, 40); }
  }
  function pathOf(u) {
    try {
      var x = new URL(u);
      return (x.pathname + (x.search || '')).replace(/^\/$/, '') || '/';
    } catch (e) { return String(u || ''); }
  }
  function normUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }
  function linkifyEsc(text) {
    var out = '', last = 0, re = /https?:\/\/[^\s<>"']+/gi, m;
    var src = String(text || '');
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      var u = m[0].replace(/[).,!?]+$/, '');
      out += '<a class="ilink" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(u) + '</a>';
      last = m.index + u.length;
    }
    out += esc(src.slice(last));
    return out;
  }
  function colorOf(k) {
    for (var i = 0; i < COLORS.length; i++) if (COLORS[i].k === k) return COLORS[i];
    return COLORS[0];
  }
  function toast(msg) {
    var el = $('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }
  function copyText(text, okMsg, inputId) {
    function fallback() {
      var el = inputId ? document.getElementById(inputId) : null;
      if (el) { el.select(); try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('복사 실패 — 길게 눌러 직접 복사해 주세요'); } }
      else toast('복사 실패 — 길게 눌러 직접 복사해 주세요');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else fallback();
  }

  /* ==================== 데이터 ==================== */
  function freshData() {
    return { v: 2, rooms: [], msgs: [], deletedRoomIds: [], deletedMsgIds: [], settings: { sort: 'recent' } };
  }
  function migrateV1(v1) {
    if (!v1 || !Array.isArray(v1.memos)) return null;
    var live = v1.memos.filter(function (m) { return m && !m.deleted; });
    if (!live.length) return null;
    var folders = {};
    (v1.folders || []).forEach(function (f) { if (f && f.id != null) folders[String(f.id)] = f; });
    var byFolder = {}, order = [];
    live.forEach(function (m) {
      var fid = String(m.folderId || 'etc');
      if (!byFolder[fid]) { byFolder[fid] = []; order.push(fid); }
      byFolder[fid].push(m);
    });
    var rooms = [], msgs = [];
    order.forEach(function (fid, i) {
      var f = folders[fid] || { name: '메모' };
      var rid = 'r-' + fid;
      var list = byFolder[fid].sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
      var c = COLORS[i % COLORS.length];
      rooms.push({
        id: rid, title: String(f.name || '메모'), color: c.k, pinned: false,
        createdAt: Number(list[0].createdAt) || Date.now(),
        updatedAt: Number(list[list.length - 1].updatedAt || list[list.length - 1].createdAt) || Date.now(),
        deleted: false, deletedAt: 0
      });
      list.forEach(function (m) {
        var lines = [];
        if (m.title) lines.push(String(m.title));
        if (m.body) lines.push(String(m.body));
        if (m.link && m.link.url) lines.push(normUrl(m.link.url));
        if (m.health) {
          var h = [];
          if (m.health.date) h.push(String(m.health.date));
          if (m.health.hospital) h.push(String(m.health.hospital));
          if (m.health.symptom) h.push(String(m.health.symptom));
          if (Number(m.health.cost) > 0) h.push(Number(m.health.cost).toLocaleString('ko-KR') + '원');
          if (m.health.review) h.push(String(m.health.review));
          if (h.length) lines.push(h.join(' · '));
        }
        msgs.push({
          id: 'm-' + (m.id || uid()), roomId: rid, text: lines.join('\n'), img: '',
          pinned: !!m.pinned,
          createdAt: Number(m.createdAt) || Date.now(),
          updatedAt: Number(m.updatedAt || m.createdAt) || Date.now(),
          deleted: false, deletedAt: 0
        });
      });
    });
    return { v: 2, rooms: rooms, msgs: msgs, deletedRoomIds: [], deletedMsgIds: [], settings: { sort: 'recent' } };
  }
  function loadData() {
    var raw = null;
    try { raw = localStorage.getItem(LS_DATA); } catch (e) {}
    if (raw) { try { data = JSON.parse(raw); } catch (e) { data = null; } }
    if (!data || typeof data !== 'object' || !Array.isArray(data.rooms)) {
      var v1 = null;
      try { var r1 = localStorage.getItem(LS_V1); if (r1) v1 = JSON.parse(r1); } catch (e) { v1 = null; }
      data = migrateV1(v1) || freshData();
    }
    normalizeData();
  }
  function normalizeData() {
    if (!data || typeof data !== 'object') data = freshData();
    if (!Array.isArray(data.rooms)) data.rooms = [];
    if (!Array.isArray(data.msgs)) data.msgs = [];
    if (!Array.isArray(data.deletedRoomIds)) data.deletedRoomIds = [];
    if (!Array.isArray(data.deletedMsgIds)) data.deletedMsgIds = [];
    if (!data.settings || typeof data.settings !== 'object') data.settings = {};
    var roomIds = {};
    data.rooms.forEach(function (r) {
      r.id = String(r.id || ('r-' + uid()));
      r.title = String(r.title || '새 방');
      if (!colorOf(r.color) || !COLORS.some(function (c) { return c.k === r.color; })) r.color = 'blue';
      r.pinned = !!r.pinned;
      r.createdAt = Number(r.createdAt) || Date.now();
      r.updatedAt = Number(r.updatedAt) || r.createdAt;
      r.deleted = !!r.deleted;
      r.deletedAt = Number(r.deletedAt) || 0;
      roomIds[r.id] = 1;
    });
    data.msgs = data.msgs.filter(function (m) { return m && roomIds[String(m.roomId)]; });
    data.msgs.forEach(function (m) {
      m.id = String(m.id || ('m-' + uid()));
      m.roomId = String(m.roomId);
      m.text = String(m.text || '');
      m.img = typeof m.img === 'string' ? m.img : '';
      m.pinned = !!m.pinned;
      m.createdAt = Number(m.createdAt) || Date.now();
      m.updatedAt = Number(m.updatedAt) || m.createdAt;
      m.deleted = !!m.deleted;
      m.deletedAt = Number(m.deletedAt) || 0;
    });
    return data;
  }
  function saveData(opts) {
    try { localStorage.setItem(LS_DATA, JSON.stringify(data)); }
    catch (e) {
      if (!saveData._warned) {
        saveData._warned = true;
        toast('이 기기 저장 공간이 부족해요. 사진을 줄이거나 백업 후 정리해 주세요.');
      }
    }
    if (!(opts && opts.noSync)) scheduleSyncPush();
  }
  function loadUI() {
    var r = {};
    try { r = JSON.parse(localStorage.getItem(LS_UI) || '{}') || {}; } catch (e) { r = {}; }
    if (r.sort === 'old' || r.sort === 'name' || r.sort === 'recent') ui.sort = r.sort;
    if (r.filter === 'pin' || r.filter === 'photo' || r.filter === 'all') ui.filter = r.filter;
    if (typeof r.photoRoom === 'string') ui.photoRoom = r.photoRoom;
    if (typeof r.roomId === 'string') ui.roomId = r.roomId;
    var now = new Date();
    calCursor.y = now.getFullYear(); calCursor.m = now.getMonth();
    ui.calY = calCursor.y; ui.calM = calCursor.m;
    ui.calDay = dateKey(Date.now());
  }
  function saveUI() {
    try {
      localStorage.setItem(LS_UI, JSON.stringify({ sort: ui.sort, filter: ui.filter, photoRoom: ui.photoRoom, roomId: ui.roomId }));
    } catch (e) {}
  }

  /* ==================== 조회 ==================== */
  function liveRooms() { return data.rooms.filter(function (r) { return !r.deleted; }); }
  function trashRooms() { return data.rooms.filter(function (r) { return r.deleted; }); }
  function findRoom(id) {
    for (var i = 0; i < data.rooms.length; i++) if (data.rooms[i].id === id) return data.rooms[i];
    return null;
  }
  function findMsg(id) {
    for (var i = 0; i < data.msgs.length; i++) if (data.msgs[i].id === id) return data.msgs[i];
    return null;
  }
  function liveMsgs() { return data.msgs.filter(function (m) { return !m.deleted; }); }
  function visibleMsgs() {
    var ok = {};
    liveRooms().forEach(function (r) { ok[r.id] = 1; });
    return data.msgs.filter(function (m) { return !m.deleted && ok[m.roomId]; });
  }
  function trashMsgs() { return data.msgs.filter(function (m) { return m.deleted; }); }
  function roomMsgs(roomId) {
    return data.msgs.filter(function (m) { return !m.deleted && m.roomId === roomId; })
      .sort(function (a, b) { return (a.createdAt - b.createdAt) || String(a.id).localeCompare(String(b.id)); });
  }
  function photoMsgsOf(roomId) { return roomMsgs(roomId).filter(function (m) { return !!m.img; }); }
  function roomActivity(r) {
    var ms = roomMsgs(r.id);
    return ms.length ? ms[ms.length - 1].createdAt : (r.createdAt || 0);
  }
  function previewText(text) {
    return String(text || '').replace(/https?:\/\/[^\s<>"']+/gi, function (u) { return hostOf(u); }).replace(/\s+/g, ' ').trim();
  }
  function previewOf(r) {
    var ms = roomMsgs(r.id);
    if (!ms.length) return '아직 메시지가 없어요';
    var last = ms[ms.length - 1];
    var t = previewText(last.text);
    if (last.img && !t) return '사진 1장';
    if (last.img) return '사진 · ' + t;
    return t || '(빈 메모)';
  }
  function sortedRooms() {
    var list = liveRooms();
    if (ui.filter === 'pin') list = list.filter(function (r) { return r.pinned; });
    if (ui.filter === 'photo') list = list.filter(function (r) { return photoMsgsOf(r.id).length > 0; });
    var q = ui.q.trim().toLowerCase();
    if (q) {
      list = list.filter(function (r) {
        if (r.title.toLowerCase().indexOf(q) >= 0) return true;
        return roomMsgs(r.id).some(function (m) { return String(m.text || '').toLowerCase().indexOf(q) >= 0; });
      });
    }
    list.sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      if (ui.sort === 'old') return roomActivity(a) - roomActivity(b);
      if (ui.sort === 'name') return String(a.title).localeCompare(String(b.title), 'ko');
      return roomActivity(b) - roomActivity(a);
    });
    return list;
  }
  function dateCounts() {
    var map = {};
    visibleMsgs().forEach(function (m) { var k = dateKey(m.createdAt); map[k] = (map[k] || 0) + 1; });
    return map;
  }

  /* ==================== 레이아웃 ==================== */
  function isPC() { return window.matchMedia('(min-width:900px)').matches; }
  function applyLayout() {
    var pc = isPC();
    var room = ui.roomId ? findRoom(ui.roomId) : null;
    if (room && room.deleted) { room = null; ui.roomId = ''; }
    var tab = ui.tab;
    $('#sidePane').hidden = !pc && (tab !== 'chat' || !!room);
    $('#mainPane').hidden = !pc && tab === 'chat' && !room;
    $('#tabbar').hidden = pc || (tab === 'chat' && !!room);
    $('#pcTabs').hidden = !pc;
    $('#viewRoom').hidden = !(tab === 'chat' && !!room);
    $('#viewPhotos').hidden = tab !== 'photos';
    $('#viewCal').hidden = tab !== 'cal';
    $('#viewSet').hidden = tab !== 'set';
    $('#mainHint').hidden = !(pc && tab === 'chat' && !room);
    var app = $('#app');
    app.dataset.tab = tab;
    app.dataset.hasRoom = room ? '1' : '';
    $$('#pcTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    $$('#tabbar .tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
  }

  /* ==================== 방 목록 ==================== */
  function renderChips() {
    var live = liveRooms();
    var defs = [
      { k: 'all', label: '전체', n: live.length },
      { k: 'pin', label: '고정', n: live.filter(function (r) { return r.pinned; }).length },
      { k: 'photo', label: '사진 있음', n: live.filter(function (r) { return photoMsgsOf(r.id).length > 0; }).length }
    ];
    $('#chips').innerHTML = defs.map(function (d) {
      return '<button class="chip' + (ui.filter === d.k ? ' on' : '') + '" type="button" data-filter="' + d.k + '">' +
        esc(d.label) + (d.n > 0 ? '<span class="c">' + d.n + '</span>' : '') + '</button>';
    }).join('');
  }
  function roomRowHTML(r) {
    var c = colorOf(r.color);
    var ms = roomMsgs(r.id);
    var last = ms[ms.length - 1];
    var ts = last ? last.createdAt : r.createdAt;
    var n = ms.length;
    var pv = previewOf(r);
    var isPhotoPv = !!(last && last.img && !String(last.text || '').trim());
    return '<button class="roomrow" type="button" data-id="' + esc(r.id) + '">' +
      '<span class="ricon" style="background:' + c.bg + ';color:' + c.ink + '">' + GLYPH + '</span>' +
      '<span class="rmain">' +
        '<span class="rtop"><b class="rtitle">' + (r.pinned ? '<span class="pin">📌</span>' : '') + esc(r.title) + '</b>' +
        '<span class="rtime">' + esc(fmtRoomTime(ts)) + '</span></span>' +
        '<span class="rbot"><span class="rprev' + (isPhotoPv ? ' ph' : '') + '">' + esc(pv) + '</span>' +
        (n ? '<span class="rbadge">' + n + '</span>' : '') + '</span>' +
      '</span></button>';
  }
  function renderList() {
    var ttl = ui.roomId ? (findRoom(ui.roomId) || {}).title : '';
    document.title = (ttl ? ttl + ' · ' : '') + '유자 메모';
    renderChips();
    $('#sortLabel').textContent = ui.sort === 'old' ? '오래된순' : (ui.sort === 'name' ? '이름순' : '최신순');
    var list = sortedRooms();
    var box = $('#roomList'), empty = $('#listEmpty');
    if (!list.length) {
      box.innerHTML = '';
      empty.hidden = false;
      var q = ui.q.trim();
      if (q) {
        empty.innerHTML = '<div class="big">' + I.bubble + '</div><b>검색 결과가 없어요</b><p>“' + esc(q) + '”가 들어간 방이나 메시지가 없습니다.</p>';
      } else if (ui.filter !== 'all') {
        empty.innerHTML = '<div class="big">' + I.bubble + '</div><b>' + (ui.filter === 'pin' ? '고정한 방이 없어요' : '사진이 있는 방이 없어요') + '</b><p>방을 길게 눌러 고정하거나, 방 안에서 사진을 보내 보세요.</p>';
      } else {
        empty.innerHTML = '<div class="big">' + I.bubble + '</div><b>아직 채팅방이 없어요</b><p>여행 준비물, 다이어트, 인스타 링크처럼<br>주제별로 방을 만들어 메모해 보세요.</p>' +
          '<button class="btn yellow" type="button" id="emptyNew">＋ 새 방 만들기</button>';
        var en = $('#emptyNew'); if (en) en.onclick = openNewRoom;
      }
      return;
    }
    empty.hidden = true;
    box.innerHTML = list.map(roomRowHTML).join('');
  }

  /* ==================== 채팅방 ==================== */
  function msgHTML(m) {
    var text = String(m.text || '');
    var urls = urlList(text);
    var textNoUrls = text.split(/\n/).map(function (line) {
      return line.replace(/https?:\/\/[^\s<>"']+/gi, '').replace(/[ \t]{2,}/g, ' ').trim();
    });
    while (textNoUrls.length && !textNoUrls[0]) textNoUrls.shift();
    while (textNoUrls.length && !textNoUrls[textNoUrls.length - 1]) textNoUrls.pop();
    var plain = textNoUrls.join('\n').trim();
    var inner = '';
    if (m.img) {
      inner += '<div class="mimgwrap"><img src="' + m.img + '" alt="사진" data-photo="' + esc(m.id) + '" loading="lazy">' +
        '<button class="mimgdl" type="button" data-dl-photo="' + esc(m.id) + '" aria-label="사진 저장">⬇ 저장</button></div>';
      if (plain) inner += '<div class="cap">' + linkifyEsc(plain) + '</div>';
    } else if (plain) {
      inner += '<div class="mtext">' + linkifyEsc(plain) + '</div>';
    }
    if (urls.length) inner += urls.slice(0, 3).map(linkCard).join('');
    if (!inner) inner = '<div class="mtext">(빈 메모)</div>';
    var cls = 'bubble' + (m.img ? ' photo' : '') + (m.pinned ? ' pinned' : '');
    return '<div class="msg" id="msg-' + esc(m.id) + '">' +
      '<div class="mwrap">' +
        (m.pinned ? '<div class="mflag">📌 고정</div>' : '') +
        '<div class="mline"><span class="mtime">' + fmtTime(m.createdAt) + '</span>' +
        '<div class="' + cls + '" data-mid="' + esc(m.id) + '">' + inner + '</div></div>' +
      '</div></div>';
  }
  function linkCard(url) {
    var host = hostOf(url);
    var icon = /instagram\.com/.test(host) ? '📷' : (/youtu/.test(host) ? '▶️' : (/naver\.com/.test(host) ? '🟢' : '🔗'));
    return '<a class="linkcard" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="lg">' + icon + '</span>' +
      '<span class="lt"><b>' + esc(host) + '</b><small>' + esc(pathOf(url)) + '</small></span>' +
      '<span class="ar">↗</span></a>';
  }
  function isNearBottom(sc) {
    if (!sc) return true;
    return sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80;
  }
  function renderRoom(opts) {
    opts = opts || {};
    var el = $('#viewRoom');
    var room = ui.roomId ? findRoom(ui.roomId) : null;
    if (!room) { el.innerHTML = ''; return; }
    var prevScroll = null;
    var oldScroll = $('#msgScroll');
    if (oldScroll) prevScroll = { top: oldScroll.scrollTop, bottom: isNearBottom(oldScroll) };
    var ms = roomMsgs(room.id);
    var photos = ms.filter(function (m) { return !!m.img; }).length;
    var pinned = ms.filter(function (m) { return m.pinned; });
    var pinBar = '';
    if (pinned.length) {
      pinBar = '<div class="pinnedbar" id="pinnedBar"><span>📌 고정 ' + pinned.length + '</span>' + pinned.map(function (m) {
        var snip = String(m.text || '').replace(/\s+/g, ' ').trim() || '사진';
        return '<button type="button" class="pinjump" data-mid="' + esc(m.id) + '">' + esc(snip.slice(0, 26)) + '</button>';
      }).join('') + '</div>';
    }
    var body;
    if (!ms.length) {
      body = '<div class="bigempty"><div class="big">' + I.bubble + '</div><b>첫 메모를 남겨 보세요</b>' +
        '<p>이 방에만 모이는 메모장이에요.<br>사진은 ＋ 버튼으로, 링크는 붙여넣으면 카드로 열려요.</p></div>';
    } else {
      var h = '', lastDay = '';
      ms.forEach(function (m) {
        var dk = dateKey(m.createdAt);
        if (dk !== lastDay) { h += '<div class="daysep"><span>' + dayLabel(m.createdAt) + '</span></div>'; lastDay = dk; }
        h += msgHTML(m);
      });
      body = '<div class="msgs">' + h + '<div class="msgend"></div></div>';
    }
    el.innerHTML = '<div class="roomwrap">' +
      '<header class="roomhead">' +
        '<button class="rhback" type="button" id="roomBack" aria-label="뒤로">' + I.back + '</button>' +
        '<div class="rhtitle"><b>' + esc(room.title) + '</b><small>메시지 ' + ms.length + (photos ? ' · 사진 ' + photos : '') + '</small></div>' +
        '<button class="rhmenu" type="button" id="roomMenu" aria-label="방 메뉴">' + I.dots + '</button>' +
      '</header>' + pinBar +
      '<div class="msgscroll" id="msgScroll">' + body + '</div>' +
      '<div class="composer"><div class="cin">' +
        '<button class="plus" type="button" id="btnPhoto" aria-label="사진 첨부">＋</button>' +
        '<textarea id="msgInput" rows="1" placeholder="메시지를 입력하세요" enterkeyhint="send"></textarea>' +
        '<button class="send" type="button" id="btnSend" aria-label="보내기" disabled>' + I.send + '</button>' +
      '</div></div></div>';

    var inp = $('#msgInput');
    if (inp) {
      inp.value = ui.draft || '';
      autoGrow(inp);
      syncSendState();
      inp.addEventListener('input', function () {
        ui.draft = inp.value;
        autoGrow(inp);
        syncSendState();
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendText(); }
      });
    }
    var sc = $('#msgScroll');
    if (sc) {
      if (opts.msgId) {
        // 위치는 openRoom에서 맞춘다
      } else if (opts.bottom || !prevScroll || prevScroll.bottom) {
        sc.scrollTop = sc.scrollHeight;
      } else {
        sc.scrollTop = prevScroll.top;
      }
    }
    if (opts.msgId) focusMsg(opts.msgId, true);
  }
  function focusMsg(mid, scroll) {
    var node = document.getElementById('msg-' + mid);
    if (!node) return;
    var sc = $('#msgScroll');
    if (scroll && sc) {
      var rect = node.getBoundingClientRect(), srect = sc.getBoundingClientRect();
      var next = sc.scrollTop + (rect.top - srect.top) - sc.clientHeight * 0.4;
      sc.scrollTop = Math.max(0, next);
    }
    node.classList.add('hit');
    setTimeout(function () { node.classList.remove('hit'); }, 1600);
  }
  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(118, Math.max(38, el.scrollHeight)) + 'px';
  }
  function syncSendState() {
    var b = $('#btnSend'), i = $('#msgInput');
    if (b && i) b.disabled = !i.value.trim();
  }
  function openRoom(id, opts) {
    opts = opts || {};
    var room = findRoom(id);
    if (!room || room.deleted) { toast('없는 방이에요'); return; }
    if (ui.roomId !== id) ui.draft = '';
    ui.roomId = id; ui.tab = 'chat';
    saveUI();
    if ($('#viewer') && !$('#viewer').hidden) closeViewer();
    renderRoom({ bottom: !opts.msgId, msgId: opts.msgId });
    applyLayout();
    setTimeout(function () {
      if (opts.msgId) focusMsg(opts.msgId, true);
      var i = $('#msgInput'); if (i && isPC()) i.focus();
    }, 40);
  }
  function closeRoom() {
    ui.roomId = ''; ui.draft = ''; saveUI();
    $('#viewRoom').innerHTML = '';
    applyLayout();
  }
  function addMsg(o) {
    var room = ui.roomId ? findRoom(ui.roomId) : null;
    if (!room) return null;
    var now = Date.now();
    var m = {
      id: 'm-' + uid(), roomId: room.id, text: String(o.text || ''), img: o.img || '',
      pinned: false, createdAt: now, updatedAt: now, deleted: false, deletedAt: 0
    };
    data.msgs.push(m);
    room.updatedAt = now;
    saveData();
    renderRoom({ bottom: true });
    renderList();
    return m;
  }
  function sendText() {
    var inp = $('#msgInput');
    if (!inp) return;
    var t = inp.value.trim();
    if (!t) return;
    ui.draft = '';
    var m = addMsg({ text: t });
    if (!m) return;
    var i = $('#msgInput');
    if (i) { i.value = ''; autoGrow(i); syncShowSend(); }
    if (isPC()) { var j = $('#msgInput'); if (j) j.focus(); }
  }
  function syncShowSend() {
    var b = $('#btnSend'), i = $('#msgInput');
    if (b && i) b.disabled = !i.value.trim();
  }

  /* ==================== 메시지 메뉴/사진 ==================== */
  function openMsgMenu(mid) {
    var m = findMsg(mid);
    if (!m || m.deleted) return;
    openSheet('메시지', [
      '<button class="act" type="button" data-a="copy"><span class="aico">📋</span>복사</button>',
      '<button class="act" type="button" data-a="pin"><span class="aico">📌</span>' + (m.pinned ? '고정 해제' : '고정') + '</button>',
      '<button class="act danger" type="button" data-a="del"><span class="aico">🗑</span>삭제 (휴지통으로)</button>'
    ].join(''), null, function (a) {
      if (a === 'copy') {
        var t = String(m.text || '') || (m.img ? '[사진]' : '');
        copyText(t, '복사했어요');
        closeSheet();
      } else if (a === 'pin') {
        m.pinned = !m.pinned; m.updatedAt = Date.now();
        saveData(); renderRoom(); renderList(); closeSheet();
        toast(m.pinned ? '고정했어요' : '고정을 풀었어요');
      } else if (a === 'del') {
        m.deleted = true; m.deletedAt = Date.now(); m.updatedAt = Date.now();
        saveData(); renderRoom(); renderList(); closeSheet();
        toast('휴지통으로 옮겼어요');
      }
    });
  }
  function openPhotoPicker() {
    var f = $('#fileInput');
    if (!f) return;
    f.value = '';
    f.click();
  }
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('파일이 없습니다')); return; }
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var maxSide = 1400;
          var nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
          var scale = Math.min(1, maxSide / Math.max(nw, nh));
          var w = Math.max(1, Math.round(nw * scale)), h = Math.max(1, Math.round(nh * scale));
          var canvas = document.createElement('canvas');
          var ctx;
          function draw() {
            canvas.width = w; canvas.height = h;
            ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
          }
          draw();
          var q = 0.72, out = canvas.toDataURL('image/jpeg', q), tries = 0;
          while (out.length > PHOTO_MAX_CHARS && tries < 8) {
            if (q > 0.36) { q = Math.max(0.36, q - 0.08); }
            else { w = Math.max(1, Math.round(w * 0.82)); h = Math.max(1, Math.round(h * 0.82)); draw(); }
            out = canvas.toDataURL('image/jpeg', q);
            tries++;
          }
          resolve({ data: out, w: canvas.width, h: canvas.height });
        };
        img.onerror = function () { reject(new Error('이미지를 읽지 못했어요')); };
        img.src = fr.result;
      };
      fr.onerror = function () { reject(new Error('파일을 읽지 못했어요')); };
      fr.readAsDataURL(file);
    });
  }

  /* ==================== 사진 탭 ==================== */
  function renderPhotos() {
    var el = $('#viewPhotos');
    var all = visibleMsgs().filter(function (m) { return !!m.img; });
    var scope = ui.photoRoom && findRoom(ui.photoRoom) ? ui.photoRoom : '';
    if (!scope) ui.photoRoom = '';
    var list = all.filter(function (m) { return !scope || m.roomId === scope; });
    list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    var rooms = liveRooms().filter(function (r) { return all.some(function (m) { return m.roomId === r.id; }); });
    el.innerHTML = '<header class="pagehead"><div class="ph-row"><h2>사진</h2><span class="cnt">' + list.length + '장</span></div>' +
      '<div class="pfilters" id="photoRooms">' +
      '<button class="chip' + (!scope ? ' on' : '') + '" type="button" data-room="">전체</button>' +
      rooms.map(function (r) {
        return '<button class="chip' + (scope === r.id ? ' on' : '') + '" type="button" data-room="' + esc(r.id) + '">' + esc(r.title) + '</button>';
      }).join('') + '</div></header>' +
      '<div class="pgallery" id="photoGrid"></div>';
    var grid = $('#photoGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="bigempty"><div class="big">' + I.photo + '</div><b>사진이 없어요</b><p>채팅방에서 ＋ 버튼으로 사진을 보내면<br>여기 날짜별로 모여요.</p></div>';
      return;
    }
    var groups = [], byKey = {};
    list.forEach(function (m) {
      var k = dateKey(m.createdAt);
      if (!byKey[k]) { var g = { k: k, items: [], ts: m.createdAt }; byKey[k] = g; groups.push(g); }
      byKey[k].items.push(m); byKey[k].ts = m.createdAt;
    });
    grid.innerHTML = groups.map(function (g) {
      return '<div class="pgroup"><div class="pghead">' + dayLabel(g.ts) + ' · ' + g.items.length + '장</div>' +
        '<div class="pgrid">' + g.items.map(function (m) {
          var r = findRoom(m.roomId);
          return '<div class="pthumbwrap"><button class="pthumb" type="button" data-photo="' + esc(m.id) + '">' +
            '<img src="' + m.img + '" alt="사진" loading="lazy">' +
            '<span class="ptroom">' + esc(r ? r.title : '') + '</span></button>' +
            '<button class="pthumbdl" type="button" data-dl-photo="' + esc(m.id) + '" aria-label="사진 저장">⬇</button></div>';
        }).join('') + '</div></div>';
    }).join('');
  }

  /* ==================== 사진 크게 보기 ==================== */
  function openViewer(mid) {
    var m = findMsg(mid);
    if (!m || !m.img) return;
    var r = findRoom(m.roomId);
    var el = $('#viewer');
    el.hidden = false;
    el.innerHTML = '<div class="vhead"><div class="vhost"><b>' + esc(r ? r.title : '') + '</b>' +
      '<small>' + mdLabel(m.createdAt) + ' ' + fmtTime(m.createdAt) + '</small></div>' +
      '<button class="vclose" type="button" id="vClose" aria-label="닫기">✕</button></div>' +
      '<div class="vimg"><img src="' + m.img + '" alt="사진"></div>' +
      '<div class="vfoot"><button type="button" class="save" id="vSave">⬇ 저장</button>' +
      '<button type="button" id="vGo">방 열기</button><button type="button" class="danger" id="vDel">삭제</button></div>';
    $('#vClose').onclick = closeViewer;
    $('#vSave').onclick = function () { savePhotoMsg(m); };
    $('#vGo').onclick = function () { closeViewer(); openRoom(m.roomId, { msgId: m.id }); };
    $('#vDel').onclick = function () {
      askConfirm({ title: '사진 삭제', message: '이 사진 메모를 휴지통으로 옮길까요?', okText: '삭제', danger: true }).then(function (ok) {
        if (!ok) return;
        m.deleted = true; m.deletedAt = Date.now(); m.updatedAt = Date.now();
        saveData();
        closeViewer();
        if (ui.roomId === m.roomId) renderRoom();
        renderList();
        if (ui.tab === 'photos') renderPhotos();
        toast('휴지통으로 옮겼어요');
      });
    };
  }
  function closeViewer() {
    var el = $('#viewer');
    el.hidden = true; el.innerHTML = '';
  }

  /* ==================== 사진 저장(다운로드) ==================== */
  function photoFileName(m) {
    var d = new Date((m && m.createdAt) || Date.now());
    return 'yuzumemo_사진_' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.jpg';
  }
  function dataUrlToBlob(u) {
    try {
      var s = String(u || ''), i = s.indexOf(',');
      if (i < 0) return null;
      var head = s.slice(0, i), body = s.slice(i + 1);
      var mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
      if (/;base64/i.test(head)) {
        var bin = atob(body), arr = new Uint8Array(bin.length);
        for (var k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
        return new Blob([arr], { type: mime });
      }
      return new Blob([decodeURIComponent(body)], { type: mime });
    } catch (e) { return null; }
  }
  function isIOS() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function photoDownload(blob, name) {
    if (!blob) { toast('사진을 꺼내지 못했어요'); return; }
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 5000);
      toast(isIOS() ? '저장했어요 · 파일 앱 > 다운로드에서 확인' : '사진을 내려받았어요');
    } catch (e) {
      toast('이 브라우저에서는 저장이 안 돼요 · 사진을 길게 눌러 저장해 주세요');
    }
  }
  function savePhotoMsg(m) {
    if (!m || !m.img) { toast('저장할 사진이 없어요'); return; }
    var name = photoFileName(m);
    var blob = dataUrlToBlob(m.img);
    /* 아이폰은 공유 창의 '사진에 저장'이 가장 확실하다 */
    if (isIOS() && blob && navigator.canShare) {
      try {
        var file = new File([blob], name, { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: name }).then(function () {
            toast('공유 창에서 저장을 골라 주세요');
          }, function (err) {
            if (err && err.name === 'AbortError') return;
            photoDownload(blob, name);
          });
          return;
        }
      } catch (e) {}
    }
    photoDownload(blob, name);
  }

  /* ==================== 캘린더 ==================== */
  function renderCal() {
    var el = $('#viewCal');
    el.innerHTML = '<header class="pagehead"><div class="ph-row"><h2>캘린더</h2><span class="cnt" id="calCnt"></span></div></header>' +
      '<div class="calwrap"><div class="calhead"><button class="calnav" type="button" id="calPrev" aria-label="이전 달">‹</button>' +
      '<b id="calTitle"></b><button class="calnav" type="button" id="calNext" aria-label="다음 달">›</button></div>' +
      '<div class="caldow"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>' +
      '<div class="calgrid" id="calGrid"></div><div class="calday" id="calDay"></div></div>';
    $('#calPrev').onclick = function () { shiftMonth(-1); };
    $('#calNext').onclick = function () { shiftMonth(1); };
    $('#calGrid').onclick = function (e) {
      var c = e.target.closest('.calcell');
      if (!c) return;
      var full = c.dataset.full;
      if (!full) return;
      var d = new Date(full + 'T00:00:00');
      ui.calY = d.getFullYear(); ui.calM = d.getMonth();
      ui.calDay = full;
      paintCal();
    };
    $('#calDay').onclick = function (e) {
      var row = e.target.closest('.dayrow');
      if (!row) return;
      openRoom(row.dataset.room, { msgId: row.dataset.mid });
    };
    paintCal();
  }
  function shiftMonth(d) {
    var y = ui.calY, m = ui.calM + d;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    ui.calY = y; ui.calM = m;
    paintCal();
  }
  function paintCal() {
    var y = ui.calY, m = ui.calM;
    var title = $('#calTitle');
    if (!title) return;
    title.textContent = y + '년 ' + (m + 1) + '월';
    var counts = dateCounts();
    var firstDow = new Date(y, m, 1).getDay();
    var daysIn = new Date(y, m + 1, 0).getDate();
    var prevDays = new Date(y, m, 0).getDate();
    var total = Math.ceil((firstDow + daysIn) / 7) * 7;
    var todayK = dateKey(Date.now());
    var h = '';
    for (var i = 0; i < total; i++) {
      var dayNum, cellY = y, cellM = m, out = false;
      if (i < firstDow) { dayNum = prevDays - firstDow + i + 1; out = true; cellM = m - 1; }
      else if (i >= firstDow + daysIn) { dayNum = i - firstDow - daysIn + 1; out = true; cellM = m + 1; }
      else dayNum = i - firstDow + 1;
      var dObj = new Date(cellY, cellM, dayNum);
      var k = dObj.getFullYear() + '-' + pad(dObj.getMonth() + 1) + '-' + pad(dObj.getDate());
      var dow = dObj.getDay();
      var n = counts[k] || 0;
      var dots = '';
      if (n > 0) {
        var cnt = Math.min(3, n);
        for (var d = 0; d < cnt; d++) dots += '<span class="dot"></span>';
      }
      var cls = 'calcell' + (out ? ' out' : '') + (dow === 0 ? ' sun' : (dow === 6 ? ' sat' : '')) +
        (k === todayK ? ' today' : '') + (k === ui.calDay ? ' sel' : '');
      h += '<div class="' + cls + '" data-date="' + (out ? '' : k) + '" data-full="' + k + '">' +
        '<span class="num">' + dayNum + '</span><span class="dots">' + dots + '</span></div>';
    }
    $('#calGrid').innerHTML = h;
    var dayMs = visibleMsgs().filter(function (mm) { return dateKey(mm.createdAt) === ui.calDay; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
    var dayD = new Date(ui.calDay + 'T00:00:00');
    var dTitle = (dayD.getMonth() + 1) + '월 ' + dayD.getDate() + '일 ' + WD[dayD.getDay()] + '요일';
    var dh = '<h4>' + dTitle + ' <span>' + dayMs.length + '건</span></h4>';
    if (!dayMs.length) {
      dh += '<div class="bigempty" style="padding:30px 16px"><div class="big">' + I.bubble + '</div><b>이 날 남긴 메모가 없어요</b><p>다른 날짜를 눌러 보세요.</p></div>';
    } else {
      dh += dayMs.map(function (mm) {
        var r = findRoom(mm.roomId);
        var c = colorOf(r ? r.color : 'blue');
        var text = previewText(mm.text);
        return '<button class="dayrow" type="button" data-room="' + esc(mm.roomId) + '" data-mid="' + esc(mm.id) + '">' +
          '<span class="dr-ico" style="background:' + c.bg + ';color:' + c.ink + '">' + GLYPH + '</span>' +
          '<span class="dr-main"><span class="dr-top"><b>' + esc(r ? r.title : '') + '</b><span class="t">' + fmtTime(mm.createdAt) + '</span></span>' +
          '<span class="dr-text' + (mm.img && !text ? ' imgonly' : '') + '">' + esc(mm.img && !text ? '사진 1장' : (text || '사진 1장')) + '</span></span></button>';
      }).join('');
    }
    $('#calDay').innerHTML = dh;
    var cnt = $('#calCnt');
    if (cnt) {
      var monthCount = 0;
      Object.keys(counts).forEach(function (k) {
        if (k.indexOf(y + '-' + pad(m + 1)) === 0) monthCount += counts[k];
      });
      cnt.textContent = '이번 달 ' + monthCount + '건';
    }
  }

  /* ==================== 설정 ==================== */
  function cloudGapHtml() {
    var c = syncCfg.lastCount || null;
    if (!c) return '';
    var gap = (liveRooms().length > 0 && !(Number(c.rooms) > 0)) ||
      (visibleMsgs().length > 0 && !(Number(c.msgs) > 0));
    if (!gap) return '';
    return '<p class="help warn">이 기기 기록이 클라우드에 아직 안 올라갔어요 · <b>지금 동기화</b>를 눌러 주세요</p>';
  }
  function renderSyncSection() {
    var connected = syncConnected();
    var last = syncTimeText(syncCfg.lastSync);
    var h = '<section class="sec"><h3>☁️ 클라우드 동기화</h3>';
    h += '<div class="srow"><span class="k">상태</span><span class="v">' +
      (connected ? '<span class="statepill on">● 연결됨</span>' : '<span class="statepill off">○ 연결 안 됨</span>') + '</span></div>';
    if (connected) {
      h += '<div class="srow"><span class="k">동기화 코드</span></div>' +
        '<div class="codebox"><input id="syncCodeView" type="text" readonly value="' + esc(syncCfg.ns) + '">' +
        '<button class="btn" type="button" id="copyCode">복사</button></div>' +
        '<div class="srow"><span class="k">전용 링크</span></div>' +
        '<div class="codebox"><input id="syncLinkView" type="text" readonly value="' + esc(syncLinkText()) + '">' +
        '<button class="btn" type="button" id="copyLink">복사</button></div>' +
        '<p class="help">마지막 동기화 ' + esc(last) + (syncCfg.lastError ? ' · ⚠️ ' + esc(syncCfg.lastError) : '') + '</p>' +
        cloudGapHtml() +
        '<div class="srow"><span class="k">다른 코드로 연결</span></div>' +
        '<div class="codebox"><input id="syncJoin" type="text" placeholder="코드 또는 링크 붙여넣기" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<button class="btn" type="button" id="syncJoinBtn">연결</button></div>' +
        '<p class="help">지금 코드와 다른 코드를 넣으면 이 기기 기록을 그 코드에 합쳐요 (연결이 바뀝니다)</p>' +
        '<div class="srow"><span class="k">자동 동기화</span><button class="tg' + (syncCfg.auto ? ' on' : '') + '" type="button" id="tgAuto" aria-label="자동 동기화"></button></div>' +
        '<div class="btnrow"><button class="btn" type="button" id="syncNow">지금 동기화</button>' +
        '<button class="btn" type="button" id="syncNew">새 코드</button></div>' +
        '<button class="btn danger block" type="button" id="syncOff">이 기기에서 연결 해제</button>';
    } else {
      h += '<p class="help">이 기기 브라우저에만 저장되고 있어요. 동기화 코드를 만들면 PC·아이폰이 실시간으로 맞춰져요.</p>' +
        '<button class="btn primary block" type="button" id="syncNew">새 동기화 코드 만들기</button>' +
        '<div class="codebox"><input id="syncJoin" type="text" placeholder="코드 또는 링크 붙여넣기 (예: yuzumemo-ab12cd34ef)" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<button class="btn" type="button" id="syncJoinBtn">연결</button></div>' +
        '<p class="help">받은 링크를 그대로 붙여넣어도 돼요 · Enter로도 연결돼요</p>';
    }
    h += '<p class="help warn">링크를 아는 사람은 메모를 볼 수 있어요. 공개 페이지 소스에는 코드가 들어가지 않고, 이 기기 저장소에만 남습니다.</p>';
    h += '</section>';
    return h;
  }
  function renderSet() {
    var el = $('#viewSet');
    /* v2.1: 다시 그려도 입력 중이던 코드/링크는 그대로 둔다 (동기화가 끝나면 renderSet이 불린다) */
    var keepJoin = ($('#syncJoin') ? $('#syncJoin').value : '');
    var joinFocus = !!(document.activeElement && document.activeElement.id === 'syncJoin');
    var live = visibleMsgs().length;
    var rooms = liveRooms().length;
    var photos = visibleMsgs().filter(function (m) { return !!m.img; }).length;
    var tr = trashRooms().length, trm = trashMsgs().length;
    var html = '<div class="setwrap"><div class="sethead"><h2>설정</h2></div>' +
      renderSyncSection() +
      '<section class="sec"><h3>🔒 잠금</h3>' +
        '<div class="srow"><span class="k">4자리 PIN</span><span class="v">' + (hasPin() ? '켜짐' : '꺼짐') + '</span></div>' +
        (hasPin()
          ? '<div class="btnrow"><button class="btn" type="button" id="pinLockNow">지금 잠그기</button>' +
            '<button class="btn" type="button" id="pinChange">PIN 변경</button></div>' +
            '<button class="btn danger block" type="button" id="pinRemove">잠금 해제</button>'
          : '<p class="help">앱을 열 때 4자리 PIN을 물어봐요. 이 기기에만 적용돼요.</p>' +
            '<button class="btn primary block" type="button" id="pinSet">PIN 4자리 설정</button>') +
      '</section>' +
      '<section class="sec"><h3>💬 채팅방</h3>' +
        '<div class="srow"><span class="k">방 ' + rooms + '개</span><span class="v">정렬 ' +
        (ui.sort === 'old' ? '오래된순' : (ui.sort === 'name' ? '이름순' : '최신순')) + '</span></div>' +
        '<button class="btn yellow block" type="button" id="setNewRoom">＋ 새 방 만들기</button>' +
        '<p class="help">방을 길게 누르면 고정 · 이름 변경 · 색 변경 · 삭제할 수 있어요.</p>' +
      '</section>' +
      '<section class="sec"><h3>📦 백업</h3>' +
        '<div class="meterrow"><span>방 <b>' + rooms + '</b></span><span>메시지 <b>' + live + '</b></span><span>사진 <b>' + photos + '</b></span></div>' +
        '<div class="btnrow"><button class="btn" type="button" id="exportBtn">내보내기 (JSON)</button>' +
        '<button class="btn" type="button" id="importBtn">가져오기</button></div>' +
        '<p class="help">가져오기는 지금 기록에 합쳐요. 같은 항목은 최신 것으로 맞춰집니다.</p>' +
      '</section>' +
      '<section class="sec"><h3>🗑 휴지통</h3>' +
        '<div class="srow"><span class="k">방 ' + tr + '개 · 메시지 ' + trm + '개</span>' +
        '<button class="btn" type="button" id="trashOpen">열기</button></div>' +
      '</section>' +
      '<section class="sec"><h3>ℹ️ 정보</h3>' +
        '<div class="srow"><span class="k">버전</span><span class="v">유자 메모 ' + VERSION + '</span></div>' +
        '<p class="help">카톡 채팅방처럼 쓰는 개인 메모장 · 사진·링크·캘린더 · 4자리 PIN · 클라우드 동기화</p>' +
      '</section></div>';
    el.innerHTML = html;
    var jn = $('#syncJoin');
    if (jn && keepJoin) {
      jn.value = keepJoin;
      if (joinFocus) { try { jn.focus(); jn.setSelectionRange(jn.value.length, jn.value.length); } catch (e) {} }
    }
    wireSettings();
  }
  function wireSettings() {
    var el = $('#viewSet');
    var codeView = $('#syncCodeView'), linkView = $('#syncLinkView');
    if ($('#copyCode')) $('#copyCode').onclick = function () { copyText(syncCfg.ns, '동기화 코드를 복사했어요', 'syncCodeView'); };
    if ($('#copyLink')) $('#copyLink').onclick = function () { copyText(syncLinkText(), '전용 링크를 복사했어요', 'syncLinkView'); };
    if ($('#syncNow')) $('#syncNow').onclick = function () { syncNow(); };
    if ($('#syncNew')) $('#syncNew').onclick = createSyncCode;
    if ($('#syncOff')) $('#syncOff').onclick = disconnectSync;
    if ($('#tgAuto')) $('#tgAuto').onclick = function () {
      syncCfg.auto = !syncCfg.auto; syncSaveCfg();
      this.classList.toggle('on', !!syncCfg.auto);
      toast(syncCfg.auto ? '자동 동기화를 켰어요' : '자동 동기화를 껐어요');
      if (syncCfg.auto && syncConnected()) syncNow({ silent: true });
    };
    if ($('#syncJoinBtn')) $('#syncJoinBtn').onclick = joinSyncCode;
    if ($('#syncJoin')) $('#syncJoin').onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); joinSyncCode(); }
    };
    if ($('#pinSet')) $('#pinSet').onclick = function () { openPinSheet('set'); };
    if ($('#pinChange')) $('#pinChange').onclick = function () { openPinSheet('change'); };
    if ($('#pinRemove')) $('#pinRemove').onclick = function () { openPinSheet('remove'); };
    if ($('#pinLockNow')) $('#pinLockNow').onclick = function () { lockApp(); toast('잠갔어요'); };
    if ($('#setNewRoom')) $('#setNewRoom').onclick = openNewRoom;
    if ($('#exportBtn')) $('#exportBtn').onclick = exportBackup;
    if ($('#importBtn')) $('#importBtn').onclick = function () { var f = $('#importInput'); f.value = ''; f.click(); };
    if ($('#trashOpen')) $('#trashOpen').onclick = openTrash;
  }
  function exportBackup() {
    var payload = { app: APP_ID, version: VERSION, exportedAt: new Date().toISOString(), data: data };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'yuzumemo-backup-' + dateKey(Date.now()) + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1200);
    toast('백업 파일을 내려받았어요');
  }
  function importBackup(file) {
    var fr = new FileReader();
    fr.onload = function () {
      var doc = null;
      try { doc = JSON.parse(fr.result); } catch (e) { doc = null; }
      if (!doc || !doc.data || !Array.isArray(doc.data.rooms)) { toast('백업 파일을 읽지 못했어요'); return; }
      askConfirm({ title: '백업 가져오기', message: '지금 기록에 백업 내용을 합칠까요?\n같은 항목은 최신 것으로 맞춰져요.', okText: '가져오기' }).then(function (ok) {
        if (!ok) return;
        var m = mergeRemoteData(data, { data: doc.data });
        data = m.data; normalizeData();
        saveData(); renderAll();
        toast('백업을 가져왔어요' + (m.stats.added ? ' · ' + m.stats.added + '개 추가' : ''));
      });
    };
    fr.readAsText(file);
  }

  /* ==================== 휴지통 ==================== */
  function openTrash() {
    var tr = trashRooms(), trm = trashMsgs().filter(function (m) {
      var r = findRoom(m.roomId); return r && !r.deleted;
    });
    var h = '<p class="help" style="margin-top:0">삭제한 방 ' + tr.length + '개 · 메시지 ' + trm.length + '개</p>';
    if (tr.length) {
      h += '<h3 style="font-size:12px;color:#6f767e;margin:14px 0 2px">방</h3>' + tr.map(function (r) {
        return '<div class="srow" style="border-bottom:1px solid var(--line2)"><span class="k">' + esc(r.title) + '<br><span class="v">' + fmtDateShort(r.deletedAt) + ' 삭제</span></span>' +
          '<button class="btn" type="button" data-restore-room="' + esc(r.id) + '">복원</button></div>';
      }).join('');
    }
    if (trm.length) {
      h += '<h3 style="font-size:12px;color:#6f767e;margin:16px 0 2px">메시지</h3>' + trm.map(function (m) {
        var r = findRoom(m.roomId);
        var snip = String(m.text || '').replace(/\s+/g, ' ').trim() || '사진 1장';
        return '<div class="srow" style="border-bottom:1px solid var(--line2)"><span class="k">' +
          '<span style="font-size:11.5px;color:#7d848d">' + esc(r ? r.title : '') + ' · ' + fmtDateShort(m.deletedAt) + '</span><br>' +
          '<span style="font-size:13px">' + esc(snip.slice(0, 40)) + '</span></span>' +
          '<button class="btn" type="button" data-restore-msg="' + esc(m.id) + '">복원</button></div>';
      }).join('');
    }
    if (!tr.length && !trm.length) {
      h += '<div class="bigempty" style="padding:30px 10px"><div class="big">🗑</div><b>휴지통이 비어 있어요</b><p>삭제한 방과 메시지가 여기에 모여요.</p></div>';
    }
    if (tr.length || trm.length) {
      h += '<button class="btn danger block" type="button" id="emptyTrash" style="margin-top:14px">휴지통 비우기 (완전 삭제)</button>';
    }
    openSheet('휴지통', h, null, function (a) {
      if (a && a.indexOf('room:') === 0) {
        var r = findRoom(a.slice(5));
        if (r) { r.deleted = false; r.deletedAt = 0; r.updatedAt = Date.now(); }
        saveData(); renderAll(); openTrash(); toast('방을 복원했어요');
      } else if (a && a.indexOf('msg:') === 0) {
        var m = findMsg(a.slice(4));
        if (m) { m.deleted = false; m.deletedAt = 0; m.updatedAt = Date.now(); }
        saveData(); renderAll(); openTrash(); toast('메시지를 복원했어요');
      } else if (a === 'empty') {
        askConfirm({ title: '휴지통 비우기', message: '삭제한 방과 메시지를 완전히 지울까요?\n되돌릴 수 없어요.', okText: '완전 삭제', danger: true }).then(function (ok) {
          if (!ok) return;
          purgeTrash();
          closeSheet(); renderAll(); toast('휴지통을 비웠어요');
        });
      }
    });
    var body = $('#sheetBody');
    $$('[data-restore-room]', body).forEach(function (b) {
      b.onclick = function () { sheetAction('room:' + b.dataset.restoreRoom); };
    });
    $$('[data-restore-msg]', body).forEach(function (b) {
      b.onclick = function () { sheetAction('msg:' + b.dataset.restoreMsg); };
    });
    if ($('#emptyTrash')) $('#emptyTrash').onclick = function () { sheetAction('empty'); };
  }
  function purgeTrash() {
    var delRooms = {}, delMsgs = {};
    data.rooms.forEach(function (r) { if (r.deleted) { delRooms[r.id] = 1; data.deletedRoomIds.push(r.id); } });
    data.msgs.forEach(function (m) {
      if (m.deleted || delRooms[m.roomId]) { delMsgs[m.id] = 1; data.deletedMsgIds.push(m.id); }
    });
    data.rooms = data.rooms.filter(function (r) { return !delRooms[r.id]; });
    data.msgs = data.msgs.filter(function (m) { return !delMsgs[m.id]; });
    data.deletedRoomIds = Array.from(new Set(data.deletedRoomIds));
    data.deletedMsgIds = Array.from(new Set(data.deletedMsgIds));
    if (ui.roomId && delRooms[ui.roomId]) ui.roomId = '';
    saveData();
  }
  function fmtDateShort(ts) {
    if (!ts) return '';
    var d = new Date(Number(ts));
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  /* ==================== 방 만들기/메뉴 ==================== */
  function openNewRoom() {
    var pick = COLORS[Math.floor(Math.random() * COLORS.length)].k;
    var html = '<label class="field"><span>방 이름</span>' +
      '<input class="input" id="nrTitle" type="text" placeholder="예) 여행 준비물, 다이어트, 인스타 링크" maxlength="40" autocomplete="off"></label>' +
      '<div class="field"><span>아이콘 색</span><div class="swatches" id="nrColors">' +
      COLORS.map(function (c) {
        return '<button class="sw' + (c.k === pick ? ' on' : '') + '" type="button" data-color="' + c.k + '" style="background:' + c.bg + ';color:' + c.ink + '">' + GLYPH + '</button>';
      }).join('') + '</div></div>' +
      '<button class="btn primary block" type="button" id="nrOk">방 만들기</button>';
    openSheet('새 방', html);
    var chosen = pick;
    var inp = $('#nrTitle');
    setTimeout(function () { if (inp) inp.focus(); }, 80);
    $('#nrColors').onclick = function (e) {
      var b = e.target.closest('[data-color]'); if (!b) return;
      chosen = b.dataset.color;
      $$('#nrColors .sw').forEach(function (s) { s.classList.toggle('on', s === b); });
    };
    function create() {
      var t = (inp && inp.value || '').trim();
      if (!t) { toast('방 이름을 적어 주세요'); if (inp) inp.focus(); return; }
      var now = Date.now();
      var r = { id: 'r-' + uid(), title: t, color: chosen, pinned: false, createdAt: now, updatedAt: now, deleted: false, deletedAt: 0 };
      data.rooms.push(r);
      saveData();
      closeSheet();
      renderList();
      ui.filter = 'all'; ui.q = ''; $('#q').value = '';
      openRoom(r.id);
      toast('새 방을 만들었어요');
    }
    $('#nrOk').onclick = create;
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); create(); } });
  }
  function openRoomMenu(id) {
    var r = findRoom(id);
    if (!r) return;
    var html = '<button class="act" type="button" data-a="open"><span class="aico">💬</span>방 열기</button>' +
      '<button class="act" type="button" data-a="pin"><span class="aico">📌</span>' + (r.pinned ? '고정 해제' : '위에 고정') + '</button>' +
      '<button class="act" type="button" data-a="rename"><span class="aico">✏️</span>이름 변경</button>' +
      '<button class="act" type="button" data-a="color"><span class="aico">🎨</span>색 바꾸기</button>' +
      '<button class="act danger" type="button" data-a="del"><span class="aico">🗑</span>삭제 (휴지통으로)</button>';
    openSheet(r.title, html, null, function (a) {
      if (a === 'open') { closeSheet(); openRoom(r.id); }
      else if (a === 'pin') {
        r.pinned = !r.pinned; r.updatedAt = Date.now();
        saveData(); closeSheet(); renderList(); toast(r.pinned ? '위에 고정했어요' : '고정을 풀었어요');
      } else if (a === 'rename') { closeSheet(); openRenameRoom(r.id); }
      else if (a === 'color') { closeSheet(); openColorRoom(r.id); }
      else if (a === 'del') {
        closeSheet();
        askConfirm({ title: '방 삭제', message: '“' + r.title + '” 방을 휴지통으로 옮길까요?\n안의 메모도 함께 숨겨지고, 휴지통에서 되돌릴 수 있어요.', okText: '삭제', danger: true }).then(function (ok) {
          if (!ok) return;
          r.deleted = true; r.deletedAt = Date.now(); r.updatedAt = Date.now();
          if (ui.roomId === r.id) { ui.roomId = ''; ui.draft = ''; $('#viewRoom').innerHTML = ''; }
          saveData(); renderAll(); saveUI(); toast('휴지통으로 옮겼어요');
        });
      }
    });
  }
  function openRenameRoom(id) {
    var r = findRoom(id); if (!r) return;
    openSheet('이름 변경', '<label class="field"><span>방 이름</span><input class="input" id="rnTitle" type="text" maxlength="40" autocomplete="off" value="' + esc(r.title) + '"></label>' +
      '<button class="btn primary block" type="button" id="rnOk">저장</button>');
    var inp = $('#rnTitle');
    setTimeout(function () { if (inp) { inp.focus(); inp.select(); } }, 80);
    function save() {
      var t = (inp.value || '').trim();
      if (!t) { toast('이름을 적어 주세요'); return; }
      r.title = t; r.updatedAt = Date.now();
      saveData(); closeSheet(); renderList(); renderRoom(); toast('이름을 바꿨어요');
    }
    $('#rnOk').onclick = save;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); save(); } });
  }
  function openColorRoom(id) {
    var r = findRoom(id); if (!r) return;
    openSheet('색 바꾸기', '<div class="swatches" id="rcColors">' +
      COLORS.map(function (c) {
        return '<button class="sw' + (c.k === r.color ? ' on' : '') + '" type="button" data-color="' + c.k + '" style="background:' + c.bg + ';color:' + c.ink + '">' + GLYPH + '</button>';
      }).join('') + '</div>');
    $('#rcColors').onclick = function (e) {
      var b = e.target.closest('[data-color]'); if (!b) return;
      r.color = b.dataset.color; r.updatedAt = Date.now();
      saveData(); closeSheet(); renderList();
      if (ui.roomId === r.id) renderRoom();
      toast('색을 바꿨어요');
    };
  }
  function openSortMenu() {
    var opts = [['recent', '최신순'], ['old', '오래된순'], ['name', '이름순']];
    openSheet('정렬', opts.map(function (o) {
      return '<button class="act" type="button" data-sort="' + o[0] + '"><span class="aico">' + (ui.sort === o[0] ? '✓' : '') + '</span>' + o[1] + '</button>';
    }).join(''), null, function (a) {
      if (a && a.indexOf('sort:') === 0) {
        ui.sort = a.slice(5); saveUI(); renderList(); closeSheet();
      }
    });
  }

  /* ==================== 시트/다이얼로그 ==================== */
  var sheetHandler = null;
  function openSheet(title, html, opts, handler) {
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = html;
    $('#sheetCancel').hidden = true;
    sheetHandler = handler || null;
    $('#sheet').hidden = false;
  }
  function sheetAction(a) { if (sheetHandler) sheetHandler(a); }
  function closeSheet() {
    $('#sheet').hidden = true;
    $('#sheetBody').innerHTML = '';
    sheetHandler = null;
  }
  function askConfirm(o) {
    return new Promise(function (resolve) {
      var d = $('#dialog');
      d.hidden = false;
      d.innerHTML = '<div class="dcard"><h4>' + esc(o.title || '확인') + '</h4><p>' + esc(o.message || '') + '</p>' +
        '<div class="dactions"><button class="btn" type="button" id="dNo">' + esc(o.cancelText || '취소') + '</button>' +
        '<button class="btn ' + (o.danger ? 'danger' : 'primary') + '" type="button" id="dOk">' + esc(o.okText || '확인') + '</button></div></div>';
      function done(v) { d.hidden = true; d.innerHTML = ''; resolve(v); }
      $('#dNo').onclick = function () { done(false); };
      $('#dOk').onclick = function () { done(true); };
    });
  }

  /* ==================== 동기화 ==================== */
  var syncBusy = false, syncApplying = false, syncTimer = null, syncStarted = false;

  function syncLoadCfg() {
    try { var raw = localStorage.getItem(LS_CFG); syncCfg = raw ? JSON.parse(raw) : null; } catch (e) { syncCfg = null; }
    if (!syncCfg || typeof syncCfg !== 'object') syncCfg = {};
    if (typeof syncCfg.ns !== 'string') syncCfg.ns = '';
    syncCfg.rev = Number(syncCfg.rev) || 0;
    syncCfg.lastSync = Number(syncCfg.lastSync) || 0;
    syncCfg.lastPushTs = Number(syncCfg.lastPushTs) || 0;
    syncCfg.lastRemoteRev = Number(syncCfg.lastRemoteRev) || 0;
    if (typeof syncCfg.auto !== 'boolean') syncCfg.auto = true;
    if (!syncCfg.deviceId) syncCfg.deviceId = 'dev-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    return syncCfg;
  }
  function syncSaveCfg() { try { localStorage.setItem(LS_CFG, JSON.stringify(syncCfg)); } catch (e) {} }
  function syncConnected() { return !!(syncCfg && syncCfg.ns); }
  function syncErrMsg(e) {
    var m = String((e && e.message) ? e.message : e || '');
    if (!m || m === 'HTTP 0' || /Failed to fetch|NetworkError|Load failed|aborted|AbortError|Network request failed/i.test(m)) {
      return '네트워크에 연결할 수 없습니다 (인터넷 상태를 확인해 주세요)';
    }
    return m;
  }
  function syncNewNs() {
    var abc = 'abcdefghijkmnpqrstuvwxyz23456789', s = '';
    for (var i = 0; i < 10; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
    return APP_ID + '-' + s;
  }
  function syncNsForPart(i) {
    var bucket = Math.floor(i / SYNC_PARTS_PER_NS);
    return bucket === 0 ? syncCfg.ns : syncCfg.ns + '-p' + bucket;
  }
  function escByteLenOfChar(ch) {
    var cc = ch.charCodeAt(0);
    if (ch === '"' || ch === '\\') return 2;
    if (cc < 0x20) return 6;
    if (cc < 0x80) return 1;
    if (cc < 0x800) return 2;
    if (cc >= 0xD800 && cc <= 0xDBFF) return 4;
    if (cc >= 0xDC00 && cc <= 0xDFFF) return 0;
    return 3;
  }
  function chunkByEscapedBytes(doc, maxBytes) {
    var parts = [], cur = '', curLen = 0;
    for (var i = 0; i < doc.length; i++) {
      var ch = doc.charAt(i), b = escByteLenOfChar(ch);
      if (curLen + b > maxBytes) { parts.push(cur); cur = ch; curLen = b; }
      else { cur += ch; curLen += b; }
    }
    if (cur) parts.push(cur);
    return parts;
  }
  function syncFetch(url, opts) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 20000);
    return fetch(url, Object.assign({ signal: ctrl.signal, cache: 'no-store' }, opts || {})).then(function (res) {
      clearTimeout(timer); return res;
    }, function (err) { clearTimeout(timer); throw err; });
  }
  function syncPost(path, obj) {
    return syncFetch(SYNC_BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return true; });
  }
  function syncGet(path, cb) {
    var sep = path.indexOf('?') < 0 ? '?' : '&';
    var url = SYNC_BASE + path + (cb !== undefined && cb !== null ? (sep + 'cb=' + encodeURIComponent(String(cb))) : '');
    return syncFetch(url, { method: 'GET' }).then(function (res) {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text().then(function (txt) {
        if (!txt) return null;
        try { return JSON.parse(txt); } catch (e) { return null; }
      });
    });
  }
  function syncDocCounts() {
    return {
      rooms: liveRooms().length,
      msgs: visibleMsgs().length,
      photos: visibleMsgs().filter(function (m) { return !!m.img; }).length
    };
  }
  function syncPush() {
    if (!syncConnected()) return Promise.reject(new Error('동기화 코드가 없습니다'));
    var newRev = Math.max(syncCfg.rev || 0, syncCfg.lastRemoteRev || 0) + 1;
    var doc = JSON.stringify({ v: 2, app: APP_ID, rev: newRev, ts: Date.now(), device: syncCfg.deviceId, data: data });
    var parts = chunkByEscapedBytes(doc, SYNC_PART_MAX);
    if (parts.length > SYNC_PARTS_PER_NS * 6) return Promise.reject(new Error('데이터가 너무 큽니다'));
    var chain = Promise.resolve();
    parts.forEach(function (p, i) {
      chain = chain.then(function () { return syncPost(syncNsForPart(i) + '/v1/p' + i, { c: p }); });
    });
    return chain.then(function () {
      var rev = newRev, pushTs = Date.now();
      var manifest = {
        t: 2, app: APP_ID, rev: rev, ts: pushTs, device: syncCfg.deviceId,
        parts: parts.map(function (p, i) { return { ns: syncNsForPart(i), k: 'v1/p' + i }; }),
        counts: syncDocCounts(), bytes: doc.length
      };
      return syncPost(syncCfg.ns + '/v1/manifest', manifest).then(function () {
        syncCfg.rev = rev; syncCfg.lastRemoteRev = rev; syncCfg.lastSync = pushTs; syncCfg.lastPushTs = pushTs;
        syncCfg.lastCount = manifest.counts; syncCfg.lastError = ''; syncCfg.dirty = false;
        syncSaveCfg();
        return manifest;
      });
    });
  }
  function syncReadManifest() {
    if (!syncConnected()) return Promise.resolve(null);
    return syncGet(syncCfg.ns + '/v1/manifest', Date.now()).then(function (m) {
      if (!m || !m.parts || !m.parts.length) return null;
      return m;
    });
  }
  function syncReadRemoteData(manifest) {
    var buf = '';
    var chain = Promise.resolve();
    manifest.parts.forEach(function (p) {
      chain = chain.then(function () {
        return syncGet(p.ns + '/' + p.k, manifest.rev).then(function (part) {
          if (!part || typeof part.c !== 'string') throw new Error('조각을 읽지 못했습니다');
          buf += part.c;
        });
      });
    });
    return chain.then(function () {
      var doc;
      try { doc = JSON.parse(buf); } catch (e) { throw new Error('원격 데이터 형식이 올바르지 않습니다'); }
      if (!doc || !doc.data) throw new Error('원격 데이터 형식이 올바르지 않습니다');
      if (typeof doc.rev === 'number' && manifest.rev && doc.rev !== Number(manifest.rev)) {
        throw new Error('최신 기록을 다시 받는 중이에요');
      }
      return doc;
    });
  }
  function mergeCollection(L, R, key, delKey, stats) {
    var byId = {};
    (R[key] || []).forEach(function (x) { byId[String(x.id)] = x; });
    var remoteIds = Object.keys(byId), localIds = {};
    (L[key] || []).forEach(function (x) {
      var k = String(x.id);
      localIds[k] = 1;
      var r = byId[k];
      if (!r) { byId[k] = x; stats.localOnly = (stats.localOnly || 0) + 1; return; }
      var lt = Number(x.updatedAt || 0), rt = Number(r.updatedAt || 0);
      if (rt > lt) { byId[k] = r; stats.updated++; }
      else { byId[k] = x; if (rt < lt) stats.localNewer = (stats.localNewer || 0) + 1; }
    });
    remoteIds.forEach(function (id) { if (!localIds[id]) stats.added++; });
    var del = {};
    [].concat(L[delKey] || [], R[delKey] || []).forEach(function (id) { del[String(id)] = 1; });
    var out = [];
    Object.keys(byId).forEach(function (id) { if (!del[id]) out.push(byId[id]); });
    L[key] = out;
    L[delKey] = Object.keys(del);
    return out.length;
  }
  function mergeRemoteData(local, remoteDoc) {
    var R = (remoteDoc && remoteDoc.data) ? remoteDoc.data : null;
    if (!R) return { data: local, stats: { changed: false, added: 0, updated: 0 } };
    if (!Array.isArray(R.rooms) && Array.isArray(R.memos)) {
      var mig = migrateV1(R);
      if (mig) R = mig;
    }
    if (!Array.isArray(R.rooms)) return { data: local, stats: { changed: false, added: 0, updated: 0 } };
    var L = JSON.parse(JSON.stringify(local));
    if (!Array.isArray(L.rooms)) L.rooms = [];
    if (!Array.isArray(L.msgs)) L.msgs = [];
    var stats = { added: 0, updated: 0, localOnly: 0, localNewer: 0, changed: false };
    mergeCollection(L, R, 'rooms', 'deletedRoomIds', stats);
    mergeCollection(L, R, 'msgs', 'deletedMsgIds', stats);
    var roomIds = {};
    L.rooms.forEach(function (r) { roomIds[r.id] = 1; });
    L.msgs = L.msgs.filter(function (m) { return roomIds[String(m.roomId)]; });
    try { stats.changed = stats.changed || JSON.stringify(L) !== JSON.stringify(local); }
    catch (e) { stats.changed = true; }
    return { data: L, stats: stats };
  }
  /* v2.1: 클라우드가 비었는데 이 기기에만 기록이 있는지 */
  function syncCloudLacksLocal(manifest) {
    var c = (manifest && manifest.counts) || null;
    if (!c) return false;
    if (liveRooms().length > 0 && !(Number(c.rooms) > 0)) return true;
    if (visibleMsgs().length > 0 && !(Number(c.msgs) > 0)) return true;
    return false;
  }
  function syncNow(opts) {
    var silent = opts && opts.silent;
    if (!syncConnected()) {
      if (!silent) toast('먼저 동기화 코드를 만들거나 입력해 주세요');
      return Promise.resolve(null);
    }
    if (syncBusy) return Promise.resolve(null);
    syncBusy = true; syncApplying = true;
    if (ui.tab === 'set') renderSet();
    var acc = { added: 0, updated: 0, localOnly: 0, localNewer: 0, changed: false };
    var lastManifest = null;
    function step(n) {
      return syncReadManifest().then(function (manifest) {
        if (!manifest) return null;
        lastManifest = manifest;
        var mRev = Number(manifest.rev) || 0;
        syncCfg.lastRemoteRev = Math.max(Number(syncCfg.lastRemoteRev) || 0, mRev);
        var upToDate = (mRev === Number(syncCfg.rev)) && (Number(manifest.ts || 0) <= Number(syncCfg.lastPushTs || 0));
        /* v2.1: 클라우드 rev가 로컬보다 낮아도 그냥 건너뛰지 않는다.
           예전엔 이 경로에서 아무것도 올리지 않고 lastSync만 갱신해 '연결됨'으로 보이는데
           클라우드에는 기록이 없는 무음 미업로드가 됐다. 이제는 읽어서 병합한 뒤 올린다. */
        if (upToDate && !syncCloudLacksLocal(manifest)) return null;
        return syncReadRemoteData(manifest).then(function (remoteDoc) {
          var m = mergeRemoteData(data, remoteDoc);
          acc.added += m.stats.added || 0;
          acc.updated += m.stats.updated || 0;
          acc.localOnly += m.stats.localOnly || 0;
          acc.localNewer += m.stats.localNewer || 0;
          acc.changed = acc.changed || !!m.stats.changed;
          if (m.stats.changed) {
            data = m.data; normalizeData();
            saveData({ noSync: true });
            renderAll();
          }
          syncCfg.rev = mRev;
          syncCfg.lastPushTs = Number(manifest.ts) || syncCfg.lastPushTs;
          syncCfg.lastCount = manifest.counts || syncCfg.lastCount;
          syncSaveCfg();
          if (n < 2) return step(n + 1);
          return null;
        });
      });
    }
    return step(0).then(function () {
      var cloudEmpty = !!(lastManifest && lastManifest.counts &&
        !(Number(lastManifest.counts.rooms) > 0) && !(Number(lastManifest.counts.msgs) > 0));
      var localHasContent = liveRooms().length > 0 || visibleMsgs().length > 0;
      var needPush = !lastManifest || !!syncCfg.dirty || acc.changed || acc.localOnly > 0 || acc.localNewer > 0 ||
        (cloudEmpty && localHasContent);
      if (needPush) return syncPush();
      syncCfg.rev = Math.max(Number(syncCfg.rev) || 0, Number(lastManifest.rev) || 0);
      syncCfg.lastSync = Date.now(); syncCfg.lastError = '';
      syncSaveCfg();
      return null;
    }).then(function () {
      syncBusy = false; syncApplying = false;
      if (ui.tab === 'set') renderSet();
      if (!silent) {
        var c = syncCfg.lastCount || {};
        var detail = (acc.added || acc.updated) ? (' (클라우드에서 ' + acc.added + '개 추가 · ' + acc.updated + '개 갱신)') : '';
        toast('동기화 완료' + detail + ' · 메시지 ' + (c.msgs != null ? c.msgs : liveMsgs().length) + '건');
      }
      return { stats: acc };
    }).catch(function (err) {
      syncBusy = false; syncApplying = false;
      syncCfg.lastError = syncErrMsg(err);
      syncSaveCfg();
      if (ui.tab === 'set') renderSet();
      if (!silent) toast('동기화 실패: ' + syncCfg.lastError);
      return null;
    });
  }
  function scheduleSyncPush() {
    if (!syncConnected() || syncApplying) return;
    syncCfg.dirty = true;
    syncSaveCfg();
    if (!syncCfg.auto) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncNow({ silent: true }); }, 1200);
  }
  function syncTimeText(ts) {
    if (!ts) return '아직 없음';
    var diff = Date.now() - ts, mm = Math.floor(diff / 60000);
    if (mm < 1) return '방금 전';
    if (mm < 60) return mm + '분 전';
    var hh = Math.floor(mm / 60);
    if (hh < 24) return hh + '시간 전';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function syncLinkText() {
    if (!syncConnected()) return '';
    return location.origin + location.pathname + '?k=' + syncCfg.ns;
  }
  function parseSyncCode(raw) {
    var s = String(raw || '').replace(/\s+/g, '');
    if (!s) return '';
    var mQ = s.match(/[?&#]k=([A-Za-z0-9_-]+)/);
    if (mQ) s = mQ[1];
    s = s.replace(/^https?:\/\/[^\/]+\//i, '').replace(/^v2\//i, '').replace(/^\/+/, '').replace(/\/+$/, '');
    var m = s.match(/(yuzumemo-[a-z0-9]+)/i);
    if (m) return m[1].toLowerCase();
    return s.toLowerCase();
  }
  function createSyncCode() {
    if (!syncConnected()) { doCreate(); return; }
    askConfirm({ title: '새 동기화 코드', message: '이 기기 기록을 새 클라우드에 올려 새 코드를 만들까요?\n지금 코드와는 연결이 끊기고, 기록은 이 기기에 그대로 남아요.', okText: '새 코드' }).then(function (ok) {
      if (ok) doCreate();
    });
  }
  function doCreate() {
    syncCfg.ns = syncNewNs();
    syncCfg.rev = 0; syncCfg.lastRemoteRev = 0; syncCfg.lastSync = 0; syncCfg.lastCount = 0; syncCfg.lastPushTs = 0;
    syncCfg.dirty = true; syncCfg.auto = true; syncCfg.lastError = '';
    syncSaveCfg();
    if (ui.tab === 'set') renderSet();
    toast('클라우드에 올리는 중…');
    syncPush().then(function () {
      if (ui.tab === 'set') renderSet();
      toast('동기화 코드를 만들었어요');
    }).catch(function (e) {
      syncCfg.lastError = syncErrMsg(e); syncSaveCfg();
      if (ui.tab === 'set') renderSet();
      toast('업로드 실패: ' + syncCfg.lastError);
    });
  }
  function joinSyncCode() {
    var code = parseSyncCode($('#syncJoin') ? $('#syncJoin').value : '');
    if (!code || code.indexOf('yuzumemo-') !== 0 || code.length < 12) {
      toast('코드 형식이 올바르지 않아요. (예: yuzumemo-ab12cd34ef)');
      return;
    }
    if (code === syncCfg.ns) { toast('이미 이 코드로 연결되어 있어요'); return; }
    var prev = syncCfg.ns;
    syncCfg.ns = code; syncCfg.rev = 0; syncCfg.lastRemoteRev = 0; syncCfg.lastPushTs = 0; syncCfg.lastSync = 0; syncCfg.lastError = ''; syncCfg.dirty = false;
    syncSaveCfg();
    toast('클라우드 기록을 확인하는 중…');
    syncReadManifest().then(function (manifest) {
      function doJoin() {
        return syncNow({ silent: true }).then(function (merged) {
          if (ui.tab === 'set') renderSet();
          if (merged) toast('연결 완료 · 클라우드에서 ' + merged.stats.added + '개 추가');
          else toast('연결됨' + (syncCfg.lastError ? ' · 오류: ' + syncCfg.lastError : ''));
        });
      }
      if (!manifest) {
        var hasLocal = liveRooms().length || liveMsgs().length;
        var q = hasLocal ? '이 코드에는 아직 저장된 기록이 없어요.\n이 기기의 기록을 이 코드로 올릴까요?' : '이 코드에는 아직 저장된 기록이 없어요.\n빈 메모장으로 연결할까요?';
        return askConfirm({ title: '빈 코드', message: q, okText: '연결' }).then(function (ok) {
          if (!ok) { syncCfg.ns = prev; syncSaveCfg(); if (ui.tab === 'set') renderSet(); return null; }
          syncCfg.dirty = true; syncSaveCfg();
          return doJoin();
        });
      }
      return doJoin();
    }).catch(function (e) {
      syncCfg.ns = prev; syncSaveCfg(); if (ui.tab === 'set') renderSet();
      toast('코드를 확인할 수 없습니다: ' + syncErrMsg(e));
    });
  }
  function disconnectSync() {
    askConfirm({ title: '연결 해제', message: '이 기기에서만 동기화를 끊을까요?\n메모는 이 기기에 그대로 남고, 클라우드 기록도 지워지지 않아요.', danger: true, okText: '해제' }).then(function (ok) {
      if (!ok) return;
      syncCfg.ns = ''; syncCfg.rev = 0; syncCfg.lastSync = 0; syncCfg.lastCount = 0; syncCfg.lastPushTs = 0; syncCfg.dirty = false;
      syncSaveCfg(); if (ui.tab === 'set') renderSet();
      toast('연결을 해제했어요');
    });
  }
  function initSync() {
    var urlCode = '';
    try {
      var params = new URLSearchParams(location.search);
      if (params.get('k')) urlCode = parseSyncCode(params.get('k'));
      else {
        var hm = String(location.hash || '').match(/[#&]k=([A-Za-z0-9_-]+)/);
        if (hm) urlCode = parseSyncCode(hm[1]);
      }
    } catch (e) {}
    if (urlCode && urlCode.indexOf(APP_ID + '-') === 0 && urlCode !== syncCfg.ns) {
      syncCfg.ns = urlCode; syncCfg.rev = 0; syncCfg.lastSync = 0; syncCfg.lastPushTs = 0; syncCfg.lastError = ''; syncCfg.dirty = false;
      syncSaveCfg();
      try { history.replaceState(null, '', location.pathname); } catch (e2) {}
    }
    if (!syncConnected()) return;
    if (syncCfg.auto) {
      setTimeout(function () {
        syncNow({ silent: true }).then(function () {
          setTimeout(function () {
            if (document.visibilityState === 'visible' && syncCfg.auto && syncConnected() && !syncBusy) syncNow({ silent: true });
          }, 4000);
        });
      }, 600);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && syncCfg.auto && syncConnected() && (Date.now() - (syncCfg.lastSync || 0) > 60000)) {
        syncNow({ silent: true });
      }
    });
    window.addEventListener('online', function () {
      if (syncCfg.auto && syncConnected()) syncNow({ silent: true });
    });
    setInterval(function () {
      if (document.visibilityState !== 'visible') return;
      if (!syncCfg.auto || !syncConnected() || syncBusy) return;
      if (Date.now() - (syncCfg.lastSync || 0) < 20000) return;
      syncNow({ silent: true });
    }, 25000);
  }
  function startSync() {
    syncLoadCfg();
    if (!syncStarted) { syncStarted = true; initSync(); }
  }

  /* ==================== PIN 잠금 ==================== */
  var lockBuf = '';
  function pinRead() {
    try { var r = localStorage.getItem(LS_PIN); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function hasPin() { var r = pinRead(); return !!(r && r.hash); }
  function hashPin(pin) {
    var s = 'yuzumemo:' + pin;
    if (window.crypto && window.crypto.subtle && window.isSecureContext) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 7;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return Promise.resolve('fb' + h.toString(16));
  }
  function savePin(pin) {
    return hashPin(pin).then(function (h) {
      try { localStorage.setItem(LS_PIN, JSON.stringify({ hash: h, at: Date.now() })); } catch (e) {}
      return h;
    });
  }
  function openPinSheet(mode) {
    var title = mode === 'set' ? 'PIN 설정' : (mode === 'change' ? 'PIN 변경' : 'PIN 해제');
    var h = '';
    if (mode === 'set') {
      h += '<p class="help" style="margin-top:0">앱을 열 때 물어볼 <b>4자리 숫자</b>를 정해 주세요.</p>' +
        '<label class="field"><span>새 PIN</span><input class="input" id="pinNew" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></label>' +
        '<label class="field"><span>새 PIN 확인</span><input class="input" id="pinNew2" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></label>' +
        '<p class="help warn">PIN은 이 기기에만 저장돼요. 잊으면 이 브라우저 저장 데이터를 지우고 동기화 링크를 다시 열어야 해요. 클라우드 기록은 그대로 남습니다.</p>';
    } else if (mode === 'change') {
      h += '<label class="field"><span>지금 PIN</span><input class="input" id="pinCur" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>' +
        '<label class="field"><span>새 PIN</span><input class="input" id="pinNew" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>' +
        '<label class="field"><span>새 PIN 확인</span><input class="input" id="pinNew2" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>';
    } else {
      h += '<p class="help" style="margin-top:0">지금 PIN을 확인하면 이 기기의 잠금을 풀어요. 메모는 그대로 남습니다.</p>' +
        '<label class="field"><span>지금 PIN</span><input class="input" id="pinCur" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>';
    }
    h += '<div class="sync-err" id="pinErr" style="display:none;color:#d1423a;font-size:12px;margin-bottom:8px"></div>' +
      '<button class="btn ' + (mode === 'remove' ? 'danger' : 'primary') + ' block" type="button" id="pinOk">' + (mode === 'remove' ? '잠금 해제' : '저장') + '</button>';
    openSheet(title, h);
    setTimeout(function () { var i = $('#pinCur') || $('#pinNew'); if (i) i.focus(); }, 100);
    $('#pinOk').onclick = function () { submitPin(mode); };
    $$('#sheetBody input').forEach(function (inp) {
      inp.addEventListener('input', function () { this.value = String(this.value).replace(/[^0-9]/g, '').slice(0, 4); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitPin(mode); });
    });
  }
  function pinErr(msg) { var e = $('#pinErr'); if (!e) return; e.style.display = msg ? 'block' : 'none'; e.textContent = msg || ''; }
  function submitPin(mode) {
    var cur = $('#pinCur'), a = $('#pinNew'), b = $('#pinNew2');
    if (mode !== 'set') {
      var p = cur ? cur.value : '';
      if (!/^\d{4}$/.test(p)) { pinErr('지금 PIN 4자리를 입력해 주세요'); return; }
      hashPin(p).then(function (h) {
        var rec = pinRead();
        if (!rec || rec.hash !== h) { pinErr('PIN이 맞지 않아요'); return; }
        done(mode);
      });
      return;
    }
    done(mode);
    function done(m) {
      if (m === 'remove') {
        try { localStorage.removeItem(LS_PIN); } catch (e) {}
        closeSheet(); renderSet(); toast('잠금을 해제했어요');
        return;
      }
      var v1 = a ? a.value : '', v2 = b ? b.value : '';
      if (!/^\d{4}$/.test(v1)) { pinErr('4자리 숫자를 입력해 주세요'); return; }
      if (v1 !== v2) { pinErr('두 번 입력한 PIN이 달라요'); return; }
      savePin(v1).then(function () {
        closeSheet(); renderSet();
        toast(m === 'change' ? 'PIN을 바꿨어요' : 'PIN 잠금을 켰어요');
      });
    }
  }
  function lockApp() {
    if (!hasPin()) return;
    lockBuf = ''; updateDots(); $('#lockMsg').textContent = '';
    $('#lock').hidden = false;
    closeSheet();
    if ($('#viewer') && !$('#viewer').hidden) closeViewer();
  }
  function updateDots() {
    $$('#lockDots .dt').forEach(function (d, i) { d.classList.toggle('on', i < lockBuf.length); });
  }
  function pressKey(k) {
    if (k === 'del') { lockBuf = lockBuf.slice(0, -1); updateDots(); $('#lockMsg').textContent = ''; return; }
    if (!/^\d$/.test(k)) return;
    if (lockBuf.length >= 4) return;
    lockBuf += k; updateDots();
    if (lockBuf.length === 4) setTimeout(tryUnlock, 110);
  }
  function tryUnlock() {
    var pin = lockBuf;
    hashPin(pin).then(function (h) {
      var rec = pinRead();
      if (rec && rec.hash === h) {
        lockBuf = ''; updateDots(); $('#lockMsg').textContent = '';
        $('#lock').hidden = true;
        startSync(); renderAll();
      } else {
        $('#lock').classList.add('shake');
        $('#lockMsg').textContent = 'PIN이 맞지 않아요';
        lockBuf = ''; updateDots();
        setTimeout(function () { $('#lock').classList.remove('shake'); }, 340);
      }
    });
  }

  /* ==================== 전체 렌더 ==================== */
  function renderAll() {
    var typing = document.activeElement && document.activeElement.id === 'msgInput';
    renderList();
    applyLayout();
    if (ui.roomId && ui.tab === 'chat' && !typing) renderRoom();
    if (ui.tab === 'photos') renderPhotos();
    if (ui.tab === 'cal') renderCal();
    if (ui.tab === 'set') renderSet();
  }
  function setTab(t) {
    if (ui.tab === t) {
      if (t === 'chat' && ui.roomId && isPC()) { closeRoom(); return; }
    }
    ui.tab = t;
    if (t === 'chat' && ui.roomId) renderRoom();
    if (t === 'photos') renderPhotos();
    if (t === 'cal') renderCal();
    if (t === 'set') renderSet();
    applyLayout();
  }

  /* ==================== 이벤트 연결 ==================== */
  var lpTimer = null, lpFired = false;
  function wire() {
    // 검색
    $('#btnSearch').onclick = function () {
      var row = $('#searchRow');
      row.hidden = !row.hidden;
      if (!row.hidden) { setTimeout(function () { $('#q').focus(); }, 50); }
      else { ui.q = ''; $('#q').value = ''; renderList(); }
    };
    $('#q').addEventListener('input', function () { ui.q = this.value; renderList(); });
    $('#qClear').onclick = function () {
      ui.q = ''; $('#q').value = ''; renderList(); $('#q').focus();
    };
    $('#btnNewRoom').onclick = openNewRoom;
    $('#btnGoSet').onclick = function () { setTab('set'); };
    $('#btnHintNew').onclick = openNewRoom;
    $('#btnSort').onclick = openSortMenu;

    // 필터
    $('#chips').addEventListener('click', function (e) {
      var c = e.target.closest('[data-filter]'); if (!c) return;
      ui.filter = c.dataset.filter; saveUI(); renderList();
    });

    // 방 목록: 클릭 / 길게 누르기 / 우클릭
    var rl = $('#roomList');
    rl.addEventListener('pointerdown', function (e) {
      var row = e.target.closest('.roomrow'); if (!row) return;
      lpFired = false;
      clearTimeout(lpTimer);
      lpTimer = setTimeout(function () {
        lpFired = true;
        openRoomMenu(row.dataset.id);
        setTimeout(function () { lpFired = false; }, 800);
      }, 520);
    });
    ['pointerup', 'pointercancel', 'pointermove', 'pointerleave'].forEach(function (ev) {
      rl.addEventListener(ev, function () { clearTimeout(lpTimer); });
    });
    rl.addEventListener('scroll', function () { clearTimeout(lpTimer); }, true);
    rl.addEventListener('contextmenu', function (e) {
      var row = e.target.closest('.roomrow'); if (!row) return;
      e.preventDefault(); openRoomMenu(row.dataset.id);
    });
    rl.addEventListener('click', function (e) {
      var row = e.target.closest('.roomrow'); if (!row) return;
      if (lpFired) { return; }
      openRoom(row.dataset.id);
    });

    // 탭
    $('#tabbar').addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (!t) return;
      setTab(t.dataset.tab);
    });
    $('#pcTabs').addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (!t) return;
      setTab(t.dataset.tab);
    });

    // 채팅방 내부
    var vr = $('#viewRoom');
    var bpT = null, bpFired = false;
    vr.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.bubble');
      if (!b) return;
      bpFired = false;
      clearTimeout(bpT);
      bpT = setTimeout(function () {
        bpFired = true;
        openMsgMenu(b.dataset.mid);
        setTimeout(function () { bpFired = false; }, 800);
      }, 520);
    });
    ['pointerup', 'pointercancel', 'pointermove', 'pointerleave'].forEach(function (ev) {
      vr.addEventListener(ev, function () { clearTimeout(bpT); });
    });
    vr.addEventListener('click', function (e) {
      if (bpFired) { return; }
      if (e.target.closest('#roomBack')) { closeRoom(); return; }
      if (e.target.closest('#roomMenu')) { openRoomMenu(ui.roomId); return; }
      if (e.target.closest('#btnPhoto')) { openPhotoPicker(); return; }
      if (e.target.closest('#btnSend')) { sendText(); return; }
      var pj = e.target.closest('.pinjump');
      if (pj) { focusMsg(pj.dataset.mid, true); return; }
      if (e.target.closest('a')) return;
      var img = e.target.closest('img[data-photo]');
      var dl = e.target.closest('[data-dl-photo]');
      if (dl) { savePhotoMsg(findMsg(dl.dataset.dlPhoto)); return; }
      if (img) { openViewer(img.dataset.photo); return; }
      var b = e.target.closest('.bubble[data-mid]');
      if (b) { openMsgMenu(b.dataset.mid); return; }
    });
    vr.addEventListener('input', function (e) {
      if (e.target.id === 'msgInput') {
        ui.draft = e.target.value;
        autoGrow(e.target);
        syncSendState();
      }
    });
    vr.addEventListener('keydown', function (e) {
      if (e.target.id === 'msgInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault(); sendText();
      }
    });

    // 사진 탭 / 사진 보기
    $('#viewPhotos').addEventListener('click', function (e) {
      var f = e.target.closest('#photoRooms [data-room]');
      if (f) { ui.photoRoom = f.dataset.room || ''; saveUI(); renderPhotos(); return; }
      var th = e.target.closest('[data-photo]');
      var dl2 = e.target.closest('[data-dl-photo]');
      if (dl2) { savePhotoMsg(findMsg(dl2.dataset.dlPhoto)); return; }
      if (th) { openViewer(th.dataset.photo); }
    });
    $('#viewer').addEventListener('click', function (e) {
      if (e.target.id === 'viewer') closeViewer();
    });

    // 시트
    $('#sheetClose').onclick = closeSheet;
    $('#sheetCancel').onclick = closeSheet;
    $('#sheet').addEventListener('click', function (e) {
      if (e.target.id === 'sheet') { closeSheet(); return; }
      var a = e.target.closest('[data-a]');
      if (a) { sheetAction(a.dataset.a); return; }
      var s = e.target.closest('[data-sort]');
      if (s) { sheetAction('sort:' + s.dataset.sort); }
    });

    // 파일
    $('#fileInput').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type || '')) { toast('이미지 파일만 올릴 수 있어요'); return; }
      if (!ui.roomId) { toast('먼저 방을 열어 주세요'); return; }
      toast('사진을 올리는 중…');
      compressImage(f).then(function (r) {
        addMsg({ text: '', img: r.data });
        toast('사진을 보냈어요');
      }).catch(function (err) {
        toast(err.message || '사진을 올리지 못했어요');
      });
    });
    $('#importInput').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (f) importBackup(f);
    });

    // 잠금 키패드
    $('#keypad').addEventListener('click', function (e) {
      var k = e.target.closest('[data-k]');
      if (k) pressKey(k.dataset.k);
    });
    document.addEventListener('keydown', function (e) {
      if (!$('#lock').hidden) {
        if (/^\d$/.test(e.key)) pressKey(e.key);
        else if (e.key === 'Backspace') { e.preventDefault(); pressKey('del'); }
        else if (e.key === 'Enter' && lockBuf.length === 4) tryUnlock();
        return;
      }
      if (e.key === 'Escape') {
        if (!$('#viewer').hidden) { closeViewer(); return; }
        if (!$('#dialog').hidden) { var no = $('#dNo'); if (no) no.click(); return; }
        if (!$('#sheet').hidden) { closeSheet(); return; }
      }
    });
    $('#lockHelp').onclick = function () {
      askConfirm({
        title: 'PIN을 잊었을 때',
        message: 'PIN은 이 기기 브라우저에만 저장돼요.\n잊었다면 브라우저의 이 사이트 저장 데이터를 지우고 동기화 링크를 다시 열어 주세요 — 클라우드 기록은 그대로 남아 있어요.\n\n· 아이폰 Safari: 설정 → Safari → 고급 → 웹사이트 데이터\n· PC Chrome: 주소창 자물쇠 → 사이트 설정 → 데이터 삭제',
        okText: '알겠어요', cancelText: '닫기'
      });
    };

    window.addEventListener('resize', function () { applyLayout(); });
    window.addEventListener('orientationchange', function () { setTimeout(applyLayout, 200); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') applyLayout();
    });
  }

  /* ==================== 시작 ==================== */
  function boot() {
    loadData();
    loadUI();
    wire();
    syncLoadCfg();
    renderAll();
    if (hasPin()) lockApp();
    else startSync();
    var hiddenAt = 0;
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 180000 && hasPin()) lockApp();
    });
  }

  boot();

  /* 테스트/디버그용 (읽기 위주) */
  window.__memo = {
    data: function () { return data; },
    cfg: function () { return syncCfg; },
    ui: function () { return ui; },
    counts: syncDocCounts,
    sync: function () { return syncNow({ silent: true }); },
    push: syncPush,
    parse: parseSyncCode,
    saveCfg: syncSaveCfg,
    goTab: setTab,
    open: openRoom,
    setTab: setTab,
    addRoom: function (t, c) { var now = Date.now(); var r = { id: 'r-' + uid(), title: t, color: c || 'blue', pinned: false, createdAt: now, updatedAt: now, deleted: false, deletedAt: 0 }; data.rooms.push(r); saveData(); renderList(); return r.id; },
    addMsg: function (rid, text, img) { ui.roomId = rid; var m = addMsg({ text: text, img: img || '' }); return m && m.id; },
    hasPin: hasPin,
    version: VERSION
  };
})();
