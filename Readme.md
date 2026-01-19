# ⚖️ Assitente de distruibuição de tarefa (WMS Automation)

Aplicação web desenvolvida para auxiliar na distribuição equitativa de tarefas logísticas entre operadores, gerando scripts de automação (PSL) para terminais TN5250.

## 📋 Sobre o Projeto

O Assistente resolve o problema de alocação manual de tarefas em operações de armazém. Ele recebe uma lista de tarefas (via JSON), agrupa por referência (`dt_ref`), distribui entre os usuários disponíveis e gera um script pronto para ser executado em um emulador de terminal, automatizando a atualização no sistema WMS.

## ✨ Funcionalidades

- **Gerenciamento de Usuários**: Adição e remoção de operadores (persiste no LocalStorage).

- **Distribuição Inteligente**:
  - Agrupamento por Documento/Referência (`dt_ref`).
  - Controle de tamanho do time por referência.
  - Rotação de times (Round-Robin).

- **Gestão de Prioridade**: Incrementa a prioridade automaticamente se o mesmo time for alocado novamente.

- **Filtros**: Filtragem de tarefas por Local/Zona/Stage antes da distribuição.

- **Automação TN5250**: Gera um script compatível com automação de terminal (Login automático, navegação de telas e atualização em lote).

- **Visualização**: Tabela de pré-visualização da distribuição antes da geração do script.

## 🚀 Como Usar

### 1. Configuração de Usuários

- Na barra lateral, adicione os logins dos operadores disponíveis.
- Defina quantos usuários devem "atacar" cada `dt_ref` (Padrão: 3).
- Insira suas credenciais (Usuário/Senha) para que o script possa realizar o login automático.

### 2. Entrada de Dados

- Cole o JSON contendo as tarefas na área principal. O sistema aceita o formato de array de objetos.

### 3. Filtros (Opcional)

- Se desejar processar apenas locais específicos (ex: `STG408`), digite-os no campo de filtro separados por vírgula.

### 4. Processamento

- Clique em **"Distribuir Tarefas e Gerar Script"**.
- O sistema exibirá uma tabela com o resultado e copiará o script PSL para sua área de transferência.

## 📄 Formato de Entrada (JSON)

A aplicação espera um Array de objetos JSON. Os campos essenciais são `dt_ref`, `task_id` (ou `id`) e campos de local (`stage_id`, `local_ref`, `zona`, etc).

```json
[
  {
    "dt_ref": "0097879311",
    "task_id": "081471500",
    "stage_id": "STG408",
    "local_ref": "HR1 RP292C"
  },
  {
    "dt_ref": "0097897565",
    "task_id": "081487783",
    "stage_id": "STG304",
    "local_ref": "HR1 RB179E"
  }
]
```

## 🧠 Lógica de Distribuição

A distribuição segue as seguintes regras de negócio:

1. **Agrupamento**: As tarefas são agrupadas pelo número do `dt_ref`.

2. **Formação de Times**:
   - Com base no parâmetro "Usuários por Dt Ref", o sistema seleciona um subgrupo de usuários (ex: Usuário A, B, C).
   - Para o próximo `dt_ref`, o sistema seleciona os próximos usuários da lista (ex: D, E, F).
   - A seleção é circular (se acabar os usuários, volta ao início).

3. **Cálculo de Prioridade**:
   - O sistema memoriza quais combinações de usuários (Times) já foram usadas.
   - 1ª vez do Time: Prioridade 1.
   - 2ª vez do Time: Prioridade 2.
   - E assim sucessivamente, evitando que um time fique sobrecarregado sempre com a prioridade máxima em múltiplos documentos.

## 💻 Instalação e Execução

Não é necessário instalação de servidores (Node, Python, etc). A aplicação é **Client-Side pura**.

1. Baixe os arquivos:
   - `index.html`
   - `style.css`
   - `app.js`

2. Coloque-os na mesma pasta.

3. Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox).

## 🛠️ Estrutura do Script Gerado (PSL)

O gerador cria um script de automação de terminal que executa os seguintes passos:

1. Define variáveis de ambiente (Host, Porta, Terminal ID).
2. Realiza o Login no sistema (se não estiver logado).
3. Navega através dos menus (F3, Seleção de Opções) até a tela de manutenção de tarefas.
4. Itera sobre a lista de IDs fornecida.
5. Para cada tarefa:
   - Filtra a tarefa.
   - Entra no modo de edição.
   - Altera a Prioridade e o Usuário.
   - Confirma a transação.
6. Gera logs de saída (`check_posss.xls`) para tarefas não encontradas.

**Desenvolvido para otimização de processos logísticos.**