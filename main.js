document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-play').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        init3DScene();
    });
});

let scene, camera, renderer;
let angle = 0;
let isCutscene = true;
let gojoModel, sukunaModel;

// Боевые переменные
let gojoHp = 5000;
let sukunaHp = 25000; // ХП Сукуны теперь 25000!
let isDead = false;

let hitCount = 0;
let bfCharges = 0;
let lastHeavyTap = 0;
let bfTimerActive = false;
let bfTimeLeft = 0;

// Переменные движения и камеры
let move = { up: false, down: false, left: false, right: false };
let isLockedOn = false;
let activeProjectiles = [];

// Скиллы
let isInfinityActive = false;
let infinityShieldMesh = null;
let isCastingPurple = false;

function init3DScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    gojoModel = createGojo();
    gojoModel.position.set(-5, 0, 0);
    gojoModel.rotation.y = Math.PI / 2;
    scene.add(gojoModel);

    sukunaModel = createSukuna();
    sukunaModel.position.set(5, 0, 0);
    sukunaModel.rotation.y = -Math.PI / 2;
    scene.add(sukunaModel);

    setTimeout(startBattle, 3000);
    animate();
    setupControls();
}

function startBattle() {
    isCutscene = false;
    document.getElementById('cutscene-ui').style.display = 'none';
    document.getElementById('battle-ui').style.display = 'block';
}

function setupControls() {
    // Удары
    document.getElementById('btn-light').addEventListener('click', () => {
        if(isCutscene || isDead) return;
        hitCount++; updateBFMeter();
        dealDamage(100);
    });

    document.getElementById('btn-heavy').addEventListener('click', () => {
        if(isCutscene || isDead) return;
        let now = Date.now();
        if (now - lastHeavyTap < 500 && bfCharges > 0 && !bfTimerActive) {
            startBFTimer();
        } else if (bfTimerActive) {
            executeBlackFlash();
        } else { dealDamage(250); }
        lastHeavyTap = now;
    });

    // Захват цели (Lock-on)
    const btnLock = document.getElementById('btn-lockon');
    btnLock.addEventListener('click', () => {
        isLockedOn = !isLockedOn;
        btnLock.innerText = isLockedOn ? "🔒 Lock: ON" : "🔒 Lock: OFF";
        btnLock.className = isLockedOn ? "locked" : "";
    });

    // Управление ходьбой (D-pad)
    const bindDpad = (id, key) => {
        const btn = document.getElementById(id);
        btn.addEventListener('mousedown', () => move[key] = true);
        btn.addEventListener('mouseup', () => move[key] = false);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); move[key] = true; });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); move[key] = false; });
    };
    bindDpad('dpad-up', 'up'); bindDpad('dpad-down', 'down');
    bindDpad('dpad-left', 'left'); bindDpad('dpad-right', 'right');
}

function updateBFMeter() {
    if (hitCount >= 60 && bfCharges < 5) { hitCount = 0; bfCharges++; }
    for(let i=1; i<=5; i++) {
        let slot = document.getElementById(`bf-${i}`);
        slot.className = 'bf-slot';
        if (i <= bfCharges) slot.classList.add('ready');
        else if (i === bfCharges + 1) slot.style.backgroundColor = `rgba(255,255,255, ${hitCount/60})`;
        else slot.style.backgroundColor = 'transparent';
    }
}

function startBFTimer() {
    bfTimerActive = true; bfTimeLeft = 2.0;
    document.getElementById('bf-timer').style.display = 'block';
    let timerInterval = setInterval(() => {
        bfTimeLeft -= 0.1;
        document.getElementById('bf-timer').innerText = bfTimeLeft.toFixed(1) + 's';
        if(bfTimeLeft <= 0) { clearInterval(timerInterval); bfTimerActive = false; document.getElementById('bf-timer').style.display = 'none'; }
    }, 100);
}

function executeBlackFlash() {
    bfTimerActive = false; document.getElementById('bf-timer').style.display = 'none';
    bfCharges--; updateBFMeter(); dealDamage(2500);
}

// Система получения урона (И СМЕРТЬ БОССА)
function dealDamage(amount) {
    if (isDead) return;
    sukunaHp -= amount;
    if(sukunaHp <= 0) {
        sukunaHp = 0;
        sukunaDeath();
    }
    document.getElementById('sukuna-hp-text').innerText = `${sukunaHp} / 25000`;
    document.getElementById('sukuna-hp-fill').style.width = `${(sukunaHp/25000)*100}%`;
}

