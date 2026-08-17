// Configurações do Grid de Jogo (10 colunas x 10 linhas)
const COLS = 10;
const ROWS = 10;
const BLOCK_SIZE = 60; // 60px * 10 = 600px (tamanho do canvas)

// Cores Neon Cyberpunk para as Peças
const COLORS = [
    null,
    '#00f0ff', // I (Cyan)
    '#0055ff', // J (Azul)
    '#ff9900', // L (Laranja)
    '#ffe600', // O (Amarelo)
    '#00ff66', // S (Verde)
    '#ba00ff', // T (Roxo)
    '#ff0055'  // Z (Vermelho)
];

// Formato das peças clássicas do Tetris
const SHAPES = [
    [],
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
    [[2,0,0],[2,2,2],[0,0,0]],                 // J
    [[0,0,3],[3,3,3],[0,0,0]],                 // L
    [[4,4],[4,4]],                             // O
    [[0,5,5],[5,5,0],[0,0,0]],                 // S
    [[0,6,0],[6,6,6],[0,0,0]],                 // T
    [[7,7,0],[0,7,7],[0,0,0]]                  // Z
];

// Instâncias Globais do Jogo
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let currentPiece = null;
let nextPiece = null;
let score = 0;
let linesCleared = 0;
let gameOver = false;
let playerName = "CYBER_RUNNER";
let dropInterval = 1000; // 1s inicial
let lastDropTime = 0;
let particles = [];

// Elementos da Interface
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const playerNameInput = document.getElementById('playerName');
const hudPlayerName = document.getElementById('hudPlayerName');
const hudScore = document.getElementById('hudScore');
const hudLines = document.getElementById('hudLines');
const finalScore = document.getElementById('finalScore');
const menuLeaderboard = document.getElementById('menuLeaderboard').querySelector('tbody');
const endLeaderboard = document.getElementById('endLeaderboard').querySelector('tbody');
const toggleMusicBtn = document.getElementById('toggleMusicBtn');

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// Partícula de Explosão Neon
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 2;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 2; // Impulso leve para cima
        this.color = color;
        this.alpha = 1.0;
        this.decay = Math.random() * 0.03 + 0.015;
        this.gravity = 0.15;
    }

    update() {
        this.x += this.vx;
        this.vy += this.gravity;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw(cContext) {
        cContext.save();
        cContext.globalAlpha = this.alpha;
        cContext.shadowBlur = 10;
        cContext.shadowColor = this.color;
        cContext.fillStyle = this.color;
        cContext.beginPath();
        cContext.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        cContext.fill();
        cContext.restore();
    }
}

// Inicialização de Telas e Placar
document.addEventListener('DOMContentLoaded', () => {
    updateLeaderboards();
    
    startBtn.addEventListener('click', () => {
        const inputVal = playerNameInput.value.trim();
        if (inputVal) playerName = inputVal;
        
        // Ativa o áudio na primeira interação
        window.synth.init();
        
        menuScreen.classList.remove('active');
        gameScreen.classList.add('active');
        hudPlayerName.textContent = playerName;
        
        startGame();
    });

    retryBtn.addEventListener('click', () => {
        gameOverScreen.classList.remove('active');
        gameScreen.classList.add('active');
        startGame();
    });

    toggleMusicBtn.addEventListener('click', () => {
        window.synth.init();
        if (window.synth.isPlayingMusic) {
            window.synth.stopMusic();
            toggleMusicBtn.textContent = "MÚSICA: OFF";
        } else {
            window.synth.startMusic();
            toggleMusicBtn.textContent = "MÚSICA: ON";
        }
    });
});

// Lógica de Peça
function createPiece(type) {
    return {
        matrix: SHAPES[type],
        colorIndex: type,
        x: Math.floor((COLS - SHAPES[type][0].length) / 2),
        y: 0
    };
}

function getRandomPiece() {
    const types = 7;
    const rand = Math.floor(Math.random() * types) + 1;
    return createPiece(rand);
}

