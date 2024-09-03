const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

function resizeCanvas() {
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
    // Adjust game elements based on new canvas size
    bird.width = canvas.width * 0.1;
    bird.height = bird.width * 0.75;
    bird.x = canvas.width * 0.2;
    pipeWidth = canvas.width * 0.15;
    pipeGap = canvas.height * 0.28;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const bird = {
    x: canvas.width * 0.2,
    y: canvas.height / 2,
    width: canvas.width * 0.1,
    height: canvas.width * 0.075,
    gravity: 0.0015 * canvas.height,
    lift: -0.03 * canvas.height,
    velocity: 0,
    image: new Image()
};

bird.image.src = 'images/google_bird.png';

const pipeImages = [
    'images/bing_pipe.png',
    'images/yahoo_pipe.png',
    'images/duckduckgo_pipe.png'
];

const pipes = [];
const pipeWidth = canvas.width * 0.15;
const pipeGap = canvas.height * 0.28; // Increased gap for easier gameplay
const pipeSpeed = 3; // Reduced speed for easier gameplay

let score = 0;

function drawBackground() {
    const background = new Image();
    background.src = 'images/sky_background.png'; // Add a background image
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
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
        const pipeImage = new Image();
        pipeImage.src = pipe.image;
        context.drawImage(pipeImage, pipe.x, 0, pipeWidth, pipe.height);
        context.drawImage(pipeImage, pipe.x, pipe.height + pipeGap, pipeWidth, canvas.height - pipe.height - pipeGap);
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

    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - canvas.width * 0.4) {
        const pipeHeight = Math.floor(Math.random() * (canvas.height - pipeGap - canvas.height * 0.2)) + canvas.height * 0.1;
        const pipeImage = pipeImages[Math.floor(Math.random() * pipeImages.length)];
        pipes.push({ x: canvas.width, height: pipeHeight, image: pipeImage });
        score += 0.05; // Increase score more quickly
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
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function updateScoreDisplay() {
    scoreDisplay.innerText = `Revenue: $${score.toFixed(2)} Billion`;
}

window.addEventListener('keydown', function (event) {
    if (event.code === 'Space') {
        handleInput();
    }
});

canvas.addEventListener('touchstart', function (event) {
    event.preventDefault();
    handleInput();
});

document.addEventListener('DOMContentLoaded', function() {
    resizeCanvas();
    resetGame();
    gameLoop();
});
