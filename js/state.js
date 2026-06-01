/**
 * state.js
 * Core de negócios: gerenciamento de estado e regras financeiras.
 * Mantém o estado mutável em memória e aplica validações de regras de negócio.
 */

const NOMES_MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Estado inicial da aplicação conforme especificado no Tópico 6
export let appState = {
    metaEconomia: 10, // Porcentagem padrão recomendada (10%)
    registrosMensais: []
};

/**
 * Define/atualiza o estado completo da aplicação (útil após carregar do storage)
 * @param {Object} newState 
 */
export function setState(newState) {
    if (newState) {
        appState = { ...appState, ...newState };
    }
}

/**
 * Adiciona um novo registro mensal de renda e economia.
 * O mês é gerado automaticamente com base na sequência de registros.
 * 
 * @param {number|string} renda - Valor da renda mensal recebida
 * @param {number|string} economizado - Valor economizado
 */
export function adicionarMes(renda, economizado) {
    const rendaFloat = parseFloat(renda);
    const economizadoFloat = parseFloat(economizado);

    if (isNaN(rendaFloat) || rendaFloat <= 0) {
        throw new Error('A renda deve ser um número positivo.');
    }

    if (isNaN(economizadoFloat) || economizadoFloat < 0) {
        throw new Error('O valor economizado não pode ser negativo.');
    }

    if (economizadoFloat > rendaFloat) {
        throw new Error('O valor economizado não pode ser maior que a renda.');
    }

    // Gera um nome sequencial para o mês (ex: Janeiro, Fevereiro, etc.)
    const totalRegistros = appState.registrosMensais.length;
    const mesBase = NOMES_MESES[totalRegistros % 12];
    const ano = Math.floor(totalRegistros / 12) + 1;
    const mesGerado = ano > 1 ? `${mesBase} (Ano ${ano})` : mesBase;

    const novoRegistro = {
        id: String(Date.now()), // Timestamp único para identificação
        mes: mesGerado,
        renda: rendaFloat,
        economizado: economizadoFloat
    };

    appState.registrosMensais.push(novoRegistro);
}

/**
 * Computa as métricas globais de performance financeira com base nos registros do estado.
 * @returns {Object} Objeto com as métricas calculadas
 */
export function calcularMetricas() {
    const totalRenda = appState.registrosMensais.reduce((acc, reg) => acc + reg.renda, 0);
    const totalEconomizado = appState.registrosMensais.reduce((acc, reg) => acc + reg.economizado, 0);

    const percentualGeral = totalRenda > 0 ? (totalEconomizado / totalRenda) * 100 : 0;
    const atingiuMetaGeral = percentualGeral >= appState.metaEconomia;

    return {
        totalRenda,
        totalEconomizado,
        percentualGeral,
        atingiuMetaGeral
    };
}
