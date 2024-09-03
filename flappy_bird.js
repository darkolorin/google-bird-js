const GAME_VERSION = '1.0.1'; // Increment this when deploying a new version

const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

let bird, pipeWidth, pipeGap;
let cloudPositions = [];

// Modify the tg initialization
const tg = window.Telegram ? window.Telegram.WebApp : {
    // Mock Telegram WebApp methods for desktop testing
    ready: () => console.log('Mock Telegram WebApp ready'),
    showPopup: (params, callback) => {
        alert(params.message);
        if (callback) callback();
    },
    HapticFeedback: {
        impactOccurred: () => console.log('Mock haptic feedback')
    },
    setBackgroundColor: (color) => console.log('Mock set background color:', color)
};

function initializeGame() {
    resizeCanvas();
    
    bird = {
        x: canvas.width * 0.2,
        y: canvas.height / 2,
        width: canvas.width * 0.1,
        height: canvas.width * 0.075,
        gravity: 0.0008 * canvas.height, // Reduced gravity
        lift: -0.015 * canvas.height, // Reduced lift
        velocity: 0,
        image: new Image()
    };

    bird.image.src = `images/google_bird.png?v=${GAME_VERSION}`;
    bird.image.onerror = () => console.error('Failed to load bird image');

    pipeWidth = canvas.width * 0.2; // Increased pipe width for pixel art style
    pipeGap = canvas.height * 0.35;

    // Initialize cloud positions
    cloudPositions = Array(5).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height / 2),
        size: Math.random() * 50 + 25,
        speed: Math.random() * 0.5 + 0.1
    }));

    // Set the background color of the Telegram Mini App
    tg.setBackgroundColor('#87CEEB');

    // Add touch event listener for the whole document
    document.addEventListener('touchstart', handleInput);
}

function resizeCanvas() {
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    
    if (bird) {
        bird.width = canvas.width * 0.1;
        bird.height = bird.width * 0.75;
        bird.x = canvas.width * 0.2;
    }
    
    pipeWidth = canvas.width * 0.15;
    pipeGap = canvas.height * 0.35; // Increased pipe gap
}

window.addEventListener('resize', function() {
    resizeCanvas();
    if (bird) {
        bird.y = canvas.height / 2; // Reset bird position on resize
    }
});

const pipeImages = [
    `images/bing_pipe.png?v=${GAME_VERSION}`,
    `images/yahoo_pipe.png?v=${GAME_VERSION}`,
    `images/duckduckgo_pipe.png?v=${GAME_VERSION}`
];

const pipes = [];
const pipeSpeed = 2; // Reduced pipe speed

let score = 0;

function drawBackground() {
    drawPixelSky();
    drawClouds();
}

function drawPixelSky() {
    const pixelSize = 10;
    const colors = ['#87CEEB', '#97DEFA', '#A7EEFF'];
    
    for (let y = 0; y < canvas.height; y += pixelSize) {
        for (let x = 0; x < canvas.width; x += pixelSize) {
            context.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            context.fillRect(x, y, pixelSize, pixelSize);
        }
    }
}

function drawClouds() {
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    
    cloudPositions.forEach(cloud => {
        context.beginPath();
        context.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        context.arc(cloud.x + cloud.size * 0.5, cloud.y - cloud.size * 0.5, cloud.size * 0.6, 0, Math.PI * 2);
        context.arc(cloud.x + cloud.size, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
        context.fill();

        // Move the cloud
        cloud.x -= cloud.speed;
        if (cloud.x + cloud.size * 2 < 0) {
            cloud.x = canvas.width + cloud.size;
            cloud.y = Math.random() * (canvas.height / 2);
        }
    });
}

function drawBird() {
    context.save();
    context.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    context.rotate(Math.min(Math.PI / 6, Math.max(-Math.PI / 6, bird.velocity * 0.1))); // Add rotation based on velocity
    context.drawImage(bird.image, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    context.restore();
}

function drawPipes() {
    pipes.forEach(pipe => {
        drawPixelPipe(pipe.x, pipe.height, true);  // Top pipe
        drawPixelPipe(pipe.x, pipe.height, false); // Bottom pipe
    });
}

function drawPixelPipe(x, height, isTop) {
    const pixelSize = 5;
    const pipeColors = ['#75C147', '#65B137', '#55A127'];
    
    for (let y = 0; y < (isTop ? height : canvas.height - height - pipeGap); y += pixelSize) {
        for (let pipeX = x; pipeX < x + pipeWidth; pipeX += pixelSize) {
            context.fillStyle = pipeColors[Math.floor(Math.random() * pipeColors.length)];
            context.fillRect(pipeX, isTop ? y : height + pipeGap + y, pixelSize, pixelSize);
        }
    }
    
    // Draw pipe edge
    context.fillStyle = '#4C8C2B';
    for (let pipeX = x; pipeX < x + pipeWidth; pipeX += pixelSize) {
        context.fillRect(pipeX, isTop ? height - pixelSize : height + pipeGap, pixelSize, pixelSize);
    }
}

function update() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    if (bird.y > canvas.height || bird.y < 0) {
        resetGame();
    }

    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;
    });

    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - canvas.width * 0.5) { // Increased distance between pipes
        const pipeHeight = Math.floor(Math.random() * (canvas.height - pipeGap - canvas.height * 0.3)) + canvas.height * 0.15; // Adjusted pipe height range
        pipes.push({ x: canvas.width, height: pipeHeight });
        score += 0.05;
        updateScoreDisplay();
    }

    pipes.forEach((pipe, index) => {
        if (pipe.x + pipeWidth < 0) {
            pipes.splice(index, 1);
        }
    });

    pipes.forEach(pipe => {
        if (bird.x < pipe.x + pipeWidth &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.height || bird.y + bird.height > pipe.height + pipeGap)) {
            resetGame();
        }
    });
}

