const GAME_VERSION = '1.0.0'; // Increment this when deploying a new version

const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

let bird, pipeWidth, pipeGap;
let cloudPositions = [];

const tg = window.Telegram.WebApp;

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

function resetGame() {
    // Store the final score before resetting
    const finalScore = score;
    
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    score = 0;
    updateScoreDisplay();
    
    // Show an alert when the game is over with the final score and a refresh button
    tg.showPopup({
        title: 'Game Over',
        message: `Your final score: $${finalScore.toFixed(2)} Billion`,
        buttons: [{
            type: 'ok',
            text: 'Play Again'
        }]
    }, function() {
        // This function will be called when the user clicks "Play Again"
        initializeGame();
        gameLoop();
    });

    // Display final score on the canvas
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(`Game Over`, canvas.width / 2, canvas.height / 2 - 50);
    context.fillText(`Final Score: $${finalScore.toFixed(2)} Billion`, canvas.width / 2, canvas.height / 2);
    context.font = '18px Arial';
    context.fillText('Tap to play again', canvas.width / 2, canvas.height / 2 + 40);
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBird();
    drawPipes();
}

function handleInput(event) {
    event.preventDefault(); // Prevent default touch behavior
    
    if (score === 0 && bird.y === canvas.height / 2) {
        // The game is over, so restart
        initializeGame();
        gameLoop();
    } else {
        // Normal gameplay
        bird.velocity = bird.lift;
        
        // Add haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

// Remove the keydown event listener and related function
// window.removeEventListener('keydown', handleKeyDown);
// function handleKeyDown(event) { ... }

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
    
    // Initialize Telegram Mini App
    if (window.Telegram && window.Telegram.WebApp) {
        tg.ready();
    } else {
        console.warn('Telegram WebApp is not available. Running in standalone mode.');
    }
    
    initializeGame();
    gameLoop();
});
