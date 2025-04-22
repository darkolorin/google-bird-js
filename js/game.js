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
let pipeTimer; // Add variable for the timer event
let clouds; // Add variable for the cloud group
let cloudTimer; // Add variable for the cloud timer
let lastLogTime = 0; // Variable to limit frequency of timer logging

// Initialize game
const game = new Phaser.Game(config);

// Asset loading
function preload() {
    console.log("Preload started");
    // Load image assets
    this.load.image('background', 'assets/images/background.svg');
    this.load.image('bird', 'assets/images/bird.svg');
    this.load.image('pipe', 'assets/images/pipe.svg');
    this.load.image('ground', 'assets/images/ground.svg');
    this.load.image('cloud', 'assets/images/cloud.svg'); // Load cloud image
    // We might need a restart button graphic later if we change the restart logic
    // this.load.image('restart', 'assets/images/restart.svg');
}

// Set up game objects
function create() {
    console.log("Creating game");

    // Add background image & set depth
    this.add.image(config.width / 2, config.height / 2, 'background')
        .setOrigin(0.5)
        .setDepth(-10); // Send background far back

    // Add cloud group (behind pipes and bird, but in front of background)
    clouds = this.add.group();

    // Add bird physics sprite (invisible physics body remains similar)
    bird = this.physics.add.sprite(80, config.height / 2, 'bird');
    bird.setCircle(15); // Adjust hitbox if needed based on bird.svg size/shape
    bird.setCollideWorldBounds(false); // Allow bird to go off-screen top/bottom initially
    bird.body.allowGravity = false; // Gravity disabled until game starts
    bird.setVisible(true); // Make the sprite visible now
    bird.setScale(0.08); // Scale the bird SVG down if it's too large

    // Add ground physics body (static)
    const groundHeight = 80; // Adjust based on ground.svg height if necessary
    ground = this.physics.add.staticGroup();

    // Create a tiled sprite for seamless scrolling ground
    const groundTile = this.add.tileSprite(config.width / 2, config.height - groundHeight / 2, config.width, groundHeight, 'ground');
    ground.add(groundTile); // Add the visual part to the physics group
    groundTile.body.allowGravity = false; // Ensure it doesn't fall
    groundTile.body.immovable = true; // Ensure it doesn't move upon collision

    // Pipes group (still physics-based)
    pipes = this.physics.add.group({
        allowGravity: false,
        immovable: true
    });

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

    // Set up pipe generation timer
    pipeTimer = this.time.addEvent({
        delay: 1500, // milliseconds
        callback: createPipes, // Function to call
        callbackScope: this,   // Context for the callback
        loop: true             // Repeat indefinitely
    });
    pipeTimer.paused = true; // Start paused until game starts

    // Set up cloud generation timer (runs constantly)
    cloudTimer = this.time.addEvent({
        delay: 5000, // Spawn cloud every 5 seconds (adjust as needed)
        callback: createCloud,
        callbackScope: this,
        loop: true
    });
    // Initial cloud spawn
    createCloud.call(this);
    console.log("Initial cloud created call");

    console.log("Game created!");
}

