document.addEventListener('DOMContentLoaded', () => {
    const mainMenu = document.getElementById('main-menu');
    const gameContainer = document.getElementById('game-container');

    // Кнопка PLAY
    document.getElementById('btn-play').addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gameContainer.style.display = 'block';
        console.log("Domain Expansion... Запуск 3D мира!");
        // Позже здесь мы вызовем функцию инициализации 3D
    });

    // Остальные кнопки (пока просто выводят текст)
    document.getElementById('btn-clans').addEventListener('click', () => {
        alert("Меню кланов: Зенин, Годжо, Камо...");
    });

    document.getElementById('btn-customize').addEventListener('click', () => {
        alert("Настройка скина (Выбор одежды мага)");
    });

    document.getElementById('btn-afk').addEventListener('click', () => {
        alert("AFK Режим активирован: Фарм проклятой энергии...");
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        alert("Настройки игры");
    });
});