// Initialize Telegram Mini App
const tgApp = window.Telegram?.WebApp;
if (tgApp) {
    tgApp.expand();
    tgApp.ready();
}

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Asset paths
const assetPaths = {
    bird: 'assets/images/bird.svg',
    pipe: 'assets/images/pipe.svg',
    ground: 'assets/images/ground.svg',
    background: 'assets/images/background.svg',
    restart: 'assets/images/restart.svg' // Added restart button asset
};

// Loaded assets
const images = {};
let assetsLoaded = 0;
let totalAssets = Object.keys(assetPaths).length;

// Preload images
function preloadAssets(callback) {
    for (const key in assetPaths) {
        images[key] = new Image();
        images[key].onload = () => {
            assetsLoaded++;
            if (assetsLoaded === totalAssets) {
                callback();
            }
        };
        images[key].onerror = () => {
            console.error('Error loading asset:', assetPaths[key]);
            assetsLoaded++; // Count as loaded to not block game start
            if (assetsLoaded === totalAssets) {
                callback(); // Still proceed if an asset fails
            }
        };
        images[key].src = assetPaths[key];
    }
}

// Set canvas size (logical size)
let canvasWidth = 360;
let canvasHeight = 640;
let dpr = window.devicePixelRatio || 1;

// Resize to fit screen (maintaining aspect ratio) and handle DPI
function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const windowRatio = window.innerWidth / window.innerHeight;
    const gameRatio = canvasWidth / canvasHeight;

    let displayWidth;
    let displayHeight;

    if (windowRatio < gameRatio) {
        // Window is narrower than game ratio
        displayWidth = window.innerWidth;
        displayHeight = window.innerWidth / gameRatio;
    } else {
        // Window is wider than game ratio
        displayWidth = window.innerHeight * gameRatio;
        displayHeight = window.innerHeight;
    }

    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // Set actual canvas dimensions for pixel-perfect rendering, considering DPR
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;

    // Scale the context to ensure 1 CSS pixel = 1 game pixel, then scale by DPR
    ctx.resetTransform(); // Clear previous transforms
    ctx.scale(dpr, dpr); // Apply DPR scaling
}

// Game variables
const characterTypes = [
    {
        type: 'bird', // This will now use bird.svg
        radius: 20, // Adjusted for typical SVG size, might need further tuning
        gravity: 0.5,
        jumpStrength: -9, // Adjusted for potentially larger visual
        description: 'Floats with SVG!'
    },
    {
        type: 'crab',
        radius: 15,
        gravity: 0.5,
        jumpStrength: -8,
        color: '#FF4136',
        description: 'Balanced (programmatic)'
    },
    {
        type: 'apple',
        radius: 16,
        gravity: 0.55,
        jumpStrength: -8.2,
        color: '#2ECC40',
        description: 'Heavy (programmatic)'
    }
];

// Start with bird character if available, otherwise random
let currentCharacterIndex = characterTypes.findIndex(ct => ct.type === 'bird' && images.bird?.complete);
if (currentCharacterIndex === -1) {
    currentCharacterIndex = Math.floor(Math.random() * characterTypes.length);
}
let currentCharacter = characterTypes[currentCharacterIndex];

let bird = {
    x: 80,
    y: canvasHeight / 2,
    velocity: 0,
    radius: currentCharacter.radius,
    speedVariation: 0,
    type: currentCharacter.type,
    width: 40, 
    height: 30 
};

let pipes = [];
let pipeWidth = 55; 
let pipeHeight = 320; 

// Initial game parameters (will be set by updateDifficulty for level 1)
let gapHeight = 180;         // Start with a wider gap
let pipeSpeed = 2.5;         // Start a bit slower
let pipeSpawnInterval = 110; // Slightly longer interval initially

let minPipeDistance = 280;

let score = 0;
let gameOver = false;
let gameStarted = false;
let difficulty = 0;
let frames = 0;

let gravity = currentCharacter.gravity;
let jumpStrength = currentCharacter.jumpStrength;
let lastPipeX = -1000;

