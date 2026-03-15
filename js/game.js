// Initialize Telegram Mini App
const tgApp = window.Telegram?.WebApp;
if (tgApp) {
    tgApp.expand();
    tgApp.ready();
}

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// ============================================
// Web Audio API Sound System
// ============================================
let audioCtx = null;

function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* Audio not supported */ }
}

function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function playFlapSound() {
    if (!audioCtx) return;
    try {
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(540, t + 0.07);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.start(t);
        osc.stop(t + 0.07);
    } catch (e) {}
}

function playScoreSound() {
    if (!audioCtx) return;
    try {
        const t = audioCtx.currentTime;
        // Two-tone ascending ding like original
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'square';
        osc1.frequency.value = 880;
        gain1.gain.setValueAtTime(0.06, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc1.start(t);
        osc1.stop(t + 0.1);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'square';
        osc2.frequency.value = 1320;
        gain2.gain.setValueAtTime(0.06, t + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
        osc2.start(t + 0.07);
        osc2.stop(t + 0.17);
    } catch (e) {}
}

function playHitSound() {
    if (!audioCtx) return;
    try {
        const t = audioCtx.currentTime;
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.12);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const gain = audioCtx.createGain();
        source.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.2, t);
        source.start(t);
    } catch (e) {}
}

function playDieSound() {
    if (!audioCtx) return;
    try {
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.3);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
    } catch (e) {}
}

// ============================================
// Asset Loading
// ============================================
const assetPaths = {
    bird: 'assets/images/bird.svg',
    pipe: 'assets/images/pipe.svg',
    ground: 'assets/images/ground.svg',
    background: 'assets/images/background.svg'
};

const images = {};
let assetsLoaded = 0;
const totalAssets = Object.keys(assetPaths).length;

function preloadAssets(callback) {
    for (const key in assetPaths) {
        images[key] = new Image();
        images[key].onload = () => {
            assetsLoaded++;
            if (assetsLoaded === totalAssets) callback();
        };
        images[key].onerror = () => {
            console.error('Error loading asset:', assetPaths[key]);
            assetsLoaded++;
            if (assetsLoaded === totalAssets) callback();
        };
        images[key].src = assetPaths[key];
    }
}

// ============================================
// Canvas Sizing
// ============================================
const canvasWidth = 360;
const canvasHeight = 640;
let dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const windowRatio = window.innerWidth / window.innerHeight;
    const gameRatio = canvasWidth / canvasHeight;
    let displayWidth, displayHeight;

    if (windowRatio < gameRatio) {
        displayWidth = window.innerWidth;
        displayHeight = window.innerWidth / gameRatio;
    } else {
        displayWidth = window.innerHeight * gameRatio;
        displayHeight = window.innerHeight;
    }

    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
}

// ============================================
// Game Constants (fixed — like original Flappy Bird)
// ============================================
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8.5;
const PIPE_SPEED = 2.5;
const GAP_HEIGHT = 140;
const PIPE_WIDTH = 55;
const PIPE_SPAWN_INTERVAL = 90;
const GROUND_HEIGHT = 80;
const MIN_PIPE_DISTANCE = 200;
const BIRD_WIDTH = 40;
const BIRD_HEIGHT = 30;
const BIRD_X = 80;

// ============================================
// Game State
// ============================================
const STATE = { IDLE: 'idle', PLAYING: 'playing', DYING: 'dying', DEAD: 'dead' };
let gameState = STATE.IDLE;

// Bird
let bird = {
    x: BIRD_X,
    y: canvasHeight / 2 - 40,
    velocity: 0,
    rotation: 0,
    width: BIRD_WIDTH,
    height: BIRD_HEIGHT
};

// Pipes
let pipes = [];

// Score
let score = 0;
let bestScore = getBestScore();

// Delta-time variables
let lastFrameTime = 0;
let dt = 1;
let gameTime = 0;
let idleTime = 0;
let pipeSpawnTimer = 0;

// Scrolling
let groundX = 0;
let backgroundX = 0;

// Effects
let flashAlpha = 0;
let gameOverTimer = 0;

