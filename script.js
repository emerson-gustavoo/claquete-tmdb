// chave da api do tmdb, peguei em themoviedb.org > configuracoes > api
const API_KEY = "96a78147b87de7c24707134c49346172";

// minha matricula, a api de logs do professor usa ela pra separar os logs de cada aluno
const MATRICULA = "390832";

const URL_API = "https://api.themoviedb.org/3";
const URL_IMAGEM = "https://image.tmdb.org/t/p/w300";
const URL_LOGS = "https://www.piway.com.br/unoesc/api";

// id e nome do filme que ta aberto nos detalhes (uso no POST, no DELETE e nos logs)
let filmeAtual = null;
let tituloAtual = "";

// sessao de convidado do tmdb, precisa dela pra dar nota sem fazer login
let sessaoId = null;


// =============== GET ===============

// funcao que eu uso pra fazer todos os GET na api
// so passo o caminho e os parametros extras (ex: "&query=batman")
async function buscarApi(caminho, parametros = "") {
  const url = URL_API + caminho + "?api_key=" + API_KEY + "&language=pt-BR" + parametros;
  const resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error("erro " + resposta.status);
  }

  return resposta.json();
}

// mostra a lista de filmes na tela
// aqui eh a exibicao COM repeticao, um card pra cada filme
function mostrarFilmes(filmes) {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  if (filmes.length == 0) {
    lista.innerHTML = "<p>Nenhum filme encontrado.</p>";
    return;
  }

  for (const filme of filmes) {
    let imagem = "";
    if (filme.poster_path) {
      imagem = `<img src="${URL_IMAGEM}${filme.poster_path}" alt="Poster do filme">`;
    }

    lista.innerHTML += `
      <div class="card" onclick="abrirDetalhes(${filme.id})">
        ${imagem}
        <h3>${filme.title}</h3>
        <p>Nota: ${filme.vote_average.toFixed(1)}</p>
      </div>
    `;
  }
}

function mostrarErro() {
  document.getElementById("lista").innerHTML =
    "<p>Deu erro ao carregar os filmes. Confere a chave da API no script.js.</p>";
}

// GET SEM filtro: filmes populares (eh o que aparece quando abre o site)
async function carregarPopulares() {
  document.getElementById("titulo-lista").textContent = "Filmes populares";

  try {
    const dados = await buscarApi("/discover/movie");
    mostrarFilmes(dados.results);
    registrarLog("Filmes populares", dados.results.length + " filmes");
  } catch (erro) {
    mostrarErro();
  }
}

// GET COM filtro: genero e/ou ano (mesmo metodo do de cima, so que com parametros)
async function filtrar(evento) {
  evento.preventDefault(); // pra nao recarregar a pagina

  const genero = document.getElementById("genero").value;
  const ano = document.getElementById("ano").value;

  // se nao escolheu nada, volta pros populares
  if (genero == "" && ano == "") {
    carregarPopulares();
    return;
  }

  let parametros = "";
  if (genero != "") {
    parametros += "&with_genres=" + genero;
  }
  if (ano != "") {
    parametros += "&primary_release_year=" + ano;
  }

  document.getElementById("titulo-lista").textContent = "Filmes filtrados";

  try {
    const dados = await buscarApi("/discover/movie", parametros);
    mostrarFilmes(dados.results);
    registrarLog("Filtrar filmes", dados.results.length + " filmes");
  } catch (erro) {
    mostrarErro();
  }
}

// GET COM filtro: busca pelo nome
async function buscar(evento) {
  evento.preventDefault();

  const texto = document.getElementById("busca").value.trim();
  if (texto == "") {
    return;
  }

  document.getElementById("titulo-lista").textContent = "Resultado da busca: " + texto;

  try {
    // encodeURIComponent pra nao dar problema com espaco e acento
    const dados = await buscarApi("/search/movie", "&query=" + encodeURIComponent(texto));
    mostrarFilmes(dados.results);
    registrarLog("Buscar filme", dados.results.length + " filmes para " + texto);
  } catch (erro) {
    mostrarErro();
  }
}

// GET dos detalhes de UM filme
// aqui eh a exibicao SEM repeticao, mostra os campos de um filme so
async function abrirDetalhes(id) {
  try {
    const filme = await buscarApi("/movie/" + id);
    filmeAtual = filme.id;
    tituloAtual = filme.title;
    registrarLog("Detalhes do filme", filme.title);

    let imagem = "";
    if (filme.poster_path) {
      imagem = `<img src="${URL_IMAGEM}${filme.poster_path}" alt="Poster do filme">`;
    }

    // a api manda a data como 2024-02-29, aqui eu viro pra 29/02/2024
    const data = filme.release_date.split("-").reverse().join("/");

    // os generos vem numa lista, junto tudo separado por virgula
    const generos = filme.genres.map(genero => genero.name).join(", ");

    document.getElementById("detalhes-conteudo").innerHTML = `
      ${imagem}
      <h2>${filme.title}</h2>
      <p><b>Título original:</b> ${filme.original_title}</p>
      <p><b>Lançamento:</b> ${data}</p>
      <p><b>Duração:</b> ${filme.runtime} minutos</p>
      <p><b>Gêneros:</b> ${generos}</p>
      <p><b>Nota no TMDB:</b> ${filme.vote_average.toFixed(1)} (${filme.vote_count} votos)</p>
      <p><b>Sinopse:</b> ${filme.overview || "Sem sinopse em português."}</p>
    `;

    document.getElementById("msg-nota").textContent = "";
    document.getElementById("detalhes").hidden = false;
    window.scrollTo(0, 0); // sobe a pagina pra ver os detalhes
  } catch (erro) {
    alert("Nao deu pra carregar os detalhes desse filme.");
  }
}


