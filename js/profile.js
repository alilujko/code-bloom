// Сторінка профілю: дані з сервера, зміна нікнейма та фото (server/main.py).
document.addEventListener('DOMContentLoaded', function () {
    if (!CB.loggedIn()) return; // гостю CSS показує блок «Ти не ввійшов»

    function $(id) { return document.getElementById(id); }
    var msg = $('p_msg');

    function say(text, bad) {
        msg.textContent = text || '';
        msg.classList.toggle('bad', !!bad);
    }

    function forget() {
        try {
            ['nick_name', 'auth_token', 'is_admin', 'role', 'avatar_url'].forEach(function (k) { localStorage.removeItem(k); });
        } catch (e) {}
    }

    function render(u) {
        CB.remember(u);
        $('p_nick').textContent = u.nick_name;
        $('p_nick2').textContent = u.nick_name;
        var badgeBox = $('p_badge');
        badgeBox.innerHTML = '';
        var b = CB.badge(u.role);
        if (b) badgeBox.appendChild(b);
        $('p_email').textContent = u.email;
        $('p_date').textContent = u.created_at
            ? new Date(u.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'невідомо';
        $('p_status').textContent = u.role === 'admin' ? 'Адміністратор'
            : u.role === 'vip' ? 'VIP-учасник Code Bloom' : 'Учасник Code Bloom';
        $('p_admin').hidden = !u.is_admin;

        var src = CB.avatarUrl(u.avatar);
        $('p_avatar').src = src;
        Array.prototype.forEach.call(document.querySelectorAll('.avatar_link img'), function (img) { img.src = src; });
        $('p_avatar_remove').hidden = !u.avatar;
    }

    // Поки вантажиться — хоча б збережений нікнейм
    $('p_nick').textContent = CB.nick();
    $('p_nick2').textContent = CB.nick();

    CB.api('GET', '/me').then(render).catch(function (e) {
        if (e.status === 401) { forget(); location.href = 'login.html'; return; }
        if (e.status === 403) forget(); // акаунт заблоковано
        $('p_status').textContent = e.message;
    });

    // ----- нікнейм -----
    var form = $('nick_form');
    var input = $('nick_input');

    $('p_nick_edit').onclick = function () {
        input.value = CB.nick() || '';
        form.hidden = false;
        say('');
        input.focus();
        input.select();
    };
    $('nick_cancel').onclick = function () { form.hidden = true; say(''); };

    form.onsubmit = async function (e) {
        e.preventDefault();
        var value = input.value.trim();
        if (!value) return;
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            render(await CB.api('PATCH', '/me', { nick_name: value }));
            form.hidden = true;
            say('Нікнейм змінено');
        } catch (err) {
            say(err.message, true);
        } finally {
            btn.disabled = false;
        }
    };

    // ----- фото -----
    var file = $('p_avatar_file');

    // Квадрат по центру, стиснутий до JPEG: так фото важить ~20–40 КБ
    function squareJpeg(f, size) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(f);
            var img = new Image();
            img.onload = function () {
                var side = Math.min(img.naturalWidth, img.naturalHeight);
                var c = document.createElement('canvas');
                c.width = c.height = size;
                var ctx = c.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
                URL.revokeObjectURL(url);
                resolve(c.toDataURL('image/jpeg', 0.86));
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('Не вдалося відкрити це зображення. Спробуй JPG або PNG'));
            };
            img.src = url;
        });
    }

    $('p_avatar_btn').onclick = function () { file.click(); };

    file.onchange = async function () {
        var f = file.files[0];
        file.value = '';
        if (!f) return;
        if (f.type && f.type.indexOf('image/') !== 0) return say('Обери файл зображення', true);
        if (f.size > 20 * 1024 * 1024) return say('Файл завеликий: максимум 20 МБ', true);
        say('Завантажую фото…');
        try {
            var data = await squareJpeg(f, 320);
            render(await CB.api('PUT', '/me/avatar', { image: data }));
            say('Фото оновлено');
        } catch (err) {
            say(err.message, true);
        }
    };

    $('p_avatar_remove').onclick = async function () {
        if (!confirm('Прибрати фото профілю?')) return;
        try {
            render(await CB.api('DELETE', '/me/avatar'));
            say('Фото прибрано');
        } catch (err) {
            say(err.message, true);
        }
    };
});
