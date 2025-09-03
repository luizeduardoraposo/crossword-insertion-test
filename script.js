// Algoritmo de formação de palavras cruzadas
// Regras: sorteio, arranjo, renderização, interação, rotação, novo jogo, barra de navegação, responsividade, alto contraste

const BOARD_SIZE = 4; // Tabuleiro 4x4
let board = [];
let words = [];
let placedWords = [];
let selectedCells = [];
let mirrorActive = false;
let rotation = 0;

// Carregar palavras do arquivo
async function loadWords() {
  const response = await fetch('words-ptbr.txt');
  const text = await response.text();
  return text.split(/\r?\n/).filter(w => w.length >= 3);
}

// Sorteia palavras aleatórias
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Inicializa tabuleiro vazio
function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(''));
}

// Direções contíguas (8 direções)
const directions = [
  { dx: 0, dy: 1 },   // baixo
  { dx: 1, dy: 0 },   // direita
  { dx: 0, dy: -1 },  // cima
  { dx: -1, dy: 0 },  // esquerda
  { dx: 1, dy: 1 },   // diagonal baixo-direita
  { dx: -1, dy: -1 }, // diagonal cima-esquerda
  { dx: 1, dy: -1 },  // diagonal cima-direita
  { dx: -1, dy: 1 },  // diagonal baixo-esquerda
];

// Tenta inserir palavra no tabuleiro em todas as posições/direções
function canPlaceWord(board, word, x, y, dir) {
  let positions = [];
  for (let i = 0; i < word.length; i++) {
    let nx = x + dir.dx * i;
    let ny = y + dir.dy * i;
    if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) return null;
    if (board[ny][nx] !== '' && board[ny][nx] !== word[i]) return null;
    positions.push([ny, nx]);
  }
  return positions;
}

function placeWord(board, word, positions) {
  positions.forEach(([y, x], i) => {
    board[y][x] = word[i];
  });
}

// Algoritmo força bruta para máximo de palavras
function bruteForceInsert(words, board) {
  let maxPlaced = [];
  function backtrack(idx, b, placed) {
    if (idx >= words.length) {
      if (placed.length > maxPlaced.length) maxPlaced = placed.map(p => ({ ...p }));
      return;
    }
    let word = words[idx];
    let placedAny = false;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let dir of directions) {
          let pos = canPlaceWord(b, word, x, y, dir);
          if (pos) {
            let bcopy = b.map(row => row.slice());
            placeWord(bcopy, word, pos);
            backtrack(idx + 1, bcopy, placed.concat([{ word, pos }]));
            placedAny = true;
          }
        }
      }
    }
    if (!placedAny) backtrack(idx + 1, b, placed);
  }
  backtrack(0, board, []);
  return maxPlaced;
}

// Renderiza tabuleiro
function renderBoard(board, highlights = []) {
  const boardDiv = document.getElementById('board');
  // Limpa o tabuleiro e remove eventuais estilos antigos
  boardDiv.innerHTML = '';
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = board[y][x] !== '' ? board[y][x] : '-';
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.removeAttribute('style'); // Remove estilos inline antigos
      if (highlights.some(([hy, hx]) => hy === y && hx === x)) {
        cell.classList.add('selected');
      }
      if (placedWords.some(pw => pw.pos.some(([py, px]) => py === y && px === x))) {
        cell.classList.add('highlight');
      }
      cell.addEventListener('mousedown', handleCellMouseDown);
      cell.addEventListener('mouseenter', handleCellMouseEnter);
      cell.addEventListener('mouseup', handleCellMouseUp);
      boardDiv.appendChild(cell);
    }
  }
  boardDiv.style.transform = `rotate(${rotation}deg)`;
}

// Seleção e arrasto
function handleCellMouseDown(e) {
  selectedCells = [[parseInt(e.target.dataset.y), parseInt(e.target.dataset.x)]];
  mirrorActive = true;
  renderBoard(board, selectedCells);
  updateMirror();
}

