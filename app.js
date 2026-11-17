"use strict";
// Ritmo — relógio, cronômetro, regressivo, HIIT, despertador, relógio mundial, rotinas de treinos e estudos e a ofensiva.
// Tudo fica neste navegador (localStorage, as mesmas chaves da versão anterior: nada se perde).
// Regras desta versão: (1) os tempos contam pelo RELÓGIO do aparelho, nunca "um segundo por vez" — com a tela
// bloqueada o navegador desacelera os temporizadores e o tempo atrasaria; (2) a tela é montada pelo DOM: o que você
// digita entra como texto, nunca como HTML; (3) um canal de som só, reaproveitado (o navegador limita quantos existem).

// ================================================================ utilidades
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const chaveData = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function el(tag, atributos = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (nome.startsWith("on")) no.addEventListener(nome.slice(2), valor);
    else if (nome === "class") no.className = valor;
    else no.setAttribute(nome, valor === true ? "" : valor);
  }
  no.append(...filhos.flat().filter((f) => f !== null && f !== undefined && f !== false));
  return no;
}

// Lê e grava no navegador sem travar com dado estragado.
function ler(chave, padrao) {
  try {
    const v = JSON.parse(localStorage.getItem(chave));
    return v ?? padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* armazenamento cheio ou bloqueado */ }
}

function falar(texto) {
  if (!("speechSynthesis" in window)) return;
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  speechSynthesis.speak(fala);
}

let audio = null;
function bipe(freq = 800, ms = 200) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume?.();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.connect(g); g.connect(audio.destination);
    o.frequency.value = freq; o.type = "sine";
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
    o.start(t); o.stop(t + ms / 1000);
  } catch { /* sem som neste navegador */ }
}

// Dias ativos (para o calendário e a ofensiva).
const diasAtivos = () => { const d = ler("diasTreinados", []); return Array.isArray(d) ? d.filter((x) => typeof x === "string") : []; };
function marcarDiaAtivo(chave) {
  const dias = diasAtivos();
  if (!dias.includes(chave)) { dias.push(chave); gravar("diasTreinados", dias); }
}

