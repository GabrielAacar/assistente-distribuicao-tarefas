// --- 1. Configurações e Storage ---
const USERS_STORAGE_KEY = 'team_task_users';
const FILTER_STORAGE_KEY = 'team_task_filter_value';
const LIMIT_STORAGE_KEY = 'team_task_limit_per_ref';

let usuarios = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY)) || [];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const savedFilter = localStorage.getItem(FILTER_STORAGE_KEY);
    if (savedFilter) document.getElementById('filterInput').value = savedFilter;

    const savedLimit = localStorage.getItem(LIMIT_STORAGE_KEY);
    if (savedLimit) document.getElementById('usersPerRefInput').value = savedLimit;

    renderizarUsuarios();
});

// Listeners
document.getElementById('filterInput').addEventListener('input', (e) => localStorage.setItem(FILTER_STORAGE_KEY, e.target.value));
document.getElementById('usersPerRefInput').addEventListener('input', (e) => localStorage.setItem(LIMIT_STORAGE_KEY, e.target.value));

// CRUD Usuários
function salvarUsuarios() {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usuarios));
    renderizarUsuarios();
}

function renderizarUsuarios() {
    const lista = document.getElementById('userList');
    lista.innerHTML = '';
    usuarios.forEach((user, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${user}</span><button class="btn-remove" onclick="removerUsuario(${index})">×</button>`;
        lista.appendChild(li);
    });
}

function adicionarUsuario() {
    const nome = document.getElementById('newUserInput').value.trim();
    if (nome) { usuarios.push(nome); document.getElementById('newUserInput').value = ''; salvarUsuarios(); }
}

function removerUsuario(index) { usuarios.splice(index, 1); salvarUsuarios(); }


// --- 2. Controle Visual ---

/**
 * Exibe ou esconde o overlay. 
 * Aceita uma mensagem opcional para atualizar o texto.
 */
function toggleLoading(show, msg = "Processando...") {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText'); // Assegure-se de ter esse ID no HTML
    
    if (textEl) textEl.textContent = msg;

    show ? overlay.classList.add('active') : overlay.classList.remove('active');
}

function mostrarStatus(msg, tipo) {
    const el = document.getElementById('statusMessage');
    el.textContent = msg;
    el.className = `status-msg status-${tipo}`;
    setTimeout(() => { el.className = 'status-msg'; }, 5000);
}


// --- 3. Lógica de Negócio ---

function processarDistribuicao() {
    const jsonStr = document.getElementById('jsonInput').value;
    const filtroStr = document.getElementById('filterInput').value;
    const limitPerRef = parseInt(document.getElementById('usersPerRefInput').value) || 3;
    
    // Captura credenciais para o script
    const username = document.getElementById('authUsername').value || "USUARIO_NAO_INFORMADO";
    const password = document.getElementById('authPassword').value || "SENHA_NAO_INFORMADA";

    // UI Elements
    const outputContainer = document.getElementById('outputContainer');
    const tableContainer = document.getElementById('tableContainer');
    const preOutput = document.getElementById('pslOutput');

    if (usuarios.length === 0) { mostrarStatus("Adicione usuários primeiro.", "error"); return; }

    let tarefas;
    try {
        tarefas = JSON.parse(jsonStr);
        if (!Array.isArray(tarefas)) throw new Error("JSON deve ser uma lista.");
    } catch (e) { mostrarStatus("Erro no JSON: " + e.message, "error"); return; }

    toggleLoading(true, "Calculando distribuição...");
    outputContainer.classList.remove('active');
    tableContainer.style.display = 'none';

    setTimeout(() => {
        try {
            // A. Filtragem
            let tarefasFiltradas = tarefas;
            if (filtroStr.trim() !== "") {
                const locaisPermitidos = filtroStr.split(',').map(s => s.trim());
                tarefasFiltradas = tarefas.filter(t => {
                    const local = t.stage_id || t.zona || t.destination || t.local_ref || ""; 
                    // Verificação parcial ou exata conforme necessidade. Aqui exata:
                    return locaisPermitidos.some(permitido => local.includes(permitido)); 
                });
            }

            if (tarefasFiltradas.length === 0) {
                mostrarStatus("Nenhuma tarefa restou após o filtro.", "error");
                toggleLoading(false);
                return;
            }

            // B. Agrupamento e Variáveis de Controle
            const gruposDtRef = groupBy(tarefasFiltradas, 'dt_ref');
            const chavesDtRef = Object.keys(gruposDtRef).sort();
            
            const dadosTabela = [];
            const historicoGrupos = new Map(); 
            let indiceGlobalUsuario = 0;

            // --- ACUMULADORES GLOBAIS ---
            const globalIds = [];
            const globalUsers = [];
            const globalPriorities = [];

            // C. Loop de Cálculo
            chavesDtRef.forEach((dtRef) => {
                const tarefasDoRef = gruposDtRef[dtRef];
                
                // 1. Define o time para este DtRef
                const timeAtual = [];
                for (let i = 0; i < limitPerRef; i++) {
                    timeAtual.push(usuarios[indiceGlobalUsuario % usuarios.length]);
                    indiceGlobalUsuario++;
                }

                // 2. Define Prioridade do Time
                const chaveTime = [...timeAtual].sort().join('|');
                const prioridadeAnterior = historicoGrupos.get(chaveTime) || 0;
                const prioridadeAtual = prioridadeAnterior + 1;
                historicoGrupos.set(chaveTime, prioridadeAtual);

                // 3. Distribui tarefas
                tarefasDoRef.forEach((tarefa, indexTarefa) => {
                    const usuarioEscolhido = timeAtual[indexTarefa % timeAtual.length];
                    const idTarefa = tarefa.id || tarefa.task_id || "ID_NULO";
                    const localTarefa = tarefa.stage_id || tarefa.local_ref || "N/A";

                    // Preenche os arrays finais
                    globalIds.push(idTarefa);
                    globalUsers.push(usuarioEscolhido);
                    
                    // Formata a prioridade com zero à esquerda (ex: 01, 02) se necessário pelo sistema
                    const prioridadeFormatada = prioridadeAtual.toString().padStart(2, '0');
                    globalPriorities.push(prioridadeFormatada);

                    // Dados para tabela visual
                    dadosTabela.push({
                        dtRef: dtRef,
                        prioridade: prioridadeFormatada,
                        id: idTarefa,
                        local: localTarefa,
                        usuario: usuarioEscolhido
                    });
                });
            });

            // D. Montagem do Script Único
            const strIdsFinal = globalIds.join(" ");
            const strUsersFinal = globalUsers.join(" ");
            const strPrioFinal = globalPriorities.join(" ");

            // Passamos agora username e password capturados do HTML
            const scriptFinalPSL = montarTextoPSL(strIdsFinal, strUsersFinal, strPrioFinal, username, password);

            // E. Resultados
            atualizarTabela(dadosTabela);
            preOutput.textContent = scriptFinalPSL;
            outputContainer.classList.add('active');

            navigator.clipboard.writeText(scriptFinalPSL).then(() => {
                mostrarStatus(`Sucesso! Script gerado e copiado.`, "success");
            });

        } catch (err) {
            console.error(err);
            mostrarStatus("Erro interno: " + err.message, "error");
        } finally {
            toggleLoading(false);
        }
    }, 600);
}


// --- 4. O Text Builder (Script Único / Emulação Terminal) ---

function montarTextoPSL(stringIds, stringUsuarios, stringPrioridades, username, password) {
  
  return `
# ----------------------------------------------------------- 
# ATUALIZAÇÃO EM LOTE - TEAM BALANCER                         
# Total de Tarefas: ${stringIds.split(' ').length}            
# -----------------------------------------------------------

# Definindo variaveis de usuário e senha
USER = ${username}
PASSWORD = ${password}

# Configurações do terminal
set comm-type tn5250
set host-name ASKNP03.int.kn
set terminal-id "5250 Display"
set telnet-port 23

# Definindo variaveis utils
# Array / Lista de tarefas a serem processadas "TASK1 TASK2 TASK3 ..."
TASKS = ${stringIds}
# Array / Lista de usuarios seguindo a ordem de tarefas "USER1 USER2 USER3 ..."
USERS = ${stringUsuarios}
# Array / Lista de prioridades a ordem de tarefas "01 02 03 ..."
PRIORITIES = ${stringPrioridades}

ok = [session open]
if {$ok == 0} {return}
wait system

# Gerar arquivo de saida para casos não encontrados
outfile = [open "check_posss.xls" "w"]

# Validar Tela Atual, se não logado, realizar login
if {"[screen-rect 10 022 10 031]" == "Systemname\\n"} {
    cursor 03 039
    send "$USER"
    cursor 04 039
    send "$PASSWORD"
    send <ENTER>
    wait system
    send <ENTER>
    wait system
    send <ENTER>
    wait system
    send <ENTER>
    wait system
    send <ENTER>
    wait system
    cursor 21 002
    send 83
    send <ENTER>
    wait system
    cursor 21 002
    send 3
    send <ENTER>
    wait system
    send <ENTER>
    wait system
}

# Caso já logado volta para tela principal
while {"[screen-rect 12 001 12 009]" != "LDU Start\\n"} {
    wait system
    send <F3>
    wait system
}

# Navegar até a tela de trabalho com tarefas
cursor 22 002
send 1
send <ENTER>
wait system

cursor 19 007
send 5
send <enter>
wait system

cursor 19 007
send 22
send <enter>
wait system

# Iterar sobre as posições e alterar as informações
for {i = 0} {"[lindex $TASKS $i]" != ""} {incr i} {

    # Filtra a task no topo 
    cursor 04 034
    send "[lindex $TASKS $i]"
    send <ENTER>
    wait system

    # Checar se a task foi encontrada
    cursor 11 002
    send 5
    send <enter>
    wait system
    
    # Ajuste na leitura da tela para evitar erro de quebra de linha
    if {"[screen-rect 06 036 06 034]" == "[lindex $TASKS $i]\\n"} {
        puts $outfile "[lindex $TASKS $i] - NOK\\n"
        send <F12>
        wait system
    } else {
        # voltar para tela de alteração
        send <F12>
        wait system

        # Filtra a task no topo novamento (para garantir)
        cursor 04 034
        send "[lindex $TASKS $i]"
        send <ENTER>
        wait system

        # Alterar a prioridade e usuario
        cursor 11 002
        send 2
        send <enter>
        wait system

        # Alterar prioridade
        cursor 10 036
        send "[lindex $PRIORITIES $i]"

        # Alterar usuario
        cursor 12 036
        send "RET"
        cursor 12 042           
        send "[lindex $USERS $i]"

        # Confirmar alterações
        send <enter>
        wait system

        if {"[screen-rect 24 002 24 023]" == "Press Enter to confirm\\n"} {
            send <enter>
            wait system
        }
    }
}

# Fechar arquivo de saida
close $outfile

# Mensagem de finalização
message "Atualização de tasks concluída!"
`;
}


// --- Funções Auxiliares Genéricas ---

function groupBy(array, key) {
    return array.reduce((result, currentValue) => {
        const groupKey = currentValue[key] || "SEM_DT_REF";
        if (!result[groupKey]) result[groupKey] = [];
        result[groupKey].push(currentValue);
        return result;
    }, {});
}

function atualizarTabela(dados) {
    const tbody = document.querySelector('#distributionTable tbody');
    tbody.innerHTML = '';
    dados.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold; color:#555;">${d.dtRef}</td>
            <td><span class="badge-priority p-${parseInt(d.prioridade)}">${d.prioridade}</span></td>
            <td>${d.id}</td>
            <td>${d.local}</td>
            <td style="color: var(--primary-color); font-weight:600;">${d.usuario}</td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('tableContainer').style.display = 'block';
}


// --- 5. Watcher & Test Data --- 

function waitForVariable(getter, timeoutMs = 10000, checkIntervalMs = 100, title = "Aguardando dados...") {
    toggleLoading(true, title);
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const value = getter();
            if (value && value.trim() !== '') {
                clearInterval(interval);
                resolve(value);
                toggleLoading(false);
            } else if (Date.now() - startTime >= timeoutMs) {
                clearInterval(interval);
                reject(new Error("Timeout: Variável não preenchida."));
                toggleLoading(false);
            }
        }, checkIntervalMs);
    });
}

// Simulação de Carga (JSON Formatado com Quebras de Linha do seu exemplo)
var string_json = `{"dt_ref":"0097879311","task_id":"081471500","stage_id":"STG408","local_ref":"HR1 RP292C"}
{"dt_ref":"0097897565","task_id":"081487783","stage_id":"STG304","local_ref":"HR1 RB179E"}
{"dt_ref":"0097897565","task_id":"081487793","stage_id":"STG304","local_ref":"HR1 RJ173C"}
{"dt_ref":"0097897565","task_id":"081487794","stage_id":"STG304","local_ref":"HR1 RF214E"}
{"dt_ref":"0097897565","task_id":"081487795","stage_id":"STG304","local_ref":"HR1 RD241D"}
{"dt_ref":"0097897565","task_id":"081487796","stage_id":"STG304","local_ref":"HR1 RI129D"}
{"dt_ref":"0097897565","task_id":"081487797","stage_id":"STG304","local_ref":"HR1 RA147D"}
{"dt_ref":"0097897565","task_id":"081487798","stage_id":"STG304","local_ref":"HR1 RA214D"}
{"dt_ref":"0097897565","task_id":"081487800","stage_id":"STG304","local_ref":"HR1 RB169D"}
{"dt_ref":"0097897565","task_id":"081487803","stage_id":"STG304","local_ref":"HR1 RD123D"}
{"dt_ref":"0097897565","task_id":"081487808","stage_id":"STG304","local_ref":"HR1 RF237B"}
{"dt_ref":"0097897565","task_id":"081487816","stage_id":"STG304","local_ref":"HR1 RM205D"}
{"dt_ref":"0097897565","task_id":"081487817","stage_id":"STG304","local_ref":"HR1 RM291C"}
{"dt_ref":"0097900608","task_id":"081487269","stage_id":"STG209","local_ref":"HR1 RF203E"}
{"dt_ref":"0097900608","task_id":"081487270","stage_id":"STG209","local_ref":"HR1 RO230D"}
{"dt_ref":"0097900608","task_id":"081487271","stage_id":"STG209","local_ref":"HR1 RM213E"}
{"dt_ref":"0097897667","task_id":"081487491","stage_id":"STG102","local_ref":"HR1 RE242C"}
{"dt_ref":"0097897667","task_id":"081487495","stage_id":"STG102","local_ref":"HR1 RI125C"}
{"dt_ref":"0097897667","task_id":"081487496","stage_id":"STG102","local_ref":"HR1 RN205C"}
{"dt_ref":"0097897667","task_id":"081487498","stage_id":"STG102","local_ref":"HR1 RO221F"}
{"dt_ref":"0097897667","task_id":"081487501","stage_id":"STG102","local_ref":"HR1 RE316B"}
{"dt_ref":"0097897667","task_id":"081487489","stage_id":"STG102","local_ref":"HR1 RN212E"}
{"dt_ref":"0097897667","task_id":"081487490","stage_id":"STG102","local_ref":"HR1 RL245C"}`;

// Carregar dados de teste após 2 segundos
setTimeout(() => {
    // Transforma a string de objetos separados por quebra de linha em um Array JSON válido
    // 1. Quebra por linha
    // 2. Filtra linhas vazias
    // 3. Junta com vírgulas
    // 4. Envolve em colchetes []
    const jsonFormatado = `[${string_json.trim().replace(/\n/g, ',')}]`;
    document.getElementById('jsonInput').value = jsonFormatado;
}, 2000);

// Inicia Watcher
waitForVariable(() => document.getElementById('jsonInput').value, 5000, 100, "Aguardando carga de dados...")
    .then((valor) => {
        console.log("Watcher: Dados carregados com sucesso.");
        mostrarStatus("Dados de teste carregados.", "success");
    })
    .catch((erro) => {
        console.warn(erro.message);
    });