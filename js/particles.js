/**
 * particles.js
 * Fundo de partículas interativo em Vanilla JS usando Canvas API.
 * As partículas flutuam lentamente e reagem magneticamente ao cursor do mouse.
 * Suporta troca de tema de cor (reativo ao estado da aplicação).
 */

const canvas = document.getElementById('particles-bg');
const ctx = canvas.getContext('2d');

let particles = [];
let mouse = { x: null, y: null };

// Configuração responsiva
const isMobile = window.innerWidth < 768;
const particleCount = isMobile ? 45 : 90;
const connectionDistance = isMobile ? 100 : 140;
const mouseRadius = isMobile ? 100 : 160;

// Tema de cores (default: neutro cinza-azulado)
let theme = {
    particle: { r: 148, g: 163, b: 184 },     // --color-text-secondary
    line: { r: 148, g: 163, b: 184 },
    bg: 'rgba(15, 23, 42, 0.18)'                // Rastro translúcido
};

/**
 * Atualiza as cores das partículas com base no estado da aplicação.
 * Chamada externamente pelo ui.js.
 * @param {'neutral'|'success'|'alert'|'gold'} state
 */
export function setParticleTheme(state) {
    switch (state) {
        case 'success':
            theme.particle = { r: 16, g: 185, b: 129 };   // Verde Esmeralda
            theme.line = { r: 16, g: 185, b: 129 };
            break;
        case 'gold':
            theme.particle = { r: 245, g: 158, b: 11 };    // Ouro
            theme.line = { r: 245, g: 158, b: 11 };
            break;
        case 'alert':
            theme.particle = { r: 239, g: 68, b: 68 };     // Vermelho sutil
            theme.line = { r: 200, g: 80, b: 80 };
            break;
        default:
            theme.particle = { r: 148, g: 163, b: 184 };
            theme.line = { r: 148, g: 163, b: 184 };
    }
}

// Ajusta o tamanho do canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
});

// Atualiza a posição do mouse
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Limpa a posição do mouse ao sair da tela
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.baseSpeedX = (Math.random() - 0.5) * 0.4;
        this.baseSpeedY = (Math.random() - 0.5) * 0.4;
        this.speedX = this.baseSpeedX;
        this.speedY = this.baseSpeedY;
        this.opacity = Math.random() * 0.5 + 0.1;
        // 10% das partículas brilham mais (glow)
        this.isGlow = Math.random() < 0.1;
        this.glowSize = this.isGlow ? this.size * 3 : 0;
    }

    update() {
        // Movimento natural com drift lento
        this.x += this.speedX;
        this.y += this.speedY;

        // Rebater suavemente nas bordas
        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;

        // Interação magnética com o cursor
        if (mouse.x != null && mouse.y != null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouseRadius) {
                const force = (mouseRadius - distance) / mouseRadius;
                const dirX = dx / distance;
                const dirY = dy / distance;
                // Atração suave
                this.x += dirX * force * 1.8;
                this.y += dirY * force * 1.8;
            }
        }
    }

    draw() {
        const { r, g, b } = theme.particle;

        // Glow effect para partículas especiais
        if (this.isGlow) {
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${this.opacity * 0.6})`;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity * 0.8})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function connectParticles() {
    const { r, g, b } = theme.line;
    const maxDist = connectionDistance * connectionDistance;

    for (let a = 0; a < particles.length; a++) {
        for (let b2 = a + 1; b2 < particles.length; b2++) {
            const dx = particles[a].x - particles[b2].x;
            const dy = particles[a].y - particles[b2].y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxDist) {
                const opacity = (1 - distSq / maxDist) * 0.15;
                if (opacity > 0.01) {
                    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b2].x, particles[b2].y);
                    ctx.stroke();
                }
            }
        }
    }
}

function animate() {
    // Rastro translúcido para efeito orgânico
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }

    connectParticles();
    requestAnimationFrame(animate);
}

// Iniciar o sistema de partículas
resizeCanvas();
initParticles();
animate();
