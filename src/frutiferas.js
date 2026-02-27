// Eu coloquei tudo dentro de uma função que já roda sozinha
// porque eu não queria deixar variável “solta” no global e depois dar conflito.
(function () {

  // Essa é a chave que eu uso pra salvar e buscar as fruteiras no LocalStorage.
  // Deixei como const porque isso não tem motivo pra mudar.
  const STORAGE_KEY = "frutiferas";

  // Aqui eu guardo o ID da fruteira quando eu entro em modo de edição
  // (quando eu clico em editar um card).
  let editId = null;

  // Atalho pra pegar elementos do HTML pelo id (pra não repetir getElementById o tempo todo).
  // Assim evito repetir document.getElementById várias vezes.
  const $ = (id) => document.getElementById(id);

  // Essa função lê o LocalStorage e devolve a lista de fruteiras.
  // Se não houver nada salvo ainda, retorna um array vazio.
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY); // tenta pegar os dados salvos
      const data = raw ? JSON.parse(raw) : []; // converte de string para objeto
      return Array.isArray(data) ? data : []; // garante que sempre seja um array
    } catch (e) {
      return []; // se der erro, retorna array vazio
    }
  }

  // Essa função salva a lista atual no LocalStorage.
  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // Só pra formatar número com 2 dígitos (tipo 5 virar 05).
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // Eu guardo a data como yyyy-mm-dd (por causa do input date), mas mostro como dd/mm/aaaa.
  function formatBRFromISO(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return "";
    return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  }

  // Aqui eu calculo a idade em meses (requisito do professor).
  function idadeEmMeses(isoPlantio) {
    const plantio = parseDateISO(isoPlantio);
    if (!plantio) return 0;

    const hoje = new Date();

    // Calcula diferença básica de meses entre as datas.
    let meses = (hoje.getFullYear() - plantio.getFullYear()) * 12 + 
                (hoje.getMonth() - plantio.getMonth());

    // Se ainda não completou o mês atual, desconta 1.
    if (hoje.getDate() < plantio.getDate()) meses -= 1;

    return Math.max(0, meses);
  }

  // Valida se a data tá no formato certo e transforma em Date pra eu conseguir calcular.
  function parseDateISO(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // Abre o modal do Bootstrap e troca o título (Cadastrar/Editar).
  function openModal(title) {
    $("modalTitulo").textContent = title;
    const el = $("modalFrutifera");
    bootstrap.Modal.getOrCreateInstance(el).show();
  }

  // Fecha o modal quando termina.
  function closeModal() {
    const el = $("modalFrutifera");
    bootstrap.Modal.getOrCreateInstance(el).hide();
  }

  // Limpo o formulário pra não ficar com dados antigos quando for cadastrar de novo.
  function clearForm() {
    $("idFrutifera").value = "";
    $("nomePopular").value = "";
    $("nomeCientifico").value = "";
    $("producao").value = "";
    $("dataPlantio").value = "";
  }

  // Quando eu clico em Adicionar, eu preparo tudo pra um cadastro novo.
  function abrirCadastro() {
    editId = null; // garante que estamos criando um novo registro
    clearForm();

    // Gera ID numérico único com Date.now()
    // (eu usei isso porque o professor pediu e é bem simples, não repete fácil)
    $("idFrutifera").value = String(Date.now());

    openModal("Cadastrar fruteira");
  }

  // Quando eu clico em Editar, eu abro o modal já preenchido.
  function abrirEdicao(id) {
    const list = load();
    const item = list.find((x) => x.id === id);
    if (!item) return;

    editId = id;
    $("idFrutifera").value = String(item.id);
    $("nomePopular").value = item.nomePopular || "";
    $("nomeCientifico").value = item.nomeCientifico || "";
    $("producao").value = item.producao ?? "";
    $("dataPlantio").value = item.dataPlantio || "";

    openModal("Editar fruteira");
  }

  // Exclui uma fruteira (com confirmação pra não apagar sem querer).
  function excluir(id) {
    const list = load();
    const item = list.find((x) => x.id === id);
    if (!item) return;

    const ok = confirm(`Excluir a fruteira "${item.nomePopular}"?`);
    if (!ok) return;

    const next = list.filter((x) => x.id !== id);
    save(next);
    render($("inputPesquisa").value);
  }

  // Essa é a função principal: salva um novo cadastro ou atualiza se estiver editando.
  function salvar() {
    const id = Number(($("idFrutifera").value || "").trim());
    const nomePopular = ($("nomePopular").value || "").trim();
    const nomeCientifico = ($("nomeCientifico").value || "").trim();
    const producao = Number(($("producao").value || "").trim());
    const dataPlantio = ($("dataPlantio").value || "").trim();

    // Validações básicas (se faltar algo eu aviso).
    if (!id || !Number.isFinite(id)) {
      alert("Identificador inválido.");
      return;
    }
    if (!nomePopular || !nomeCientifico || !dataPlantio || !Number.isFinite(producao)) {
      alert("Preencha todos os campos corretamente.");
      return;
    }
    if (producao < 0) {
      alert("Produção média deve ser maior ou igual a 0.");
      return;
    }
    if (!parseDateISO(dataPlantio)) {
      alert("Data do plantio inválida.");
      return;
    }

    const list = load();

    const novo = {
      id,
      nomePopular,
      nomeCientifico,
      producao,
      dataPlantio
    };

    let next;
    if (editId === null) {
      next = [...list, novo];
    } else {
      next = list.map((x) => (x.id === editId ? novo : x));
    }

    save(next);
    closeModal();
    // Depois de salvar, eu só mando renderizar de novo pra atualizar a lista na hora.
    render($("inputPesquisa").value);
  }

  // Isso aqui é só pra evitar o usuário quebrar o layout digitando tags HTML no input.
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Monta os cards na tela usando Bootstrap (requisito de listar em cards).
  function render(query) {
    const q = (query || "").trim().toLowerCase();
    const container = $("cardsContainer");
    container.innerHTML = "";

    const list = load()
      .slice()
      .sort((a, b) => b.id - a.id)
      .filter((x) => {
        if (!q) return true;
        return (
          String(x.id).toLowerCase().includes(q) ||
          String(x.nomePopular || "").toLowerCase().includes(q) ||
          String(x.nomeCientifico || "").toLowerCase().includes(q)
        );
      });

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="border rounded-4 bg-white p-4 text-center text-muted shadow-sm">
            <div class="display-6 mb-2">🌿</div>
            <div class="fw-semibold mb-1">Nenhuma fruteira encontrada</div>
            <div>Use o botão <strong>Adicionar</strong> para cadastrar.</div>
          </div>
        </div>
      `;
      return;
    }

    list.forEach((f) => {
      const idade = idadeEmMeses(f.dataPlantio);
      const plantioBR = formatBRFromISO(f.dataPlantio);

      const col = document.createElement("div");
      col.className = "col-12 col-md-6 col-lg-4";

      col.innerHTML = `
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">🍃 ${escapeHtml(f.nomePopular)}</h5>
            <div class="text-muted"><em>${escapeHtml(f.nomeCientifico)}</em></div>
            <hr>
            <span class="badge bg-success">📦 ${escapeHtml(f.producao)} Kg/safra</span>
            <span class="badge bg-primary">🗓️ ${escapeHtml(idade)} meses</span>
            <div class="mt-2"><strong>Plantio:</strong> ${escapeHtml(plantioBR)}</div>
          </div>
          <div class="card-footer d-flex justify-content-between">
            <button class="btn btn-sm btn-primary" data-action="edit" data-id="${f.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${f.id}">Excluir</button>
          </div>
        </div>
      `;

      container.appendChild(col);
    });
  }

  // Ligo os botões e eventos da tela (Adicionar, Salvar, Pesquisar, etc.).
  function wire() {
    $("btnAdicionar").addEventListener("click", abrirCadastro);
    $("btnSalvar").addEventListener("click", salvar);
    $("btnPesquisar").addEventListener("click", () => render($("inputPesquisa").value));

    $("cardsContainer").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id"));

      if (action === "edit") abrirEdicao(id);
      if (action === "delete") excluir(id);
    });
  }

  // Quando a página abre, eu ligo os eventos e já renderizo a lista.
  function start() {
    wire();
    render("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})(); // fim da função autoexecutável
