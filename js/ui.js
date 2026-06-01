/**
 * ui.js
 * Manipulação do DOM e renderização gráfica (Chart.js).
 * Responsável pela atualização cirúrgica do DOM, animações de valor,
 * SVG ring, timeline, toasts e gerenciamento de estados visuais.
 */
import { calcularMetricas } from './state.js';
import { setParticleTheme } from './particles.js';

// Instância única do gráfico Chart.js
let chartInstance = null;

// Cache do último valor renderizado no Orbe (para animação incremental)
let lastRenderedValue = 0;

// ═══════════════════════════════════════════════════════
// Utilitários
// ═══════════════════════════════════════════════════════

/**
 * Formata um número para o formato de moeda Real (BRL).
 * @param {number} valor
 * @returns {string}
 */
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

/**
 * Anima a contagem de um valor numérico em um elemento, usando requestAnimationFrame.
 * Cria efeito de "counting up" que reforça visualmente o progresso.
 * @param {HTMLElement} element - Elemento DOM cujo textContent será atualizado
 * @param {number} start - Valor inicial da contagem
 * @param {number} end - Valor final da contagem
 * @param {number} duration - Duração da animação em ms
 * @param {function} formatter - Função de formatação (ex: formatarMoeda)
 */
function animateValue(element, start, end, duration, formatter) {
    if (!element) return;

    // Se a diferença for insignificante, setar direto
    if (Math.abs(end - start) < 0.01) {
        element.textContent = formatter(end);
        return;
    }

    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Curva ease-out para desacelerar no final
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = start + (end - start) * eased;

        element.textContent = formatter(currentValue);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = formatter(end);
        }
    }

    requestAnimationFrame(step);
}

/**
 * Atualiza o SVG ring de progresso do Orbe.
 * @param {number} percent - Percentual de economia (0-100+)
 */
function updateOrbRing(percent) {
    const ring = document.getElementById('orb-ring-fill');
    if (!ring) return;

    // Limita a 100% para visualização do ring
    const clampedPercent = Math.min(Math.max(percent, 0), 100);
    const circumference = 339.29; // 2 × π × 54
    const offset = circumference - (clampedPercent / 100) * circumference;

    ring.style.strokeDashoffset = offset;
}

/**
 * Calcula a streak atual de meses consecutivos atingindo a meta.
 * @param {Array} registros - Lista de registros mensais
 * @param {number} meta - Percentual da meta de economia
 * @returns {number} Streak atual
 */
function calcularStreak(registros, meta) {
    let streak = 0;
    // Percorre do final para o início
    for (let i = registros.length - 1; i >= 0; i--) {
        const reg = registros[i];
        const percent = reg.renda > 0 ? (reg.economizado / reg.renda) * 100 : 0;
        if (percent >= meta) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// ═══════════════════════════════════════════════════════
// Toast System
// ═══════════════════════════════════════════════════════

/**
 * Exibe uma notificação toast temporária.
 * @param {string} message - Mensagem a exibir
 * @param {'success'|'alert'|'neutral'} type - Tipo visual do toast
 * @param {number} duration - Duração em ms antes de desaparecer
 */
export function showToast(message, type = 'neutral', duration = 2500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type !== 'neutral' ? `is-${type}` : ''}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('is-leaving');
        toast.addEventListener('animationend', () => {
            toast.remove();
        }, { once: true });
    }, duration);
}

// ═══════════════════════════════════════════════════════
// Empty State
// ═══════════════════════════════════════════════════════

/**
 * Alterna a visibilidade do empty state.
 * @param {boolean} show - true para exibir, false para esconder
 */
function renderEmptyState(show) {
    const el = document.getElementById('empty-state');
    const dataFlow = document.getElementById('data-flow');
    const timeline = document.getElementById('records-timeline');

    if (el) el.classList.toggle('is-hidden', !show);
    if (dataFlow) dataFlow.classList.toggle('is-hidden', show);
    if (timeline) timeline.classList.toggle('is-hidden', show);
}

