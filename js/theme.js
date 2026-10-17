// Перемикач теми: зберігає вибір у localStorage, за замовчуванням темна.
(function () {
    var KEY = 'theme-preference';
    var root = document.documentElement;

    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        var btn = document.querySelector('.theme_switch');
        if (btn) {
            btn.textContent = theme === 'light' ? '☀️' : '🌙';
            btn.setAttribute('aria-label', theme === 'light' ? 'Увімкнути темну тему' : 'Увімкнути світлу тему');
            btn.title = btn.getAttribute('aria-label');
        }
    }

    apply(stored() === 'light' ? 'light' : 'dark');

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.querySelector('.theme_switch');
        apply(root.getAttribute('data-theme'));
        if (!btn) return;
        btn.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            apply(next);
            try { localStorage.setItem(KEY, next); } catch (e) {}
        });
    });
})();

// Пошук у хедері: Enter веде на форум з пошуковим запитом.
document.addEventListener('DOMContentLoaded', function () {
    var inp = document.querySelector('.header .search_input');
    if (!inp) return;
    var q = new URLSearchParams(location.search).get('q');
    if (q && /forum\.html$/.test(location.pathname)) inp.value = q;
    inp.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var v = inp.value.trim();
        location.href = 'forum.html' + (v ? '?q=' + encodeURIComponent(v) : '');
    });
});

// Після входу показуємо нікнейм на аватарі в хедері.
document.addEventListener('DOMContentLoaded', function () {
    var nick = null;
    try { nick = localStorage.getItem('nick_name'); } catch (e) {}
    var img = document.querySelector('.header .avatar_link img');
    if (nick && img) { img.title = nick; img.alt = nick; }
});


// Стан «увійшов»: ховаємо кнопки входу/реєстрації (.guest-only), показуємо .user-only.
(function () {
    var nick = null;
    try { nick = localStorage.getItem('nick_name'); } catch (e) {}
    if (!nick) return;

    document.documentElement.classList.add('logged-in');

    // Увійшов — сторінки входу й реєстрації вже не потрібні
    if (/(login|register)\.html$/.test(location.pathname)) {
        location.replace('index.html');
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        Array.prototype.forEach.call(document.querySelectorAll('.js-nick'), function (el) {
            el.textContent = nick;
        });
        Array.prototype.forEach.call(document.querySelectorAll('.js-logout'), function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                try {
                    ['nick_name', 'auth_token', 'is_admin', 'role', 'avatar_url'].forEach(function (k) { localStorage.removeItem(k); });
                } catch (err) {}
                location.href = 'index.html';
            });
        });
    });
})();
