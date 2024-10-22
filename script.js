// Get the canvas element and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game variables
let ship;
let keys = {};
let asteroids = [];
let projectiles = [];
let asteroidSpeed = 1.5; // Adjusted initial asteroid speed
let score = 0;
let isPaused = false;
let gameOver = false;
let lastShotTime = 0;
const normalShotCooldown = 150; // Regular cooldown for shooting
let shotCooldown = normalShotCooldown; // Variable cooldown

// Power-up variables
let laserReady = false;
let immuneReady = false;
let bombReady = false;
let wipeReady = false;

let laserTimer = 0;
let immuneTimer = 0;
let bombTimer = 0;
let wipeTimer = 0;

let laserDuration = 3000; // 3 seconds
let immuneDuration = 6000; // 6 seconds

let laserActive = false;
let immuneActive = false;

let laserCooldown = 20000; // 20 seconds
let immuneCooldown = 30000; // 30 seconds
let bombCooldown = 15000; // 15 seconds
let wipeCooldown = 60000; // 60 seconds

// DOM elements for UI
const pauseOverlay = document.getElementById('pauseOverlay');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');

const laserIndicator = document.getElementById('laserIndicator');
const immuneIndicator = document.getElementById('immuneIndicator');
const bombIndicator = document.getElementById('bombIndicator');
const wipeIndicator = document.getElementById('wipeIndicator');

// Initialize the game
function init() {
    ship = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        rotation: 0,
        speed: 0,
        acceleration: 0.05, // Reduced acceleration
        radius: 15,
        rotationSpeed: 0.05 // Reduced rotation speed
    };
    keys = {};
    asteroids = [];
    projectiles = [];
    asteroidSpeed = 1.5; // Adjusted initial speed
    score = 0;
    isPaused = false;
    gameOver = false;
    lastShotTime = 0;
    shotCooldown = normalShotCooldown;

    // Reset power-up variables
    laserReady = false;
    immuneReady = false;
    bombReady = false;
    wipeReady = false;

    laserTimer = laserCooldown;
    immuneTimer = immuneCooldown;
    bombTimer = bombCooldown;
    wipeTimer = wipeCooldown;

    laserActive = false;
    immuneActive = false;

    // Create initial asteroids
    for (let i = 0; i < 15; i++) {
        createAsteroid();
    }

    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Event listeners for key presses
document.addEventListener('keydown', function (e) {
    keys[e.code] = true;

    // Start the game when ENTER is pressed on the start screen or game over screen
    if (e.code === 'Enter' && (startScreen.style.display !== 'none' || gameOverScreen.style.display !== 'none')) {
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        init();
    }

    // Pause/Unpause the game when ESC is pressed
    if (e.code === 'Escape' && !gameOver) {
        togglePause();
    }

    // Activate Laser Power-Up (Q)
    if (e.code === 'KeyQ' && laserReady && !laserActive) {
        activateLaser();
    }

    // Activate Immunity Power-Up (W)
    if (e.code === 'KeyW' && immuneReady && !immuneActive) {
        activateImmunity();
    }

    // Activate Bomb (E)
    if (e.code === 'KeyE' && bombReady) {
        activateBomb();
    }

    // Activate Wipe Power-Up (R)
    if (e.code === 'KeyR' && wipeReady) {
        activateWipe();
    }
});

document.addEventListener('keyup', function (e) {
    keys[e.code] = false;
});

// Resize canvas on window resize
window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Create asteroids
function createAsteroid() {
    let size = Math.random() * 20 + 20;
    let x, y;

    // Spawn asteroids at random edges
    if (Math.random() < 0.5) {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -size : canvas.height + size;
    } else {
        x = Math.random() < 0.5 ? -size : canvas.width + size;
        y = Math.random() * canvas.height;
    }

    // Calculate velocity towards the center of the screen
    let angleToCenter = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
    let speed = asteroidSpeed * (0.5 + Math.random() * 0.5); // Randomize speed a bit

    let vx = Math.cos(angleToCenter) * speed;
    let vy = Math.sin(angleToCenter) * speed;

    asteroids.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        radius: size,
        health: Math.ceil(size / 10) // Health based on size
    });
}

