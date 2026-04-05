let isPlaying = false;
let startTime = 0;
let playerY = 0;
let velocityY = 0;
let isJumping = false;
let isSliding = false;
let gameTime = 0;


let knockbackActive = false;
const penaltyDistance = 300; // How far Daijin jumps forward on hit
const maxDistance = 900;     // If Daijin gets further than this, it's Game Over
const gravity = -0.1;
const jumpForce = 6;
const player = document.getElementById('player');
const target = document.getElementById('target');
const slideBtn = document.getElementById('slide-btn');

//QTE
let isQTE = false;
let isImmune = false;
let qteScale = 300; // Starting size of the ring
const qteTargetSize = 100;
const qteTolerance = 20; // How "perfect" the click needs to be
let isPenaltyActive = false;

//Dajin settings
let targetX = 800; // Starting distance

function startGame() {
    document.getElementById('menu-overlay').classList.add('hidden');
    isPlaying = true;
    startTime = Date.now();
    gameLoop();
    spawnObstacles();
}

function gameLoop() {
    if (!isPlaying) return;

    // 1. Update Timer
    gameTime = (Date.now() - startTime) / 1000;
    document.getElementById('timer').innerText = `Time: ${gameTime.toFixed(1)}s`;

    // 2. Gravity & Jump
    velocityY += gravity;
    playerY += velocityY;

    if (playerY <= 0) {
        playerY = 0;
        velocityY = 0;
        isJumping = false;
    }
    player.style.bottom = (100 + playerY) + 'px';

    if (!isQTE && !isPenaltyActive) {
        gameTime = (Date.now() - startTime) / 1000;
        document.getElementById('timer').innerText = `Time: ${gameTime.toFixed(1)}s`;

        if (targetX > 150) {
            targetX -= 0.3; 
        } else {
            checkCatch();
        }
        target.style.left = targetX + 'px';

        if (targetX > maxDistance) {
            gameOver();
        }
    }

    requestAnimationFrame(gameLoop);
}

// Input Handling
window.addEventListener('pointerdown', (e) => {
    if (e.target.id !== 'slide-btn' && !isJumping && isPlaying) {
        velocityY = jumpForce;
        isJumping = true;
    }
});

slideBtn.addEventListener('pointerdown', () => {
    if (!isJumping) {
        isSliding = true;
        player.style.height = '25px'; // Shrink
    }
});

window.addEventListener('pointerup', () => {
    isSliding = false;
    player.style.height = '50px'; // Reset
});

function spawnObstacles() {
    if (!isPlaying) return;

    if (isQTE) {
        setTimeout(spawnObstacles, 500);
        return;
    }

    const obs = document.createElement('div');
    const isGate = Math.random() > 0.5;
    obs.className = isGate ? 'obstacle gate' : 'obstacle';
    obs.style.left = '100vw';
    document.getElementById('game-container').appendChild(obs);

    let obsX = window.innerWidth;
    const moveObs = setInterval(() => {
        if (!isPlaying) { clearInterval(moveObs); obs.remove(); return; }
        
        if (isQTE) return;

        obsX -= 8; // Speed of obstacles
        obs.style.left = obsX + 'px';

        // Collision Detection
        const pRect = player.getBoundingClientRect();
        const oRect = obs.getBoundingClientRect();
        if (!isQTE && !isImmune) {
        if (pRect.left < oRect.right && pRect.right > oRect.left &&
            pRect.top < oRect.bottom && pRect.bottom > oRect.top) {
            // 1. Prevent multiple hits from the same obstacle
            obs.remove();
            clearInterval(moveObs);

            // 2. Penalty: Move Daijin (White Box) forward
            let distanceMoved = 0;
            const totalPush = 150; // Total distance to slide back
            const pushSpeed = 10;  // How many pixels to move per frame
            const slideBack = setInterval(() => {
                targetX += pushSpeed; // Move a tiny bit every 16ms
                distanceMoved += pushSpeed;
                target.style.left = targetX + 'px'; // Ensure visual update

                // Stop once we've moved the full 300px
                if (distanceMoved >= totalPush) {
                    clearInterval(slideBack);
                }
            }, 16); // 16ms is roughly 1 frame

            // 3. Visual Feedback: Make the player flicker red
            isImmune = true; // This prevents more hits
            player.classList.add('flashing');
                setTimeout(() => {
                    isImmune = false;
                    player.classList.remove('flashing');
                }, 3000);

        }}
        if (targetX > maxDistance) {
            gameOver();
        }

        if (obsX < -50) { clearInterval(moveObs); obs.remove(); }
    }, 16);

    setTimeout(spawnObstacles, Math.random() * 1500 + 1000);
}

function checkCatch() {
    if (targetX <= 150 && !isQTE) {
        startQTE(); 
    }
}

function gameOver() {
    isPlaying = false;
    alert("Daijin escaped into the distance!");
    location.reload();
}


function startQTE() {
    isQTE = true;
    qteScale = 300;
    const ring = document.getElementById('qte-ring');
    document.getElementById('qte-container').classList.remove('hidden');
    
    const qteInterval = setInterval(() => {
        if (!isQTE) { 
            clearInterval(qteInterval); 
            return; 
        }
        
        qteScale -= 6; // Slightly faster shrink for better feel
        ring.style.width = qteScale + 'px';
        ring.style.height = qteScale + 'px';
        
        // No more manual top/left math needed because of CSS transform!

        if (qteScale <= 0) {
            failQTE();
            clearInterval(qteInterval);
        }
    }, 16);
}

// Handle the click during QTE
window.addEventListener('pointerdown', (e) => {
    if (!isQTE) return;
    
    // Calculate the difference between ring and target
    const diff = Math.abs(qteScale - qteTargetSize);
    
    if (diff <= qteTolerance) {
        victory();
    } else {
        failQTE();
    }
});

function victory() {
    isQTE = false;
    isPlaying = false;
    document.getElementById('qte-container').classList.add('hidden');
    document.getElementById('victory-overlay').classList.remove('hidden');
    document.getElementById('final-time').innerText = `Chase Duration: ${gameTime.toFixed(2)}s`;
}

function failQTE() {
    isQTE = false;
    isPenaltyActive = true; // Block the gameLoop from pulling him back
    document.getElementById('qte-container').classList.add('hidden');
    
    // 2. Penalty: Move Daijin (White Box) forward
    let slideBack = setInterval(() => {
        if (targetX >= 800 || !isPlaying) { 
            isPenaltyActive = false; // Allow gameLoop to take over again
            clearInterval(slideBack); 
            return;
        }
        targetX += 10;
        target.style.left = targetX + 'px'; // CRITICAL: Updates the visual position
    }, 16);


    // Immunity Period
    isImmune = true;
    player.classList.add('flashing');
    setTimeout(() => {
        isImmune = false;
        player.classList.remove('flashing');
    }, 3000);
}