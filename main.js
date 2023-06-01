// Game piece types
const pieceTypes = ['🪨', '📃', '✂️'];

// Game piece array
let gamePieces = [];

// Variables for controlling the simulation
let iterationCount = 0;
let isRunning = false;
let intervalId = null;
let remainingIterations = 0;
let simulationSpeed = 2; // Default simulation speed in milliseconds
let winningType = null;

// Function to generate random positions
function getRandomPosition() {
  const min = 0;
  const max = 380; // Adjust this value based on the game area size
  const x = Math.floor(Math.random() * (max - min + 1)) + min;
  const y = Math.floor(Math.random() * (max - min + 1)) + min;
  return { x, y };
}

// Function to render game pieces
function renderGamePieces() {
  const gameArea = document.getElementById('game-area');
  gameArea.innerHTML = '';

  // Display the iteration count
  const iterationCounter = document.getElementById('iteration-counter');
  iterationCounter.textContent = `Iteration: ${iterationCount}`;

  gamePieces.forEach(piece => {
    const { x, y, type } = piece;
    const gamePieceElement = document.createElement('div');
    gamePieceElement.className = 'game-piece';
    gamePieceElement.style.left = `${x}px`;
    gamePieceElement.style.top = `${y}px`;
    gamePieceElement.textContent = type;
    gameArea.appendChild(gamePieceElement);
  });
}

// Initialize game pieces
function initializeGamePieces() {
  gamePieces = []; // Clear existing game pieces
  for (let i = 0; i < 10; i++) {
    pieceTypes.forEach(type => {
      let position;
      let collision;

      do {
        position = getRandomPosition();
        collision = gamePieces.some(piece => {
          const dx = position.x - piece.x;
          const dy = position.y - piece.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < 40; // Adjust this value to determine the minimum distance between game pieces
        });
      } while (collision);

      gamePieces.push({
        x: position.x,
        y: position.y,
        type: type
      });
    });
  }

  renderGamePieces();
}

carefulGreedyStrategy = compositeStrategy(carefulStrategy, greedyStrategy, randomStrategy);
greedyCarefulStrategy = compositeStrategy(greedyStrategy, carefulStrategy, randomStrategy);

// Map of type to strategy
const strategies = {
  '🪨': carefulGreedyStrategy,
  '📃': balancedStrategy,
  '✂️': balancedStrategy
};

// Default strategy - Move randomly (non-zero values)
function randomStrategy() {
  let x, y;
  do {
    x = Math.floor(Math.random() * 3) - 1;
    y = Math.floor(Math.random() * 3) - 1;
  } while (x === 0 && y === 0);
  return { x, y };
}

function balancedStrategy(otherPieces) {
  nonPeers = otherPieces.filter(piece => piece.relation != "peer");
  closest = nonPeers[0]
  multiplier = closest.relation == "dominated" ? 1 : -1;
  return {
    x: Math.sign(closest.dx) * multiplier,
    y: Math.sign(closest.dy) * multiplier
  };
}

function greedyStrategy(otherPieces) {
  dominated = otherPieces.filter(piece => piece.relation == "dominated");
  if (dominated.length == 0) {
    return null;
  }
  return {
    x: Math.sign(dominated[0].dx),
    y: Math.sign(dominated[0].dy)
  };
}

function carefulStrategy(otherPieces) {
  dominator = otherPieces.filter(piece => piece.relation == "dominator");
  if (dominator.length == 0) {
    return null;
  }
  return {
    x: Math.sign(dominator[0].dx) * -1,
    y: Math.sign(dominator[0].dy) * -1
  };
}

function compositeStrategy(...strategies) {
  return (otherPieces) => {
    for (i = 0; i < strategies.length; i++) {
      move = strategies[i](otherPieces);
      if (move) {
        return move;
      }
    }
  }
}

// Function to calculate the new position based on the current position and the move
function calculateNewPosition(position, move) {
  const gameAreaSize = 380; // Adjust this value based on the game area size
  const { x, y } = position;
  const { x: moveX, y: moveY } = move;

  // Wrap around the edges
  let newX = (x + moveX + gameAreaSize) % gameAreaSize;
  let newY = (y + moveY + gameAreaSize) % gameAreaSize;

  return { x: newX, y: newY };
}