// Update the game state
function update(deltaTime) {
    if (gameOver || isPaused) return;

    // Control the ship
    if (keys['ArrowLeft']) {
        ship.rotation -= ship.rotationSpeed;
    }
    if (keys['ArrowRight']) {
        ship.rotation += ship.rotationSpeed;
    }
    if (keys['ArrowUp']) {
        ship.speed += ship.acceleration;
    } else {
        ship.speed *= 0.99; // Friction
    }

    // Limit ship speed
    const maxSpeed = 4;
    if (ship.speed > maxSpeed) ship.speed = maxSpeed;

    // Shooting projectiles
    const currentTime = Date.now();
    if (keys['Space']) {
        if (currentTime - lastShotTime > shotCooldown) {
            shootProjectile();
            lastShotTime = currentTime;
        }
    }

    // Move the ship
    ship.x += Math.cos(ship.rotation) * ship.speed;
    ship.y += Math.sin(ship.rotation) * ship.speed;

    // Screen wrap for the ship
    if (ship.x > canvas.width + ship.radius) ship.x = -ship.radius;
    if (ship.x < -ship.radius) ship.x = canvas.width + ship.radius;
    if (ship.y > canvas.height + ship.radius) ship.y = -ship.radius;
    if (ship.y < -ship.radius) ship.y = canvas.height + ship.radius;

    // Move asteroids
    asteroids.forEach((asteroid, index) => {
        asteroid.x += asteroid.vx;
        asteroid.y += asteroid.vy;

        // Screen wrap for asteroids
        if (asteroid.x > canvas.width + asteroid.radius) asteroid.x = -asteroid.radius;
        if (asteroid.x < -asteroid.radius) asteroid.x = canvas.width + asteroid.radius;
        if (asteroid.y > canvas.height + asteroid.radius) asteroid.y = -asteroid.radius;
        if (asteroid.y < -asteroid.radius) asteroid.y = canvas.height + asteroid.radius;

        // Check for collisions with ship
        if (!immuneActive) {
            let dx = asteroid.x - ship.x;
            let dy = asteroid.y - ship.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < asteroid.radius + ship.radius) {
                gameOver = true;
                showGameOverScreen();
            }
        }
    });

    // Move projectiles
    projectiles.forEach((projectile, pIndex) => {
        projectile.x += Math.cos(projectile.rotation) * projectile.speed;
        projectile.y += Math.sin(projectile.rotation) * projectile.speed;

        // Remove projectile if it's off-screen
        if (
            projectile.x < 0 ||
            projectile.x > canvas.width ||
            projectile.y < 0 ||
            projectile.y > canvas.height
        ) {
            projectiles.splice(pIndex, 1);
        } else {
            // Check for collisions with asteroids
            asteroids.forEach((asteroid, aIndex) => {
                let dx = asteroid.x - projectile.x;
                let dy = asteroid.y - projectile.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < asteroid.radius) {
                    if (projectile.isLaserShot) {
                        // Destroy asteroid immediately
                        asteroids.splice(aIndex, 1);
                        score += 100;
                    } else {
                        asteroid.health--;
                        projectiles.splice(pIndex, 1);

                        if (asteroid.health <= 0) {
                            asteroids.splice(aIndex, 1);
                            score += 100;
                        }
                    }
                }
            });
        }
    });

    // Update power-up timers and readiness
    updatePowerUps(deltaTime);

    // Update active bomb effects
    updateActiveBombEffects(deltaTime);

    // Increase difficulty over time
    if (score % 500 === 0 && score !== 0) {
        asteroidSpeed += 0.25; // Increase asteroid speed gradually
        // Update existing asteroids' velocities
        asteroids.forEach((asteroid) => {
            let speed = Math.sqrt(asteroid.vx * asteroid.vx + asteroid.vy * asteroid.vy) + 0.1;
            let angle = Math.atan2(asteroid.vy, asteroid.vx);
            asteroid.vx = Math.cos(angle) * speed;
            asteroid.vy = Math.sin(angle) * speed;
        });
    }

    // Add new asteroids periodically
    if (score % 100 === 0 && score !== 0) {
        createAsteroid();
    }

    score++;
}

