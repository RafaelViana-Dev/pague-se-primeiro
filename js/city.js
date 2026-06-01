/**
 * city.js
 * Módulo de visualização 3D da cidade do patrimônio.
 * Usa Three.js para renderizar uma cidade isométrica que cresce conforme o patrimônio evolui.
 * Cada marco de 10% adiciona novos elementos à cena.
 */

let scene, camera, renderer, animationId, controls;
let cityGroup = null;
let activeMilestones = new Set();
let currentPercent = 0;
let renderedCommonHouses = 0;
let isInitialized = false;
let fireworks = [];

// ═══════════════════════════════════════════════════════
// Definição dos marcos da cidade
// ═══════════════════════════════════════════════════════

const MILESTONES = [
    { percent: 0, type: 'terrain', label: 'Terreno', emoji: '🌱' },
    { percent: 10, type: 'fountain', label: 'Chafariz', emoji: '⛲' },
    { percent: 20, type: 'shop', label: 'Loja', emoji: '🏪' },
    { percent: 30, type: 'car', label: 'Carro', emoji: '🚗' },
    { percent: 40, type: 'building', label: 'Prédio Comercial', emoji: '🏢' },
    { percent: 50, type: 'hospital', label: 'Hospital', emoji: '🏥' },
    { percent: 60, type: 'bus', label: 'Transporte', emoji: '🚌' },
    { percent: 70, type: 'mall', label: 'Shopping', emoji: '🏬' },
    { percent: 80, type: 'skyscraper', label: 'Arranha-céu', emoji: '🏗️' },
    { percent: 90, type: 'park', label: 'Parque', emoji: '🌳' },
    { percent: 100, type: 'celebration', label: 'Cidade Completa', emoji: '🎆' },
];

// Paleta de cores para a cidade (tons vibrantes e premium)
const COLORS = {
    ground: 0x1a3a2a,
    grass: 0x2d5a3e,
    road: 0x2c3440,
    roadLine: 0xf5c542,
    sidewalk: 0x4a5568,
    houseWall: 0xd4a76a,
    houseRoof: 0x8b4513,
    houseDoor: 0x5c3317,
    shopWall: 0x6366f1,
    shopAwning: 0xef4444,
    shopWindow: 0xa5f3fc,
    carBody: 0xef4444,
    carBody2: 0x3b82f6,
    carWindow: 0x93c5fd,
    carWheel: 0x1e1e1e,
    buildingWall: 0x64748b,
    buildingWindow: 0x38bdf8,
    buildingWindowLit: 0xfcd34d,
    hospitalWall: 0xf1f5f9,
    hospitalCross: 0xef4444,
    busBody: 0xf59e0b,
    busWindow: 0xa5f3fc,
    mallWall: 0x8b5cf6,
    mallGlass: 0x67e8f9,
    skyscraperWall: 0x475569,
    skyscraperGlass: 0x22d3ee,
    parkTree: 0x22c55e,
    parkTrunk: 0x78350f,
    parkBench: 0x92400e,
    celebrationGold: 0xf59e0b,
    ambient: 0x4a6fa1,
    sunLight: 0xfff5e6,
};

// ═══════════════════════════════════════════════════════
// Inicialização
// ═══════════════════════════════════════════════════════

/**
 * Inicializa a cena Three.js.
 * @param {HTMLCanvasElement} canvas - O canvas para renderização
 */
export function initCity(canvas) {
    if (!canvas || typeof THREE === 'undefined') {
        console.warn('Three.js ou canvas não encontrado. Cidade 3D não será inicializada.');
        return;
    }

    // Cena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1929);
    scene.fog = new THREE.FogExp2(0x0c1929, 0.012);

    // Câmera isométrica (perspectiva com ângulo fixo)
    const aspect = canvas.clientWidth / canvas.clientHeight;
    camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 1000);
    camera.position.set(18, 16, 18);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Iluminação
    setupLighting();

    // Controles de Órbita
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Evitar passar por baixo do chão
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5; // Velocidade da rotação automática

    // Grupo da cidade
    cityGroup = new THREE.Group();
    scene.add(cityGroup);

    isInitialized = true;

    // Iniciar loop de animação
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
        if (!canvas.parentElement) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
    resizeObserver.observe(canvas);
}

