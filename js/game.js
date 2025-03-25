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
    backgroundColor: '#71c5cf',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
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

// Asset loading
function preload() {
    // Create basic shapes
    this.load.on('complete', function() {
        console.log("Preload complete");
    });
}

// Game initialization
function create() {
    console.log("Creating game scene...");
    
    // Add background
    this.bg = this.add.rectangle(0, 0, config.width, config.height, 0x71c5cf).setOrigin(0, 0);
    
    // Add ground
    ground = this.physics.add.staticGroup();
    const groundHeight = 80;
    const groundY = config.height - groundHeight/2;
    const groundObj = ground.create(config.width/2, groundY, null);
    groundObj.setVisible(false);
    groundObj.setDisplaySize(config.width, groundHeight);
    groundObj.refreshBody();
    
    // Draw ground
    this.add.rectangle(config.width/2, groundY, config.width, groundHeight, 0xDED895);
    
    // Add bird
    bird = this.physics.add.sprite(80, config.height/2);
    bird.body.setSize(30, 30);
    this.add.circle(bird.x, bird.y, 15, 0xFFFF00);
    bird.setCollideWorldBounds(true);
    bird.body.allowGravity = false;
    
    // Add pipes group
    pipes = this.physics.add.group();
    
    // Set up collisions
    this.physics.add.collider(bird, ground, hitObstacle, null, this);
    this.physics.add.collider(bird, pipes, hitObstacle, null, this);
    
    // Add score text
    scoreText = this.add.text(config.width/2, 50, '0', { fontSize: '32px', fill: '#fff' });
    scoreText.setOrigin(0.5);
    
    // Add tap to start text
    tapToStartText = this.add.text(config.width/2, config.height/2, 'Tap to Start', { fontSize: '24px', fill: '#fff' });
    tapToStartText.setOrigin(0.5);
    
    // Add game over text (hidden initially)
    gameOverText = this.add.text(config.width/2, config.height/2 - 50, 'Game Over', { fontSize: '40px', fill: '#fff' });
    gameOverText.setOrigin(0.5);
    gameOverText.visible = false;
    
    // Add restart button (hidden initially)
    restartButton = this.add.circle(config.width/2, config.height/2 + 50, 30, 0x00FF00);
    restartButton.setInteractive();
    restartButton.on('pointerdown', restartGame, this);
    restartButton.visible = false;
    
    // Set up input
    this.input.on('pointerdown', flapBird, this);
    
    // Set up bird graphics (since we can't use the real bird)
    this.birdGraphics = this.add.graphics();
    this.birdGraphics.fillStyle(0xFFFF00);
    this.birdGraphics.fillCircle(0, 0, 15);
    
    console.log("Game created successfully");
}

// Game loop
function update(time) {
    // Update bird graphics position
    this.birdGraphics.x = bird.x;
    this.birdGraphics.y = bird.y;
    
    if (gameOver) return;
    
    if (!gameStarted) return;
    
    // Generate pipes
    if (time > nextPipes) {
        createPipes(this);
        nextPipes = time + 1500;
    }
    
    // Check for scoring
    if (pipes && pipes.getChildren) {
        pipes.getChildren().forEach(pipe => {
            // Score when passing the middle of pipes
            if (pipe.x + 30 < bird.x && !pipe.scored && pipe.y < config.height / 2) {
                pipe.scored = true;
                increaseScore(this);
            }
            
            // Remove pipes when off screen
            if (pipe.x < -60) {
                pipe.destroy();
                if (pipe.pipeGraphic) {
                    pipe.pipeGraphic.destroy();
                }
            }
        });
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
}

// Create pipes
function createPipes(scene) {
    // Calculate random position for the gap
    const pipeY = Phaser.Math.Between(150, config.height - gap - 150);
    const pipeWidth = 60;
    const pipeHeight = 300;
    
    // Create top pipe
    const topPipe = pipes.create(config.width + pipeWidth/2, pipeY - pipeHeight/2 - gap/2);
    topPipe.body.allowGravity = false;
    topPipe.scored = false;
    
    // Draw pipe
    const topPipeGraphic = scene.add.rectangle(topPipe.x, topPipe.y, pipeWidth, pipeHeight, 0x4CAF50);
    topPipe.pipeGraphic = topPipeGraphic;
    
    // Create bottom pipe
    const bottomPipe = pipes.create(config.width + pipeWidth/2, pipeY + pipeHeight/2 + gap/2);
    bottomPipe.body.allowGravity = false;
    bottomPipe.scored = false;
    
    // Draw pipe
    const bottomPipeGraphic = scene.add.rectangle(bottomPipe.x, bottomPipe.y, pipeWidth, pipeHeight, 0x4CAF50);
    bottomPipe.pipeGraphic = bottomPipeGraphic;
    
    // Set hitbox sizes
    topPipe.body.setSize(pipeWidth, pipeHeight);
    bottomPipe.body.setSize(pipeWidth, pipeHeight);
    
    // Move pipes to the left
    topPipe.body.velocity.x = -200;
    bottomPipe.body.velocity.x = -200;
}

// Increase score
function increaseScore(scene) {
    score++;
    scoreText.setText(score.toString());
}

// Hit obstacle
function hitObstacle() {
    if (gameOver) return;
    
    gameOver = true;
    
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
        try {
            const data = { score: score };
            tgApp.sendData(JSON.stringify(data));
        } catch (error) {
            console.error("Error sending score:", error);
        }
    }
}

// Restart game
function restartGame() {
    this.scene.restart();
    score = 0;
    gameOver = false;
    gameStarted = false;
}