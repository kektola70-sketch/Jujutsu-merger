document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-play').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        init3DScene();
    });
});

// === 3D ДВИЖОК ===
let scene, camera, renderer;
let angle = 0;
let isCutscene = true;
let gojoModel, sukunaModel;

// Боевые переменные
let gojoHp = 5000;
let sukunaHp = 10000;
let hitCount = 0;      // Удары до Black Flash
let bfCharges = 0;     // Накоплено молний (до 5)
let lastHeavyTap = 0;  // Для двойного клика
let bfTimerActive = false;
let bfTimeLeft = 0;

// Массив для анимации частиц (скиллов)
let activeProjectiles = [];

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

    gojoModel = createGojo();
    gojoModel.position.set(-3.5, 0, 0);
    gojoModel.rotation.y = Math.PI / 2;
    scene.add(gojoModel);

    sukunaModel = createSukuna();
    sukunaModel.position.set(3.5, 0, 0);
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
    
    // Камера за спину
    camera.position.set(-7, 5.5, 3);
    camera.lookAt(sukunaModel.position.x, 4, sukunaModel.position.z);
}

// === УПРАВЛЕНИЕ И BLACK FLASH ===
function setupControls() {
    // Обычный удар (накапливает БФ)
    document.getElementById('btn-light').addEventListener('click', () => {
        if(isCutscene) return;
        hitCount++;
        dealDamage(50); // Урон Сукуне
        updateBFMeter();
    });

    // Тяжелый удар (проверка на Black Flash)
    document.getElementById('btn-heavy').addEventListener('click', () => {
        if(isCutscene) return;
        
        let now = Date.now();
        // Двойное нажатие (менее 500мс) и есть заряды БФ
        if (now - lastHeavyTap < 500 && bfCharges > 0 && !bfTimerActive) {
            startBFTimer();
        } else if (bfTimerActive) {
            // Если таймер активен и мы нажали снова - ВЫПУСКАЕМ BLACK FLASH!
            executeBlackFlash();
        } else {
            dealDamage(150);
        }
        lastHeavyTap = now;
    });
}

function updateBFMeter() {
    // 60 ударов = 1 заряд
    if (hitCount >= 60 && bfCharges < 5) {
        hitCount = 0;
        bfCharges++;
    }
    
    // Обновляем визуал (5 слотов)
    for(let i=1; i<=5; i++) {
        let slot = document.getElementById(`bf-${i}`);
        slot.className = 'bf-slot'; // сброс
        if (i <= bfCharges) {
            slot.classList.add('ready'); // Синий (готов)
        } else if (i === bfCharges + 1) {
            // Показываем прогресс белым цветом прозрачностью
            slot.style.backgroundColor = `rgba(255,255,255, ${hitCount/60})`;
        } else {
            slot.style.backgroundColor = 'transparent';
        }
    }
}

function startBFTimer() {
    bfTimerActive = true;
    bfTimeLeft = 2.0;
    document.getElementById('bf-timer').style.display = 'block';
    
    let timerInterval = setInterval(() => {
        bfTimeLeft -= 0.1;
        document.getElementById('bf-timer').innerText = bfTimeLeft.toFixed(1) + 's';
        if(bfTimeLeft <= 0) {
            clearInterval(timerInterval);
            bfTimerActive = false;
            document.getElementById('bf-timer').style.display = 'none';
        }
    }, 100);
}

function executeBlackFlash() {
    bfTimerActive = false;
    document.getElementById('bf-timer').style.display = 'none';
    bfCharges--;
    updateBFMeter();
    
    console.log("BLACK FLASH!");
    dealDamage(1000); // Огромный урон
    // В будущем добавим вспышку черной молнии в 3D
}

function dealDamage(amount) {
    sukunaHp -= amount;
    if(sukunaHp < 0) sukunaHp = 0;
    document.getElementById('sukuna-hp-text').innerText = `${sukunaHp} / 10000`;
    document.getElementById('sukuna-hp-fill').style.width = `${(sukunaHp/10000)*100}%`;
}

// === СКИЛЛЫ ГОДЖО ===
function useSkill(id) {
    if(isCutscene) return;

    switch(id) {
        case 1: // Lapse Blue
            createProjectile(0x0000ff, gojoModel.position, sukunaModel.position, 'blue');
            break;
        case 2: // Reversal Red
            createExplosion(0xff0000, gojoModel.position);
            break;
        case 3: alert("Скилл 3: Blue MAX (В разработке)"); break;
        case 4: alert("Скилл 4: Red MAX (В разработке)"); break;
        case 5: alert("Скилл 5: Infinity Shield (В разработке)"); break;
        case 6: alert("Скилл 6: Hollow Purple (В разработке)"); break;
        case 7: alert("Скилл 7: Awakening (В разработке)"); break;
        case 8: alert("Скилл 8: DOMAIN EXPANSION (В разработке)"); break;
    }
}

