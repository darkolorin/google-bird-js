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
    
    // Add background with sky
    this.bg = this.add.rectangle(0, 0, config.width, config.height, 0x71c5cf).setOrigin(0, 0);
    
    // Add some clouds for decoration
    for (let i = 0; i < 3; i++) {
        const x = Phaser.Math.Between(50, config.width - 50);
        const y = Phaser.Math.Between(50, 200);
        const cloud = this.add.ellipse(x, y, 80, 40, 0xffffff, 0.8);
    }
    
    // Add ground
    ground = this.physics.add.staticGroup();
    const groundHeight = 80;
    const groundY = config.height - groundHeight/2;
    const groundObj = ground.create(config.width/2, groundY, null);
    groundObj.setVisible(false);
    groundObj.setDisplaySize(config.width, groundHeight);
    groundObj.refreshBody();
    
    // Draw ground with better visuals
    const groundGraphics = this.add.graphics();
    // Main ground
    groundGraphics.fillStyle(0xDED895);
    groundGraphics.fillRect(0, groundY - groundHeight/2, config.width, groundHeight);
    // Dirt under grass
    groundGraphics.fillStyle(0xA97D4B);
    groundGraphics.fillRect(0, groundY, config.width, groundHeight/2);
    
    // Add bird with better visuals (simple but recognizable)
    bird = this.physics.add.sprite(80, config.height/2);
    bird.body.setSize(30, 30);
    
    // Create bird shape
    const birdGroup = this.add.group();
    
    // Bird body (circle)
    const birdBody = this.add.circle(bird.x, bird.y, 15, 0xF1C40F);
    birdGroup.add(birdBody);
    
    // Bird eye (white circle with black pupil)
    const birdEye = this.add.circle(bird.x + 5, bird.y - 5, 5, 0xFFFFFF);
    const birdPupil = this.add.circle(bird.x + 7, bird.y - 5, 2, 0x000000);
    birdGroup.add(birdEye);
    birdGroup.add(birdPupil);
    
    // Bird beak (orange triangle)
    const beakShape = this.add.triangle(
        bird.x + 15, bird.y, 
        0, -5,  // Point 1
        15, 0,  // Point 2
        0, 5,   // Point 3
        0xF39C12
    );
    birdGroup.add(beakShape);
    
    // Store bird graphics in bird object for updating
    bird.bodyGraphic = birdBody;
    bird.eyeGraphic = birdEye;
    bird.pupilGraphic = birdPupil;
    bird.beakGraphic = beakShape;
    
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
    
    // We no longer need this since we create the bird graphics separately
    
    console.log("Game created successfully");
}

