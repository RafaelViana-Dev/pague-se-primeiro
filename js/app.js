/**
 * app.js
 * Ponto de entrada (Entrypoint) e orquestrador de eventos.
 * Inicializa o aplicativo carregando os dados do storage e vincula os Event Listeners.
 */

import { loadState, saveState, clearState } from './storage.js';
import { appState, setState, adicionarMes, setMetaPatrimonio, limparRegistros } from './state.js';
import { renderDashboard, showToast, setView, getView, showConfirmDialog } from './ui.js';
import { resetCity } from './city.js';

/**
 * Inicializa a aplicação:
 * 1. Carrega dados persistidos do LocalStorage
 * 2. Atualiza o estado em memória
 * 3. Registra os listeners de eventos
 * 4. Renderiza a interface inicial
 */
export function init() {
    console.log('✦ Inicializando Pague-se Primeiro — Experiência Imersiva');

    // 1 & 2. Carrega estado anterior
    const estadoSalvo = loadState();
    if (estadoSalvo) {
        setState(estadoSalvo);
    }

    // 3. Vincula listeners
    bindFormListeners();
    bindConfigListeners();
    bindViewToggle();
    bindClearButton();
    bindKeyboardShortcuts();

    // 4. Renderiza a UI inicial
    renderDashboard(appState);

    // Restaurar viewMode salvo
    if (appState.viewMode === 'cidade') {
        setView('cidade');
    }
}

// ═══════════════════════════════════════════════════════
// Form (Omni-Bar) Listeners
// ═══════════════════════════════════════════════════════

function bindFormListeners() {
    const form = document.getElementById('form-registro-financeiro');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        form.addEventListener('input', handleRealTimeFeedback);
    }
}

/**
 * Manipula a submissão do formulário de registro.
 * @param {Event} e
 */
export function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const inputRenda = form.querySelector('#input-renda');
    const inputEconomizado = form.querySelector('#input-economizado');

    if (!inputRenda || !inputEconomizado) {
        console.error('Campos da Omni-Bar não encontrados.');
        return;
    }

    try {
        adicionarMes(
            inputRenda.value,
            inputEconomizado.value
        );

        const mesAdicionado = appState.registrosMensais[appState.registrosMensais.length - 1].mes;
        const percent = (parseFloat(inputEconomizado.value) / parseFloat(inputRenda.value) * 100).toFixed(1);

        saveState(appState);
        renderDashboard(appState);

        form.reset();
        form.classList.remove('is-success', 'is-alert');

        const livePercent = document.getElementById('omni-live-percent');
        if (livePercent) {
            livePercent.textContent = '';
            livePercent.classList.remove('is-visible', 'is-success', 'is-alert');
        }

        showToast(`${mesAdicionado} registrado ✓  (${percent}%)`, 'success');
        inputRenda.focus();
    } catch (error) {
        showToast(`Erro: ${error.message}`, 'alert');
    }
}

/**
 * Feedback visual em tempo real na Omni-Bar.
 */
function handleRealTimeFeedback() {
    const form = document.getElementById('form-registro-financeiro');
    const inputRendaVal = document.getElementById('input-renda').value;
    const inputEconomizadoVal = document.getElementById('input-economizado').value;
    const livePercent = document.getElementById('omni-live-percent');

    if (inputRendaVal && inputEconomizadoVal) {
        const rendaFloat = parseFloat(inputRendaVal);
        const economizadoFloat = parseFloat(inputEconomizadoVal);

        if (rendaFloat > 0 && economizadoFloat >= 0) {
            const percentual = (economizadoFloat / rendaFloat) * 100;

            form.classList.remove('is-success', 'is-alert');

            if (percentual >= appState.metaEconomia) {
                form.classList.add('is-success');
            } else {
                form.classList.add('is-alert');
            }

            if (livePercent) {
                livePercent.textContent = `${percentual.toFixed(1)}%`;
                livePercent.classList.add('is-visible');
                livePercent.classList.remove('is-success', 'is-alert');
                livePercent.classList.add(percentual >= appState.metaEconomia ? 'is-success' : 'is-alert');
            }
        }
    } else {
        form.classList.remove('is-success', 'is-alert');
        if (livePercent) {
            livePercent.textContent = '';
            livePercent.classList.remove('is-visible', 'is-success', 'is-alert');
        }
    }
}

