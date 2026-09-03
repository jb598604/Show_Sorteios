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

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get("id");
let cartelaData = null;

// Frases tradicionais completas
const frasesEspeciais = {
  1:"Começou o jogo",5:"Cachorro",9:"Pingo no pé",10:"Craque de bola",
  11:"Um atrás do outro",13:"Deu azar",16:"O leão está solto",17:"O bicho que pula",
  22:"Dois patinhos na lagoa",23:"Meio alegre",24:"Rapazinho alegre",31:"Preparem os fogos",
  33:"Idade de Cristo",38:"Justiça de Goiás",45:"Fim do primeiro tempo",51:"Uma boa ideia",
  55:"Dois cachorros do padre",66:"Um tapa atrás da orelha",69:"Um pra cima e outro pra baixo",
  75:"Terminou o jogo",90:"Velhinha de bengala"
};

// Narração dos números
function narrarNumero(num) {
  let letra = num <= 15 ? "B" : num <= 30 ? "I" : num <= 45 ? "N" : num <= 60 ? "G" : "O";
  let frase = frasesEspeciais[num] ? `${letra}-${num}, ${frasesEspeciais[num]}` : `${letra}-${num}`;
  const utterance = new SpeechSynthesisUtterance(frase);
  utterance.lang = "pt-BR";
  utterance.rate = 1;
  utterance.pitch = 1.1;
  speechSynthesis.speak(utterance);
}

// Carrega dados da cartela
db.ref("cartelas/" + id).once("value").then(snapshot => {
  cartelaData = snapshot.val();
  if (cartelaData) {
    renderCartela(cartelaData, []);
  } else {
    document.getElementById("cartela").innerHTML = "<p>Cartela não encontrada.</p>";
  }
});

// Escuta sorteio
db.ref("sorteio").on("value", snapshot => {
  const sorteados = snapshot.val() || [];
  if (cartelaData) {
    renderCartela(cartelaData, sorteados);
    verificarStatus(cartelaData, sorteados);
    if (sorteados.length > 0) narrarNumero(sorteados[sorteados.length - 1]);
    document.getElementById("numerosJaSorteados").innerHTML =
      `<h3>Números já sorteados</h3>
       <div class="numerosCartela">
         ${sorteados.map(n => `<span class="numItem sorteado">${n}</span>`).join("")}
       </div>`;
  }
});

// Renderiza cartela
function renderCartela(cartela, sorteados) {
  document.getElementById("cartela").innerHTML = `
    <div class="cartela">
      <h2>${cartela.nome}</h2>
      <img src="${cartela.imagem}" alt="Cartela de ${cartela.nome}">
      <div class="numerosCartela">
        ${cartela.numeros.map(num => `
          <span class="numItem ${sorteados.includes(num) ? 'sorteado' : ''}">${num}</span>
        `).join("")}
      </div>
    </div>
  `;
}

// Verifica status da cartela
function verificarStatus(cartela, sorteados) {
  const faltando = cartela.numeros.filter(n => !sorteados.includes(n));
  let statusMsg = "";

  if (faltando.length === 0) {
    statusMsg = "<h3 style='color:green;'>🏆 BINGO! Você ganhou!</h3>";
    tocarBingo();
    soltarConfete();
  } else if (faltando.length === 1) {
    statusMsg = "<h3 style='color:orange;'>⚠️ Você está na boa! Falta só 1 número!</h3>";
  } else {
    statusMsg = `<p>Faltam ${faltando.length} números para ganhar.</p>`;
  }

  document.getElementById("status").innerHTML = statusMsg;
}

// Som + voz ao ganhar
function tocarBingo() {
  const mensagem = new SpeechSynthesisUtterance("BINGO! Parabéns, você ganhou!");
  mensagem.lang = "pt-BR";
  mensagem.rate = 1;
  mensagem.pitch = 1.1;

  speechSynthesis.cancel();
  mensagem.onend = () => {
    const audio = document.getElementById("bingoSound");
    if (audio) {
      audio.volume = 0.4;
      audio.play();
    }
  };
  speechSynthesis.speak(mensagem);
}

// Confete
function soltarConfete() {
  document.body.style.background = "url('confete.gif') center center / cover no-repeat";
  setTimeout(() => { document.body.style.background = ""; }, 5000);
}

// Carregar vencedores cadastrados e mostrar na cartela
function carregarVencedoresCartela() {
  db.ref("vencedores").on("value", snapshot => {
    const todos = snapshot.val() || {};
    const lista = Object.entries(todos).map(([vid, v]) => {
      const destaque = (v.cartelaId === id) ? "style='color:green;font-weight:bold;'" : "";
      return `<div class="vencedorCartela" ${destaque}>
                <h4>${v.nome} (${v.cidade})</h4>
                <p>🏆 Prêmio: ${v.premio}</p>
              </div>`;
    }).join("");

    document.getElementById("vencedoresCartela").innerHTML =
      `<h3>🏆 Vencedores já cadastrados</h3>${lista || "<p>Nenhum vencedor registrado ainda.</p>"}`;
  });
}

// Chamar logo ao carregar
carregarVencedoresCartela();

// Tentativa de ativar voz automática (PC funciona, celular depende do navegador)
window.addEventListener("load", () => {
  try {
    const teste = new SpeechSynthesisUtterance("Cartela carregada com sucesso");
    teste.lang = "pt-BR";
    speechSynthesis.speak(teste);
  } catch (e) {
    console.warn("Voz bloqueada até interação.");
  }
});

// Se o navegador exigir interação, libera no primeiro toque
document.body.addEventListener("click", () => {
  if (!speechSynthesis.speaking) {
    const liberar = new SpeechSynthesisUtterance("Voz ativada");
    liberar.lang = "pt-BR";
    speechSynthesis.speak(liberar);
  }
}, { once: true });
