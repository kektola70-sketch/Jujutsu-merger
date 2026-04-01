document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-play').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        init3DScene();
    });
});

let scene, camera, renderer, floor;
let angle = 0;
let isCutscene = true, isDead = false;
let gojoModel, sukunaModel;
let gojoHp = 5000, sukunaHp = 25000;

// Управление и Камера
let move = { up: false, down: false, left: false, right: false };
let isLockedOn = false;
let camTheta = Math.PI / 2, camPhi = Math.PI / 3, camRadius = 15;
let isDragging = false, prevMouse = { x:0, y:0 };

// Скиллы и Эффекты
let activeProjectiles = [];
let isInfinityActive = false, infinityShieldMesh = null;
let blueMaxMesh = null, blueMaxAngle = 0;
let isDomainActive = false, isSukunaStunned = false;
let domainStars = null, domainHole = null;

// Инициализация
function init3DScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    gojoModel = createGojo(); gojoModel.position.set(-5, 0, 0); gojoModel.rotation.y = Math.PI/2; scene.add(gojoModel);
    sukunaModel = createSukuna(); sukunaModel.position.set(5, 0, 0); sukunaModel.rotation.y = -Math.PI/2; scene.add(sukunaModel);

    setupControls();
    setTimeout(startBattle, 3000);
    animate();
}

function startBattle() {
    isCutscene = false;
    document.getElementById('cutscene-ui').style.display = 'none';
    document.getElementById('battle-ui').style.display = 'block';
}

function setupControls() {
    // Вращение камеры свайпом
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', (e) => { isDragging = true; prevMouse={x:e.clientX, y:e.clientY}; });
    canvas.addEventListener('mousemove', (e) => {
        if(isDragging && !isLockedOn && !isCutscene) {
            camTheta -= (e.clientX - prevMouse.x) * 0.01;
            camPhi -= (e.clientY - prevMouse.y) * 0.01;
            camPhi = Math.max(0.1, Math.min(Math.PI/2 - 0.1, camPhi)); // Не даем уйти под землю
            prevMouse={x:e.clientX, y:e.clientY};
        }
    });
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('touchstart', (e) => { isDragging=true; prevMouse={x:e.touches[0].clientX, y:e.touches[0].clientY}; });
    canvas.addEventListener('touchmove', (e) => {
        if(isDragging && !isLockedOn && !isCutscene) {
            camTheta -= (e.touches[0].clientX - prevMouse.x) * 0.01;
            camPhi -= (e.touches[0].clientY - prevMouse.y) * 0.01;
            camPhi = Math.max(0.1, Math.min(Math.PI/2 - 0.1, camPhi));
            prevMouse={x:e.touches[0].clientX, y:e.touches[0].clientY};
        }
    });
    canvas.addEventListener('touchend', () => isDragging = false);

    document.getElementById('btn-light').addEventListener('click', () => { if(!isCutscene && !isDead) dealDamage(100); });
    
    const btnLock = document.getElementById('btn-lockon');
    btnLock.addEventListener('click', () => {
        isLockedOn = !isLockedOn;
        btnLock.innerText = isLockedOn ? "🔒 Lock: ON" : "🔒 Lock: OFF";
        btnLock.className = isLockedOn ? "locked" : "";
    });

    const bindDpad = (id, key) => {
        const btn = document.getElementById(id);
        btn.addEventListener('mousedown', () => move[key] = true); btn.addEventListener('mouseup', () => move[key] = false);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); move[key] = true; }); btn.addEventListener('touchend', (e) => { e.preventDefault(); move[key] = false; });
    };
    bindDpad('dpad-up', 'up'); bindDpad('dpad-down', 'down'); bindDpad('dpad-left', 'left'); bindDpad('dpad-right', 'right');
}