function setupLighting() {
    // Luz ambiente suave
    const ambient = new THREE.AmbientLight(COLORS.ambient, 0.6);
    scene.add(ambient);

    // Luz direcional principal (sol)
    const sun = new THREE.DirectionalLight(COLORS.sunLight, 1.4);
    sun.position.set(10, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    // Luz hemisférica para preencher sombras
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x1a3a2a, 0.4);
    scene.add(hemi);

    // Ponto de luz quente para dar mood
    const warmPoint = new THREE.PointLight(0xffa500, 0.3, 30);
    warmPoint.position.set(-5, 8, -5);
    scene.add(warmPoint);
}

// ═══════════════════════════════════════════════════════
// Construtores de elementos
// ═══════════════════════════════════════════════════════

function createMaterial(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.7,
        metalness: opts.metalness ?? 0.1,
        ...opts
    });
}

// ── Terreno Base ──
function buildTerrain() {
    const group = new THREE.Group();

    // Chão principal
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = createMaterial(COLORS.ground, { roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    group.add(ground);

    // Grama patches
    for (let i = 0; i < 12; i++) {
        const gx = (Math.random() - 0.5) * 20;
        const gz = (Math.random() - 0.5) * 20;
        // Evita colocar grama na estrada
        if (Math.abs(gx) < 2 || Math.abs(gz) < 2) continue;
        const grassGeo = new THREE.PlaneGeometry(1.5 + Math.random(), 1.5 + Math.random());
        const grassMat = createMaterial(COLORS.grass, { roughness: 1 });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(gx, 0.005, gz);
        grass.receiveShadow = true;
        group.add(grass);
    }

    // Ruas em cruz
    const roadGeo = new THREE.PlaneGeometry(2.5, 30);
    const roadMat = createMaterial(COLORS.road, { roughness: 0.9 });

    const roadH = new THREE.Mesh(roadGeo, roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.y = 0.01;
    roadH.receiveShadow = true;
    group.add(roadH);

    const roadV = new THREE.Mesh(roadGeo.clone(), roadMat.clone());
    roadV.rotation.x = -Math.PI / 2;
    roadV.rotation.z = Math.PI / 2;
    roadV.position.y = 0.01;
    roadV.receiveShadow = true;
    group.add(roadV);

    // Linhas tracejadas amarelas na rua
    for (let i = -12; i < 13; i += 2) {
        const lineGeo = new THREE.PlaneGeometry(0.08, 0.6);
        const lineMat = createMaterial(COLORS.roadLine, { emissive: COLORS.roadLine, emissiveIntensity: 0.3 });

        const lineH = new THREE.Mesh(lineGeo, lineMat);
        lineH.rotation.x = -Math.PI / 2;
        lineH.position.set(0, 0.02, i);
        group.add(lineH);

        const lineV = new THREE.Mesh(lineGeo.clone(), lineMat.clone());
        lineV.rotation.x = -Math.PI / 2;
        lineV.rotation.z = Math.PI / 2;
        lineV.position.set(i, 0.02, 0);
        group.add(lineV);
    }

    // Calçadas
    const sidewalkGeo = new THREE.BoxGeometry(1, 0.15, 30);
    const sidewalkMat = createMaterial(COLORS.sidewalk, { roughness: 0.9 });

    [1.75, -1.75].forEach(x => {
        const sw = new THREE.Mesh(sidewalkGeo, sidewalkMat);
        sw.position.set(x, 0.075, 0);
        sw.receiveShadow = true;
        sw.castShadow = true;
        group.add(sw);
    });

    const sidewalkGeoH = new THREE.BoxGeometry(30, 0.15, 1);
    [1.75, -1.75].forEach(z => {
        const sw = new THREE.Mesh(sidewalkGeoH, sidewalkMat.clone());
        sw.position.set(0, 0.075, z);
        sw.receiveShadow = true;
        sw.castShadow = true;
        group.add(sw);
    });

    return group;
}

// ── Casa Residencial ──
function buildHouse() {
    const group = new THREE.Group();
    group.position.set(4, 0, 4);

    // Corpo da casa
    const bodyGeo = new THREE.BoxGeometry(2.2, 1.6, 2);
    const bodyMat = createMaterial(COLORS.houseWall);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Telhado
    const roofGeo = new THREE.ConeGeometry(1.8, 1, 4);
    const roofMat = createMaterial(COLORS.houseRoof);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.1;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Porta
    const doorGeo = new THREE.BoxGeometry(0.4, 0.7, 0.05);
    const doorMat = createMaterial(COLORS.houseDoor);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.5, 1.02);
    group.add(door);

    // Janelas
    const winGeo = new THREE.BoxGeometry(0.35, 0.35, 0.05);
    const winMat = createMaterial(0xa5f3fc, { emissive: 0xa5f3fc, emissiveIntensity: 0.2 });
    [-0.55, 0.55].forEach(x => {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(x, 1.1, 1.02);
        group.add(win);
    });

    return group;
}

// ── Loja/Comércio ──
function buildShop() {
    const group = new THREE.Group();
    group.position.set(-3.5, 0, 3.5);

    // Corpo
    const bodyGeo = new THREE.BoxGeometry(2.5, 1.8, 2.2);
    const bodyMat = createMaterial(COLORS.shopWall);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Vitrine (frente de vidro)
    const glassGeo = new THREE.BoxGeometry(2, 1.2, 0.05);
    const glassMat = createMaterial(COLORS.shopWindow, {
        transparent: true, opacity: 0.5,
        emissive: COLORS.shopWindow, emissiveIntensity: 0.3
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 0.8, 1.12);
    group.add(glass);

    // Toldo
    const awningGeo = new THREE.BoxGeometry(2.8, 0.08, 0.8);
    const awningMat = createMaterial(COLORS.shopAwning);
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 1.85, 1.4);
    awning.castShadow = true;
    group.add(awning);

    // Teto plano
    const roofGeo = new THREE.BoxGeometry(2.6, 0.1, 2.3);
    const roofMat = createMaterial(0x4b5563);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.85;
    group.add(roof);

    return group;
}

// ── Carro ──
function buildCar(color = COLORS.carBody, posX = 0.8, posZ = -3) {
    const group = new THREE.Group();
    group.position.set(posX, 0, posZ);

    // Corpo principal
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.5, 1.8);
    const bodyMat = createMaterial(color, { metalness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Cabine
    const cabinGeo = new THREE.BoxGeometry(0.75, 0.4, 0.9);
    const cabinMat = createMaterial(COLORS.carWindow, {
        transparent: true, opacity: 0.6,
        emissive: COLORS.carWindow, emissiveIntensity: 0.1
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.8, -0.1);
    group.add(cabin);

    // Rodas
    const wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12);
    const wheelMat = createMaterial(COLORS.carWheel);
    const wheelPositions = [
        [0.5, 0.15, 0.5], [-0.5, 0.15, 0.5],
        [0.5, 0.15, -0.5], [-0.5, 0.15, -0.5]
    ];
    wheelPositions.forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        wheel.castShadow = true;
        group.add(wheel);
    });

    return group;
}

// ── Prédio Comercial ──
function buildBuilding() {
    const group = new THREE.Group();
    group.position.set(5, 0, -4);

    const height = 4;
    // Corpo
    const bodyGeo = new THREE.BoxGeometry(2.5, height, 2.5);
    const bodyMat = createMaterial(COLORS.buildingWall);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Janelas
    const winGeo = new THREE.BoxGeometry(0.35, 0.4, 0.05);
    for (let floor = 0; floor < 4; floor++) {
        const y = 0.8 + floor * 0.9;
        [-0.7, 0, 0.7].forEach((x, i) => {
            const lit = Math.random() > 0.4;
            const winMat = createMaterial(
                lit ? COLORS.buildingWindowLit : COLORS.buildingWindow,
                { emissive: lit ? COLORS.buildingWindowLit : COLORS.buildingWindow, emissiveIntensity: lit ? 0.6 : 0.2 }
            );
            // Frente
            const winF = new THREE.Mesh(winGeo, winMat);
            winF.position.set(x, y, 1.27);
            group.add(winF);
            // Lado
            const winS = new THREE.Mesh(winGeo.clone(), winMat.clone());
            winS.rotation.y = Math.PI / 2;
            winS.position.set(1.27, y, x);
            group.add(winS);
        });
    }

    // Teto
    const roofGeo = new THREE.BoxGeometry(2.7, 0.15, 2.7);
    const roofMat = createMaterial(0x374151);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height + 0.075;
    group.add(roof);

    return group;
}

// ── Hospital ──
function buildHospital() {
    const group = new THREE.Group();
    group.position.set(-5, 0, -4);

    // Corpo
    const bodyGeo = new THREE.BoxGeometry(3, 2.5, 2.5);
    const bodyMat = createMaterial(COLORS.hospitalWall);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.25;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Cruz vermelha (duas barras cruzadas)
    const crossH = new THREE.BoxGeometry(0.8, 0.2, 0.05);
    const crossV = new THREE.BoxGeometry(0.2, 0.8, 0.05);
    const crossMat = createMaterial(COLORS.hospitalCross, {
        emissive: COLORS.hospitalCross, emissiveIntensity: 0.4
    });

    const ch = new THREE.Mesh(crossH, crossMat);
    ch.position.set(0, 2, 1.27);
    group.add(ch);

    const cv = new THREE.Mesh(crossV, crossMat.clone());
    cv.position.set(0, 2, 1.27);
    group.add(cv);

    // Janelas
    const winGeo = new THREE.BoxGeometry(0.5, 0.5, 0.05);
    const winMat = createMaterial(0xa5f3fc, { emissive: 0xa5f3fc, emissiveIntensity: 0.3 });
    [[-1, 1], [1, 1], [-1, 0.4], [1, 0.4]].forEach(([x, y]) => {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(x, y, 1.27);
        group.add(win);
    });

    // Teto
    const roofGeo = new THREE.BoxGeometry(3.2, 0.12, 2.7);
    const roofMat = createMaterial(0x94a3b8);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.56;
    group.add(roof);

    return group;
}

// ── Ônibus ──
function buildBus() {
    const group = new THREE.Group();
    group.position.set(-0.8, 0, 5);
    group.rotation.y = 0;

    // Corpo
    const bodyGeo = new THREE.BoxGeometry(1.2, 1.1, 3);
    const bodyMat = createMaterial(COLORS.busBody, { metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    // Janelas
    const winGeo = new THREE.BoxGeometry(0.05, 0.4, 0.5);
    const winMat = createMaterial(COLORS.busWindow, {
        transparent: true, opacity: 0.6,
        emissive: COLORS.busWindow, emissiveIntensity: 0.2
    });
    for (let i = -1; i <= 1; i++) {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(0.62, 0.9, i * 0.7);
        group.add(win);
    }

    // Rodas
    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12);
    const wheelMat = createMaterial(COLORS.carWheel);
    [[0.65, 0.2, 1], [-0.65, 0.2, 1], [0.65, 0.2, -1], [-0.65, 0.2, -1]].forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        group.add(wheel);
    });

    return group;
}