// Add this new function to create and show the end screen
function showEndScreen(finalScore) {
    const endScreen = document.createElement('div');
    endScreen.id = 'end-screen';
    endScreen.style.position = 'absolute';
    endScreen.style.top = '0';
    endScreen.style.left = '0';
    endScreen.style.width = '100%';
    endScreen.style.height = '100%';
    endScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    endScreen.style.display = 'flex';
    endScreen.style.flexDirection = 'column';
    endScreen.style.justifyContent = 'center';
    endScreen.style.alignItems = 'center';
    endScreen.style.color = 'white';
    endScreen.style.fontFamily = 'Arial, sans-serif';

    const gameOverText = document.createElement('h1');
    gameOverText.textContent = 'Game Over';
    gameOverText.style.marginBottom = '20px';

    const scoreText = document.createElement('p');
    scoreText.textContent = `Final Score: $${finalScore.toFixed(2)} Billion`;
    scoreText.style.fontSize = '24px';
    scoreText.style.marginBottom = '30px';

    const playAgainButton = document.createElement('button');
    playAgainButton.textContent = 'Play Again';
    playAgainButton.style.padding = '10px 20px';
    playAgainButton.style.fontSize = '18px';
    playAgainButton.style.cursor = 'pointer';
    playAgainButton.onclick = function() {
        gameContainer.removeChild(endScreen);
        initializeGame();
        gameLoop();
    };

    endScreen.appendChild(gameOverText);
    endScreen.appendChild(scoreText);
    endScreen.appendChild(playAgainButton);

    gameContainer.appendChild(endScreen);
}

// Modify the resetGame function
function resetGame() {
    // Store the final score before resetting
    const finalScore = score;
    
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    score = 0;
    updateScoreDisplay();
    
    // Show the end screen
    showEndScreen(finalScore);

    // Show Telegram popup if available
    if (tg.showPopup) {
        tg.showPopup({
            title: 'Game Over',
            message: `Your final score: $${finalScore.toFixed(2)} Billion`,
            buttons: [{
                type: 'ok',
                text: 'Close'
            }]
        });
    }
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBird();
    drawPipes();
}

// Modify the handleInput function
function handleInput(event) {
    event.preventDefault(); // Prevent default behavior
    
    // Check if the end screen is visible
    const endScreen = document.getElementById('end-screen');
    if (endScreen) {
        return; // Don't handle input if the end screen is visible
    }
    
    // Normal gameplay
    bird.velocity = bird.lift;
    
    // Add haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

function gameLoop() {
    console.log('Game loop running'); // Add this line
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function updateScoreDisplay() {
    scoreDisplay.innerText = `Revenue: $${score.toFixed(2)} Billion`;
}

// Modify the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    console.log(`Game version: ${GAME_VERSION}`);
    
    // Clear localStorage cache
    localStorage.clear();
    
    // Clear sessionStorage cache
    sessionStorage.clear();
    
    // Initialize Telegram Mini App or mock for desktop
    tg.ready();
    
    initializeGame();
    gameLoop();

    // Add event listeners for both touch and mouse events
    document.addEventListener('touchstart', handleInput);
    document.addEventListener('click', handleInput);
});
