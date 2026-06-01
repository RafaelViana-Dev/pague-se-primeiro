/**
 * ui.js
 * Manipulação do DOM e renderização gráfica (Chart.js).
 * Responsável pela atualização cirúrgica do DOM, animações de valor,
 * SVG ring, timeline, toasts, toggle de vistas e barra de progresso.
 */
import { calcularMetricas, calcularProgressoMeta } from './state.js';
import { setParticleTheme } from './particles.js';
import { initCity, updateCity, resetCity, getMilestoneInfo, isCityInitialized } from './city.js';

// Instância única do gráfico Chart.js
let chartInstance = null;

// Cache do último valor renderizado no Orbe (para animação incremental)
let lastRenderedValue = 0;

// Estado do toggle de vista
let currentView = 'orbe'; // 'orbe' ou 'cidade'

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
 * Formata um número curto (ex: 100k, 1.5M).
 */
function formatarCurto(valor) {
    if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
    if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(1)}k`;
    return formatarMoeda(valor);
}

/**
 * Anima a contagem de um valor numérico em um elemento, usando requestAnimationFrame.
 * @param {HTMLElement} element
 * @param {number} start
 * @param {number} end
 * @param {number} duration - ms
 * @param {function} formatter
 */
function animateValue(element, start, end, duration, formatter) {
    if (!element) return;

    if (Math.abs(end - start) < 0.01) {
        element.textContent = formatter(end);
        return;
    }

    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
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
 * @param {number} percent
 */
function updateOrbRing(percent) {
    const ring = document.getElementById('orb-ring-fill');
    if (!ring) return;

    const clampedPercent = Math.min(Math.max(percent, 0), 100);
    const circumference = 339.29;
    const offset = circumference - (clampedPercent / 100) * circumference;

    ring.style.strokeDashoffset = offset;
}

/**
 * Calcula a streak atual de meses consecutivos atingindo a meta.
 * @param {Array} registros
 * @param {number} meta
 * @returns {number}
 */
function calcularStreak(registros, meta) {
    let streak = 0;
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
 * @param {string} message
 * @param {'success'|'alert'|'neutral'} type
 * @param {number} duration - ms
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

function renderEmptyState(show) {
    const el = document.getElementById('empty-state');
    const dataFlow = document.getElementById('data-flow');
    const timeline = document.getElementById('records-timeline');

    if (el) el.classList.toggle('is-hidden', !show);
    if (dataFlow) dataFlow.classList.toggle('is-hidden', show);
    if (timeline) timeline.classList.toggle('is-hidden', show);
}

// ═══════════════════════════════════════════════════════
// View Toggle (Orbe ↔ Cidade)
// ═══════════════════════════════════════════════════════

/**
 * Alterna entre a vista do orbe (contador) e a cidade 3D.
 * @param {'orbe'|'cidade'} view
 */
export function setView(view) {
    currentView = view;

    const orb = document.getElementById('heritage-orb');
    const emptyState = document.getElementById('empty-state');
    const dataFlow = document.getElementById('data-flow');
    const timeline = document.getElementById('records-timeline');
    const cityContainer = document.getElementById('city-container');
    const btnOrbe = document.getElementById('btn-view-orbe');
    const btnCidade = document.getElementById('btn-view-cidade');

    if (view === 'cidade') {
        // Mostrar cidade, esconder orbe
        orb?.classList.add('is-view-hidden');
        emptyState?.classList.add('is-view-hidden');
        dataFlow?.classList.add('is-view-hidden');
        timeline?.classList.add('is-view-hidden');
        cityContainer?.classList.add('is-visible');
        btnOrbe?.classList.remove('is-active');
        btnCidade?.classList.add('is-active');

        // Inicializar a cidade se necessário
        if (!isCityInitialized()) {
            const canvas = document.getElementById('city-canvas');
            if (canvas) initCity(canvas);
        }
    } else {
        // Mostrar orbe, esconder cidade
        orb?.classList.remove('is-view-hidden');
        emptyState?.classList.remove('is-view-hidden');
        dataFlow?.classList.remove('is-view-hidden');
        timeline?.classList.remove('is-view-hidden');
        cityContainer?.classList.remove('is-visible');
        btnOrbe?.classList.add('is-active');
        btnCidade?.classList.remove('is-active');
    }
}

/**
 * Retorna a vista ativa.
 */
export function getView() {
    return currentView;
}

// ═══════════════════════════════════════════════════════
// Progress Bar (Meta)
// ═══════════════════════════════════════════════════════

/**
 * Renderiza a barra de progresso da meta de patrimônio.
 * @param {Object} progressData - Dados de calcularProgressoMeta()
 * @param {number} prazo - Prazo em meses
 * @param {number} totalMeses - Total de meses registrados
 */
function renderProgressBar(progressData, prazo, totalMeses) {
    const section = document.getElementById('progress-section');
    if (!section) return;

    if (!progressData.temMeta) {
        section.classList.remove('is-visible');
        return;
    }

    section.classList.add('is-visible');

    // Valor atual
    const progressValue = section.querySelector('.progress-value');
    if (progressValue) {
        progressValue.innerHTML = `${progressData.percentual.toFixed(1)}% <span class="progress-target">de ${formatarCurto(progressData.meta)}</span>`;
    }

    // Barra de preenchimento
    const fill = section.querySelector('.progress-bar__fill');
    if (fill) {
        fill.style.width = `${Math.min(progressData.percentual, 100)}%`;
        fill.classList.toggle('is-gold', progressData.percentual >= 100);
    }

    // Milestone dots
    const milestonesContainer = section.querySelector('.progress-milestones');
    if (milestonesContainer) {
        milestonesContainer.innerHTML = '';
        for (let i = 0; i <= 100; i += 10) {
            const dot = document.createElement('span');
            dot.className = 'progress-milestone';
            dot.textContent = `${i}%`;
            if (progressData.percentual >= i) {
                dot.classList.add('is-reached');
                if (progressData.percentual >= 100) dot.classList.add('is-gold');
            }
            milestonesContainer.appendChild(dot);
        }
    }

    // Informação de tempo
    const timeInfo = section.querySelector('.progress-time-info');
    if (timeInfo && prazo > 0) {
        const mesesRestantes = Math.max(prazo - totalMeses, 0);
        const valorFalta = Math.max(progressData.meta - progressData.totalEconomizado, 0);

        if (valorFalta <= 0) {
            timeInfo.innerHTML = `🎉 <strong>Meta conquistada!</strong> Parabéns!`;
        } else if (mesesRestantes > 0) {
            const aporteNecessario = valorFalta / mesesRestantes;
            timeInfo.innerHTML = `Faltam <strong>${mesesRestantes} meses</strong> · Aporte necessário: <strong>${formatarMoeda(aporteNecessario)}/mês</strong>`;
        } else {
            timeInfo.innerHTML = `⏰ Prazo expirado · Faltam <strong>${formatarMoeda(valorFalta)}</strong>`;
        }
    } else if (timeInfo) {
        timeInfo.innerHTML = '';
    }
}

// ═══════════════════════════════════════════════════════
// City Overlay
// ═══════════════════════════════════════════════════════

function updateCityOverlay(progressData) {
    const overlay = document.getElementById('city-milestone-label');
    if (!overlay) return;

    if (!progressData.temMeta) {
        overlay.textContent = '🌱 Defina uma meta para ver a cidade crescer';
        return;
    }

    const info = getMilestoneInfo(progressData.percentual);
    overlay.innerHTML = `<span class="milestone-emoji">${info.current.emoji}</span>${info.current.label} — ${progressData.percentual.toFixed(1)}%`;
}

// ═══════════════════════════════════════════════════════
// Records Timeline
// ═══════════════════════════════════════════════════════

function renderTimeline(registros, meta) {
    const container = document.getElementById('records-timeline');
    if (!container) return;

    container.innerHTML = '';

    const reversed = [...registros].reverse();
    const streak = calcularStreak(registros, meta);

    reversed.forEach((reg, displayIndex) => {
        const realIndex = registros.length - 1 - displayIndex;
        const percent = reg.renda > 0 ? (reg.economizado / reg.renda) * 100 : 0;
        const hitMeta = percent >= meta;

        const isInGoldStreak = streak >= 3 && realIndex >= registros.length - streak;

        const node = document.createElement('div');
        node.className = 'timeline-node';
        if (isInGoldStreak) {
            node.classList.add('is-gold');
        } else if (hitMeta) {
            node.classList.add('is-success');
        } else {
            node.classList.add('is-alert');
        }

        node.style.animationDelay = `${displayIndex * 0.06}s`;

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
// Confirmation Dialog
// ═══════════════════════════════════════════════════════

/**
 * Mostra um diálogo de confirmação modal.
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog({ title, text, icon = '⚠️', confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog__icon">${icon}</div>
                <h2 class="confirm-dialog__title">${title}</h2>
                <p class="confirm-dialog__text">${text}</p>
                <div class="confirm-dialog__actions">
                    <button class="confirm-dialog__btn confirm-dialog__btn--cancel" id="confirm-cancel">${cancelText}</button>
                    <button class="confirm-dialog__btn confirm-dialog__btn--danger" id="confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.remove();
            resolve(result);
        };

        overlay.querySelector('#confirm-cancel').addEventListener('click', () => cleanup(false));
        overlay.querySelector('#confirm-ok').addEventListener('click', () => cleanup(true));

        // Fechar clicando fora do diálogo
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });

        // ESC para fechar
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEsc);
                cleanup(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

// ═══════════════════════════════════════════════════════
// Main Dashboard Render
// ═══════════════════════════════════════════════════════

/**
 * Atualiza o DOM com base no estado atualizado da aplicação.
 * @param {Object} state
 */
export function renderDashboard(state) {
    const metricas = calcularMetricas();
    const hasRecords = state.registrosMensais.length > 0;
    const progressData = calcularProgressoMeta();

    // ── Empty State ──
    if (currentView === 'orbe') {
        renderEmptyState(!hasRecords);
    }

    // ── Config Panel: atualizar inputs com valores do estado ──
    const inputMeta = document.getElementById('input-meta-patrimonio');
    const inputPrazo = document.getElementById('input-prazo-meta');
    if (inputMeta && !inputMeta.matches(':focus') && state.metaPatrimonio > 0) {
        inputMeta.value = state.metaPatrimonio;
    }
    if (inputPrazo && !inputPrazo.matches(':focus') && state.prazoMeta > 0) {
        inputPrazo.value = state.prazoMeta;
    }

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
    const displayPercent = progressData.temMeta ? progressData.percentual : metricas.percentualGeral;

    if (orbPercent) {
        if (hasRecords) {
            orbPercent.textContent = `${displayPercent.toFixed(1)}%`;
            orbPercent.classList.add('is-visible');
        } else {
            orbPercent.classList.remove('is-visible');
        }
    }

    // ── Orbe: SVG Ring ──
    updateOrbRing(hasRecords ? displayPercent : 0);

    // ── State Classes ──
    const orb = document.getElementById('heritage-orb');
    const omniBar = document.getElementById('form-registro-financeiro');
    const streak = calcularStreak(state.registrosMensais, state.metaEconomia);

    if (orb) orb.classList.remove('is-success', 'is-alert', 'is-gold');
    if (omniBar) omniBar.classList.remove('is-success', 'is-alert');

    if (hasRecords) {
        const atingiuObjetivo = progressData.temMeta ? (progressData.percentual >= 100) : metricas.atingiuMetaGeral;
        const isGold = progressData.temMeta ? (progressData.percentual >= 100) : (streak >= 3 && metricas.atingiuMetaGeral);

        if (isGold) {
            orb?.classList.add('is-gold');
            omniBar?.classList.add('is-success');
            setParticleTheme('gold');
        } else if (atingiuObjetivo) {
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
        lastRenderedValue = 0;
    }

    // ── Progress Bar ──
    renderProgressBar(progressData, state.prazoMeta, state.registrosMensais.length);

    // ── Chart ──
    if (hasRecords && currentView === 'orbe') {
        renderChart(state.registrosMensais);
    }

    // ── Timeline ──
    if (hasRecords && currentView === 'orbe') {
        renderTimeline(state.registrosMensais, state.metaEconomia);
    }

    // ── City Update ──
    if (isCityInitialized()) {
        const milestone = updateCity(progressData.percentual, metricas.mesesMetaAtingida);
        updateCityOverlay(progressData);
    }
}

// ═══════════════════════════════════════════════════════
// Chart.js — Gráfico de Evolução Imersivo
// ═══════════════════════════════════════════════════════

/**
 * Inicializa ou reconstrói o gráfico do Chart.js com design imersivo.
 * @param {Array} registros
 */
export function renderChart(registros) {
    const canvas = document.getElementById('chart-rendimentos');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = registros.map(r => r.mes);
    const dadosRenda = registros.map(r => r.renda);
    const dadosEconomizado = registros.map(r => r.economizado);

    const gradientEconomizado = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    gradientEconomizado.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    gradientEconomizado.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

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
