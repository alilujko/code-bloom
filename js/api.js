// Спільний клієнт API (server/main.py на Vercel). Токен сесії лежить у localStorage.
var CB = (function () {
    var SERVER = 'https://code-bloom-server.vercel.app';

    function get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

    async function api(method, path, body) {
        var headers = { 'Content-Type': 'application/json' };
        var token = get('auth_token');
        if (token) headers.Authorization = 'Bearer ' + token;
        var res;
        try {
            res = await fetch(SERVER + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
        } catch (e) {
            throw new Error('Сервер недоступний. Перевір https://code-bloom-server.vercel.app/');
        }
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
            var d = data.detail;
            var err = new Error(typeof d === 'string' ? d : 'Помилка запиту');
            err.status = res.status;
            throw err;
        }
        return data;
    }

    function ago(iso) {
        var s = (Date.now() - new Date(iso).getTime()) / 1000;
        if (!(s >= 0)) return 'щойно';
        if (s < 60) return 'щойно';
        if (s < 3600) return Math.floor(s / 60) + ' хв тому';
        if (s < 86400) return Math.floor(s / 3600) + ' год тому';
        var d = Math.floor(s / 86400);
        return d === 1 ? 'вчора' : d + ' дн тому';
    }

    // Префікс ролі перед ніком: ADMIN або VIP (звичайному користувачу — нічого)
    function badge(role) {
        if (role !== 'admin' && role !== 'vip') return null;
        var b = document.createElement('span');
        b.className = 'role_badge role_' + role;
        b.textContent = role === 'admin' ? 'ADMIN' : 'VIP';
        return b;
    }

    // Повна адреса фото: сервер повертає шлях на кшталт /avatar/nick?v=123
    function avatarUrl(path) { return path ? SERVER + path : '../images/images.png'; }

    // Оновлює збережені дані після входу чи редагування профілю
    function remember(u) {
        try {
            localStorage.setItem('nick_name', u.nick_name);
            if (u.role) localStorage.setItem('role', u.role);
            localStorage.setItem('is_admin', u.is_admin ? '1' : '');
            if (u.avatar) localStorage.setItem('avatar_url', SERVER + u.avatar);
            else localStorage.removeItem('avatar_url');
        } catch (e) {}
    }

    return {
        SERVER: SERVER,
        api: api,
        ago: ago,
        badge: badge,
        avatarUrl: avatarUrl,
        remember: remember,
        role: function () { return get('role') || 'user'; },
        nick: function () { return get('nick_name'); },
        loggedIn: function () { return !!(get('nick_name') && get('auth_token')); }
    };
})();
