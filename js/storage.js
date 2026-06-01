/**
 * storage.js
 * Camada de abstração e isolamento do LocalStorage.
 * Abstrai a API de armazenamento do navegador, isolando o código de negócio.
 */

const STORAGE_KEY = 'pague_se_primeiro_state';

/**
 * Salva o estado atual no armazenamento local.
 * @param {Object} state - O objeto de estado da aplicação.
 */
export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Erro ao salvar o estado no LocalStorage:', error);
    }
}

/**
 * Carrega o estado salvo ou retorna null se não houver registros.
 * @returns {Object|null} O estado da aplicação ou null.
 */
export function loadState() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erro ao carregar o estado do LocalStorage:', error);
        return null;
    }
}
