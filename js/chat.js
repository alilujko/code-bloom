// Чат: кімнати й повідомлення зберігаються на сервері (server/main.py).
// Правий клік (або довге натискання на телефоні) по повідомленню відкриває меню:
// відповісти, копіювати, а для своїх — редагувати й видалити.
var rooms = [];
var current = null;
var shown = '';
var roomsEl = document.getElementById('rooms');
var msgsEl = document.getElementById('messages');
var form = document.getElementById('composer');
var input = form.querySelector('input');
var statusEl = document.getElementById('head_status');

var replyTo = null;   // { id, author, text } — на що відповідаємо
var editing = null;   // { id } — яке своє повідомлення редагуємо
var menuEl = null;    // відкрите контекстне меню

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

function timeOf(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

// ---------- Повідомлення ----------
function addBubble(m) {
    var mine = m.author === CB.nick();
    var d = document.createElement('div');
    d.className = 'bubble bubble_' + (mine ? 'out' : 'in');
    d.dataset.id = m.id;

    var badge = CB.badge(m.role);
    if (!mine || badge) {
        var a = document.createElement('b');
        a.className = 'b_author';
        if (badge) a.appendChild(badge);
        if (!mine) a.appendChild(document.createTextNode(m.author));
        d.appendChild(a);
    }

    if (m.reply) {
        var q = document.createElement('div');
        q.className = 'b_reply';
        if (m.reply.deleted) {
            q.classList.add('gone');
            q.textContent = 'Повідомлення видалено';
        } else {
            var qa = document.createElement('b');
            qa.textContent = m.reply.author;
            var qt = document.createElement('span');
            qt.textContent = m.reply.text;
            q.appendChild(qa);
            q.appendChild(qt);
            q.title = 'Перейти до повідомлення';
            q.addEventListener('click', function () { jumpTo(m.reply.id); });
        }
        d.appendChild(q);
    }

    var t = document.createElement('span');
    t.className = 'b_text';
    t.textContent = m.text;
    d.appendChild(t);

    var meta = document.createElement('span');
    meta.className = 'b_meta';
    meta.textContent = (m.edited ? 'змінено · ' : '') + timeOf(m.ts);
    d.appendChild(meta);

    // Комп'ютер: правий клік. Телефон: довге натискання.
    d.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        openMenu(m, d);
    });
    var pressTimer = null;
    function cancelPress() { clearTimeout(pressTimer); pressTimer = null; }
    d.addEventListener('touchstart', function () {
        cancelPress();
        pressTimer = setTimeout(function () {
            pressTimer = null;
            if (navigator.vibrate) navigator.vibrate(10);
            openMenu(m, d);
        }, 450);
    }, { passive: true });
    d.addEventListener('touchend', cancelPress, { passive: true });
    d.addEventListener('touchmove', cancelPress, { passive: true });
    d.addEventListener('touchcancel', cancelPress, { passive: true });

    msgsEl.appendChild(d);
}

function jumpTo(id) {
    var el = msgsEl.querySelector('.bubble[data-id="' + id + '"]');
    if (!el) { statusEl.textContent = 'Це повідомлення вже далеко в історії'; return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('flash');
    void el.offsetWidth; // перезапуск анімації
    el.classList.add('flash');
}

// keepScroll: після редагування/видалення лишаємось на тому ж місці
async function loadMessages(force, keepScroll) {
    if (!current) return;
    if (menuEl && !force) return; // не перемальовуємо під відкритим меню
    var id = current.id;
    try {
        var list = await CB.api('GET', '/rooms/' + id + '/messages');
        if (!current || current.id !== id) return;
        var sig = id + ':' + list.map(function (m) { return m.id + (m.edited || ''); }).join();
        if (sig === shown && !force) return;
        var nearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 80;
        var prevTop = msgsEl.scrollTop;
        shown = sig;
        closeMenu();
        msgsEl.innerHTML = '<div class="chat_day">Історія чату</div>';
        list.forEach(addBubble);
        // Вниз — при відкритті, після відправки або якщо людина й так була внизу;
        // якщо гортала історію — не смикаємо
        if (!keepScroll && (force || nearBottom)) msgsEl.scrollTop = msgsEl.scrollHeight;
        else msgsEl.scrollTop = prevTop;
        statusEl.textContent = list.length + ' повідомлень';
    } catch (e) {
        statusEl.textContent = e.message;
    }
}

function openRoom(room) {
    current = room;
    clearCompose();
    document.getElementById('head_icon').textContent = room.icon;
    document.getElementById('head_title').textContent = room.name;
    statusEl.textContent = 'Завантаження…';
    msgsEl.innerHTML = '';
    renderRooms();
    loadMessages(true);
    input.focus();
}

// ---------- Контекстне меню ----------
var openedAt = 0;

function openMenu(m, bubble) {
    closeMenu();
    var mine = m.author === CB.nick();
    var items = [];
    if (CB.loggedIn()) items.push(['↩', 'Відповісти', function () { startReply(m); }]);
    items.push(['⧉', 'Копіювати текст', function () { copyText(m.text); }]);
    if (mine) items.push(['✎', 'Редагувати', function () { startEdit(m); }]);
    if (CB.loggedIn() && (mine || CB.role() === 'admin')) items.push(['🗑', 'Видалити', function () { removeMessage(m); }, 'danger']);

    menuEl = document.createElement('div');
    menuEl.className = 'ctx_menu';
    menuEl.setAttribute('role', 'menu');
    items.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'menuitem');
        if (it[3]) b.className = it[3];
        b.innerHTML = '<span class="ctx_ic" aria-hidden="true"></span><span></span>';
        b.firstChild.textContent = it[0];
        b.lastChild.textContent = it[1];
        b.addEventListener('click', function () { closeMenu(); it[2](); });
        menuEl.appendChild(b);
    });
    msgsEl.appendChild(menuEl);
    bubble.classList.add('picked');
    menuEl._bubble = bubble;
    menuEl._mine = mine;
    placeMenu();
    openedAt = Date.now();
    menuEl.querySelector('button').focus({ preventScroll: true });
}

