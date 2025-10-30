const canvas = document.getElementById('GameCanvas');
const ctx = canvas.getContext('2d');

// Define grid dimensions
const COLS = 16;
const ROWS = COLS;

// === Snake body setup (length 4) ===
let snake = [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
  { x: 5, y: 8 }
];

// Input queue for buffered movement
const inputQueue = [];

// Direction object
let direction = { dx: 0, dy: 0 }; // start moving right by default

// Control movement speed
const MOVE_INTERVAL = 300;
let gameInterval = null;

function resizeCanvasToWindow() {
  canvas.width = Math.min(window.innerWidth, window.innerHeight) - 100;
  canvas.height = canvas.width;
}

function drawGrid() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const tileSize = canvas.height / ROWS;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? '#3d5a80' : '#98c1d9';
      const x = c * tileSize;
      const y = r * tileSize;
      ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(tileSize), Math.ceil(tileSize));
    }
  }

  drawSnake(tileSize);
}

function drawSnake(tileSize) {
  ctx.fillStyle = '#ee6c4d';
  for (const segment of snake) {
    const px = segment.x * tileSize;
    const py = segment.y * tileSize;
    ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(tileSize), Math.ceil(tileSize));
  }
}

function moveSnake(dx, dy) {
  const head = snake[0];
  const newHead = {
    x: (head.x + dx + COLS) % COLS,
    y: (head.y + dy + ROWS) % ROWS
  };

  // Add new head to front
  snake.unshift(newHead);

  // Remove last segment (no growth yet)
  snake.pop();
}

function update() {
  // Process input queue
  if (inputQueue.length > 0) {
    direction = inputQueue.shift();
  }

  if (direction.dx !== 0 || direction.dy !== 0) {
    moveSnake(direction.dx, direction.dy);
  }

  drawGrid();
}

function startGameLoop() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(update, MOVE_INTERVAL);
}

// Keyboard input handler
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  let newDir = null;

  switch (key) {
    case 'w':
    case 'arrowup':
      newDir = { dx: 0, dy: -1 };
      break;
    case 's':
    case 'arrowdown':
      newDir = { dx: 0, dy: 1 };
      break;
    case 'a':
    case 'arrowleft':
      newDir = { dx: -1, dy: 0 };
      break;
    case 'd':
    case 'arrowright':
      newDir = { dx: 1, dy: 0 };
      break;
  }

  if (newDir) {
    const lastQueued = inputQueue[inputQueue.length - 1] || direction;

    // Reversal prevention
    const isOpposite = newDir.dx === -lastQueued.dx && newDir.dy === -lastQueued.dy;
    if (isOpposite) return;

    // Queue new direction
    if (inputQueue.length < 2 &&
        (newDir.dx !== lastQueued.dx || newDir.dy !== lastQueued.dy)) {
      inputQueue.push(newDir);
    }
  }
});

// Initial setup
resizeCanvasToWindow();
drawGrid();
startGameLoop();

window.addEventListener('resize', () => {
  resizeCanvasToWindow();
  drawGrid();
});