function sukunaDeath() {
    isDead = true;
    // Сукуна падает на спину
    sukunaModel.rotation.x = -Math.PI / 2;
    sukunaModel.position.y = 1; // Чтобы лежал ровно на земле
    document.getElementById('win-screen').style.display = 'block';
}

// === СКИЛЛЫ ГОДЖО ===
function useSkill(id) {
    if(isCutscene || isDead) return;

    switch(id) {
        case 1: createProjectile(0x0000ff, gojoModel.position, 'blue'); break;
        case 2: createExplosion(0xff0000, gojoModel.position); break;
        case 5: activateInfinity(); break;
        case 6: castHollowPurple(); break;
        case 3: case 4: case 7: case 8: 
            alert("Эти скиллы будут добавлены в следующем шаге!"); break;
    }
}

// Скилл 5: Infinity
function activateInfinity() {
    if(isInfinityActive) return;
    isInfinityActive = true;
    
    // Создаем розовую сферу
    const geo = new THREE.SphereGeometry(3, 32, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.3 });
    infinityShieldMesh = new THREE.Mesh(geo, mat);
    gojoModel.add(infinityShieldMesh); // Привязываем к Годжо
    infinityShieldMesh.position.y = 4;

    setTimeout(() => {
        isInfinityActive = false;
        gojoModel.remove(infinityShieldMesh);
    }, 5000); // Длится 5 секунд
}

// Скилл 6: Hollow Purple
function castHollowPurple() {
    if(isCastingPurple) return;
    isCastingPurple = true;

    // 1. Годжо подлетает
    gojoModel.position.y = 3;

    // 2. Появляются шары
    const redMat = new THREE.MeshBasicMaterial({color: 0xff0000});
    const blueMat = new THREE.MeshBasicMaterial({color: 0x0000ff});
    const redOrb = new THREE.Mesh(new THREE.SphereGeometry(0.8), redMat);
    const blueOrb = new THREE.Mesh(new THREE.SphereGeometry(0.8), blueMat);
    
    redOrb.position.set(2, 5, 0); blueOrb.position.set(-2, 5, 0);
    gojoModel.add(redOrb); gojoModel.add(blueOrb);

    // 3. Через 3 секунды слияние
    setTimeout(() => {
        gojoModel.remove(redOrb); gojoModel.remove(blueOrb);
        
        const purpleMat = new THREE.MeshBasicMaterial({color: 0x8a2be2});
        const purpleOrb = new THREE.Mesh(new THREE.SphereGeometry(2), purpleMat);
        purpleOrb.position.set(0, 5, 3); // Перед Годжо
        gojoModel.add(purpleOrb);

        // 4. Еще через 1 сек выстрел
        setTimeout(() => {
            gojoModel.remove(purpleOrb); // Убираем от Годжо
            
            // Превращаем в снаряд в мире (летит туда, куда смотрел Годжо)
            let worldPos = new THREE.Vector3();
            purpleOrb.getWorldPosition(worldPos);
            let worldDir = new THREE.Vector3();
            gojoModel.getWorldDirection(worldDir);

            const giantPurple = new THREE.Mesh(new THREE.SphereGeometry(3), purpleMat);
            giantPurple.position.copy(worldPos);
            scene.add(giantPurple);

            activeProjectiles.push({ mesh: giantPurple, dir: worldDir, type: 'purple', speed: 0.5 });

            // Годжо опускается
            gojoModel.position.y = 0;
            isCastingPurple = false;
        }, 1000);

    }, 3000);
}

function createProjectile(color, startPos, type) {
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5), mat);
    orb.position.copy(startPos); orb.position.y += 4;
    scene.add(orb);

    // Летит в ту сторону, куда смотрит Годжо
    let dir = new THREE.Vector3();
    gojoModel.getWorldDirection(dir);
    activeProjectiles.push({ mesh: orb, dir: dir, type: type, speed: 0.3 });
}