// Iniciar Jogo
function startGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    linesCleared = 0;
    gameOver = false;
    dropInterval = 1000;
    particles = [];
    
    hudScore.textContent = score;
    hudLines.textContent = linesCleared;
    
    currentPiece = getRandomPiece();
    nextPiece = getRandomPiece();
    
    lastDropTime = performance.now();
    
    // Tenta iniciar a música se estiver ligada
    if (toggleMusicBtn.textContent.includes("ON")) {
        window.synth.startMusic();
    }

    requestAnimationFrame(update);
}

// Loop Principal
function update(time) {
    if (gameOver) return;

    // Atualiza partículas
    particles.forEach((p, idx) => {
        p.update();
        if (p.alpha <= 0) particles.splice(idx, 1);
    });

    const deltaTime = time - lastDropTime;
    if (deltaTime > dropInterval) {
        moveDown();
    }

    draw();
    requestAnimationFrame(update);
}

// Desenhar Elementos
function draw() {
    // Limpa canvas principal
    ctx.fillStyle = '#08090f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha grid de fundo sutil
    ctx.strokeStyle = '#161929';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(canvas.width, r * BLOCK_SIZE);
        ctx.stroke();
    }

    // Desenha tabuleiro fixo
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(ctx, c, r, COLORS[board[r][c]]);
            }
        }
    }

    // Desenha peça atual em queda
    if (currentPiece) {
        currentPiece.matrix.forEach((row, rIdx) => {
            row.forEach((value, cIdx) => {
                if (value) {
                    drawBlock(ctx, currentPiece.x + cIdx, currentPiece.y + rIdx, COLORS[currentPiece.colorIndex]);
                }
            });
        });
    }

    // Desenha partículas
    particles.forEach(p => p.draw(ctx));

    // Desenha pré-visualização (Next Piece)
    drawNextPiece();
}

// Auxiliar para desenhar um bloco de neon
function drawBlock(context, x, y, color) {
    context.save();
    context.fillStyle = color;
    
    // Brilho neon do bloco
    context.shadowBlur = 12;
    context.shadowColor = color;
    
    context.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    
    // Brilho interno/borda mais clara
    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    context.lineWidth = 1.5;
    context.strokeRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    
    context.restore();
}

// Desenhar Próxima Peça no Canvas lateral
function drawNextPiece() {
    nextCtx.fillStyle = '#08090f';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const matrix = nextPiece.matrix;
    const color = COLORS[nextPiece.colorIndex];
    
    // Centralizar desenho
    const nRows = matrix.length;
    const nCols = matrix[0].length;
    const startX = (nextCanvas.width - nCols * 30) / 2;
    const startY = (nextCanvas.height - nRows * 30) / 2;

    nextCtx.save();
    nextCtx.shadowBlur = 10;
    nextCtx.shadowColor = color;
    nextCtx.fillStyle = color;

    matrix.forEach((row, rIdx) => {
        row.forEach((value, cIdx) => {
            if (value) {
                nextCtx.fillRect(startX + cIdx * 30 + 1, startY + rIdx * 30 + 1, 28, 28);
                
                nextCtx.shadowBlur = 0;
                nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                nextCtx.strokeRect(startX + cIdx * 30 + 2, startY + rIdx * 30 + 2, 26, 26);
                
                nextCtx.shadowBlur = 10; // restaura para os próximos
            }
        });
    });
    nextCtx.restore();
}

// Movimentos e Física
function moveDown() {
    currentPiece.y++;
    if (checkCollision()) {
        currentPiece.y--;
        mergePiece();
        clearLines();
        
        // Verifica derrota (se passar de 10 linhas preenchíveis)
        if (currentPiece.y <= 0) {
            triggerGameOver();
            return;
        }

        currentPiece = nextPiece;
        nextPiece = getRandomPiece();

        if (checkCollision()) {
            triggerGameOver();
        }
    }
    lastDropTime = performance.now();
}