// ═══════════════════════════════════════════════════════
// Records Timeline
// ═══════════════════════════════════════════════════════

/**
 * Renderiza a timeline vertical de registros mensais.
 * Cada registro é um nó com indicador de estado (sucesso/alerta/ouro).
 * @param {Array} registros - Lista de registros do appState
 * @param {number} meta - Meta de economia em %
 */
function renderTimeline(registros, meta) {
    const container = document.getElementById('records-timeline');
    if (!container) return;

    // Limpa a timeline existente
    container.innerHTML = '';

    // Renderiza do mais recente para o mais antigo
    const reversed = [...registros].reverse();
    const streak = calcularStreak(registros, meta);

    reversed.forEach((reg, displayIndex) => {
        const realIndex = registros.length - 1 - displayIndex;
        const percent = reg.renda > 0 ? (reg.economizado / reg.renda) * 100 : 0;
        const hitMeta = percent >= meta;

        // Determina se esse registro faz parte da streak de ouro
        const isInGoldStreak = streak >= 3 && realIndex >= registros.length - streak;

        // Cria o nó
        const node = document.createElement('div');
        node.className = 'timeline-node';
        if (isInGoldStreak) {
            node.classList.add('is-gold');
        } else if (hitMeta) {
            node.classList.add('is-success');
        } else {
            node.classList.add('is-alert');
        }

        // Delay escalonado para animação de entrada
        node.style.animationDelay = `${displayIndex * 0.06}s`;

        // Determinar texto do badge
        let badgeClass = hitMeta ? 'is-success' : 'is-alert';
        if (isInGoldStreak) badgeClass = 'is-gold';
        const badgeText = `${percent.toFixed(1)}%`;

        node.innerHTML = `
            <div class="timeline-header">
                <span class="timeline-month">${reg.mes}</span>
                <span class="timeline-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="timeline-details">
                <span><span class="timeline-detail-label">Renda:</span><span class="timeline-detail-value">${formatarMoeda(reg.renda)}</span></span>
                <span><span class="timeline-detail-label">Aporte:</span><span class="timeline-detail-value">${formatarMoeda(reg.economizado)}</span></span>
            </div>
        `;

        container.appendChild(node);
    });
}

// ═══════════════════════════════════════════════════════
// Main Dashboard Render
// ═══════════════════════════════════════════════════════

/**
 * Atualiza o DOM com base no estado atualizado da aplicação.
 * Orquestra a renderização de todos os componentes visuais.
 * @param {Object} state - O estado da aplicação (appState)
 */
export function renderDashboard(state) {
    const metricas = calcularMetricas();
    const hasRecords = state.registrosMensais.length > 0;

    // ── Empty State ──
    renderEmptyState(!hasRecords);

    // ── Orbe: Animated Value ──
    const orbValue = document.getElementById('orb-value');
    if (orbValue) {
        animateValue(
            orbValue,
            lastRenderedValue,
            metricas.totalEconomizado,
            800,
            formatarMoeda
        );
        lastRenderedValue = metricas.totalEconomizado;
    }

    // ── Orbe: Percent Display ──
    const orbPercent = document.getElementById('orb-percent');
    if (orbPercent) {
        if (hasRecords) {
            orbPercent.textContent = `${metricas.percentualGeral.toFixed(1)}%`;
            orbPercent.classList.add('is-visible');
        } else {
            orbPercent.classList.remove('is-visible');
        }
    }

    // ── Orbe: SVG Ring ──
    updateOrbRing(hasRecords ? metricas.percentualGeral : 0);

    // ── State Classes (Comportamental) ──
    const orb = document.getElementById('heritage-orb');
    const omniBar = document.getElementById('form-registro-financeiro');
    const streak = calcularStreak(state.registrosMensais, state.metaEconomia);

    // Limpa estados anteriores
    if (orb) orb.classList.remove('is-success', 'is-alert', 'is-gold');
    if (omniBar) omniBar.classList.remove('is-success', 'is-alert');

    if (hasRecords) {
        const isGold = streak >= 3 && metricas.atingiuMetaGeral;

        if (isGold) {
            orb?.classList.add('is-gold');
            omniBar?.classList.add('is-success');
            setParticleTheme('gold');
        } else if (metricas.atingiuMetaGeral) {
            orb?.classList.add('is-success');
            omniBar?.classList.add('is-success');
            setParticleTheme('success');
        } else {
            orb?.classList.add('is-alert');
            omniBar?.classList.add('is-alert');
            setParticleTheme('alert');
        }
    } else {
        setParticleTheme('neutral');
    }

    // ── Chart ──
    if (hasRecords) {
        renderChart(state.registrosMensais);
    }

    // ── Timeline ──
    if (hasRecords) {
        renderTimeline(state.registrosMensais, state.metaEconomia);
    }
}

