// Чат: кімнати й повідомлення зберігаються на сервері (server/main.py).
var rooms = [];
var current = null;
var shown = '';
var roomsEl = document.getElementById('rooms');
var msgsEl = document.getElementById('messages');
var form = document.getElementById('composer');
var input = form.querySelector('input');
var statusEl = document.getElementById('head_status');

function lastText(room) {
    if (!room.last) return '';
    return (room.last.author === CB.nick() ? 'Ви: ' : room.last.author + ': ') + room.last.text;
}

function renderRooms() {
    roomsEl.innerHTML = '';
    rooms.forEach(function (room) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'room' + (current && room.id === current.id ? ' active' : '');
        b.innerHTML =
            '<span class="room_icon"></span>' +
            '<span class="room_text"><span class="room_name"></span><span class="room_last"></span></span>';
        b.querySelector('.room_icon').textContent = room.icon;
        b.querySelector('.room_name').textContent = (room.vip_only ? '🔒 ' : '') + room.name;
        b.querySelector('.room_last').textContent = lastText(room);
        b.addEventListener('click', function () { openRoom(room); });
        roomsEl.appendChild(b);
    });
}

function addBubble(m) {
    var mine = m.author === CB.nick();
    var d = document.createElement('div');
    d.className = 'bubble bubble_' + (mine ? 'out' : 'in');
    var badge = CB.badge(m.role);
    if (!mine || badge) {
        var a = document.createElement('b');
        a.className = 'b_author';
        if (badge) a.appendChild(badge);
        if (!mine) a.appendChild(document.createTextNode(m.author));
        d.appendChild(a);
    }
    d.appendChild(document.createTextNode(m.text));
    msgsEl.appendChild(d);
}

async function loadMessages(force) {
    if (!current) return;
    var id = current.id;
    try {
        var list = await CB.api('GET', '/rooms/' + id + '/messages');
        if (!current || current.id !== id) return;
        var sig = id + ':' + list.map(function (m) { return m.id; }).join();
        if (sig === shown && !force) return;
        shown = sig;
        msgsEl.innerHTML = '<div class="chat_day">Історія чату</div>';
        list.forEach(addBubble);
        msgsEl.scrollTop = msgsEl.scrollHeight;
        statusEl.textContent = list.length + ' повідомлень';
    } catch (e) {
        statusEl.textContent = e.message;
    }
}

function openRoom(room) {
    current = room;
    document.getElementById('head_icon').textContent = room.icon;
    document.getElementById('head_title').textContent = room.name;
    statusEl.textContent = 'Завантаження…';
    msgsEl.innerHTML = '';
    renderRooms();
    loadMessages(true);
    input.focus();
}

form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || !current) return;
    if (!CB.loggedIn()) { statusEl.textContent = 'Увійди (знову), щоб писати в чат'; return; }
    input.value = '';
    try {
        await CB.api('POST', '/rooms/' + current.id + '/messages', { text: text });
        await loadMessages(true);
        refreshRooms();
    } catch (err) {
        input.value = text;
        statusEl.textContent = err.message;
    }
});

async function refreshRooms() {
    try {
        rooms = await CB.api('GET', '/rooms');
        if (current && !rooms.some(function (r) { return r.id === current.id; })) current = null;
        if (!current && rooms.length) return openRoom(rooms[0]);
        if (current) current = rooms.filter(function (r) { return r.id === current.id; })[0];
        renderRooms();
        if (!rooms.length) {
            msgsEl.innerHTML = '<div class="chat_day">Чатів поки немає</div>';
            statusEl.textContent = '';
        }
    } catch (e) {
        statusEl.textContent = e.message;
    }
}

// Опитування сервера: наступний запит іде лише після відповіді на попередній (без черги),
// список кімнат оновлюється рідше, а у фоновій вкладці опитування зупиняється.
var tick = 0;
async function poll() {
    if (!document.hidden) {
        await loadMessages(false);
        if (++tick % 3 === 0) await refreshRooms();
    }
    setTimeout(poll, 4000);
}
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) loadMessages(false);
});
refreshRooms().then(function () { setTimeout(poll, 4000); });