function dealDamage(amount) {
    if (isDead) return;
    sukunaHp -= amount;
    if(sukunaHp <= 0) { sukunaHp = 0; isDead = true; sukunaModel.rotation.x = -Math.PI/2; sukunaModel.position.y=1; document.getElementById('win-screen').style.display='block'; }
    document.getElementById('sukuna-hp-text').innerText = `${Math.floor(sukunaHp)} / 25000`;
    document.getElementById('sukuna-hp-fill').style.width = `${(sukunaHp/25000)*100}%`;
}

function healGojo() {
    gojoHp = 5000;
    document.getElementById('gojo-hp-text').innerText = `5000 / 5000`;
    document.getElementById('gojo-hp-fill').style.width = `100%`;
}

// === СКИЛЛЫ ===
function useSkill(id) {
    if(isCutscene || isDead) return;
    switch(id) {
        case 1: createProjectile(0x0000ff, gojoModel.position, 'blue', false); break;
        case 2: createExplosion(0xff0000, gojoModel.position); break;
        case 3: castBlueMax(); break;
        case 4: createProjectile(0xff0000, gojoModel.position, 'red', true); break; // С автонаводкой
        case 5: activateInfinity(); break;
        case 6: castHollowPurple(); break;
        case 7: castAwakening(); break;
        case 8: castDomain(); break;
    }
}

// Skil 3: Blue MAX (Летает вокруг Годжо)
function castBlueMax() {
    if(blueMaxMesh) return;
    const mat = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.8 });
    blueMaxMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5), mat);
    scene.add(blueMaxMesh);
    setTimeout(() => { scene.remove(blueMaxMesh); blueMaxMesh = null; }, 5000);
}

// Скилл 7: Awakening (Взлет, хил, аура, падение)
function castAwakening() {
    isCutscene = true; // Блокируем управление
    // 1. Летит вверх и ложится
    let upInt = setInterval(() => { gojoModel.position.y += 0.2; gojoModel.rotation.x += 0.05; }, 30);
    setTimeout(() => {
        clearInterval(upInt);
        // 2. Отхил и Аура
        healGojo();
        const aura = new THREE.Mesh(new THREE.SphereGeometry(2.5), new THREE.MeshBasicMaterial({color: 0xffffff, transparent:true, opacity: 0.3}));
        gojoModel.add(aura);
        
        // 3. Падение
        setTimeout(() => {
            let downInt = setInterval(() => { gojoModel.position.y -= 0.5; gojoModel.rotation.x -= 0.125; }, 30);
            setTimeout(() => {
                clearInterval(downInt);
                gojoModel.position.y = 0; gojoModel.rotation.x = 0;
                isCutscene = false;
                // Отброс Сукуны
                if(gojoModel.position.distanceTo(sukunaModel.position) < 15) {
                    let dir = sukunaModel.position.clone().sub(gojoModel.position).normalize();
                    sukunaModel.position.add(dir.multiplyScalar(8));
                    dealDamage(1000);
                }
            }, 500);
        }, 1500);
    }, 1000);
}

// Скилл 8: Domain Expansion
function castDomain() {
    if(isDomainActive) return;
    isDomainActive = true; isCutscene = true; // Забираем управление

    // Текст
    const uiText = document.getElementById('domain-text');
    uiText.style.display = 'block';

    // Создаем Звезды (Космос)
    scene.background = new THREE.Color(0x000000);
    floor.visible = false; // Прячем пол
    
    let starsGeo = new THREE.BufferGeometry();
    let starsArray = [];
    for(let i=0; i<1000; i++) {
        starsArray.push((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsArray, 3));
    domainStars = new THREE.Points(starsGeo, new THREE.PointsMaterial({color: 0xffffff}));
    scene.add(domainStars);

    // Звезды летят 3 секунды
    setTimeout(() => {
        uiText.style.display = 'none';
        isCutscene = false;
        isSukunaStunned = true; // Заморозка
        
        // Черный шар (Мерцает)
        domainHole = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 32), new THREE.MeshBasicMaterial({color: 0x110022, transparent: true, opacity: 0.5, side: THREE.DoubleSide}));
        scene.add(domainHole);

        // Конец территории через 20 секунд
        setTimeout(() => {
            isDomainActive = false;
            isSukunaStunned = false;
            scene.remove(domainStars); scene.remove(domainHole);
            scene.background = new THREE.Color(0x1a1a1a);
            floor.visible = true;
        }, 20000);

    }, 3000);
}

