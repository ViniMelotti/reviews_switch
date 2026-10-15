"use strict";

// Para adicionar uma review, inclua outro objeto no array de games.json.
// status: "zerado", "jogando" ou "abandonado".
// desempenho.status: "roda-bem", "quedas-fps" ou "roda-mal".
// horas e desempenho.obs são opcionais. Use \n\n entre os parágrafos da review.
// Sem avaliação definida, use notas: null e desempenho: null (ou omita esses campos).
// Salve os prints em img/ e informe o caminho relativo no campo imagem.
// Prévia local: python -m http.server 8000, nesta pasta, e http://localhost:8000.
// No GitHub Pages, coloque estes quatro arquivos na raiz publicada do repositório.

// Contador opcional: crie um site em https://www.goatcounter.com/ e habilite
// "Allow adding visitor counts on your website" nas configurações do serviço.
// Cole somente o endereço público abaixo, por exemplo: "https://seusite.goatcounter.com".
// Deixe vazio para manter desativado. Não é necessário token nem chave de API.
// A contagem pública pode levar até 4 horas para atualizar; testes locais não contam.
const GOATCOUNTER_SITE = "https://vinimelotti.goatcounter.com";

const gamesContainer = document.querySelector("#games");
const gameCount = document.querySelector("#game-count");
const loadMessage = document.querySelector("#load-message");
const reviewDialog = document.querySelector("#review-dialog");
const reviewContent = document.querySelector("#review-content");
const searchForm = document.querySelector("#game-search");
const searchControls = document.querySelector("#search-controls");
const searchTitle = document.querySelector("#search-title");
const statusFilter = document.querySelector("#status-filter");
const sortGames = document.querySelector("#sort-games");
const clearFilters = document.querySelector("#clear-filters");
const noResults = document.querySelector("#no-results");
let library = [];
let activeGameButton = null;

const consolePhoto = document.querySelector("#console-photo");
const consolePhotoFallback = document.querySelector("#console-photo-fallback");
function updateConsolePhoto() {
  const available = consolePhoto.naturalWidth > 0;
  consolePhoto.classList.toggle("is-loaded", available);
  consolePhoto.hidden = !available;
  consolePhotoFallback.hidden = available;
  if (available) consolePhoto.removeAttribute("aria-hidden");
}
consolePhoto.addEventListener("load", updateConsolePhoto);
consolePhoto.addEventListener("error", updateConsolePhoto);
if (consolePhoto.complete) updateConsolePhoto();

const ratingNames = {
  jogabilidade: "Jogabilidade",
  diversao: "Diversão",
  historia: "História"
};
const gameStatuses = {
  zerado: "Zerado",
  jogando: "Jogando",
  abandonado: "Abandonado"
};
const performanceStatuses = {
  "roda-bem": "Roda bem",
  "quedas-fps": "Tem quedas de fps",
  "roda-mal": "Roda mal"
};
const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const averageFormat = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const titleCollator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
const totalFormat = new Intl.NumberFormat("pt-BR");

function getAverage(game) {
  if (game.notas == null) return null;
  return Object.keys(ratingNames).reduce((sum, key) => sum + game.notas[key], 0) / 3;
}

function normalizeTitle(title) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function updateTotals(loaded = true) {
  const played = library.length;
  const completed = library.filter(({ game }) => game.status === "zerado").length;
  document.querySelector("#played-total").textContent = loaded ? totalFormat.format(played) : "—";
  document.querySelector("#completed-total").textContent = loaded ? totalFormat.format(completed) : "—";
  document.querySelector("#played-label").textContent = played === 1 ? "Jogo jogado" : "Jogos jogados";
  document.querySelector("#completed-label").textContent = completed === 1 ? "Jogo zerado" : "Jogos zerados";
}