// Function to shoot projectiles
function shootProjectile() {
    let projectile = {
        x: ship.x + Math.cos(ship.rotation) * ship.radius,
        y: ship.y + Math.sin(ship.rotation) * ship.radius,
        rotation: ship.rotation,
        speed: 10,
        radius: laserActive ? 5 : 3, // Increase size if laser is active
        length: laserActive ? 20 : 0, // Increase length if laser is active
        isLaserShot: laserActive, // Set to true if laser is active
        color: laserActive ? '#ff0000' : '#ffff00' // Red if laser is active
    };

    projectiles.push(projectile);
}

// Activate Laser Power-Up
function activateLaser() {
    laserActive = true;
    laserReady = false;
    laserTimer = laserCooldown;
    shotCooldown = 30; // Very fast shooting
    // Deactivate after duration
    setTimeout(() => {
        laserActive = false;
        shotCooldown = normalShotCooldown;
    }, laserDuration);
}

// Activate Immunity Power-Up
function activateImmunity() {
    immuneActive = true;
    immuneReady = false;
    immuneTimer = immuneCooldown;

    // Deactivate after duration
    setTimeout(() => {
        immuneActive = false;
    }, immuneDuration);
}

// Activate Bomb
function activateBomb() {
    bombReady = false;
    bombTimer = bombCooldown;

    // Create bomb effect centered on the ship
    createBombEffect(ship.x, ship.y);
}

// Create bomb effect
function createBombEffect(x, y) {
    // Increased radii by 4 times
    const destroyRadius = 200; // 50 * 4
    const damageRadius = 400;  // 100 * 4
    const bombEffectDuration = 1500; // 0.5s * 3

    // Add bomb effect to active effects
    activeBombEffects.push({
        x: x,
        y: y,
        destroyRadius: destroyRadius,
        damageRadius: damageRadius,
        startTime: Date.now(),
        duration: bombEffectDuration
    });

    // Create visual effect of two concentric rings
    createBombAnimation(x, y, destroyRadius, damageRadius, bombEffectDuration);
}

// Array to hold active bomb effects
let activeBombEffects = [];

// Update active bomb effects
function updateActiveBombEffects(deltaTime) {
    const currentTime = Date.now();

    // Apply bomb effects to asteroids
    activeBombEffects = activeBombEffects.filter((effect) => {
        let elapsedTime = currentTime - effect.startTime;
        if (elapsedTime < effect.duration) {
            // Affect asteroids within the radii
            asteroids = asteroids.filter((asteroid) => {
                let dx = asteroid.x - effect.x;
                let dy = asteroid.y - effect.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < effect.destroyRadius) {
                    score += 100;
                    return false; // Remove asteroid
                } else if (distance < effect.damageRadius) {
                    // Damage asteroid to quarter health
                    asteroid.health = Math.ceil(asteroid.health / 4);
                }
                return true; // Keep asteroid
            });
            return true; // Keep the effect active
        }
        return false; // Remove the effect after duration
    });
}

// Create bomb animation
function createBombAnimation(x, y, innerRadius, outerRadius, duration) {
    const bombEffect = document.createElement('canvas');
    bombEffect.width = canvas.width;
    bombEffect.height = canvas.height;
    bombEffect.style.position = 'absolute';
    bombEffect.style.left = '0';
    bombEffect.style.top = '0';
    bombEffect.style.pointerEvents = 'none';

    document.body.appendChild(bombEffect);
    const bombCtx = bombEffect.getContext('2d');

    let opacity = 1;
    let startTime = Date.now();

    function animate() {
        let elapsed = Date.now() - startTime;
        opacity = 1 - elapsed / duration;

        bombCtx.clearRect(0, 0, bombEffect.width, bombEffect.height);

        // Inner circle (destroy radius)
        bombCtx.beginPath();
        bombCtx.arc(x, y, innerRadius, 0, Math.PI * 2);
        bombCtx.strokeStyle = `rgba(255, 0, 0, ${opacity})`; // Red color
        bombCtx.lineWidth = 5;
        bombCtx.stroke();

        // Outer circle (damage radius)
        bombCtx.beginPath();
        bombCtx.arc(x, y, outerRadius, 0, Math.PI * 2);
        bombCtx.strokeStyle = `rgba(255, 165, 0, ${opacity})`; // Orange color
        bombCtx.lineWidth = 3;
        bombCtx.stroke();

        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            document.body.removeChild(bombEffect);
        }
    }

    animate();
}