function activateInfinity() {
    if(isInfinityActive) return;
    isInfinityActive = true;
    infinityShieldMesh = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.3 }));
    gojoModel.add(infinityShieldMesh); infinityShieldMesh.position.y = 4;
    setTimeout(() => { isInfinityActive = false; gojoModel.remove(infinityShieldMesh); }, 5000);
}

function castHollowPurple() {
    isCutscene = true; gojoModel.position.y = 3;
    const pOrb = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial({color: 0x8a2be2}));
    setTimeout(() => {
        pOrb.position.set(0, 5, 3); gojoModel.add(pOrb);
        setTimeout(() => {
            gojoModel.remove(pOrb);
            let worldPos = new THREE.Vector3(); pOrb.getWorldPosition(worldPos);
            let worldDir = new THREE.Vector3(); gojoModel.getWorldDirection(worldDir);
            const giantPurple = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({color: 0x8a2be2}));
            giantPurple.position.copy(worldPos); scene.add(giantPurple);
            activeProjectiles.push({ mesh: giantPurple, dir: worldDir, type: 'purple', speed: 0.5 });
            gojoModel.position.y = 0; isCutscene = false;
        }, 1000);
    }, 2000);
}

function createProjectile(color, startPos, type, autoAim) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(type==='red'?1:0.5), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 }));
    orb.position.copy(startPos); orb.position.y += 4; scene.add(orb);
    let dir = new THREE.Vector3(); gojoModel.getWorldDirection(dir);
    activeProjectiles.push({ mesh: orb, dir: dir, type: type, speed: type==='red'?0.5:0.3, autoAim: autoAim });
}
function createExplosion(color, pos) {
    const bomb = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 }));
    bomb.position.copy(pos); bomb.position.y += 5; bomb.position.x += 1.5; scene.add(bomb);
    let scale = 1, expl = setInterval(() => { scale+=0.5; bomb.scale.set(scale,scale,scale); bomb.material.opacity-=0.1; if(bomb.material.opacity<=0){ scene.remove(bomb); dealDamage(500); clearInterval(expl); } }, 50);
}

