// Форум: теми й відповіді зберігаються на сервері (server/main.py).
var cats = [
    { id: 'all', ic: '◎', name: 'Усі теми' },
    { id: 'python', ic: 'Py', name: 'Python' },
    { id: 'js', ic: 'JS', name: 'JavaScript' },
    { id: 'design', ic: '✦', name: 'Дизайн' },
    { id: 'help', ic: '?', name: 'Допомога' },
    { id: 'offtop', ic: '☕', name: 'Офтоп' }
];

var topics = [];

var state = { cat: 'all', sort: 'new', q: '' };
var colors = ['#0a84ff', '#30b0c7', '#bf5af2', '#ff9f0a', '#ff375f', '#32d74b'];

function $(id) { return document.getElementById(id); }
function color(name) { var h = 0; for (var i = 0; i < name.length; i++) h += name.charCodeAt(i); return colors[h % colors.length]; }
function catName(id) { return cats.filter(function (c) { return c.id === id; })[0].name; }

function avatar(name, cls) {
    var a = document.createElement('div');
    a.className = cls || 'avatar';
    a.style.background = color(name);
    a.textContent = name.charAt(0).toUpperCase();
    return a;
}

function renderCats() {
    var box = $('cats_list');
    box.innerHTML = '';
    cats.forEach(function (c) {
        var n = c.id === 'all' ? topics.length : topics.filter(function (t) { return t.cat === c.id; }).length;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cat' + (state.cat === c.id ? ' active' : '');
        b.innerHTML = '<span class="ic"></span><span class="name"></span><span class="count"></span>';
        b.querySelector('.ic').textContent = c.ic;
        b.querySelector('.name').textContent = c.name;
        b.querySelector('.count').textContent = n;
        b.onclick = function () { state.cat = c.id; render(); };
        box.appendChild(b);
    });
}

function visible() {
    var q = state.q.toLowerCase();
    var list = topics.filter(function (t) {
        return (state.cat === 'all' || t.cat === state.cat) &&
            (!q || (t.title + ' ' + t.body + ' ' + t.author).toLowerCase().indexOf(q) !== -1);
    });
    if (state.sort === 'popular') list.sort(function (a, b) { return b.likes - a.likes; });
    else if (state.sort === 'none') list = list.filter(function (t) { return t.posts.length === 0; });
    else list.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
    // Теми VIP-авторів завжди зверху (порядок усередині груп зберігається)
    var vip = list.filter(function (t) { return t.role === 'vip'; });
    return vip.concat(list.filter(function (t) { return t.role !== 'vip'; }));
}

function renderTopics() {
    var box = $('topics');
    var list = visible();
    box.innerHTML = '';
    if (!list.length) {
        box.innerHTML = '<div class="empty">Нічого не знайдено. Створи першу тему!</div>';
        return;
    }
    list.forEach(function (t) {
        var el = document.createElement('div');
        el.className = 'topic' + (t.role === 'vip' ? ' topic_vip' : '');
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.appendChild(avatar(t.author));
        var main = document.createElement('div');
        main.className = 't_main';
        main.innerHTML = '<div class="t_title"></div><div class="t_meta"><span class="tag"></span><span class="who"></span></div>';
        main.querySelector('.t_title').textContent = t.title;
        main.querySelector('.tag').textContent = catName(t.cat);
        var who = main.querySelector('.who');
        var tb = CB.badge(t.role);
        if (tb) who.appendChild(tb);
        who.appendChild(document.createTextNode(t.author + ' · ' + CB.ago(t.ts)));
        el.appendChild(main);
        var st = document.createElement('div');
        st.className = 'stats';
        var like = document.createElement('button');
        like.type = 'button';
        like.className = 'like' + (t.liked ? ' on' : '');
        like.textContent = (t.liked ? '♥ ' : '♡ ') + t.likes;
        like.onclick = function (e) {
            e.stopPropagation();
            t.liked = !t.liked;
            t.likes += t.liked ? 1 : -1;
            renderTopics();
        };
        var rep = document.createElement('span');
        rep.textContent = '💬 ' + t.posts.length;
        var vw = document.createElement('span');
        vw.textContent = '👁 ' + t.views;
        st.appendChild(like); st.appendChild(rep); st.appendChild(vw);
        el.appendChild(st);
        el.onclick = function () { openTopic(t); };
        el.onkeydown = function (e) { if (e.key === 'Enter') openTopic(t); };
        box.appendChild(el);
    });
}

