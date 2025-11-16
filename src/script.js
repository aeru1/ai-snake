const canvas = document.getElementById('GameCanvas');
const ctx = canvas.getContext('2d');

// === Grid setup ===
const COLS = 16;
const ROWS = COLS;

// === Game settings ===
const MOVE_INTERVAL = 300;
let gameInterval = null;
let isGameOver = false;
let gameStarted = false;
let gameOverMessage = ""; // <-- added

const WIN_LENGTH = 15; // <-- new: whoever reaches this length first wins

// Input queue (player) — keep unique directions only
const inputQueue = [];

// Snakes
const player = {
  body: [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
    { x: 5, y: 8 }
  ],
  direction: { dx: 1, dy: 0 },
  color: '#ee6c4d',
  isAI: false,
};

const ai = {
  body: [
    { x: 4, y: 4 },
    { x: 3, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 4 }
  ],
  direction: { dx: 1, dy: 0 },
  color: '#2a9d8f',
  isAI: true,
};

// Both snakes stored in one array for unified handling
const snakes = [player, ai];

// Apples
let redApple = null;
let greenApple = null;

// Spawn apple at random position not occupied by snakes or the other apple
function spawnApple(color, forbidden = null) {
  while (true) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);

    const occupiedBySnake = snakes.some(snake =>
      snake.body.some(segment => segment.x === x && segment.y === y)
    );

    const occupiedByApples =
      (color === 'red' && greenApple && greenApple.x === x && greenApple.y === y) ||
      (color === 'green' && redApple && redApple.x === x && redApple.y === y);

    const isForbidden = forbidden && forbidden.x === x && forbidden.y === y;

    if (!occupiedBySnake && !occupiedByApples && !isForbidden) {
      if (color === 'red') redApple = { x, y };
      else greenApple = { x, y };
      break;
    }
  }
}

// Resize canvas
function resizeCanvasToWindow() {
  const size = Math.max(100, Math.min(window.innerWidth, window.innerHeight) - 100);
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
}

