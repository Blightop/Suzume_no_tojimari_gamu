let state = 'MENU';
let timeLeft = 25;
let pushValue = 0;
let memoryValue = 0;
let piecesPlacedCount = 0;
let timerInterval;

//scores
let totalScore = 0;
let phaseStartTime = 0;
let phaseCompletions = []; // To store [Phase Name, Time Taken, Points]

// Background vid
const videoSources = {
    MENU: 'assets/menu-bg.mp4',
    PUSH: 'assets/worm-appearing.mp4',
    MEMORY: 'assets/starry-sky.mp4',
    PUZZLE: 'assets/door-close-up.mp4',
    LOCK: 'assets/final-glow.mp4',
    SUCCESS: 'assets/victory-landscape.mp4'
};

// Selectors
const screens = {
    menu: document.getElementById('phase-menu'),
    push: document.getElementById('phase-push'),
    memory: document.getElementById('phase-memory'),
    puzzle: document.getElementById('phase-puzzle'),
    lock: document.getElementById('phase-lock'),
    success: document.getElementById('phase-success')
};

// Global Drag variables
let activeDragPiece = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function changePhase(newPhase) {
    // 1. Calculate score for the phase we are LEAVING
    const gameplayPhases = ['PUSH', 'MEMORY', 'PUZZLE', 'LOCK'];
    if (gameplayPhases.includes(state)) {
        calculatePhaseScore(state);
    }

    // 2. Switch the active screen
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[newPhase].classList.add('active');
    
    // 3. Update the state to the NEW phase
    state = newPhase.toUpperCase();

    // 4. Reset the "Lap Timer" for scoring the new phase
    phaseStartTime = Date.now();

    // 5. Handle Video Swapping
    const allVideos = document.querySelectorAll('.bg-video');
    const targetVid = document.getElementById(`vid-${newPhase}`);
    if (targetVid) {
        allVideos.forEach(v => v.classList.remove('active-vid'));
        targetVid.classList.add('active-vid');
        targetVid.currentTime = 0;
        targetVid.play().catch(() => {});
    }

    // 6. UI/Logic Toggles
    const timerElement = document.getElementById('timer');
    timerElement.style.display = (state === 'MENU' || state === 'SUCCESS') ? 'none' : 'block';

    if (state === 'SUCCESS') updateVictoryScreen();
    if (state === 'MEMORY') startMemorySpawner();
    if (state === 'PUZZLE') initPuzzle();
}



function startTimer() {
    // Clear any existing timer first to prevent "Double Speed" timers
    if (timerInterval) clearInterval(timerInterval);
    
    const timeLabel = translations[currentLang].time_label;

    timeLeft = 25; // Reset to 25 every time the ritual starts
    document.getElementById('timer').innerText = `${timeLabel}: ${timeLeft}`;

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = `${timeLabel}: ${timeLeft}`;
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
window.addEventListener('pointerdown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.id === 'lang-switcher') {
        return; 
    }
    
    if (state === 'MENU') {
        // --- ADD THIS "WARM-UP" LOOP ---
        const allVids = document.querySelectorAll('.bg-video');
        allVids.forEach(vid => {
            // Play and immediately pause to "unlock" them for the browser
            let playPromise = vid.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    if (vid.id !== 'vid-push') vid.pause();
                }).catch(error => {
                    console.log("Autoplay prevented:", error);
                });
            }
        });
        // -------------------------------

        changePhase('push');
        startTimer();
    } else if (state === 'PUSH') {
        handlePush();
    }
});

document.getElementById('final-lock-btn').onclick = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Stops the background "window" click from firing
    
    if (state === 'LOCK') {
        clearInterval(timerInterval);
        changePhase('success');
    }
};


// Scores:
function calculatePhaseScore(phaseName) {
    const timeTakenMs = Date.now() - phaseStartTime;
    const seconds = timeTakenMs / 1000;
    
    let phasePoints = 0;
    
    if (seconds <= 3) {
        phasePoints = 400;
    } else {
        // Drop 30 points for every second after 3 seconds
        const extraTime = seconds - 3;
        phasePoints = Math.max(0, 400 - Math.floor(extraTime * 30));
    }

    totalScore += phasePoints;
    
    // Store data for the final summary
    phaseCompletions.push({
        name: phaseName,
        time: seconds.toFixed(2),
        points: phasePoints
    });

    console.log(`Finished ${phaseName} in ${seconds}s. Earned: ${phasePoints}`);
}

// Update the Victory Screen with the final data
function updateVictoryScreen() {
    const summaryDiv = document.getElementById('score-summary');
    const finalScoreText = translations[currentLang].final_score;
    // Create the list of phase results
    const phaseList = phaseCompletions.map(p => `
        <p>
            <span>${p.name}: ${p.time}s</span>
            <span style="color: var(--gold); margin-left: 20px;">+${p.points}</span>
        </p>
    `).join('');
    

    summaryDiv.innerHTML = `
        <h2 style="color: var(--gold)">${finalScoreText}: ${totalScore}</h2>
        <div class="score-list">
            ${phaseList}
        </div>
    `;
}

// Language
let currentLang = 'JP'; // Default
const languages = ['JP', 'EN', 'ZH'];

const translations = {
    EN: {
        menu_tap: "Tap anywhere to begin the ritual",
        push_title: "CLOSE THE DOOR!",
        push_mash: "MASH THE SCREEN",
        mem_title: "RECALL MEMORIES",
        mem_desc: "CLICK ON THE WHITE SPOTS",
        puz_title: "RESTORE THE KEYHOLE",
        lock_title: "TAP THE LOCK",
        success_title: "THE DOOR IS SEALED",
        success_quote: '"I call upon you..."',
        retry_btn: "RETURN TO MENU",
        final_score: "FINAL SCORE",
        time_label: "Time"
    },
    JP: {
        menu_tap: "画面をタップして儀式を開始",
        push_title: "後ろ戸を閉めろ！",
        push_mash: "画面を連打してください",
        mem_title: "記憶を呼び起こす！",
        mem_desc: "白い光をタップしてください",
        puz_title: "鍵穴を修復せよ！",
        lock_title: "鍵を閉めろ！",
        success_title: "かしこみかしこみ謹んで...",
        success_quote: "「お返し申す！」",
        retry_btn: "メニューに戻る",
        final_score: "最終スコア",
        time_label: "時間"
    },
    ZH: {
        menu_tap: "點擊屏幕開始儀式",
        push_title: "關閉後門！",
        push_mash: "快速點擊屏幕！",
        mem_title: "喚醒記憶...",
        mem_desc: "點擊白色光點",
        puz_title: "修復鎖孔！",
        lock_title: "鎖上大門",
        success_title: "門扉已封印...",
        success_quote: "「奉還於爾！」",
        retry_btn: "返回主菜單",
        final_score: "最終得分",
        time_label: "時間"
    }
};

function toggleLanguage() {
    // Cycle through languages
    let currentIndex = languages.indexOf(currentLang);
    currentLang = languages[(currentIndex + 1) % languages.length];
    
    // Update button text
    document.getElementById('lang-switcher').innerText = currentLang;
    
    // Update all elements with data-i18n attribute
    updatePageLanguage();
}

function updatePageLanguage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });
}




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

    // Clear the interval if we skip to the end
    if (phaseName === 'success') {
        clearInterval(timerInterval);
        // Calculate whatever phase we were in before skipping
        calculatePhaseScore(state); 
    }

    // 4. Change the phase
    changePhase(phaseName);
    
    console.log(`Debug: Skipped to ${phaseName}`);
}