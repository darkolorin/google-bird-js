const GAME_VERSION = '1.0.0'; // Increment this when deploying a new version

const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

let bird, pipeWidth, pipeGap;
let cloudPositions = [];

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

    pipeWidth = canvas.width * 0.15;
    pipeGap = canvas.height * 0.35; // Increased pipe gap

    // Initialize cloud positions
    cloudPositions = Array(5).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height / 2),
        size: Math.random() * 50 + 25,
        speed: Math.random() * 0.5 + 0.1
    }));
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
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');  // Sky blue at the top
    gradient.addColorStop(1, '#E0F6FF');  // Lighter blue at the bottom

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add some clouds
    drawClouds();
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
        context.fillStyle = '#75C147'; // Green color for pipes
        context.fillRect(pipe.x, 0, pipeWidth, pipe.height); // Top pipe
        context.fillRect(pipe.x, pipe.height + pipeGap, pipeWidth, canvas.height - pipe.height - pipeGap); // Bottom pipe
    });
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
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    score = 0;
    updateScoreDisplay();
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBird();
    drawPipes();
}

function handleInput() {
    bird.velocity = bird.lift;
    // Add a small cooldown to prevent rapid flapping
    canvas.removeEventListener('touchstart', handleInput);
    window.removeEventListener('keydown', handleKeyDown);
    setTimeout(() => {
        canvas.addEventListener('touchstart', handleInput);
        window.addEventListener('keydown', handleKeyDown);
    }, 250); // 250ms cooldown
}

function handleKeyDown(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        handleInput();
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

window.addEventListener('keydown', handleKeyDown);
canvas.addEventListener('touchstart', function (event) {
    event.preventDefault();
    handleInput();
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    console.log(`Game version: ${GAME_VERSION}`);
    
    // Clear localStorage cache
    localStorage.clear();
    
    // Clear sessionStorage cache
    sessionStorage.clear();
    
    // Attempt to clear application cache (if applicable)
    if (window.applicationCache) {
        window.applicationCache.addEventListener('updateready', function() {
            if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
                window.applicationCache.swapCache();
                window.location.reload();
            }
        });
    }
    
    initializeGame();
    resetGame();
    gameLoop();
});
