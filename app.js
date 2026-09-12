(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = { sound: true, audio: null, subnet: null, osiIndex: -1, autoTimer: null, lab: null };

  const layers = [
    { level: 7, name: "Aplicación", pdu: "Datos", color: "#b779f4", detail: "La aplicación crea el mensaje usando servicios como HTTP, DNS o SMTP." },
    { level: 6, name: "Presentación", pdu: "Datos", color: "#e76bb4", detail: "Los datos pueden transformarse, comprimirse o cifrarse." },
    { level: 5, name: "Sesión", pdu: "Datos", color: "#ff7d83", detail: "Se coordina el diálogo entre aplicaciones. TCP/IP agrupa esta función." },
    { level: 4, name: "Transporte", pdu: "Segmento", color: "#fd9c58", detail: "TCP o UDP añade puertos para entregar los datos al proceso correcto." },
    { level: 3, name: "Red", pdu: "Paquete", color: "#a7e667", detail: "IP añade direccionamiento lógico para viajar entre redes." },
    { level: 2, name: "Enlace", pdu: "Trama", color: "#52e8dd", detail: "Ethernet añade direcciones MAC y una comprobación FCS para el enlace local." },
    { level: 1, name: "Física", pdu: "Bits", color: "#68a7ff", detail: "La trama se representa mediante señales eléctricas, ópticas o de radio." }
  ];

  const questions = [
    { q: "¿Qué consulta principalmente un router para elegir el siguiente salto?", options: ["La IP destino", "La MAC final", "El puerto TCP"], answer: 0, why: "El router decide con la IP destino del paquete. Después construye una trama nueva para el siguiente enlace." },
    { q: "¿Cómo se llama normalmente la PDU de TCP?", options: ["Segmento", "Trama", "Paquete"], answer: 0, why: "TCP usa segmentos; para UDP se suele usar el término datagrama." },
    { q: "¿Qué dirección cambia normalmente al atravesar un router?", options: ["Las MAC de la trama", "La IP destino", "El puerto de aplicación"], answer: 0, why: "Las MAC pertenecen al enlace local y se reemplazan en cada salto. La IP identifica los extremos." },
    { q: "¿Para qué sirve ARP en una red IPv4 local?", options: ["Resolver una IP a una MAC", "Elegir una ruta BGP", "Asignar puertos TCP"], answer: 0, why: "ARP permite conocer la MAC que corresponde a una IPv4 dentro del enlace local." },
    { q: "¿Cuál es el orden de encapsulación correcto?", options: ["Datos → Segmento → Paquete → Trama → Bits", "Bits → Trama → Datos → Paquete", "Datos → Paquete → Segmento → Bits"], answer: 0, why: "Cada capa inferior envuelve la información recibida de la capa superior." }
  ];

  function go(view) {
    $$(".view").forEach((section) => section.classList.toggle("active", section.id === view));
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view !== "osi") stopAuto();
  }
  $$("[data-view], [data-go]").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    go(button.dataset.view || button.dataset.go);
    sound("nav");
  }));

  function sound(kind = "step", level = 4) {
    if (!state.sound) return;
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!state.audio) state.audio = new AudioEngine();
      const context = state.audio;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const frequencies = { 7: 660, 6: 590, 5: 530, 4: 470, 3: 410, 2: 350, 1: 285 };
      const base = kind === "bad" ? 155 : (frequencies[level] || 440);
      oscillator.type = kind === "good" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(base, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "good" ? base * 1.45 : base * .88, context.currentTime + .12);
      gain.gain.setValueAtTime(.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(kind === "good" ? .075 : .04, context.currentTime + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .17);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + .18);
    } catch (_) { /* visual feedback remains available */ }
  }
  $("#sound-toggle").addEventListener("click", (event) => {
    state.sound = !state.sound;
    event.currentTarget.classList.toggle("on", state.sound);
    event.currentTarget.setAttribute("aria-pressed", String(state.sound));
    event.currentTarget.querySelector("small").textContent = state.sound ? "ON" : "OFF";
    if (state.sound) sound("good", 7);
  });

  const ipToNumber = (ip) => ip.split(".").reduce((total, octet) => total * 256 + Number(octet), 0) >>> 0;
  const numberToIp = (number) => [24, 16, 8, 0].map((shift) => (number >>> shift) & 255).join(".");
  const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const maskFor = (cidr) => (0xffffffff << (32 - cidr)) >>> 0;
  const toBinary = (ip) => ip.split(".").map((part) => Number(part).toString(2).padStart(8, "0")).join(" · ");

  function newSubnet() {
    const difficulty = $("#subnet-level").value;
    const cidr = difficulty === "beginner" ? [24, 25, 26][random(0, 2)] : difficulty === "intermediate" ? random(20, 30) : random(16, 30);
    const pools = difficulty === "challenge" ? [[10, random(0, 255), random(0, 255)], [172, random(16, 31), random(0, 255)], [192, 168, random(0, 255)]] : [[192, 168, random(1, 40)]];
    const address = [...pools[random(0, pools.length - 1)], random(1, 254)].join(".");
    const addressNumber = ipToNumber(address);
    const network = (addressNumber & maskFor(cidr)) >>> 0;
    const blockSize = 2 ** (32 - cidr);
    state.subnet = { address, cidr, network, broadcast: (network + blockSize - 1) >>> 0 };
    $("#subnet-problem").textContent = `${address} /${cidr}`;
    $(".binary-decoration").textContent = toBinary(address);
    $("#subnet-context").textContent = `${blockSize - 2} hosts utilizables · máscara ${numberToIp(maskFor(cidr))}`;
    $$(".answer-grid input").forEach((input) => { input.value = ""; input.className = ""; });
    $("#subnet-feedback").textContent = "";
    $("#subnet-hint-box").classList.add("hidden");
    sound("nav");
  }
  function showSubnetHint() {
    const { cidr, network } = state.subnet;
    const interestingOctet = Math.floor((cidr - 1) / 8);
    const maskOctet = (maskFor(cidr) >>> ((3 - interestingOctet) * 8)) & 255;
    const box = $("#subnet-hint-box");
    box.textContent = `Octeto interesante: ${interestingOctet + 1}. Máscara: ${maskOctet}. Salto: ${256 - maskOctet}. La red comienza en ${numberToIp(network)}.`;
    box.classList.remove("hidden"); sound("step", 2);
  }
  function checkSubnet() {
    const { network, broadcast } = state.subnet;
    const expected = { network: numberToIp(network), first: numberToIp(network + 1), last: numberToIp(broadcast - 1), broadcast: numberToIp(broadcast) };
    let correct = 0;
    Object.entries(expected).forEach(([key, value]) => {
      const input = $(`#answer-${key}`); const matches = input.value.trim() === value;
      input.className = matches ? "correct" : "wrong"; if (matches) correct += 1;
    });
    const feedback = $("#subnet-feedback"); const allCorrect = correct === 4;
    feedback.className = `feedback ${allCorrect ? "good" : "bad"}`;
    feedback.textContent = allCorrect ? "¡Perfecto! Encontraste los cuatro límites de la subred." : `${correct}/4 correctas. Observa el salto y revisa los límites del bloque.`;
    sound(allCorrect ? "good" : "bad");
  }
  $("#new-subnet").addEventListener("click", newSubnet); $("#subnet-level").addEventListener("change", newSubnet);
  $("#subnet-hint").addEventListener("click", showSubnetHint); $("#check-subnet").addEventListener("click", checkSubnet);

  const osiSteps = [];
  [7, 6, 5, 4, 3, 2, 1].forEach((level) => osiSteps.push({ direction: "A → B", activeHost: "a", action: "encapsula", level }));
  osiSteps.push({ direction: "A → B", activeHost: "wire", action: "transmite", level: 1 });
  [1, 2, 3, 4, 5, 6, 7].forEach((level) => osiSteps.push({ direction: "A → B", activeHost: "b", action: "desencapsula", level }));
  [7, 6, 5, 4, 3, 2, 1].forEach((level) => osiSteps.push({ direction: "B → A", activeHost: "b", action: "encapsula", level }));
  osiSteps.push({ direction: "B → A", activeHost: "wire", action: "transmite", level: 1 });
  [1, 2, 3, 4, 5, 6, 7].forEach((level) => osiSteps.push({ direction: "B → A", activeHost: "a", action: "desencapsula", level }));

  function buildStack(container, activeLevel) {
    container.textContent = "";
    layers.forEach((layer) => {
      const item = document.createElement("div");
      item.className = `layer layer-${layer.level}${activeLevel === layer.level ? " active" : ""}`;
      const name = document.createElement("span"); name.textContent = `${layer.level}. ${layer.name}`;
      const pdu = document.createElement("b"); pdu.textContent = layer.pdu;
      item.append(name, pdu); container.append(item);
    });
  }
  function pduPart(label, className) { const part = document.createElement("span"); part.className = `pdu-part ${className}`; part.textContent = label; return part; }
  function routeStage(level) { return level >= 5 ? 0 : level === 4 ? 1 : level === 3 ? 2 : level === 2 ? 3 : 4; }
  function renderOsi() {
    const step = state.osiIndex < 0 ? null : osiSteps[state.osiIndex];
    const layer = step ? layers.find((item) => item.level === step.level) : layers[0];
    const activeA = step?.activeHost === "a" ? step.level : null;
    const activeB = step?.activeHost === "b" ? step.level : null;
    buildStack($("#sender-stack"), activeA); buildStack($("#receiver-stack"), activeB);
    $("#flow-summary").textContent = step ? `Host ${step.direction}` : "Host A → Host B";
    $("#host-a-action").textContent = step?.direction === "B → A" ? "Recibe la respuesta" : "Encapsula hacia el medio";
    $("#host-b-action").textContent = step?.direction === "B → A" ? "Encapsula la respuesta" : "Recibe desde el medio";
    const stage = step ? routeStage(step.level) : -1;
    $$("#osi-route li").forEach((item, index) => { item.classList.toggle("active", index === stage); item.classList.toggle("done", index < stage); });
    $$(".step-meter i").forEach((item, index) => item.classList.toggle("active", step && index === (step.action === "desencapsula" ? step.level - 1 : 7 - step.level)));
    const panel = $(".pdu-stage"); panel.style.setProperty("--active-color", layer.color);
    const message = $("#osi-message").value.trim() || "Datos de aplicación";
    const visual = $("#pdu-visual"); visual.textContent = "";
    if (!step) {
      $("#osi-direction").textContent = "LISTO PARA ENCAPSULAR"; $("#pdu-name").textContent = "Datos";
      $("#osi-explanation").textContent = "Pulsa “Siguiente paso” para iniciar el recorrido."; visual.append(pduPart(message, "app"));
    } else if (step.activeHost === "wire") {
      $("#osi-direction").textContent = `MEDIO FÍSICO · ${step.direction}`; $("#pdu-name").textContent = "Bits en tránsito";
      $("#osi-explanation").textContent = "La señal cruza el medio y conserva la trama codificada."; visual.append(pduPart("01010010 01000101 01000100", "bits"));
    } else {
      const host = step.activeHost.toUpperCase(); const verb = step.action === "encapsula" ? "ENCAPSULANDO" : "DESENCAPSULANDO";
      $("#osi-direction").textContent = `HOST ${host} · ${verb} · CAPA ${step.level}`; $("#pdu-name").textContent = layer.pdu;
      $("#osi-explanation").textContent = layer.detail;
      if (step.level <= 2) visual.append(pduPart("MAC", "mac"));
      if (step.level === 2) visual.append(pduPart("FCS", "fcs"));
      if (step.level <= 3) visual.append(pduPart("IP", "ip"));
      if (step.level <= 4) visual.append(pduPart("TCP / UDP", "tcp"));
      visual.append(pduPart(message, "app"));
    }
    $("#osi-insight").replaceChildren();
    const title = document.createElement("h3"); title.textContent = layer.name;
    const description = document.createElement("p"); description.textContent = layer.detail;
    $("#osi-insight").append(title, description);
  }
  function nextOsi() { state.osiIndex = (state.osiIndex + 1) % osiSteps.length; renderOsi(); sound("step", osiSteps[state.osiIndex].level); }
  function stopAuto() { if (state.autoTimer) clearInterval(state.autoTimer); state.autoTimer = null; const button = $("#osi-auto"); if (button) button.textContent = "▶ Automático"; }
  $("#osi-step").addEventListener("click", nextOsi);
  $("#osi-reset").addEventListener("click", () => { stopAuto(); state.osiIndex = -1; renderOsi(); sound("nav"); });
  $("#osi-message").addEventListener("input", renderOsi);
  $("#osi-auto").addEventListener("click", () => { if (state.autoTimer) return stopAuto(); $("#osi-auto").textContent = "Ⅱ Pausar"; nextOsi(); state.autoTimer = setInterval(nextOsi, 1250); });

  let usedQuestions = [];
  function showQuestion() {
    if (usedQuestions.length === questions.length) usedQuestions = [];
    let index; do { index = random(0, questions.length - 1); } while (usedQuestions.includes(index)); usedQuestions.push(index);
    const question = questions[index]; $("#osi-question").textContent = question.q;
    const options = question.options.map((text, originalIndex) => ({ text, correct: originalIndex === question.answer })).sort(() => Math.random() - .5);
    const container = $("#osi-options"); container.textContent = ""; $("#osi-quiz-feedback").textContent = ""; $("#next-osi-question").classList.add("hidden");
    options.forEach((option) => { const button = document.createElement("button"); button.textContent = option.text; button.addEventListener("click", () => { [...container.children].forEach((item) => { item.disabled = true; if (item.textContent === question.options[question.answer]) item.classList.add("correct"); }); if (!option.correct) button.classList.add("wrong"); const feedback = $("#osi-quiz-feedback"); feedback.className = `feedback ${option.correct ? "good" : "bad"}`; feedback.textContent = `${option.correct ? "¡Correcto!" : "Casi."} ${question.why}`; $("#next-osi-question").classList.remove("hidden"); sound(option.correct ? "good" : "bad"); }); container.append(button); });
  }
  $("#next-osi-question").addEventListener("click", showQuestion);

  function newLab() {
    const cidr = [24, 25, 26, 27][random(0, 3)]; const mask = maskFor(cidr); const network = (ipToNumber(`192.168.${random(1, 30)}.0`) & mask) >>> 0; const size = 2 ** (32 - cidr); const same = Math.random() > .5;
    const source = network + random(2, size - 3); const destination = same ? network + random(2, size - 3) : network + size + random(2, size - 3);
    state.lab = { same }; $("#lab-source").textContent = numberToIp(source); $("#lab-destination").textContent = numberToIp(destination); $("#lab-prefix").textContent = `Máscara /${cidr} · ${numberToIp(mask)} · compara las direcciones de red.`;
    $("#lab-followup").classList.add("locked"); $("#lab-feedback").textContent = ""; $$(".network-lab .options button").forEach((button) => { button.disabled = false; button.className = ""; });
  }
  $("#lab-network-options").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; const correct = (button.dataset.answer === "same") === state.lab.same; $$("#lab-network-options button").forEach((item) => item.disabled = true); button.classList.add(correct ? "correct" : "wrong"); const feedback = $("#lab-feedback"); feedback.className = `feedback ${correct ? "good" : "bad"}`; feedback.textContent = correct ? (state.lab.same ? "Correcto: el host resuelve directamente la MAC del destino." : "Correcto: la trama debe dirigirse a la MAC del gateway.") : "Aplica la máscara a ambas IP y vuelve a comparar sus redes."; $("#lab-followup").classList.remove("locked"); sound(correct ? "good" : "bad"); });
  $("#lab-pdu-options").addEventListener("click", (event) => {
    const button = event.target.closest("button"); if (!button) return;
    const correct = button.dataset.answer === "packet";
    $$("#lab-pdu-options button").forEach((item) => { item.disabled = true; if (item.dataset.answer === "packet") item.classList.add("correct"); });
    if (!correct) button.classList.add("wrong");
    const feedback = $("#lab-feedback"); feedback.className = `feedback ${correct ? "good" : "bad"}`;
    feedback.textContent += correct ? " El router consulta la IP destino del paquete y crea una trama nueva para el siguiente enlace." : " El router toma la decisión con el paquete IP, no con el puerto ni con la MAC final.";
    sound(correct ? "good" : "bad");
  });
  $("#new-lab").addEventListener("click", () => { newLab(); sound("nav"); });

  newSubnet(); renderOsi(); showQuestion(); newLab();
})();