// === ФИЗИКА КАМЕРЫ, ДВИЖЕНИЯ И АНИМАЦИИ ===
function animate() {
    requestAnimationFrame(animate);
    let time = Date.now() * 0.001;

    // Территория: Вращение звезд и пульсация дыры
    if(isDomainActive && domainStars) {
        if(isCutscene) domainStars.rotation.y += 0.05; // Звезды быстро летят во время каста
        if(domainHole) domainHole.material.opacity = 0.4 + Math.sin(time * 2) * 0.3;
    }

    if (isCutscene && !isDomainActive) {
        angle += 0.01; camera.position.x = Math.sin(angle)*12; camera.position.z = Math.cos(angle)*12; camera.lookAt(0,4,0);
    } else if (!isCutscene) {
        
        // Умное движение (относительно поворота камеры)
        let camForward = new THREE.Vector3(); camera.getWorldDirection(camForward); camForward.y = 0; camForward.normalize();
        let camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0,1,0)).normalize();
        let speed = 0.2;

        if(move.up) gojoModel.position.add(camForward.clone().multiplyScalar(speed));
        if(move.down) gojoModel.position.add(camForward.clone().multiplyScalar(-speed));
        if(move.left) gojoModel.position.add(camRight.clone().multiplyScalar(speed));
        if(move.right) gojoModel.position.add(camRight.clone().multiplyScalar(-speed));

        // Поворот модели Годжо по ходу движения
        if(move.up || move.down || move.left || move.right) {
            if(!isLockedOn) gojoModel.lookAt(gojoModel.position.clone().add(camForward));
        }

        // Позиция камеры
        if(isLockedOn && !isDead) {
            gojoModel.lookAt(sukunaModel.position);
            // Над головой, смотрит на Сукуну
            camera.position.set(gojoModel.position.x, gojoModel.position.y + 10, gojoModel.position.z);
            camera.lookAt(sukunaModel.position);
        } else {
            // Свободная камера по координатам Сферы
            camera.position.x = gojoModel.position.x + camRadius * Math.sin(camPhi) * Math.cos(camTheta);
            camera.position.y = gojoModel.position.y + camRadius * Math.cos(camPhi);
            camera.position.z = gojoModel.position.z + camRadius * Math.sin(camPhi) * Math.sin(camTheta);
            camera.lookAt(gojoModel.position.x, gojoModel.position.y + 3, gojoModel.position.z);
        }

        // Вращение Blue Max
        if(blueMaxMesh) {
            blueMaxAngle += 0.1;
            blueMaxMesh.position.set(gojoModel.position.x + Math.cos(blueMaxAngle)*5, gojoModel.position.y+4, gojoModel.position.z + Math.sin(blueMaxAngle)*5);
            if(!isSukunaStunned && blueMaxMesh.position.distanceTo(sukunaModel.position) < 8) {
                dealDamage(5); sukunaModel.position.lerp(gojoModel.position, 0.05);
            }
        }

        // Снаряды
        for(let i = activeProjectiles.length - 1; i >= 0; i--) {
            let p = activeProjectiles[i];
            
            // Автонаводка (Red MAX)
            if(p.autoAim && !isDead) {
                let targetDir = sukunaModel.position.clone().add(new THREE.Vector3(0,4,0)).sub(p.mesh.position).normalize();
                p.dir.lerp(targetDir, 0.1).normalize();
            }

            p.mesh.position.add(p.dir.clone().multiplyScalar(p.speed));

            if(!isDead && p.mesh.position.distanceTo(sukunaModel.position) < (p.type==='purple'?4:2)) {
                scene.remove(p.mesh); activeProjectiles.splice(i, 1);
                if(p.type === 'blue') { dealDamage(500); sukunaModel.position.lerp(p.mesh.position, 0.5); }
                else if(p.type === 'red' && p.autoAim) { dealDamage(1500); gojoModel.position.copy(sukunaModel.position); gojoModel.position.z += 3; }
                else if(p.type === 'purple') dealDamage(8000);
            } else if (p.mesh.position.length() > 100) { scene.remove(p.mesh); activeProjectiles.splice(i, 1); }
        }
    }
    renderer.render(scene, camera);
}

