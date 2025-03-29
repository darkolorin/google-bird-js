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
    backgroundColor: '#0c1221', // Dark background to match a16z branding
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 },
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
    
    // Create gradient sky background
    const sky = this.add.graphics();
    const gradient = sky.createLinearGradient(0, 0, 0, gameHeight);
    gradient.addColorStop(0, '#0a0e1a'); // Dark at top
    gradient.addColorStop(1, '#182039'); // Slightly lighter at bottom
    sky.fillStyle(gradient);
    sky.fillRect(0, 0, gameWidth, gameHeight);
    
    // Add stars for better aesthetics
    for (let i = 0; i < 50; i++) {
        const x = Phaser.Math.Between(0, gameWidth);
        const y = Phaser.Math.Between(0, gameHeight * 0.7);
        const size = Phaser.Math.FloatBetween(1, 3);
        const alpha = Phaser.Math.FloatBetween(0.3, 1);
        this.add.circle(x, y, size, 0xffffff, alpha);
    }
    
    // Add ground
    const groundHeight = gameHeight * 0.12;
    ground = this.physics.add.staticGroup();
    let groundObj = ground.create(gameWidth/2, gameHeight - groundHeight/2);
    groundObj.setVisible(false);
    groundObj.displayWidth = gameWidth * 1.2;
    groundObj.displayHeight = groundHeight;
    groundObj.refreshBody();
    
    // Draw visible ground with a16z-inspired look
    const groundGfx = this.add.graphics();
    // Main ground
    groundGfx.fillStyle(0x123456, 1);
    groundGfx.fillRect(0, gameHeight - groundHeight, gameWidth, groundHeight);
    
    // Add a subtle line pattern to ground
    groundGfx.lineStyle(1, 0x234567, 0.3);
    for (let i = 0; i < gameWidth; i += 15) {
        groundGfx.beginPath();
        groundGfx.moveTo(i, gameHeight - groundHeight);
        groundGfx.lineTo(i + 10, gameHeight);
        groundGfx.stroke();
    }
    
    // Add bird
    bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight * 0.5);
    bird.setSize(40, 40);
    bird.setVisible(false);
    bird.setCollideWorldBounds(true);
    bird.body.allowGravity = false;
    
    // Create bird appearance (modern tech style with a16z blue)
    this.birdGroup = this.add.group();
    
    // Bird body
    const birdBody = this.add.graphics();
    // Gradient for the bird body
    const birdGradient = birdBody.createLinearGradient(bird.x - 20, bird.y - 20, bird.x + 20, bird.y + 20);
    birdGradient.addColorStop(0, '#0096FF'); // Lighter blue
    birdGradient.addColorStop(1, '#0055FF'); // Darker blue
    birdBody.fillStyle(birdGradient);
    
    // Draw bird shape (rounded)
    birdBody.fillRoundedRect(bird.x - 20, bird.y - 15, 40, 30, 15);
    this.birdGroup.add(birdBody);
    
    // Bird eye
    const birdEye = this.add.circle(bird.x + 10, bird.y - 5, 5, 0xFFFFFF);
    const birdPupil = this.add.circle(bird.x + 12, bird.y - 5, 2, 0x000000);
    this.birdGroup.add(birdEye);
    this.birdGroup.add(birdPupil);
    
    // Bird beak/front
    const beakShape = new Phaser.Geom.Triangle(
        bird.x + 20, bird.y,
        bird.x + 35, bird.y - 8,
        bird.x + 35, bird.y + 8
    );
    const birdBeak = this.add.graphics();
    birdBeak.fillStyle(0xFFCC00, 1); // Golden color
    birdBeak.fillTriangleShape(beakShape);
    this.birdGroup.add(birdBeak);
    
    // Wing detail
    const wingDetail = this.add.graphics();
    wingDetail.fillStyle(0x0044CC, 1);
    wingDetail.fillEllipse(bird.x - 5, bird.y + 5, 15, 10);
    this.birdGroup.add(wingDetail);
    
    // Create pipes group
    pipes = this.physics.add.group();
    
    // Text elements with a16z branding style
    // Create a custom font style that matches a16z branding
    const fontConfig = { 
        fontFamily: 'Arial, sans-serif', 
        fontSize: gameWidth * 0.08 + 'px', // Responsive font size
        color: '#ffffff',
        stroke: '#1A3A61',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, fill: true }
    };
    
    const smallFontConfig = { 
        fontFamily: 'Arial, sans-serif', 
        fontSize: gameWidth * 0.05 + 'px',
        color: '#ffffff',
        stroke: '#1A3A61',
        strokeThickness: 2
    };
    
    // Score text with a16z styling
    scoreText = this.add.text(gameWidth/2, gameHeight * 0.1, '0', fontConfig).setOrigin(0.5);
    
    // Add a16z text below score
    const brandText = this.add.text(gameWidth/2, gameHeight * 0.15, 'a16z', smallFontConfig).setOrigin(0.5);
    brandText.alpha = 0.8;
    
    // Tap to start text
    tapText = this.add.text(gameWidth/2, gameHeight/2, 'Tap to Start', fontConfig).setOrigin(0.5);
    
    // Animate tap text for better UX
    this.tweens.add({
        targets: tapText,
        scale: 1.1,
        duration: 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });
    
    // Game over text (hidden initially)
    gameOverText = this.add.text(gameWidth/2, gameHeight * 0.4, 'Game Over', fontConfig).setOrigin(0.5);
    gameOverText.visible = false;
    
    // Create restart button (hidden initially) - a16z style
    const buttonSize = Math.min(gameWidth, gameHeight) * 0.18;
    
    // Button graphics group
    const btnGraphics = this.add.graphics();
    
    // Blue gradient for button (a16z blue)
    const btnGradient = btnGraphics.createRadialGradient(
        gameWidth/2, gameHeight * 0.6, 0,
        gameWidth/2, gameHeight * 0.6, buttonSize/2
    );
    btnGradient.addColorStop(0, '#2A5CA8');
    btnGradient.addColorStop(1, '#183A75');
    
    btnGraphics.fillStyle(btnGradient);
    btnGraphics.fillCircle(gameWidth/2, gameHeight * 0.6, buttonSize/2);
    
    // Button border
    btnGraphics.lineStyle(3, 0xFFFFFF, 0.8);
    btnGraphics.strokeCircle(gameWidth/2, gameHeight * 0.6, buttonSize/2);
    
    btnGraphics.visible = false;
    
    // Create actual interactive button (invisible hitarea)
    restartBtn = this.add.circle(gameWidth/2, gameHeight * 0.6, buttonSize/2);
    restartBtn.setInteractive();
    restartBtn.visible = true;
    restartBtn.alpha = 0; // Invisible but still interactive
    
    // Add play icon to button
    const triangleSize = buttonSize * 0.35;
    const triangle = this.add.triangle(
        gameWidth/2 + triangleSize/6, gameHeight * 0.6, // Slightly off-center for play button look
        -triangleSize/2, -triangleSize/2,
        -triangleSize/2, triangleSize/2,
        triangleSize/2, 0,
        0xFFFFFF
    );
    triangle.visible = false;
    
    // Store references
    restartBtn.graphics = btnGraphics;
    restartBtn.triangle = triangle;
    restartBtn.visible = false;
    
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
    if (birdParts.length >= 5) { // We now have 5 parts (body, eye, pupil, beak, wing)
        // Bird body - need to redraw with rotation
        let rotation = 0;
        if (gameStarted && !gameOver && bird.body) {
            rotation = Phaser.Math.Clamp(bird.body.velocity.y / 700, -0.3, 0.3);
        }
        
        // Redraw bird body with rotation
        birdParts[0].clear();
        const birdGradient = birdParts[0].createLinearGradient(
            bird.x - 20, bird.y - 20, 
            bird.x + 20, bird.y + 20
        );
        birdGradient.addColorStop(0, '#0096FF'); // Light blue
        birdGradient.addColorStop(1, '#0055FF'); // Darker blue
        birdParts[0].fillStyle(birdGradient);
        
        // Save context, translate to bird center, rotate, draw rect, restore context
        birdParts[0].save();
        birdParts[0].translateCanvas(bird.x, bird.y);
        birdParts[0].rotateCanvas(rotation);
        birdParts[0].fillRoundedRect(-20, -15, 40, 30, 15);
        birdParts[0].restore();
        
        // Eye white - apply rotation to position
        const eyeOffsetX = Math.cos(rotation) * 10 - Math.sin(rotation) * 5;
        const eyeOffsetY = Math.sin(rotation) * 10 + Math.cos(rotation) * 5;
        birdParts[1].x = bird.x + eyeOffsetX;
        birdParts[1].y = bird.y - eyeOffsetY;
        
        // Eye pupil - apply rotation to position 
        const pupilOffsetX = Math.cos(rotation) * 12 - Math.sin(rotation) * 5;
        const pupilOffsetY = Math.sin(rotation) * 12 + Math.cos(rotation) * 5;
        birdParts[2].x = bird.x + pupilOffsetX;
        birdParts[2].y = bird.y - pupilOffsetY;
        
        // Beak - need to redraw it with rotation
        birdParts[3].clear();
        birdParts[3].fillStyle(0xFFCC00, 1); // Golden color
        
        // Calculate rotated points for triangle
        const tipX = Math.cos(rotation) * 35;
        const tipY = Math.sin(rotation) * 35;
        const top = rotatePoint(20, -8, rotation);
        const bottom = rotatePoint(20, 8, rotation);
        
        const beakShape = new Phaser.Geom.Triangle(
            bird.x + Math.cos(rotation) * 20, bird.y + Math.sin(rotation) * 20,
            bird.x + tipX + top.x, bird.y + tipY + top.y,
            bird.x + tipX + bottom.x, bird.y + tipY + bottom.y
        );
        birdParts[3].fillTriangleShape(beakShape);
        
        // Wing detail - redraw with rotation
        birdParts[4].clear();
        birdParts[4].fillStyle(0x0044CC, 1);
        
        // Calculate wing position with rotation
        const wingX = bird.x - Math.cos(rotation) * 5 - Math.sin(rotation) * 5;
        const wingY = bird.y + Math.sin(rotation) * 5 + Math.cos(rotation) * 5;
        
        // Add flapping animation based on velocity
        const wingSize = 1.0 + (gameStarted ? Math.sin(Date.now() / 100) * 0.2 : 0);
        
        birdParts[4].save();
        birdParts[4].translateCanvas(wingX, wingY);
        birdParts[4].rotateCanvas(rotation);
        birdParts[4].fillEllipse(0, 0, 15 * wingSize, 10 * wingSize);
        birdParts[4].restore();
    }
    
    // Helper function to rotate a point around origin
    function rotatePoint(x, y, angle) {
        return {
            x: x * Math.cos(angle) - y * Math.sin(angle),
            y: x * Math.sin(angle) + y * Math.cos(angle)
        };
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
    const pipeWidth = gameWidth * 0.2;
    const gap = gameHeight * 0.28; // Slightly larger gap for easier gameplay
    
    // Calculate random gap position
    const minY = gameHeight * 0.25;
    const maxY = gameHeight * 0.75 - gap;
    const gapY = Phaser.Math.Between(minY, maxY);
    
    // Top pipe
    const pipeTopHeight = gapY;
    const topPipe = pipes.create(gameWidth + pipeWidth/2, pipeTopHeight/2);
    topPipe.setVisible(false);
    topPipe.body.allowGravity = false;
    topPipe.scored = false;
    topPipe.body.setSize(pipeWidth, pipeTopHeight);
    topPipe.body.velocity.x = -250; // Slightly faster for more challenge
    
    // Draw top pipe with a16z logo style
    const topPipeGraphics = this.add.graphics();
    
    // Main pipe body
    const pipeGradient = topPipeGraphics.createLinearGradient(
        -pipeWidth/2, 0, 
        pipeWidth/2, 0
    );
    pipeGradient.addColorStop(0, '#0F2542'); // Dark blue
    pipeGradient.addColorStop(0.5, '#1A3A61'); // Medium blue
    pipeGradient.addColorStop(1, '#0F2542'); // Dark blue
    
    topPipeGraphics.fillStyle(pipeGradient);
    topPipeGraphics.fillRect(-pipeWidth/2, -pipeTopHeight/2, pipeWidth, pipeTopHeight);
    
    // Add a16z logo elements (simplified)
    topPipeGraphics.fillStyle(0xFFFFFF, 0.9); // White
    
    // Logo position relative to pipe
    const logoY = Math.min(pipeTopHeight/2 - 100, pipeTopHeight/2 - pipeWidth * 0.5);
    
    // a16z text (simplified as blocks)
    const letterHeight = pipeWidth * 0.25;
    const letterWidth = pipeWidth * 0.15;
    const spacing = letterWidth * 0.4;
    let startX = -letterWidth * 2 - spacing * 1.5;
    
    // 'a' block
    topPipeGraphics.fillRoundedRect(startX, logoY - letterHeight/2, letterWidth, letterHeight, 8);
    
    // '16' as one block
    startX += letterWidth + spacing;
    topPipeGraphics.fillRoundedRect(startX, logoY - letterHeight/2, letterWidth * 1.5, letterHeight, 8);
    
    // 'z' block
    startX += letterWidth * 1.5 + spacing;
    topPipeGraphics.fillRoundedRect(startX, logoY - letterHeight/2, letterWidth, letterHeight, 8);
    
    // Add rim to top pipe
    topPipeGraphics.fillStyle(0x0A1C33, 1); // Darker blue for rim
    topPipeGraphics.fillRect(-pipeWidth/2 - 10, pipeTopHeight/2 - 20, pipeWidth + 20, 20);
    
    topPipeGraphics.x = gameWidth + pipeWidth/2;
    topPipeGraphics.y = pipeTopHeight/2;
    topPipe.graphics = topPipeGraphics;
    
    // Bottom pipe
    const pipeBottomHeight = gameHeight - gapY - gap - gameHeight * 0.12; // Subtract ground height
    const bottomPipe = pipes.create(gameWidth + pipeWidth/2, gapY + gap + pipeBottomHeight/2);
    bottomPipe.setVisible(false);
    bottomPipe.body.allowGravity = false;
    bottomPipe.body.setSize(pipeWidth, pipeBottomHeight);
    bottomPipe.body.velocity.x = -250; // Same speed as top pipe
    
    // Draw bottom pipe with a16z logo style
    const bottomPipeGraphics = this.add.graphics();
    
    // Main pipe body with same gradient
    bottomPipeGraphics.fillStyle(pipeGradient);
    bottomPipeGraphics.fillRect(-pipeWidth/2, -pipeBottomHeight/2, pipeWidth, pipeBottomHeight);
    
    // Add a16z logo elements (different arrangement)
    bottomPipeGraphics.fillStyle(0xFFFFFF, 0.9); // White
    
    // Logo position for bottom pipe (near top of pipe)
    const bottomLogoY = -pipeBottomHeight/2 + 100;
    
    // Different arrangement for bottom pipe - stacked blocks
    topPipeGraphics.fillRoundedRect(-letterWidth/2, bottomLogoY, letterWidth, letterHeight * 3 + spacing * 2, 8);
    
    // Add rim to bottom pipe
    bottomPipeGraphics.fillStyle(0x0A1C33, 1); // Darker blue for rim
    bottomPipeGraphics.fillRect(-pipeWidth/2 - 10, -pipeBottomHeight/2, pipeWidth + 20, 20);
    
    bottomPipeGraphics.x = gameWidth + pipeWidth/2;
    bottomPipeGraphics.y = gapY + gap + pipeBottomHeight/2;
    bottomPipe.graphics = bottomPipeGraphics;
    
    // Add some subtle animation to pipes
    this.tweens.add({
        targets: [topPipeGraphics, bottomPipeGraphics],
        alpha: 0.9,
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });
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
    
    // Show game over text and restart button with animation
    gameOverText.visible = true;
    gameOverText.setScale(0);
    
    // Animate game over text
    this.tweens.add({
        targets: gameOverText,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut'
    });
    
    // Show and animate restart button
    restartBtn.visible = true;
    if (restartBtn.graphics) restartBtn.graphics.visible = true;
    if (restartBtn.triangle) restartBtn.triangle.visible = true;
    
    // Scale animation for button
    this.tweens.add({
        targets: [restartBtn.graphics, restartBtn.triangle],
        scale: { from: 0, to: 1 },
        duration: 500,
        delay: 200,
        ease: 'Back.easeOut'
    });
    
    // Show final score with animation
    const finalScoreText = this.add.text(
        gameWidth/2, 
        gameHeight * 0.5, 
        'Score: ' + score, 
        { 
            fontFamily: 'Arial, sans-serif', 
            fontSize: gameWidth * 0.06 + 'px',
            color: '#ffffff',
            stroke: '#1A3A61',
            strokeThickness: 2
        }
    ).setOrigin(0.5);
    finalScoreText.setScale(0);
    
    this.tweens.add({
        targets: finalScoreText,
        scale: 1,
        duration: 500,
        delay: 400,
        ease: 'Back.easeOut'
    });
    
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