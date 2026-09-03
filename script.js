// Inicialização Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCALNLKRRjYL0SCTDvhNWO9QgK79KGYHAA",
  authDomain: "teste-bingo-700a2.firebaseapp.com",
  databaseURL: "https://teste-bingo-700a2-default-rtdb.firebaseio.com",
  projectId: "teste-bingo-700a2",
  storageBucket: "teste-bingo-700a2.firebasestorage.app",
  messagingSenderId: "573850658522",
  appId: "1:573850658522:web:c5656bb8944def77c5a7e3"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Detecta se estamos na página da cartela
const urlParams = new URLSearchParams(window.location.search);
const idCartela = urlParams.get("id");
let cartelaData;

// Alterna páginas
function mostrarPagina(id) {
  const admin = localStorage.getItem("admin") === "true";
  if (!admin && (id === "cadastro" || id === "cartelas" || id === "sorteio")) {
    alert("Acesso restrito. Faça login como administrador."); return;
  }
  document.querySelectorAll(".pagina").forEach(p => p.style.display = "none");
  document.getElementById(id).style.display = "block";
  if (id === "cartelas") carregarCartelas();
  if (id === "sorteio") carregarVencedores();
}

// Login
function login() {
  const u = document.getElementById("usuario").value.trim();
  const p = document.getElementById("senha").value.trim();

  if (u.toLowerCase() === "bingo26" && p.toLowerCase() === "euvoushow") {
    localStorage.setItem("admin","true");
    alert("Login realizado com sucesso!");
    document.getElementById("btnCadastro").style.display="inline-block";
    document.getElementById("btnSorteio").style.display="inline-block";
    document.getElementById("btnCartelas").style.display="inline-block";
    mostrarPagina("cadastro");
  } else {
    localStorage.setItem("admin","false");
    alert("Usuário ou senha inválidos.");
    document.getElementById("btnCadastro").style.display="none";
    document.getElementById("btnSorteio").style.display="none";
    document.getElementById("btnCartelas").style.display="none";
    mostrarPagina("login");
  }
}

// Cadastro de cartela com OCR
function processarCartela() {
  const foto = document.getElementById("fotoCartela").files[0];
  const nome = document.getElementById("nomeCartela").value.trim();
  if (!foto || !nome) { alert("Preencha todos os campos!"); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const imagemBase64 = e.target.result;
    Tesseract.recognize(imagemBase64, 'eng').then(({ data: { text } }) => {
      let numeros = text.match(/\d+/g) || [];
      numeros = numeros.map(n => parseInt(n)).filter(n => n >= 1 && n <= 75);
      const novaCartela = { nome, imagem: imagemBase64, numeros };
      const id = Date.now();
      db.ref("cartelas/" + id).set(novaCartela);
      alert("Cartela cadastrada com sucesso!");
      document.getElementById("nomeCartela").value = "";
      document.getElementById("fotoCartela").value = "";
    });
  };
  reader.readAsDataURL(foto);
}

// 📷 Funções da câmera
function abrirCamera(tipo = "environment") {
  document.getElementById("webcamArea").style.display = "block";
  iniciarCamera(tipo);
}

async function iniciarCamera(tipo) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: tipo } });
    const video = document.getElementById("camera");
    video.srcObject = stream;
    video.style.width = "100%";
    video.style.height = "auto";
  } catch (err) {
    console.error("Erro ao acessar a câmera:", err);
    document.getElementById("webcamArea").style.display = "none";
  }
}

function tirarFoto() {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  document.getElementById("btnSalvarFoto").style.display = "inline-block";
}

function salvarFotoCartela() {
  const nome = document.getElementById("nomeCartela").value.trim();
  if (!nome) { alert("Digite o nome da cartela!"); return; }
  const canvas = document.getElementById("canvas");
  const imagemBase64 = canvas.toDataURL("image/png");
  const novaCartela = { nome, imagem: imagemBase64, numeros: [] };
  const id = Date.now();
  db.ref("cartelas/" + id).set(novaCartela);
  alert("Cartela cadastrada com sucesso!");
  document.getElementById("btnSalvarFoto").style.display = "none";
}

