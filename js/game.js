// Initialize Telegram
const tgApp = window.Telegram?.WebApp;
if (tgApp) {
    tgApp.expand();
    tgApp.ready();
}

// Simple fullscreen game
const gameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#71c5cf',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Global variables
let bird;
let pipes;
let ground;
let score = 0;
let scoreText;
let gameStarted = false;
let gameOver = false;
let tapText;
let gameOverText;
let restartBtn;
let pipeTimer;

// Create game instance
let game = new Phaser.Game(gameConfig);

function preload() {
    // No preloading needed
}

function create() {
    // Get game dimensions
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    // Create sky
    this.add.rectangle(0, 0, gameWidth, gameHeight, 0x71c5cf).setOrigin(0, 0);
    
    // Add ground
    const groundHeight = gameHeight * 0.1;
    ground = this.physics.add.staticGroup();
    let groundObj = ground.create(gameWidth/2, gameHeight - groundHeight/2);
    groundObj.setVisible(false);
    groundObj.displayWidth = gameWidth * 1.2;
    groundObj.displayHeight = groundHeight;
    groundObj.refreshBody();
    
    // Draw visible ground 
    this.add.rectangle(gameWidth/2, gameHeight - groundHeight/2, gameWidth, groundHeight, 0xDED895);
    
    // Add bird
    bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight * 0.5);
    bird.setSize(40, 40);
    bird.setVisible(false);
    bird.setCollideWorldBounds(true);
    bird.body.allowGravity = false;
    
    // Create bird appearance
    this.birdGroup = this.add.group();
    
    // Bird body
    const birdCircle = this.add.circle(bird.x, bird.y, 20, 0xFFEB3B);
    this.birdGroup.add(birdCircle);
    
    // Bird eye
    const birdEye = this.add.circle(bird.x + 10, bird.y - 5, 6, 0xFFFFFF);
    const birdPupil = this.add.circle(bird.x + 12, bird.y - 5, 3, 0x000000);
    this.birdGroup.add(birdEye);
    this.birdGroup.add(birdPupil);
    
    // Bird beak
    const beakShape = new Phaser.Geom.Triangle(
        bird.x + 20, bird.y,
        bird.x + 35, bird.y - 5,
        bird.x + 35, bird.y + 5
    );
    const birdBeak = this.add.graphics();
    birdBeak.fillStyle(0xFF9800, 1);
    birdBeak.fillTriangleShape(beakShape);
    this.birdGroup.add(birdBeak);
    
    // Create pipes group
    pipes = this.physics.add.group();
    
    // Text elements
    const fontConfig = { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff' };
    
    // Score text
    scoreText = this.add.text(gameWidth/2, gameHeight * 0.1, '0', fontConfig).setOrigin(0.5);
    
    // Tap to start text
    tapText = this.add.text(gameWidth/2, gameHeight/2, 'Tap to Start', fontConfig).setOrigin(0.5);
    
    // Game over text (hidden initially)
    gameOverText = this.add.text(gameWidth/2, gameHeight * 0.4, 'Game Over', fontConfig).setOrigin(0.5);
    gameOverText.visible = false;
    
    // Create restart button (hidden initially)
    const buttonSize = Math.min(gameWidth, gameHeight) * 0.15;
    restartBtn = this.add.circle(gameWidth/2, gameHeight * 0.6, buttonSize/2, 0x4CAF50);
    restartBtn.setInteractive();
    restartBtn.visible = false;
    
    // Add triangle to restart button
    const triangleSize = buttonSize * 0.4;
    const triangle = this.add.triangle(
        gameWidth/2, gameHeight * 0.6,
        -triangleSize/2, -triangleSize/2,
        triangleSize, 0,
        -triangleSize/2, triangleSize/2,
        0xFFFFFF
    );
    triangle.visible = false;
    restartBtn.triangle = triangle;
    
    // Set up collisions
    this.physics.add.collider(bird, ground, hitObstacle, null, this);
    this.physics.add.collider(bird, pipes, hitObstacle, null, this);
    
    // Input
    this.input.on('pointerdown', flapBird, this);
    restartBtn.on('pointerdown', restartGame, this);
}

function update() {
    // Update bird graphics to match physics body
    const birdParts = this.birdGroup.getChildren();
    if (birdParts.length >= 4) {
        // Body
        birdParts[0].x = bird.x;
        birdParts[0].y = bird.y;
        
        // Eye white
        birdParts[1].x = bird.x + 10;
        birdParts[1].y = bird.y - 5;
        
        // Eye pupil
        birdParts[2].x = bird.x + 12;
        birdParts[2].y = bird.y - 5;
        
        // Beak - need to redraw it
        birdParts[3].clear();
        birdParts[3].fillStyle(0xFF9800, 1);
        
        // Apply rotation to the beak based on velocity
        let rotation = 0;
        if (gameStarted && !gameOver) {
            rotation = Phaser.Math.Clamp(bird.body.velocity.y / 20, -0.5, 0.5);
        }
        
        const beakShape = new Phaser.Geom.Triangle(
            bird.x + 20, bird.y,
            bird.x + 35, bird.y - 5 + rotation * 10,
            bird.x + 35, bird.y + 5 + rotation * 10
        );
        birdParts[3].fillTriangleShape(beakShape);
    }
    
    if (gameOver || !gameStarted) return;
    
    // Move and remove pipes that are off screen
    pipes.getChildren().forEach(pipe => {
        // Update the visible graphics to match physics objects
        if (pipe.graphics) {
            pipe.graphics.x = pipe.x;
            pipe.graphics.y = pipe.y;
        }
        
        // Score when middle of pipes passed
        if (!pipe.scored && pipe.x < bird.x && pipe.y < bird.y) {
            pipe.scored = true;
            score++;
            scoreText.setText(score.toString());
        }
        
        // Remove pipes that are off screen
        if (pipe.x < -100) {
            if (pipe.graphics) pipe.graphics.destroy();
            pipe.destroy();
        }
    });
}

