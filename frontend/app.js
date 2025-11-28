/*document.getElementById("btn").onclick = async () => {
  const res = await fetch("http://127.0.0.1:8000/api/status");
  const data = await res.json();
  document.getElementById("result").textContent =
    JSON.stringify(data, null, 2);
};*/

/* Modal dinâmico */
/**
 * Cria e exibe um modal dinâmico
 * @param {Object} config
 * @param {string} config.title     - Título do modal
 * @param {string|HTMLElement} config.content - HTML ou texto do conteúdo principal
 * @param {Array}  config.buttons   - Botões do rodapé: [{ text: 'OK', action: () => {...} }, ...]
 * @param {boolean} config.closeOnOverlayClick - Fecha ao clicar fora do modal (padrão: true)
 */
function createModal({ title = '', content = '', buttons = [], closeOnOverlayClick = true }) {
  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  // Modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.textContent = title;
  // Main
  const main = document.createElement('div');
  main.className = 'modal-main';
  if (typeof content === 'string') main.innerHTML = content;
  else main.appendChild(content);
  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  // Botões
  if (buttons.length === 0) {
    buttons.push({ text: 'Fechar', action: () => closeModal(overlay) });
  }
  buttons.forEach(btnCfg => {
    const btn = document.createElement('button');
    btn.textContent = btnCfg.text;
    btn.className = btnCfg.color ? `button ${btnCfg.color}` : 'button';
    btn.onclick = () => {
      if (typeof btnCfg.action === 'function') btnCfg.action(overlay);
    };
    footer.appendChild(btn);
  });
  // Montagem
  modal.append(header, main, footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  // Fechar ao clicar no overlay
  if (closeOnOverlayClick) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay);
    });
  }
  return overlay;
}

function closeModal(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}
// ---------- ESTADO ----------
const state = {
  zonas: JSON.parse(localStorage.getItem("zonas")) || {},
  dts: {}
};

// ---------- PAYLOAD ----------
function buildPayload() {
  return {
    dts: state.dts,
    zonas: state.zonas,
    tarefas: Array.isArray(state.tarefas)
      ? state.tarefas.map(t => ({
          dt: String(t.dt),              // ✅ garantir string
          movorder: String(t.movorder) || "",    // ✅ obrigatório
          zona: t.zona,
          tarefa: t.tarefa || "",
          volume: Number(t.volume || 0)
        }))
      : []
  };
}



// ---------- LOG VISUAL ----------
const logCache = [];
function log(msg) {
  const el = document.getElementById("log");
  el.innerHTML = `<li>${msg}</li>` ;

  // Criar um cache com os logs, para informação
  // mais completa futuramente
  const date_log = new Date().toLocaleTimeString();
  msg = `[${date_log}] ${msg}`;
  logCache.push(msg);
  console.log("Log cache:", logCache);
}

function mostrarLogs() {
  const overlay = createModal({
    title: 'Logs do Processo',
    content: '<ul id="fullLog"></ul>',
    buttons: [
      {
        text: 'Fechar',
        color: 'primary',
        action: (overlay) => closeModal(overlay)
      }
    ]
  });

  const fullLogEl = document.getElementById("fullLog"); 
  logCache.forEach(msg => {
    const li = document.createElement("li");
    li.textContent = msg;
    fullLogEl.appendChild(li);
  });
}

// ---------- DT ----------
function addDT() {
  const content = document.createElement("div");
  const inputDT = document.createElement("textarea");
  inputDT.id = "dtInput";
  inputDT.placeholder = "Insira os Dts separados por ';' (ex: DT01; DT02)"; 
  
  content.appendChild(inputDT);

  createModal({
    title: 'Adicionar DTs',
    content: content,
    buttons: [
      {
        text: 'Adicionar',
        color: 'primary',
        action: () => {
          const dtsInput = inputDT.value;
          if (!dtsInput) return;

          const dtsArray = dtsInput.split(";").map(dt => dt.trim()).filter(dt => dt);
          dtsArray.forEach(dt => {
            if (!state.dts[dt]) {
              state.dts[dt] = {
                max: parseInt(document.getElementById("defaultMax").value) || 3,
                status: 'pendente'
              };
            }
          });

          renderDTs();
        }
      },
      {
        text: 'Cancelar',
        color: 'red',
        action: (overlay) => closeModal(overlay)
      }
    ]
  });
}

