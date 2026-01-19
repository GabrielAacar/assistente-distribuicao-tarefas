function montarTextoPSL(stringIds, stringUsuarios, stringPrioridades, username, password) {
    
    return `
# ----------------------------------------------------------- 
# ATUALIZAÇÃO EM LOTE - TEAM BALANCER                         
# Total de Tarefas: ${stringIds.split(' ').length}            
# ----------------------------------------------------------- */

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
if {"[screen-rect 10 022 10 031]" == "Systemname\n"} {
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
while {"[screen-rect 12 001 12 009]" != "LDU Start\n"} {
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
    
    if {"[screen-rect 06 036 06 034]" == "[lindex $TASKS $i]\n"} {
        puts $outfile "[lindex $TASKS $i] - NOK\n"
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


        if {"[screen-rect 24 002 24 023]" == "Press Enter to confirm\n"} {
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

function renderizarUsuarios() {
    const lista = document.getElementById('userList');
    lista.innerHTML = '';
    usuarios.forEach((user, index) => {
        const li = document.createElement('li');
        const span = document.creatElement('span');
        const btn = document.createElement('button');
        
        btn.className = 'btn-remove';
        btn.innerText = '×';
        btn.addEventListener('click', () => removerUsuario(index));

        span.innerHTML = `${user}`;
        li.appendChild(span);
        li.appendChild(btn);
        lista.appendChild(li);
    });
}

function adicionarUsuario() {
    const nome = document.getElementById('newUserInput').value.trim();
    if (nome) { usuarios.push(nome); document.getElementById('newUserInput').value = ''; salvarUsuarios(); }
}

USER = `"${username}"`
PASSWORD = `"${password}"`

// Função chamada pelo botão "Carregar Exemplo"
function carregarDadosExemplo() {
    toggleLoading(true, "Carregando dados de exemplo...");
    
    try {
        // Forçar o trigger
        form.raiseFieldEvent('btn_get_string', 'Click');

        // Inicia Watcher
        waitForVariable(() => form.getVariableValue('VString_js'), 5000, 100, "Aguardando carga de dados...")
        .then((valor) => {
            console.log("Watcher: Dados carregados com sucesso.");
            mostrarStatus("Dados de teste carregados.", "success");
            const string_json = form.getVariableValue('VString_js');
            const jsonFormatado = `[${string_json.trim().replace(/\n/g, ',')}]`;
            document.getElementById('jsonInput').value = jsonFormatado;
            
        })
        .catch((erro) => {
            console.warn(erro.message);
        });
    } catch (error) {
        console.error("Erro ao carregar dados de exemplo:", error);
        abrirModal('Erro', 'Não foi possível carregar os dados de exemplo. Verifique o console para mais detalhes.');
    }
}