let state = 'MENU';
let timeLeft = 9999999999999;
let pushValue = 0;
let memoryValue = 0;
let piecesPlacedCount = 0;
let timerInterval;

// Selectors
const screens = {
    menu: document.getElementById('phase-menu'),
    push: document.getElementById('phase-push'),
    memory: document.getElementById('phase-memory'),
    puzzle: document.getElementById('phase-puzzle'),
    lock: document.getElementById('phase-lock')
};

// Global Drag variables
let activeDragPiece = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function changePhase(newPhase) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[newPhase].classList.add('active');
    state = newPhase.toUpperCase();
    if(state === 'MEMORY') startMemorySpawner();
    if(state === 'PUZZLE') initPuzzle();
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = `Time: ${timeLeft}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("The Worm escaped!");
            location.reload();
        }
    }, 1000);
}

// Phase 1: Pushing
function handlePush() {
    pushValue += Math.random() * 0.5 + 0.5;
    document.getElementById('push-progress').style.width = (pushValue / 20 * 100) + '%';
    if (pushValue >= 20) changePhase('memory');
}

// Phase 2: Memories
function createCircle() {
    const circle = document.createElement('div');
    circle.className = 'memory-circle';
    circle.style.left = Math.random() * 70 + 15 + 'vw';
    circle.style.top = Math.random() * 60 + 20 + 'vh';
    
    circle.onpointerdown = (e) => {
        e.stopPropagation();
        memoryValue += Math.random() * 2 + 2;
        updateMemoryBar();
        circle.remove();
    };

    setTimeout(() => { if(circle.parentElement) { memoryValue -= 5; updateMemoryBar(); circle.remove(); }}, 5000);
    screens.memory.appendChild(circle);
}

function updateMemoryBar() {
    document.getElementById('memory-progress').style.width = (memoryValue / 30 * 100) + '%';
    if (memoryValue >= 30) {
        document.querySelectorAll('.memory-circle').forEach(c => c.remove());
        changePhase('puzzle');
    }
}

function startMemorySpawner() {
    const spawn = setInterval(() => {
        if (state !== 'MEMORY') clearInterval(spawn);
        else createCircle();
    }, 800);
}

// Phase 3: Puzzle Logic
function initPuzzle() {
    const puzzleZone = document.getElementById('puzzle-zone');
    const grid = document.getElementById('target-grid');
    const total = 6;
    const slots = [];

    // cleaning for debug
    const existingPieces = puzzleZone.querySelectorAll('.puzzle-piece');
    existingPieces.forEach(p => p.remove());
    piecesPlacedCount = 0;

    // 1. Define 6 distinct spawn areas (avoiding the center where the target grid is)
    // We'll define areas in percentages: [minX, maxX, minY, maxY]
    const spawnZones = [
        [5, 25, 10, 30],   // Top Left
        [70, 90, 10, 30],  // Top Right
        [5, 25, 40, 60],   // Middle Left
        [70, 90, 40, 60],  // Middle Right
        [5, 25, 70, 75],   // Bottom Left
        [70, 90, 70, 75]   // Bottom Right
    ];

    // 2. Shuffle the zones so piece #1 isn't always in the top-left
    spawnZones.sort(() => Math.random() - 0.5);

    //placement generation
    for (let i = 1; i <= total; i++) {
        const slot = document.getElementById(`slot-${i}`) || document.createElement('div');
        slot.className = 'target-slot';
        slot.innerText = `Slot ${i}`;
        slot.id = `slot-${i}`;
        grid.appendChild(slot);
        const rect = slot.getBoundingClientRect();
        slots.push({ id: i, x: rect.left, y: rect.top });
    }

    //piece genreration
    for (let i = 1; i <= total; i++) {
        const piece = document.createElement('div');
        piece.className = 'puzzle-piece';
        piece.innerText = i;

        // 3. Get the assigned zone for this piece
        const zone = spawnZones[i - 1];

        // 4. Pick a random spot WITHIN that specific zone
        const randomX = Math.random() * (zone[1] - zone[0]) + zone[0];
        const randomY = Math.random() * (zone[3] - zone[2]) + zone[2];

        piece.style.left = randomX + 'vw';
        piece.style.top = randomY + 'vh';

        piece.addEventListener('pointerdown', (e) => {
            if (piece.classList.contains('placed')) return;
            activeDragPiece = piece;
            const r = piece.getBoundingClientRect();
            dragOffsetX = e.clientX - r.left;
            dragOffsetY = e.clientY - r.top;
            window.addEventListener('pointermove', movePiece);
            window.addEventListener('pointerup', dropPiece);
        });

        puzzleZone.appendChild(piece);
    }

    function movePiece(e) {
        if (!activeDragPiece) return;
        activeDragPiece.style.left = (e.clientX - dragOffsetX) + 'px';
        activeDragPiece.style.top = (e.clientY - dragOffsetY) + 'px';
    }

    function dropPiece(e) {
        const id = parseInt(activeDragPiece.innerText);
        const slot = slots.find(s => s.id === id);
        const rect = activeDragPiece.getBoundingClientRect();
        
        if (Math.abs(rect.left - slot.x) < 40 && Math.abs(rect.top - slot.y) < 40) {
            activeDragPiece.style.left = slot.x + 'px';
            activeDragPiece.style.top = slot.y + 'px';
            activeDragPiece.classList.add('placed');
            piecesPlacedCount++;
            if (piecesPlacedCount >= total) setTimeout(() => changePhase('lock'), 600);
        }
        activeDragPiece = null;
        window.removeEventListener('pointermove', movePiece);
        window.removeEventListener('pointerup', dropPiece);
    }
}

// Events
window.addEventListener('pointerdown', () => {
    if (state === 'MENU') { changePhase('push'); startTimer(); }
    else if (state === 'PUSH') handlePush();
});

document.getElementById('final-lock-btn').onclick = () => {
    clearInterval(timerInterval);
    alert("The Door is Sealed!");
    location.reload();
};

// DEBUG
function skipTo(phaseName) {
    // 1. If a timer is running, don't stop it unless we want to, 
    // but let's ensure it's active if we skip the menu.
    if (!timerInterval && phaseName !== 'menu') {
        startTimer();
    }

    // 2. Clear any active memory circles if we are skipping OUT of the memory phase
    document.querySelectorAll('.memory-circle').forEach(c => c.remove());
    
    // 3. Reset puzzle pieces if we are skipping INTO the puzzle phase 
    // (to prevent duplicates if clicked twice)
    if (phaseName === 'puzzle') {
        const zone = document.getElementById('puzzle-zone');
        const pieces = zone.querySelectorAll('.puzzle-piece');
        pieces.forEach(p => p.remove());
        piecesPlacedCount = 0;
    }

    // 4. Change the phase
    changePhase(phaseName);
    
    console.log(`Debug: Skipped to ${phaseName}`);
}