// ── Shopping/Mall ──
function buildMall() {
    const group = new THREE.Group();
    group.position.set(-7.5, 0, 6);

    // Corpo
    const bodyGeo = new THREE.BoxGeometry(3.5, 3, 3);
    const bodyMat = createMaterial(COLORS.mallWall);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.5;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Fachada de vidro
    const glassGeo = new THREE.BoxGeometry(3, 2.5, 0.05);
    const glassMat = createMaterial(COLORS.mallGlass, {
        transparent: true, opacity: 0.4,
        emissive: COLORS.mallGlass, emissiveIntensity: 0.3
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 1.5, 1.52);
    group.add(glass);

    // Letreiro
    const signGeo = new THREE.BoxGeometry(2, 0.3, 0.1);
    const signMat = createMaterial(0xfbbf24, { emissive: 0xfbbf24, emissiveIntensity: 0.5 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.8, 1.55);
    group.add(sign);

    // Teto
    const roofGeo = new THREE.BoxGeometry(3.7, 0.15, 3.2);
    const roofMat = createMaterial(0x4c1d95);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3.075;
    group.add(roof);

    return group;
}

// ── Arranha-céu ──
function buildSkyscraper() {
    const group = new THREE.Group();
    group.position.set(8, 0, 8);

    const height = 8;
    // Corpo
    const bodyGeo = new THREE.BoxGeometry(2.5, height, 2.5);
    const bodyMat = createMaterial(COLORS.skyscraperWall, { metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Faixas de vidro por andar
    for (let floor = 0; floor < 8; floor++) {
        const y = 0.5 + floor * 0.95;
        const glassGeo = new THREE.BoxGeometry(2.3, 0.4, 0.05);
        const lit = Math.random() > 0.3;
        const glassMat = createMaterial(
            lit ? COLORS.buildingWindowLit : COLORS.skyscraperGlass,
            {
                emissive: lit ? COLORS.buildingWindowLit : COLORS.skyscraperGlass,
                emissiveIntensity: lit ? 0.5 : 0.3,
                transparent: !lit,
                opacity: lit ? 1 : 0.6
            }
        );
        // Frente e atrás
        const glassF = new THREE.Mesh(glassGeo, glassMat);
        glassF.position.set(0, y, 1.27);
        group.add(glassF);

        const glassB = new THREE.Mesh(glassGeo.clone(), glassMat.clone());
        glassB.position.set(0, y, -1.27);
        group.add(glassB);

        // Lados
        const glassGeoS = new THREE.BoxGeometry(0.05, 0.4, 2.3);
        const glassMat2 = glassMat.clone();
        const glassL = new THREE.Mesh(glassGeoS, glassMat2);
        glassL.position.set(1.27, y, 0);
        group.add(glassL);

        const glassR = new THREE.Mesh(glassGeoS.clone(), glassMat2.clone());
        glassR.position.set(-1.27, y, 0);
        group.add(glassR);
    }

    // Antena no topo
    const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
    const antennaMat = createMaterial(0x94a3b8, { metalness: 0.8 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = height + 0.75;
    group.add(antenna);

    // Luz de aviso no topo
    const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const lightMat = createMaterial(0xff0000, { emissive: 0xff0000, emissiveIntensity: 1 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.y = height + 1.55;
    group.add(light);

    return group;
}

// ── Parque ──
function buildPark() {
    const group = new THREE.Group();
    group.position.set(5, 0, -8);

    // Área verde
    const areaGeo = new THREE.PlaneGeometry(4, 4);
    const areaMat = createMaterial(COLORS.grass, { roughness: 1 });
    const area = new THREE.Mesh(areaGeo, areaMat);
    area.rotation.x = -Math.PI / 2;
    area.position.y = 0.02;
    area.receiveShadow = true;
    group.add(area);

    // Árvores
    function makeTree(x, z, height = 1.5) {
        const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, height * 0.6, 8);
        const trunkMat = createMaterial(COLORS.parkTrunk);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, height * 0.3, z);
        trunk.castShadow = true;
        group.add(trunk);

        const leafGeo = new THREE.SphereGeometry(height * 0.45, 8, 8);
        const leafMat = createMaterial(COLORS.parkTree);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(x, height * 0.75, z);
        leaf.castShadow = true;
        group.add(leaf);
    }

    makeTree(-1, -1, 1.8);
    makeTree(1, 0.5, 1.5);
    makeTree(-0.5, 1.2, 1.3);
    makeTree(1.2, -1.3, 2);

    // Banco de praça
    const benchSeatGeo = new THREE.BoxGeometry(1, 0.08, 0.35);
    const benchMat = createMaterial(COLORS.parkBench);
    const seat = new THREE.Mesh(benchSeatGeo, benchMat);
    seat.position.set(0, 0.35, 0);
    seat.castShadow = true;
    group.add(seat);

    // Pernas do banco
    const legGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
    [[-0.4, 0.175, 0.12], [0.4, 0.175, 0.12], [-0.4, 0.175, -0.12], [0.4, 0.175, -0.12]].forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeo, benchMat.clone());
        leg.position.set(x, y, z);
        group.add(leg);
    });

    return group;
}

// ── Celebração (efeito especial) ──
function buildCelebration() {
    const group = new THREE.Group();

    // Pedestal dourado no centro
    const pedestalGeo = new THREE.CylinderGeometry(0.8, 1, 0.4, 16);
    const pedestalMat = createMaterial(COLORS.celebrationGold, {
        metalness: 0.8, roughness: 0.2,
        emissive: COLORS.celebrationGold, emissiveIntensity: 0.3
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, 0.2, 0);
    group.add(pedestal);

    // Estrela/troféu dourado
    const starGeo = new THREE.OctahedronGeometry(0.5, 0);
    const starMat = createMaterial(COLORS.celebrationGold, {
        metalness: 0.9, roughness: 0.1,
        emissive: COLORS.celebrationGold, emissiveIntensity: 0.6
    });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(0, 1.2, 0);
    star.userData.isStar = true;
    group.add(star);

    // Luz dourada radiante
    const goldLight = new THREE.PointLight(0xf59e0b, 2, 15);
    goldLight.position.set(0, 3, 0);
    group.add(goldLight);

    // Partículas douradas (esferas pequenas orbitando)
    for (let i = 0; i < 20; i++) {
        const particleGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const particleMat = createMaterial(COLORS.celebrationGold, {
            emissive: COLORS.celebrationGold, emissiveIntensity: 0.8
        });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        const angle = (i / 20) * Math.PI * 2;
        const radius = 2 + Math.random() * 2;
        const height = 1 + Math.random() * 4;
        particle.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        particle.userData.orbitAngle = angle;
        particle.userData.orbitRadius = radius;
        particle.userData.orbitHeight = height;
        particle.userData.orbitSpeed = 0.3 + Math.random() * 0.5;
        particle.userData.isParticle = true;
        group.add(particle);
    }

    return group;
}

// ── Chafariz (Fountain) ──
function buildFountain() {
    const group = new THREE.Group();
    group.position.set(4, 0, 4);

    // Base
    const baseGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.3, 16);
    const baseMat = createMaterial(0x94a3b8, { roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    base.receiveShadow = true;
    base.castShadow = true;
    group.add(base);

    // Água
    const waterGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.1, 16);
    const waterMat = createMaterial(0x38bdf8, { transparent: true, opacity: 0.8, emissive: 0x0284c7, emissiveIntensity: 0.5 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.35;
    group.add(water);

    // Pilar central
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.2, 8);
    const pillar = new THREE.Mesh(pillarGeo, baseMat);
    pillar.position.y = 0.9;
    pillar.castShadow = true;
    group.add(pillar);

    // Topo do chafariz
    const topGeo = new THREE.CylinderGeometry(0.8, 0.2, 0.2, 8);
    const top = new THREE.Mesh(topGeo, baseMat);
    top.position.y = 1.6;
    top.castShadow = true;
    group.add(top);

    // Jato de água
    const jetGeo = new THREE.CylinderGeometry(0.05, 0.1, 0.6, 8);
    const jet = new THREE.Mesh(jetGeo, waterMat);
    jet.position.y = 1.9;
    group.add(jet);

    return group;
}

// ── Campo de Futebol ──
function buildSoccerField() {
    const group = new THREE.Group();
    group.position.set(-8, 0, -8);

    const fieldGeo = new THREE.PlaneGeometry(6, 4);
    const fieldMat = createMaterial(0x166534);
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.rotation.x = -Math.PI / 2;
    field.position.y = 0.03;
    field.receiveShadow = true;
    group.add(field);

    const linesGeo = new THREE.PlaneGeometry(5.6, 3.6);
    const linesMat = createMaterial(0xffffff, { transparent: true, opacity: 0.8 });
    const lines = new THREE.Mesh(linesGeo, linesMat);
    lines.rotation.x = -Math.PI / 2;
    lines.position.y = 0.035;
    group.add(lines);

    const innerGeo = new THREE.PlaneGeometry(5.4, 3.4);
    const innerMat = createMaterial(0x166534);
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.04;
    group.add(inner);
    
    const goalGeo = new THREE.BoxGeometry(0.2, 0.6, 1.2);
    const goalMat = createMaterial(0xffffff);
    
    const goal1 = new THREE.Mesh(goalGeo, goalMat);
    goal1.position.set(-2.7, 0.3, 0);
    goal1.castShadow = true;
    group.add(goal1);
    
    const goal2 = new THREE.Mesh(goalGeo, goalMat);
    goal2.position.set(2.7, 0.3, 0);
    goal2.castShadow = true;
    group.add(goal2);

    return group;
}

// ═══════════════════════════════════════════════════════
// Mapa tipo → construtor
// ═══════════════════════════════════════════════════════

const BUILDERS = {
    terrain: buildTerrain,
    house: buildHouse,
    fountain: buildFountain,
    shop: buildShop,
    car: () => buildCar(COLORS.carBody, 0.8, -3),
    building: buildBuilding,
    hospital: buildHospital,
    bus: buildBus,
    mall: buildMall,
    skyscraper: buildSkyscraper,
    park: buildPark,
    celebration: buildCelebration,
};

// ═══════════════════════════════════════════════════════
// Atualizar cidade conforme progresso
// ═══════════════════════════════════════════════════════

/**
 * Atualiza a cidade para refletir o percentual de progresso da meta e casas comuns.
 * @param {number} percent - Percentual (0-100) da meta atingida
 * @param {number} monthsHit - Quantidade de meses que a meta mensal foi atingida
 * @returns {Object|null} Info do último marco atingido (para overlay UI)
 */
export function updateCity(percent, monthsHit = 0) {
    if (!isInitialized || !cityGroup) return null;

    currentPercent = percent;
    let lastMilestone = null;

    MILESTONES.forEach(milestone => {
        if (percent >= milestone.percent && !activeMilestones.has(milestone.percent)) {
            // Construir e adicionar
            const builder = BUILDERS[milestone.type];
            if (builder) {
                const element = builder();
                element.userData.milestonePercent = milestone.percent;

                // Animação de entrada (scale up)
                element.scale.set(0, 0, 0);
                cityGroup.add(element);

                animateEntry(element);
                activeMilestones.add(milestone.percent);
                lastMilestone = milestone;
            }
        }
    });

    // Adicionar campo de futebol no milestone de 60%
    if (percent >= 60 && !activeMilestones.has('soccer-field')) {
        const field = buildSoccerField();
        field.scale.set(0, 0, 0);
        cityGroup.add(field);
        animateEntry(field);
        activeMilestones.add('soccer-field');
    }

    // Adicionar casas comuns (para metas mensais atingidas)
    while (renderedCommonHouses < monthsHit) {
        const house = placeCommonHouse(renderedCommonHouses);
        house.scale.set(0, 0, 0);
        cityGroup.add(house);
        animateEntry(house);
        renderedCommonHouses++;
    }

    return lastMilestone;
}

function placeCommonHouse(index) {
    const validSpots = [];
    for (let x = -13; x <= 13; x += 3.5) {
        for (let z = -13; z <= 13; z += 3.5) {
            // avoid center area where special milestones go
            if (x > -8 && x < 8 && z > -10 && z < 8) continue;
            // avoid roads (x=0, z=0 approx)
            if (Math.abs(x) < 3.5 || Math.abs(z) < 3.5) continue;
            validSpots.push({ x, z });
        }
    }

    const spot = validSpots[index % validSpots.length];
    const house = buildHouse();

    // Override position to put it in the outskirts
    house.position.set(spot.x + (Math.random() * 0.5 - 0.25), 0, spot.z + (Math.random() * 0.5 - 0.25));
    // Random rotation (0, 90, 180, 270 degrees)
    house.rotation.y = (Math.floor(Math.random() * 4)) * (Math.PI / 2);

    return house;
}

/**
 * Anima a entrada de um novo elemento na cena (scale 0 → 1).
 */
function animateEntry(object) {
    const target = { s: 0 };
    const startTime = performance.now();
    const duration = 600;

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out back
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const eased = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);

        object.scale.set(eased, eased, eased);

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

/**
 * Reseta a cidade, removendo todos os elementos.
 */
export function resetCity() {
    if (!cityGroup) return;

    while (cityGroup.children.length > 0) {
        const child = cityGroup.children[0];
        cityGroup.remove(child);
        disposeGroup(child);
    }

    activeMilestones.clear();
    currentPercent = 0;
    renderedCommonHouses = 0;

    fireworks.forEach(fw => {
        if (fw.geometry) fw.geometry.dispose();
        if (fw.material) fw.material.dispose();
    });
    fireworks = [];
}

function disposeGroup(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
        } else {
            obj.material.dispose();
        }
    }
    if (obj.children) {
        obj.children.forEach(child => disposeGroup(child));
    }
}

/**
 * Retorna a lista de marcos e qual o mais recente atingido.
 * @param {number} percent
 * @returns {Object}
 */
export function getMilestoneInfo(percent) {
    let lastReached = MILESTONES[0];
    for (const m of MILESTONES) {
        if (percent >= m.percent) {
            lastReached = m;
        }
    }
    return {
        milestones: MILESTONES,
        current: lastReached,
        percent: Math.min(percent, 100)
    };
}

// ═══════════════════════════════════════════════════════
// Loop de animação
// ═══════════════════════════════════════════════════════

let time = 0;

function animate() {
    animationId = requestAnimationFrame(animate);
    time += 0.01;

    if (!isInitialized || !renderer || !scene || !camera) return;

    // Atualizar controles (damping e auto-rotação)
    if (controls) controls.update();

    // Animar partículas de celebração
    if (cityGroup) {
        cityGroup.traverse((child) => {
            if (child.userData.isParticle) {
                child.userData.orbitAngle += child.userData.orbitSpeed * 0.02;
                child.position.x = Math.cos(child.userData.orbitAngle) * child.userData.orbitRadius;
                child.position.z = Math.sin(child.userData.orbitAngle) * child.userData.orbitRadius;
                child.position.y = child.userData.orbitHeight + Math.sin(time * 2 + child.userData.orbitAngle) * 0.3;
            }
            if (child.userData.isStar) {
                child.rotation.y = time * 0.5;
                child.rotation.x = Math.sin(time) * 0.2;
            }
        });
    }

    // Lógica dos Fogos de Artifício (quando 100%)
    if (currentPercent >= 100 && cityGroup) {
        if (Math.random() < 0.04) {
            const color = new THREE.Color().setHSL(Math.random(), 1, 0.6);
            const fw = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 8, 8),
                new THREE.MeshBasicMaterial({ color: color })
            );
            
            // Nas extremidades (borda do terreno 35x35 -> -17 a 17)
            const edge = Math.floor(Math.random() * 4);
            let x = 0, z = 0;
            if (edge === 0) { x = -16; z = (Math.random() - 0.5) * 32; }
            if (edge === 1) { x = 16; z = (Math.random() - 0.5) * 32; }
            if (edge === 2) { x = (Math.random() - 0.5) * 32; z = -16; }
            if (edge === 3) { x = (Math.random() - 0.5) * 32; z = 16; }
            
            fw.position.set(x, 0, z);
            fw.userData = { phase: 'launch', velY: 0.15 + Math.random() * 0.1, targetY: 6 + Math.random() * 6 };
            cityGroup.add(fw);
            fireworks.push(fw);
        }

        for (let i = fireworks.length - 1; i >= 0; i--) {
            const fw = fireworks[i];
            if (fw.userData.phase === 'launch') {
                fw.position.y += fw.userData.velY;
                if (fw.position.y >= fw.userData.targetY) {
                    fw.userData.phase = 'explode';
                    fw.userData.life = 1.0;
                    fw.material.transparent = true;
                }
            } else if (fw.userData.phase === 'explode') {
                fw.userData.life -= 0.025;
                fw.scale.addScalar(0.4);
                fw.material.opacity = fw.userData.life;
                if (fw.userData.life <= 0) {
                    cityGroup.remove(fw);
                    fw.geometry.dispose();
                    fw.material.dispose();
                    fireworks.splice(i, 1);
                }
            }
        }
    }

    renderer.render(scene, camera);
}

/**
 * Para/resume a animação da cidade.
 * @param {boolean} active
 */
export function setCityActive(active) {
    // A animação roda sempre, mas podemos pausar se necessário
    // Por ora, mantém rodando para transição suave
}

/**
 * Verifica se a cidade foi inicializada.
 */
export function isCityInitialized() {
    return isInitialized;
}