// Function to update game pieces' positions and render them
function advance() {
  return new Promise(resolve => {
    iterationCount++;
    const newGamePieces = [];

    gamePieces.forEach(piece => {
      const { x, y, type } = piece;
      const strategy = strategies[type];
      const move = strategy(getOtherPiecesWithRelativeLocation(piece));
      const newPosition = calculateNewPosition({ x, y }, move);

      newGamePieces.push({
        x: newPosition.x,
        y: newPosition.y,
        type: type
      });
    });

    gamePieces = newGamePieces;
    renderGamePieces();
    setTimeout(resolve, simulationSpeed);
  }); 
}

function updatePieceTypes() {
  return new Promise(resolve => {
    const newGamePieces = [];

    gamePieces.forEach(piece => {
      const { x, y, type } = piece;
      let newType = type;

      // Check if the piece touches any neighboring piece of a dominating type
      const neighboringPieces = gamePieces.filter(neighbor => {
        const dx = x - neighbor.x;
        const dy = y - neighbor.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= 30 && isDominatingType(type, neighbor.type);
      });

      if (neighboringPieces.length > 0) {
        newType = neighboringPieces[0].type;
      }

      newGamePieces.push({
        x: x,
        y: y,
        type: newType
      });
    });

    gamePieces = newGamePieces;
    renderGamePieces();

    // Check for a winner
    const remainingTypes = new Set(gamePieces.map(piece => piece.type));
    if (remainingTypes.size === 1) {
      winningType = [...remainingTypes][0];
      document.getElementById('message').textContent = `${winningType} won!`;
      document.getElementById('message').style.display = 'block';
      clearInterval(intervalId);
      document.getElementById('play-pause').textContent = 'Reset';
      isRunning = false;
    }

    setTimeout(resolve, simulationSpeed);
  }); 
}

function isDominatingType(type, neighborType) {
  return (
    (type === '✂️' && neighborType === '🪨') ||
    (type === '🪨' && neighborType === '📃') ||
    (type === '📃' && neighborType === '✂️')
  );
}

function findShortestPath(from, to) {
  const boardSize = 400;
  const cutoff = 20;
  const gameAreaSize = boardSize - cutoff;

  const dx = (to.x - from.x + gameAreaSize / 2) % gameAreaSize - gameAreaSize / 2;
  const dy = (to.y - from.y + gameAreaSize / 2) % gameAreaSize - gameAreaSize / 2;

  return { x: dx, y: dy };
}

function getOtherPiecesWithRelativeLocation(piece) {
  const otherPieces = gamePieces.filter(otherPiece => otherPiece !== piece);
  
  const piecesWithRelativeLocation = otherPieces.map(otherPiece => {
    const shortestPath = findShortestPath(piece, otherPiece);
    const dx = shortestPath.x;
    const dy = shortestPath.y;
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    let relation = '';

    if (isDominatingType(piece.type, otherPiece.type)) {
      relation = 'dominator';
    } else if (isDominatingType(otherPiece.type, piece.type)) {
      relation = 'dominated';
    } else {
      relation = 'peer';
    }

    return {
      dx,
      dy,
      distance,
      relation
    };
  });

  piecesWithRelativeLocation.sort((a, b) => a.distance - b.distance);

  return piecesWithRelativeLocation;
}

// Call the initialization function
initializeGamePieces();

// Handle button clicks and control the simulation
document.getElementById('play-pause').addEventListener('click', () => {
  if (!isRunning) {
    if (winningType) {
      iterationCount = 0; // Reset iteration count
      initializeGamePieces();
      document.getElementById('message').style.display = 'none';
      document.getElementById('play-pause').textContent = 'Play';
      winningType = null;
    } else {
      isRunning = true;
      intervalId = setInterval(runSimulation, simulationSpeed);
      document.getElementById('play-pause').textContent = 'Pause';
    }
  } else {
    isRunning = false;
    clearInterval(intervalId);
    document.getElementById('play-pause').textContent = 'Play';
  }
});

document.getElementById('settings').addEventListener('click', () => {
  document.getElementById('settings-menu').style.display = 'block';
});

document.getElementById('apply-settings').addEventListener('click', () => {
  const speedInput = document.getElementById('speed');
  const iterationsInput = document.getElementById('iterations');
  simulationSpeed = parseInt(speedInput.value, 10);
  remainingIterations = parseInt(iterationsInput.value, 10);
  document.getElementById('settings-menu').style.display = 'none';
});

function runSimulation() {
  advance().then(() => {
    updatePieceTypes().then(() => {
      remainingIterations--;
      if (remainingIterations === 0) {
        clearInterval(intervalId);
        document.getElementById('play-pause').textContent = 'Play';
        isRunning = false;
      }
    });
  });
}