function flapBird() {
    if (gameOver) return;
    
    if (!gameStarted) {
        startGame();
        return;
    }
    
    // Flap!
    bird.body.velocity.y = -400;
}

function startGame() {
    gameStarted = true;
    bird.body.allowGravity = true;
    tapText.visible = false;
    
    // Initial jump
    bird.body.velocity.y = -400;
    
    // Set timer for pipe generation
    const pipeInterval = 1500; // ms
    pipeTimer = this.time.addEvent({
        delay: pipeInterval,
        callback: createPipes,
        callbackScope: this,
        loop: true
    });
}

function createPipes() {
    if (gameOver) return;
    
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    // Pipe dimensions as percentages of screen
    const pipeWidth = gameWidth * 0.15;
    const gap = gameHeight * 0.25;
    
    // Calculate random gap position
    const minY = gameHeight * 0.2;
    const maxY = gameHeight * 0.8 - gap;
    const gapY = Phaser.Math.Between(minY, maxY);
    
    // Top pipe
    const pipeTopHeight = gapY;
    const topPipe = pipes.create(gameWidth + pipeWidth/2, pipeTopHeight/2);
    topPipe.setVisible(false);
    topPipe.body.allowGravity = false;
    topPipe.scored = false;
    topPipe.body.setSize(pipeWidth, pipeTopHeight);
    topPipe.body.velocity.x = -200;
    
    // Draw top pipe
    const topPipeGraphics = this.add.graphics();
    topPipeGraphics.fillStyle(0x4CAF50, 1);
    topPipeGraphics.fillRect(-pipeWidth/2, -pipeTopHeight/2, pipeWidth, pipeTopHeight);
    
    // Add rim to top pipe
    topPipeGraphics.fillStyle(0x388E3C, 1);
    topPipeGraphics.fillRect(-pipeWidth/2 - 5, pipeTopHeight/2 - 20, pipeWidth + 10, 20);
    
    topPipeGraphics.x = gameWidth + pipeWidth/2;
    topPipeGraphics.y = pipeTopHeight/2;
    topPipe.graphics = topPipeGraphics;
    
    // Bottom pipe
    const pipeBottomHeight = gameHeight - gapY - gap - gameHeight * 0.1; // Subtract ground height
    const bottomPipe = pipes.create(gameWidth + pipeWidth/2, gapY + gap + pipeBottomHeight/2);
    bottomPipe.setVisible(false);
    bottomPipe.body.allowGravity = false;
    bottomPipe.body.setSize(pipeWidth, pipeBottomHeight);
    bottomPipe.body.velocity.x = -200;
    
    // Draw bottom pipe
    const bottomPipeGraphics = this.add.graphics();
    bottomPipeGraphics.fillStyle(0x4CAF50, 1);
    bottomPipeGraphics.fillRect(-pipeWidth/2, -pipeBottomHeight/2, pipeWidth, pipeBottomHeight);
    
    // Add rim to bottom pipe
    bottomPipeGraphics.fillStyle(0x388E3C, 1);
    bottomPipeGraphics.fillRect(-pipeWidth/2 - 5, -pipeBottomHeight/2, pipeWidth + 10, 20);
    
    bottomPipeGraphics.x = gameWidth + pipeWidth/2;
    bottomPipeGraphics.y = gapY + gap + pipeBottomHeight/2;
    bottomPipe.graphics = bottomPipeGraphics;
}

function hitObstacle() {
    if (gameOver) return;
    
    gameOver = true;
    
    // Stop bird and pipes
    bird.body.velocity.y = 0;
    bird.body.allowGravity = false;
    
    if (pipeTimer) pipeTimer.remove();
    
    pipes.getChildren().forEach(pipe => {
        pipe.body.velocity.x = 0;
    });
    
    // Show game over text and restart button
    gameOverText.visible = true;
    restartBtn.visible = true;
    restartBtn.triangle.visible = true;
    
    // Send score to Telegram if running in Telegram
    if (tgApp) {
        try {
            const data = { score: score };
            tgApp.sendData(JSON.stringify(data));
        } catch (e) {
            console.error("Error sending score to Telegram:", e);
        }
    }
}

function restartGame() {
    window.location.reload();
}