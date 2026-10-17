// Реєстрація та вхід через API (server/main.py, MongoDB).
const server_url = "https://codebloom.demerden.cc/api";

(function () {
    var form = document.querySelector('form');
    var btn = form && form.querySelector('.register_button');
    if (!form || !btn) return;

    var isRegister = !!document.getElementById('nickname');
    var errorBox = document.createElement('p');
    errorBox.className = 'form_error';
    errorBox.setAttribute('role', 'alert');
    btn.parentNode.insertBefore(errorBox, btn);

    function showError(text) { errorBox.textContent = text; }

    async function submit() {
        showError('');
        var password = document.getElementById('password').value;
        var url, body;

        if (isRegister) {
            var nick = document.getElementById('nickname').value.trim();
            var email = document.getElementById('email').value.trim();
            if (!nick || !email || !password) return showError('Заповни всі поля');
            url = '/sign_up';
            body = { login: nick, email: email, password: password };
        } else {
            var login = document.getElementById('login').value.trim();
            if (!login || !password) return showError('Заповни всі поля');
            url = '/sign_in';
            body = { login: login, password: password };
        }

        var label = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Зачекай...';
        try {
            var res = await fetch(server_url + url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            var data = await res.json().catch(function () { return {}; });
            if (!res.ok) {
                var d = data.detail;
                return showError(typeof d === 'string' ? d : 'Перевір введені дані');
            }
            try {
                localStorage.setItem('nick_name', data.nick_name);
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('is_admin', data.is_admin ? '1' : '');
                localStorage.setItem('role', data.role || 'user');
                if (data.avatar) localStorage.setItem('avatar_url', server_url + data.avatar);
                else localStorage.removeItem('avatar_url');
            } catch (e) {}
            // Адміністратора одразу ведемо в панель модерації
            location.href = data.is_admin ? 'admin.html' : 'index.html';
        } catch (e) {
            showError('Сервер недоступний. Запусти server/main.py');
        } finally {
            btn.disabled = false;
            btn.textContent = label;
        }
    }

    btn.addEventListener('click', submit);
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
})();