function renderGames() {
  const query = normalizeTitle(searchTitle.value);
  const filtered = Boolean(query) || statusFilter.value !== "todos";
  const visible = library.filter(({ game, searchName }) =>
    searchName.includes(query) && (statusFilter.value === "todos" || game.status === statusFilter.value)
  );
  visible.sort((a, b) => {
    const alphabetical = titleCollator.compare(a.game.titulo, b.game.titulo);
    switch (sortGames.value) {
      case "titulo-za": return -alphabetical;
      // Jogos sem nota ficam depois dos avaliados, inclusive de uma nota zero.
      case "nota": return (getAverage(b.game) ?? -1) - (getAverage(a.game) ?? -1) || alphabetical;
      case "horas": return (b.game.horas ?? -1) - (a.game.horas ?? -1) || alphabetical;
      default: return alphabetical;
    }
  });
  const fragment = document.createDocumentFragment();
  visible.forEach(({ game, index }) => fragment.append(createGameTile(game, index)));
  gamesContainer.replaceChildren(fragment);
  const count = totalFormat.format(visible.length);
  const reviewed = library.filter(({ game }) => getAverage(game) !== null).length;
  gameCount.textContent = filtered
    ? `${count} de ${totalFormat.format(library.length)} ${library.length === 1 ? "jogo" : "jogos"}`
    : `${count} ${visible.length === 1 ? "jogo" : "jogos"} no histórico · ${totalFormat.format(reviewed)} ${reviewed === 1 ? "avaliado" : "avaliados"}`;
  clearFilters.hidden = !filtered;
  noResults.hidden = visible.length > 0 || !library.length;
}