// Pipe tracking
let lastPipeX = -1000;

// ============================================
// Best Score (localStorage)
// ============================================
function getBestScore() {
    try { return parseInt(localStorage.getItem('flappyBestScore')) || 0; }
    catch { return 0; }
}

function saveBestScore(s) {
    try { localStorage.setItem('flappyBestScore', s.toString()); }
    catch {}
}

// ============================================
// Helper: Rounded Rectangle
// ============================================
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

// ============================================
// Drawing Functions
// ============================================

function drawBackground() {
    if (images.background && images.background.complete) {
        const bgWidth = images.background.width;
        const numRepeats = Math.ceil(canvasWidth / bgWidth) + 1;
        for (let i = 0; i < numRepeats; i++) {
            ctx.drawImage(images.background, backgroundX + i * bgWidth, 0, bgWidth, canvasHeight);
        }
        if (gameState === STATE.IDLE || gameState === STATE.PLAYING) {
            backgroundX -= PIPE_SPEED / 3 * dt;
            if (backgroundX <= -bgWidth) backgroundX += bgWidth;
        }
    } else {
        ctx.fillStyle = '#71c5cf';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
}

function drawGround() {
    if (images.ground && images.ground.complete) {
        const gHeightScaled = GROUND_HEIGHT;
        const gWidthScaled = (images.ground.width / images.ground.height) * gHeightScaled;
        const numRepeats = Math.ceil(canvasWidth / gWidthScaled) + 1;
        for (let i = 0; i < numRepeats; i++) {
            ctx.drawImage(images.ground, groundX + i * gWidthScaled, canvasHeight - GROUND_HEIGHT, gWidthScaled, gHeightScaled);
        }
        if (gameState === STATE.IDLE || gameState === STATE.PLAYING) {
            groundX -= PIPE_SPEED * dt;
            if (groundX <= -gWidthScaled) groundX += gWidthScaled;
        }
    } else {
        // Fallback ground
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(0, canvasHeight - GROUND_HEIGHT, canvasWidth, GROUND_HEIGHT);
        ctx.fillStyle = '#7CFC00';
        ctx.fillRect(0, canvasHeight - GROUND_HEIGHT, canvasWidth, 4);
    }
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    if (images.bird && images.bird.complete) {
        ctx.drawImage(images.bird, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    } else {
        // Fallback: yellow circle with eye
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(5, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(6, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.moveTo(10, -2);
        ctx.lineTo(18, 0);
        ctx.lineTo(10, 3);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

function drawPipes() {
    pipes.forEach(pipe => {
        if (images.pipe && images.pipe.complete) {
            // Top pipe (flipped)
            ctx.save();
            ctx.translate(pipe.x, pipe.gapY);
            ctx.scale(1, -1);
            ctx.drawImage(images.pipe, 0, 0, PIPE_WIDTH, pipe.gapY);
            ctx.restore();

            // Bottom pipe
            const bottomPipeHeight = canvasHeight - GROUND_HEIGHT - (pipe.gapY + GAP_HEIGHT);
            ctx.drawImage(images.pipe, pipe.x, pipe.gapY + GAP_HEIGHT, PIPE_WIDTH, bottomPipeHeight);
        } else {
            // Fallback: green rectangles with caps
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
            ctx.fillRect(pipe.x, pipe.gapY + GAP_HEIGHT, PIPE_WIDTH, canvasHeight - (pipe.gapY + GAP_HEIGHT));

            // Pipe caps (wider than body, like original)
            ctx.fillStyle = '#388E3C';
            ctx.fillRect(pipe.x - 3, pipe.gapY - 26, PIPE_WIDTH + 6, 26);
            ctx.fillRect(pipe.x - 3, pipe.gapY + GAP_HEIGHT, PIPE_WIDTH + 6, 26);
        }
    });
}

function drawScore() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 42px Arial';
    // White text with dark outline (like original)
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineJoin = 'round';
    ctx.strokeText(score.toString(), canvasWidth / 2, 45);
    ctx.fillStyle = 'white';
    ctx.fillText(score.toString(), canvasWidth / 2, 45);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';
}

function drawStartScreen() {
    ctx.textAlign = 'center';

    // "GET READY" text
    ctx.font = 'bold 34px Arial';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineJoin = 'round';
    ctx.strokeText('GET READY', canvasWidth / 2, canvasHeight / 2 - 110);
    ctx.fillStyle = 'white';
    ctx.fillText('GET READY', canvasWidth / 2, canvasHeight / 2 - 110);

    // Tap instruction
    ctx.font = '20px Arial';
    ctx.strokeText('Tap to Flap', canvasWidth / 2, canvasHeight / 2 + 30);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('Tap to Flap', canvasWidth / 2, canvasHeight / 2 + 30);

    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';
}

function drawGameOver() {
    // Fade in
    const alpha = Math.min(gameOverTimer / 20, 1);

    // Semi-transparent overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * alpha})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (alpha < 0.2) return;
    ctx.globalAlpha = alpha;

    // "GAME OVER" text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 38px Arial';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineJoin = 'round';
    ctx.strokeText('GAME OVER', canvasWidth / 2, 195);
    ctx.fillStyle = 'white';
    ctx.fillText('GAME OVER', canvasWidth / 2, 195);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';

    // Score panel
    const panelW = 240, panelH = 120;
    const panelX = (canvasWidth - panelW) / 2;
    const panelY = 220;

    // Panel background
    ctx.fillStyle = '#DED895';
    ctx.strokeStyle = '#846B29';
    ctx.lineWidth = 3;
    roundRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.fill();
    ctx.stroke();

    // Inner highlight border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, panelX + 4, panelY + 4, panelW - 8, panelH - 8, 7);
    ctx.stroke();

    // Medal (if score >= 10)
    if (score >= 10) {
        const medalX = panelX + 42;
        const medalY = panelY + panelH / 2;
        const medalR = 22;
        let medalColor;
        if (score >= 40) medalColor = '#E5E4E2';      // Platinum
        else if (score >= 30) medalColor = '#FFD700';  // Gold
        else if (score >= 20) medalColor = '#C0C0C0';  // Silver
        else medalColor = '#CD7F32';                   // Bronze

        // Medal shadow
        ctx.beginPath();
        ctx.arc(medalX + 1, medalY + 1, medalR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();

        // Medal circle
        ctx.beginPath();
        ctx.arc(medalX, medalY, medalR, 0, Math.PI * 2);
        ctx.fillStyle = medalColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Star on medal
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('\u2605', medalX, medalY);
    }

    // Score
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#846B29';
    ctx.fillText('SCORE', panelX + panelW - 20, panelY + 18);
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText(score.toString(), panelX + panelW - 20, panelY + 33);

    // Best
    ctx.font = '14px Arial';
    ctx.fillStyle = '#846B29';
    ctx.fillText('BEST', panelX + panelW - 20, panelY + 68);
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText(bestScore.toString(), panelX + panelW - 20, panelY + 83);

    // Restart button
    const btnW = 120, btnH = 42;
    const btnX = (canvasWidth - btnW) / 2;
    const btnY = panelY + panelH + 25;

    // Button shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    roundRect(ctx, btnX + 1, btnY + 2, btnW, btnH, 8);
    ctx.fill();

    // Button
    ctx.fillStyle = '#5CBF2A';
    ctx.strokeStyle = '#4A9922';
    ctx.lineWidth = 2;
    roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('PLAY', canvasWidth / 2, btnY + btnH / 2);

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
}

// ============================================
// Update Functions
// ============================================

function updateBird() {
    // Apply gravity and move
    bird.velocity += GRAVITY * dt;
    bird.y += bird.velocity * dt;

    // Rotation: snap up on flap, gradually rotate down when falling
    if (bird.velocity < -2) {
        bird.rotation = -Math.PI / 6;
    } else if (bird.velocity > 0) {
        bird.rotation = Math.min(bird.rotation + 0.08 * dt, Math.PI / 2);
    }

    // Ground collision → immediate death
    if (bird.y + bird.height / 2 >= canvasHeight - GROUND_HEIGHT) {
        bird.y = canvasHeight - GROUND_HEIGHT - bird.height / 2;
        triggerDeath(true);
        return;
    }

    // Ceiling clamp
    if (bird.y - bird.height / 2 < 0) {
        bird.y = bird.height / 2;
        bird.velocity = 0;
    }

    // Pipe collision
    const buffer = 3;
    const birdTop = bird.y - bird.height / 2 + buffer;
    const birdBottom = bird.y + bird.height / 2 - buffer;
    const birdLeft = bird.x - bird.width / 2 + buffer;
    const birdRight = bird.x + bird.width / 2 - buffer;

    for (const pipe of pipes) {
        // Scoring: bird passed the pipe
        if (!pipe.scored && pipe.x + PIPE_WIDTH < birdLeft) {
            pipe.scored = true;
            score++;
            playScoreSound();
        }

        // Collision check
        if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
            if (birdTop < pipe.gapY || birdBottom > pipe.gapY + GAP_HEIGHT) {
                triggerDeath(false);
                return;
            }
        }
    }
}

function updatePipes() {
    // Move pipes
    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED * dt;
    });

    // Remove off-screen pipes
    pipes = pipes.filter(pipe => pipe.x > -PIPE_WIDTH);

    // Spawn timing
    pipeSpawnTimer += dt;
    let shouldSpawn = pipeSpawnTimer >= PIPE_SPAWN_INTERVAL;

    // Find rightmost pipe
    let rightmostX = -1000;
    pipes.forEach(pipe => {
        if (pipe.x > rightmostX) rightmostX = pipe.x;
    });
    lastPipeX = rightmostX;

    const canSpawn = (canvasWidth - lastPipeX) >= MIN_PIPE_DISTANCE;

    // Force spawn if no pipes on screen
    if (pipes.length === 0) shouldSpawn = true;

    if (shouldSpawn && canSpawn) {
        pipeSpawnTimer = 0;

        // Gap position with 3-sample averaging for better distribution
        const minGapY = 80;
        const maxGapY = canvasHeight - GROUND_HEIGHT - GAP_HEIGHT - 80;
        const range = maxGapY - minGapY;

        let totalY = 0;
        for (let i = 0; i < 3; i++) {
            totalY += Math.random() * range + minGapY;
        }
        const gapY = Math.max(minGapY, Math.min(maxGapY, Math.floor(totalY / 3)));

        pipes.push({ x: canvasWidth, gapY, scored: false });
        lastPipeX = canvasWidth;
    }
}

// ============================================
// Game Events
// ============================================

function triggerDeath(hitGround) {
    if (gameState !== STATE.PLAYING) return;

    flashAlpha = 1;
    playHitSound();

    // Send score to Telegram
    if (tgApp) {
        try { tgApp.sendData(JSON.stringify({ score })); }
        catch (e) { console.error('Error sending score to Telegram:', e); }
    }

    if (hitGround) {
        // Hit ground directly — immediately dead
        gameState = STATE.DEAD;
        bird.velocity = 0;
        bird.rotation = Math.PI / 2;
        gameOverTimer = 0;
        if (score > bestScore) {
            bestScore = score;
            saveBestScore(bestScore);
        }
    } else {
        // Hit pipe — bounce up, then fall to ground
        gameState = STATE.DYING;
        bird.velocity = -5;
        playDieSound();
    }
}

function restartGame() {
    gameState = STATE.IDLE;
    bird = {
        x: BIRD_X,
        y: canvasHeight / 2 - 40,
        velocity: 0,
        rotation: 0,
        width: BIRD_WIDTH,
        height: BIRD_HEIGHT
    };
    pipes = [];
    score = 0;
    lastPipeX = -1000;
    groundX = 0;
    backgroundX = 0;
    pipeSpawnTimer = 0;
    gameTime = 0;
    idleTime = 0;
    flashAlpha = 0;
    gameOverTimer = 0;
}

function handleTap(event) {
    event.preventDefault();
    if (event.type === 'touchstart' && event.touches.length > 1) return;

    // Initialize audio on first user interaction (browser autoplay policy)
    if (!audioCtx) initAudio();
    resumeAudio();

    switch (gameState) {
        case STATE.IDLE:
            gameState = STATE.PLAYING;
            bird.velocity = JUMP_STRENGTH;
            playFlapSound();
            break;

        case STATE.PLAYING:
            bird.velocity = JUMP_STRENGTH;
            playFlapSound();
            break;

        case STATE.DYING:
            break; // Ignore input during death animation

        case STATE.DEAD: {
            if (gameOverTimer < 20) break; // UI not ready yet

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvasWidth / rect.width;
            const scaleY = canvasHeight / rect.height;
            const clientX = event.touches ? event.touches[0].clientX : event.clientX;
            const clientY = event.touches ? event.touches[0].clientY : event.clientY;
            const clickX = (clientX - rect.left) * scaleX;
            const clickY = (clientY - rect.top) * scaleY;

            // Restart button bounds (must match drawGameOver layout)
            const panelY = 220, panelH = 120;
            const btnW = 120, btnH = 42;
            const btnX = (canvasWidth - btnW) / 2;
            const btnY = panelY + panelH + 25;

            if (clickX >= btnX && clickX <= btnX + btnW &&
                clickY >= btnY && clickY <= btnY + btnH) {
                restartGame();
            }
            break;
        }
    }
}

// Event listeners
canvas.addEventListener('click', handleTap);
canvas.addEventListener('touchstart', handleTap, { passive: false });

// ============================================
// Game Loop
// ============================================

function gameLoop(timestamp) {
    if (!timestamp) timestamp = performance.now();
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    const elapsed = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // Normalize to 60fps (16.667ms = dt of 1.0)
    const rawDt = elapsed / 16.667;
    dt = rawDt > 5 ? 0 : Math.min(rawDt, 2);

    // ---- UPDATE ----
    switch (gameState) {
        case STATE.IDLE:
            idleTime += dt;
            // Bird bobs up and down gently (like original start screen)
            bird.y = canvasHeight / 2 - 40 + Math.sin(idleTime / 8) * 8;
            bird.rotation = 0;
            break;

        case STATE.PLAYING:
            updateBird();
            updatePipes();
            gameTime += dt;
            break;

        case STATE.DYING:
            // Bird falls with gravity and rotates nose-down
            bird.velocity += GRAVITY * 1.2 * dt;
            bird.y += bird.velocity * dt;
            bird.rotation = Math.min(bird.rotation + 0.12 * dt, Math.PI / 2);
            flashAlpha *= Math.pow(0.85, dt);

            // Ceiling clamp during death
            if (bird.y < bird.height / 2) bird.y = bird.height / 2;

            // Bird hits ground → transition to DEAD
            if (bird.y + bird.height / 2 >= canvasHeight - GROUND_HEIGHT) {
                bird.y = canvasHeight - GROUND_HEIGHT - bird.height / 2;
                bird.rotation = Math.PI / 2;
                gameState = STATE.DEAD;
                gameOverTimer = 0;
                playHitSound();
                if (score > bestScore) {
                    bestScore = score;
                    saveBestScore(bestScore);
                }
            }
            break;

        case STATE.DEAD:
            gameOverTimer += dt;
            break;
    }

    // ---- DRAW ----
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawBackground();
    drawPipes();
    drawGround();
    drawBird();

    // State-specific UI
    if (gameState === STATE.IDLE) {
        drawScore();
        drawStartScreen();
    } else if (gameState === STATE.PLAYING) {
        drawScore();
    } else if (gameState === STATE.DYING) {
        drawScore();
        // White flash effect (fades out)
        if (flashAlpha > 0.01) {
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    } else if (gameState === STATE.DEAD) {
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);
}

// ============================================
// Initialize
// ============================================

window.addEventListener('load', () => {
    preloadAssets(() => {
        resizeCanvas();
        gameLoop();
    });
});

window.addEventListener('resize', resizeCanvas);
