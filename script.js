const canvas = document.getElementById('GameCanvas');
const ctx = canvas.getContext('2d');

// Define grid dimensions
const COLS = 20;
const ROWS = COLS;

function resizeCanvasToWindow() {
  // Define canvas size
  canvas.width = Math.min(window.innerWidth, window.innerHeight) - 100;
  canvas.height = canvas.width;
}

function drawGrid() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Compute tile size 
  const tileSize = canvas.height / ROWS;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? '#06b6d4' : '#028289';
      const x = c * tileSize;
      const y = r * tileSize;
      // Round values to avoid sub-pixel bleeding on some displays
      ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(tileSize), Math.ceil(tileSize));
    }
  }
}

// Initial draw
resizeCanvasToWindow();
drawGrid();

// Redraw on window resize
window.addEventListener('resize', () => {
  resizeCanvasToWindow();
  drawGrid();
});