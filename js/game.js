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
    // Display a loading message
    this.add.text(config.width / 2, config.height / 2, 'Loading...', 
        { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

    // Create placeholder graphics since PNG files are missing
    this.load.on('complete', function() {
        try {
            console.log("Creating game assets...");
            
            // Create background
            const bgGraphics = this.make.graphics();
            bgGraphics.fillGradientStyle(0x64b5f6, 0x64b5f6, 0xbbdefb, 0xbbdefb, 1);
            bgGraphics.fillRect(0, 0, config.width, config.height);
            bgGraphics.generateTexture('background', config.width, config.height);
            
            // Create bird
            const birdGraphics = this.make.graphics();
            birdGraphics.fillStyle(0xffeb3b, 1);
            birdGraphics.fillCircle(30, 25, 20);
            birdGraphics.fillStyle(0xff9800, 1);
            birdGraphics.fillTriangle(45, 20, 60, 20, 45, 30);
            birdGraphics.generateTexture('bird', 60, 45);
            
            // Create pipe
            const pipeGraphics = this.make.graphics();
            pipeGraphics.fillStyle(0x4caf50, 1);
            pipeGraphics.fillRect(0, 0, 80, 400);
            pipeGraphics.generateTexture('pipe', 80, 400);
            
            // Create ground
            const groundGraphics = this.make.graphics();
            groundGraphics.fillStyle(0x8d6e63, 1);
            groundGraphics.fillRect(0, 0, config.width, 40);
            groundGraphics.generateTexture('ground', config.width, 40);
            
            // Create cloud
            const cloudGraphics = this.make.graphics();
            cloudGraphics.fillStyle(0xffffff, 0.9);
            cloudGraphics.fillCircle(50, 30, 30);
            cloudGraphics.generateTexture('cloud', 120, 60);
            
            // Create restart button
            const restartGraphics = this.make.graphics();
            restartGraphics.fillStyle(0x4caf50, 1);
            restartGraphics.fillCircle(50, 50, 40);
            restartGraphics.fillStyle(0xffffff, 1);
            restartGraphics.fillTriangle(40, 35, 65, 50, 40, 65);
            restartGraphics.generateTexture('restart', 100, 100);
            
            assetsReady = true;
            console.log("Game assets created successfully!");
        } catch (error) {
            console.error("Error creating game assets:", error);
        }
    }, this);
    
    // Load sounds
    this.load.audio('flap', 'assets/sounds/flap.wav');
    this.load.audio('score', 'assets/sounds/score.wav');
    this.load.audio('hit', 'assets/sounds/hit.wav');
}

// Game initialization
function create() {
    try {
        console.log("Creating game scene...");
        
        // Add background
        this.bg = this.add.tileSprite(0, 0, config.width, config.height, 'background').setOrigin(0, 0);
        
        // Add clouds
        clouds = this.physics.add.group();
        for (let i = 0; i < 4; i++) {
            createCloud(this, Phaser.Math.Between(0, config.width), Phaser.Math.Between(50, 200));
        }
        
        // Add ground
        ground = this.physics.add.staticGroup();
        ground.create(config.width / 2, config.height - 20, 'ground').refreshBody();
        
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
        
        // Add debug text (hidden in production)
        debugText = this.add.text(10, 10, '', { fontSize: '16px', fill: '#fff' });
        debugText.depth = 30;
        debugText.setText(`Assets loaded: ${assetsReady}`);
        
        // Set up input
        this.input.on('pointerdown', flapBird, this);
        
        console.log("Game scene created successfully!");
    } catch (error) {
        console.error("Error creating game scene:", error);
        // Show error to user
        this.add.text(config.width / 2, config.height / 2, 
            'Error loading game.\nPlease refresh the page.', 
            { fontSize: '20px', fill: '#fff', align: 'center' }).setOrigin(0.5);
    }
}

// Game loop
function update(time) {
    try {
        // Update debug text
        if (debugText) {
            debugText.setText(`Assets: ${assetsReady ? 'OK' : 'Loading...'}`);
        }
        
        if (gameOver) return;
        
        // Move background and ground
        if (this.bg) {
            this.bg.tilePositionX += backgroundSpeed;
        }
        
        // Update clouds
        if (clouds && clouds.getChildren) {
            clouds.getChildren().forEach(cloud => {
                cloud.x -= cloud.speedX;
                if (cloud.x < -cloud.width) {
                    cloud.x = config.width + cloud.width;
                    cloud.y = Phaser.Math.Between(50, 200);
                }
            });
        }
        
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
                if (pipe.x + pipe.width < bird.x && !pipe.scored && pipe.texture.key === 'pipe' && pipe.y < config.height / 2) {
                    pipe.scored = true;
                    increaseScore(this);
                }
                
                // Remove pipes when off screen
                if (pipe.x < -pipe.width) {
                    pipe.destroy();
                }
            });
        }
        
        // Rotate bird based on velocity
        if (bird && bird.body) {
            if (bird.body.velocity.y > 0) {
                bird.angle = Math.min(bird.angle + 2, 30);
            } else {
                bird.angle = Math.max(bird.angle - 2, -30);
            }
        }
    } catch (error) {
        console.error("Error in update loop:", error);
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
    
    // Share score with Telegram Mini App if running in Telegram
    if (isTelegram) {
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
    this.scene.restart();
    score = 0;
    gameOver = false;
    gameStarted = false;
}