// Ground properties
const groundHeight = 80; // Logical height
let groundX = 0; // For scrolling

// Background properties
let backgroundX = 0; // For scrolling (optional parallax)

// Game functions
function drawBackground() {
    if (images.background && images.background.complete) {
        // Simple scrolling background
        const bgWidth = images.background.width;
        const bgHeight = images.background.height;
        
        // Calculate how many times the image needs to be drawn to fill the canvas width
        const numRepeats = Math.ceil(canvasWidth / bgWidth) + 1; // +1 to ensure no gaps during scroll

        for (let i = 0; i < numRepeats; i++) {
            ctx.drawImage(images.background, backgroundX + i * bgWidth, 0, bgWidth, canvasHeight);
        }
        
        // Scroll background (can be slower than ground for parallax)
        if (gameStarted && !gameOver) {
             backgroundX -= pipeSpeed / 2; // Example: half speed of pipes
             if (backgroundX <= -bgWidth) {
                 backgroundX = 0;
             }
        }
    } else {
        // Fallback if background image isn't loaded
        ctx.fillStyle = '#71c5cf'; // Original background color
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);

    if (gameStarted) {
        const angle = Math.min(Math.max(bird.velocity * 0.03, -Math.PI / 6), Math.PI / 6); // Angle in radians
        ctx.rotate(angle);
    }

    if (bird.type === 'bird' && images.bird && images.bird.complete) {
        // Draw bird SVG, centered
        ctx.drawImage(images.bird, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    } else if (bird.type === 'crab') {
        // Keep programmatic drawing for crab if no asset
        drawCrab(); // Original function
    } else if (bird.type === 'apple') {
        // Keep programmatic drawing for apple if no asset
        drawApple(); // Original function
    }

    ctx.restore();
}

// Keep original drawCrab and drawApple as fallbacks or if assets are not used for them
function drawCrab() {
    // Crab body (main circle - red)
    ctx.fillStyle = currentCharacter.color || '#FF4136';
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    // ... (rest of original crab drawing, simplified for brevity or remove if not used)
    // Crab shell pattern (lighter red)
    ctx.fillStyle = '#FF6B5B';
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
}

function drawApple() {
    // Apple body (main circle - green)
    ctx.fillStyle = currentCharacter.color || '#2ECC40';
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    // ... (rest of original apple drawing, simplified for brevity or remove if not used)
    // Apple highlight (light green arc)
    ctx.fillStyle = '#7FDBFF'; 
    ctx.beginPath();
    ctx.arc(bird.radius * 0.4, -bird.radius * 0.4, bird.radius * 0.4, 0, Math.PI * 0.5);
    ctx.fill();
}

function drawPipes() {
    if (!images.pipe || !images.pipe.complete) { // Fallback to old drawing if asset not loaded
        pipes.forEach(pipe => {
            ctx.fillStyle = '#33aa33'; // Original pipeColor
            if (score > 10) {
                const difficultyFactor = difficulty - 1;
                const difficultyColor = Math.max(0, 170 - difficultyFactor * 20);
                ctx.fillStyle = `rgb(0, ${difficultyColor}, 0)`;
                if (score > 20) {
                    ctx.fillStyle = `rgb(${Math.min(255, (score - 20) * 10)}, ${difficultyColor}, 0)`;
                }
            }
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapY);
            ctx.fillRect(pipe.x, pipe.gapY + gapHeight, pipeWidth, canvasHeight - (pipe.gapY + gapHeight));
        });
        return;
    }

    pipes.forEach(pipe => {
        const pipeImg = images.pipe;
        const P_WIDTH = pipeWidth; // Use the new global pipeWidth for consistency
        const P_HEIGHT = pipeImg.height; // Use actual image height for scaling, or a fixed value

        // Top pipe (flipped)
        ctx.save();
        ctx.translate(pipe.x + P_WIDTH / 2, pipe.gapY + P_HEIGHT / 2); // Translate to center of where top of flipped pipe should be
        ctx.scale(1, -1); // Flip vertically
        // Adjust Y to draw from its new "bottom" after flip, which is its original top
        ctx.drawImage(pipeImg, -P_WIDTH / 2, -P_HEIGHT / 2, P_WIDTH, P_HEIGHT);
        ctx.restore();

        // Bottom pipe
        ctx.drawImage(pipeImg, pipe.x, pipe.gapY + gapHeight, P_WIDTH, P_HEIGHT);

        // Optional: Draw brand logos (can be kept if desired)
        if (score > 10) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial'; // Consider scaling font with DPR if needed
            ctx.textAlign = 'center';
            const brand = score > 25 ? 'Apple' : 'a16z';
            if (pipe.gapY > 50) {
                ctx.fillText(brand, pipe.x + P_WIDTH/2, pipe.gapY - 20);
            }
            const bottomTextY = pipe.gapY + gapHeight + 40;
            if (bottomTextY < canvasHeight - 40) {
                ctx.fillText(brand, pipe.x + P_WIDTH/2, bottomTextY);
            }
        }
    });
}