function renderDTs() {
  const el = document.getElementById("dtParams");
  // Create table header
  if (el.innerHTML === "") {
    table = document.createElement("table");
    table_header = document.createElement("tr");
    table_header.innerHTML = "<th>DT</th><th>Max</th><th>Status</th>";
    table.appendChild(table_header);
    el.appendChild(table);
  } else {
    // Clear existing rows except header
    el.querySelector("table").innerHTML = "<tr><th>DT</th><th>Max</th><th>Status</th></tr>";
  }

  // Insert tabler DT rows
  Object.entries(state.dts).forEach(([dt, {max, status}]) => {
    let row = document.createElement("tr");
    map_status = {
      'pendente': '⏳ Pendente',
      'em_progresso': '⚙️ Em Progresso',
      'concluido': '✅ Concluído',
      'erro': '❌ Erro'
    }
    row.innerHTML = `<td>${dt}</td><td>${max}</td><td>${map_status[status] || status}</td>`;
    el.querySelector("table").appendChild(row);
  });
}

// ---------- ZONAS ----------
function addZona() {
  const content = document.createElement("div");
  const inputZona = document.createElement("input");
  inputZona.id = "zonaInput";
  inputZona.placeholder = "Area/Zona";
  const inputUser = document.createElement("input");
  inputUser.id = "userInput";
  inputUser.placeholder = "Usuário";
  
  content.appendChild(inputZona);
  content.appendChild(document.createElement("br"));
  content.appendChild(inputUser);
  createModal({
    title: 'Adicionar Usuário',
    content: content,
    buttons: [
      {
        text: 'Adicionar',
        color: 'primary',
        action: () => {
          const zona = inputZona.value.trim();
          const user = inputUser.value.trim();
          if (!zona || !user) return;

          if (!state.zonas[zona]) {
            state.zonas[zona] = [];
          }
          state.zonas[zona].push(user);
          localStorage.setItem("zonas", JSON.stringify(state.zonas));
          renderZonas();
        }
      },
      {
        text: 'Cancelar',
        color: 'red',
        action: (overlay) => closeModal(overlay)
      }
    ]
  });

  localStorage.setItem("zonas", JSON.stringify(state.zonas));
  renderZonas();
}

function renderZonas() {
  const el = document.getElementById("userList");
  // Create table
  if (el.innerHTML === "") {
    table = document.createElement("table");
    table_header = document.createElement("tr");
    table_header.innerHTML = "<th>Usuários</th><th>Zona</th>";
    table.appendChild(table_header);
    el.appendChild(table);
  } else {
    // Clear existing rows except header
    el.querySelector("table").innerHTML = "<tr><th>Usuário</th><th>Zona</th>";
  }

  // Insert table zona rows
  Object.entries(state.zonas).forEach(([zona, users]) => {
    el.querySelector("table").innerHTML += `
      <tr>
        <td>${users.join(", ")}</td>
        <td>${zona}</td>
      </tr>`;
  });
}

function clearUsers() {
  // Modal pedir confirmação 
  createModal({
    title: 'Confirmar Limpeza',
    content: 'Tem certeza que deseja limpar a lista de usuários por zona? Esta ação não pode ser desfeita.', 
    buttons: [
      {
        text: 'Confirmar',
        color: 'red',
        action: (overlay) => {
          state.zonas = {};
          localStorage.setItem("zonas", JSON.stringify(state.zonas));
          renderZonas();
          closeModal(overlay);
        }
      },
      {
        text: 'Cancelar',
        color: 'primary',
        action: (overlay) => closeModal(overlay)
      }
    ]
  });
}

