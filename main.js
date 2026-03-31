document.addEventListener('DOMContentLoaded', () => {
    const mainMenu = document.getElementById('main-menu');
    const gameContainer = document.getElementById('game-container');

    // Кнопки меню
    document.getElementById('btn-play').addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gameContainer.style.display = 'block';
        init3DScene(); // Запускаем 3D
    });

    document.getElementById('btn-clans').addEventListener('click', () => alert("Меню кланов"));
    document.getElementById('btn-customize').addEventListener('click', () => alert("Настройка скина"));
    document.getElementById('btn-afk').addEventListener('click', () => alert("AFK Режим"));
    document.getElementById('btn-settings').addEventListener('click', () => alert("Настройки"));
});

// === 3D ДВИЖОК И КАТСЦЕНА ===
let scene, camera, renderer;
let angle = 0; // Для вращения камеры

function init3DScene() {
    // 1. Создаем сцену
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); // Темный фон
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 50); // Туман для атмосферы

    // 2. Создаем камеру
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);

    // 3. Создаем рендер (отрисовщик)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // 4. Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 5. Земля (Территория)
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 6. Создаем персонажей
    const gojo = createGojo();
    gojo.position.set(-3, 0, 0);
    gojo.rotation.y = Math.PI / 2; // Поворачиваем к Сукуне
    scene.add(gojo);

    const sukuna = createSukuna();
    sukuna.position.set(3, 0, 0);
    sukuna.rotation.y = -Math.PI / 2; // Поворачиваем к Годжо
    scene.add(sukuna);

    // Запускаем анимацию катсцены
    animate();
}

// Функция создания блока (части тела)
function createPart(w, h, d, color, x, y, z) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

// === СОЗДАНИЕ САтору ГОДЖО ===
function createGojo() {
    const group = new THREE.Group();
    const skin = 0xffe0bd, black = 0x111111, white = 0xffffff, blue = 0x0000ff;

    // Ноги (Белые)
    group.add(createPart(1, 3, 1, white, -0.6, 1.5, 0)); // Левая
    group.add(createPart(1, 3, 1, white, 0.6, 1.5, 0));  // Правая

    // Торс (Черный)
    group.add(createPart(2.2, 3, 1.2, black, 0, 4.5, 0));

    // Руки (Цвет кожи)
    group.add(createPart(0.8, 3, 0.8, skin, -1.6, 4.5, 0)); // Левая
    group.add(createPart(0.8, 3, 0.8, skin, 1.6, 4.5, 0));  // Правая

    // Голова (Цвет кожи)
    const head = createPart(2, 2, 2, skin, 0, 7, 0);
    // Глаза (Синие)
    head.add(createPart(0.4, 0.2, 0.1, blue, -0.4, 0.2, 1.05));
    head.add(createPart(0.4, 0.2, 0.1, blue, 0.4, 0.2, 1.05));
    // Улыбка
    head.add(createPart(0.8, 0.1, 0.1, black, 0, -0.4, 1.05));
    group.add(head);

    // Волосы (Белые)
    group.add(createPart(2.2, 0.5, 2.2, white, 0, 8.2, 0));

    return group;
}

// === СОЗДАНИЕ СУКУНЫ (4 РУКИ) ===
function createSukuna() {
    const group = new THREE.Group();
    const skin = 0xffe0bd, white = 0xffffff, red = 0xff0000, tattoo = 0x330000;

    // Ноги (Белые)
    group.add(createPart(1, 3, 1, white, -0.6, 1.5, 0));
    group.add(createPart(1, 3, 1, white, 0.6, 1.5, 0));

    // Торс (Белый)
    const torso = createPart(2.4, 3, 1.2, white, 0, 4.5, 0);
    // Имитация тату на груди
    torso.add(createPart(1.5, 0.2, 0.1, tattoo, 0, 0.5, 0.65));
    group.add(torso);

    // Руки ОСНОВНЫЕ (Татуированные - добавим полоски цвета тату)
    const armL1 = createPart(0.8, 3, 0.8, skin, -1.7, 4.5, 0);
    armL1.add(createPart(0.9, 0.2, 0.9, tattoo, 0, 0, 0)); // Тату-полоска
    group.add(armL1);

    const armR1 = createPart(0.8, 3, 0.8, skin, 1.7, 4.5, 0);
    armR1.add(createPart(0.9, 0.2, 0.9, tattoo, 0, 0, 0));
    group.add(armR1);

    // Руки ДОПОЛНИТЕЛЬНЫЕ (Чуть ниже и сзади)
    const armL2 = createPart(0.8, 3, 0.8, skin, -2.0, 3.5, -0.5);
    armL2.rotation.z = Math.PI / 8; // Слегка раздвинуты
    armL2.add(createPart(0.9, 0.2, 0.9, tattoo, 0, -0.5, 0));
    group.add(armL2);

    const armR2 = createPart(0.8, 3, 0.8, skin, 2.0, 3.5, -0.5);
    armR2.rotation.z = -Math.PI / 8;
    armR2.add(createPart(0.9, 0.2, 0.9, tattoo, 0, -0.5, 0));
    group.add(armR2);

    // Голова (Татуированная)
    const head = createPart(2, 2, 2, skin, 0, 7, 0);
    // Тату на лице
    head.add(createPart(2.1, 0.2, 2.1, tattoo, 0, 0.5, 0)); 
    // Глаза (Красные)
    head.add(createPart(0.4, 0.2, 0.1, red, -0.4, 0.2, 1.05));
    head.add(createPart(0.4, 0.2, 0.1, red, 0.4, 0.2, 1.05));
    // Доп. глаза (Ниже)
    head.add(createPart(0.2, 0.1, 0.1, red, -0.5, -0.1, 1.05));
    head.add(createPart(0.2, 0.1, 0.1, red, 0.5, -0.1, 1.05));
    // Улыбка
    head.add(createPart(1, 0.1, 0.1, black = 0x000000, 0, -0.5, 1.05));
    group.add(head);

    // Волосы (Красные)
    group.add(createPart(2.2, 0.6, 2.2, red, 0, 8.2, 0));

    return group;
}

// Цикл анимации (Катсцена)
function animate() {
    requestAnimationFrame(animate);

    // Камера медленно вращается вокруг персонажей
    angle += 0.005;
    camera.position.x = Math.sin(angle) * 15;
    camera.position.z = Math.cos(angle) * 15;
    camera.lookAt(0, 4, 0); // Смотрим в центр между ними

    renderer.render(scene, camera);
}

// Адаптация под размер экрана мобильного
window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});