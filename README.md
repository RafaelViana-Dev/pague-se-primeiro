# Pague-se Primeiro — Dashboard Financeiro Interativo & Cidade 3D

## 🔗 Demonstração Online (GitHub Pages)
Acesse e interaja com o projeto ao vivo em: **[https://rafaelviana-dev.github.io/pague-se-primeiro/](https://rafaelviana-dev.github.io/pague-se-primeiro/)**

---

Bem-vindo ao **Pague-se Primeiro**, uma aplicação web moderna, interativa e altamente visual voltada para o planejamento financeiro pessoal de longo prazo, gamificação de metas e acompanhamento de patrimônio. 

O projeto é baseado no princípio financeiro homônimo: poupar uma parcela fixa de suas receitas mensais logo no início do mês ("pagando-se primeiro") e investir esse valor para construir um patrimônio duradouro. Para motivar a consistência, o aplicativo transforma seu progresso financeiro em uma **cidade 3D evolutiva**.

---

## 🏛️ Filosofia do Projeto e Mecânicas de Gamificação

A consistência em economizar é um desafio psicológico. O **Pague-se Primeiro** aborda esse problema através da gamificação:
1. **O Orbe de Patrimônio:** O centro da interface clássica é dominado por um Orbe flutuante que reage às suas metas, brilhando em tons dourados ou verdes quando você é consistente, e mudando para vermelho/alerta caso precise de atenção.
2. **A Cidade 3D (Simulação de Enriquecimento):** Uma representação tridimensional do seu progresso, com as seguintes mecânicas:
   - **Economias Mensais (Casas Comuns):** Cada mês em que você poupa mais do que 10% (ou a meta estipulada) da sua **renda mensal** adiciona uma nova **Casa Comum** na periferia da cidade, representando a sua constância diária/mensal.
   - **Crescimento Patrimonial (Monumentos e Prédios Especiais):** A cada 10% de progresso em direção à sua **Meta de Patrimônio de Longo Prazo**, um novo marco especial é erguido no centro da cidade.
   - **Controles de Câmera Livres:** A cidade 3D suporta manipulação e rotação completa de ângulo através do mouse (botão esquerdo para rotacionar, botão direito para mover a câmera e scroll para aproximar/afastar).

---

## 🚀 Arquitetura e Estrutura de Arquivos

O projeto é construído estritamente sobre tecnologias web puras (Vanilla HTML, CSS e JavaScript), garantindo leveza, excelente desempenho de renderização e facilidade de manutenção.

```
Pague-se-primeiro/
├── index.html                   # Estrutura HTML5 semântica e carregamento de CDNs
├── css/
│   ├── styles.css               # Design System principal (variáveis HSL, resets, classes utilitárias)
│   └── dashboard.css            # Componentes específicos (Orbe, Timeline, Painel, Controles 3D)
├── js/
│   ├── app.js                   # Inicializador global e gerenciamento de eventos do ciclo de vida
│   ├── state.js                 # Lógica de cálculo financeiro, validação e persistência do estado
│   ├── ui.js                    # Manipulação de DOM, renderização de gráficos (Chart.js) e toasts
│   ├── storage.js               # Interface com LocalStorage para persistência de dados do usuário
│   ├── particles.js             # Motor de partículas CSS interativas ao redor do Orbe
│   └── city.js                  # Motor 3D da cidade usando Three.js e OrbitControls
└── arquitetura_pague_se_primeiro.pdf  # Especificação técnica original do projeto
```

---

## 🎨 Design System & Estética

O estilo visual baseia-se em conceitos modernos de **Sleek Dark Mode** e **Glassmorphism**, gerando uma experiência de uso premium:

- **Paleta de Cores HSL:** Cores dinâmicas que utilizam matiz, saturação e luminosidade para criar contrastes harmoniosos sobre um fundo Slate escuro (`#0F172A`).
- **Glassmorphic Cards:** Painéis translúcidos construídos com propriedades modernas de CSS como `backdrop-filter: blur(16px)` e bordas sutis com opacidade reduzida.
- **Animações e Efeitos:**
  - **Orbe de Patrimônio:** Apresenta uma pulsação lenta e é circundado por partículas geradas via CSS que mudam de cor dinamicamente (dourado para streaks longos, verde para consistência, vermelho para alertar atrasos).
  - **Transição de Cenas:** Um painel permite alternar suavemente entre a visão clássica de relatórios (dashboard com gráficos de barra/linha do Chart.js) e a visão 3D da cidade interativa.

---

## 🔧 Funcionamento Técnico dos Módulos

### 1. Estado (`js/state.js`)
Centraliza as operações financeiras e de armazenamento da aplicação. Mantém as seguintes variáveis sob controle:
* `metaEconomia`: A meta de taxa de poupança mensal (padrão: 10% da renda).
* `metaPatrimonio` e `prazoMeta`: O montante final desejado (ex: R$ 100.000) e em quantos meses o usuário pretende conquistá-lo.
* `registrosMensais`: Lista de lançamentos contendo o mês, receita e valor efetivamente economizado.

Principais funções analíticas:
* `calcularMetricas()`: Computa a renda total acumulada, economias totais, percentual médio de economia e o número exato de meses onde o usuário bateu a meta de economia individual (`mesesMetaAtingida`).
* `calcularProgressoMeta()`: Avalia o progresso do patrimônio acumulado em relação à meta total de longo prazo, sugerindo o valor ideal poupado mensalmente necessário para bater o prazo estipulado.

### 2. Motor 3D da Cidade (`js/city.js`)
Controla o ecossistema 3D sob o framework **Three.js**.
* **Visualização Livre:** Configura `OrbitControls` permitindo ao usuário girar (botão esquerdo do mouse/drag), mover (botão direito) e aproximar/afastar (scroll) a câmera.
* **Malha de Ruas e Terreno:** Renderiza uma base de grama cercada por estradas cruzadas em cinza escuro e postes de iluminação minimalistas nas esquinas.
* **Marcos Especiais (Milestones):** Desenha e adiciona elements especiais no centro da cidade à medida que a meta acumulada progride:
  1. `10%`: **Chafariz (Monumento)** - Base em pedra com pilares centrais e jato de água translúcido em azul brilhante.
  2. `20%`: **Loja** - Edificação comercial posicionada para evitar colisões com o chafariz.
  3. `30%`: **Carro** - Veículo de passeio com rodas, vidros e faróis acesos circulando pelas ruas.
  4. `40%`: **Prédio Comercial** - Estrutura de múltiplos andares com janelas de vidro.
  5. `50%`: **Hospital** - Prédio com o símbolo clássico de cruz médica vermelha em relevo.
  6. `60%`: **Campo de Futebol** - Um gramado esportivo completo com marcações brancas e traves de gol de metal, posicionado nos limites do loteamento.
  7. `70%`: **Shopping Center** - Grande edifício de lazer com letreiros brilhantes posicionado nos limites periféricos para evitar sobreposição espacial.
  8. `80%`: **Arranha-céu (Skyscraper)** - A maior estrutura da cidade, com heliponto no topo e recuo espacial planejado para evitar colisões visuais.
  9. `90%`: **Parque Urbano** - Bancos de madeira, gramado plano e várias árvores coníferas detalhadas.
  10. `100%`: **Show de Fogos de Artifício** - Um sistema de partículas procedurais que lança fogos coloridos das extremidades e laterais do terreno, celebrando a conquista do patrimônio total estabelecido.
* **Layout sem colisões:** Os elementos como Loja, Shopping Center e Arranha-céu foram espaçados adequadamente para garantir que as malhas 3D nunca se sobreponham. Os veículos, como o ônibus no milestone de 60%, são inicializados no sentido correto das pistas para um visual condizente.
* **Casas Comuns Procedurais:** Mapeia um grid periférico longe do centro. Para cada mês de meta mensal batida (investimentos >= 10% da sua renda), constrói uma casa clássica de telhado triangular com chaminé, aplicando rotações de 90° e leves variações de posição de forma pseudo-aleatória para criar um visual orgânico de vizinhança.

### 3. Interface de Usuário (`js/ui.js`)
Orquestra as atualizações cirúrgicas do DOM, evitando renderizações desnecessárias e melhorando a performance:
* **Animação Incremental de Valores:** Quando um registro financeiro é inserido, os valores monetários no topo e no orbe sobem e descem usando interpolação matemática suave (`requestAnimationFrame`) em vez de saltar de um número a outro de forma abrupta.
* **Gráficos Financeiros:** Integração com **Chart.js** exibindo um gráfico de barras moderno para as receitas de cada mês, sobreposto por uma linha suave indicando as economias reais do usuário.
* **Linha do Tempo (Timeline):** Exibe de forma cronológica as economias mensais, atribuindo insígnias verdes para os meses vitoriosos e alertas para os meses abaixo da meta estabelecida.
* **Contadores Responsivos:** O contador da tela inicial reage dinamicamente conforme as metas configuradas pelo usuário.

---

## 🛠️ Como Executar o Projeto Localmente

1. Certifique-se de que os arquivos do projeto estão em uma pasta local.
2. Como a aplicação utiliza JavaScript nativo estruturado em módulos (`import/export`), o navegador exige a execução sob o protocolo `http/https` (para evitar restrições de CORS locais).
3. Inicie um servidor estático leve de sua preferência. Por exemplo, utilizando o Python incorporado no terminal:
   ```bash
   python3 -m http.server 8080
   ```
4. Abra o navegador e acesse: `http://localhost:8080`

---

## 📈 Regras Financeiras Aplicadas no Jogo

| Cenário | O que acontece no Orbe | O que acontece na Cidade 3D |
| :--- | :--- | :--- |
| **Nenhum registro inserido** | Cinza, sem porcentagem ou anel preenchido. | Apenas o terreno vazio de grama (`Terreno`). |
| **Economizou >= 10% da renda mensal num mês** | Brilha em verde (ou dourado se acumular 3 meses seguidos de consistência). | Cria **1 nova casa comum** nos arredores residenciais. |
| **Economizou < 10% da renda mensal num mês** | Brilha em vermelho/alerta (sinalizando a falha). | Nenhuma casa comum é construída para aquele mês. |
| **Atingiu 10% da Meta de Patrimônio Acumulada** | Mostra 10% no centro e preenche 10% do anel circular. | Constrói o **Chafariz central** no coração da praça. |
| **Atingiu 60% da Meta de Patrimônio Acumulada** | Mostra 60% no centro e preenche o anel correspondente. | Constrói o **Campo de Futebol** e posiciona o Ônibus na pista. |
| **Atingiu 100% da Meta de Patrimônio Acumulada** | Brilha intensamente e completa o círculo. | Dispara o **Show de Fogos de Artifício** contínuo nas extremidades do terreno. |

---

Desenvolvido com foco em estética minimalista, microinterações fluidas e gamificação positiva para apoiar sua saúde financeira. 💸✨