// Game loop
function update(time) {
    // Log timer status occasionally
    if (time > lastLogTime + 2000) { // Log every 2 seconds
        if (pipeTimer) {
            console.log(`Pipe Timer Status - Paused: ${pipeTimer.paused}, Delay: ${pipeTimer.delay}, Elapsed: ${pipeTimer.elapsed.toFixed(0)}`);
        }
        if (cloudTimer) {
             console.log(`Cloud Timer Status - Delay: ${cloudTimer.delay}, Elapsed: ${cloudTimer.elapsed.toFixed(0)}`);
        }
        if (clouds) {
            console.log(`Cloud count: ${clouds.getChildren().length}`);
        }
        lastLogTime = time;
    }

    // Rotate bird sprite based on velocity
    if (gameStarted && !gameOver) {
        // Existing rotation logic should work directly on the bird sprite
        const angle = Phaser.Math.Clamp(bird.body.velocity.y * 0.1, -30, 90); // Adjust multiplier/limits as needed
        bird.angle = angle;

        // Scroll the ground texture
        ground.getChildren().forEach(g => {
            if (g instanceof Phaser.GameObjects.TileSprite) {
                g.tilePositionX += 3; // Adjust speed as needed
            }
        });
    }

    // Move clouds
    clouds.getChildren().forEach(cloud => {
        cloud.x -= cloud.getData('speed'); // Move cloud left based on its speed
        // console.log(`Cloud at X: ${cloud.x.toFixed(0)}, Width: ${cloud.width.toFixed(0)}`); // Uncomment for verbose cloud position logging
        // Remove clouds when off screen
        if (cloud.x < -cloud.width) {
            console.log(`Destroying cloud at X: ${cloud.x.toFixed(0)}`);
            cloud.destroy();
        }
    });

    if (gameOver) return;
    if (!gameStarted) return;

    // Check for scoring and clean up pipes
    pipes.getChildren().forEach(pipe => {
        // Score when passing pipe (use pipe bounds)
        // Score when the pipe's right edge passes the bird's center
        if (pipe.getBounds().right < bird.x && !pipe.scored) {
             // Check only one pipe of the pair (e.g., the top one or one with a specific property)
            if (pipe.getData('isTopPipe')) { // Need to set this data in createPipes
               score++;
               scoreText.setText(score.toString());
               // Mark both pipes of the pair as scored to avoid double scoring
               pipes.getChildren().forEach(p => {
                    if (p.getData('pairId') === pipe.getData('pairId')) {
                         p.scored = true;
                     }
               });
            }
        }

        // Remove pipes when off screen
        if (pipe.x < -pipe.width) { // Use pipe width for removal check
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
    console.log("Starting game"); // Log game start
    gameStarted = true;
    bird.body.allowGravity = true;
    tapToStartText.visible = false;
    
    // Make bird visible and interactable
    bird.setVisible(true);

    // Resume pipe timer
    if (pipeTimer) {
        console.log("Resuming pipe timer"); // Log timer resume
        pipeTimer.paused = false;
    }

    // Initial jump
    bird.body.velocity.y = -350;
}

// Create pipes using images
function createPipes() {
    const scene = this; // 'this' is the scene when called by the timer

    // Prevent accidental rapid-fire creation by enforcing minimum spacing (optional safety)
    if (scene.lastPipeX && scene.lastPipeX > config.width * 0.8) {
        // If the last pipe pair hasn't moved ~20% of screen width, skip this creation
        return;
    }

    // Log when pipes are created
    console.log(`Creating pipes at time: ${scene.time.now}`);

    const pipeHeight = 512; // Adjust if needed to match asset
    const pipeWidth = 80;

    // Calculate random position for the gap center
    const gapCenterY = Phaser.Math.Between(150, config.height - 150 - gap);

    const topPipeY = gapCenterY - gap / 2 - pipeHeight / 2;
    const bottomPipeY = gapCenterY + gap / 2 + pipeHeight / 2;

    const pairId = Phaser.Math.RND.uuid();

    // Create top pipe
    const topPipe = pipes.create(config.width + pipeWidth / 2, topPipeY, 'pipe');
    topPipe.setOrigin(0.5);
    topPipe.flipY = true;
    topPipe.body.velocity.x = -200;
    topPipe.scored = false;
    topPipe.setData('isTopPipe', true);
    topPipe.setData('pairId', pairId);
    topPipe.body.setSize(pipeWidth * 0.8, pipeHeight);

    // Create bottom pipe
    const bottomPipe = pipes.create(config.width + pipeWidth / 2, bottomPipeY, 'pipe');
    bottomPipe.setOrigin(0.5);
    bottomPipe.body.velocity.x = -200;
    bottomPipe.scored = false;
    bottomPipe.setData('isTopPipe', false);
    bottomPipe.setData('pairId', pairId);
    bottomPipe.body.setSize(pipeWidth * 0.8, pipeHeight);

    // Track last pipe x-position for spacing safety check
    scene.lastPipeX = topPipe.x;
}

// Handle collision
function hitObstacle() {
    if (gameOver) return;
    console.log("Hit obstacle - Game Over"); // Log game over
    gameOver = true;
    
    // Stop bird and pipes
    bird.body.velocity.y = 0;
    bird.body.allowGravity = false;
    bird.angle = 0; // Optional: Reset bird angle on game over
    
    pipes.getChildren().forEach(pipe => {
        pipe.body.velocity.x = 0;
    });
    
    // Pause pipe timer
    if (pipeTimer) {
        console.log("Pausing pipe timer"); // Log timer pause
        pipeTimer.paused = true;
    }
    
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

// Restart the game - smoother version
function restartGame() {
    console.log("Restarting game"); // Log restart
    // Reset variables
    gameOver = false;
    gameStarted = false;
    score = 0;
    nextPipes = 0;

    // Reset UI elements
    scoreText.setText('0');
    gameOverText.visible = false;
    restartButton.visible = false;
    restartButton.playSymbol.visible = false;
    tapToStartText.visible = true;

    // Reset bird position and physics
    bird.setPosition(80, config.height / 2);
    bird.setVelocity(0, 0);
    bird.body.allowGravity = false;
    bird.angle = 0;

    // Clear existing pipes
    pipes.clear(true, true); // Destroy children and remove them from the scene

    // Resume pipe timer (it starts paused, startGame will unpause it)
    if (pipeTimer) {
        console.log("Resetting pipe timer to paused state"); // Log timer reset
        pipeTimer.paused = true; // Ensure it's paused initially
        pipeTimer.elapsed = 0; // Reset elapsed time
    }

    // Optional: Reset ground scroll position if needed
    ground.getChildren().forEach(g => {
        if (g instanceof Phaser.GameObjects.TileSprite) {
            g.tilePositionX = 0;
        }
    });

    // Re-enable input listener if it was disabled
    // this.input.once('pointerdown', flapBird, this); // If only flapping starts the game
}

// Create a single cloud
function createCloud() {
    console.log(`Creating cloud at time: ${this.time.now}`); // Log cloud creation time
    const cloudY = Phaser.Math.Between(50, config.height / 2); // Random height in top half
    const cloudScale = Phaser.Math.FloatBetween(0.5, 1.0); // Random size
    const cloudSpeed = Phaser.Math.FloatBetween(0.5, 1.5); // Random speed
    const cloudAlpha = Phaser.Math.FloatBetween(0.7, 1.0); // Random transparency

    const cloud = clouds.create(config.width + 100, cloudY, 'cloud');
    cloud.setScale(cloudScale);
    cloud.setAlpha(cloudAlpha);
    cloud.setData('speed', cloudSpeed);
    cloud.setDepth(-5); // Ensure clouds are behind bird/pipes (default depth 0) but in front of background (-10)
    console.log(`Cloud created: Y=${cloudY}, Scale=${cloudScale.toFixed(1)}, Speed=${cloudSpeed.toFixed(1)}, Alpha=${cloudAlpha.toFixed(1)}`);
}