function drawGround() {
    if (images.ground && images.ground.complete) {
        const groundImg = images.ground;
        const gWidth = groundImg.width;
        // Scale ground image height to fit groundHeight, maintain aspect ratio for width
        const gHeightScaled = groundHeight; 
        const gWidthScaled = (groundImg.width / groundImg.height) * gHeightScaled;

        const numRepeats = Math.ceil(canvasWidth / gWidthScaled) + 1;

        for (let i = 0; i < numRepeats; i++) {
            ctx.drawImage(groundImg, groundX + i * gWidthScaled, canvasHeight - groundHeight, gWidthScaled, gHeightScaled);
        }

        if (gameStarted && !gameOver) {
            groundX -= pipeSpeed;
            if (groundX <= -gWidthScaled) {
                groundX = 0;
            }
        }
    } else {
        // Fallback
        ctx.fillStyle = '#33aa33';
        ctx.fillRect(0, canvasHeight - groundHeight, canvasWidth, groundHeight);
    }
}

function drawScore() {
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4; // Logical pixels
    ctx.shadowOffsetX = 2; // Logical pixels
    ctx.shadowOffsetY = 2; // Logical pixels

    let fontSize = 32;
    let fontWeight = '';

    if (score <= 10) {
        ctx.fillStyle = 'white';
    } else if (score <= 15) {
        ctx.fillStyle = '#FFDD00';
        fontWeight = 'bold ';
    } else {
        ctx.fillStyle = '#FF5500';
        fontWeight = 'bold ';
        fontSize = 36; // Base size for pulsing
    }
    
    ctx.font = `${fontWeight}${fontSize}px Arial`; // Logical font size

    if (score > 15 && score > 10) { // Pulse effect for scores > 15 (previously score > 15 only)
        const pulseAmount = Math.sin(frames / 10) * 0.05 + 1; 
        ctx.save();
        ctx.translate(canvasWidth / 2, 50); // Logical position
        ctx.scale(pulseAmount, pulseAmount);
        ctx.fillText(score.toString(), 0, 0); // Draw at new origin
        ctx.restore(); 
    } else {
         ctx.fillText(score.toString(), canvasWidth / 2, 50); // Logical Y position
    }

    if (score > 20) {
        ctx.fillStyle = 'red';
        ctx.font = `bold ${12}px Arial`; // Logical font size
        ctx.fillText('EXTREME MODE', canvasWidth / 2, 50 + 25); // Logical Y pos
    }
    
    if (score > 10) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${14}px Arial`; // Logical font size
        ctx.shadowBlur = 2; // Logical shadow blur
        ctx.fillText('Level: ' + difficulty, canvasWidth / 2, (score > 20 ? 50 + 45 : 50 + 30)); // Logical Y pos
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawGameStartText() {
    if (!gameStarted && !gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${24}px Arial`; // Logical font size
        ctx.textAlign = 'center';
        ctx.fillText('Tap to Start', canvasWidth / 2, canvasHeight / 2 - 40);

        ctx.font = `bold ${18}px Arial`; // Logical font size
        ctx.fillStyle = currentCharacter.color || '#FFFFFF'; 
        ctx.fillText('Playing as: ' + currentCharacter.type.toUpperCase(), canvasWidth / 2, canvasHeight / 2);
        
        ctx.font = `${14}px Arial`; // Logical font size
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(currentCharacter.description, canvasWidth / 2, canvasHeight / 2 + 25);
    }
}