function checkCollision() {
    const matrix = currentPiece.matrix;
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
                const targetX = currentPiece.x + c;
                const targetY = currentPiece.y + r;

                // Colisão com bordas ou fundo
                if (targetX < 0 || targetX >= COLS || targetY >= ROWS) {
                    return true;
                }
                // Colisão com blocos existentes
                if (targetY >= 0 && board[targetY][targetX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function mergePiece() {
    const matrix = currentPiece.matrix;
    matrix.forEach((row, rIdx) => {
        row.forEach((value, cIdx) => {
            if (value) {
                const boardY = currentPiece.y + rIdx;
                const boardX = currentPiece.x + cIdx;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.colorIndex;
                }
            }
        });
    });
    window.synth.playDrop();
}

// Eliminação de linhas e partículas de explosão
function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        // Verifica se a linha está cheia
        if (board[r].every(val => val > 0)) {
            // Cria explosão de partículas para cada bloco desta linha
            for (let c = 0; c < COLS; c++) {
                const color = COLORS[board[r][c]];
                const blockCenterX = c * BLOCK_SIZE + BLOCK_SIZE / 2;
                const blockCenterY = r * BLOCK_SIZE + BLOCK_SIZE / 2;
                
                // 10 partículas por bloco para um efeito brilhante denso
                for (let i = 0; i < 8; i++) {
                    particles.push(new Particle(blockCenterX, blockCenterY, color));
                }
            }
            
            // Remove a linha e insere nova linha vazia no topo
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            r++; // Volta para verificar a nova linha deslocada
            cleared++;
        }
    }

    if (cleared > 0) {
        linesCleared += cleared;
        score += [0, 100, 300, 500, 800][cleared] || 1000;
        
        hudScore.textContent = score;
        hudLines.textContent = linesCleared;
        
        // Aumenta velocidade gradualmente com base nas linhas
        dropInterval = Math.max(150, 1000 - linesCleared * 50);

        window.synth.playLineClear();
    }
}

// Rotação da peça
function rotatePiece() {
    const matrix = currentPiece.matrix;
    const n = matrix.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));

    // Transpor e inverter linhas para rotacionar
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            rotated[c][n - 1 - r] = matrix[r][c];
        }
    }

    const prevMatrix = currentPiece.matrix;
    currentPiece.matrix = rotated;

    // Ajusta posição se colidir ao rotacionar (Wall Kick simples)
    let offset = 1;
    const originalX = currentPiece.x;
    while (checkCollision()) {
        currentPiece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (Math.abs(offset) > matrix[0].length) {
            currentPiece.matrix = prevMatrix;
            currentPiece.x = originalX;
            return;
        }
    }
    window.synth.playRotate();
}

// Entrada de Controles do Jogador
document.addEventListener('keydown', event => {
    if (gameOver || !currentPiece) return;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault(); // Evita scroll e ações default do navegador nos controles
    }

    switch (event.code) {
        case 'ArrowLeft':
            currentPiece.x--;
            if (checkCollision()) currentPiece.x++;
            else window.synth.playMove();
            break;
        case 'ArrowRight':
            currentPiece.x++;
            if (checkCollision()) currentPiece.x--;
            else window.synth.playMove();
            break;
        case 'ArrowDown':
            moveDown();
            break;
        case 'Space':
            rotatePiece();
            break;
    }
});

// Game Over e Atualização de Ranking
function triggerGameOver() {
    gameOver = true;
    window.synth.playGameOver();
    saveScore(playerName, score);
    
    finalScore.textContent = score;
    gameScreen.classList.remove('active');
    gameOverScreen.classList.add('active');
    
    updateLeaderboards();
}

function saveScore(name, scoreVal) {
    let scores = JSON.parse(localStorage.getItem('neonGrid_ranking')) || [];
    scores.push({ name, score: scoreVal, date: new Date().toLocaleDateString() });
    
    // Ordena de forma descendente e mantém os top 5
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5);
    
    localStorage.setItem('neonGrid_ranking', JSON.stringify(scores));
}

function updateLeaderboards() {
    const scores = JSON.parse(localStorage.getItem('neonGrid_ranking')) || [];
    
    const fillTable = (tableBody) => {
        tableBody.innerHTML = '';
        if (scores.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #8a8d9a;">NENHUM REGISTRO</td></tr>`;
            return;
        }
        scores.forEach((entry, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${idx + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
            `;
            tableBody.appendChild(row);
        });
    };

    fillTable(menuLeaderboard);
    fillTable(endLeaderboard);
}
