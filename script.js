(() => {
  const $ = id => document.getElementById(id);
  const chat = $("chat");
  let recognition = null, listening = false, ownerConfigured = false, ownerUnlocked = false;
  let unlockExpires = 0;
  const API = "https://alex-assistente-api.onrender.com";
  const dangerousPattern = /\b(apag(ar|ue)|exclu(ir|a)|format(ar|e)|destruir|remover tudo|limpar todas as pastas)\b/i;
  const activation = /\balex\b/i;

  function addMessage(who, text) {
    const el = document.createElement("div");
    el.className = `msg ${who}`;
    const b = document.createElement("b");
    b.textContent = who === "user" ? "VOCÊ" : "ALEX";
    const p = document.createElement("p");
    p.textContent = text;
    el.append(b,p); chat.appendChild(el); chat.scrollTop = chat.scrollHeight;
  }
  function status(text) { $("status").textContent = text; }
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR"; u.rate = 1; u.pitch = 1;
    speechSynthesis.speak(u);
  }
  function reply(text) { addMessage("alex", text); speak(text); }
  function getRecognition() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return null;
    const r = new Ctor();
    r.lang = "pt-BR"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    return r;
  }
  async function apiPost(path, body) {
    if (!API) throw new Error("Configure ALEX_API_URL em script.js ou sirva o frontend pelo backend.");
    const res = await fetch(`${API}${path}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Falha na API.");
    return data;
  }
  async function processCommand(raw) {
    let command = raw.trim().replace(/^[,.:; -]+/,"");
    if (!command) return;
    addMessage("user", command);
    if (dangerousPattern.test(command)) {
      reply("Por segurança, não posso executar exclusões em massa nem apagar arquivos por comando de voz. Essa função está bloqueada no ALEX 1.0.");
      return;
    }
    const lower = command.toLocaleLowerCase("pt-BR");
    if (/\b(que horas são|horas são|me diga as horas|hora atual)\b/.test(lower)) {
      reply(`Agora são ${new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit"}).format(new Date())}.`);
      return;
    }
    if (/\b(qual é meu celular|modelo do meu celular|informações do dispositivo|dados do aparelho)\b/.test(lower)) {
      const d = await window.AlexDevice.info();
      $("deviceInfo").textContent = JSON.stringify(d,null,2);
      reply("Consigo ver alguns dados disponibilizados pelo navegador, mas ele não confirma o modelo exato nem a versão do Android. Para isso, precisaremos de uma integração Android nativa.");
      return;
    }
    if (/\b(ler arquivo|abrir arquivo|escolher arquivo|meus arquivos)\b/.test(lower)) {
      const files = await window.AlexFiles.chooseFile();
      if (!files.length) { reply("Nenhum arquivo foi selecionado."); return; }
      const names = files.map(f => f.name + (f.error ? ` (${f.error})` : "")).join(", ");
      reply(`Você autorizou estes arquivos: ${names}. A leitura foi limitada aos arquivos escolhidos por você.`);
      return;
    }
    try {
      status("Consultando IA…");
      const result = await apiPost("/chat", {message:command});
      reply(result.reply || "Não recebi uma resposta válida.");
    } catch (e) {
      reply(`Ainda não consegui consultar a IA na nuvem. ${e.message} Você pode configurar o backend do Render para habilitar as respostas inteligentes.`);
    } finally { status(listening ? "Escutando" : "Pronto"); }
  }
  function onResult(event) {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalText += " " + result[0].transcript;
    }
    finalText = finalText.trim();
    if (!finalText) return;
    if (!activation.test(finalText)) return;
    const command = finalText.replace(activation,"").replace(/^[,.:; -]+/,"").trim();
    if (command) processCommand(command);
    else {
      reply("Estou ouvindo. Pode falar.");
      $("headline").textContent = "Pode falar comigo.";
    }
  }
  function startListening() {
    if (listening) { stopListening(); return; }
    recognition = getRecognition();
    if (!recognition) { reply("Este navegador não oferece reconhecimento de voz compatível. Tente abrir no Chrome com conexão e permissão de microfone."); return; }
    recognition.onresult = onResult;
    recognition.onerror = e => { status("Microfone: " + e.error); if (e.error === "not-allowed") { listening=false; $("orb").classList.remove("active"); } };
    recognition.onend = () => {
      if (listening) { try { recognition.start(); } catch {} }
      else { status("Pronto"); $("orb").classList.remove("active"); }
    };
    try {
      recognition.start(); listening = true;
      $("orb").classList.add("active"); $("headline").textContent = "Estou escutando…";
      $("subhead").textContent = "Diga “ALEX” e depois seu comando.";
      status("Escutando"); $("micBtn").innerHTML = "<span>⏹</span> <b>Parar escuta</b>";
    } catch { reply("Não consegui iniciar o microfone. Verifique a permissão do navegador."); }
  }
  function stopListening() {
    listening = false;
    if (recognition) { try { recognition.stop(); } catch {} }
    $("orb").classList.remove("active"); $("headline").textContent = "Olá. Eu sou o ALEX.";
    $("micBtn").innerHTML = "<span>🎙</span> <b>Falar com ALEX</b>"; status("Pronto");
  }
  async function setupPin() {
    const pin = $("pin").value.trim();
    if (!/^\d{4,12}$/.test(pin)) { $("securityMsg").textContent = "Use um PIN de 4 a 12 dígitos."; return; }
    if (!API) { $("securityMsg").textContent = "Configure o backend antes de cadastrar o PIN. O PIN não será salvo apenas no navegador."; return; }
    try {
      const r = await apiPost("/owner/setup", {pin});
      ownerConfigured = true; $("ownerBadge").textContent = "PIN cadastrado";
      $("securityMsg").textContent = r.message || "PIN cadastrado no servidor.";
      $("pin").value = "";
    } catch(e) { $("securityMsg").textContent = e.message; }
  }
  async function unlock() {
    const pin = $("pin").value.trim();
    if (!/^\d{4,12}$/.test(pin)) { $("securityMsg").textContent = "Digite seu PIN."; return; }
    if (!API) { $("securityMsg").textContent = "Backend indisponível; ações sensíveis continuam bloqueadas."; return; }
    try {
      const r = await apiPost("/owner/unlock", {pin});
      ownerUnlocked = true; unlockExpires = Date.now() + 2*60*1000;
      $("ownerBadge").textContent = "Autenticado por 2 min";
      $("securityMsg").textContent = r.message || "Identidade confirmada pelo PIN por 2 minutos.";
      $("pin").value = "";
    } catch(e) { ownerUnlocked=false; $("securityMsg").textContent = e.message; }
  }
  $("micBtn").addEventListener("click", startListening);
  $("setupPin").addEventListener("click", setupPin);
  $("unlockBtn").addEventListener("click", unlock);
  $("clearBtn").addEventListener("click", () => { chat.replaceChildren(); });
  $("deviceBtn").addEventListener("click", async () => {
    $("deviceInfo").textContent = JSON.stringify(await window.AlexDevice.info(),null,2);
  });
  window.ALEX = {processCommand, get ownerUnlocked(){return ownerUnlocked && Date.now()<unlockExpires;}};
})();