function createExplosion(color, pos) {
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
    const bomb = new THREE.Mesh(new THREE.SphereGeometry(1), mat);
    bomb.position.copy(pos); bomb.position.y += 5; bomb.position.x += 1.5;
    scene.add(bomb);

    let scale = 1;
    let explInterval = setInterval(() => {
        scale += 0.5; bomb.scale.set(scale, scale, scale); bomb.material.opacity -= 0.1;
        if(bomb.material.opacity <= 0) {
            scene.remove(bomb); dealDamage(500); clearInterval(explInterval);
        }
    }, 50);
}

// === ГЕНЕРАТОРЫ ФОРМ (Сжатые для экономии места) ===
function createCylinder(r, h, c, x, y, z) { const ms=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),new THREE.MeshStandardMaterial({color:c})); ms.position.set(x,y,z); return ms; }
function createArmWithJoint(r, h, c, sx, sy, sz) { const j=new THREE.Group(); j.position.set(sx,sy,sz); const am=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),new THREE.MeshStandardMaterial({color:c})); am.position.y=-h/2; j.add(am); return {joint:j, mesh:am}; }
function createSphere(r, c, x, y, z) { const ms=new THREE.Mesh(new THREE.SphereGeometry(r,32,32),new THREE.MeshStandardMaterial({color:c})); ms.position.set(x,y,z); return ms; }
function createPart(w, h, d, c, x, y, z) { const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c})); ms.position.set(x,y,z); return ms; }
function createAnimeHair(c, y) { const gr=new THREE.Group(); const m=new THREE.MeshStandardMaterial({color:c}); const b=new THREE.Mesh(new THREE.SphereGeometry(1.05,32,16,0,Math.PI*2,0,Math.PI/1.7), m); b.position.y=0.2; gr.add(b); for(let i=0;i<35;i++){ const s=new THREE.Mesh(new THREE.ConeGeometry(0.25,1.2,8), m); const p=Math.random()*Math.PI/2.2, t=Math.random()*Math.PI*2; s.position.set(Math.sin(p)*Math.cos(t), Math.cos(p)+0.2, Math.sin(p)*Math.sin(t)); s.lookAt(2*Math.sin(p)*Math.cos(t), 2*Math.cos(p)+0.2, 2*Math.sin(p)*Math.sin(t)); s.rotateX(Math.PI/2); gr.add(s); } gr.position.y=y; return gr; }
function createTattooRing(r, c, y) { const ms=new THREE.Mesh(new THREE.TorusGeometry(r,0.05,8,24),new THREE.MeshStandardMaterial({color:c})); ms.rotation.x=Math.PI/2; ms.position.y=y; return ms; }

function createGojo() {
    const gr = new THREE.Group(); const s = 0xffe0bd, bl = 0x111111, w = 0xffffff, bu = 0x00aaff;
    gr.add(createCylinder(0.4, 3, w, -0.6, 1.5, 0)); gr.add(createCylinder(0.4, 3, w, 0.6, 1.5, 0)); gr.add(createCylinder(1.1, 3, bl, 0, 4.5, 0));
    const aL = createArmWithJoint(0.35, 3, s, -1.45, 5.5, 0); aL.joint.rotation.z = Math.PI/16; gr.add(aL.joint);
    const aR = createArmWithJoint(0.35, 3, s, 1.45, 5.5, 0); aR.joint.rotation.z = -Math.PI/16; gr.add(aR.joint);
    const h = createSphere(1, s, 0, 7, 0); h.add(createPart(0.3, 0.15, 0.1, bu, -0.35, 0.1, 0.95)); h.add(createPart(0.3, 0.15, 0.1, bu, 0.35, 0.1, 0.95)); h.add(createPart(0.5, 0.05, 0.1, bl, 0, -0.3, 0.95)); gr.add(h);
    h.add(createAnimeHair(w, 0)); return gr;
}