// ═══════════════════════════════════════════════════════
// Chart.js — Gráfico de Evolução Imersivo
// ═══════════════════════════════════════════════════════

/**
 * Inicializa ou reconstrói o gráfico do Chart.js com design imersivo.
 * Utiliza gradientes e styling dark-mode premium.
 * @param {Array} registros - Lista de registros mensais
 */
export function renderChart(registros) {
    const canvas = document.getElementById('chart-rendimentos');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destrói instância anterior para evitar conflito
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = registros.map(r => r.mes);
    const dadosRenda = registros.map(r => r.renda);
    const dadosEconomizado = registros.map(r => r.economizado);

    // Gradiente para a área de economizado
    const gradientEconomizado = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    gradientEconomizado.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    gradientEconomizado.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

    // Gradiente para a área de renda
    const gradientRenda = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    gradientRenda.addColorStop(0, 'rgba(100, 116, 139, 0.15)');
    gradientRenda.addColorStop(1, 'rgba(100, 116, 139, 0.02)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Renda (R$)',
                    data: dadosRenda,
                    backgroundColor: gradientRenda,
                    borderColor: 'rgba(100, 116, 139, 0.6)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#64748B',
                    pointBorderColor: 'rgba(15, 23, 42, 0.8)',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#94A3B8',
                    pointHoverBorderColor: '#fff'
                },
                {
                    label: 'Economizado (R$)',
                    data: dadosEconomizado,
                    backgroundColor: gradientEconomizado,
                    borderColor: '#10B981',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10B981',
                    pointBorderColor: 'rgba(15, 23, 42, 0.8)',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#10B981',
                    pointHoverBorderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#94A3B8',
                        font: {
                            family: "'Space Grotesk', sans-serif",
                            size: 12,
                            weight: '500'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 15, 30, 0.95)',
                    titleColor: '#F1F5F9',
                    bodyColor: '#94A3B8',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 12,
                    padding: 14,
                    titleFont: {
                        family: "'Space Grotesk', sans-serif",
                        weight: '600',
                        size: 13
                    },
                    bodyFont: {
                        family: "'Space Grotesk', sans-serif",
                        size: 12
                    },
                    displayColors: true,
                    boxPadding: 6,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748B',
                        font: {
                            family: "'Space Grotesk', sans-serif",
                            size: 11
                        },
                        padding: 8,
                        callback: function(value) {
                            if (value >= 1000) {
                                return `R$ ${(value / 1000).toFixed(1)}k`;
                            }
                            return `R$ ${value}`;
                        }
                    },
                    border: { display: false }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748B',
                        font: {
                            family: "'Space Grotesk', sans-serif",
                            size: 11
                        },
                        padding: 8
                    },
                    border: { display: false }
                }
            },
            elements: {
                line: {
                    borderJoinStyle: 'round'
                }
            },
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            }
        }
    });
}