// 3D Логика Скиллов
function createProjectile(color, startPos, targetPos, type) {
    const geo = new THREE.SphereGeometry(0.5, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
    const orb = new THREE.Mesh(geo, mat);
    orb.position.copy(startPos);
    orb.position.y += 4; // Бросок от груди
    scene.add(orb);

    activeProjectiles.push({ mesh: orb, target: targetPos, type: type, speed: 0.2 });
}

function createExplosion(color, pos) {
    const geo = new THREE.SphereGeometry(1, 32, 32);
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
    const bomb = new THREE.Mesh(geo, mat);
    bomb.position.copy(pos);
    bomb.position.y += 5; // Над пальцами
    bomb.position.x += 1.5; // Чуть впереди
    scene.add(bomb);

    // Взрыв (увеличивается и исчезает)
    let scale = 1;
    let explInterval = setInterval(() => {
        scale += 0.5;
        bomb.scale.set(scale, scale, scale);
        bomb.material.opacity -= 0.1;
        if(bomb.material.opacity <= 0) {
            scene.remove(bomb);
            dealDamage(300); // Урон от красного
            clearInterval(explInterval);
        }
    }, 50);
}

// === ГЕНЕРАТОРЫ ФОРМ (Из прошлого шага) ===
function createCylinder(r, h, c, x, y, z) { const g=new THREE.CylinderGeometry(r,r,h,32); const m=new THREE.MeshStandardMaterial({color:c}); const ms=new THREE.Mesh(g,m); ms.position.set(x,y,z); return ms; }
function createArmWithJoint(r, h, c, sx, sy, sz) { const j=new THREE.Group(); j.position.set(sx,sy,sz); const g=new THREE.CylinderGeometry(r,r,h,32); const m=new THREE.MeshStandardMaterial({color:c}); const am=new THREE.Mesh(g,m); am.position.y=-h/2; j.add(am); return {joint:j, mesh:am}; }
function createSphere(r, c, x, y, z) { const g=new THREE.SphereGeometry(r,32,32); const m=new THREE.MeshStandardMaterial({color:c}); const ms=new THREE.Mesh(g,m); ms.position.set(x,y,z); return ms; }
function createPart(w, h, d, c, x, y, z) { const g=new THREE.BoxGeometry(w,h,d); const m=new THREE.MeshStandardMaterial({color:c}); const ms=new THREE.Mesh(g,m); ms.position.set(x,y,z); return ms; }
function createAnimeHair(c, y) { const gr=new THREE.Group(); const m=new THREE.MeshStandardMaterial({color:c}); const b=new THREE.Mesh(new THREE.SphereGeometry(1.05,32,16,0,Math.PI*2,0,Math.PI/1.7), m); b.position.y=0.2; gr.add(b); for(let i=0;i<35;i++){ const s=new THREE.Mesh(new THREE.ConeGeometry(0.25,1.2,8), m); const t=Math.random()*Math.PI*2; const p=Math.random()*Math.PI/2.2; s.position.set(1.0*Math.sin(p)*Math.cos(t), 1.0*Math.cos(p)+0.2, 1.0*Math.sin(p)*Math.sin(t)); s.lookAt(2.0*Math.sin(p)*Math.cos(t), 2.0*Math.cos(p)+0.2, 2.0*Math.sin(p)*Math.sin(t)); s.rotateX(Math.PI/2); gr.add(s); } gr.position.y=y; return gr; }
function createTattooRing(r, c, y) { const g=new THREE.TorusGeometry(r,0.05,8,24); const m=new THREE.MeshStandardMaterial({color:c}); const ms=new THREE.Mesh(g,m); ms.rotation.x=Math.PI/2; ms.position.y=y; return ms; }

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
        // Логика полета скиллов
        for(let i = activeProjectiles.length - 1; i >= 0; i--) {
            let p = activeProjectiles[i];
            
            // Движение к цели
            let dir = new THREE.Vector3().subVectors(p.target, p.mesh.position).normalize();
            p.mesh.position.add(dir.multiplyScalar(p.speed));

            // Проверка столкновения (если близко к Сукуне)
            if(p.mesh.position.distanceTo(p.target) < 1.5) {
                scene.remove(p.mesh);
                activeProjectiles.splice(i, 1);
                
                if(p.type === 'blue') {
                    dealDamage(200);
                    // Эффект притягивания (Сукуна дергается вперед)
                    sukunaModel.position.x -= 0.5;
                    setTimeout(() => { sukunaModel.position.x += 0.5; }, 1000);
                }
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