const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

const bird = {
    x: 50,
    y: canvas.height / 2,
    width: 40,
    height: 30,
    gravity: 0.5,
    lift: -10,
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
const pipeWidth = 60;
const pipeGap = 150;
const pipeSpeed = 5;

let score = 0;

function drawBird() {
    context.drawImage(bird.image, bird.x, bird.y, bird.width, bird.height);
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

    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width / 2) {
        const pipeHeight = Math.floor(Math.random() * (canvas.height - pipeGap));
        const pipeImage = pipeImages[Math.floor(Math.random() * pipeImages.length)];
        pipes.push({ x: canvas.width, height: pipeHeight, image: pipeImage });
        score += 0.01; // Increase score by 0.01 billion each time a new pipe is added
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
    drawBird();
    drawPipes();
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
        bird.velocity = bird.lift;
    }
});

resetGame();
gameLoop();