function drawGameOverText() {
    if (gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${32}px Arial`; 
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvasWidth / 2, canvasHeight / 2 - 70);

        ctx.font = `${24}px Arial`;
        ctx.fillText('Score: ' + score, canvasWidth / 2, canvasHeight / 2 - 30);

        if (score > 10) {
            const message = score > 25 ? 'Apple passed this time!' : 'a16z passed this time!';
            ctx.fillStyle = '#FFD700';
            ctx.font = `bold ${20}px Arial`;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
            ctx.fillText(message, canvasWidth / 2, canvasHeight / 2 + 10);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }

        // Draw rectangular Restart Button
        const btnWidth = 120; 
        const btnHeight = 40;
        const btnX = canvasWidth / 2 - btnWidth / 2;
        const btnY = canvasHeight / 2 + 40; // Position it a bit lower

        ctx.fillStyle = '#33aa33'; // Green button background
        ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

        ctx.fillStyle = 'white'; // White text
        ctx.font = `bold ${18}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; // Align text vertically in the button
        ctx.fillText('RESTART', canvasWidth / 2, btnY + btnHeight / 2);
    }
}

function updateBird() {
    if (!gameStarted || gameOver) return;

    if (score > 5) {
        if (frames % 60 === 0) {
            const variationAmount = 0.2 + (difficulty * 0.05);
            bird.speedVariation = (Math.random() * 2 - 1) * variationAmount;
        }
        bird.speedVariation *= 0.98;
    } else {
        bird.speedVariation = 0;
    }

    bird.velocity += gravity + bird.speedVariation;
    bird.y += bird.velocity;
    
    // Collision uses radius for programmatic characters, and width/height for image-based bird
    const birdTop = bird.y - (bird.type === 'bird' ? bird.height / 2 : bird.radius);
    const birdBottom = bird.y + (bird.type === 'bird' ? bird.height / 2 : bird.radius);
    const birdLeft = bird.x - (bird.type === 'bird' ? bird.width / 2 : bird.radius);
    const birdRight = bird.x + (bird.type === 'bird' ? bird.width / 2 : bird.radius);

    if (birdBottom > canvasHeight - groundHeight) {
        bird.y = canvasHeight - groundHeight - (bird.type === 'bird' ? bird.height / 2 : bird.radius);
        endGame();
    }

    if (birdTop < 0) {
        bird.y = (bird.type === 'bird' ? bird.height / 2 : bird.radius);
        bird.velocity = 0;
    }
}