// Draw functions
function drawGrid() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // reserve HUD area ABOVE and BELOW the grid for lengths / info (outside the grid)
  const HUD_HEIGHT = Math.max(24, Math.floor(canvas.height * 0.08)); // pixels
  const availableHeight = canvas.height - HUD_HEIGHT * 2; // leave space for top + bottom HUD

  // compute tile size and center grid horizontally; grid starts at offsetY = HUD_HEIGHT
  const tileSize = availableHeight / ROWS;
  const gridWidth = tileSize * COLS;
  const gridHeight = tileSize * ROWS;
  const offsetX = Math.round((canvas.width - gridWidth) / 2);
  const offsetY = HUD_HEIGHT;

  const HUD_COLOR = 'rgba(0,0,0,0.25)'; // single source for top/bottom/sides

  // Top HUD background
  ctx.fillStyle = HUD_COLOR;
  ctx.fillRect(0, 0, canvas.width, HUD_HEIGHT);

  // Side bars (same color as HUD)
  const leftBarWidth = offsetX;
  const rightBarWidth = Math.max(0, canvas.width - (offsetX + gridWidth));
  if (leftBarWidth > 0) ctx.fillRect(0, offsetY, leftBarWidth, gridHeight);
  if (rightBarWidth > 0) ctx.fillRect(offsetX + gridWidth, offsetY, rightBarWidth, gridHeight);

  // Bottom HUD background (same color as sides)
  ctx.fillStyle = HUD_COLOR;
  ctx.fillRect(0, offsetY + gridHeight, canvas.width, HUD_HEIGHT);

  // HUD: snake lengths drawn in the top HUD area
  // make font size relative to HUD height so text is vertically centered reliably
  const fontSize = Math.max(12, Math.floor(HUD_HEIGHT * 0.6));
  ctx.font = `${fontSize}px Arial`;
  ctx.textBaseline = 'middle';

  const topTextY = Math.round(HUD_HEIGHT / 2); // vertically centered in top HUD

  ctx.textAlign = 'left';
  ctx.fillStyle = player.color;
  ctx.fillText(`Player: ${player.body.length}`, 10, topTextY);

  ctx.textAlign = 'right';
  ctx.fillStyle = ai.color;
  ctx.fillText(`AI: ${ai.body.length}`, canvas.width - 10, topTextY);

  // draw a subtle border around the grid (matches HUD style)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = Math.max(1, Math.floor(canvas.width * 0.002));
  ctx.strokeRect(offsetX - 0.5, offsetY - 0.5, gridWidth + 1, gridHeight + 1);

  // Background grid
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? '#3d5a80' : '#98c1d9';
      const x = offsetX + c * tileSize;
      const y = offsetY + r * tileSize;
      ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(tileSize), Math.ceil(tileSize));
    }
  }

  // Red Apple
  if (redApple) {
    const ax = offsetX + redApple.x * tileSize + tileSize / 2;
    const ay = offsetY + redApple.y * tileSize + tileSize / 2;
    const radius = tileSize * 0.35;
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(ax, ay, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Green Apple
  if (greenApple) {
    const ax = offsetX + greenApple.x * tileSize + tileSize / 2;
    const ay = offsetY + greenApple.y * tileSize + tileSize / 2;
    const radius = tileSize * 0.35;
    ctx.fillStyle = '#00c853';
    ctx.beginPath();
    ctx.arc(ax, ay, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Snakes (pass offsets so drawing stays inside the grid)
  for (const s of snakes) {
    drawSnake(s, tileSize, offsetX, offsetY);
  }

  // Game over message 
  if (isGameOver) {
    // semi-transparent background box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const boxHeight = 120; 
    ctx.fillRect(0, canvas.height / 2 - boxHeight / 2, canvas.width, boxHeight);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(canvas.width / 12)}px Arial`;
    ctx.fillText(gameOverMessage, canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = `${Math.floor(canvas.width / 30)}px Arial`;
    ctx.fillText('Press Enter to restart', canvas.width / 2, canvas.height / 2 + 30);
  }
}

function drawSnake(snake, tileSize, offsetX = 0, offsetY = 0) {
  if (!ctx) return;
  ctx.fillStyle = snake.color;
  for (let i = 0; i < snake.body.length; i++) {
    const segment = snake.body[i];
    const px = offsetX + segment.x * tileSize;
    const py = offsetY + segment.y * tileSize;
    ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(tileSize), Math.ceil(tileSize));
  }

  const head = snake.body[0];
  const hx = offsetX + head.x * tileSize;
  const hy = offsetY + head.y * tileSize;
  const r = Math.max(1, Math.floor(tileSize * 0.08));
  ctx.fillStyle = '#000';
  let ex1, ey1, ex2, ey2;
  const dir = snake.direction || { dx: 1, dy: 0 };

  if (dir.dx === 1) {
    ex1 = hx + tileSize * 0.70; ey1 = hy + tileSize * 0.30;
    ex2 = hx + tileSize * 0.70; ey2 = hy + tileSize * 0.70;
  } else if (dir.dx === -1) {
    ex1 = hx + tileSize * 0.30; ey1 = hy + tileSize * 0.30;
    ex2 = hx + tileSize * 0.30; ey2 = hy + tileSize * 0.70;
  } else if (dir.dy === 1) {
    ex1 = hx + tileSize * 0.30; ey1 = hy + tileSize * 0.70;
    ex2 = hx + tileSize * 0.70; ey2 = hy + tileSize * 0.70;
  } else {
    ex1 = hx + tileSize * 0.30; ey1 = hy + tileSize * 0.30;
    ex2 = hx + tileSize * 0.70; ey2 = hy + tileSize * 0.30;
  }

  ctx.beginPath();
  ctx.arc(Math.round(ex1), Math.round(ey1), r, 0, Math.PI * 2);
  ctx.arc(Math.round(ex2), Math.round(ey2), r, 0, Math.PI * 2);
  ctx.fill();
}

// Movement logic
function gameOver(message) {
  isGameOver = true;
  gameOverMessage = message; // <-- store custom message
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
  drawGrid();
}

// Game update loop
function update() {
  if (isGameOver) return;

  // Apply buffered input to the player (prevent reversing)
  if (inputQueue.length > 0) {
    const next = inputQueue.shift();
    const lastDir = player.direction;
    const isOpposite = next.dx === -lastDir.dx && next.dy === -lastDir.dy;
    if (!isOpposite) player.direction = next;
  }

  const plans = snakes.map(snake => {
    const head = snake.body[0];
    const dir = snake.direction;
    const newHead = {
      x: (head.x + dir.dx + COLS) % COLS,
      y: (head.y + dir.dy + ROWS) % ROWS
    };
    const ateRed = redApple && newHead.x === redApple.x && newHead.y === redApple.y;
    const ateGreen = greenApple && newHead.x === greenApple.x && newHead.y === greenApple.y;
    const willGrow = ateRed;
    return { snake, head, newHead, willGrow, ateRed, ateGreen, died: false };
  });

  // Detect collisions per snake
  for (const p of plans) {
    for (const s of snakes) {
      for (let idx = 0; idx < s.body.length; idx++) {
        const seg = s.body[idx];
        const isTail = idx === s.body.length - 1;
        const sPlan = plans.find(pl => pl.snake === s);
        if (isTail && sPlan && !sPlan.willGrow) continue;
        if (seg.x === p.newHead.x && seg.y === p.newHead.y) {
          p.died = true;
        }
      }
    }
  }

  // Head-on collisions or swapping heads
  if (plans[0].newHead.x === plans[1].newHead.x && plans[0].newHead.y === plans[1].newHead.y) {
    plans[0].died = plans[1].died = true;
  }
  if (plans[0].newHead.x === plans[1].head.x && plans[0].newHead.y === plans[1].head.y &&
      plans[1].newHead.x === plans[0].head.x && plans[1].newHead.y === plans[0].head.y) {
    plans[0].died = plans[1].died = true;
  }

  const playerDied = plans.find(p => p.snake === player).died;
  const aiDied = plans.find(p => p.snake === ai).died;

  if (playerDied && aiDied) {
    gameOver("Draw - No KObra");
    return;
  } else if (playerDied) {
    gameOver("AI is the KObra");
    return;
  } else if (aiDied) {
    gameOver("Player is the KObra");
    return;
  }

  // No deaths -> apply moves
  for (const p of plans) {
    p.snake.body.unshift(p.newHead);
    if (!p.willGrow) p.snake.body.pop();

    if (p.ateRed) spawnApple('red', p.newHead);
    if (p.ateGreen) {
      const opponent = p.snake.isAI ? player : ai;
      if (opponent.body.length > 1) opponent.body.pop();
      spawnApple('green', p.newHead);
    }
  }

  // --- NEW: check for length-1 loss condition (minimal insertion) ---
  const playerLen = player.body.length;
  const aiLen = ai.body.length;
  if (playerLen <= 1 && aiLen <= 1) {
    gameOver("Draw - No KObra");
    return;
  } else if (playerLen <= 1) {
    gameOver("AI is the KObra");
    return;
  } else if (aiLen <= 1) {
    gameOver("Player is the KObra");
    return;
  }

  // --- NEW: win-by-length check ---
  if (playerLen >= WIN_LENGTH || aiLen >= WIN_LENGTH) {
    if (playerLen >= WIN_LENGTH && aiLen >= WIN_LENGTH) {
      gameOver("Draw - No KObra");
    } else if (playerLen >= WIN_LENGTH) {
      gameOver("Player is the KObra");
    } else {
      gameOver("AI is the KObra");
    }
    return;
  }

  drawGrid();
}

function startGameLoop() {
  if (gameInterval) return;
  gameInterval = setInterval(update, MOVE_INTERVAL);
}

// Input handling 
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  if (isGameOver && key === 'enter') {
    restartGame();
    return;
  }

  if (!gameStarted && !isGameOver) {
    gameStarted = true;
    startGameLoop();
  }

  // movement keys for player
  let newDir = null;
  if (key === 'arrowup' || key === 'w') newDir = { dx: 0, dy: -1 };
  else if (key === 'arrowdown' || key === 's') newDir = { dx: 0, dy: 1 };
  else if (key === 'arrowleft' || key === 'a') newDir = { dx: -1, dy: 0 };
  else if (key === 'arrowright' || key === 'd') newDir = { dx: 1, dy: 0 };

  if (newDir) {
    // prevent immediate reversal; compare against last queued direction or current
    const lastDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : player.direction;
    const isOpposite = newDir.dx === -lastDir.dx && newDir.dy === -lastDir.dy;

    // avoid duplicate directions in the queue (only one instance of each direction)
    const alreadyQueued = inputQueue.some(d => d.dx === newDir.dx && d.dy === newDir.dy);

    if (!isOpposite && !alreadyQueued) inputQueue.push(newDir);
  }
});

// Game over & restart
function restartGame() {
  player.body = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
    { x: 5, y: 8 }
  ];
  player.direction = { dx: 1, dy: 0 };

  ai.body = [
    { x: 4, y: 4 },
    { x: 3, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 4 }
  ];
  ai.direction = { dx: 1, dy: 0 };

  inputQueue.length = 0;
  isGameOver = false;
  gameOverMessage = "";

  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
  gameStarted = false;

  spawnApple('red');
  spawnApple('green');
  drawGrid();
}

// Initial setup
resizeCanvasToWindow();
spawnApple('red');
spawnApple('green');
drawGrid();

window.addEventListener('resize', () => {
  resizeCanvasToWindow();
  drawGrid();
});
