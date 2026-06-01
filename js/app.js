/**
 * app.js
 * Ponto de entrada (Entrypoint) e orquestrador de eventos.
 * Inicializa o aplicativo carregando os dados do storage e vincula os Event Listeners.
 */

import { loadState, saveState } from './storage.js';
import { appState, setState, adicionarMes } from './state.js';
import { renderDashboard, showToast } from './ui.js';

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

    // 3. Vincula listeners de formulários e interações
    const form = document.getElementById('form-registro-financeiro');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        // Real-time feedback na Omni-Bar enquanto digita
        form.addEventListener('input', handleRealTimeFeedback);
    }

    // Atalho Global (Ctrl+Space) para focar na Omni-Bar
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // 4. Renderiza a UI inicial
    renderDashboard(appState);
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

        // Esconde o kbd-hint após primeiro uso
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
}

/**
 * Manipula a submissão do formulário de registro de novos meses (Omni-Bar).
 * @param {Event} e - Evento de submit do formulário
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
        // O mês será gerado automaticamente no state.js
        adicionarMes(
            inputRenda.value,
            inputEconomizado.value
        );

        // Calcula o nome do mês que acabou de ser adicionado
        const mesAdicionado = appState.registrosMensais[appState.registrosMensais.length - 1].mes;
        const percent = (parseFloat(inputEconomizado.value) / parseFloat(inputRenda.value) * 100).toFixed(1);

        // Salva o novo estado de forma persistente
        saveState(appState);

        // Atualiza a visualização do painel
        renderDashboard(appState);

        // Reseta o formulário
        form.reset();

        // Remove as classes de feedback temporárias do real-time
        form.classList.remove('is-success', 'is-alert');

        // Limpa o live percent
        const livePercent = document.getElementById('omni-live-percent');
        if (livePercent) {
            livePercent.textContent = '';
            livePercent.classList.remove('is-visible', 'is-success', 'is-alert');
        }

        // Toast de sucesso
        showToast(`${mesAdicionado} registrado ✓  (${percent}%)`, 'success');

        // Mantém o foco no primeiro input para fluxo rápido
        inputRenda.focus();
    } catch (error) {
        // Toast de erro em vez de alert()
        showToast(`Erro: ${error.message}`, 'alert');
    }
}

/**
 * Fornece feedback visual em tempo real alterando a borda da Omni-Bar
 * e exibindo o percentual calculado ao vivo.
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

            // Atualiza classes da Omni-Bar
            form.classList.remove('is-success', 'is-alert');

            if (percentual >= appState.metaEconomia) {
                form.classList.add('is-success');
            } else {
                form.classList.add('is-alert');
            }

            // Atualiza live percent indicator
            if (livePercent) {
                livePercent.textContent = `${percentual.toFixed(1)}%`;
                livePercent.classList.add('is-visible');
                livePercent.classList.remove('is-success', 'is-alert');
                livePercent.classList.add(percentual >= appState.metaEconomia ? 'is-success' : 'is-alert');
            }
        }
    } else {
        // Se um dos campos está vazio, limpa o feedback
        form.classList.remove('is-success', 'is-alert');
        if (livePercent) {
            livePercent.textContent = '';
            livePercent.classList.remove('is-visible', 'is-success', 'is-alert');
        }
    }
}

// Executa a inicialização do app quando o DOM estiver completamente pronto
document.addEventListener('DOMContentLoaded', init);