// === СОЗДАНИЕ МОДЕЛЕЙ (Без изменений) ===
function createCylinder(r,h,c,x,y,z){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),new THREE.MeshStandardMaterial({color:c}));m.position.set(x,y,z);return m;}
function createArmWithJoint(r,h,c,sx,sy,sz){const j=new THREE.Group();j.position.set(sx,sy,sz);const am=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),new THREE.MeshStandardMaterial({color:c}));am.position.y=-h/2;j.add(am);return{joint:j,mesh:am};}
function createSphere(r,c,x,y,z){const m=new THREE.Mesh(new THREE.SphereGeometry(r,32,32),new THREE.MeshStandardMaterial({color:c}));m.position.set(x,y,z);return m;}
function createPart(w,h,d,c,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c}));m.position.set(x,y,z);return m;}
function createAnimeHair(c,y){const gr=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:c});const b=new THREE.Mesh(new THREE.SphereGeometry(1.05,32,16,0,Math.PI*2,0,Math.PI/1.7),m);b.position.y=0.2;gr.add(b);for(let i=0;i<35;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(0.25,1.2,8),m);const p=Math.random()*Math.PI/2.2,t=Math.random()*Math.PI*2;s.position.set(Math.sin(p)*Math.cos(t),Math.cos(p)+0.2,Math.sin(p)*Math.sin(t));s.lookAt(2*Math.sin(p)*Math.cos(t),2*Math.cos(p)+0.2,2*Math.sin(p)*Math.sin(t));s.rotateX(Math.PI/2);gr.add(s);}gr.position.y=y;return gr;}
function createTattooRing(r,c,y){const m=new THREE.Mesh(new THREE.TorusGeometry(r,0.05,8,24),new THREE.MeshStandardMaterial({color:c}));m.rotation.x=Math.PI/2;m.position.y=y;return m;}
function createGojo(){const gr=new THREE.Group();const s=0xffe0bd,bl=0x111111,w=0xffffff,bu=0x00aaff;gr.add(createCylinder(0.4,3,w,-0.6,1.5,0));gr.add(createCylinder(0.4,3,w,0.6,1.5,0));gr.add(createCylinder(1.1,3,bl,0,4.5,0));const aL=createArmWithJoint(0.35,3,s,-1.45,5.5,0);aL.joint.rotation.z=Math.PI/16;gr.add(aL.joint);const aR=createArmWithJoint(0.35,3,s,1.45,5.5,0);aR.joint.rotation.z=-Math.PI/16;gr.add(aR.joint);const h=createSphere(1,s,0,7,0);h.add(createPart(0.3,0.15,0.1,bu,-0.35,0.1,0.95));h.add(createPart(0.3,0.15,0.1,bu,0.35,0.1,0.95));h.add(createPart(0.5,0.05,0.1,bl,0,-0.3,0.95));gr.add(h);h.add(createAnimeHair(w,0));return gr;}
function createSukuna(){const gr=new THREE.Group();const s=0xffe0bd,w=0xffffff,r=0xff0000,t=0x330000,bl=0x000000;gr.add(createCylinder(0.4,3,w,-0.6,1.5,0));gr.add(createCylinder(0.4,3,w,0.6,1.5,0));const to=createCylinder(1.1,3,w,0,4.5,0);to.add(createPart(1.0,0.2,0.1,t,0,0.5,1.05));gr.add(to);const aL1=createArmWithJoint(0.35,3,s,-1.45,5.5,0);aL1.joint.rotation.z=Math.PI/16;aL1.mesh.add(createTattooRing(0.35,t,0.5));aL1.mesh.add(createTattooRing(0.35,t,-0.5));gr.add(aL1.joint);const aR1=createArmWithJoint(0.35,3,s,1.45,5.5,0);aR1.joint.rotation.z=-Math.PI/16;aR1.mesh.add(createTattooRing(0.35,t,0.5));aR1.mesh.add(createTattooRing(0.35,t,-0.5));gr.add(aR1.joint);const aL2=createArmWithJoint(0.35,3,s,-1.45,4.0,-0.4);aL2.joint.rotation.x=-Math.PI/8;aL2.joint.rotation.z=Math.PI/6;aL2.mesh.add(createTattooRing(0.35,t,0));gr.add(aL2.joint);const aR2=createArmWithJoint(0.35,3,s,1.45,4.0,-0.4);aR2.joint.rotation.x=-Math.PI/8;aR2.joint.rotation.z=-Math.PI/6;aR2.mesh.add(createTattooRing(0.35,t,0));gr.add(aR2.joint);const h=createSphere(1,s,0,7,0);h.add(createPart(1.8,0.1,0.1,t,0,0.4,0.85));h.add(createPart(0.3,0.15,0.1,r,-0.35,0.1,0.95));h.add(createPart(0.3,0.15,0.1,r,0.35,0.1,0.95));h.add(createPart(0.2,0.1,0.1,r,-0.45,-0.15,0.95));h.add(createPart(0.2,0.1,0.1,r,0.45,-0.15,0.95));h.add(createPart(0.6,0.05,0.1,bl,0,-0.4,0.95));gr.add(h);h.add(createAnimeHair(r,0));return gr;}