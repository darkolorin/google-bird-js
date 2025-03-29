// Initialize Telegram Mini App
const tgApp = window.Telegram?.WebApp;
if (tgApp) {
    tgApp.expand();
    tgApp.ready();
}

// Simple Flappy Bird game - basic version that works
const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#71c5cf',
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
    }
};

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

// Initialize game
const game = new Phaser.Game(config);

// Asset loading - not needed as we draw everything
function preload() {
    console.log("Preload started");
}

// Set up game objects
function create() {
    console.log("Creating game");
    
    // Add background color - already set in config
    
    // Add bird - simple yellow circle with orange beak
    bird = this.physics.add.sprite(80, config.height / 2);
    bird.setCircle(15); // circular hitbox
    bird.setVisible(false); // hide actual sprite
    
    // Create visible bird graphics
    this.birdGraphics = this.add.graphics();
    this.birdGraphics.fillStyle(0xFFD000, 1); // Yellow
    this.birdGraphics.fillCircle(0, 0, 15);
    this.birdGraphics.fillStyle(0xFF9900, 1); // Orange
    this.birdGraphics.fillTriangle(15, 0, 30, -8, 30, 8);
    this.birdGraphics.x = bird.x;
    this.birdGraphics.y = bird.y;
    
    // Add ground - green rectangle
    const groundHeight = 80;
    ground = this.physics.add.staticGroup();
    const groundObj = ground.create(config.width / 2, config.height - groundHeight / 2);
    groundObj.setVisible(false);
    groundObj.displayWidth = config.width;
    groundObj.displayHeight = groundHeight;
    groundObj.refreshBody();
    
    // Draw visible ground
    this.add.rectangle(config.width / 2, config.height - groundHeight / 2, 
                       config.width, groundHeight, 0x33aa33);
    
    // Pipes group
    pipes = this.physics.add.group();
    
    // Set up collisions
    this.physics.add.collider(bird, ground, hitObstacle, null, this);
    this.physics.add.collider(bird, pipes, hitObstacle, null, this);
    
    // Set up text elements
    scoreText = this.add.text(config.width / 2, 50, '0', 
                             { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    
    tapToStartText = this.add.text(config.width / 2, config.height / 2, 'Tap to Start', 
                                  { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
    
    gameOverText = this.add.text(config.width / 2, config.height / 2 - 50, 'Game Over', 
                                { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    gameOverText.visible = false;
    
    // Restart button (green circle with white triangle)
    restartButton = this.add.circle(config.width / 2, config.height / 2 + 50, 30, 0x00aa00);
    restartButton.setInteractive();
    restartButton.on('pointerdown', restartGame, this);
    restartButton.visible = false;
    
    // Add play symbol to restart button
    const playSymbol = this.add.triangle(
        config.width / 2 + 5, config.height / 2 + 50,
        -10, -15, -10, 15, 15, 0,
        0xffffff
    );
    playSymbol.visible = false;
    restartButton.playSymbol = playSymbol;
    
    // Set up input
    this.input.on('pointerdown', flapBird, this);
    
    console.log("Game created!");
}

// Game loop
function update(time) {
    // Update bird graphics position
    this.birdGraphics.x = bird.x;
    this.birdGraphics.y = bird.y;
    
    // Rotate bird based on velocity when game is active
    if (gameStarted && !gameOver && bird.body.velocity.y !== 0) {
        const angle = Phaser.Math.Clamp(bird.body.velocity.y / 600, -Math.PI/6, Math.PI/4);
        this.birdGraphics.rotation = angle;
    }
    
    if (gameOver) return;
    if (!gameStarted) return;
    
    // Generate pipes
    if (time > nextPipes) {
        createPipes(this);
        nextPipes = time + 1500;
    }
    
    // Check for scoring and clean up pipes
    pipes.getChildren().forEach(pipe => {
        // Update pipe graphics position if it exists
        if (pipe.graphics) {
            pipe.graphics.x = pipe.x;
            pipe.graphics.y = pipe.y;
        }
        
        // Score when passing pipe
        if (pipe.x + 30 < bird.x && !pipe.scored && pipe.y < config.height / 2) {
            pipe.scored = true;
            score++;
            scoreText.setText(score.toString());
        }
        
        // Remove pipes when off screen
        if (pipe.x < -50) {
            if (pipe.graphics) pipe.graphics.destroy();
            pipe.destroy();
        }
    });
}

// Bird flap action
function flapBird() {
    if (gameOver) return;
    
    if (!gameStarted) {
        startGame();
        return;
    }
    
    bird.body.velocity.y = -350;
}

// Start game
function startGame() {
    gameStarted = true;
    bird.body.allowGravity = true;
    tapToStartText.visible = false;
    
    // Initial jump
    bird.body.velocity.y = -350;
}

// Create pipes
function createPipes(scene) {
    // Calculate random position for the gap
    const pipeY = Phaser.Math.Between(150, config.height - gap - 150);
    
    // Create top pipe
    const topPipe = pipes.create(config.width + 50, pipeY - 150);
    topPipe.body.allowGravity = false;
    topPipe.scored = false;
    topPipe.setSize(50, 300);
    topPipe.setVisible(false);
    topPipe.body.velocity.x = -200;
    
    // Create visible pipe
    const topPipeGraphics = scene.add.graphics();
    topPipeGraphics.fillStyle(0x00aa00, 1); // Green
    topPipeGraphics.fillRect(-25, -150, 50, 300);
    topPipeGraphics.x = topPipe.x;
    topPipeGraphics.y = topPipe.y;
    topPipe.graphics = topPipeGraphics;
    
    // Create bottom pipe
    const bottomPipe = pipes.create(config.width + 50, pipeY + gap + 150);
    bottomPipe.body.allowGravity = false;
    bottomPipe.scored = false;
    bottomPipe.setSize(50, 300);
    bottomPipe.setVisible(false);
    bottomPipe.body.velocity.x = -200;
    
    // Create visible pipe
    const bottomPipeGraphics = scene.add.graphics();
    bottomPipeGraphics.fillStyle(0x00aa00, 1); // Green
    bottomPipeGraphics.fillRect(-25, -150, 50, 300);
    bottomPipeGraphics.x = bottomPipe.x;
    bottomPipeGraphics.y = bottomPipe.y;
    bottomPipe.graphics = bottomPipeGraphics;
}

// Handle collision
function hitObstacle() {
    if (gameOver) return;
    
    gameOver = true;
    
    // Stop bird and pipes
    bird.body.velocity.y = 0;
    bird.body.allowGravity = false;
    
    pipes.getChildren().forEach(pipe => {
        pipe.body.velocity.x = 0;
    });
    
    // Show game over text and restart button
    gameOverText.visible = true;
    restartButton.visible = true;
    restartButton.playSymbol.visible = true;
    
    // Send score to Telegram if running in Telegram Mini App
    if (tgApp) {
        try {
            const data = { score: score };
            tgApp.sendData(JSON.stringify(data));
            console.log("Score sent to Telegram:", score);
        } catch (error) {
            console.error("Error sending score to Telegram:", error);
        }
    }
}

// Restart the game
function restartGame() {
    location.reload();
}