// Позиція: під повідомленням (або над ним, якщо внизу не влазить), з його боку
function placeMenu() {
    var bubble = menuEl._bubble;
    var w = menuEl.offsetWidth;
    var h = menuEl.offsetHeight;
    var top = bubble.offsetTop + bubble.offsetHeight + 6;
    if (top + h > msgsEl.scrollTop + msgsEl.clientHeight - 6) top = Math.max(bubble.offsetTop - h - 6, msgsEl.scrollTop + 6);
    var left = menuEl._mine ? bubble.offsetLeft + bubble.offsetWidth - w : bubble.offsetLeft;
    left = Math.max(8, Math.min(left, msgsEl.clientWidth - w - 8));
    menuEl.style.top = top + 'px';
    menuEl.style.left = left + 'px';
}

function closeMenu() {
    if (!menuEl) return;
    if (menuEl._bubble) menuEl._bubble.classList.remove('picked');
    menuEl.remove();
    menuEl = null;
}

document.addEventListener('click', function (e) {
    if (!menuEl || menuEl.contains(e.target)) return;
    if (Date.now() - openedAt < 400) return; // відпускання пальця після довгого натискання
    closeMenu();
});
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (menuEl) { closeMenu(); return; }
    if (replyTo || editing) clearCompose();
});
// На телефоні resize буває від клавіатури чи адресного рядка — меню не закриваємо, а переставляємо
window.addEventListener('resize', function () { if (menuEl) placeMenu(); });

function copyText(text) {
    function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
    statusEl.textContent = 'Текст скопійовано';
}

async function removeMessage(m) {
    if (!confirm('Видалити це повідомлення?')) return;
    try {
        await CB.api('DELETE', '/messages/' + m.id);
        if ((replyTo && replyTo.id === m.id) || (editing && editing.id === m.id)) clearCompose();
        await loadMessages(true, true);
        refreshRooms();
    } catch (e) {
        statusEl.textContent = e.message;
    }
}

// ---------- Панель над полем вводу: відповідь / редагування ----------
var bar = document.createElement('div');
bar.className = 'compose_bar';
bar.hidden = true;
bar.innerHTML = '<span class="cb_ic" aria-hidden="true"></span>' +
    '<div class="cb_body"><b></b><span></span></div>' +
    '<button type="button" aria-label="Скасувати">✕</button>';
form.parentNode.insertBefore(bar, form);
bar.querySelector('button').addEventListener('click', clearCompose);

function showBar(icon, title, text) {
    bar.querySelector('.cb_ic').textContent = icon;
    bar.querySelector('b').textContent = title;
    bar.querySelector('.cb_body span').textContent = text;
    bar.hidden = false;
}

function startReply(m) {
    if (editing) input.value = '';
    editing = null;
    replyTo = { id: m.id, author: m.author, text: m.text };
    showBar('↩', 'Відповідь для ' + m.author, m.text);
    input.focus();
}

function startEdit(m) {
    replyTo = null;
    editing = { id: m.id };
    showBar('✎', 'Редагування', m.text);
    input.value = m.text;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

function clearCompose() {
    if (editing) input.value = '';
    replyTo = null;
    editing = null;
    bar.hidden = true;
}

form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || !current) return;
    if (!CB.loggedIn()) { statusEl.textContent = 'Увійди (знову), щоб писати в чат'; return; }
    var wasEditing = editing;
    var reply = replyTo;
    input.value = '';
    try {
        if (wasEditing) {
            await CB.api('PATCH', '/messages/' + wasEditing.id, { text: text });
        } else {
            await CB.api('POST', '/rooms/' + current.id + '/messages', { text: text, reply_to: reply ? reply.id : null });
        }
        replyTo = null;
        editing = null;
        bar.hidden = true;
        await loadMessages(true, !!wasEditing);
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
