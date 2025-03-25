// Initialize Telegram Mini App
const tgApp = window.Telegram?.WebApp;
if (tgApp) {
    tgApp.expand();
    tgApp.ready();
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    plugins: {
        global: [{
            key: 'rexSVGPlugin',
            plugin: rexsvgplugin,
            start: true
        }]
    }
};

// Initialize Phaser game
const game = new Phaser.Game(config);

// Game variables
let bird;
let pipes;
let gap = 150;
let nextPipes = 0;
let score = 0;
let scoreText;
let gameOver = false;
let gameStarted = false;
let tapToStartText;
let gameOverText;
let restartButton;
let ground;
let clouds;
let backgroundSpeed = 0.5;

// Asset loading
function preload() {
    // Load images using SVG plugin
    this.load.rexSVG('background', 'assets/images/background.svg');
    this.load.rexSVG('bird', 'assets/images/bird.svg');
    this.load.rexSVG('pipe', 'assets/images/pipe.svg');
    this.load.rexSVG('ground', 'assets/images/ground.svg');
    this.load.rexSVG('cloud', 'assets/images/cloud.svg');
    this.load.rexSVG('restart', 'assets/images/restart.svg');
    
    // Load sounds
    this.load.audio('flap', 'assets/sounds/flap.wav');
    this.load.audio('score', 'assets/sounds/score.wav');
    this.load.audio('hit', 'assets/sounds/hit.wav');
}

// Game initialization
function create() {
    // Add background
    this.bg = this.add.tileSprite(0, 0, config.width, config.height, 'background').setOrigin(0, 0);
    
    // Add clouds
    clouds = this.physics.add.group();
    for (let i = 0; i < 4; i++) {
        createCloud(this, Phaser.Math.Between(0, config.width), Phaser.Math.Between(50, 200));
    }
    
    // Add ground
    ground = this.physics.add.staticGroup();
    ground.create(config.width / 2, config.height - 20, 'ground').setScale(2, 1).refreshBody();
    
    // Add bird
    bird = this.physics.add.sprite(80, config.height / 2, 'bird').setScale(0.6);
    bird.setCollideWorldBounds(true);
    bird.body.allowGravity = false;
    bird.depth = 10;
    
    // Add pipes group
    pipes = this.physics.add.group();
    
    // Set up collisions
    this.physics.add.collider(bird, ground, hitObstacle, null, this);
    this.physics.add.collider(bird, pipes, hitObstacle, null, this);
    
    // Add sounds
    this.flapSound = this.sound.add('flap');
    this.scoreSound = this.sound.add('score');
    this.hitSound = this.sound.add('hit');
    
    // Add score text
    scoreText = this.add.text(config.width / 2, 50, '0', { fontSize: '32px', fill: '#fff' });
    scoreText.setOrigin(0.5);
    scoreText.depth = 20;
    
    // Add tap to start text
    tapToStartText = this.add.text(config.width / 2, config.height / 2, 'Tap to Start', { fontSize: '24px', fill: '#fff' });
    tapToStartText.setOrigin(0.5);
    tapToStartText.depth = 20;
    
    // Add game over text (hidden initially)
    gameOverText = this.add.text(config.width / 2, config.height / 2 - 50, 'Game Over', { fontSize: '40px', fill: '#fff' });
    gameOverText.setOrigin(0.5);
    gameOverText.visible = false;
    gameOverText.depth = 20;
    
    // Add restart button (hidden initially)
    restartButton = this.add.image(config.width / 2, config.height / 2 + 50, 'restart').setScale(0.5);
    restartButton.setInteractive();
    restartButton.on('pointerdown', restartGame, this);
    restartButton.visible = false;
    restartButton.depth = 20;
    
    // Set up input
    this.input.on('pointerdown', flapBird, this);
}

// Game loop
function update(time) {
    if (gameOver) return;
    
    // Move background and ground
    this.bg.tilePositionX += backgroundSpeed;
    
    // Update clouds
    clouds.getChildren().forEach(cloud => {
        cloud.x -= cloud.speedX;
        if (cloud.x < -cloud.width) {
            cloud.x = config.width + cloud.width;
            cloud.y = Phaser.Math.Between(50, 200);
        }
    });
    
    if (!gameStarted) return;
    
    // Generate pipes
    if (time > nextPipes) {
        createPipes(this);
        nextPipes = time + 1500;
    }
    
    // Check for scoring
    pipes.getChildren().forEach(pipe => {
        // Score when passing the middle of pipes
        if (pipe.x + pipe.width < bird.x && !pipe.scored && pipe.texture.key === 'pipe' && pipe.y < config.height / 2) {
            pipe.scored = true;
            increaseScore(this);
        }
        
        // Remove pipes when off screen
        if (pipe.x < -pipe.width) {
            pipe.destroy();
        }
    });
    
    // Rotate bird based on velocity
    if (bird.body.velocity.y > 0) {
        bird.angle = Math.min(bird.angle + 2, 30);
    } else {
        bird.angle = Math.max(bird.angle - 2, -30);
    }
}

// Start the game
function startGame() {
    gameStarted = true;
    bird.body.allowGravity = true;
    tapToStartText.visible = false;
    
    // Initial flap
    bird.body.velocity.y = -350;
}

// Bird flap action
function flapBird() {
    if (gameOver) return;
    
    if (!gameStarted) {
        startGame();
    }
    
    bird.body.velocity.y = -350;
    this.flapSound.play();
}

// Create pipes
function createPipes(scene) {
    // Calculate random position for the gap
    const pipeY = Phaser.Math.Between(100, config.height - gap - 100 - 64);
    
    // Create top pipe
    const topPipe = pipes.create(config.width + 10, pipeY - 320, 'pipe');
    topPipe.body.allowGravity = false;
    topPipe.scored = false;
    
    // Create bottom pipe
    const bottomPipe = pipes.create(config.width + 10, pipeY + gap, 'pipe');
    bottomPipe.body.allowGravity = false;
    bottomPipe.scored = false;
    
    // Move pipes to the left
    topPipe.body.velocity.x = -200;
    bottomPipe.body.velocity.x = -200;
    
    // Flip top pipe
    topPipe.flipY = true;
}

// Create cloud
function createCloud(scene, x, y) {
    const cloud = clouds.create(x, y, 'cloud').setScale(Phaser.Math.FloatBetween(0.5, 1));
    cloud.body.allowGravity = false;
    cloud.speedX = Phaser.Math.FloatBetween(0.2, 0.8);
    cloud.width = cloud.displayWidth;
}

// Increase score
function increaseScore(scene) {
    score++;
    scoreText.setText(score.toString());
    scene.scoreSound.play();
}

// Hit obstacle
function hitObstacle() {
    if (gameOver) return;
    
    gameOver = true;
    this.hitSound.play();
    
    // Stop bird and pipes
    bird.body.velocity.y = 0;
    bird.body.allowGravity = false;
    pipes.getChildren().forEach(pipe => {
        pipe.body.velocity.x = 0;
    });
    
    // Display game over
    gameOverText.visible = true;
    restartButton.visible = true;
    
    // Share score with Telegram Mini App
    if (tgApp) {
        const data = { score: score };
        tgApp.sendData(JSON.stringify(data));
    }
}

// Restart game
function restartGame() {
    this.scene.restart();
    score = 0;
    gameOver = false;
    gameStarted = false;
}