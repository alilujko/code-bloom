// Адмін-панель: усі дії перевіряються на сервері за токеном (лише акаунт адміністратора).
var $ = function (id) { return document.getElementById(id); };
var errEl = $('adm_error');
var selRoom = null;
var selTopic = null;

function fail(e) { errEl.textContent = e.message; }

function item(title, sub, onClick) {
    var b = document.createElement(onClick ? 'button' : 'div');
    b.className = 'adm_item' + (onClick ? '' : ' plain');
    if (onClick) { b.type = 'button'; b.onclick = onClick; }
    var t = document.createElement('b');
    t.textContent = title;
    b.appendChild(t);
    if (sub) {
        var s = document.createElement('small');
        s.textContent = sub;
        b.appendChild(s);
    }
    return b;
}

function row(main, onDelete, selected) {
    var li = document.createElement('li');
    if (selected) li.className = 'sel';
    li.appendChild(main);
    if (onDelete) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'adm_del';
        d.textContent = 'Видалити';
        d.onclick = onDelete;
        li.appendChild(d);
    }
    return li;
}

function empty(list, text) {
    list.innerHTML = '';
    var li = document.createElement('li');
    li.className = 'adm_empty';
    li.textContent = text;
    list.appendChild(li);
}

// ----- чати -----
async function loadRooms() {
    var rooms = await CB.api('GET', '/rooms');
    var list = $('rooms_list');
    if (selRoom && !rooms.some(function (r) { return r.id === selRoom.id; })) selRoom = null;
    if (!selRoom && rooms.length) selRoom = rooms[0];
    list.innerHTML = '';
    if (!rooms.length) empty(list, 'Чатів немає');
    rooms.forEach(function (r) {
        list.appendChild(row(item(r.icon + '  ' + (r.vip_only ? '🔒 ' : '') + r.name, null, function () { selRoom = r; loadRooms().then(loadMessages).catch(fail); }),
            async function () {
                if (!confirm('Видалити чат «' + r.name + '» разом з усіма повідомленнями?')) return;
                try { await CB.api('DELETE', '/admin/rooms/' + r.id); await loadRooms(); await loadMessages(); } catch (e) { fail(e); }
            }, selRoom && selRoom.id === r.id));
    });
}

async function loadMessages() {
    var list = $('msgs_list');
    $('msgs_title').textContent = selRoom ? 'Повідомлення — ' + selRoom.name : 'Повідомлення';
    if (!selRoom) return empty(list, 'Обери чат');
    var msgs = await CB.api('GET', '/rooms/' + selRoom.id + '/messages');
    list.innerHTML = '';
    if (!msgs.length) empty(list, 'Повідомлень немає');
    msgs.slice().reverse().forEach(function (m) {
        list.appendChild(row(item(m.author + ' · ' + CB.ago(m.ts), m.text), async function () {
            try { await CB.api('DELETE', '/admin/messages/' + m.id); await loadMessages(); } catch (e) { fail(e); }
        }));
    });
}

$('room_form').onsubmit = async function (e) {
    e.preventDefault();
    errEl.textContent = '';
    try {
        var r = await CB.api('POST', '/admin/rooms', { name: $('room_name').value, icon: $('room_icon').value || '#', vip_only: $('room_vip').checked });
        selRoom = r;
        $('room_form').reset();
        await loadRooms();
        await loadMessages();
    } catch (err) { fail(err); }
};

$('msg_form').onsubmit = async function (e) {
    e.preventDefault();
    errEl.textContent = '';
    if (!selRoom || !$('msg_text').value.trim()) return;
    try {
        await CB.api('POST', '/rooms/' + selRoom.id + '/messages', { text: $('msg_text').value });
        $('msg_text').value = '';
        await loadMessages();
    } catch (err) { fail(err); }
};

// ----- форум -----
var topicsCache = [];

async function loadTopics() {
    topicsCache = await CB.api('GET', '/topics');
    if (selTopic && !topicsCache.some(function (t) { return t.id === selTopic; })) selTopic = null;
    if (!selTopic && topicsCache.length) selTopic = topicsCache[0].id;
    var list = $('topics_list');
    list.innerHTML = '';
    if (!topicsCache.length) empty(list, 'Тем немає');
    topicsCache.forEach(function (t) {
        list.appendChild(row(item(t.title, t.author + ' · ' + CB.ago(t.ts) + ' · відповідей: ' + t.posts.length, function () { selTopic = t.id; loadTopics().catch(fail); }),
            async function () {
                if (!confirm('Видалити тему «' + t.title + '» з усіма відповідями?')) return;
                try { await CB.api('DELETE', '/admin/topics/' + t.id); await loadTopics(); } catch (e) { fail(e); }
            }, selTopic === t.id));
    });
    renderPosts();
}

function renderPosts() {
    var list = $('posts_list');
    var t = topicsCache.filter(function (x) { return x.id === selTopic; })[0];
    $('posts_title').textContent = t ? 'Відповіді — ' + t.title : 'Відповіді';
    if (!t) return empty(list, 'Обери тему');
    list.innerHTML = '';
    list.appendChild(row(item(t.author + ' (автор теми)', t.body)));
    t.posts.forEach(function (p) {
        list.appendChild(row(item(p.author + ' · ' + CB.ago(p.ts), p.text), async function () {
            try { await CB.api('DELETE', '/admin/posts/' + p.id); await loadTopics(); } catch (e) { fail(e); }
        }));
    });
}