searchForm.addEventListener("submit", event => event.preventDefault());
searchTitle.addEventListener("input", renderGames);
statusFilter.addEventListener("change", renderGames);
sortGames.addEventListener("change", renderGames);
clearFilters.addEventListener("click", () => {
  searchTitle.value = "";
  statusFilter.value = "todos";
  renderGames();
  searchTitle.focus();
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgIcon(kind, className) {
  // Somente marcação fixa; o conteúdo de games.json nunca é interpretado como HTML.
  const template = document.createElement("template");
  template.innerHTML = kind === "check"
    ? '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 84 56" fill="none" aria-hidden="true"><rect x="2" y="2" width="80" height="52" rx="5" stroke="currentColor" stroke-width="1.5"/><circle cx="58" cy="17" r="5" stroke="currentColor" stroke-width="1.5"/><path d="m9 44 21-22 17 17 11-10 17 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const svg = template.content.firstElementChild;
  if (className) svg.setAttribute("class", className);
  return svg;
}

function validateGames(data) {
  if (!Array.isArray(data)) {
    throw new Error("O games.json precisa conter uma lista entre colchetes [ ].");
  }
  data.forEach((game, index) => {
    const fail = (message) => { throw new Error(`Jogo ${index + 1}: ${message}`); };
    if (!game || typeof game !== "object" || Array.isArray(game)) fail("o bloco precisa ser um objeto.");
    if (typeof game.titulo !== "string" || !game.titulo.trim()) fail("informe um título.");
    if (!Object.hasOwn(gameStatuses, game.status)) fail("use o status zerado, jogando ou abandonado.");
    if (game.notas != null) {
      if (typeof game.notas !== "object" || Array.isArray(game.notas)) fail("informe as três notas ou use null para uma avaliação pendente.");
      for (const key of Object.keys(ratingNames)) {
        const value = game.notas[key];
        if (!Number.isFinite(value) || value < 0 || value > 10) {
          fail(`a nota de ${ratingNames[key].toLowerCase()} precisa ser um número entre 0 e 10.`);
        }
      }
    }
    if (game.horas != null && (!Number.isFinite(game.horas) || game.horas < 0)) {
      fail("as horas precisam ser um número maior ou igual a zero, ou o campo pode ser omitido.");
    }
    if (game.imagem != null && typeof game.imagem !== "string") fail("imagem precisa ser um caminho de arquivo.");
    if (game.imagemAlt != null && typeof game.imagemAlt !== "string") fail("imagemAlt precisa ser um texto.");
    if (game.desempenho != null) {
      if (typeof game.desempenho !== "object" || Array.isArray(game.desempenho) || !Object.hasOwn(performanceStatuses, game.desempenho.status)) {
        fail("use roda-bem, quedas-fps ou roda-mal no status de desempenho, ou null para uma avaliação pendente.");
      }
      if (game.desempenho.obs != null && typeof game.desempenho.obs !== "string") fail("a observação de desempenho precisa ser um texto.");
    }
    if (typeof game.review !== "string" || !game.review.trim()) fail("escreva o texto da review.");
  });
  return data;
}

function createImage(game, average, index, thumbnail = false) {
  const figure = element("figure", "review-image");
  if (thumbnail) figure.classList.add("tile-image");
  const placeholder = element("div", "image-placeholder");
  placeholder.setAttribute("role", "img");
  placeholder.setAttribute("aria-label", `Espaço para o print de ${game.titulo}. Imagem indisponível.`);
  placeholder.append(
    svgIcon("image", "placeholder-icon"),
    element("span", "placeholder-title", thumbnail ? game.titulo : "Print ainda não adicionado"),
    element("span", "placeholder-caption", thumbnail ? "Print ainda não adicionado" : "Um espaço reservado para a minha captura de jogo.")
  );
  figure.append(placeholder);

  if (game.imagem && game.imagem.trim()) {
    const image = element("img");
    image.alt = game.imagemAlt?.trim() || `Print de ${game.titulo}`;
    image.width = 1280;
    image.height = 720;
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";
    image.setAttribute("aria-hidden", "true");
    image.addEventListener("load", () => {
      image.classList.add("is-loaded");
      image.removeAttribute("aria-hidden");
      placeholder.hidden = true;
    }, { once: true });
    image.addEventListener("error", () => {
      image.remove();
      placeholder.hidden = false;
    }, { once: true });
    figure.append(image);
    image.src = game.imagem;
  }

  if (thumbnail || average === null) return figure;

  const stamp = element("div", "score-stamp");
  stamp.setAttribute("role", "img");
  stamp.setAttribute("aria-label", `Nota média total: ${averageFormat.format(average)} de 10.`);
  stamp.append(
    element("span", "score-stamp-label", "Nota média total"),
    element("span", "score-stamp-value", averageFormat.format(average)),
    element("span", "score-stamp-scale", "de 10")
  );
  figure.append(stamp);
  return figure;
}

function createRatings(game, index) {
  const ratings = element("section", "review-ratings");
  const heading = element("h3", "small-heading", "As notas");
  heading.id = `notas-${index}`;
  ratings.setAttribute("aria-labelledby", heading.id);
  const list = element("ul", "ratings-list");
  ratings.append(heading);

  if (game.notas == null) {
    ratings.append(element("p", "pending-rating", "Notas ainda não definidas."));
  } else for (const [key, name] of Object.entries(ratingNames)) {
    const item = element("li");
    const label = element("div", "rating-label");
    const value = element("span", "rating-value", numberFormat.format(game.notas[key]));
    value.append(element("span", "rating-scale", "/ 10"));
    label.append(element("span", "", name), value);
    const meter = element("meter");
    meter.min = 0;
    meter.max = 10;
    meter.value = game.notas[key];
    meter.setAttribute("aria-label", `${name}: ${numberFormat.format(game.notas[key])} de 10`);
    meter.textContent = `${numberFormat.format(game.notas[key])} de 10`;
    item.append(label, meter);
    list.append(item);
  }
  if (list.children.length) ratings.append(list);

  const performance = element("div", "performance");
  performance.append(element("h3", "small-heading", "Desempenho"));
  if (game.desempenho == null) {
    performance.append(element("p", "performance-note", "Ainda não avaliado."));
  } else {
    performance.append(element("span", `performance-badge performance-badge--${game.desempenho.status}`, performanceStatuses[game.desempenho.status]));
    if (game.desempenho.obs?.trim()) {
      performance.append(element("p", "performance-note", game.desempenho.obs.trim()));
    }
  }
  performance.append(element("p", "performance-device", "Switch Lite · Modo portátil."));
  ratings.append(performance);
  return ratings;
}

function createReview(game, index) {
  const article = element("article", "review-card");
  const titleId = "review-title";
  article.setAttribute("aria-labelledby", titleId);
  const average = getAverage(game);
  const eyebrow = element("div", "review-eyebrow");
  eyebrow.append(
    element("span", "review-index", `Registro ${String(index + 1).padStart(2, "0")}`),
    element("span", "review-platform", "Switch Lite · Modo portátil")
  );

  const header = element("header", "review-heading");
  const title = element("h2", "review-title", game.titulo);
  title.id = titleId;
  title.tabIndex = -1;
  const meta = element("div", "review-meta");
  const status = element("span", `game-status game-status--${game.status}`);
  if (game.status === "zerado") status.append(svgIcon("check"));
  status.append(document.createTextNode(gameStatuses[game.status]));
  meta.append(status);
  if (average === null) meta.append(element("span", "pending-label", "Sem nota"));
  if (game.horas != null) {
    meta.append(element("span", "game-hours", `${numberFormat.format(game.horas)} h de jogo`));
  }
  header.append(title, meta);

  const body = element("div", "review-body");
  const copy = element("section", "review-copy");
  const copyHeading = element("h3", "small-heading", "Minha experiência");
  copyHeading.id = `opiniao-${index}`;
  copy.setAttribute("aria-labelledby", copyHeading.id);
  const text = element("div", "review-text");
  game.review.trim().split(/\r?\n\s*\r?\n/).filter(part => part.trim()).forEach(part => {
    text.append(element("p", "", part.trim()));
  });
  copy.append(copyHeading, text);
  // A ordem do documento garante notas antes do texto no celular e na leitura assistiva.
  body.append(createRatings(game, index), copy);
  article.append(eyebrow, createImage(game, average, index), header, body);
  return article;
}

function createGameTile(game, index) {
  const tile = element("article", "game-tile");
  const info = element("div", "tile-info");
  const pending = getAverage(game) === null;
  const number = element("span", "tile-number", `${pending ? "Registro" : "Review"} / ${String(index + 1).padStart(2, "0")}`);
  const title = element("h3", "tile-title");
  const open = element("button", "game-open", game.titulo);
  open.type = "button";
  open.setAttribute("aria-label", `${pending ? "Ver registro" : "Abrir review"} de ${game.titulo}`);
  open.setAttribute("aria-haspopup", "dialog");
  open.setAttribute("aria-controls", "review-dialog");
  open.addEventListener("click", () => openReview(game, index, open));
  title.append(open);
  const heading = element("div", "tile-heading");
  heading.append(title);
  const meta = element("div", "tile-meta");
  const status = element("span", `game-status game-status--${game.status}`);
  if (game.status === "zerado") status.append(svgIcon("check"));
  status.append(document.createTextNode(gameStatuses[game.status]));
  const action = element("span", "tile-action", pending ? "Sem nota · Ver registro ↗" : "Ler review ↗");
  action.setAttribute("aria-hidden", "true");
  meta.append(status, action);
  info.append(heading, meta);
  tile.append(number, createImage(game, null, index, true), info);
  return tile;
}

function openReview(game, index, trigger) {
  activeGameButton = trigger;
  // A review só é montada quando o jogo é aberto.
  reviewContent.replaceChildren(createReview(game, index));
  reviewDialog.showModal();
  document.body.classList.add("review-is-open");
  reviewDialog.scrollTop = 0;
  document.querySelector("#review-title").focus({ preventScroll: true });
}

document.querySelector("#close-review").addEventListener("click", () => reviewDialog.close());
reviewDialog.addEventListener("keydown", event => {
  if (event.key !== "Tab") return;
  const controls = [...reviewDialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter(control => control.getClientRects().length > 0);
  if (!controls.length) return;
  const first = controls[0];
  const last = controls[controls.length - 1];
  const current = document.activeElement;
  if (event.shiftKey && (current === first || !controls.includes(current))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (current === last || !controls.includes(current))) {
    event.preventDefault();
    first.focus();
  }
});
reviewDialog.addEventListener("close", () => {
  document.body.classList.remove("review-is-open");
  reviewContent.replaceChildren();
  if (activeGameButton?.isConnected) activeGameButton.focus({ preventScroll: true });
  activeGameButton = null;
});

// Escape é tratado pelo dialog nativo. O fundo também permite fechar a review,
// desde que o gesto comece e termine fora da janela (sem fechar ao selecionar texto).
function isBackdrop(event) {
  const bounds = reviewDialog.getBoundingClientRect();
  return event.target === reviewDialog && (
    event.clientX < bounds.left || event.clientX > bounds.right ||
    event.clientY < bounds.top || event.clientY > bounds.bottom
  );
}
let startedOnBackdrop = false;
reviewDialog.addEventListener("pointerdown", event => { startedOnBackdrop = isBackdrop(event); });
reviewDialog.addEventListener("click", event => {
  if (startedOnBackdrop && isBackdrop(event)) reviewDialog.close();
  startedOnBackdrop = false;
});

function showLoadError(error) {
  gameCount.textContent = "Histórico indisponível";
  loadMessage.setAttribute("role", "alert");
  const title = element("h3", "", "Não foi possível carregar os jogos");
  const explanation = element("p", "", "Para abrir este site no computador, é preciso usar um servidor local. Abrir o index.html diretamente pode bloquear a leitura do games.json.");
  const instructions = element("p", "", "Com Python instalado, abra o terminal na pasta dos quatro arquivos e execute: ");
  instructions.append(element("code", "", "python -m http.server 8000"));
  instructions.append(document.createTextNode(" Depois, acesse http://localhost:8000 no navegador. No GitHub Pages, o carregamento funciona pela URL publicada."));
  const detail = element("p", "", "Se você já está usando um servidor, confirme que games.json está na mesma pasta de index.html e contém um JSON válido.");
  const reason = element("p", "", `Detalhe: ${error.message || "falha na leitura do arquivo."}`);
  const retry = element("button", "retry-button", "Tentar novamente");
  retry.type = "button";
  retry.addEventListener("click", () => loadGames(true));
  loadMessage.replaceChildren(title, explanation, instructions, detail, reason, retry);
  loadMessage.hidden = false;
}

async function loadGames(fromRetry = false) {
  library = [];
  updateTotals(false);
  searchControls.disabled = true;
  noResults.hidden = true;
  clearFilters.hidden = true;
  gamesContainer.setAttribute("aria-busy", "true");
  gameCount.textContent = "Carregando histórico…";
  loadMessage.hidden = true;
  loadMessage.removeAttribute("role");
  gamesContainer.replaceChildren();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("./games.json", { cache: "no-cache", signal: controller.signal });
    if (!response.ok) throw new Error(`games.json retornou o código HTTP ${response.status}.`);
    const games = validateGames(await response.json());
    library = games.map((game, index) => ({ game, index, searchName: normalizeTitle(game.titulo) }));
    updateTotals();
    renderGames();
    searchControls.disabled = !games.length;
    if (!games.length) {
      loadMessage.replaceChildren(element("p", "", "Ainda não há jogos neste histórico."));
      loadMessage.hidden = false;
    }
  } catch (error) {
    if (error.name === "AbortError") error = new Error("O carregamento demorou demais. Verifique sua conexão e tente novamente.");
    showLoadError(error);
  } finally {
    clearTimeout(timeout);
    gamesContainer.setAttribute("aria-busy", "false");
    // Ao retirar o botão de repetição, preserve um ponto de foco útil para o teclado.
    if (fromRetry) document.querySelector("#historico").focus();
  }
}

async function initSiteViews() {
  const count = document.querySelector("#site-views-count");
  const note = document.querySelector("#site-views-note");
  if (!GOATCOUNTER_SITE.trim()) return;

  let origin;
  try {
    const address = new URL(GOATCOUNTER_SITE.trim());
    if (address.protocol !== "https:" || !/^[a-z0-9-]+\.goatcounter\.com$/i.test(address.hostname) || address.username || address.password || address.port) {
      throw new Error("Endereço inválido");
    }
    origin = address.origin;
  } catch {
    note.textContent = "Contador não configurado";
    return;
  }

  const localPreview = !/^https?:$/.test(location.protocol) ||
    /^(localhost$|.*\.localhost$|\[::1\]$|127\.|0\.0\.0\.0$|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(location.hostname);
  if (localPreview) {
    note.textContent = "Prévia local · não contabilizada";
    return;
  }

  note.textContent = "Carregando visualizações…";
  // Um registro por carregamento de página, sem eventos de filtros ou reviews.
  // no_session conta também recargas: este é um total de visualizações, não de pessoas.
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.setAttribute("data-goatcounter", `${origin}/count`);
  script.setAttribute("data-goatcounter-settings", JSON.stringify({
    no_events: true,
    no_session: true,
    path: location.pathname
  }));
  document.head.append(script);

  // A consulta do total é independente do registro da visita e não exige chave privada.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${origin}/counter/TOTAL.json`, {
      signal: controller.signal,
      credentials: "omit"
    });
    if (!response.ok) throw new Error("Total indisponível");
    const data = await response.json();
    // A resposta oficial contém uma string com separadores de milhares, como "1,234".
    const raw = data.count;
    if ((typeof raw !== "string" && typeof raw !== "number") || !/^\d[\d,\s]*$/.test(String(raw))) {
      throw new Error("Total inválido");
    }
    const total = Number(String(raw).replace(/[,\s]/g, ""));
    if (!Number.isSafeInteger(total) || total < 0) throw new Error("Total inválido");
    count.textContent = totalFormat.format(total);
    note.textContent = "Desde a ativação · atualização periódica";
  } catch {
    // Uma falha no serviço nunca deve aparecer como zero visualizações.
    count.textContent = "—";
    note.textContent = "Indisponível no momento";
  } finally {
    clearTimeout(timeout);
  }
}

loadGames();
initSiteViews();
