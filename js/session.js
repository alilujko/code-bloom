// Стан входу: клас logged-in на <html> показує .user-only (аватар, «Вийти») і ховає .guest-only.
(function () {
    var nick = null;
    var avatar = null;
    try { nick = localStorage.getItem('nick_name'); avatar = localStorage.getItem('avatar_url'); } catch (e) {}
    if (nick) document.documentElement.classList.add('logged-in');

    // Власне фото в шапці на всіх сторінках (адресу зберігає вхід і сторінка профілю)
    if (nick && avatar) {
        document.addEventListener('DOMContentLoaded', function () {
            Array.prototype.forEach.call(document.querySelectorAll('.avatar_link img'), function (img) {
                img.src = avatar;
                img.classList.add('has_photo');
            });
        });
    }
})();