// ---------- AÇÃO PRINCIPAL ----------
async function distribuir() {
  const payload = buildPayload();
  console.log("PAYLOAD ENVIADO:", payload);
  console.log("JSON STRING:", JSON.stringify(payload, null, 2));


  if (!payload.tarefas.length) {
    createModal({
      title: "Erro",
      content: "Nenhuma tarefa importada.",
      buttons: [{ text: "OK" }]
    });
    return;
  }

  // Modal fixo de status
  createModal({
    title: 'Processando Distribuição',
    content: '<ul id="log"></ul>',
    closeOnOverlayClick: false
  });

  try {
    log("📤 Enviando dados ao backend...");

    // Atualizar status no front
    Object.keys(state.dts).forEach(dt => state.dts[dt].status = 'em_progresso');
    renderDTs();

    const res = await fetch("http://127.0.0.1:8000/api/distribuir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Erro de comunicação");

    const data = await res.json();

    document.getElementById("resultado").value = data.script;

    log("✅ Distribuição concluída");

    // Atualiza status conforme resposta
    Object.keys(state.dts).forEach(dt => {
      state.dts[dt].status = data.status_por_dt?.[dt] || 'concluido';
    });
    renderDTs();

  } catch (err) {
    log("❌ Erro na distribuição");
    console.error(err);

    Object.keys(state.dts).forEach(dt => state.dts[dt].status = 'erro');
    renderDTs();
  }
}

// ---------- UTIL ----------
function copiar() {
  navigator.clipboard.writeText(
    document.getElementById("resultado").value
  );
  log("📋 Script copiado");
}

function baixar() {
  const blob = new Blob(
    [document.getElementById("resultado").value],
    { type: "text/plain" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "distribuicao.txt";
  a.click();
}

// ---------- Importar csv ou excel de tarefas ----------

document.getElementById("fileInput")?.addEventListener("change", handleFile);

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  createModal({
    title: 'Importando Documento..',
    content: '<ul id="log"></ul>',
    closeOnOverlayClick: false
  });

  log(`📂 Arquivo selecionado: ${file.name}`);

  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = evt => parseCSV(evt.target.result);
    reader.readAsText(file, 'utf-8');
  }
  else if (ext === 'xlsx' || ext === 'xls') {
    parseExcel(file);
  }
  else {
    log('❌ Formato de arquivo não suportado');
  }
}

function parseExcel(file) {
  log("📖 Lendo Excel...");

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (!rows.length) {
      log("❌ Planilha vazia");
      return;
    }

    processarExcel(rows);
  };

  reader.readAsArrayBuffer(file);
}

function processarExcel(rows) {
  log(`📄 ${rows.length} linhas carregadas`);

  // Normalizar chaves
  const tarefas = rows.map(row => ({
    dt: row.DT || row.dt || row.Dt,
    movorder: row.MOVORDER || row.movorder,
    zona: row.ZONA || row.zona,
    tarefa: row.TAREFA || '',
    volume: Number(row.VOLUME || 0)
  })).filter(r => r.dt && r.movorder && r.zona);

  if (!tarefas.length) {
    log("❌ Nenhuma linha válida encontrada");
    return;
  }

  log(`✅ ${tarefas.length} tarefas válidas`);

  processarTarefasImportadas(tarefas);
}


function parseCSV(text) {


  log("📖 Lendo CSV...");
  
  const linhas = text.split(/\r?\n/).filter(l => l.trim());
  const header = linhas.shift().split(";").map(h => h.trim());
  console.log("Header CSV:", header); 

  const idx = {
    dt: header.indexOf("DT"),
    movorder: header.indexOf("MOVORDER"),
    zona: header.indexOf("ZONA"),
    posicao: header.indexOf("POSICAO")
  };

  if (idx.dt === -1 || idx.movorder === -1 || idx.zona === -1 || idx.posicao === -1) {
    log("❌ CSV inválido: colunas obrigatórias ausentes");
    return;
  }

  const tarefas = [];

  linhas.forEach((linha, i) => {
    const cols = linha.split(";").map(c => c.trim());
    tarefas.push({
      dt: cols[idx.dt],
      movorder: cols[idx.movorder],
      zona: cols[idx.zona],
      posicao: cols[idx.posicao]
    });
  });

  log(`✅ ${tarefas.length} tarefas carregadas`);
  processarTarefasImportadas(tarefas);
}

function processarTarefasImportadas(tarefas) {
  tarefas.forEach(t => {
    if (!state.dts[t.dt]) {
      state.dts[t.dt] = {
        max: Number(document.getElementById("defaultMax").value) || 3,
        status: 'pendente'
      };
    }
  });

  renderDTs();
  log("📊 DTs sincronizadas com relatório");
  
  // Guardar tarefas brutas para o backend depois
  state.tarefas = tarefas;
}


renderDTs();
renderZonas();

