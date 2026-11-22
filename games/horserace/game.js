// ======================================================
//  SETTINGS - change these to change the game!
// ======================================================
var SETTINGS = {
  answersToWin: 10,          // right answers needed to reach the finish line
  speed: 2,                  // starting speed of the other horses, 1 (slow) to 5 (fast)
  raceSeconds: [110, 85, 65, 50, 38],  // seconds the other horses take to finish, for speed 1 to 5
  racers: ["🐎", "🦄", "🦓", "🐪", "🐕"], // pick one; the others race against you
  choices: 3,                // how many answer buttons

  // Math: answers go up to mathMax. Use ["+"] for adding only.
  mathMax: 10,
  mathOps: ["+", "-"],

  // Sight words (Dolch pre-primer + primer). Add or remove words freely.
  sightWords: [
    "and", "away", "big", "blue", "can", "come", "down", "find", "for", "funny", "go",
    "help", "here", "I", "in", "is", "it", "jump", "little", "look", "make", "me", "my",
    "not", "one", "play", "red", "run", "said", "see", "the", "three", "to", "two", "up",
    "we", "where", "yellow", "you",
    "all", "am", "are", "at", "ate", "be", "black", "brown", "but", "came", "did", "do",
    "eat", "four", "get", "good", "have", "he", "into", "like", "must", "new", "no", "now",
    "on", "our", "out", "please", "pretty", "ran", "ride", "saw", "say", "she", "so",
    "soon", "that", "there", "they", "this", "too", "under", "want", "was", "well",
    "went", "what", "white", "who", "will", "with", "yes"
  ],
  // Words that sound the same are never shown together (you can't tell them apart by ear).
  sameSound: [
    ["to", "two", "too"], ["for", "four"], ["no", "know"], ["ate", "eight"], ["one", "won"],
    ["red", "read"], ["blue", "blew"], ["see", "sea"], ["be", "bee"], ["there", "their"],
    ["new", "knew"], ["our", "hour"], ["so", "sew"], ["here", "hear"], ["I", "eye"]
  ],
  soundOn: true
};
// ======================================================

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  var track = $("track"), promptEl = $("prompt"), choicesEl = $("choices"), sayBtn = $("say");
  var overlay = $("overlay"), titleEl = $("overlay-title"), textEl = $("overlay-text");
  var startBtn = $("start"), muteBtn = $("mute"), countdownEl = $("countdown");
  var speedEl = $("speed"), winsEl = $("wins");

  var MODES = [
    { id: "words", label: "📖 Words" },
    { id: "math", label: "➕ Math" },
    { id: "mix", label: "🔀 Both" }
  ];

  // ---------- small helpers ----------
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ---------- saved choices + wins ----------
  var choice = { racer: SETTINGS.racers[0], mode: "words", speed: SETTINGS.speed };
  var wins = 0;
  try {
    var saved = JSON.parse(localStorage.getItem("horserace-choice") || "{}");
    if (SETTINGS.racers.indexOf(saved.racer) >= 0) { choice.racer = saved.racer; }
    if (MODES.some(function (m) { return m.id === saved.mode; })) { choice.mode = saved.mode; }
    if (saved.speed >= 1 && saved.speed <= 5) { choice.speed = saved.speed; }
    wins = parseInt(localStorage.getItem("horserace-wins") || "0", 10) || 0;
  } catch (e) {}
  function save() {
    try {
      localStorage.setItem("horserace-choice", JSON.stringify(choice));
      localStorage.setItem("horserace-wins", String(wins));
    } catch (e) {}
  }
  winsEl.textContent = wins;
  speedEl.value = choice.speed;

  // ---------- sound (made with code, no sound files) ----------
  var audioCtx = null;
  function unlockAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { audioCtx = new AC(); }
    }
    if (audioCtx && audioCtx.state === "suspended") { audioCtx.resume(); }
  }
  function beep(freq, length, type, delay) {
    if (!SETTINGS.soundOn || !audioCtx) { return; }
    var t = audioCtx.currentTime + (delay || 0);
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t); osc.stop(t + length);
  }
  var sounds = {
    right: function () { beep(660, 0.1); beep(990, 0.18, "square", 0.1); },
    wrong: function () { beep(220, 0.25, "triangle"); },
    tick:  function () { beep(520, 0.15); },
    go:    function () { beep(1040, 0.4); },
    win:   function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.25, "square", i * 0.15); }); },
    done:  function () { [523, 659, 784].forEach(function (f, i) { beep(f, 0.25, "triangle", i * 0.15); }); }
  };

  muteBtn.addEventListener("click", function () {
    SETTINGS.soundOn = !SETTINGS.soundOn;
    muteBtn.textContent = SETTINGS.soundOn ? "🔔" : "🔕";
  });

  // ---------- talking (the iPad's built-in voice) ----------
  function say(text) {
    if (!("speechSynthesis" in window)) { return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.8;
    speechSynthesis.speak(u);
  }

  // ---------- questions ----------
  var deck = [], lastWord = null;
  function nextWord() {
    if (!deck.length) { deck = shuffle(SETTINGS.sightWords.slice()); }
    return deck.pop();
  }
  function soundsSame(a, b) {
    if (a === b) { return true; }
    return SETTINGS.sameSound.some(function (g) { return g.indexOf(a) >= 0 && g.indexOf(b) >= 0; });
  }
  function wordQuestion() {
    var word = nextWord();
    if (word === lastWord) { word = nextWord(); }
    lastWord = word;
    var options = [word];
    shuffle(SETTINGS.sightWords.slice()).forEach(function (w) {
      if (options.length < SETTINGS.choices && !options.some(function (o) { return soundsSame(o, w); })) {
        options.push(w);
      }
    });
    return { kind: "words", speak: word, answer: word, choices: shuffle(options) };
  }
  function mathQuestion() {
    var max = Math.max(2, SETTINGS.mathMax);
    var op = pick(SETTINGS.mathOps), a, b, ans;
    if (op === "+") { ans = randInt(2, max); a = randInt(1, ans - 1); b = ans - a; }
    else { a = randInt(2, max); b = randInt(1, a - 1); ans = a - b; }
    var nums = [ans], tries = 0;
    while (nums.length < SETTINGS.choices && tries++ < 100) {
      var n = ans + randInt(-3, 3);
      if (n >= 0 && nums.indexOf(n) < 0) { nums.push(n); }
    }
    var sign = op === "+" ? "+" : "−";
    return {
      kind: "math",
      show: a + " " + sign + " " + b + " = ?",
      speak: a + (op === "+" ? " plus " : " minus ") + b,
      answer: String(ans),
      choices: shuffle(nums).map(String)
    };
  }

  var q = null, locked = false;
  function showQuestion() {
    var kind = choice.mode === "mix" ? pick(["words", "math"]) : choice.mode;
    q = kind === "math" ? mathQuestion() : wordQuestion();
    if (q.kind === "words") {
      promptEl.textContent = "Find the word:";
      promptEl.className = "small";
      say(q.speak);
    } else {
      promptEl.textContent = q.show;
      promptEl.className = "";
    }
    sayBtn.hidden = false;
    choicesEl.innerHTML = "";
    q.choices.forEach(function (c) {
      var btn = document.createElement("button");
      btn.className = "choice";
      btn.textContent = c;
      btn.addEventListener("click", function () { answer(btn, c); });
      choicesEl.appendChild(btn);
    });
    locked = false;
  }
  sayBtn.addEventListener("click", function () { if (q) { say(q.speak); } });

  function answer(btn, c) {
    if (locked || !racing) { return; }
    if (c === q.answer) {
      locked = true;
      btn.classList.add("right");
      sounds.right();
      correct++;
      setPos(player, correct / SETTINGS.answersToWin);
      if (correct >= SETTINGS.answersToWin) { finish(); }
      else { setTimeout(showQuestion, 700); }
    } else {
      btn.classList.add("wrong");
      btn.disabled = true;
      sounds.wrong();
      if (q.kind === "words") { setTimeout(function () { say(q.speak); }, 300); }
    }
  }

  // ---------- the race ----------
  var racing = false, correct = 0, finishedAhead = 0, lastT = 0;
  var player = null, others = [];

  function setPos(r, p) {
    r.pos = Math.min(1, p);
    r.el.style.setProperty("--p", r.pos);
    if (r.pos >= 1) { r.el.classList.add("done"); }
  }

  function makeLane(emoji, isYou) {
    var lane = document.createElement("div");
    lane.className = "lane" + (isYou ? " you" : "");
    if (isYou) {
      var tag = document.createElement("span");
      tag.className = "you-tag"; tag.textContent = "YOU";
      lane.appendChild(tag);
    }
    var runner = document.createElement("div");
    runner.className = "runner" + (isYou ? " you" : "");
    var face = document.createElement("span");
    face.textContent = emoji;
    runner.appendChild(face);
    lane.appendChild(runner);
    track.appendChild(lane);
    return { el: runner, pos: 0 };
  }

  function buildTrack() {
    track.innerHTML = "";
    var rivals = shuffle(SETTINGS.racers.filter(function (r) { return r !== choice.racer; })).slice(0, 3);
    var secs = SETTINGS.raceSeconds[choice.speed - 1];
    others = rivals.map(function (emoji) {
      var r = makeLane(emoji, false);
      r.speed = (1 / secs) * (0.88 + Math.random() * 0.24); // each rival a little different
      return r;
    });
    player = makeLane(choice.racer, true); // your lane is at the bottom, next to the questions
    [player].concat(others).forEach(function (r) { setPos(r, 0); });
  }

  function frame(t) {
    if (!racing) { return; }
    var dt = Math.min(0.1, (t - lastT) / 1000); // pause-safe: big gaps count as 0.1s
    lastT = t;
    others.forEach(function (r) {
      if (r.pos >= 1) { return; }
      setPos(r, r.pos + r.speed * dt * (0.6 + Math.random() * 0.8));
      if (r.pos >= 1) { finishedAhead++; }
    });
    requestAnimationFrame(frame);
  }

  function startRace() {
    unlockAudio();
    say("Let's race!"); // also wakes up the iPad's voice, which needs a tap first
    save();
    overlay.classList.add("hidden");
    buildTrack();
    correct = 0; finishedAhead = 0; q = null;
    promptEl.textContent = ""; choicesEl.innerHTML = ""; sayBtn.hidden = true;

    var n = 3;
    countdownEl.textContent = n; countdownEl.classList.add("show"); sounds.tick();
    var timer = setInterval(function () {
      n--;
      if (n > 0) { countdownEl.textContent = n; sounds.tick(); }
      else if (n === 0) {
        countdownEl.textContent = "GO!"; sounds.go();
        racing = true;
        track.classList.add("running");
        lastT = performance.now();
        requestAnimationFrame(frame);
        showQuestion();
      } else {
        clearInterval(timer);
        countdownEl.classList.remove("show");
      }
    }, 800);
  }

  var PLACES = [
    { title: "🏆 You won!", text: "First place! Amazing!" },
    { title: "🥈 2nd place!", text: "So close! Great racing!" },
    { title: "🥉 3rd place!", text: "Nice job! Keep practicing!" },
    { title: "🏁 You finished!", text: "Great try! Want to race again?" }
  ];

  function finish() {
    racing = false;
    track.classList.remove("running");
    choicesEl.innerHTML = ""; sayBtn.hidden = true;
    var place = finishedAhead; // 0 = first
    if (place === 0) { wins++; save(); winsEl.textContent = wins; sounds.win(); confetti(); }
    else { sounds.done(); }
    promptEl.className = ""; promptEl.textContent = PLACES[place].title;
    setTimeout(function () {
      titleEl.textContent = PLACES[place].title;
      textEl.textContent = PLACES[place].text;
      startBtn.textContent = "Race again!";
      overlay.classList.remove("hidden");
    }, 2200);
  }

  function confetti() {
    for (var i = 0; i < 40; i++) {
      var s = document.createElement("span");
      s.className = "confetti";
      s.textContent = pick(["🎉", "⭐", "🌟", "🏆", "🎊", "🥕"]);
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDuration = (1.5 + Math.random() * 1.5) + "s";
      s.style.animationDelay = Math.random() * 0.6 + "s";
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 4000);
    }
  }

  // ---------- start screen ----------
  function buildPicks(container, items, isSelected, onPick, extraClass) {
    container.innerHTML = "";
    items.forEach(function (item) {
      var b = document.createElement("button");
      b.className = "pick" + (extraClass ? " " + extraClass : "");
      if (extraClass) { b.textContent = item.label; }
      else { var s = document.createElement("span"); s.textContent = item; b.appendChild(s); }
      if (isSelected(item)) { b.classList.add("selected"); }
      b.addEventListener("click", function () {
        onPick(item);
        Array.prototype.forEach.call(container.children, function (x) { x.classList.remove("selected"); });
        b.classList.add("selected");
      });
      container.appendChild(b);
    });
  }
  buildPicks($("racers"), SETTINGS.racers,
    function (r) { return r === choice.racer; }, function (r) { choice.racer = r; });
  buildPicks($("modes"), MODES,
    function (m) { return m.id === choice.mode; }, function (m) { choice.mode = m.id; }, "mode");
  speedEl.addEventListener("input", function () { choice.speed = parseInt(speedEl.value, 10); });

  buildTrack(); // show the horses lined up behind the start screen
  sayBtn.hidden = true;
  startBtn.addEventListener("click", startRace);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && "speechSynthesis" in window) { speechSynthesis.cancel(); }
  });
})();