function updatePipes() {
    if (!gameStarted || gameOver) return;
    updateDifficulty();

    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;

        if (!pipe.scored && pipe.x + pipeWidth < bird.x - (bird.type === 'bird' ? bird.width/2 : bird.radius)) {
            pipe.scored = true;
            score++;
        }

        // Collision detection
        const birdTop = bird.y - (bird.type === 'bird' ? bird.height / 2 : bird.radius);
        const birdBottom = bird.y + (bird.type === 'bird' ? bird.height / 2 : bird.radius);
        const birdLeft = bird.x - (bird.type === 'bird' ? bird.width / 2 : bird.radius);
        const birdRight = bird.x + (bird.type === 'bird' ? bird.width / 2 : bird.radius);

        const pipeRight = pipe.x + pipeWidth;
        const pipeTopY = pipe.gapY; // Top of the gap is the bottom of the top pipe
        const pipeBottomY = pipe.gapY + gapHeight; // Bottom of the gap is the top of the bottom pipe

        if (birdRight > pipe.x && birdLeft < pipeRight) { // Horizontal overlap
            if (birdTop < pipeTopY || birdBottom > pipeBottomY) { // Vertical collision
                 // More precise check for image-based bird if needed, for now keep it simple
                endGame();
            }
        }
    });

    pipes = pipes.filter(pipe => pipe.x > -pipeWidth);

    let shouldAddPipe = frames % pipeSpawnInterval === 0;
    let pipeOnScreen = false;
    let lastPipeFound = false;
    let currentLastPipeX = -Infinity; // Use a more robust way to find the rightmost pipe

    pipes.forEach(pipe => {
        if (pipe.x > -pipeWidth && pipe.x < canvasWidth) {
            pipeOnScreen = true;
        }
        if (pipe.x > currentLastPipeX) {
            currentLastPipeX = pipe.x;
            lastPipeFound = true;
        }
    });
    
    lastPipeX = lastPipeFound ? currentLastPipeX : -1000;

    const minGapBetweenPipes = minPipeDistance + (difficulty * 5);
    const canAddPipe = (canvasWidth - lastPipeX) >= minGapBetweenPipes;

    if (!pipeOnScreen && pipes.length === 0) { // Force spawn if no pipes and screen is empty
        shouldAddPipe = true;
    }

    if (shouldAddPipe && canAddPipe) {
        const minGapY = 80; // Min distance from top/bottom for gap start
        const maxGapYPossible = canvasHeight - gapHeight - minGapY;
        let gapY;

        const centerY = (minGapY + maxGapYPossible) / 2;
        const range = maxGapYPossible - minGapY;
        
        const numSamples = 3;
        let totalY = 0;
        for (let i = 0; i < numSamples; i++) {
            totalY += Math.random() * range + minGapY;
        }
        gapY = Math.floor(totalY / numSamples);
        gapY = Math.max(minGapY, Math.min(maxGapYPossible, gapY));

        pipes.push({ x: canvasWidth, gapY: gapY, scored: false });
        lastPipeX = canvasWidth; // Update lastPipeX to the newly added pipe's position
    }
}

function updateDifficulty() {
    let newDifficulty;
    if (score <= 10) {
        newDifficulty = 1;
    } else {
        // Increase difficulty every 2 points after score 10
        newDifficulty = Math.min(10, 1 + Math.floor((score - 10) / 2)); 
    }

    if (newDifficulty !== difficulty) {
        difficulty = newDifficulty;
        const difficultyFactor = Math.max(0, difficulty - 1); // Ensure factor is not negative if somehow difficulty becomes < 1

        if (difficulty === 1) {
            // Base difficulty settings
            pipeSpeed = 2.5;
            gapHeight = 180; 
            pipeSpawnInterval = 110; 
            gravity = currentCharacter.gravity; // Reset to character's base gravity
            jumpStrength = currentCharacter.jumpStrength; // Reset to character's base jump
        } else {
            // Scale parameters for harder difficulties
            pipeSpeed = 2.5 + (difficultyFactor * 0.25);
            gapHeight = Math.max(130, 180 - (difficultyFactor * 6)); // Decrease gap, min 130
            pipeSpawnInterval = Math.max(80, 110 - (difficultyFactor * 3)); // Decrease interval (faster spawns), min 80
            
            // Adjust gravity and jump strength to maintain control feel with increasing difficulty
            gravity = currentCharacter.gravity + (difficultyFactor * 0.04);
            jumpStrength = currentCharacter.jumpStrength - (difficultyFactor * 0.15); // More negative = stronger jump
        }
        // console.log(`Difficulty: ${difficulty}, Speed: ${pipeSpeed.toFixed(2)}, Gap: ${gapHeight}, Interval: ${pipeSpawnInterval}, Gravity: ${gravity.toFixed(2)}, Jump: ${jumpStrength.toFixed(2)}`);
    }
}

function endGame() {
    gameOver = true;
    if (tgApp) {
        try {
            tgApp.sendData(JSON.stringify({ score: score }));
        } catch (error) {
            console.error("Error sending score to Telegram:", error);
        }
    }
}