// Activate Wipe Power-Up
function activateWipe() {
    wipeReady = false;
    wipeTimer = wipeCooldown;

    // Turn all asteroids red and then destroy them
    asteroids.forEach((asteroid) => {
        asteroid.isMarkedForWipe = true;
    });

    setTimeout(() => {
        asteroids = [];
        score += 1000; // Reward for wiping all asteroids
    }, 1000);
}

// Update power-up timers and UI indicators
function updatePowerUps(deltaTime) {
    // Laser Power-Up
    if (!laserReady) {
        laserTimer -= deltaTime;
        if (laserTimer <= 0) {
            laserReady = true;
            laserIndicator.classList.add('ready');
            laserIndicator.textContent = 'Laser';
        } else {
            laserIndicator.classList.remove('ready');
            laserIndicator.textContent = Math.ceil(laserTimer / 1000) + 's';
        }
    }

    // Immunity Power-Up
    if (!immuneReady) {
        immuneTimer -= deltaTime;
        if (immuneTimer <= 0) {
            immuneReady = true;
            immuneIndicator.classList.add('ready');
            immuneIndicator.textContent = 'Immune';
        } else {
            immuneIndicator.classList.remove('ready');
            immuneIndicator.textContent = Math.ceil(immuneTimer / 1000) + 's';
        }
    }

    // Bomb Power-Up
    if (!bombReady) {
        bombTimer -= deltaTime;
        if (bombTimer <= 0) {
            bombReady = true;
            bombIndicator.classList.add('ready');
            bombIndicator.textContent = 'Bomb';
        } else {
            bombIndicator.classList.remove('ready');
            bombIndicator.textContent = Math.ceil(bombTimer / 1000) + 's';
        }
    }

    // Wipe Power-Up
    if (!wipeReady) {
        wipeTimer -= deltaTime;
        if (wipeTimer <= 0) {
            wipeReady = true;
            wipeIndicator.classList.add('ready');
            wipeIndicator.textContent = 'Wipe';
        } else {
            wipeIndicator.classList.remove('ready');
            wipeIndicator.textContent = Math.ceil(wipeTimer / 1000) + 's';
        }
    }
}

// Draw everything on the canvas
function draw() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.rotation);

    ctx.beginPath();
    ctx.moveTo(ship.radius, 0);
    ctx.lineTo(-ship.radius, ship.radius / 2);
    ctx.lineTo(-ship.radius, -ship.radius / 2);
    ctx.closePath();

    ctx.fillStyle = immuneActive ? '#00ff00' : '#ffffff'; // Green when immune
    ctx.fill();
    ctx.restore();

    // Draw asteroids
    asteroids.forEach((asteroid) => {
        ctx.beginPath();
        ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
        ctx.fillStyle = asteroid.isMarkedForWipe ? '#ff0000' : '#888888'; // Red if marked for wipe
        ctx.fill();
    });

    // Draw projectiles
    projectiles.forEach((projectile) => {
        // Draw projectile
        ctx.save();
        ctx.translate(projectile.x, projectile.y);
        ctx.rotate(projectile.rotation);

        if (projectile.length > 0) {
            // Draw as a line (laser-like)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(projectile.length, 0);
            ctx.strokeStyle = projectile.color || '#ffff00';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Draw as a circle
            ctx.beginPath();
            ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
            ctx.fillStyle = projectile.color || '#ffff00';
            ctx.fill();
        }

        ctx.restore();
    });

    // Draw the score
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
}

// The game loop
let lastTime = 0;
function gameLoop(timeStamp) {
    let deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;

    update(deltaTime);
    draw();

    if (!gameOver && !isPaused) {
        requestAnimationFrame(gameLoop);
    }
}

// Toggle pause state
function togglePause() {
    isPaused = !isPaused;

    if (isPaused) {
        pauseOverlay.classList.remove('hidden');
    } else {
        pauseOverlay.classList.add('hidden');
        requestAnimationFrame(gameLoop);
    }
}

// Show game over screen
function showGameOverScreen() {
    gameOverScreen.classList.remove('hidden');
    finalScoreDisplay.textContent = 'Your Score: ' + score;
}
