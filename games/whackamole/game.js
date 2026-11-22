// ======================================================
//  SETTINGS - change these numbers and emoji to change the game!
// ======================================================
var SETTINGS = {
  roundSeconds: 30,          // how long one round lasts
  animals: ["🐹", "🐴", "🐰", "🐸", "🦖", "🐱"],  // pick from these (add your own emoji!)
  speed: 3,                  // starting speed, 1 (slow) to 5 (fast)
  speedFactors: [1.6, 1.25, 1, 0.75, 0.55],  // time multiplier for speed 1 to 5 (smaller = faster)
  bonusEmoji: "⭐",          // a rare bonus thing
  bonusChance: 0.12,         // 0 = never, 1 = always
  bonusPoints: 5,            // points for a bonus
  spawnEveryMs: 700,         // how often a new mole pops up (smaller = faster)
  stayUpMsMin: 600,          // how long a mole stays up, shortest
  stayUpMsMax: 1100,         // how long a mole stays up, longest
  backgroundColor: "#7ec850",
  holeColor: "#5b3a1e",
  soundOn: true
};
// ======================================================

(function () {
  "use strict";

  var board = document.getElementById("board");
  var scoreEl = document.getElementById("score");
  var timeEl = document.getElementById("time");
  var bestEl = document.getElementById("best");
  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayText = document.getElementById("overlay-text");
  var startBtn = document.getElementById("start");
  var muteBtn = document.getElementById("mute");

  document.documentElement.style.setProperty("--bg", SETTINGS.backgroundColor);
  document.documentElement.style.setProperty("--hole", SETTINGS.holeColor);

  // ---------- saved best score ----------
  var best = 0;
  try { best = parseInt(localStorage.getItem("whackamole-best") || "0", 10) || 0; } catch (e) {}
  bestEl.textContent = best;

  // ---------- sound (made with code, no sound files) ----------
  var audioCtx = null;

  function unlockAudio() {
    // iPad needs a tap before sound can play. Called from the Start button.
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { audioCtx = new AC(); }
    }
    if (audioCtx && audioCtx.state === "suspended") { audioCtx.resume(); }
  }

  // Play one beep: frequency (Hz), length (seconds), wave type, delay (seconds)
  function beep(freq, length, type, delay) {
    if (!SETTINGS.soundOn || !audioCtx) { return; }
    var t = audioCtx.currentTime + (delay || 0);
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  var sounds = {
    hit:   function () { beep(520, 0.08, "square"); beep(780, 0.1, "square", 0.06); },
    bonus: function () { beep(660, 0.1, "triangle"); beep(880, 0.1, "triangle", 0.09); beep(1320, 0.18, "triangle", 0.18); },
    miss:  function () { beep(160, 0.15, "sawtooth"); },
    start: function () { beep(440, 0.1, "triangle"); beep(660, 0.15, "triangle", 0.1); },
    end:   function () { beep(660, 0.15, "triangle"); beep(520, 0.15, "triangle", 0.15); beep(390, 0.3, "triangle", 0.3); }
  };

  muteBtn.addEventListener("click", function () {
    SETTINGS.soundOn = !SETTINGS.soundOn;
    muteBtn.textContent = SETTINGS.soundOn ? "🔊" : "🔇";
  });
  muteBtn.textContent = SETTINGS.soundOn ? "🔊" : "🔇";

  // ---------- build the 3 x 3 board ----------
  var holes = [];
  for (var i = 0; i < 9; i++) {
    var hole = document.createElement("div");
    hole.className = "hole";
    var mole = document.createElement("div");
    mole.className = "mole";
    hole.appendChild(mole);
    board.appendChild(hole);
    holes.push({ el: hole, moleEl: mole, up: false, bonus: false, timer: null });
  }

  // ---------- game state ----------
  var score = 0;
  var timeLeft = 0;
  var playing = false;
  var spawnTimer = null;
  var clockTimer = null;

  function hideMole(h) {
    clearTimeout(h.timer);
    h.up = false;
    h.el.classList.remove("up", "hit");
  }

  function showMole() {
    // pick a hole that is empty
    var free = holes.filter(function (h) { return !h.up; });
    if (free.length === 0) { return; }
    var h = free[Math.floor(Math.random() * free.length)];
    h.bonus = Math.random() < SETTINGS.bonusChance;
    h.moleEl.textContent = h.bonus ? SETTINGS.bonusEmoji : currentAnimal;
    h.up = true;
    h.el.classList.add("up");
    var stay = (SETTINGS.stayUpMsMin + Math.random() * (SETTINGS.stayUpMsMax - SETTINGS.stayUpMsMin)) * speedFactor;
    h.timer = setTimeout(function () { hideMole(h); }, stay);
  }

  function setScore(n) {
    score = Math.max(0, n);
    scoreEl.textContent = score;
  }

  function whack(h) {
    if (!playing) { return; }
    if (h.up && !h.el.classList.contains("hit")) {
      h.el.classList.add("hit");
      clearTimeout(h.timer);
      setScore(score + (h.bonus ? SETTINGS.bonusPoints : 1));
      (h.bonus ? sounds.bonus : sounds.hit)();
      h.timer = setTimeout(function () { hideMole(h); }, 180);
    } else if (!h.up) {
      sounds.miss();
    }
  }

  holes.forEach(function (h) {
    // pointerdown works for mouse AND touch
    h.el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      whack(h);
    });
  });

  function startGame() {
    unlockAudio();
    speedFactor = SETTINGS.speedFactors[parseInt(speedEl.value, 10) - 1] || 1;
    try { localStorage.setItem("whackamole-speed", speedEl.value); } catch (e) {}
    setScore(0);
    timeLeft = SETTINGS.roundSeconds;
    timeEl.textContent = timeLeft;
    playing = true;
    overlay.classList.add("hidden");
    holes.forEach(hideMole);
    sounds.start();

    spawnTimer = setInterval(showMole, SETTINGS.spawnEveryMs * speedFactor);
    clockTimer = setInterval(function () {
      timeLeft -= 1;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) { endGame(); }
    }, 1000);
  }

  function endGame() {
    playing = false;
    clearInterval(spawnTimer);
    clearInterval(clockTimer);
    holes.forEach(hideMole);
    sounds.end();

    var message = "You got " + score + "!";
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("whackamole-best", String(best)); } catch (e) {}
      message += " New best score! 🎉";
    }
    overlayTitle.textContent = "Time's up!";
    overlayText.textContent = message;
    startBtn.textContent = "Play again";
    overlay.classList.remove("hidden");
  }

  // ---------- animal picker and speed slider ----------
  var animalsEl = document.getElementById("animals");
  var speedEl = document.getElementById("speed");
  var currentAnimal = SETTINGS.animals[0];
  var speedFactor = 1;

  speedEl.value = SETTINGS.speed;
  try {
    var savedAnimal = localStorage.getItem("whackamole-animal");
    if (savedAnimal && SETTINGS.animals.indexOf(savedAnimal) !== -1) { currentAnimal = savedAnimal; }
    var savedSpeed = parseInt(localStorage.getItem("whackamole-speed"), 10);
    if (savedSpeed >= 1 && savedSpeed <= SETTINGS.speedFactors.length) { speedEl.value = savedSpeed; }
  } catch (e) {}

  var animalButtons = SETTINGS.animals.map(function (emoji) {
    var b = document.createElement("button");
    b.className = "animal-btn";
    b.textContent = emoji;
    b.addEventListener("click", function () {
      currentAnimal = emoji;
      try { localStorage.setItem("whackamole-animal", emoji); } catch (e) {}
      showSelected();
    });
    animalsEl.appendChild(b);
    return b;
  });

  function showSelected() {
    animalButtons.forEach(function (b) {
      var on = b.textContent === currentAnimal;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  showSelected();

  startBtn.addEventListener("click", startGame);
})();
