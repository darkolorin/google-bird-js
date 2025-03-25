// Initialize Telegram Mini App
const tgApp = window.Telegram?.WebApp;
// Check if running in Telegram
const isTelegram = !!tgApp;

if (tgApp) {
    tgApp.expand();
    tgApp.ready();
    console.log("Telegram Mini App initialized");
}

// Get the window dimensions for fullscreen
const getGameDimensions = () => {
    // Standard 9:16 aspect ratio for mobile game
    const aspectRatio = 9/16;
    const windowRatio = window.innerWidth / window.innerHeight;
    
    let width, height;
    
    if (windowRatio < aspectRatio) {
        // Window is taller than needed
        width = window.innerWidth;
        height = width / aspectRatio;
    } else {
        // Window is wider than needed
        height = window.innerHeight;
        width = height * aspectRatio;
    }
    
    return {
        width: Math.round(width),
        height: Math.round(height)
    };
};

const dimensions = getGameDimensions();

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: dimensions.width,
    height: dimensions.height,
    parent: 'game-container',
    backgroundColor: '#64b5f6', // Fallback background color
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: dimensions.width,
        height: dimensions.height
    },
    // Improved rendering settings
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false
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
    
    // Create beautiful gradient background
    const skyHeight = config.height;
    this.bg = this.add.graphics();
    
    // Create gradient sky
    const skyGradient = this.bg.createLinearGradient(0, 0, 0, skyHeight);
    skyGradient.addColorStop(0, '#1e88e5');  // Darker blue at top
    skyGradient.addColorStop(0.5, '#64b5f6'); // Medium blue in middle
    skyGradient.addColorStop(1, '#bbdefb');   // Light blue at bottom
    
    this.bg.fillStyle(skyGradient);
    this.bg.fillRect(0, 0, config.width, skyHeight);
    
    // Add sun
    const sunX = config.width * 0.85;
    const sunY = config.height * 0.2;
    const sunRadius = config.width * 0.08;
    
    // Sun glow
    const sunGlow = this.add.graphics();
    const sunGradient = sunGlow.createRadialGradient(
        sunX, sunY, sunRadius * 0.5,
        sunX, sunY, sunRadius * 2.5
    );
    sunGradient.addColorStop(0, 'rgba(255, 253, 231, 0.8)');
    sunGradient.addColorStop(1, 'rgba(255, 253, 231, 0)');
    sunGlow.fillStyle(sunGradient);
    sunGlow.fillCircle(sunX, sunY, sunRadius * 2.5);
    
    // Sun body
    const sun = this.add.circle(sunX, sunY, sunRadius, 0xfff176);
    
    // Add distant mountains (decorative)
    const hillsGraphics = this.add.graphics();
    hillsGraphics.fillStyle(0x81c784, 0.5); // Light green with transparency
    
    // First hill
    hillsGraphics.fillEllipse(
        config.width * 0.2, 
        config.height * 0.85, 
        config.width * 0.7, 
        config.height * 0.25
    );
    
    // Second hill
    hillsGraphics.fillStyle(0x66bb6a, 0.6); // Darker green
    hillsGraphics.fillEllipse(
        config.width * 0.7, 
        config.height * 0.82, 
        config.width * 0.8, 
        config.height * 0.3
    );
    
    // Add nice fluffy clouds
    clouds = this.physics.add.group();
    for (let i = 0; i < 6; i++) {
        const cloudX = Phaser.Math.Between(0, config.width);
        const cloudY = Phaser.Math.Between(50, config.height * 0.4);
        const scale = Phaser.Math.FloatBetween(0.6, 1.2);
        
        const cloud = clouds.create(cloudX, cloudY, null);
        cloud.body = this.physics.add.existing(cloud).body;
        cloud.body.allowGravity = false;
        cloud.speedX = Phaser.Math.FloatBetween(0.3, 1.2) * scale;
        cloud.width = 120 * scale;
        cloud.setVisible(false); // Hide placeholder sprite
        
        // Create a cloud container for all the circle parts
        const cloudContainer = this.add.container(cloudX, cloudY);
        
        // Create a fluffy cloud using multiple overlapping circles
        const cloudColor = 0xffffff;
        const cloudAlpha = 0.9;
        
        // Main cloud part
        const mainPuff = this.add.circle(0, 0, 30 * scale, cloudColor, cloudAlpha);
        
        // Add more puffs to create a fluffy cloud shape
        const leftPuff = this.add.circle(-25 * scale, 5 * scale, 25 * scale, cloudColor, cloudAlpha);
        const rightPuff = this.add.circle(25 * scale, 5 * scale, 25 * scale, cloudColor, cloudAlpha);
        const topPuff = this.add.circle(0, -15 * scale, 20 * scale, cloudColor, cloudAlpha);
        
        // Add all puffs to the container
        cloudContainer.add([leftPuff, rightPuff, topPuff, mainPuff]);
        
        // Add depth and shadow to the cloud
        const shadow = this.add.circle(0, 5 * scale, 30 * scale, 0x000000, 0.1);
        shadow.setDepth(-1);
        cloudContainer.add(shadow);
        
        // Store container reference
        cloud.cloudGraphic = cloudContainer;
    }
    
    // Add ground with texture and details
    ground = this.physics.add.staticGroup();
    const groundHeight = 60;
    const groundY = config.height - groundHeight/2;
    
    // Create physics object
    const groundObj = ground.create(config.width / 2, groundY, null);
    groundObj.setVisible(false); // Hide placeholder sprite
    groundObj.setDisplaySize(config.width, groundHeight);
    groundObj.refreshBody();
    
    // Draw ground with gradient and details
    const groundGfx = this.add.graphics();
    
    // Main ground body with gradient
    const groundGradient = groundGfx.createLinearGradient(0, groundY - groundHeight/2, 0, config.height);
    groundGradient.addColorStop(0, '#a1887f'); // Lighter at top
    groundGradient.addColorStop(0.3, '#8d6e63'); // Medium in middle
    groundGradient.addColorStop(1, '#6d4c41'); // Darker at bottom
    
    groundGfx.fillStyle(groundGradient);
    groundGfx.fillRect(0, groundY - groundHeight/2, config.width, groundHeight);
    
    // Add ground details (small stones and texture)
    const groundDetails = this.add.graphics();
    groundDetails.fillStyle(0x795548, 0.5);
    
    // Draw random "stones" as details
    for (let i = 0; i < 15; i++) {
        const stoneX = Phaser.Math.Between(0, config.width);
        const stoneWidth = Phaser.Math.Between(20, 50);
        groundDetails.fillRect(stoneX, groundY - groundHeight/2 + 5, stoneWidth, 8);
    }
    
    // Add grass tufts on top of the ground
    const grassGfx = this.add.graphics();
    grassGfx.fillStyle(0x81c784); // Green color
    
    for (let i = 0; i < 30; i++) {
        const grassX = Phaser.Math.Between(0, config.width);
        const grassHeight = Phaser.Math.Between(5, 12);
        const grassWidth = Phaser.Math.Between(3, 8);
        grassGfx.fillRect(grassX, groundY - groundHeight/2 - grassHeight, grassWidth, grassHeight);
    }
    
    // Add cute, detailed bird
    bird = this.physics.add.sprite(80, config.height / 2, null);
    bird.setVisible(false); // Hide placeholder sprite
    bird.setSize(30, 30); // Set collision size
    
    // Create bird container for all parts
    const birdContainer = this.add.container(80, config.height / 2);
    bird.container = birdContainer;
    
    // Bird body - gradient for more depth
    const birdGfx = this.add.graphics();
    const birdGradient = birdGfx.createRadialGradient(
        0, 0, 1,
        0, 0, 20
    );
    birdGradient.addColorStop(0, '#ffee58'); // Bright yellow in center
    birdGradient.addColorStop(0.8, '#fdd835'); // Darker yellow at edges
    
    birdGfx.fillStyle(birdGradient);
    birdGfx.fillCircle(0, 0, 18);
    birdContainer.add(birdGfx);
    
    // Bird wing
    const wing = this.add.ellipse(-8, 5, 18, 12, 0xfbc02d);
    birdContainer.add(wing);
    
    // Create eyes
    const eyeWhite = this.add.circle(8, -6, 6, 0xffffff);
    const eyePupil = this.add.circle(10, -6, 3, 0x3e2723);
    const eyeHighlight = this.add.circle(8, -8, 2, 0xffffff, 0.8);
    birdContainer.add([eyeWhite, eyePupil, eyeHighlight]);
    
    // Create beak
    const beak = this.add.polygon(15, 0, [
        0, -5,  // Top left
        18, 0,  // Tip
        0, 5    // Bottom left
    ], 0xff9800);
    birdContainer.add(beak);
    
    // Add shadow under bird
    const birdShadow = this.add.ellipse(2, 5, 30, 10, 0x000000, 0.2);
    birdContainer.add(birdShadow);
    
    // Animate the wing
    this.tweens.add({
        targets: wing,
        scaleY: 0.8,
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
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
    
    // Add visually appealing score text with shadow
    const scoreSize = Math.round(config.width * 0.08);
    scoreText = this.add.text(config.width / 2, 60, '0', { 
        fontFamily: 'Arial, sans-serif',
        fontSize: `${scoreSize}px`, 
        fontWeight: 'bold',
        fill: '#ffffff', 
        stroke: '#000000', 
        strokeThickness: 6,
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, stroke: true, fill: true }
    });
    scoreText.setOrigin(0.5);
    scoreText.depth = 20;
    
    // Create glowing tap to start text
    const tapSize = Math.round(config.width * 0.06);
    tapToStartText = this.add.text(config.width / 2, config.height / 2, 'Tap to Start', { 
        fontFamily: 'Arial, sans-serif',
        fontSize: `${tapSize}px`, 
        fontWeight: 'bold',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    });
    tapToStartText.setOrigin(0.5);
    tapToStartText.depth = 20;
    
    // Add pulsing animation to tap text
    this.tweens.add({
        targets: tapToStartText,
        scale: 1.1,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Add game over text with nice styling
    const gameOverSize = Math.round(config.width * 0.1);
    gameOverText = this.add.text(config.width / 2, config.height / 2 - 80, 'Game Over', { 
        fontFamily: 'Arial, sans-serif',
        fontSize: `${gameOverSize}px`, 
        fontWeight: 'bold',
        fill: '#ffffff', 
        stroke: '#880E4F', 
        strokeThickness: 8,
        shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, stroke: true, fill: true }
    });
    gameOverText.setOrigin(0.5);
    gameOverText.visible = false;
    gameOverText.depth = 20;
    
    // Add visually appealing restart button with glow effect
    restartButton = this.add.container(config.width / 2, config.height / 2 + 60);
    
    // Button glow
    const buttonGlow = this.add.graphics();
    const glowGradient = buttonGlow.createRadialGradient(
        0, 0, 10,
        0, 0, 50
    );
    glowGradient.addColorStop(0, 'rgba(76, 175, 80, 0.8)');
    glowGradient.addColorStop(1, 'rgba(76, 175, 80, 0)');
    buttonGlow.fillStyle(glowGradient);
    buttonGlow.fillCircle(0, 0, 50);
    
    // Main button
    const buttonCircle = this.add.circle(0, 0, 35, 0x4caf50);
    const buttonRim = this.add.circle(0, 0, 35, 0x2e7d32);
    buttonRim.setStrokeStyle(4, 0x2e7d32);
    
    // Button symbol (play arrow)
    const buttonSymbol = this.add.polygon(2, 0, [
        -10, -15,  // Top
        20, 0,     // Right
        -10, 15    // Bottom
    ], 0xffffff);
    
    // Button shadow
    const buttonShadow = this.add.ellipse(4, 4, 70, 30, 0x000000, 0.3);
    buttonShadow.setDepth(-1);
    
    restartButton.add([buttonShadow, buttonGlow, buttonCircle, buttonRim, buttonSymbol]);
    
    // Make it interactive
    buttonCircle.setInteractive(
        new Phaser.Geom.Circle(0, 0, 35),
        Phaser.Geom.Circle.Contains
    );
    buttonCircle.on('pointerdown', restartGame, this);
    
    // Add scale animation to button
    this.tweens.add({
        targets: buttonCircle,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
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
                
                // Add visual feedback for scoring
                const scoreFlash = this.add.circle(bird.x + 50, bird.y, 15, 0xffff00, 0.7);
                this.tweens.add({
                    targets: scoreFlash,
                    alpha: 0,
                    scale: 3,
                    duration: 500,
                    onComplete: () => scoreFlash.destroy()
                });
                
                // Add small floating "+1" text
                const plusOneText = this.add.text(bird.x + 40, bird.y - 20, '+1', { 
                    fontFamily: 'Arial',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    fill: '#ffffff'
                });
                plusOneText.setDepth(20);
                
                this.tweens.add({
                    targets: plusOneText,
                    y: plusOneText.y - 40,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => plusOneText.destroy()
                });
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

// Bird flap action with visual effect
function flapBird() {
    if (gameOver) return;
    
    if (!gameStarted) {
        startGame();
    }
    
    // Set bird velocity
    bird.body.velocity.y = -350;
    this.flapSound.play();
    
    // Add flap visual effects
    if (bird.container) {
        // Quick wing animation
        const wingFlap = this.tweens.add({
            targets: bird.container.list[1], // Wing element
            scaleY: 0.5,
            duration: 100,
            yoyo: true,
            ease: 'Cubic.easeOut'
        });
        
        // Small air burst effect
        const burstParticles = this.add.particles(bird.x - 15, bird.y + 10, 'particle', {
            frame: 0,
            color: [ 0xffffff ],
            colorEase: 'quad.out',
            lifespan: 300,
            speed: { min: 20, max: 40 },
            scale: { start: 0.4, end: 0.1 },
            quantity: 5,
            blendMode: 'ADD',
            emitting: false
        });
        
        // Create particle texture on first use
        if (!this.textures.exists('particle')) {
            const particles = this.make.graphics();
            particles.fillStyle(0xffffff);
            particles.fillCircle(4, 4, 4);
            particles.generateTexture('particle', 8, 8);
        }
        
        burstParticles.explode(5);
        
        // Remove particles after animation completes
        this.time.delayedCall(300, () => {
            burstParticles.destroy();
        });
    }
}

// Create pipes
function createPipes(scene) {
    // Calculate random position for the gap
    const pipeY = Phaser.Math.Between(100, config.height - gap - 100 - 64);
    const pipeWidth = 60;
    const pipeHeight = 320;
    
    // Create top pipe with details
    const topPipe = pipes.create(config.width + 10, pipeY - pipeHeight/2, null);
    topPipe.setVisible(false); // Hide placeholder sprite
    topPipe.body.allowGravity = false;
    topPipe.scored = false;
    
    // Create a container for the top pipe graphics
    const topPipeContainer = scene.add.container(config.width + 10, pipeY - pipeHeight/2);
    
    // Main pipe body with gradient
    const topPipeGfx = scene.add.graphics();
    const pipeGradient = topPipeGfx.createLinearGradient(-pipeWidth/2, 0, pipeWidth/2, 0);
    pipeGradient.addColorStop(0, '#2e7d32'); // Darker green at left edge
    pipeGradient.addColorStop(0.5, '#4caf50'); // Medium green in middle
    pipeGradient.addColorStop(1, '#2e7d32'); // Darker green at right edge
    
    topPipeGfx.fillStyle(pipeGradient);
    topPipeGfx.fillRect(-pipeWidth/2, -pipeHeight/2, pipeWidth, pipeHeight);
    
    // Add rim at the bottom
    const rimHeight = 15;
    const topPipeRim = scene.add.graphics();
    topPipeRim.fillStyle(0x1b5e20); // Darker green for rim
    topPipeRim.fillRect(-pipeWidth/2 - 5, pipeHeight/2 - rimHeight, pipeWidth + 10, rimHeight);
    
    // Add highlight
    const topPipeHighlight = scene.add.graphics();
    topPipeHighlight.fillStyle(0x81c784, 0.3); // Light green highlight
    topPipeHighlight.fillRect(-pipeWidth/2 + 5, -pipeHeight/2, 10, pipeHeight - rimHeight);
    
    // Add all pipe parts to container
    topPipeContainer.add([topPipeGfx, topPipeRim, topPipeHighlight]);
    topPipeContainer.setDepth(5);
    topPipe.pipeGraphic = topPipeContainer;
    
    // Create bottom pipe with details
    const bottomPipe = pipes.create(config.width + 10, pipeY + gap + pipeHeight/2, null);
    bottomPipe.setVisible(false); // Hide placeholder sprite
    bottomPipe.body.allowGravity = false;
    bottomPipe.scored = false;
    
    // Create a container for the bottom pipe graphics
    const bottomPipeContainer = scene.add.container(config.width + 10, pipeY + gap + pipeHeight/2);
    
    // Main pipe body with gradient (same as top pipe)
    const bottomPipeGfx = scene.add.graphics();
    bottomPipeGfx.fillStyle(pipeGradient);
    bottomPipeGfx.fillRect(-pipeWidth/2, -pipeHeight/2, pipeWidth, pipeHeight);
    
    // Add rim at the top
    const bottomPipeRim = scene.add.graphics();
    bottomPipeRim.fillStyle(0x1b5e20); // Darker green for rim
    bottomPipeRim.fillRect(-pipeWidth/2 - 5, -pipeHeight/2, pipeWidth + 10, rimHeight);
    
    // Add highlight
    const bottomPipeHighlight = scene.add.graphics();
    bottomPipeHighlight.fillStyle(0x81c784, 0.3); // Light green highlight
    bottomPipeHighlight.fillRect(-pipeWidth/2 + 5, -pipeHeight/2 + rimHeight, 10, pipeHeight - rimHeight);
    
    // Add all pipe parts to container
    bottomPipeContainer.add([bottomPipeGfx, bottomPipeRim, bottomPipeHighlight]);
    bottomPipeContainer.setDepth(5);
    bottomPipe.pipeGraphic = bottomPipeContainer;
    
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

// Hit obstacle with visual impact effects
function hitObstacle() {
    if (gameOver) return;
    
    gameOver = true;
    this.hitSound.play();
    
    // Flash screen on impact
    const flash = this.add.rectangle(0, 0, config.width, config.height, 0xffffff);
    flash.setOrigin(0, 0);
    flash.setAlpha(0.3);
    flash.setDepth(100);
    
    this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 200,
        onComplete: () => flash.destroy()
    });
    
    // Camera shake effect
    this.cameras.main.shake(300, 0.01);
    
    // Create impact particles
    if (bird && bird.body) {
        // Create particle texture if it doesn't exist
        if (!this.textures.exists('impactParticle')) {
            const particles = this.make.graphics();
            particles.fillStyle(0xffeb3b); // Yellow like the bird
            particles.fillCircle(4, 4, 4);
            particles.generateTexture('impactParticle', 8, 8);
        }
        
        // Emit particles at impact point
        const emitter = this.add.particles(bird.x, bird.y, 'impactParticle', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.8, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            emitting: false
        });
        
        emitter.explode(15);
        
        // Clean up emitter after animation
        this.time.delayedCall(800, () => {
            emitter.destroy();
        });
        
        // Stop bird movement but add a small "bounce" effect
        bird.body.velocity.y = 100;
        bird.body.velocity.x = -50;
        
        // After short delay, stop completely
        this.time.delayedCall(200, () => {
            bird.body.velocity.y = 0;
            bird.body.velocity.x = 0;
            bird.body.allowGravity = false;
        });
    }
    
    // Stop all pipes
    if (pipes && pipes.getChildren) {
        pipes.getChildren().forEach(pipe => {
            if (pipe.body) {
                pipe.body.velocity.x = 0;
            }
        });
    }
    
    // Delay showing game over UI for dramatic effect
    this.time.delayedCall(800, () => {
        // Display game over with scale-in animation
        if (gameOverText) {
            gameOverText.visible = true;
            gameOverText.setScale(0.5);
            gameOverText.alpha = 0;
            
            this.tweens.add({
                targets: gameOverText,
                scale: 1,
                alpha: 1,
                duration: 500,
                ease: 'Back.easeOut'
            });
        }
        
        // Show restart button with animation
        if (restartButton) {
            restartButton.visible = true;
            restartButton.setScale(0.5);
            restartButton.alpha = 0;
            
            this.tweens.add({
                targets: restartButton,
                scale: 1,
                alpha: 1,
                duration: 500,
                ease: 'Back.easeOut',
                delay: 200
            });
        }
        
        // Show final score with animation
        const finalScoreSize = Math.round(config.width * 0.05);
        const finalScoreText = this.add.text(
            config.width / 2, 
            config.height / 2 - 20, 
            `Score: ${score}`, 
            { 
                fontFamily: 'Arial, sans-serif',
                fontSize: `${finalScoreSize}px`, 
                fontWeight: 'bold',
                fill: '#ffffff', 
                stroke: '#000000', 
                strokeThickness: 4
            }
        );
        finalScoreText.setOrigin(0.5);
        finalScoreText.setDepth(20);
        finalScoreText.setAlpha(0);
        
        this.tweens.add({
            targets: finalScoreText,
            alpha: 1,
            duration: 500,
            delay: 400
        });
    });
    
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