// Game loop
function update(time) {
    // Update all bird graphics positions
    if (bird.bodyGraphic) {
        bird.bodyGraphic.x = bird.x;
        bird.bodyGraphic.y = bird.y;
    }
    
    if (bird.eyeGraphic) {
        bird.eyeGraphic.x = bird.x + 5;
        bird.eyeGraphic.y = bird.y - 5;
    }
    
    if (bird.pupilGraphic) {
        bird.pupilGraphic.x = bird.x + 7;
        bird.pupilGraphic.y = bird.y - 5;
    }
    
    if (bird.beakGraphic) {
        bird.beakGraphic.x = bird.x + 15;
        bird.beakGraphic.y = bird.y;
    }
    
    // Rotate bird slightly based on velocity
    if (gameStarted && !gameOver && bird.body.velocity.y !== 0) {
        const angle = Phaser.Math.Clamp(bird.body.velocity.y / 20, -15, 15);
        if (bird.beakGraphic) {
            bird.beakGraphic.angle = angle;
        }
    }
    
    if (gameOver) return;
    
    if (!gameStarted) return;
    
    // Generate pipes
    if (time > nextPipes) {
        createPipes(this);
        nextPipes = time + 1500;
    }
    
    // Check for scoring and update pipe graphics
    if (pipes && pipes.getChildren) {
        pipes.getChildren().forEach(pipe => {
            // Update all pipe graphics positions
            if (pipe.mainGraphic) {
                pipe.mainGraphic.x = pipe.x;
                pipe.mainGraphic.y = pipe.y;
            }
            
            if (pipe.rimGraphic) {
                pipe.rimGraphic.x = pipe.x;
                if (pipe.y < config.height / 2) {
                    // Top pipe
                    pipe.rimGraphic.y = pipe.y + pipe.height/2 - 10;
                } else {
                    // Bottom pipe
                    pipe.rimGraphic.y = pipe.y - pipe.height/2 + 10;
                }
            }
            
            if (pipe.highlightGraphic) {
                pipe.highlightGraphic.x = pipe.x - pipe.width/3;
                pipe.highlightGraphic.y = pipe.y;
            }
            
            // Score when passing the middle of pipes
            if (pipe.x + 30 < bird.x && !pipe.scored && pipe.y < config.height / 2) {
                pipe.scored = true;
                increaseScore(this);
            }
            
            // Remove pipes when off screen
            if (pipe.x < -60) {
                // Clean up all graphics
                if (pipe.mainGraphic) pipe.mainGraphic.destroy();
                if (pipe.rimGraphic) pipe.rimGraphic.destroy();
                if (pipe.highlightGraphic) pipe.highlightGraphic.destroy();
                pipe.destroy();
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
    
    // Draw pipe with better visuals
    // Create a group for top pipe graphics
    const topPipeGroup = scene.add.group();
    
    // Main pipe body
    const topPipeGraphic = scene.add.rectangle(topPipe.x, topPipe.y, pipeWidth, pipeHeight, 0x2ECC71);
    topPipeGroup.add(topPipeGraphic);
    
    // Pipe rim at bottom (darker green)
    const topPipeRim = scene.add.rectangle(
        topPipe.x, 
        topPipe.y + pipeHeight/2 - 10, 
        pipeWidth + 10, 
        20, 
        0x27AE60
    );
    topPipeGroup.add(topPipeRim);
    
    // Pipe highlight (lighter green stripe)
    const topPipeHighlight = scene.add.rectangle(
        topPipe.x - pipeWidth/3, 
        topPipe.y, 
        pipeWidth/6, 
        pipeHeight - 20, 
        0x58D68D
    );
    topPipeGroup.add(topPipeHighlight);
    
    // Store all graphics
    topPipe.pipeGraphic = topPipeGraphic;
    topPipe.mainGraphic = topPipeGraphic;
    topPipe.rimGraphic = topPipeRim;
    topPipe.highlightGraphic = topPipeHighlight;
    topPipe.width = pipeWidth;
    topPipe.height = pipeHeight;
    
    // Create bottom pipe
    const bottomPipe = pipes.create(config.width + pipeWidth/2, pipeY + pipeHeight/2 + gap/2);
    bottomPipe.body.allowGravity = false;
    bottomPipe.scored = false;
    
    // Draw bottom pipe with better visuals
    // Create a group for bottom pipe graphics
    const bottomPipeGroup = scene.add.group();
    
    // Main pipe body
    const bottomPipeGraphic = scene.add.rectangle(bottomPipe.x, bottomPipe.y, pipeWidth, pipeHeight, 0x2ECC71);
    bottomPipeGroup.add(bottomPipeGraphic);
    
    // Pipe rim at top (darker green)
    const bottomPipeRim = scene.add.rectangle(
        bottomPipe.x, 
        bottomPipe.y - pipeHeight/2 + 10, 
        pipeWidth + 10, 
        20, 
        0x27AE60
    );
    bottomPipeGroup.add(bottomPipeRim);
    
    // Pipe highlight (lighter green stripe)
    const bottomPipeHighlight = scene.add.rectangle(
        bottomPipe.x - pipeWidth/3, 
        bottomPipe.y, 
        pipeWidth/6, 
        pipeHeight - 20, 
        0x58D68D
    );
    bottomPipeGroup.add(bottomPipeHighlight);
    
    // Store all graphics
    bottomPipe.pipeGraphic = bottomPipeGraphic;
    bottomPipe.mainGraphic = bottomPipeGraphic;
    bottomPipe.rimGraphic = bottomPipeRim;
    bottomPipe.highlightGraphic = bottomPipeHighlight;
    bottomPipe.width = pipeWidth;
    bottomPipe.height = pipeHeight;
    
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