// 🔦 Flash
async function ativarFlash() {
  const track = document.getElementById("camera").srcObject.getVideoTracks()[0];
  const caps = track.getCapabilities();
  if (caps.torch) {
    await track.applyConstraints({ advanced: [{ torch: true }] });
  } else {
    alert("Flash não suportado neste dispositivo.");
  }
}
async function desativarFlash() {
  const track = document.getElementById("camera").srcObject.getVideoTracks()[0];
  await track.applyConstraints({ advanced: [{ torch: false }] });
}

// 🔊 Voz automática
window.addEventListener("load", () => {
  try {
    const teste = new SpeechSynthesisUtterance("Bem-vindo ao Bingo Show de Prêmios");
    teste.lang = "pt-BR";
    speechSynthesis.speak(teste);
  } catch (e) {
    console.warn("Voz bloqueada até interação.");
  }
});
document.body.addEventListener("click", () => {
  if (!speechSynthesis.speaking) {
    const liberar = new SpeechSynthesisUtterance("Voz ativada");
    liberar.lang = "pt-BR";
    speechSynthesis.speak(liberar);
  }
}, { once: true });

// Carregar cartelas cadastradas
function carregarCartelas() {
  db.ref("cartelas").on("value", snapshot => {
    const todas = snapshot.val() || {};
    const lista = Object.entries(todas).map(([id, c]) =>
      `<div class="cartela">
         <h3>${c.nome}</h3>
         <img src="${c.imagem}" alt="Cartela de ${c.nome}">
         <div class="numerosCartela">
           ${c.numeros && c.numeros.length > 0 
             ? c.numeros.map(n => `<span class="numItem">${n}</span>`).join("") 
             : "<p>Sem números reconhecidos</p>"}
         </div>
         <p><a href="cartela.html?id=${id}" target="_blank">🔗 Abrir cartela</a></p>
       </div>`
    ).join("");
    document.getElementById("listaCartelas").innerHTML = lista;
  });
}

// Narração dos números
function narrarNumero(num) {
  let letra = num <= 15 ? "B" : num <= 30 ? "I" : num <= 45 ? "N" : num <= 60 ? "G" : "O";
  const frase = `${letra}-${num}`;
  const u = new SpeechSynthesisUtterance(frase);
  u.lang = "pt-BR"; u.rate = 1; u.pitch = 1.2;
  speechSynthesis.speak(u);
}

// Escuta sorteio
db.ref("sorteio").on("value", snapshot => {
  const numerosSorteados = snapshot.val() || [];
  if (!idCartela) {
    atualizarSorteio(numerosSorteados);
    if (numerosSorteados.length > 0) {
      narrarNumero(numerosSorteados[numerosSorteados.length - 1]);
    }
  }
});

// Atualiza sorteio
function atualizarSorteio(numerosSorteados) {
  let html = '<div class="gridBingo">';
  for (let n = 1; n <= 75; n++) {
    let letra = n <= 15 ? "B" : n <= 30 ? "I" : n <= 45 ? "N" : n <= 60 ? "G" : "O";
    const sorteado = numerosSorteados.includes(n);
    html += `<span class="numItem ${sorteado ? 'sorteado' : ''}" onclick="marcarNumero(${n})">${letra}-${n}</span>`;
  }
  html += '</div>';
  document.getElementById("numerosSorteados").innerHTML = html;
  atualizarEstatisticas(numerosSorteados);
}

// Marca número sorteado
function marcarNumero(num) {
  db.ref("sorteio").once("value").then(snapshot => {
    let sorteados = snapshot.val() || [];
    if (!sorteados.includes(num)) {
      sorteados.push(num);
      db.ref("sorteio").set(sorteados);
    }
  });
}

