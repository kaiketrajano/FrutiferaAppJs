(function () {
  const STORAGE_KEY = "frutiferas";
  let editId = null;

  const $ = (id) => document.getElementById(id);

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatBRFromISO(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return "";
    return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  }

  // idade em meses (diferença entre datas)
  function idadeEmMeses(isoPlantio) {
    const plantio = parseDateISO(isoPlantio);
    if (!plantio) return 0;

    const hoje = new Date();
    let meses = (hoje.getFullYear() - plantio.getFullYear()) * 12 + (hoje.getMonth() - plantio.getMonth());

    // se ainda não completou o mês (dia do mês menor), desconta 1
    if (hoje.getDate() < plantio.getDate()) meses -= 1;

    return Math.max(0, meses);
  }

  function parseDateISO(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function openModal(title) {
    $("modalTitulo").textContent = title;
    const el = $("modalFrutifera");
    bootstrap.Modal.getOrCreateInstance(el).show();
  }

  function closeModal() {
    const el = $("modalFrutifera");
    bootstrap.Modal.getOrCreateInstance(el).hide();
  }

  function clearForm() {
    $("idFrutifera").value = "";
    $("nomePopular").value = "";
    $("nomeCientifico").value = "";
    $("producao").value = "";
    $("dataPlantio").value = "";
  }

  function abrirCadastro() {
    editId = null;
    clearForm();

    // id numérico e único gerado automaticamente
    $("idFrutifera").value = String(Date.now());

    openModal("Cadastrar fruteira");
  }

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

  function salvar() {
    const id = Number(($("idFrutifera").value || "").trim());
    const nomePopular = ($("nomePopular").value || "").trim();
    const nomeCientifico = ($("nomeCientifico").value || "").trim();
    const producao = Number(($("producao").value || "").trim());
    const dataPlantio = ($("dataPlantio").value || "").trim();

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

    // ID único (Date.now) — checagem de duplicidade por segurança
    const duplicado = list.some((x) => x.id === id && x.id !== editId);
    if (duplicado) {
      alert("Já existe uma fruteira com esse identificador. Tente novamente.");
      return;
    }

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
    render($("inputPesquisa").value);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function render(query) {
    const q = (query || "").trim().toLowerCase();
    const container = $("cardsContainer");
    container.innerHTML = "";

    const list = load()
      .slice()
      .sort((a, b) => b.id - a.id) // mais recente primeiro
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
            <div>Use o botão <strong>+</strong> para cadastrar uma fruteira.</div>
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
        <div class="card h-100 shadow-sm card-lift">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <h5 class="card-title mb-1">🍃 ${escapeHtml(f.nomePopular)}</h5>
                <div class="text-muted"><em>${escapeHtml(f.nomeCientifico)}</em></div>
              </div>
              <span class="badge text-bg-secondary mono">#${escapeHtml(f.id)}</span>
            </div>

            <hr class="my-3">

            <div class="d-flex flex-wrap gap-2">
              <span class="badge rounded-pill text-bg-success">📦 ${escapeHtml(f.producao)} Kg/safra</span>
              <span class="badge rounded-pill text-bg-primary">🗓️ ${escapeHtml(idade)} meses</span>
            </div>

            <div class="mt-3 small">
              <div><strong>Plantio:</strong> ${escapeHtml(plantioBR)}</div>
            </div>
          </div>

          <div class="card-footer d-flex justify-content-between align-items-center">
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-primary" data-action="edit" data-id="${f.id}">Editar</button>
              <button class="btn btn-sm btn-danger" data-action="delete" data-id="${f.id}">Excluir</button>
            </div>
            <span class="text-muted small">Pomar</span>
          </div>
        </div>
      `;

      container.appendChild(col);
    });
  }

  function wire() {
    $("btnAdicionar").addEventListener("click", abrirCadastro);
    $("btnSalvar").addEventListener("click", salvar);

    // Botão de pesquisar (requisito do usuário)
    $("btnPesquisar").addEventListener("click", () => render($("inputPesquisa").value));
    $("inputPesquisa").addEventListener("keydown", (e) => {
      if (e.key === "Enter") render($("inputPesquisa").value);
    });

    $("cardsContainer").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id"));
      if (!Number.isFinite(id)) return;

      if (action === "edit") abrirEdicao(id);
      if (action === "delete") excluir(id);
    });
  }

  function start() {
    wire();
    render("");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();