// =============== POST e DELETE ===============

// pra dar nota sem login o tmdb usa uma "sessao de convidado"
// entao na primeira vez eu crio uma sessao (isso eh um GET) e guardo o id
async function pegarSessao() {
  if (sessaoId == null) {
    const dados = await buscarApi("/authentication/guest_session/new");
    sessaoId = dados.guest_session_id;
    registrarLog("Criar sessao", "sessao criada");
  }
  return sessaoId;
}

// POST: manda a nota escolhida pro tmdb
async function enviarNota() {
  const nota = document.getElementById("nota").value;
  const mensagem = document.getElementById("msg-nota");

  try {
    const sessao = await pegarSessao();
    const url = URL_API + "/movie/" + filmeAtual + "/rating?api_key=" + API_KEY + "&guest_session_id=" + sessao;

    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify({ value: Number(nota) }) // a api pede a nota nesse formato
    });

    if (resposta.ok) {
      registrarLog("Enviar nota POST", "nota " + nota + " para " + tituloAtual);
      mensagem.textContent = "Nota " + nota + " enviada!";
    } else {
      registrarLog("Enviar nota POST", "erro " + resposta.status);
      mensagem.textContent = "Erro ao enviar a nota.";
    }
  } catch (erro) {
    mensagem.textContent = "Erro ao enviar a nota.";
  }
}

// DELETE: tira a nota que eu dei pro filme
async function removerNota() {
  const mensagem = document.getElementById("msg-nota");

  try {
    const sessao = await pegarSessao();
    const url = URL_API + "/movie/" + filmeAtual + "/rating?api_key=" + API_KEY + "&guest_session_id=" + sessao;

    const resposta = await fetch(url, { method: "DELETE" });

    if (resposta.ok) {
      registrarLog("Remover nota DELETE", "nota removida de " + tituloAtual);
      mensagem.textContent = "Nota removida!";
    } else {
      // da erro se o filme nao tinha nota nessa sessao
      registrarLog("Remover nota DELETE", "erro " + resposta.status);
      mensagem.textContent = "Esse filme não tem nota sua para remover.";
    }
  } catch (erro) {
    mensagem.textContent = "Erro ao remover a nota.";
  }
}


// =============== LOGS===============

// INSERIR log
// chamo essa funcao depois de cada requisicao pro tmdb, ja com a resposta em maos
async function registrarLog(metodo, resultado) {
  const resultadoLimpo = String(resultado)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replaceAll("/", "-")
    .slice(0, 100);

  const url = URL_LOGS + "/inserir/log/" + MATRICULA + "/TMDB/"
    + encodeURIComponent(metodo) + "/" + encodeURIComponent(resultadoLimpo);

  try {
    await fetch(url);
    carregarLogs(); // atualiza a tabela pra ja aparecer o log novo
  } catch (erro) {
    console.log("nao consegui gravar o log", erro);
  }
}

// a api manda a data assim: 2026-10-20 19:32:15, aqui viro pra 20/10/2026 19:32:15
function formatarDataLog(texto) {
  const partes = texto.split(" ");
  return partes[0].split("-").reverse().join("/") + " " + partes[1];
}

// EXIBIR logs
// busca todos os logs da minha matricula e monta a tabela (com repeticao)
async function carregarLogs() {
  const tabela = document.getElementById("tabela-logs");
  const mensagem = document.getElementById("msg-logs");

  try {
    const resposta = await fetch(URL_LOGS + "/logs/" + MATRICULA);
    const texto = await resposta.text();

    // se a matricula estiver errada a api manda uma mensagem em vez da lista
    let logs = null;
    try {
      logs = JSON.parse(texto);
    } catch (erro) {}

    if (!Array.isArray(logs)) {
      mensagem.textContent = texto;
      tabela.innerHTML = "";
      return;
    }

    if (logs.length == 0) {
      mensagem.textContent = "Nenhum log registrado ainda.";
      tabela.innerHTML = "";
      return;
    }

    mensagem.textContent = logs.length + " logs registrados.";
    tabela.innerHTML = "";

      for (const log of logs.reverse()) {
      tabela.innerHTML += `
        <tr>
          <td>${formatarDataLog(log.log)}</td>
          <td>${log.api}</td>
          <td>${log.metodo}</td>
          <td>${log.resultado}</td>
          <td><button onclick="excluirLog(${log.idlog})">Excluir</button></td>
        </tr>
      `;
    }
  } catch (erro) {
    mensagem.textContent = "Erro ao carregar os logs.";
  }
}

// EXCLUIR log pelo id
async function excluirLog(id) {
  if (!confirm("Quer mesmo excluir esse log?")) {
    return;
  }

  try {
    await fetch(URL_LOGS + "/excluir/log/" + id + "/aluno/" + MATRICULA);
    carregarLogs(); // recarrega a tabela sem o log excluido
  } catch (erro) {
    alert("Erro ao excluir o log.");
  }
}


// =============== EVENTOS ===============

document.getElementById("form-busca").addEventListener("submit", buscar);
document.getElementById("form-filtro").addEventListener("submit", filtrar);

// limpar filtros = chama de novo sem filtro nenhum
document.getElementById("limpar").addEventListener("click", function () {
  document.getElementById("form-filtro").reset();
  document.getElementById("busca").value = "";
  carregarPopulares();
});

document.getElementById("fechar").addEventListener("click", function () {
  document.getElementById("detalhes").hidden = true;
});

document.getElementById("btn-enviar-nota").addEventListener("click", enviarNota);
document.getElementById("btn-remover-nota").addEventListener("click", removerNota);

document.getElementById("btn-atualizar-logs").addEventListener("click", carregarLogs);

// quando abre o site ja carrega os filmes populares e os logs
carregarPopulares();
carregarLogs();