// ----- користувачі -----
function actBtn(text, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'adm_act';
    b.textContent = text;
    b.onclick = onClick;
    return b;
}

function mutedNow(u) { return u.muted_until && new Date(u.muted_until) > new Date(); }

function userRow(u) {
    var title = u.nick_name;
    var li = document.createElement('li');
    var main = item(title, u.email);
    var t = main.querySelector('b');
    var badge = CB.badge(u.role);
    if (badge) t.insertBefore(badge, t.firstChild);
    if (u.banned) { var s1 = document.createElement('span'); s1.className = 'adm_state'; s1.textContent = 'ЗАБАНЕНО'; t.appendChild(s1); }
    if (mutedNow(u)) { var s2 = document.createElement('span'); s2.className = 'adm_state'; s2.textContent = 'МУТ до ' + new Date(u.muted_until).toLocaleString('uk'); t.appendChild(s2); }
    li.appendChild(main);
    if (u.is_admin) return li;

    var box = document.createElement('div');
    box.className = 'adm_actions';
    async function run(fn) { errEl.textContent = ''; try { await fn(); await loadUsers(); } catch (e) { fail(e); } }
    var name = encodeURIComponent(u.nick_name);

    box.appendChild(actBtn(mutedNow(u) ? 'Зняти мут' : 'Мут', function () {
        if (mutedNow(u)) return run(function () { return CB.api('POST', '/admin/users/' + name + '/mute', { minutes: 0 }); });
        var v = prompt('На скільки хвилин заглушити ' + u.nick_name + '? (60 = година, 1440 = доба)', '60');
        var m = parseInt(v, 10);
        if (!(m > 0)) return;
        run(function () { return CB.api('POST', '/admin/users/' + name + '/mute', { minutes: m }); });
    }));
    box.appendChild(actBtn(u.banned ? 'Розбанити' : 'Бан', function () {
        if (!u.banned && !confirm('Забанити ' + u.nick_name + '? Його одразу викине з акаунта.')) return;
        run(function () { return CB.api('POST', '/admin/users/' + name + '/ban', { banned: !u.banned }); });
    }));
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'adm_del';
    del.textContent = 'Видалити';
    del.onclick = function () {
        if (!confirm('Видалити користувача ' + u.nick_name + '?')) return;
        run(function () { return CB.api('DELETE', '/admin/users/' + name); });
    };
    box.appendChild(del);
    li.appendChild(box);
    return li;
}

async function loadUsers() {
    var users = await CB.api('GET', '/admin/users');
    var list = $('users_list');
    list.innerHTML = '';
    users.forEach(function (u) { list.appendChild(userRow(u)); });
    await loadStaff();
}

async function loadStaff() {
    var staff = await CB.api('GET', '/admin/staff');
    var list = $('staff_list');
    list.innerHTML = '';
    if (!staff.length) empty(list, 'Ролей ще не видано');
    staff.forEach(function (s) {
        var main = item(s.email, s.nick_name ? 'акаунт: ' + s.nick_name : 'ще не зареєстрований');
        var badge = CB.badge(s.role);
        main.querySelector('b').insertBefore(badge, main.querySelector('b').firstChild);
        list.appendChild(row(main, async function () {
            if (!confirm('Забрати роль ' + s.role.toUpperCase() + ' у ' + s.email + '?')) return;
            try { await CB.api('DELETE', '/admin/staff/' + encodeURIComponent(s.email)); await loadUsers(); } catch (e) { fail(e); }
        }));
    });
}

$('staff_form').onsubmit = async function (e) {
    e.preventDefault();
    errEl.textContent = '';
    try {
        await CB.api('POST', '/admin/staff', { email: $('staff_email').value, role: $('staff_role').value });
        $('staff_form').reset();
        await loadUsers();
    } catch (err) { fail(err); }
};

// ----- вкладки -----
var loaders = { chats: function () { return loadRooms().then(loadMessages); }, forum: loadTopics, users: loadUsers };

function openTab(name) {
    errEl.textContent = '';
    Array.prototype.forEach.call(document.querySelectorAll('.adm_tab'), function (b) { b.classList.toggle('active', b.dataset.tab === name); });
    ['chats', 'forum', 'users'].forEach(function (n) { $('pane_' + n).hidden = n !== name; });
    loaders[name]().catch(fail);
}

Array.prototype.forEach.call(document.querySelectorAll('.adm_tab'), function (b) {
    b.onclick = function () { openTab(b.dataset.tab); };
});

// Доступ: сервер перевіряє токен. Немає/недійсний токен — на вхід, не адмін — на головну.
function toLogin() {
    try { localStorage.removeItem('nick_name'); localStorage.removeItem('auth_token'); localStorage.removeItem('is_admin'); } catch (e) {}
    location.replace('login.html');
}

if (!CB.loggedIn()) {
    toLogin();
} else {
    CB.api('GET', '/admin/me').then(function () {
        $('admin').hidden = false;
        openTab('chats');
    }).catch(function (e) {
        if (e.status === 401) return toLogin();
        if (e.status === 403) return location.replace('index.html');
        $('admin').hidden = false;
        fail(e);
    });
}
