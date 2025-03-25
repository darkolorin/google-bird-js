// Initialize Telegram Mini App
const tgApp = window.Telegram?.WebApp;
// Check if running in Telegram
const isTelegram = !!tgApp;

if (tgApp) {
    tgApp.expand();
    tgApp.ready();
    console.log("Telegram Mini App initialized");
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#64b5f6', // Fallback background color
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
    // No special plugins needed for PNG images
    pixelArt: true,
    // Prevent anti-aliasing for better pixel art
    render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true
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
let assetsReady = false;
let tapToStartText;
let gameOverText;
let restartButton;
let ground;
let clouds;
let backgroundSpeed = 0.5;
let debugText;

// Asset loading
function preload() {
    // Create simple geometric shapes directly
    this.load.on('complete', () => {
        console.log("Preload complete, creating assets...");
        assetsReady = true;
    });
    
    // Draw simple shapes for each game element directly in create function
    // No need to load external assets which can fail
    
    // Load sounds with error handling
    this.load.audio('flap', 'assets/sounds/flap.wav').on('loaderror', () => {
        console.warn("Failed to load flap sound, continuing without it");
    });
    
    this.load.audio('score', 'assets/sounds/score.wav').on('loaderror', () => {
        console.warn("Failed to load score sound, continuing without it");
    });
    
    this.load.audio('hit', 'assets/sounds/hit.wav').on('loaderror', () => {
        console.warn("Failed to load hit sound, continuing without it");
    });
    
    // Display loading text
    this.loadingText = this.add.text(
        config.width / 2, 
        config.height / 2, 
        'Loading...', 
        { fontSize: '24px', fill: '#fff' }
    ).setOrigin(0.5);
}

// Game initialization
function create() {
    console.log("Creating game scene...");
    
    // Remove loading text if it exists
    if (this.loadingText) {
        this.loadingText.destroy();
    }
    
    // Create background - simple blue rectangle
    this.bg = this.add.rectangle(0, 0, config.width, config.height, 0x64b5f6).setOrigin(0, 0);
    
    // Add clouds - simple white circles
    clouds = this.physics.add.group();
    for (let i = 0; i < 4; i++) {
        const cloud = clouds.create(
            Phaser.Math.Between(0, config.width),
            Phaser.Math.Between(50, 200),
            null
        );
        cloud.body = this.physics.add.existing(cloud).body;
        cloud.body.allowGravity = false;
        cloud.speedX = Phaser.Math.FloatBetween(0.2, 0.8);
        cloud.width = 80;
        cloud.setVisible(false); // Hide placeholder sprite
        
        // Draw circle directly 
        const cloudGraphic = this.add.circle(cloud.x, cloud.y, 30, 0xffffff, 0.8);
        cloud.cloudGraphic = cloudGraphic;
    }
    
    // Add ground - brown rectangle
    ground = this.physics.add.staticGroup();
    const groundObj = ground.create(config.width / 2, config.height - 20, null);
    groundObj.setVisible(false); // Hide placeholder sprite
    groundObj.refreshBody();
    
    // Draw rectangle directly
    this.add.rectangle(config.width / 2, config.height - 20, config.width, 40, 0x8d6e63);
    
    // Add bird - yellow circle with orange triangle for beak
    bird = this.physics.add.sprite(80, config.height / 2, null);
    bird.setVisible(false); // Hide placeholder sprite
    
    // Draw bird graphics directly
    const birdContainer = this.add.container(80, config.height / 2);
    const birdBody = this.add.circle(0, 0, 15, 0xffeb3b);
    const birdBeak = this.add.triangle(15, 0, 0, -5, 15, 0, 0, 5, 0xff9800);
    birdContainer.add([birdBody, birdBeak]);
    bird.container = birdContainer;
    
    bird.setCollideWorldBounds(true);
    bird.body.allowGravity = false;
    bird.depth = 10;
    
    // Add pipes group
    pipes = this.physics.add.group();
    
    // Set up collisions
    this.physics.add.collider(bird, ground, hitObstacle, null, this);
    this.physics.add.collider(bird, pipes, hitObstacle, null, this);
    
    // Add sounds with fallbacks
    try {
        this.flapSound = this.sound.add('flap');
        this.scoreSound = this.sound.add('score');
        this.hitSound = this.sound.add('hit');
    } catch (e) {
        console.warn("Could not load sounds, continuing without them");
        // Create dummy sound objects that have a play method that does nothing
        this.flapSound = { play: () => {} };
        this.scoreSound = { play: () => {} };
        this.hitSound = { play: () => {} };
    }
    
    // Add score text
    scoreText = this.add.text(config.width / 2, 50, '0', 
        { fontSize: '32px', fill: '#fff', stroke: '#000', strokeThickness: 4 });
    scoreText.setOrigin(0.5);
    scoreText.depth = 20;
    
    // Add tap to start text
    tapToStartText = this.add.text(config.width / 2, config.height / 2, 'Tap to Start', 
        { fontSize: '24px', fill: '#fff', stroke: '#000', strokeThickness: 4 });
    tapToStartText.setOrigin(0.5);
    tapToStartText.depth = 20;
    
    // Add game over text (hidden initially)
    gameOverText = this.add.text(config.width / 2, config.height / 2 - 50, 'Game Over', 
        { fontSize: '40px', fill: '#fff', stroke: '#000', strokeThickness: 4 });
    gameOverText.setOrigin(0.5);
    gameOverText.visible = false;
    gameOverText.depth = 20;
    
    // Add restart button (green circle with white triangle)
    // Create directly rather than using images
    restartButton = this.add.container(config.width / 2, config.height / 2 + 50);
    const buttonCircle = this.add.circle(0, 0, 25, 0x4caf50);
    const buttonSymbol = this.add.triangle(0, 0, -10, -15, 15, 0, -10, 15, 0xffffff);
    restartButton.add([buttonCircle, buttonSymbol]);
    
    // Make it interactive
    buttonCircle.setInteractive(
        new Phaser.Geom.Circle(0, 0, 25),
        Phaser.Geom.Circle.Contains
    );
    buttonCircle.on('pointerdown', restartGame, this);
    
    restartButton.visible = false;
    restartButton.depth = 20;
    
    // Set up input for the entire game
    this.input.on('pointerdown', flapBird, this);
    
    console.log("Game scene created successfully!");
}

// Game loop
function update(time) {
    // Handle game over state
    if (gameOver) return;
    
    // Move fixed background color - no need to move 
    
    // Update clouds
    if (clouds && clouds.getChildren) {
        clouds.getChildren().forEach(cloud => {
            // Move the cloud sprite (physics body)
            cloud.x -= cloud.speedX;
            
            // Move the cloud graphic to match
            if (cloud.cloudGraphic) {
                cloud.cloudGraphic.x = cloud.x;
            }
            
            // Reset cloud position when it goes off screen
            if (cloud.x < -cloud.width) {
                cloud.x = config.width + cloud.width;
                cloud.y = Phaser.Math.Between(50, 200);
                
                // Update graphic position too
                if (cloud.cloudGraphic) {
                    cloud.cloudGraphic.x = cloud.x;
                    cloud.cloudGraphic.y = cloud.y;
                }
            }
        });
    }
    
    // Don't proceed if game hasn't started
    if (!gameStarted) return;
    
    // Generate pipes
    if (time > nextPipes) {
        createPipes(this);
        nextPipes = time + 1500;
    }
    
    // Update pipes and check for scoring
    if (pipes && pipes.getChildren) {
        pipes.getChildren().forEach(pipe => {
            // Update pipe graphic position to match the physics body
            if (pipe.pipeGraphic) {
                pipe.pipeGraphic.x = pipe.x;
            }
            
            // Score when passing the middle of pipes
            if (pipe.x + 30 < bird.x && !pipe.scored && pipe.y < config.height / 2) {
                pipe.scored = true;
                increaseScore(this);
            }
            
            // Remove pipes and their graphics when off screen
            if (pipe.x < -60) {
                if (pipe.pipeGraphic) {
                    pipe.pipeGraphic.destroy();
                }
                pipe.destroy();
            }
        });
    }
    
    // Update bird rotation and container position
    if (bird && bird.body) {
        // Move the bird container to match the physics body
        if (bird.container) {
            bird.container.x = bird.x;
            bird.container.y = bird.y;
            
            // Rotate the bird container based on velocity
            if (bird.body.velocity.y > 0) {
                bird.container.rotation = Math.min(bird.container.rotation + 0.05, 0.5);
            } else {
                bird.container.rotation = Math.max(bird.container.rotation - 0.05, -0.5);
            }
        }
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
    const pipeWidth = 60;
    const pipeHeight = 320;
    
    // Create top pipe
    const topPipe = pipes.create(config.width + 10, pipeY - pipeHeight/2, null);
    topPipe.setVisible(false); // Hide placeholder sprite
    topPipe.body.allowGravity = false;
    topPipe.scored = false;
    
    // Draw pipe directly
    const topPipeGraphic = scene.add.rectangle(config.width + 10, pipeY - pipeHeight/2, pipeWidth, pipeHeight, 0x4caf50);
    topPipe.pipeGraphic = topPipeGraphic;
    topPipe.pipeGraphic.depth = 5;
    
    // Create bottom pipe
    const bottomPipe = pipes.create(config.width + 10, pipeY + gap + pipeHeight/2, null);
    bottomPipe.setVisible(false); // Hide placeholder sprite
    bottomPipe.body.allowGravity = false;
    bottomPipe.scored = false;
    
    // Draw pipe directly
    const bottomPipeGraphic = scene.add.rectangle(config.width + 10, pipeY + gap + pipeHeight/2, pipeWidth, pipeHeight, 0x4caf50);
    bottomPipe.pipeGraphic = bottomPipeGraphic;
    bottomPipe.pipeGraphic.depth = 5;
    
    // Set hitbox sizes
    topPipe.body.setSize(pipeWidth, pipeHeight);
    bottomPipe.body.setSize(pipeWidth, pipeHeight);
    
    // Move pipes to the left
    topPipe.body.velocity.x = -200;
    bottomPipe.body.velocity.x = -200;
}

// Create cloud - no longer needed as we create clouds directly in the create function
function createCloud(scene, x, y) {
    const cloud = clouds.create(x, y, null);
    cloud.setVisible(false); // Hide placeholder sprite
    cloud.body.allowGravity = false;
    cloud.speedX = Phaser.Math.FloatBetween(0.2, 0.8);
    cloud.width = 80;
    
    // Draw circle directly
    const cloudGraphic = scene.add.circle(x, y, 30, 0xffffff, 0.8);
    cloud.cloudGraphic = cloudGraphic;
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
    if (bird && bird.body) {
        bird.body.velocity.y = 0;
        bird.body.allowGravity = false;
    }
    
    // Stop all pipes
    if (pipes && pipes.getChildren) {
        pipes.getChildren().forEach(pipe => {
            if (pipe.body) {
                pipe.body.velocity.x = 0;
            }
        });
    }
    
    // Display game over
    if (gameOverText) gameOverText.visible = true;
    if (restartButton) restartButton.visible = true;
    
    // Share score with Telegram Mini App if running in Telegram
    if (isTelegram && tgApp) {
        try {
            const data = { score: score };
            tgApp.sendData(JSON.stringify(data));
            console.log("Score sent to Telegram:", score);
        } catch (error) {
            console.error("Error sending score to Telegram:", error);
        }
    }
}

// Restart game
function restartGame() {
    try {
        this.scene.restart();
        score = 0;
        gameOver = false;
        gameStarted = false;
    } catch (error) {
        console.error("Error restarting game:", error);
        // Reload the page as a fallback
        window.location.reload();
    }
}