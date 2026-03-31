document.addEventListener('DOMContentLoaded', () => {
    const mainMenu = document.getElementById('main-menu');
    const gameContainer = document.getElementById('game-container');

    document.getElementById('btn-play').addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gameContainer.style.display = 'block';
        init3DScene();
    });

    document.getElementById('btn-clans').addEventListener('click', () => alert("Меню кланов"));
    document.getElementById('btn-customize').addEventListener('click', () => alert("Настройка скина"));
    document.getElementById('btn-afk').addEventListener('click', () => alert("AFK Режим"));
    document.getElementById('btn-settings').addEventListener('click', () => alert("Настройки"));
});

// === 3D ДВИЖОК ===
let scene, camera, renderer;
let angle = 0;

function init3DScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Персонажи
    const gojo = createGojo();
    gojo.position.set(-3.5, 0, 0);
    gojo.rotation.y = Math.PI / 2;
    scene.add(gojo);

    const sukuna = createSukuna();
    sukuna.position.set(3.5, 0, 0);
    sukuna.rotation.y = -Math.PI / 2;
    scene.add(sukuna);

    animate();
}

// === НОВЫЕ РЕАЛИСТИЧНЫЕ ГЕНЕРАТОРЫ ФОРМ ===

// Цилиндр (для рук, ног и туловища)
function createCylinder(radius, height, color, x, y, z) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 32);
    const mat = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

// Сфера (для головы)
function createSphere(radius, color, x, y, z) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

// Обычный блок (для мелких деталей лица)
function createPart(w, h, d, color, x, y, z) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

// Генератор реалистичных аниме-волос (пряди-конусы)
function createAnimeHair(color, yOffset) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color });

    // Базовый "шлем" из волос
    const baseGeo = new THREE.SphereGeometry(1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = 0.2;
    group.add(base);

    // 35 конусов, торчащих в разные стороны для эффекта "ежика"
    for(let i = 0; i < 35; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.25, 1.2, 8);
        const spike = new THREE.Mesh(spikeGeo, mat);
        
        // Распределяем по верхней полусфере
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI / 2.2; 

        spike.position.set(
            1.0 * Math.sin(phi) * Math.cos(theta),
            1.0 * Math.cos(phi) + 0.2,
            1.0 * Math.sin(phi) * Math.sin(theta)
        );
        
        // Направляем острием наружу
        spike.lookAt(
            2.0 * Math.sin(phi) * Math.cos(theta),
            2.0 * Math.cos(phi) + 0.2,
            2.0 * Math.sin(phi) * Math.sin(theta)
        );
        spike.rotateX(Math.PI / 2); // Поворачиваем конус острием по направлению lookAt

        group.add(spike);
    }
    
    group.position.y = yOffset;
    return group;
}

// Кольцо для татуировок на руках (облегает цилиндр)
function createTattooRing(radius, color, yOffset) {
    const geo = new THREE.TorusGeometry(radius, 0.05, 8, 24);
    const mat = new THREE.MeshStandardMaterial({ color: color });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yOffset;
    return ring;
}

// === САТору ГОДЖО ===
function createGojo() {
    const group = new THREE.Group();
    const skin = 0xffe0bd, black = 0x111111, white = 0xffffff, blue = 0x00aaff;

    // Ноги круглые (Цилиндры)
    group.add(createCylinder(0.4, 3, white, -0.6, 1.5, 0));
    group.add(createCylinder(0.4, 3, white, 0.6, 1.5, 0));

    // Торс круглый
    group.add(createCylinder(1.1, 3, black, 0, 4.5, 0));

    // Руки круглые
    group.add(createCylinder(0.35, 3, skin, -1.6, 4.5, 0));
    group.add(createCylinder(0.35, 3, skin, 1.6, 4.5, 0));

    // Голова круглая (Сфера)
    const head = createSphere(1, skin, 0, 7, 0);
    
    // Лицо (выдвинуто вперед по Z, чтобы не проваливалось в сферу)
    head.add(createPart(0.3, 0.15, 0.1, blue, -0.35, 0.1, 0.95)); // Левый глаз
    head.add(createPart(0.3, 0.15, 0.1, blue, 0.35, 0.1, 0.95));  // Правый глаз
    head.add(createPart(0.5, 0.05, 0.1, black, 0, -0.3, 0.95));   // Улыбка
    group.add(head);

    // Реалистичные белые волосы
    head.add(createAnimeHair(white, 0));

    return group;
}

// === СУКУНА ===
function createSukuna() {
    const group = new THREE.Group();
    const skin = 0xffe0bd, white = 0xffffff, red = 0xff0000, tattoo = 0x330000, black = 0x000000;

    // Ноги круглые
    group.add(createCylinder(0.4, 3, white, -0.6, 1.5, 0));
    group.add(createCylinder(0.4, 3, white, 0.6, 1.5, 0));

    // Торс круглый
    const torso = createCylinder(1.1, 3, white, 0, 4.5, 0);
    torso.add(createPart(1.0, 0.2, 0.1, tattoo, 0, 0.5, 1.05)); // Тату на груди
    group.add(torso);

    // ОСНОВНЫЕ РУКИ (С кольцевыми тату)
    const armL1 = createCylinder(0.35, 3, skin, -1.6, 4.5, 0);
    armL1.add(createTattooRing(0.35, tattoo, 0.5));
    armL1.add(createTattooRing(0.35, tattoo, -0.5));
    group.add(armL1);

    const armR1 = createCylinder(0.35, 3, skin, 1.6, 4.5, 0);
    armR1.add(createTattooRing(0.35, tattoo, 0.5));
    armR1.add(createTattooRing(0.35, tattoo, -0.5));
    group.add(armR1);

    // ДОПОЛНИТЕЛЬНЫЕ РУКИ (Чуть сзади и под углом)
    const armL2 = createCylinder(0.35, 3, skin, -2.0, 3.5, -0.6);
    armL2.rotation.z = Math.PI / 8;
    armL2.add(createTattooRing(0.35, tattoo, 0));
    group.add(armL2);

    const armR2 = createCylinder(0.35, 3, skin, 2.0, 3.5, -0.6);
    armR2.rotation.z = -Math.PI / 8;
    armR2.add(createTattooRing(0.35, tattoo, 0));
    group.add(armR2);

    // Голова круглая
    const head = createSphere(1, skin, 0, 7, 0);
    
    // Тату на лице
    head.add(createPart(1.8, 0.1, 0.1, tattoo, 0, 0.4, 0.85)); 
    
    // Основные глаза (Красные)
    head.add(createPart(0.3, 0.15, 0.1, red, -0.35, 0.1, 0.95));
    head.add(createPart(0.3, 0.15, 0.1, red, 0.35, 0.1, 0.95));
    
    // Доп. глаза (Красные, ниже)
    head.add(createPart(0.2, 0.1, 0.1, red, -0.45, -0.15, 0.95));
    head.add(createPart(0.2, 0.1, 0.1, red, 0.45, -0.15, 0.95));
    
    // Улыбка
    head.add(createPart(0.6, 0.05, 0.1, black, 0, -0.4, 0.95));
    group.add(head);

    // Реалистичные красные волосы
    head.add(createAnimeHair(red, 0));

    return group;
}

// === АНИМАЦИЯ ===
function animate() {
    requestAnimationFrame(animate);

    // Плавное вращение камеры вокруг центра (эпичный ракурс)
    angle += 0.003;
    camera.position.x = Math.sin(angle) * 12;
    camera.position.z = Math.cos(angle) * 12;
    camera.lookAt(0, 4, 0);

    renderer.render(scene, camera);
}

// Адаптация экрана
window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});