function createSukuna() {
    const gr = new THREE.Group(); const s = 0xffe0bd, w = 0xffffff, r = 0xff0000, t = 0x330000, bl = 0x000000;
    gr.add(createCylinder(0.4, 3, w, -0.6, 1.5, 0)); gr.add(createCylinder(0.4, 3, w, 0.6, 1.5, 0));
    const to = createCylinder(1.1, 3, w, 0, 4.5, 0); to.add(createPart(1.0, 0.2, 0.1, t, 0, 0.5, 1.05)); gr.add(to);
    const aL1 = createArmWithJoint(0.35, 3, s, -1.45, 5.5, 0); aL1.joint.rotation.z = Math.PI/16; aL1.mesh.add(createTattooRing(0.35, t, 0.5)); aL1.mesh.add(createTattooRing(0.35, t, -0.5)); gr.add(aL1.joint);
    const aR1 = createArmWithJoint(0.35, 3, s, 1.45, 5.5, 0); aR1.joint.rotation.z = -Math.PI/16; aR1.mesh.add(createTattooRing(0.35, t, 0.5)); aR1.mesh.add(createTattooRing(0.35, t, -0.5)); gr.add(aR1.joint);
    const aL2 = createArmWithJoint(0.35, 3, s, -1.45, 4.0, -0.4); aL2.joint.rotation.x = -Math.PI/8; aL2.joint.rotation.z = Math.PI/6; aL2.mesh.add(createTattooRing(0.35, t, 0)); gr.add(aL2.joint);
    const aR2 = createArmWithJoint(0.35, 3, s, 1.45, 4.0, -0.4); aR2.joint.rotation.x = -Math.PI/8; aR2.joint.rotation.z = -Math.PI/6; aR2.mesh.add(createTattooRing(0.35, t, 0)); gr.add(aR2.joint);
    const h = createSphere(1, s, 0, 7, 0); h.add(createPart(1.8, 0.1, 0.1, t, 0, 0.4, 0.85)); h.add(createPart(0.3, 0.15, 0.1, r, -0.35, 0.1, 0.95)); h.add(createPart(0.3, 0.15, 0.1, r, 0.35, 0.1, 0.95)); h.add(createPart(0.2, 0.1, 0.1, r, -0.45, -0.15, 0.95)); h.add(createPart(0.2, 0.1, 0.1, r, 0.45, -0.15, 0.95)); h.add(createPart(0.6, 0.05, 0.1, bl, 0, -0.4, 0.95)); gr.add(h);
    h.add(createAnimeHair(r, 0)); return gr;
}

// === АНИМАЦИЯ ===
function animate() {
    requestAnimationFrame(animate);

    if (isCutscene) {
        angle += 0.01;
        camera.position.x = Math.sin(angle) * 12;
        camera.position.z = Math.cos(angle) * 12;
        camera.lookAt(0, 4, 0);
    } else {
        // ДВИЖЕНИЕ ГОДЖО
        let speed = 0.15;
        if(move.up) gojoModel.position.x += speed;
        if(move.down) gojoModel.position.x -= speed;
        if(move.left) gojoModel.position.z -= speed;
        if(move.right) gojoModel.position.z += speed;

        // КАМЕРА И ПРИЦЕЛ
        if(isLockedOn && !isDead) {
            // Годжо всегда смотрит на врага
            gojoModel.lookAt(sukunaModel.position);
            // Камера за спиной Годжо, но смотрит на врага
            let offset = new THREE.Vector3(0, 8, -12); // Дальше и выше
            offset.applyQuaternion(gojoModel.quaternion);
            camera.position.copy(gojoModel.position).add(offset);
            camera.lookAt(sukunaModel.position);
        } else {
            // Свободная камера: висит за спиной Годжо (по оси X)
            gojoModel.rotation.y = Math.PI / 2; // Смотрит в сторону +X
            camera.position.set(gojoModel.position.x - 12, gojoModel.position.y + 8, gojoModel.position.z);
            camera.lookAt(gojoModel.position.x + 5, 4, gojoModel.position.z);
        }

        // ЛОГИКА СНАРЯДОВ (Blue & Purple)
        for(let i = activeProjectiles.length - 1; i >= 0; i--) {
            let p = activeProjectiles[i];
            // Двигаем по вектору направления
            p.mesh.position.add(p.dir.clone().multiplyScalar(p.speed));

            // Проверка попадания по Сукуне
            if(!isDead && p.mesh.position.distanceTo(sukunaModel.position) < (p.type === 'purple' ? 4 : 2)) {
                scene.remove(p.mesh);
                activeProjectiles.splice(i, 1);
                
                if(p.type === 'blue') {
                    dealDamage(500);
                    sukunaModel.position.lerp(p.mesh.position, 0.5); // Притягивание
                } else if(p.type === 'purple') {
                    dealDamage(8000); // Фиолетовый сносит огромное кол-во ХП
                }
            } else if (p.mesh.position.length() > 50) {
                // Удаляем если улетел за карту
                scene.remove(p.mesh);
                activeProjectiles.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});