// ═══════════════════════════════════════════════════════
// Config Panel Listeners (Meta + Prazo)
// ═══════════════════════════════════════════════════════

function bindConfigListeners() {
    const inputMeta = document.getElementById('input-meta-patrimonio');
    const inputPrazo = document.getElementById('input-prazo-meta');

    const saveConfigDebounced = debounce(() => {
        const valor = inputMeta?.value || 0;
        const prazo = inputPrazo?.value || 0;

        setMetaPatrimonio(valor, prazo);
        saveState(appState);
        renderDashboard(appState);

        if (parseFloat(valor) > 0) {
            showToast('Meta atualizada ✓', 'success', 1500);
        }
    }, 800);

    if (inputMeta) {
        inputMeta.addEventListener('input', saveConfigDebounced);
    }
    if (inputPrazo) {
        inputPrazo.addEventListener('input', saveConfigDebounced);
    }
}

/**
 * Debounce helper.
 */
function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// ═══════════════════════════════════════════════════════
// View Toggle (Orbe ↔ Cidade)
// ═══════════════════════════════════════════════════════

function bindViewToggle() {
    const btnOrbe = document.getElementById('btn-view-orbe');
    const btnCidade = document.getElementById('btn-view-cidade');

    if (btnOrbe) {
        btnOrbe.addEventListener('click', () => {
            setView('orbe');
            appState.viewMode = 'orbe';
            saveState(appState);
            renderDashboard(appState);
        });
    }

    if (btnCidade) {
        btnCidade.addEventListener('click', () => {
            setView('cidade');
            appState.viewMode = 'cidade';
            saveState(appState);
            renderDashboard(appState);
        });
    }
}

// ═══════════════════════════════════════════════════════
// Clear Records Button
// ═══════════════════════════════════════════════════════

function bindClearButton() {
    const btnClear = document.getElementById('btn-clear-records');

    if (btnClear) {
        btnClear.addEventListener('click', async () => {
            if (appState.registrosMensais.length === 0) {
                showToast('Não há registros para limpar', 'neutral', 1500);
                return;
            }

            const confirmed = await showConfirmDialog({
                title: 'Limpar Registros',
                text: `Tem certeza que deseja apagar todos os ${appState.registrosMensais.length} registros? Esta ação não pode ser desfeita.`,
                icon: '🗑️',
                confirmText: 'Sim, apagar tudo',
                cancelText: 'Cancelar'
            });

            if (confirmed) {
                limparRegistros();
                resetCity();
                clearState();
                saveState(appState);
                renderDashboard(appState);
                showToast('Registros limpos ✓', 'neutral', 2000);
            }
        });
    }
}

// ═══════════════════════════════════════════════════════
// Keyboard Shortcuts
// ═══════════════════════════════════════════════════════

function bindKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Gerencia atalhos de teclado globais.
 * @param {KeyboardEvent} e
 */
function handleKeyboardShortcuts(e) {
    // Ctrl+Space: Focar na Omni-Bar
    if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        const inputRenda = document.getElementById('input-renda');
        if (inputRenda) inputRenda.focus();

        const kbdHint = document.getElementById('kbd-hint');
        if (kbdHint) kbdHint.classList.add('is-hidden');
    }

    // Escape: Desfocar a Omni-Bar
    if (e.code === 'Escape') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.closest('.omni-bar')) {
            activeEl.blur();
        }
    }

    // Tab: Alternar vista (quando não está em um input)
    if (e.code === 'Tab' && !e.target.closest('input, textarea, select')) {
        e.preventDefault();
        const newView = getView() === 'orbe' ? 'cidade' : 'orbe';
        setView(newView);
        appState.viewMode = newView;
        saveState(appState);
        renderDashboard(appState);
    }
}

// Executa a inicialização do app quando o DOM estiver completamente pronto
document.addEventListener('DOMContentLoaded', init);