function restartGame() {
    // Prefer bird character if assets are loaded
    currentCharacterIndex = characterTypes.findIndex(ct => ct.type === 'bird' && images.bird?.complete);
    if (currentCharacterIndex === -1) { // Fallback to cycling if bird asset not ready or not preferred
        currentCharacterIndex = (characterTypes.indexOf(currentCharacter) + 1) % characterTypes.length;
    }
    currentCharacter = characterTypes[currentCharacterIndex];
    
    bird = {
        x: 80,
        y: canvasHeight / 2,
        velocity: 0,
        radius: currentCharacter.radius, 
        speedVariation: 0,
        type: currentCharacter.type,
        width: bird.type === 'bird' ? 40 : currentCharacter.radius * 2, 
        height: bird.type === 'bird' ? 30 : currentCharacter.radius * 2
    };

    // Gravity and jumpStrength are reset by updateDifficulty calling for difficulty 1
    // No need to set them directly here if updateDifficulty handles it.

    pipes = [];
    score = 0;
    gameOver = false;
    gameStarted = false;
    frames = 0;
    lastPipeX = -1000;
    groundX = 0;
    backgroundX = 0;
    difficulty = 0; // Force difficulty update on restart to reset parameters to level 1
    updateDifficulty(); 
}

function handleTap(event) {
    event.preventDefault();
    if (event.type === 'touchstart' && event.touches.length > 1) return;

    if (gameOver) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvasWidth / rect.width;
        const scaleY = canvasHeight / rect.height;

        const clickX = ((event.clientX || event.touches[0].clientX) - rect.left) * scaleX;
        const clickY = ((event.clientY || event.touches[0].clientY) - rect.top) * scaleY;
        
        // Restart button click area (logical coordinates for the new rectangular button)
        const btnWidth = 120; 
        const btnHeight = 40;
        const btnX = canvasWidth / 2 - btnWidth / 2;
        const btnY = canvasHeight / 2 + 40;

        if (
            clickX >= btnX &&
            clickX <= btnX + btnWidth &&
            clickY >= btnY &&
            clickY <= btnY + btnHeight
        ) {
            restartGame();
        }
        return;
    }

    if (!gameStarted) {
        gameStarted = true;
        // Initial jump for bird character
        if (bird.type === 'bird') bird.velocity = jumpStrength;
    }
    bird.velocity = jumpStrength;
}

// Event listeners
canvas.addEventListener('click', handleTap);
canvas.addEventListener('touchstart', handleTap, { passive: false }); // passive:false for preventDefault

// Game loop
function gameLoop() {
    // Clear the logical canvas area. Context is already scaled by DPR via resizeCanvas.
    ctx.clearRect(0, 0, canvasWidth, canvasHeight); 

    // Drawing functions now operate in logical coordinates.
    // The DPR scaling is handled globally by the transform set in resizeCanvas.
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();
    drawScore();
    drawGameStartText();
    drawGameOverText();
    
    // Game logic updates (no changes needed here for rendering)
    if (gameStarted && !gameOver) {
        updateBird();
        updatePipes();
    }

    frames++;
    requestAnimationFrame(gameLoop);
}

// Initialize and start game
// Resize on load and when window size changes
window.addEventListener('load', () => {
    preloadAssets(() => {
        // Ensure character is correctly set after assets are loaded
        currentCharacterIndex = characterTypes.findIndex(ct => ct.type === 'bird' && images.bird?.complete);
        if (currentCharacterIndex === -1) {
            currentCharacterIndex = Math.floor(Math.random() * characterTypes.length);
        }
        currentCharacter = characterTypes[currentCharacterIndex];
        bird.type = currentCharacter.type;
        bird.radius = currentCharacter.radius; // Update radius for programmatic types
        if(bird.type === 'bird'){ // Set initial dimensions for bird SVG
            bird.width = 40; bird.height = 30;
        } else { // Fallback for programmatic
            bird.width = bird.radius * 2; bird.height = bird.radius * 2;
        }

        resizeCanvas(); // Initial resize after assets loaded
        gameLoop(); // Start game loop after assets are loaded
    });
});
window.addEventListener('resize', resizeCanvas);

// Initial call to resize might be needed if load event is slow or for some browsers
// resizeCanvas(); // This is now called after asset preload
// gameLoop(); // Moved to after asset preload