function render() {
    renderCats();
    renderTopics();
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].dataset.sort === state.sort);
    $('board_title').textContent = catName(state.cat);
}

// ----- тема -----
var current = null;

function postEl(p) {
    var d = document.createElement('div');
    d.className = 'post';
    d.appendChild(avatar(p.author));
    var c = document.createElement('div');
    c.innerHTML = '<b></b><small></small><p></p>';
    var nameEl = c.querySelector('b');
    var pb = CB.badge(p.role);
    if (pb) nameEl.appendChild(pb);
    nameEl.appendChild(document.createTextNode(p.author));
    c.querySelector('small').textContent = CB.ago(p.ts);
    c.querySelector('p').textContent = p.text;
    d.appendChild(c);
    return d;
}

function openTopic(t) {
    current = t;
    t.views++;
    $('view_title').textContent = t.title;
    var body = $('view_body');
    body.innerHTML = '';
    body.appendChild(postEl({ author: t.author, ts: t.ts, text: t.body, role: t.role }));
    t.posts.forEach(function (p) { body.appendChild(postEl(p)); });
    $('view').showModal();
    renderTopics();
}

$('reply_form').onsubmit = async function (e) {
    e.preventDefault();
    var inp = $('reply_text');
    var text = inp.value.trim();
    if (!text || !current) return;
    if (!CB.loggedIn()) return alert('Увійди (знову), щоб відповідати');
    try {
        var p = await CB.api('POST', '/topics/' + current.id + '/posts', { text: text });
        current.posts.push(p);
        $('view_body').appendChild(postEl(p));
        $('view_body').scrollTop = $('view_body').scrollHeight;
        inp.value = '';
        render();
    } catch (err) { alert(err.message); }
};

// ----- нова тема -----
$('new_cat').innerHTML = cats.slice(1).map(function (c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');

$('btn_new').onclick = function () {
    if (state.cat !== 'all') $('new_cat').value = state.cat;
    $('new').showModal();
    $('new_title').focus();
};

$('new_form').onsubmit = async function (e) {
    e.preventDefault();
    var title = $('new_title').value.trim();
    if (!title) return;
    if (!CB.loggedIn()) return alert('Увійди (знову), щоб створити тему');
    try {
        var t = await CB.api('POST', '/topics', { cat: $('new_cat').value, title: title, body: $('new_text').value.trim() });
        t.liked = false;
        topics.unshift(t);
        $('new_form').reset();
        $('new').close();
        state.cat = 'all';
        state.sort = 'new';
        render();
    } catch (err) { alert(err.message); }
};

// закриття діалогів
Array.prototype.forEach.call(document.querySelectorAll('dialog'), function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    var x = d.querySelector('.close');
    if (x) x.onclick = function () { d.close(); };
});

Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
    b.onclick = function () { state.sort = b.dataset.sort; render(); };
});

$('filter').oninput = function () { state.q = this.value; renderTopics(); };

var params = new URLSearchParams(location.search);
var urlCat = params.get('cat');
if (urlCat && cats.some(function (c) { return c.id === urlCat; })) state.cat = urlCat;
var q = params.get('q');
if (q) { state.q = q; $('filter').value = q; }

render();

CB.api('GET', '/topics').then(function (list) {
    topics = list.map(function (t) { t.liked = false; return t; });
    render();
}).catch(function (e) {
    $('topics').innerHTML = '<div class="empty"></div>';
    $('topics').firstChild.textContent = e.message;
});