function handleCellMouseEnter(e) {
  if (mirrorActive) {
    let y = parseInt(e.target.dataset.y);
    let x = parseInt(e.target.dataset.x);
    let last = selectedCells[selectedCells.length - 1];
    if (!selectedCells.some(([sy, sx]) => sy === y && sx === x)) {
      // Só permite contíguos
      if (selectedCells.length === 0 ||
        Math.abs(last[0] - y) <= 1 && Math.abs(last[1] - x) <= 1) {
        selectedCells.push([y, x]);
        renderBoard(board, selectedCells);
        updateMirror();
      }
    }
  }
}

function handleCellMouseUp(e) {
  mirrorActive = false;
  renderBoard(board, selectedCells);
  checkSelectedWord();
  selectedCells = [];
  updateMirror();
}

function updateMirror() {
  const mirrorDiv = document.getElementById('mirror');
  if (mirrorActive && selectedCells.length > 0) {
    let word = selectedCells.map(([y, x]) => board[y][x]).join('');
    mirrorDiv.textContent = word;
  } else {
    mirrorDiv.textContent = '';
  }
}

function checkSelectedWord() {
  let word = selectedCells.map(([y, x]) => board[y][x]).join('');
  if (words.includes(word)) {
    // Destaca palavra formada
    placedWords.push({ word, pos: selectedCells.slice() });
    renderBoard(board);
  }
}

// Rotação do tabuleiro
document.getElementById('rotate').onclick = () => {
  rotation = (rotation + 90) % 360;
  renderBoard(board);
};

// Novo jogo
document.getElementById('newgame').onclick = () => {
  startGame();
};

// Inicialização do jogo
async function startGame() {
  words = await loadWords();
  // Só palavras de 3 até 16 letras
  words = shuffle(words).filter(w => w.length >= 3 && w.length <= 16);
  let boardEmpty = createEmptyBoard();
  let candidateWords = words.slice(0, 16);
  // Preencher dinamicamente as letras das palavras sorteadas no tabuleiro
  let filledBoard = fillBoardWithWords(candidateWords, boardEmpty);
  board = filledBoard.board;
  placedWords = filledBoard.placedWords;
  renderBoard(board);
  showInfo();
  console.log('Palavras sorteadas:', candidateWords);
  console.log('Quantidade de palavras inseridas:', placedWords.length);
  console.table(board);
}

// Algoritmo força bruta para preencher o tabuleiro com todas as palavras, mesclando letras
function fillBoardWithWords(words, board) {
  let placedWords = [];
  let b = board.map(row => row.slice());
  let used = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
  for (let word of words) {
    let placed = false;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let dir of directions) {
          let pos = canPlaceWordMerge(b, word, x, y, dir);
          if (pos) {
            placeWord(b, word, pos);
            pos.forEach(([py, px]) => used[py][px] = true);
            placedWords.push({ word, pos });
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
    }
  }
  // Preencher células vazias com letras aleatórias
  let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (b[y][x] === '') {
        b[y][x] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }
  return { board: b, placedWords };
}

// Tenta inserir palavra mesclando letras repetidas
function canPlaceWordMerge(board, word, x, y, dir) {
  let positions = [];
  for (let i = 0; i < word.length; i++) {
    let nx = x + dir.dx * i;
    let ny = y + dir.dy * i;
    if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) return null;
    if (board[ny][nx] !== '' && board[ny][nx] !== word[i]) return null;
    positions.push([ny, nx]);
  }
  return positions;
}

function showInfo() {
  // Calcula quantidade de palavras possíveis de no mínimo 3 letras
  let totalPossiveis = countPossibleWords(board);
  document.getElementById('info').textContent = `Quantidade de palavras possíveis no tabuleiro: ${totalPossiveis}`;
  console.log('Quantidade de palavras possíveis no tabuleiro (mínimo 3 letras):', totalPossiveis);
}

// Conta todas as palavras possíveis de no mínimo 3 letras no tabuleiro
function countPossibleWords(board) {
  let found = new Set();
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let dir of directions) {
        for (let len = 3; len <= BOARD_SIZE; len++) {
          let word = '';
          for (let i = 0; i < len; i++) {
            let nx = x + dir.dx * i;
            let ny = y + dir.dy * i;
            if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) break;
            word += board[ny][nx];
          }
          if (word.length === len && !word.includes('.')) found.add(word);
        }
      }
    }
  }
  return found.size;
}

window.onload = startGame;
