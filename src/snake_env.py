import random

# === Helper data structures ===
UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRECTIONS = [UP, DOWN, LEFT, RIGHT]


class SnakeAgent:
    """
    Represents a snake agent (player or AI).
    Tracks its body positions and current direction.
    """
    def __init__(self, body, direction, is_ai=False):
        self.body = body[:]  # list of (x, y) tuples
        self.direction = direction  # current movement direction
        self.is_ai = is_ai

    def head(self):
        return self.body[0]

    def length(self):
        return len(self.body)

    def copy(self):
        """Returns a deep copy of the snake agent."""
        return SnakeAgent(self.body[:], self.direction, self.is_ai)


class SnakeEnv:
    """
    Snake game environment for AI training.
    Simulates the full game logic without any GUI.
    """

    def __init__(self, cols=16, rows=16, seed=None):
        # allow optional deterministic randomness for tests / reproducibility
        self.cols = cols
        self.rows = rows
        if seed is not None:
            random.seed(seed)
        self.seed_value = seed

        # keep previous default behavior: winning length
        self.win_length = 15

        # Game state variables
        self.done = False
        self.winner = None  # "player", "ai", or "draw"

        self.player = None
        self.ai = None
        self.red_apple = None
        self.green_apple = None

        self.reset()

    # === Initialization ===
    def reset(self, seed=None):
        """Reset the game state."""
        if seed is not None:
            random.seed(seed)
            self.seed_value = seed

        self.done = False
        self.winner = None

        # Initialize player and AI snakes to match JS version
        self.player = SnakeAgent(
            body=[(8, 8), (7, 8), (6, 8), (5, 8)],
            direction=RIGHT,
            is_ai=False
        )

        self.ai = SnakeAgent(
            body=[(4, 4), (3, 4), (2, 4), (1, 4)],
            direction=RIGHT,
            is_ai=True
        )

        # Spawn apples
        self.red_apple = self.spawn_apple()
        self.green_apple = self.spawn_apple(exclude=[self.red_apple])

        return self.get_state()

    # === Utility functions ===
    def spawn_apple(self, exclude=None):
        """Randomly spawns an apple avoiding snake bodies and optionally excluded cells."""
        if exclude is None:
            exclude = []
        occupied = set(self.player.body + self.ai.body + exclude)
        available = [(x, y) for x in range(self.cols) for y in range(self.rows)
                     if (x, y) not in occupied]
        return random.choice(available) if available else None

    def inside_bounds(self, x, y):
        """Check if position is inside the grid."""
        return 0 <= x < self.cols and 0 <= y < self.rows

    def move_snake(self, snake):
        """Move the snake one step in its direction with wrap-around logic."""
        if self.done:
            return

        dx, dy = snake.direction
        head_x, head_y = snake.head()

        # Move and wrap around edges
        new_x = (head_x + dx) % self.cols
        new_y = (head_y + dy) % self.rows
        new_head = (new_x, new_y)

        snake.body.insert(0, new_head)

    def check_collision(self, snake):
        """Return True if snake collides with itself or the other snake."""
        # Collides with self
        if snake.head() in snake.body[1:]:
            return True

        # Collides with other snake
        other = self.ai if not snake.is_ai else self.player
        if snake.head() in other.body:
            return True

        return False

    # === Core game logic ===
    def step(self, player_dir, ai_dir):
        """
        Advance the game by one tick.
        Both snakes choose a direction (tuples like (1,0)).
        Returns: next_state, reward, done, info
        """
        if self.done:
            return self.get_state(), 0, True, {}

        # Update directions
        self.player.direction = player_dir
        self.ai.direction = ai_dir

        # Move both snakes
        self.move_snake(self.player)
        self.move_snake(self.ai)

        # Check for deaths
        player_died = self.check_collision(self.player)
        ai_died = self.check_collision(self.ai)

        # Handle apple logic
        self.handle_apples()

        # Determine outcome
        if player_died and ai_died:
            self.done = True
            self.winner = "draw"
        elif player_died:
            self.done = True
            self.winner = "ai"
        elif ai_died:
            self.done = True
            self.winner = "player"

        # Check win by length
        if self.player.length() >= self.win_length and not self.done:
            self.done = True
            self.winner = "player"
        elif self.ai.length() >= self.win_length and not self.done:
            self.done = True
            self.winner = "ai"

        return self.get_state(), self.compute_reward(), self.done, {"winner": self.winner}

    def handle_apples(self):
        """Handles eating red and green apples."""
        # === Red apple (growth) ===
        if self.player.head() == self.red_apple:
            self.red_apple = self.spawn_apple()
        else:
            self.player.body.pop()

        if self.ai.head() == self.red_apple:
            self.red_apple = self.spawn_apple()
        else:
            self.ai.body.pop()

        # === Green apple (shrink opponent) ===
        if self.player.head() == self.green_apple:
            if len(self.ai.body) > 1:
                self.ai.body.pop()
            self.green_apple = self.spawn_apple(exclude=[self.red_apple])

        if self.ai.head() == self.green_apple:
            if len(self.player.body) > 1:
                self.player.body.pop()
            self.green_apple = self.spawn_apple(exclude=[self.red_apple])

    # === Observations and rewards ===
    def get_state(self):
        """Return a simplified representation of the current game state."""
        return {
            "player": self.player.body,
            "ai": self.ai.body,
            "red_apple": self.red_apple,
            "green_apple": self.green_apple,
            "done": self.done,
            "winner": self.winner,
        }

    def compute_reward(self):
        """
        Simple reward logic:
        +1 if player wins,
        -1 if AI wins,
         0 otherwise.
        """
        if self.winner == "player":
            return 1
        elif self.winner == "ai":
            return -1
        else:
            return 0
