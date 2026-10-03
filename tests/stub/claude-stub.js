// AIPM_STUB: a fake `window.claude` for dev and tests ONLY.
// It is injected by Playwright (addInitScript) or by src/dev/dev-main.tsx behind
// `?stub`. It is never part of the production bundle: the build entry does not
// import it, and build/assemble.mjs fails if the sentinel above is found there.
//
// Configure before it runs with window.__AIPM_STUB__ = {
//   mode: 'live' | 'denied' | 'no-tools' | 'signed-out' | 'rate-limited' | 'slow',
//   uid: 'u_test', canned: { '<task id>': 'text' | json, 'tools:<task id>': [{tool, input}] },
//   declineDownloads: false }
// Calls are recorded on window.__stubCalls; saved files on window.__stubDownloads.
// If window.__stubDbRpc exists (Playwright exposeFunction), the db is shared across
// browser contexts through it; otherwise it is in memory.
(function () {
  var cfg = Object.assign({ mode: 'live', uid: 'u_test', canned: {}, declineDownloads: false }, window.__AIPM_STUB__ || {});
  var calls = (window.__stubCalls = []);
  var downloads = (window.__stubDownloads = []);
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var err = function (code, message, text) { var e = { code: code, message: message || code }; if (text) e.text = text; return e; };

  // ---- sample ----
  function taskId(input) {
    var text = typeof input === 'string' ? input : (input[input.length - 1] || {}).content || '';
    var m = /Task:\s*([\w:.-]+)/.exec(typeof input === 'string' ? input : input.map(function (t) { return t.content; }).join('\n'));
    return m ? m[1] : text.slice(0, 40);
  }
  function chunks(text, n) {
    var out = [], size = Math.max(1, Math.ceil(text.length / n));
    for (var i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }
  async function sample(input, opts) {
    opts = opts || {};
    calls.push({ kind: 'sample', input: input, opts: { cache: opts.cache, modelTier: opts.modelTier, hasTools: !!opts.tools, hasSignal: !!opts.signal } });
    if (cfg.mode === 'denied') throw err('not_granted');
    if (cfg.mode === 'rate-limited') throw err('rate_limited');
    if (opts.tools && cfg.mode === 'no-tools') throw err('tools_unavailable');
    if (opts.cache !== undefined && opts.cache !== false && opts.tools) throw err('invalid_request', 'cache cannot be combined with tools');
    var id = taskId(input);
    var delay = cfg.mode === 'slow' ? 400 : 25;
    var signal = opts.signal;
    var aborted = function () { return signal && signal.aborted; };
    var shown = '';
    if (opts.tools) {
      var script = cfg.canned['tools:' + id] || [];
      for (var i = 0; i < script.length; i++) {
        if (aborted()) throw err('cancelled', 'cancelled', shown);
        var tool = opts.tools.find(function (t) { return t.name === script[i].tool; });
        if (tool) { try { await tool.execute(script[i].input || {}, { signal: signal }); } catch (e) { /* returned to Claude as an error string */ } }
        await sleep(delay);
      }
    }
    var answer = cfg.canned[id];
    if (answer === undefined) answer = 'Stub answer for task ' + id + '.';
    var text = typeof answer === 'string' ? answer : JSON.stringify(answer);
    var parts = chunks(text, 3);
    await sleep(delay);
    for (var p = 0; p < parts.length; p++) {
      if (aborted()) throw err('cancelled', 'cancelled', shown);
      shown += parts[p];
      if (opts.onText) opts.onText({ text: shown, delta: parts[p] });
      await sleep(delay);
    }
    if (aborted()) throw err('cancelled', 'cancelled', shown);
    return { text: shown, truncated: false, modelTierApplied: opts.modelTier || 'default' };
  }
  sample.json = async function (input, opts) {
    var r = await sample(input, opts);
    try { return JSON.parse(r.text); } catch (e) { throw err('invalid_json', 'no JSON', r.text); }
  };
  sample.limits = async function () {
    var l = { maxPromptBytes: 262144 };
    if (cfg.mode !== 'no-tools') l.tools = { maxCount: 8 };
    return l;
  };

  // ---- db (in memory, or shared through window.__stubDbRpc) ----
  var mem = {};
  var rpc = window.__stubDbRpc;
  var store = {
    get: async function (p) { return rpc ? rpc('get', p) : (p in mem ? JSON.parse(mem[p]) : null); },
    set: async function (p, d) { if (rpc) return rpc('set', p, d); mem[p] = JSON.stringify(d); },
    del: async function (p) { if (rpc) return rpc('del', p); delete mem[p]; },
    list: async function (c) {
      if (rpc) return rpc('list', c);
      return Object.keys(mem).filter(function (k) { return k.lastIndexOf('/') === c.length && k.indexOf(c + '/') === 0; })
        .sort().map(function (k) { return { id: k.slice(c.length + 1), data: JSON.parse(mem[k]) }; });
    },
  };
  function segs(p) { return p.split('/').filter(Boolean); }
  function checkPath(p, even) {
    var n = segs(p).length;
    if (!n || (n % 2 === 0) !== even) throw new TypeError('path "' + p + '" has ' + n + ' segments; ' + (even ? 'a document needs an even number' : 'a collection needs an odd number'));
  }
  function snap(id, data) {
    var d = data ? Object.freeze(data) : undefined;
    return { id: id, exists: !!data, data: function () { return d; }, metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function docRef(path) {
    checkPath(path, true);
    var id = segs(path).pop();
    return {
      id: id, path: path,
      get: async function () { return snap(id, await store.get(path)); },
      set: async function (data) {
        if (JSON.stringify(data).length > 256 * 1024) throw err('invalid_argument', 'document over 256 KiB');
        if (cfg.mode === 'unavailable-once' && !window.__stubFailed) { window.__stubFailed = true; throw err('unavailable'); }
        calls.push({ kind: 'db.set', path: path });
        await store.set(path, data);
      },
      update: async function (data) {
        var cur = await store.get(path);
        if (!cur) throw err('invalid_argument', 'document does not exist');
        calls.push({ kind: 'db.update', path: path });
        await store.set(path, Object.assign({}, cur, data));
      },
      delete: async function () { await store.del(path); },
      acquire: async function () { return { acquired: true }; },
      collection: function (c) { return colRef(path + '/' + c); },
      onSnapshot: function (next) {
        var last, stopped = false;
        var tick = async function () {
          if (stopped) return;
          var cur = await store.get(path), s = JSON.stringify(cur);
          if (s !== last) { last = s; next(snap(id, cur)); }
          if (!stopped) setTimeout(tick, 150);
        };
        setTimeout(tick, 0);
        return function () { stopped = true; };
      },
    };
  }
  function colRef(path) {
    checkPath(path, false);
    var q = {
      path: path,
      doc: function (id) { return docRef(path + '/' + (id || 'd' + Math.random().toString(36).slice(2, 10))); },
      add: async function (data) { var r = q.doc(); await r.set(data); return r; },
      where: function () { return q; }, orderBy: function () { return q; }, limit: function () { return q; },
      get: async function () {
        var rows = await store.list(path), docs = rows.map(function (r) { return snap(r.id, r.data); });
        return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: { fromCache: false, hasPendingWrites: false } };
      },
      onSnapshot: function (next) {
        var last, stopped = false;
        var tick = async function () {
          if (stopped) return;
          var s = await q.get(), key = JSON.stringify(s.docs.map(function (d) { return [d.id, d.data()]; }));
          if (key !== last) { last = key; next(s); }
          if (!stopped) setTimeout(tick, 150);
        };
        setTimeout(tick, 0);
        return function () { stopped = true; };
      },
    };
    return q;
  }
  var db = { doc: docRef, collection: colRef };

  // ---- user, downloads, permissions ----
  var signedOut = cfg.mode === 'signed-out';
  var user = {
    isOwner: async function () { return !signedOut; }, canEdit: async function () { return !signedOut; },
    can: async function () { return signedOut ? false : true; },
    me: async function () { return { id: signedOut ? null : cfg.uid, name: 'Test Viewer', avatarUrl: '', color: '#000', email: null, isOwner: !signedOut, canEdit: !signedOut }; },
    id: async function () { return signedOut ? null : cfg.uid; },
    profiles: async function () { return {}; }, name: async function () { return 'Test Viewer'; },
    avatarUrl: async function () { return null; }, search: async function () { return []; }, email: async function () { return null; },
  };
  var dl = {
    save: async function (req) {
      if (cfg.declineDownloads) throw err('declined');
      downloads.push({ filename: req.filename, data: typeof req.data === 'string' ? req.data : '[binary]' });
      return { status: 'saved' };
    },
  };
  var perms = {
    state: async function (n) { var s = cfg.mode === 'denied' ? 'denied' : 'granted'; if (typeof n === 'string') return s; return { sample: s, db: 'granted', downloads: 'granted' }; },
    request: async function () { return {}; }, manage: async function () {},
  };

  var caps = { sample: sample, db: db, user: user, downloads: dl, permissions: perms };
  var use = async function (name) {
    await sleep(20);
    if (name === 'db' && signedOut) return null;
    return caps[name] || null;
  };
  window.claude = Object.freeze({ use: use });
})();