// Salvar vencedor automático
function salvarVencedor(cartela, idCartela, premio) {
  db.ref("vencedores").orderByChild("cartelaId").equalTo(idCartela).once("value")
    .then(snapshot => {
      if (!snapshot.exists()) {
        const idVencedor = Date.now();
        const novoVencedor = {
          nome: cartela.nome,
          cidade: cartela.cidade || "Não informada",
          premio: premio || "Prêmio principal",
          cartelaId: idCartela
        };
        db.ref("vencedores/" + idVencedor).set(novoVencedor)
          .then(() => console.log("✅ Vencedor salvo:", novoVencedor))
          .catch(err => console.error("Erro ao salvar vencedor:", err));
      }
    });
}

// Cadastro manual de vencedor
function cadastrarVencedorManual() {
  const nome = document.getElementById("nomeVencedor").value.trim();
  const cidade = document.getElementById("cidadeVencedor").value.trim();
  const premio = document.getElementById("premioVencedor").value.trim();
  const cartelaId = document.getElementById("idCartelaVencedor").value.trim();

  if (!nome || !premio) {
    alert("Preencha pelo menos Nome e Prêmio!");
    return;
  }

  const idVencedor = Date.now();
  const novoVencedor = {
    nome,
    cidade: cidade || "Não informada",
    premio,
    cartelaId: cartelaId || null
  };

  db.ref("vencedores/" + idVencedor).set(novoVencedor)
    .then(() => {
      alert("Vencedor cadastrado com sucesso!");
      document.getElementById("nomeVencedor").value = "";
      document.getElementById("cidadeVencedor").value = "";
      document.getElementById("premioVencedor").value = "";
      document.getElementById("idCartelaVencedor").value = "";
    })
    .catch(err => console.error("Erro ao salvar vencedor:", err));
}

// Carregar vencedores
function carregarVencedores() {
  db.ref("vencedores").on("value", snapshot => {
    const todos = snapshot.val() || {};
    const lista = Object.entries(todos).map(([vid, v]) =>
      `<div class="vencedorCartela">
         <h4>${v.nome} (${v.cidade})</h4>
         <p>🏆 Prêmio: ${v.premio}</p>
         <button onclick="excluirVencedor('${vid}')">❌ Excluir</button>
       </div>`
    ).join("");
    document.getElementById("listaVencedores").innerHTML =
      `<h3>🏆 Histórico de Vencedores</h3>${lista || "<p>Nenhum vencedor registrado ainda.</p>"}`;
  });
}

// Excluir vencedor
function excluirVencedor(idVencedor) {
  if (confirm("Tem certeza que deseja excluir este vencedor?")) {
    db.ref("vencedores/" + idVencedor).remove()
      .then(() => alert("Vencedor excluído com sucesso!"))
      .catch(err => console.error("Erro ao excluir vencedor:", err));
  }
}

// Estatísticas (detecta e salva vencedor automático)
function atualizarEstatisticas(numerosSorteados) {
  db.ref("cartelas").once("value").then(snapshot => {
    const todas = snapshot.val() || {};
    let naBoa = 0, vencedores = [], total = Object.keys(todas).length;

    for (let id in todas) {
      const c = todas[id];
      const faltando = c.numeros.filter(n => !numerosSorteados.includes(n));

      if (faltando.length === 1) naBoa++;
      if (faltando.length === 0) {
        vencedores.push(c);
        salvarVencedor(c, id, "Prêmio principal");
      }
    }

    document.getElementById("estatisticas").innerHTML =
      `<p>Total de cartelas: ${total}</p>
       <p>Números sorteados: ${numerosSorteados.length}</p>
       <p>Cartelas na boa: ${naBoa}</p>`;

    carregarVencedores();
  });
}

// Reiniciar sorteio
function reiniciarSorteio() {
  db.ref("sorteio").set([]);
  alert("Sorteio reiniciado!");
}
