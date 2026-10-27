(function () {
  'use strict';
  var D = window.EXPL3;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = $('#main'), toc = $('#toc'), q = $('#q'), results = $('#results'), side = $('#side');
  var qStatus = $('#qStatus'), scrim = $('#scrim'), menuBtn = $('#menuBtn');

  // иконки (контурные, в одном стиле)
  function ico(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; }
  var I = {
    check: ico('<path d="M20 6 9 17l-5-5"/>'),
    x: ico('<path d="M18 6 6 18M6 6l12 12"/>'),
    minus: ico('<path d="M5 12h14"/>'),
    copy: ico('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    file: ico('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    info: ico('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    ext: ico('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    book: ico('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/>'),
    grid: ico('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    help: ico('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>'),
    list: ico('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>')
  };
  function announce(t) { qStatus.textContent = ''; setTimeout(function () { qStatus.textContent = t; }, 30); }

  // ---------- индексы ----------
  var byId = {}, chByNum = {}, nameIdx = {}, entriesByCh = {};
  D.chapters.forEach(function (c) { chByNum[c.num] = c; entriesByCh[c.num] = []; });
  D.entries.forEach(function (e) {
    byId[e.id] = e;
    entriesByCh[e.ch].push(e);
    // демонстрационные записи главы 1 не должны перекрывать настоящие статьи
    e.variants.concat(e.names.map(function (n) { return n.name; })).forEach(function (v) {
      if (!(v in nameIdx) || byId[nameIdx[v]].ch === 1) nameIdx[v] = e.id;
    });
    e.title = e.names[0].name;
    e.plain = e.ru ? strip(e.ru.html).toLowerCase() : '';
    e.enplain = e.en.map(function (b) { return b.text; }).join(' ').toLowerCase();
  });

  // справка по TeX/LaTeX: псевдонимы → ключ статьи
  var gByKey = {}, gIdx = {};
  (D.glossary || []).forEach(function (g) {
    gByKey[g.key] = g;
    g.plain = strip(g.html).toLowerCase();
    g.aliases.forEach(function (a) { gIdx[a.toLowerCase()] = g.key; });
  });
  function gResolve(t) { return gIdx[String(t).trim().toLowerCase()] || null; }

  function strip(h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent || ''; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // найти запись по имени управляющей последовательности
  function resolve(name) {
    if (!name) return null;
    if (nameIdx[name]) return nameIdx[name];
    var m = name.match(/^(.*:[A-Za-z]*?)(T|F|TF)$/);
    if (m && nameIdx[m[1] + 'TF']) return nameIdx[m[1] + 'TF'];
    if (/:[A-Za-z]*$/.test(name) && !/TF$/.test(name) && nameIdx[name + 'TF']) return nameIdx[name + 'TF'];
    // имя без сигнатуры: \tl_set → первая подходящая
    if (name.indexOf(':') < 0) {
      for (var k in nameIdx) if (k.split(':')[0] === name) return nameIdx[k];
    }
    return null;
  }

  // ---------- подсветка TeX-кода ----------
  var TOK = /(%[^\n]*)|(\\(?:[A-Za-z@_:]+|.))|(\.[a-z_]+:[A-Za-z]*(?=\s|=|,|$))|([{}])|(~)|(⟨[^⟩\n]*⟩)|([^\\%{}~⟨.]+|\.)/g;
  function hl(code, selfId) {
    var out = '', m;
    TOK.lastIndex = 0;
    while ((m = TOK.exec(code))) {
      if (m[1]) out += '<span class="t-cmt">' + esc(m[1]) + '</span>';
      else if (m[2]) {
        var cs = m[2], cls = /^\\[lgcqs]_/.test(cs) ? 't-var' : (cs.indexOf(':') > 0 ? 't-fn' : 't-cs');
        var id = resolve(cs), gk = id ? null : gResolve(cs);
        if (id && id !== selfId) out += '<a class="' + cls + '" href="#/e/' + id + '">' + esc(cs) + '</a>';
        else if (gk) out += '<a class="' + cls + '" href="#/g/' + gk + '" title="Справка по TeX">' + esc(cs) + '</a>';
        else out += '<span class="' + cls + '">' + esc(cs) + '</span>';
      } else if (m[3]) {
        var id2 = resolve(m[3]);
        out += id2 ? '<a class="t-fn" href="#/e/' + id2 + '">' + esc(m[3]) + '</a>' : '<span class="t-fn">' + esc(m[3]) + '</span>';
      }
      else if (m[4]) out += '<span class="t-br">' + m[4] + '</span>';
      else if (m[5]) out += '<span class="t-tl">~</span>';
      else if (m[6]) out += '<var>' + esc(m[6]) + '</var>';
      else out += esc(m[7] || m[0]);
    }
    return out;
  }

  // ссылки внутри <code> в готовом HTML и в английском тексте
  function linkCodes(root, selfId) {
    root.querySelectorAll('code').forEach(function (c) {
      if (c.closest('a')) return;
      var t = c.textContent.trim();
      var id = resolve(t), gk = id ? null : gResolve(t);
      if (id && id !== selfId) {
        var a = document.createElement('a'); a.href = '#/e/' + id;
        c.parentNode.insertBefore(a, c); a.appendChild(c);
      } else if (gk && '#/g/' + gk !== location.hash) {
        var ga = document.createElement('a'); ga.href = '#/g/' + gk; ga.title = 'Справка по TeX';
        c.parentNode.insertBefore(ga, c); ga.appendChild(c);
      } else if (/[\\{}~]/.test(t) && !c.querySelector('var') && t.indexOf(' ') > 0) {
        c.innerHTML = hl(c.textContent, selfId);
      }
    });
  }
  var CSRE = /(\\[A-Za-z@_]+:[A-Za-z]*|\\[lgcq]_[A-Za-z@_]+)/g;
  function linkText(s, selfId) {
    return esc(s).replace(CSRE, function (cs) {
      var id = resolve(cs);
      return id && id !== selfId ? '<a href="#/e/' + id + '"><code>' + cs + '</code></a>' : '<code>' + cs + '</code>';
    }).replace(/(^|[\s(])(\\[A-Za-z]+)(?=[\s,.;:)]|$)/g, function (all, pre, cs) {
      var gk = gResolve(cs);
      return gk ? pre + '<a href="#/g/' + gk + '"><code>' + cs + '</code></a>' : all;
    }).replace(/⟨([^⟩]*)⟩/g, '<var>⟨$1⟩</var>');
  }

  function enBlocks(blocks, selfId) {
    var h = '', inDl = false;
    blocks.forEach(function (b) {
      if (b.type === 'dt') { if (!inDl) { h += '<dl>'; inDl = true; } h += '<dt>' + esc(b.text) + '</dt>'; return; }
      if (inDl && b.type === 'p') { h += '<dd>' + linkText(b.text, selfId) + '</dd>'; return; }
      if (inDl) { h += '</dl>'; inDl = false; }
      if (b.type === 'code') h += '<pre class="code">' + hl(b.text, selfId) + '</pre>';
      else if (b.type === 'li') h += '<ul><li>' + linkText(b.text, selfId) + '</li></ul>';
      else h += '<p>' + linkText(b.text, selfId) + '</p>';
    });
    if (inDl) h += '</dl>';
    return h;
  }

  function chTitle(c) { return c.title_ru || c.title; }
  function secTitle(s) { return s.title_ru || s.title || 'Общие сведения'; }
  function firstSentence(e) {
    var t = e.ru ? strip(e.ru.html) : (e.en[0] ? e.en[0].text : '');
    var m = t.match(/^(.{20,}?[.!?])(\s|$)/);
    t = m ? m[1] : t;
    return t.length > 190 ? t.slice(0, 187) + '…' : t;
  }

  // ---------- оглавление ----------
  function buildToc() {
    var h = '';
    if (D.glossary && D.glossary.length) {
      h += '<div class="part">Справка</div><details class="lvl1"><summary><span>TeX и LaTeX: понятия</span></summary>' +
        '<a class="modlink" href="#/tex" data-href="#/tex">Все статьи справки</a>';
      D.glossary.forEach(function (g) { h += '<a class="modlink" href="#/g/' + g.key + '" data-href="#/g/' + g.key + '">' + esc(g.title) + '</a>'; });
      h += '</details>';
    }
    if (D.cases && D.cases.length) {
      h += '<details class="lvl1"><summary><span>Разборы задач</span></summary>' +
        '<a class="modlink" href="#/cases" data-href="#/cases">Все разборы</a>';
      D.cases.forEach(function (c) { h += '<a class="modlink" href="#/c/' + c.key + '" data-href="#/c/' + c.key + '">' + esc(c.title) + '</a>'; });
      h += '</details>';
    }
    D.parts.forEach(function (p) {
      h += '<div class="part">' + esc(p.title) + '</div>';
      p.chapters.forEach(function (n) {
        var c = chByNum[n]; if (!c) return;
        h += '<details class="lvl1" data-ch="' + n + '"><summary><span>' + esc(chTitle(c)) + '</span> <span class="mod">' + esc(c.module) + '</span></summary>';
        h += '<a class="modlink" href="#/m/' + n + '" data-href="#/m/' + n + '">Обзор модуля</a>';
        c.sections.forEach(function (s) {
          var es = entriesByCh[n].filter(function (e) { return e.sec === s.num; });
          if (!es.length) return;
          h += '<details class="lvl2" data-sec="' + s.num + '"><summary>' + esc(s.num + ' ' + secTitle(s)) + '</summary>';
          es.forEach(function (e) { h += '<a class="fn" href="#/e/' + e.id + '" data-href="#/e/' + e.id + '" title="' + esc(e.title) + '">' + esc(e.title) + '</a>'; });
          h += '</details>';
        });
        h += '</details>';
      });
    });
    toc.innerHTML = h;
  }

  function markToc(hash) {
    toc.querySelectorAll('a.active').forEach(function (a) { a.classList.remove('active'); });
    var a = toc.querySelector('a[data-href="' + hash + '"]');
    if (!a) return;
    a.classList.add('active');
    for (var d = a.parentElement; d && d !== toc; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true;
    var r = a.getBoundingClientRect(), sr = side.getBoundingClientRect();
    if (r.top < sr.top + 60 || r.bottom > sr.bottom) a.scrollIntoView({ block: 'center' });
  }

  // ---------- примеры ----------
  // тот же класс, в котором пример собран для сайта: результат совпадёт с показанным PDF
  var FONTS = '\\usepackage{fontspec} % LuaLaTeX или XeLaTeX\n\\setmainfont{CMU Serif} % шрифт с кириллицей, как в показанном PDF\n\\setmonofont{CMU Typewriter Text}\n';
  function docHead(ex) {
    return ex.cls === 'article' ? '\\documentclass{article}\n' + FONTS
      : '\\documentclass[varwidth=15cm,border=10pt]{standalone}\n' + FONTS;
  }
  function asDocument(ex) {
    if (/\\documentclass/.test(ex.code)) return ex.code + '\n';
    if (ex.latex) return docHead(ex) + (ex.pre ? ex.pre + '\n' : '') + '\\begin{document}\n' + ex.code + '\n\\end{document}\n';
    // строки \RequirePackage в начале преамбулы должны идти до \documentclass
    var lines = (ex.pre || '').split('\n'), k = 0;
    while (k < lines.length && /^\s*\\(RequirePackage|DocumentMetadata)/.test(lines[k])) k++;
    var head = lines.slice(0, k).join('\n'), pre = lines.slice(k).join('\n');
    return (head ? head + '\n' : '') + docHead(ex) + (pre ? pre + '\n' : '') + '\\begin{document}\n\\ExplSyntaxOn\n' + ex.code + '\n\\ExplSyntaxOff\n\\end{document}\n';
  }
  var VER = {
    ok: ['ok', I.check + 'проверено lualatex', 'Пример скомпилирован, результат совпал'],
    fail: ['fail', I.x + 'проверка не пройдена', ''],
    skip: ['skip', I.minus + 'без автопроверки', 'Требует особых условий: shell escape, другой драйвер или новое ядро'],
    none: ['none', '', '']
  };
  // код примера в режиме «фрагмент» (только нужные команды) или «документ» (готовый .tex целиком)
  function fragmentHtml(ex, selfId) {
    var h = '';
    var bodyLbl = ex.latex ? 'Тело документа (обычный синтаксис LaTeX):' : 'Тело документа (внутри \\ExplSyntaxOn):';
    if (ex.pre) h += '<div class="pre-lbl">Преамбула:</div><pre class="code">' + hl(ex.pre, selfId) + '</pre><div class="pre-lbl">' + bodyLbl + '</div>';
    else if (ex.latex && !/\\documentclass/.test(ex.code)) h += '<div class="pre-lbl">Обычный синтаксис LaTeX (без \\ExplSyntaxOn):</div>';
    return h + '<pre class="code">' + hl(ex.code, selfId) + '</pre>';
  }
  function documentHtml(ex, selfId) {
    return '<div class="pre-lbl">Готовый документ — сохраните как .tex и скомпилируйте LuaLaTeX:</div><pre class="code">' + hl(asDocument(ex).replace(/\n$/, ''), selfId) + '</pre>';
  }
  function fragmentText(ex) { return (ex.pre ? ex.pre + '\n\n' : '') + ex.code; }

  function exampleHtml(ex, i, selfId) {
    var v = VER[ex.ver] || VER.none;
    var full = /\\documentclass/.test(ex.code);   // пример уже является документом — переключать нечего
    var h = '<div class="example' + (ex.complex ? ' complex' : '') + '" data-i="' + i + '" data-self="' + esc(selfId || '') + '" data-mode="frag">' +
      '<div class="ex-head"><span class="ex-title">' + (ex.complex ? '<span class="cx-badge">Комплексный пример</span>' : '') + esc(ex.title || ('Пример ' + (i + 1))) + '</span>' +
      (v[1] ? '<span class="ver ' + v[0] + '" title="' + v[2] + '">' + v[1] + '</span>' : '') +
      '<span class="ex-btns">' +
      (full ? '' : '<span class="seg" role="group" aria-label="Показать код">' +
        '<button type="button" class="seg-btn" data-mode="frag" aria-pressed="true" title="Только команды примера">Фрагмент</button>' +
        '<button type="button" class="seg-btn" data-mode="doc" aria-pressed="false" title="Готовый .tex-документ целиком">' + I.file + 'Документ</button></span>') +
      '<button type="button" class="ex-btn" data-copy="1" aria-label="Копировать показанный код">' + I.copy + '<span class="t">Копировать</span></button>' +
      '</span></div>';
    if (ex.desc) h += '<div class="ex-desc">' + ex.desc + '</div>';
    h += '<div class="ex-code">' + fragmentHtml(ex, selfId) + '</div>';
    if (ex.pdf && ex.pages && ex.pages.length) {
      // как результат выглядит на самом деле: PDF, собранный в standalone, рисуется через PDF.js
      h += '<div class="out render"><div class="out-head"><span class="lbl">Результат в PDF</span>' +
        '<a class="pdf-link" href="ex/' + esc(ex.pdf) + '.pdf" target="_blank" rel="noopener">' + I.ext + 'Открыть PDF</a></div>';
      ex.pages.forEach(function (p, k) {
        var alt = ex.out ? ex.out : 'Результат примера' + (ex.pages.length > 1 ? ', страница ' + (k + 1) : '');
        h += '<div class="paper" data-pdf="' + esc(ex.pdf) + '" data-page="' + (k + 1) + '" style="width:' + Math.round(p.w * SCALE) + 'px;aspect-ratio:' + p.w + '/' + p.h + '">' +
          '<canvas role="img" aria-label="' + esc(alt) + '"></canvas></div>';
      });
      if (ex.out) h += '<details class="out-text"><summary>Текст результата</summary><pre>' + esc(ex.out) + '</pre></details>';
      h += '</div>';
    } else if (ex.out) h += '<div class="out"><span class="lbl">Результат в документе:</span><pre>' + esc(ex.out) + '</pre></div>';
    if (ex.log) h += '<div class="out log"><span class="lbl">Вывод в терминал / .log:</span><pre>' + esc(ex.log) + '</pre></div>';
    return h + '</div>';
  }
  var curExamples = [];
  // переключатель «Фрагмент / Документ»
  main.addEventListener('click', function (ev) {
    var s = ev.target.closest('.seg-btn');
    if (!s) return;
    var box = s.closest('.example'), ex = curExamples[+box.dataset.i], mode = s.dataset.mode;
    if (box.dataset.mode === mode) return;
    box.dataset.mode = mode;
    box.querySelectorAll('.seg-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
    var self = box.dataset.self || null;
    box.querySelector('.ex-code').innerHTML = mode === 'doc' ? documentHtml(ex, self) : fragmentHtml(ex, self);
  });
  main.addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-copy]');
    if (!b) return;
    var box = b.closest('.example'), ex = curExamples[+box.dataset.i];
    // копируется то, что сейчас показано
    var txt = box.dataset.mode === 'doc' ? asDocument(ex) : fragmentText(ex);
    var done = function () {
      var t = b.querySelector('.t'), o = t.textContent;
      b.classList.add('done'); t.textContent = 'Скопировано'; announce('Скопировано в буфер обмена');
      setTimeout(function () { b.classList.remove('done'); t.textContent = o; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done(); });
    else { fallbackCopy(txt); done(); }
  });
  function fallbackCopy(t) {
    var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  // ---------- страницы ----------
  function expBadge(exp) {
    if (exp === 'full') return '<span class="badge exp" title="Функцию можно использовать внутри e- и x-раскрытия (например, в \\tl_set:Ne)">⋆ полностью раскрываемая</span>';
    if (exp === 'restricted') return '<span class="badge rexp" title="Раскрывается в e- и x-аргументах, но не в f-аргументах">☆ ограниченно раскрываемая</span>';
    return '';
  }

  function pageEntry(id) {
    var e = byId[id];
    if (!e) return pageNotFound();
    var c = chByNum[e.ch];
    var sec = c.sections.filter(function (s) { return s.num === e.sec; })[0];
    var SEP = '<span class="sep" aria-hidden="true">/</span>';
    var h = '<nav class="crumbs" aria-label="Путь"><a href="#/modules">Модули</a>' + SEP + '<a href="#/m/' + c.num + '">' + esc(c.module) + ' — ' + esc(chTitle(c)) + '</a>' +
      (sec ? SEP + '<a href="#/m/' + c.num + '/' + sec.num + '">' + esc(sec.num + ' ' + secTitle(sec)) + '</a>' : '') + '</nav>';
    h += '<h1 class="fn-title">' + esc(e.title) + '</h1>';
    var exps = {}; e.names.forEach(function (n) { if (n.exp) exps[n.exp] = 1; });
    h += '<div class="badges">' + Object.keys(exps).map(expBadge).join('') +
      (e.new ? '<span class="badge new">Новое: ' + esc(e.new) + '</span>' : '') +
      (e.upd ? '<span class="badge">Обновлено: ' + esc(e.upd) + '</span>' : '') +
      '<span class="badge">' + e.variants.length + ' ' + plural(e.variants.length, 'вариант', 'варианта', 'вариантов') + '</span></div>';
    if (e.syntax.length) h += '<h2>Синтаксис</h2><div class="syntax"><pre class="code">' + hl(e.syntax.join('\n'), e.id) + '</pre></div>';
    h += '<h2>Описание</h2>';
    if (e.ru) {
      h += '<div class="desc">' + e.ru.html + '</div>';
      if (e.ru.notes.length) h += '<div class="notes" role="note"><span class="lbl">' + I.info + 'Примечание</span>' + e.ru.notes.map(function (n) { return '<p>' + n + '</p>'; }).join('') + '</div>';
    } else {
      h += '<p class="empty">Русское описание пока не готово — ниже приведён оригинальный текст.</p><div class="en">' + enBlocks(e.en, e.id) + '</div>';
    }
    h += variantsTable(e);
    curExamples = e.ru ? e.ru.ex : [];
    if (curExamples.length) {
      h += '<h2>Примеры</h2>';
      curExamples.forEach(function (ex, i) { h += exampleHtml(ex, i, e.id); });
    }
    // см. также
    var seen = {}, also = [];
    var scan = (e.ru ? e.ru.html + curExamples.map(function (x) { return x.code; }).join(' ') : '') + ' ' + e.enplain;
    (scan.match(/\\[A-Za-z@_]+:[A-Za-z]*|\\[lgcq]_[A-Za-z@_]+/g) || []).forEach(function (n) {
      var r = resolve(n); if (r && r !== e.id && !seen[r]) { seen[r] = 1; also.push(r); }
    });
    if (e.en.length) {
      e.en.forEach(function (b) { (b.text.match(CSRE) || []).forEach(function (n) { var r = resolve(n); if (r && r !== e.id && !seen[r]) { seen[r] = 1; also.push(r); } }); });
    }
    if (also.length) h += '<h2>См. также</h2><ul class="seealso">' + also.slice(0, 24).map(function (r) { return '<li><a href="#/e/' + r + '">' + esc(byId[r].title) + '</a></li>'; }).join('') + '</ul>';
    if (e.ru) h += '<details class="orig"><summary>Оригинальное описание (англ.)</summary><div class="en">' + enBlocks(e.en, e.id) + '</div></details>';
    h += '<div class="src">' + I.ext + 'Источник: <a href="interface3.pdf#page=' + e.page + '" target="_blank" rel="noopener">interface3.pdf, стр. ' + e.page + '</a></div>';
    var list = entriesByCh[e.ch], k = list.indexOf(e);
    h += '<div class="pager">' + (k > 0 ? '<a href="#/e/' + list[k - 1].id + '"><span class="lbl">← Предыдущая</span>' + esc(list[k - 1].title) + '</a>' : '') +
      (k < list.length - 1 ? '<a class="next" href="#/e/' + list[k + 1].id + '"><span class="lbl">Следующая →</span>' + esc(list[k + 1].title) + '</a>' : '') + '</div>';
    render(h, e.title + ' — справочник expl3', e.id);
  }

  // ---------- синтаксис вариантов ----------
  // Синтаксис в interface3 дан только для основной формы (например, \color_select:nn).
  // Синтаксис варианта (\color_select:nV) выводится из него по буквам сигнатуры.
  function splitArgs(rest) {
    var out = [], i = 0, s = rest;
    while (i < s.length) {
      var ch = s.charAt(i);
      if (/\s/.test(ch)) { i++; continue; }
      var j = i;
      if (ch === '{' || ch === '[') {
        var open = ch, close = ch === '{' ? '}' : ']', d = 0;
        for (; j < s.length; j++) { if (s.charAt(j) === open) d++; else if (s.charAt(j) === close && --d === 0) break; }
        j++;
      } else if (ch === '⟨') { j = s.indexOf('⟩', i); j = j < 0 ? s.length : j + 1; }
      else if (ch === '\\') { j = i + 1; while (j < s.length && /[A-Za-z@_:]/.test(s.charAt(j))) j++; if (j === i + 1) j++; }
      else { while (j < s.length && !/[\s{⟨\\[]/.test(s.charAt(j))) j++; }
      out.push(s.slice(i, j)); i = j;
    }
    return out;
  }
  function splitSig(name) {
    var k = name.lastIndexOf(':'), sig = k < 0 ? '' : name.slice(k + 1);
    var m = sig.match(/^(.*?)(TF|T|F)?$/);
    return { stem: k < 0 ? name : name.slice(0, k), core: m[1], tf: m[2] || '' };
  }
  function parseSyntax(lines) {
    var res = [];
    lines.forEach(function (ln) {
      var m = ln.match(/^\s*(\\[A-Za-z@_]+:[A-Za-z]*)(.*)$/);
      if (m) { var b = splitSig(m[1]); b.name = m[1]; b.text = ln.trim(); b.args = splitArgs(m[2]); res.push(b); }
      else if (res.length) {           // продолжение предыдущей строки синтаксиса
        // аргументы разбираются по всему тексту: скобки группы могут закрываться на другой строке
        var p = res[res.length - 1]; p.text += ' ' + ln.trim(); p.args = splitArgs(p.text.slice(p.name.length));
      }
    });
    return res;
  }
  function inner(t) { return t.replace(/^\{(.*)\}$/, '$1').replace(/^⟨(.*)⟩$/, '$1'); }
  function mapArg(b, v, t) {
    if (v === b) return t;
    if (/[oefx]/.test(v)) return /^\{/.test(t) ? t : '{' + t + '}';      // тот же аргумент, раскрывается
    if (v === 'V') return '⟨' + inner(t) + ' var⟩';                        // переменная, берётся её значение
    if (v === 'v') return '{⟨' + inner(t) + ' var⟩}';                      // имя такой переменной
    if (v === 'c') return '{⟨' + inner(t) + '⟩}';                          // имя текстом в скобках
    if (v === 'N' && b === 'n') return '⟨' + inner(t) + '⟩';
    return t;
  }
  function variantSyntax(name, bases, names) {
    var exact = bases.filter(function (b) { return b.name === name; })[0];
    if (exact) return cutOwn(exact.text, name, names);
    // 1) имя варианта встречается внутри строки синтаксиса (несколько синтаксисов слиты в одну строку)
    for (var i = 0; i < bases.length; i++) {
      if (bases[i].text.indexOf(name) > 0) return cutOwn(bases[i].text.slice(bases[i].text.indexOf(name)), name, names);
    }
    var mapped = mappedSyntax(name, bases);
    if (mapped) return mapped;
    var v = splitSig(name);
    // 2) та же сигнатура, другое имя (\if_mode_vertical: по образцу \if_mode_horizontal:)
    var same = bases.filter(function (b) { return b.core === v.core && b.tf === v.tf; })[0];
    if (same) return name + same.text.slice(same.name.length);
    // 3) повтор одного аргумента (\use_none:nnn по образцу \use_none:n {⟨group1⟩})
    var rep = bases.filter(function (b) { return b.stem === v.stem && /^(.)\1*$/.test(v.core) && b.core === v.core.charAt(0) && b.args.length === 1; })[0];
    if (rep) {
      var a = [];
      for (var k = 1; k <= v.core.length; k++) a.push(rep.args[0].replace(/1(?=⟩)/, String(k)));
      return name + ' ' + a.join(' ');
    }
    return '';
  }
  // отрезать от строки синтаксиса начало следующего варианта, если он записан в той же строке
  function cutOwn(text, name, names) {
    var end = text.length;
    names.forEach(function (n) {
      // \else:, \fi:, \cs_end: — части той же конструкции, по ним строку не режем
      if (n === name || !/:[A-Za-z]+$/.test(n)) return;
      var p = text.indexOf(n, name.length);
      if (p > 0 && p < end && !/[A-Za-z@_:]/.test(text.charAt(p + n.length) || ' ')) end = p;
    });
    return text.slice(0, end).trim();
  }
  function mappedSyntax(name, bases) {
    var v = splitSig(name), best = null, score = -1;
    bases.forEach(function (b) {
      var nargs = b.core.length + b.tf.length;
      if (b.args.length !== nargs) return;
      // та же длина сигнатуры, либо вариант — та же функция без последних аргументов (\msg_new:nnn ← nnnn)
      var shorter = b.core.length > v.core.length && b.stem === v.stem;
      if (b.core.length !== v.core.length && !shorter) return;
      var sc = (shorter ? 0 : 16) + (b.stem === v.stem ? 4 : 0) + (/_p$/.test(b.stem) === /_p$/.test(v.stem) ? 2 : 0) + (b.tf ? 1 : 0);
      if (sc > score) { score = sc; best = b; }
    });
    if (!best) return '';
    if (best.name === name) return best.text;
    var args = [];
    for (var k = 0; k < v.core.length; k++) args.push(mapArg(best.core.charAt(k), v.core.charAt(k), best.args[k]));
    if (best.tf === 'TF') {               // ветки истины и лжи — последние два аргумента основы
      var tArg = best.args[best.core.length], fArg = best.args[best.core.length + 1];
      if (v.tf === 'TF') args.push(tArg, fArg); else if (v.tf === 'T') args.push(tArg); else if (v.tf === 'F') args.push(fArg);
    }
    return name + (args.length ? ' ' + args.join(' ') : '');
  }
  function expandName(n) {               // \tl_set_eq:(cN|Nc) → \tl_set_eq:cN, \tl_set_eq:Nc
    var m = n.match(/^(.*?)\(([^)]*)\)(.*)$/);
    if (!m) return [n];
    return m[2].split('|').reduce(function (acc, alt) { return acc.concat(expandName(m[1] + alt + m[3])); }, []);
  }
  var SIG_HELP = {
    N: 'один токен — обычно имя команды или переменной',
    n: 'аргумент в фигурных скобках, передаётся как есть',
    c: 'имя команды или переменной, записанное текстом в скобках',
    V: 'переменная — функция получает её значение',
    v: 'имя переменной текстом в скобках — функция получает её значение',
    o: 'аргумент раскрывается один раз',
    e: 'аргумент полностью раскрывается (как \\expanded)',
    x: 'аргумент полностью раскрывается (как \\edef; устаревший тип)',
    f: 'аргумент раскрывается до первого нераскрываемого токена',
    p: 'список параметров (#1#2…)',
    w: 'аргумент особого вида (см. описание)',
    D: 'не используйте: только для внутренних целей'
  };
  function variantsTable(e) {
    var exp = {};
    e.names.forEach(function (n) { expandName(n.name).forEach(function (x) { exp[x] = n.exp; }); });
    var list = e.variants.length ? e.variants : e.names.map(function (n) { return n.name; });
    var bases = parseSyntax(e.syntax || []);
    var rows = list.map(function (v) { return { v: v, syn: bases.length ? variantSyntax(v, bases, list) : '' }; });
    var withSyn = rows.some(function (r) { return r.syn; });
    var h = '<h2>Имена и варианты</h2><table class="tbl vars"><thead><tr><th>Имя</th>' + (withSyn ? '<th>Синтаксис</th>' : '') +
      '<th>Раскрываемость</th></tr></thead><tbody>';
    var letters = {}, tf = false, pred = false;
    rows.forEach(function (r) {
      var s = splitSig(r.v), x = exp[r.v];
      s.core.split('').forEach(function (c) { letters[c] = 1; });
      if (s.tf) tf = true;
      if (/_p$/.test(s.stem)) pred = true;
      h += '<tr><td class="mono">' + esc(r.v) + '</td>' +
        (withSyn ? '<td class="syn">' + (r.syn ? '<code>' + hl(r.syn, e.id) + '</code>' : '—') + '</td>' : '') +
        '<td>' + (x === 'full' ? '⋆ полностью' : x === 'restricted' ? '☆ ограниченно' : '—') + '</td></tr>';
    });
    h += '</tbody></table>';
    // пояснение букв сигнатуры, которые встречаются в этой статье
    var help = Object.keys(SIG_HELP).filter(function (c) { return letters[c]; })
      .map(function (c) { return '<li><code>' + c + '</code> — ' + esc(SIG_HELP[c]) + '</li>'; });
    if (tf) help.push('<li><code>TF</code>, <code>T</code>, <code>F</code> — условная функция: код для истины и/или лжи</li>');
    if (pred) help.push('<li><code>_p</code> — предикат: результат для логических выражений (<code>\\bool_if:nTF</code>)</li>');
    if (help.length > 1 && list.length > 1) h += '<details class="sig-help"><summary>Что означают буквы сигнатуры</summary><ul>' + help.join('') + '</ul></details>';
    return h;
  }

  function plural(n, a, b, c) { var m = n % 10, mm = n % 100; return m === 1 && mm !== 11 ? a : (m >= 2 && m <= 4 && (mm < 10 || mm >= 20) ? b : c); }

  function pageModule(num, secNum) {
    var c = chByNum[num];
    if (!c) return pageNotFound();
    curExamples = [];
    var h = '<nav class="crumbs" aria-label="Путь"><a href="#/modules">Модули</a><span class="sep" aria-hidden="true">/</span><span>' + esc(c.module) + '</span></nav>';
    h += '<h1>' + esc(chTitle(c)) + '</h1><p class="lead"><span class="mono">' + esc(c.module) + '</span> · ' + esc(c.title) + ' · глава ' + c.num + ' interface3</p>';
    if (c.overview) h += '<div class="desc">' + c.overview + '</div>';
    c.sections.forEach(function (s, si) {
      var es = entriesByCh[num].filter(function (e) { return e.sec === s.num; });
      var hasEn = s.intro_en && s.intro_en.length;
      if (si === 0 && !es.length) {
        if (!c.overview && hasEn) h += '<div class="en">' + enBlocks(s.intro_en) + '</div>';
        else if (hasEn) h += '<details class="orig"><summary>Вводный текст главы (англ.)</summary><div class="en">' + enBlocks(s.intro_en) + '</div></details>';
        return;
      }
      h += '<h2 id="sec-' + esc(s.num) + '">' + esc(s.num + ' ' + secTitle(s)) + '</h2>';
      if (s.title_ru && s.title) h += '<p class="lead">' + esc(s.title) + '</p>';
      if (s.intro_ru) h += '<div class="desc">' + s.intro_ru + '</div>';
      if (hasEn) h += s.intro_ru ? '<details class="orig"><summary>Оригинальный текст раздела (англ.)</summary><div class="en">' + enBlocks(s.intro_en) + '</div></details>'
        : '<div class="en">' + enBlocks(s.intro_en) + '</div>';
      if (es.length) {
        h += '<table class="tbl fn-list"><thead><tr><th>Функция / переменная</th><th>Описание</th></tr></thead><tbody>';
        es.forEach(function (e) { h += '<tr><td><a href="#/e/' + e.id + '">' + esc(e.title) + '</a></td><td>' + esc(firstSentence(e)) + '</td></tr>'; });
        h += '</tbody></table>';
      }
    });
    var ci = D.chapters.indexOf(c);
    h += '<div class="pager">' + (ci > 0 ? '<a href="#/m/' + D.chapters[ci - 1].num + '"><span class="lbl">← Предыдущий модуль</span>' + esc(D.chapters[ci - 1].module || chTitle(D.chapters[ci - 1])) + '</a>' : '') +
      (ci < D.chapters.length - 1 ? '<a class="next" href="#/m/' + D.chapters[ci + 1].num + '"><span class="lbl">Следующий модуль →</span>' + esc(D.chapters[ci + 1].module || chTitle(D.chapters[ci + 1])) + '</a>' : '') + '</div>';
    render(h, chTitle(c) + ' — справочник expl3', null, '#/m/' + num);
    if (secNum) { var t = document.getElementById('sec-' + secNum); if (t) t.scrollIntoView(); }
  }

  function moduleCards() {
    var h = '';
    D.parts.forEach(function (p) {
      h += '<h2>' + esc(p.title) + '</h2><div class="cards">';
      p.chapters.forEach(function (n) {
        var c = chByNum[n]; if (!c) return;
        h += '<a class="card" href="#/m/' + n + '"><div class="m">' + esc(c.module || '—') + '</div><div class="t">' + esc(chTitle(c)) + '</div><div class="c">' +
          entriesByCh[n].length + ' ' + plural(entriesByCh[n].length, 'статья', 'статьи', 'статей') + '</div></a>';
      });
      h += '</div>';
    });
    return h;
  }

  function pageHome() {
    curExamples = D.guide_ex || [];
    var nru = D.entries.filter(function (e) { return e.ru; }).length;
    var nex = 0, nok = 0;
    D.entries.forEach(function (e) { if (e.ru) e.ru.ex.forEach(function (x) { nex++; if (x.ver === 'ok') nok++; }); });
    var h = '<h1>Справочник по языку expl3</h1><p class="lead">Функции и переменные программного слоя LaTeX3 на русском языке — по документу <a href="interface3.pdf" target="_blank" rel="noopener">interface3</a>, с примерами, проверенными компиляцией.</p>' +
      '<div class="stats"><span><b>' + D.entries.length + '</b>статей</span><span><b>' + D.chapters.length + '</b>модулей</span><span><b>' + nex + '</b>примеров</span><span><b>' + nok + '</b>проверено в LuaLaTeX</span></div>' +
      '<div class="quick">' +
      '<a href="#/" data-to="guide">' + I.book + '<div><b>Основы</b><span>Синтаксис expl3, имена и сигнатуры</span></div></a>' +
      '<a href="#/cases">' + I.check + '<div><b>Разборы задач</b><span>Решения без expl3 и с expl3 — бок о бок</span></div></a>' +
      '<a href="#/modules">' + I.grid + '<div><b>Модули</b><span>Все разделы interface3 по темам</span></div></a>' +
      '<a href="#/tex">' + I.help + '<div><b>Справка TeX</b><span>Раскрытие, коды категорий, регистры</span></div></a>' +
      '<a href="#/index">' + I.list + '<div><b>Указатель</b><span>Все имена по алфавиту</span></div></a>' +
      '</div>';
    h += '<h2 id="guide">Основы expl3</h2>' + (D.guide || '');
    curExamples.forEach(function (ex, i) { h += exampleHtml(ex, i); });
    h += '<h2>Модули</h2>' + moduleCards();
    render(h, 'Справочник expl3', null, '#/');
  }

  function pageModules() {
    curExamples = [];
    render('<h1>Модули expl3</h1><p class="lead">Документ interface3 разбит на модули; у каждого свой префикс имён (например, <code>tl</code> у модуля l3tl).</p>' + moduleCards(), 'Модули — справочник expl3', null, '#/modules');
  }

  function pageIndex() {
    curExamples = [];
    var all = [];
    D.entries.forEach(function (e) { e.names.forEach(function (n) { all.push([n.name, e.id]); }); });
    var key = function (s) { return s.replace(/^[\\.]/, '').replace(/^[lgcqs]_/, '').toLowerCase(); };
    all.sort(function (a, b) { return key(a[0]) < key(b[0]) ? -1 : key(a[0]) > key(b[0]) ? 1 : 0; });
    var groups = {}, order = [];
    all.forEach(function (x) { var L = key(x[0]).charAt(0).toUpperCase(); if (!/[A-Z]/.test(L)) L = '#'; if (!groups[L]) { groups[L] = []; order.push(L); } groups[L].push(x); });
    var h = '<h1>Алфавитный указатель</h1><p class="lead">Все имена (' + all.length + '). Префиксы <code>l_</code>, <code>g_</code>, <code>c_</code> при сортировке не учитываются.</p><div class="letters">' +
      order.map(function (L) { return '<a href="#/index" data-letter="' + L + '">' + L + '</a>'; }).join('') + '</div><div class="alpha">';
    order.forEach(function (L) {
      h += '<h3 id="L-' + L + '">' + L + '</h3>';
      groups[L].forEach(function (x) { h += '<a href="#/e/' + x[1] + '">' + esc(x[0]) + '</a>'; });
    });
    render(h + '</div>', 'Алфавитный указатель — справочник expl3', null, '#/index');
    main.querySelectorAll('[data-letter]').forEach(function (a) {
      a.addEventListener('click', function (ev) { ev.preventDefault(); document.getElementById('L-' + a.dataset.letter).scrollIntoView(); });
    });
  }

  function pageGlossaryItem(key) {
    var g = gByKey[key];
    if (!g) return pageNotFound();
    var h = '<div class="crumbs"><a href="#/tex">Справка по TeX и LaTeX</a></div><h1>' + esc(g.title) + '</h1>';
    if (g.aliases.length) h += '<div class="badges">' + g.aliases.map(function (a) { return '<span class="badge">' + esc(a) + '</span>'; }).join('') + '</div>';
    h += '<div class="desc">' + g.html + '</div>';
    if (g.notes.length) h += '<div class="notes" role="note"><span class="lbl">' + I.info + 'Примечание</span>' + g.notes.map(function (n) { return '<p>' + n + '</p>'; }).join('') + '</div>';
    curExamples = g.ex;
    if (g.ex.length) { h += '<h2>Примеры</h2>'; g.ex.forEach(function (ex, i) { h += exampleHtml(ex, i); }); }
    // какие статьи справочника ссылаются сюда
    var refs = D.entries.filter(function (e) { return e.ru && e.ru.html.indexOf('#/g/' + key + '"') >= 0; });
    if (refs.length) h += '<h2>Где упоминается</h2><ul class="seealso">' + refs.slice(0, 40).map(function (e) { return '<li><a href="#/e/' + e.id + '">' + esc(e.title) + '</a></li>'; }).join('') + '</ul>';
    var k = D.glossary.indexOf(g);
    h += '<div class="pager">' + (k > 0 ? '<a href="#/g/' + D.glossary[k - 1].key + '"><span class="lbl">← Предыдущая</span>' + esc(D.glossary[k - 1].title) + '</a>' : '') +
      (k < D.glossary.length - 1 ? '<a class="next" href="#/g/' + D.glossary[k + 1].key + '"><span class="lbl">Следующая →</span>' + esc(D.glossary[k + 1].title) + '</a>' : '') + '</div>';
    render(h, g.title + ' — справка по TeX', null, '#/g/' + key);
  }

  function pageGlossary() {
    curExamples = [];
    var h = '<h1>Справка по TeX и LaTeX</h1><p class="lead">Понятия и примитивы TeX, на которые опирается expl3 и ссылается документация interface3. Здесь объяснено, «что под капотом».</p><table class="tbl fn-list"><tbody>';
    D.glossary.forEach(function (g) { h += '<tr><td><a href="#/g/' + g.key + '">' + esc(g.title) + '</a></td><td>' + esc(strip(g.html).slice(0, 170)) + '…</td></tr>'; });
    render(h + '</tbody></table>', 'Справка по TeX и LaTeX', null, '#/tex');
  }

  // ---------- разборы задач ----------
  var CASES = D.cases || [], caseByKey = {};
  CASES.forEach(function (c) { caseByKey[c.key] = c; });
  function caseCards() {
    return '<div class="cases">' + CASES.map(function (c, i) {
      return '<a class="case-card" href="#/c/' + c.key + '"><span class="case-n">' + (i + 1) + '</span><div><b>' + esc(c.title) + '</b>' +
        (c.lead ? '<span class="case-lead">' + c.lead + '</span>' : '') +
        (c.tags.length ? '<span class="case-tags">' + c.tags.map(function (t) { return '<code>' + esc(t) + '</code>'; }).join(' ') + '</span>' : '') +
        '</div></a>';
    }).join('') + '</div>';
  }
  function pageCases() {
    curExamples = [];
    render('<h1>Разборы задач</h1><p class="lead">Типовые задачи из подготовки учебных материалов. Каждая решена дважды — средствами классического LaTeX/TeX и на expl3, с комментариями к каждой строке и настоящим результатом компиляции. Так видно, что именно даёт expl3 и где он проще.</p>' +
      caseCards(), 'Разборы задач — справочник expl3', null, '#/cases');
  }
  function pageCase(key) {
    var c = caseByKey[key];
    if (!c) return pageNotFound();
    curExamples = c.ex;
    var h = '<nav class="crumbs" aria-label="Путь"><a href="#/cases">Разборы задач</a></nav><h1>' + esc(c.title) + '</h1>' +
      (c.lead ? '<p class="lead">' + c.lead + '</p>' : '') +
      (c.tags.length ? '<div class="badges">' + c.tags.map(function (t) { return '<span class="badge">' + esc(t) + '</span>'; }).join('') + '</div>' : '');
    // метки %%EXn%% в тексте заменяются самими примерами
    h += c.html.replace(/<p>%%EX(\d+)%%<\/p>/g, function (all, n) { return c.ex[+n] ? exampleHtml(c.ex[+n], +n) : ''; });
    if (c.notes.length) h += '<div class="notes" role="note"><span class="lbl">' + I.info + 'Примечание</span>' + c.notes.map(function (n) { return '<p>' + n + '</p>'; }).join('') + '</div>';
    var k = CASES.indexOf(c);
    h += '<nav class="pager plain" aria-label="Соседние разборы">' + (k > 0 ? '<a href="#/c/' + CASES[k - 1].key + '"><span class="lbl">← Предыдущий разбор</span>' + esc(CASES[k - 1].title) + '</a>' : '') +
      (k < CASES.length - 1 ? '<a class="next" href="#/c/' + CASES[k + 1].key + '"><span class="lbl">Следующий разбор →</span>' + esc(CASES[k + 1].title) + '</a>' : '') + '</nav>';
    render(h, c.title + ' — разборы задач expl3', null, '#/c/' + key);
  }

  function pageNotFound() { curExamples = []; render('<h1>Страница не найдена</h1><p><a href="#/">На главную</a></p>', 'Не найдено'); }

  // первое упоминание понятия в тексте страницы → ссылка на справку
  var AUTOLINK = [];
  (D.glossary || []).forEach(function (g) {
    (g.autolink || []).forEach(function (stem) {
      AUTOLINK.push({ key: g.key, re: new RegExp('(^|[^а-яёa-z])(' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[а-яё]*)', 'i') });
    });
  });
  function autoLink(root, selfHash) {
    var used = {};
    root.querySelectorAll('.desc, .notes').forEach(function (box) {
      var walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, null), nodes = [], n;
      while ((n = walker.nextNode())) {
        if (!n.parentNode.closest('a, code, pre, h1, h2, h3, th, var, b')) nodes.push(n);
      }
      nodes.forEach(function (node) {
        AUTOLINK.forEach(function (r) {
          if (used[r.key] || selfHash === '#/g/' + r.key || !node.parentNode) return;
          var m = r.re.exec(node.nodeValue);
          if (!m) return;
          used[r.key] = 1;
          var start = m.index + m[1].length, word = m[2];
          var after = node.splitText(start); after.nodeValue = after.nodeValue.slice(word.length);
          var a = document.createElement('a'); a.href = '#/g/' + r.key; a.className = 'gl'; a.title = 'Справка по TeX'; a.textContent = word;
          node.parentNode.insertBefore(a, after);
          node = after;
        });
      });
    });
  }

  var REPO = 'https://github.com/Gavreg/Latex3-handbook.github.io';
  // подвал страницы: ссылка на репозиторий с исходниками сайта
  var FOOTER = '<footer class="site-foot"><a href="' + REPO + '" target="_blank" rel="noopener">' +
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>' +
    '<span>Справочник на GitHub: исходники, замечания и предложения</span></a></footer>';

  function render(h, title, entryId, tocHash) {
    main.innerHTML = '<article class="doc">' + h + '</article>' + FOOTER;
    document.title = title;
    var doc = main.firstChild;
    linkCodes(doc, entryId);
    autoLink(doc, tocHash);
    // широкие таблицы прокручиваются внутри рамки, а не растягивают страницу
    doc.querySelectorAll('table.tbl').forEach(function (t) {
      var w = document.createElement('div'); w.className = 'tbl-wrap';
      t.parentNode.insertBefore(w, t); w.appendChild(t);
    });
    buildPageToc(doc);
    watchPapers(doc);
    markToc(entryId ? '#/e/' + entryId : (tocHash || ''));
    setMenu(false);
  }

  // «На этой странице»: список заголовков h2 с подсветкой текущего раздела
  var spy = null;
  function buildPageToc(doc) {
    if (spy) { spy.disconnect(); spy = null; }
    var hs = Array.prototype.slice.call(doc.querySelectorAll('h2'));
    if (hs.length < 3) return;
    var nav = document.createElement('nav');
    nav.className = 'page-toc'; nav.setAttribute('aria-label', 'На этой странице');
    var html = '<div class="pt-head">На этой странице</div>';
    hs.forEach(function (x, i) {
      if (!x.id) x.id = 'h-' + (i + 1);
      html += '<a href="#' + x.id + '" data-to="' + x.id + '">' + esc(x.textContent) + '</a>';
    });
    nav.innerHTML = html;
    main.appendChild(nav);
    if (!('IntersectionObserver' in window)) return;
    var links = nav.querySelectorAll('a');
    spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('on', l.dataset.to === en.target.id); });
      });
    }, { rootMargin: '-60px 0px -70% 0px' });
    hs.forEach(function (x) { spy.observe(x); });
  }

  // ---------- PDF результатов примеров (PDF.js) ----------
  // Сайт открывается как файл, поэтому PDF берётся не fetch-ем, а из скрипта ex/<имя>.js
  // (base64), а PDF.js и его «воркер» подключаются обычными <script> из vendor/pdfjs.
  // масштаб показа: 1 pt PDF = 2,25 px (текст 10 pt — около 22 px, крупнее текста страницы)
  var SCALE = 2.25, scriptCache = {}, docCache = {}, pdfObs = null;
  function loadScript(src) {
    if (!scriptCache[src]) scriptCache[src] = new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = function () { delete scriptCache[src]; fail(new Error('не загружен ' + src)); };
      document.head.appendChild(s);
    });
    return scriptCache[src];
  }
  function pdfjs() {
    // воркер, подключённый как скрипт, работает в основном потоке — для маленьких PDF этого достаточно
    return loadScript('vendor/pdfjs/pdf.min.js').then(function () { return loadScript('vendor/pdfjs/pdf.worker.min.js'); })
      .then(function () { return window.pdfjsLib; });
  }
  function getPdf(name) {
    if (!docCache[name]) docCache[name] = Promise.all([pdfjs(), loadScript('ex/' + name + '.js')]).then(function (r) {
      var b = atob(window.EXPL3PDF[name]), u = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      return r[0].getDocument({ data: u, isEvalSupported: false }).promise;
    });
    return docCache[name];
  }
  function drawPaper(box) {
    if (box.dataset.state) return;
    box.dataset.state = 'loading';
    getPdf(box.dataset.pdf).then(function (doc) { return doc.getPage(+box.dataset.page); }).then(function (page) {
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var vp = page.getViewport({ scale: SCALE * dpr });
      var cv = box.querySelector('canvas');
      cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      return page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    }).then(function () { box.dataset.state = 'done'; }, function (err) {
      box.dataset.state = 'error';
      box.innerHTML = '<div class="paper-err">Не удалось показать PDF (' + esc(err.message || err) + '). Откройте его по ссылке выше.</div>';
    });
  }
  function watchPapers(root) {
    if (pdfObs) pdfObs.disconnect();
    var boxes = root.querySelectorAll('.paper[data-pdf]');
    if (!boxes.length) return;
    if (!('IntersectionObserver' in window)) { boxes.forEach(drawPaper); return; }
    pdfObs = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { pdfObs.unobserve(en.target); drawPaper(en.target); } });
    }, { rootMargin: '300px 0px' });
    boxes.forEach(function (b) { pdfObs.observe(b); });
  }

  // переходы внутри страницы (data-to) не меняют адрес — он занят маршрутом
  main.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[data-to]'); if (!a) return;
    var t = document.getElementById(a.dataset.to); if (!t) return;
    ev.preventDefault();
    t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
  });

  // активный пункт верхнего меню
  function markNav(hash) {
    var k = /^#\/(m|e|modules)/.test(hash) ? 'modules' : /^#\/(g|tex)/.test(hash) ? 'tex' : /^#\/(c\/|cases)/.test(hash) ? 'cases' : hash === '#/index' ? 'index' : 'home';
    document.querySelectorAll('.top-links a').forEach(function (a) {
      if (a.dataset.nav === k) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function route() {
    var h = location.hash || '#/';
    var m;
    markNav(h);
    if ((m = h.match(/^#\/e\/([\w-]+)/))) pageEntry(m[1]);
    else if ((m = h.match(/^#\/m\/(\d+)(?:\/([\d.]+))?/))) pageModule(+m[1], m[2]);
    else if ((m = h.match(/^#\/g\/([\w-]+)/))) pageGlossaryItem(m[1]);
    else if ((m = h.match(/^#\/c\/([\w-]+)/))) pageCase(m[1]);
    else if (h === '#/cases') pageCases();
    else if (h === '#/tex') pageGlossary();
    else if (h === '#/modules') pageModules();
    else if (h === '#/index') pageIndex();
    else pageHome();
    if (!(m && m[2])) window.scrollTo(0, 0);
  }

  // ---------- поиск ----------
  var sel = -1;
  function doSearch() {
    var s = q.value.trim().toLowerCase();
    if (!s) { results.hidden = true; toc.hidden = false; return; }
    var sNorm = s.replace(/^\\/, '');
    var hits = [];
    D.entries.forEach(function (e) {
      var best = 0, which = e.title;
      e.variants.concat(e.names.map(function (n) { return n.name; })).forEach(function (v) {
        var vl = v.toLowerCase().replace(/^\\/, ''), sc = 0;
        if (vl === sNorm) sc = 100;
        else if (vl.indexOf(sNorm) === 0) sc = 60 - vl.length / 100;
        else if (vl.indexOf(sNorm) >= 0) sc = 40 - vl.length / 100;
        if (sc > best) { best = sc; which = v; }
      });
      if (!best && s.length > 2) {
        if (e.plain.indexOf(s) >= 0) best = 10;
        else if (e.enplain.indexOf(s) >= 0) best = 5;
      }
      if (best) hits.push({ e: e, sc: best, name: which });
    });
    var ghits = (D.glossary || []).filter(function (g) {
      return g.title.toLowerCase().indexOf(s) >= 0 || g.aliases.some(function (a) { return a.toLowerCase().indexOf(s) >= 0; }) || (s.length > 2 && g.plain.indexOf(s) >= 0);
    });
    hits.sort(function (a, b) { return b.sc - a.sc; });
    var chits = (D.cases || []).filter(function (c) {
      return (c.title + ' ' + strip(c.lead) + ' ' + c.tags.join(' ')).toLowerCase().indexOf(s) >= 0;
    });
    var h = '';
    if (chits.length) {
      h += '<div class="r-head">Разборы задач · ' + chits.length + '</div>';
      chits.forEach(function (c) { h += '<a href="#/c/' + c.key + '"><div class="r-name gl-name">' + mark(c.title, s) + '</div><div class="r-sub">' + esc(strip(c.lead).slice(0, 90)) + '</div></a>'; });
    }
    if (ghits.length) {
      h += '<div class="r-head">Справка по TeX · ' + ghits.length + '</div>';
      ghits.slice(0, 8).forEach(function (g) { h += '<a href="#/g/' + g.key + '"><div class="r-name gl-name">' + mark(g.title, s) + '</div><div class="r-sub">' + esc(g.aliases.slice(0, 4).join(', ')) + '</div></a>'; });
    }
    if (hits.length) {
      h += '<div class="r-head">Функции · ' + hits.length + (hits.length > 80 ? ' (первые 80)' : '') + '</div>';
      hits.slice(0, 80).forEach(function (x) {
        h += '<a href="#/e/' + x.e.id + '"><div class="r-name">' + mark(x.name, sNorm) + '</div><div class="r-sub">' + esc(chByNum[x.e.ch].module) + ' · ' + esc(firstSentence(x.e).slice(0, 90)) + '</div></a>';
      });
    }
    if (!hits.length && !ghits.length && !chits.length) {
      h += '<div class="r-empty"><b>Ничего не найдено</b> по запросу «' + esc(q.value.trim()) + '». Попробуйте:<ul>' +
        '<li>часть имени без сигнатуры: <code>tl_set</code>, <code>seq_map</code></li>' +
        '<li>русское слово из описания: «пробел», «регистр»</li>' +
        '<li>понятие TeX: <code>catcode</code>, «раскрытие»</li></ul></div>';
    }
    results.innerHTML = h; results.hidden = false; toc.hidden = true; sel = -1;
    var nfound = hits.length + ghits.length + chits.length;
    announce(nfound ? 'Найдено: ' + nfound : 'Ничего не найдено');
  }
  // подсветка совпадения в имени
  function mark(text, needle) {
    var i = needle ? text.toLowerCase().indexOf(needle) : -1;
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + needle.length)) + '</mark>' + esc(text.slice(i + needle.length));
  }
  q.addEventListener('input', doSearch);
  q.addEventListener('keydown', function (ev) {
    var items = results.querySelectorAll('a');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      sel = Math.max(0, Math.min(items.length - 1, sel + (ev.key === 'ArrowDown' ? 1 : -1)));
      items.forEach(function (a, i) { a.classList.toggle('sel', i === sel); });
      if (items[sel]) items[sel].scrollIntoView({ block: 'nearest' });
    } else if (ev.key === 'Enter') {
      var a = items[sel >= 0 ? sel : 0]; if (a) location.hash = a.getAttribute('href');
    } else if (ev.key === 'Escape') { q.value = ''; doSearch(); }
  });
  function focusSearch() { setMenu(true); q.focus(); q.select(); }
  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && document.activeElement !== q && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { ev.preventDefault(); focusSearch(); }
    else if (ev.key === 'Escape' && side.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });

  // ---------- тема ----------
  var root = document.documentElement, themeBtn = $('#themeBtn');
  var mq = matchMedia('(prefers-color-scheme: dark)');
  function isDark() { return root.dataset.theme ? root.dataset.theme === 'dark' : mq.matches; }
  function syncTheme() {
    var d = isDark();
    themeBtn.setAttribute('aria-pressed', String(d));
    themeBtn.setAttribute('aria-label', d ? 'Светлая тема' : 'Тёмная тема');
    themeBtn.title = d ? 'Включить светлую тему' : 'Включить тёмную тему';
  }
  try { var th = localStorage.getItem('expl3-theme'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
  themeBtn.addEventListener('click', function () {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('expl3-theme', root.dataset.theme); } catch (e) { /* ignore */ }
    syncTheme();
  });
  if (mq.addEventListener) mq.addEventListener('change', syncTheme);
  syncTheme();

  // ---------- выезжающее оглавление на узких экранах ----------
  var narrow = matchMedia('(max-width: 960px)');
  function setMenu(open) {
    open = open && narrow.matches;
    side.classList.toggle('open', open);
    scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', function () { setMenu(!side.classList.contains('open')); });
  scrim.addEventListener('click', function () { setMenu(false); });
  $('#searchBtn').addEventListener('click', focusSearch);
  $('#skipBtn').addEventListener('click', function () { main.focus(); });

  buildToc();
  window.addEventListener('hashchange', route);
  route();
})();