// ================================================================ abas
function abrirAba(nome) {
  for (const b of document.querySelectorAll('[role="tab"]')) b.setAttribute("aria-selected", String(b.dataset.aba === nome));
  for (const s of document.querySelectorAll(".aba")) s.classList.toggle("ativa", s.id === nome);
  document.querySelector(`[role="tab"][data-aba="${nome}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
}
for (const b of document.querySelectorAll('[role="tab"]')) b.addEventListener("click", () => abrirAba(b.dataset.aba));

// ================================================================ relógio
function relogio() {
  const d = new Date();
  $("relogioDisplay").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  $("dataDisplay").textContent = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ================================================================ cronômetro (já contava pelo relógio)
const crono = { id: null, ms: 0, rodando: false };
const fmtCrono = (ms) => `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms % 3600000 / 60000))}:${pad(Math.floor(ms % 60000 / 1000))}.${Math.floor(ms % 1000 / 100)}`;
function botaoCrono() {
  const b = $("cronoStart");
  b.textContent = crono.rodando ? "Pausar" : "Iniciar";
  b.className = `botao ${crono.rodando ? "parar" : "ir"}`;
}
$("cronoStart").addEventListener("click", () => {
  if (crono.rodando) clearInterval(crono.id);
  else {
    const inicio = Date.now() - crono.ms;
    crono.id = setInterval(() => { crono.ms = Date.now() - inicio; $("cronoDisplay").textContent = fmtCrono(crono.ms); }, 50);
  }
  crono.rodando = !crono.rodando;
  botaoCrono();
});
$("cronoLap").addEventListener("click", () => {
  if (crono.ms > 0) $("cronoLaps").prepend(el("li", {}, fmtCrono(crono.ms)));
});
$("cronoReset").addEventListener("click", () => {
  clearInterval(crono.id);
  Object.assign(crono, { ms: 0, rodando: false });
  $("cronoDisplay").textContent = "00:00:00.0";
  $("cronoLaps").replaceChildren();
  botaoCrono();
});

// ================================================================ regressivo (pela hora de fim)
const reg = { id: null, fim: 0, resta: 0 };
const fmtReg = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
function passoRegressivo() {
  reg.resta = Math.max(0, Math.ceil((reg.fim - Date.now()) / 1000));
  $("regDisplay").textContent = fmtReg(reg.resta);
  if (reg.resta === 0) { clearInterval(reg.id); reg.id = null; bipe(); falar("Tempo esgotado!"); }
}
$("regStart").addEventListener("click", () => {
  if (reg.id) return;
  if (reg.resta <= 0) reg.resta = (Number($("regMin").value) || 0) * 60 + (Number($("regSeg").value) || 0);
  if (reg.resta <= 0) return;
  reg.fim = Date.now() + reg.resta * 1000;
  reg.id = setInterval(passoRegressivo, 250);
  passoRegressivo();
});
$("regStop").addEventListener("click", () => { clearInterval(reg.id); reg.id = null; });
$("regReset").addEventListener("click", () => { clearInterval(reg.id); reg.id = null; reg.resta = 0; $("regDisplay").textContent = "00:00"; });

// ================================================================ HIIT (fases pela hora de início)
const hiit = { id: null };
function pararHiit(texto) {
  clearInterval(hiit.id);
  hiit.id = null;
  $("hiitFase").textContent = texto;
}
$("hiitStart").addEventListener("click", () => {
  if (hiit.id) return;
  const tiro = Number($("hiitSprint").value) || 30, descanso = Number($("hiitDescanso").value) || 30;
  const ciclos = Number($("hiitCiclos").value) || 8, inicio = Date.now(), ciclo = tiro + descanso;
  let faseAnterior = "";
  falar("Começou! Tiro!");
  const passo = () => {
    const passados = Math.floor((Date.now() - inicio) / 1000);
    const n = Math.floor(passados / ciclo) + 1, dentro = passados % ciclo;
    if (n > ciclos) {
      pararHiit("Concluído!");
      $("hiitDisplay").textContent = "00";
      falar("Treino concluído! Mandou bem!");
      marcarDiaAtivo(chaveData(new Date()));
      desenharCalendario();
      return;
    }
    const fase = dentro < tiro ? "TIRO" : "DESCANSO";
    $("hiitFase").textContent = fase === "TIRO" ? "Tiro!" : "Descanso";
    $("hiitDisplay").textContent = pad(fase === "TIRO" ? tiro - dentro : ciclo - dentro);
    $("hiitCiclo").textContent = `Ciclo ${n} de ${ciclos}`;
    const chave = `${n}-${fase}`;
    if (faseAnterior && chave !== faseAnterior) { bipe(fase === "TIRO" ? 500 : 900); falar(fase === "TIRO" ? "Tiro!" : "Descanso"); }
    faseAnterior = chave;
  };
  hiit.id = setInterval(passo, 250);
  passo();
});
$("hiitStop").addEventListener("click", () => pararHiit("Parado"));

// ================================================================ despertador
// Toca quando a hora chega OU já passou (e ainda não tocou hoje): antes só tocava se o aparelho olhasse a hora
// exatamente no segundo 00, e com a tela bloqueada isso podia não acontecer.
const alarme = { hora: null, tocouEm: null, id: null };
function conferirAlarme() {
  if (!alarme.hora) return;
  const d = new Date(), agora = `${pad(d.getHours())}:${pad(d.getMinutes())}`, hoje = chaveData(d);
  if (agora >= alarme.hora && alarme.tocouEm !== hoje && alarme.ativadoAntes(d)) {
    alarme.tocouEm = hoje;
    bipe(1000, 500); falar("Acorde! O alarme está tocando!");
    $("alarmeStatus").textContent = `Tocou às ${agora}. Ativo de novo amanhã às ${alarme.hora}.`;
  }
}
$("alarmeSet").addEventListener("click", () => {
  const hora = $("alarmeHora").value;
  if (!hora) { $("alarmeStatus").textContent = "Escolha um horário."; return; }
  const ativadoEm = new Date();
  // Ativado depois da hora de hoje: só toca amanhã.
  const jaPassou = `${pad(ativadoEm.getHours())}:${pad(ativadoEm.getMinutes())}` >= hora;
  Object.assign(alarme, { hora, tocouEm: jaPassou ? chaveData(ativadoEm) : null, ativadoAntes: (d) => d >= ativadoEm });
  $("alarmeStatus").textContent = `Alarme ativo para ${hora}${jaPassou ? " (amanhã)" : ""}.`;
  clearInterval(alarme.id);
  alarme.id = setInterval(conferirAlarme, 1000);
});
$("alarmeOff").addEventListener("click", () => {
  clearInterval(alarme.id);
  alarme.hora = null;
  $("alarmeStatus").textContent = "Nenhum alarme ativo";
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") conferirAlarme(); });

// ================================================================ relógio mundial
const FUSOS = [["São Paulo", "America/Sao_Paulo"], ["Nova York", "America/New_York"], ["Londres", "Europe/London"],
  ["Tóquio", "Asia/Tokyo"], ["Dubai", "Asia/Dubai"], ["Sydney", "Australia/Sydney"]];
function mundial() {
  $("mundialLista").replaceChildren(...FUSOS.map(([nome, fuso]) => el("li", {}, el("span", {}, nome),
    el("b", {}, new Date().toLocaleTimeString("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit", second: "2-digit" })))));
}

// ================================================================ calendário e ofensiva
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
let mesDoCalendario = new Date();
const paraData = (s) => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
const diferencaDias = (d1, d2) => Math.round((d2 - d1) / 86400000);

function ofensiva() {
  const dias = [...new Set(diasAtivos())].map(paraData).sort((a, b) => a - b);
  if (!dias.length) return 0;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (diferencaDias(dias[dias.length - 1], hoje) > 1) return 0;   // ontem ou hoje mantêm a ofensiva
  let seguidos = 1;
  for (let i = dias.length - 1; i > 0; i--) {
    if (diferencaDias(dias[i - 1], dias[i]) === 1) seguidos++;
    else break;
  }
  return seguidos;
}

function desenharOfensiva() {
  const s = ofensiva();
  let recorde = Number.parseInt(ler("recordeOfensiva", 0), 10) || 0;
  if (s > recorde) { recorde = s; gravar("recordeOfensiva", recorde); }
  $("ofensivaNum").textContent = String(s);
  $("ofensivaNum").classList.toggle("apagada", s === 0);
  $("recordeStreak").textContent = `Recorde: ${plural(recorde, "dia", "dias")}`;
}

function desenharCalendario() {
  const ano = mesDoCalendario.getFullYear(), mes = mesDoCalendario.getMonth();
  const dias = diasAtivos(), hoje = chaveData(new Date());
  $("calMesAno").textContent = `${MESES[mes]} ${ano}`;
  const celulas = ["D", "S", "T", "Q", "Q", "S", "S"].map((d) => el("div", { class: "cal-dia semana", "aria-hidden": "true" }, d));
  for (let i = 0; i < new Date(ano, mes, 1).getDay(); i++) celulas.push(el("div", { class: "cal-dia vazio" }));
  let noMes = 0;
  for (let d = 1; d <= new Date(ano, mes + 1, 0).getDate(); d++) {
    const chave = `${ano}-${pad(mes + 1)}-${pad(d)}`, feito = dias.includes(chave);
    if (feito) noMes++;
    celulas.push(el("button", { type: "button", class: `cal-dia${feito ? " feito" : ""}${chave === hoje ? " hoje" : ""}`,
      "aria-pressed": String(feito), "aria-label": `${d} de ${MESES[mes]}${feito ? ": ativo" : ""}`,
      onclick: () => {
        const lista = diasAtivos();
        gravar("diasTreinados", feito ? lista.filter((x) => x !== chave) : [...lista, chave]);
        desenharCalendario();
      } }, String(d)));
  }
  $("calGrid").replaceChildren(...celulas);
  $("totalTreinos").textContent = `${plural(noMes, "dia ativo", "dias ativos")} neste mês · ${dias.length} no total`;
  desenharOfensiva();
}
$("calPrev").addEventListener("click", () => { mesDoCalendario.setMonth(mesDoCalendario.getMonth() - 1, 1); desenharCalendario(); });
$("calNext").addEventListener("click", () => { mesDoCalendario.setMonth(mesDoCalendario.getMonth() + 1, 1); desenharCalendario(); });
$("marcarHoje").addEventListener("click", () => { marcarDiaAtivo(chaveData(new Date())); mesDoCalendario = new Date(); desenharCalendario(); });

// ================================================================ rotinas de treinos e estudos
const ESPORTES = ["Musculação", "Corrida", "Caminhada", "Ciclismo", "Natação", "Muay Thai", "Boxe", "Jiu-Jitsu", "Judô", "Karatê",
  "Taekwondo", "MMA", "Crossfit", "Funcional", "Pilates", "Yoga", "Alongamento", "Futebol", "Futsal", "Vôlei", "Basquete", "Tênis",
  "Handebol", "Escalada", "Surf", "Skate", "Dança", "Spinning", "HIIT", "Calistenia"];
const MATERIAS = ["Matemática", "Português", "Redação", "Leis / Direito", "História", "Geografia", "Física", "Química", "Biologia",
  "Filosofia", "Sociologia", "Programação", "Lógica", "Estatística", "Economia", "Contabilidade", "Administração", "Informática",
  "Atualidades", "Literatura", "Constituição", "Raciocínio Lógico", "Inglês", "Espanhol", "Francês", "Alemão", "Italiano", "Japonês",
  "Chinês (Mandarim)", "Coreano", "Russo", "Árabe", "Latim", "Libras", "Holandês", "Grego"];
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const feitos = () => { const f = ler("atividadesFeitas", []); return Array.isArray(f) ? f.filter((x) => typeof x === "string") : []; };

function rotina(cfg) {
  const dados = () => { const d = ler(cfg.chave, {}); return d && typeof d === "object" && !Array.isArray(d) ? d : {}; };
  $(cfg.lista).replaceChildren(...cfg.sugestoes.map((s) => el("option", { value: s })));
  $(cfg.dia).replaceChildren(...DIAS.map((nome, i) => el("option", { value: i, selected: i === new Date().getDay() }, nome)));
  $(cfg.form).addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = $(cfg.nome).value.trim();
    if (!nome) return;
    const d = dados(), dia = $(cfg.dia).value;
    d[dia] = [...(Array.isArray(d[dia]) ? d[dia] : []), nome];
    gravar(cfg.chave, d);
    $(cfg.nome).value = "";
    desenhar();
  });

  function desenhar() {
    const d = dados(), f = feitos(), agora = new Date(), hoje = chaveData(agora), diaHoje = agora.getDay();
    $(cfg.grade).replaceChildren(...DIAS.map((nomeDia, dia) => {
      const ativs = (Array.isArray(d[dia]) ? d[dia] : []).filter((x) => typeof x === "string");
      return el("div", { class: `dia${dia === diaHoje ? " hoje" : ""}` },
        el("p", { class: "dia-titulo" }, nomeDia, dia === diaHoje ? " (hoje)" : ""),
        ativs.length ? el("ul", {}, ativs.map((nome, i) => {
          const chave = `${hoje}|${nome}|${cfg.tipo}`, feito = dia === diaHoje && f.includes(chave);
          return el("li", { class: feito ? "feito" : "" },
            dia === diaHoje ? el("input", { type: "checkbox", checked: feito, "aria-label": `Feito hoje: ${nome}`,
              onchange: () => {
                const lista = feitos();
                if (lista.includes(chave)) gravar("atividadesFeitas", lista.filter((x) => x !== chave));
                else { gravar("atividadesFeitas", [...lista, chave]); falar(`${nome} concluído!`); marcarDiaAtivo(hoje); }
                desenhar();
                desenharCalendario();
              } }) : null,
            el("span", { class: "nome" }, nome),
            el("button", { type: "button", class: "remover", "aria-label": `Tirar ${nome} de ${nomeDia}`, title: "Tirar",
              onclick: () => { const dd = dados(); dd[dia].splice(i, 1); gravar(cfg.chave, dd); desenhar(); } }, "×"));
        })) : el("p", { class: "livre" }, "livre"));
    }));
    estatisticas();
  }

  function estatisticas() {
    const agora = new Date(), mes = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`;
    const doMes = feitos().filter((f) => f.startsWith(mes) && f.split("|")[2] === cfg.tipo);
    if (!doMes.length) { $(cfg.stats).replaceChildren(el("p", { class: "suave" }, "Nada concluído neste mês ainda. Bora começar!")); return; }
    const contagem = {}, dias = new Set();
    for (const f of doMes) { const [data, nome] = f.split("|"); contagem[nome] = (contagem[nome] || 0) + 1; dias.add(data); }
    const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $(cfg.stats).replaceChildren(
      el("div", { class: "resumo" }, el("div", {}, el("b", {}, String(doMes.length)), "atividades"),
        el("div", {}, el("b", {}, String(dias.size)), "dias ativos")),
      el("p", { class: "ranking-titulo" }, cfg.tipo === "estudo" ? "Mais estudadas" : "Mais praticadas"),
      el("ol", { class: "ranking" }, ranking.map(([nome, n]) => el("li", {}, nome, el("b", {}, ` ${n}×`)))));
  }
  desenhar();
}

rotina({ tipo: "treino", chave: "rotinaTreinos", sugestoes: ESPORTES, dia: "diaSemanaT", nome: "nomeTreinoAtiv", lista: "listaTreinos",
  form: "formTreinos", grade: "gradeTreinos", stats: "statsTreinos" });
rotina({ tipo: "estudo", chave: "rotinaEstudos", sugestoes: MATERIAS, dia: "diaSemanaE", nome: "nomeEstudoAtiv", lista: "listaEstudos",
  form: "formEstudos", grade: "gradeEstudos", stats: "statsEstudos" });

// ================================================================ início
relogio();
mundial();
setInterval(() => { relogio(); mundial(); }, 1000);
desenharCalendario();
