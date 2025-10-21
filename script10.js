// 10.20 final edits
// alt different audio path
//--to do
// change Node appearance (1)
// change compass into bubble (1)
// able to toggle the map (1)
// leave message changes btn changes to bubble trigger  (1)
// change control btn to fit the design style  (1)
//update audio message for the sites (1)

// --- Global Variables ---
let nodes = [];
let activeTargetNode = null; // The node player is currently guided towards

let playerPos;
let playerAngle = -Math.PI / 2; // Start facing up
let rotationSpeed = 0.1;
let isRotatingLeft = false;
let isRotatingRight = false;

// --- Game State ---
let gameHasStarted = false;

// Web Audio API variables
let audioContext;
let isAudioSetup = false;
// --- MODIFICATION START: Changed variables to handle multiple arrival sounds ---
let decodedArrivalAudioBuffers = []; // Array for the 4 decoded arrival sounds
let arrivalAudioArrayBuffers = []; // Array for the 4 preloaded arrival sound files
// --- MODIFICATION END ---
let decodedSpatialAudioBuffers = []; // This will be example1, 2, 3
let spatialAudioArrayBuffers = [];

// Recording variables
let mediaRecorder;
let isRecording = false;
let recordedChunks = [];

// Color definitions
const COLOR_NODE = [220, 220, 200]; // Light gray
const COLOR_NODE_VISITED = [150, 200, 255]; // Light blue for visited
const COLOR_PLAYER = [80, 100, 255]; // Blue
const COLOR_NODE_USER = [255, 180, 80]; // Orange for user-created nodes
const COLOR_NODE_ARR = [
  [110, 220, 200],
  [250, 180, 180],
  [220, 220, 150],
  [150, 230, 150],
];
const EMOJI_ARR = [
  "🌲",
  "🍄",
  "☕",
  "🌈",
  "🪵",
  "⛈️",
  "🌈",
  "🪶",
  "🍃",
  "🪺",
  "❄️",
  "🌳",
];
// DOM element references
let canvasContainer, instructions, arrowContainer, arrow, distanceText;
let replayButton, startButton;
let leaveMessageButton;
let leftTurnButton, rightTurnButton;
let bubbleEmoji, ring;

//img variables
let bgImg, emojiShadow, startBtn;

// --- P5.js Main Functions ---

async function preload() {
  bgImg = loadImage("./assets/map.png");
  emojiShadow = loadImage("./assets/shadow.png");
  startBtn = loadImage("./assets/start-btn.png");
  // --- MODIFICATION START: Fetch four different arrival sounds for the nodes ---
  try {
    const arrivalPaths = [
      "./assets/arrival1.mp3",
      "./assets/arrival2.mp3",
      "./assets/arrival3.mp3",
      "./assets/arrival4.mp3",
    ];
    const responses = await Promise.all(
      arrivalPaths.map((path) => fetch(path))
    );
    arrivalAudioArrayBuffers = await Promise.all(
      responses.map((res) => res.arrayBuffer())
    );
  } catch (e) {
    console.error("Could not preload one or more arrival sounds.", e);
  }
  // --- MODIFICATION END ---

  // --- This part for spatial sounds remains the same ---
  const spatialPaths = [
    "./assets/example1.mp3",
    "./assets/example2.mp3",
    "./assets/example3.mp3",
    "./assets/example4.mp3",
  ];
  try {
    const responses = await Promise.all(
      spatialPaths.map((path) => fetch(path))
    );
    spatialAudioArrayBuffers = await Promise.all(
      responses.map((res) => res.arrayBuffer())
    );
  } catch (e) {
    console.error(
      "Could not preload one or more spatial navigation sounds.",
      e
    );
  }
}

function setup() {
  canvasContainer = select("#canvas-container");
  const canvas = createCanvas(canvasContainer.width, canvasContainer.height);
  canvas.parent("canvas-container");

  // Initialize DOM elements
  instructions = select("#instructions");
  arrowContainer = select("#arrow-container");
  arrow = select("#arrow");
  distanceText = select("#distance");
  bubbleEmoji = select("#bubble-emoji");
  ring = select("#arrow-container-ring");

  playerPos = createVector(width / 2, height - 80);

  // Initialize the positions of the four nodes
  nodes.push(new Node(width * 0.25, height * 0.4, 1));
  nodes.push(new Node(width * 0.3, height * 0.8, 2));
  nodes.push(new Node(width * 0.5, height * 0.15, 3));
  nodes.push(new Node(width * 0.7, height * 0.55, 4));

  // Create and style the START button
  startButton = createImg("./assets/start-btn.png", "Start button");
  startButton.parent("canvas-container");
  startButton.size(166, 55); // optional size
  startButton.position(width / 2 - 78, height / 2 - 27); // absolute position
  startButton.style("position", "absolute");
  startButton.style("cursor", "pointer");
  startButton.mousePressed(() => {
    startGame();
  });

  // --- MODIFICATION: Create and style the runtime replay button ---
  replayButton = createButton("Replay");
  replayButton.parent(canvasContainer);
  replayButton.position(width - 120, height - 70); // Positioned at bottom right
  replayButton.mousePressed(resetGame);
  replayButton.style("background-color", "rgba(230, 80, 80, 0.9)"); // Red color for reset
  replayButton.style("border", "none");
  replayButton.style("color", "white");
  replayButton.style("padding", "12px 24px");
  replayButton.style("font-size", "16px");
  replayButton.style("font-weight", "bold");
  replayButton.style("border-radius", "25px");
  replayButton.style("cursor", "pointer");
  replayButton.style("box-shadow", "0 4px 8px rgba(0,0,0,0.2)");
  replayButton.style("transition", "background-color 0.3s");
  replayButton.mouseOver(() =>
    replayButton.style("background-color", "rgba(200, 60, 60, 0.9)")
  );
  replayButton.mouseOut(() =>
    replayButton.style("background-color", "rgba(230, 80, 80, 0.9)")
  );
  replayButton.hide();

  // Set up the leave message button
  leaveMessageButton = select("#leave-message");
  if (leaveMessageButton) {
    leaveMessageButton.mousePressed(toggleRecording);
  }

  if (ring) {
    ring.mousePressed(toggleRecording);
    ring.mouseReleased(toggleRecording);
  }

  // Create and set up turn buttons
  leftTurnButton = createButton("⟲");
  rightTurnButton = createButton("⟳");

  [leftTurnButton, rightTurnButton].forEach((button) => {
    button.parent(canvasContainer);
    button.style("background-color", "rgba(100, 100, 100, 0.7)");
    button.style("border", "none");
    button.style("color", "white");
    button.style("font-size", "32px");
    button.style("width", "60px");
    button.style("height", "60px");
    button.style("border-radius", "50%");
    button.style("cursor", "pointer");
    button.style("line-height", "50px");
    button.style("text-align", "center");

    button.hide(); // Hide at start
  });

  leftTurnButton.position(40, height - 80);
  rightTurnButton.position(120, height - 80);

  leftTurnButton.mousePressed(() => (isRotatingLeft = true));
  leftTurnButton.mouseReleased(() => (isRotatingLeft = false));
  rightTurnButton.mousePressed(() => (isRotatingRight = true));
  rightTurnButton.mouseReleased(() => (isRotatingRight = false));

  instructions.html("Click Start to begin your exploration.");
}

function draw() {
  background(bgImg);

  // Draw all nodes
  for (let node of nodes) {
    node.draw();
  }

  // Only run game logic after the start button is pressed
  if (!gameHasStarted) {
    drawPlayer(playerPos); // Draw player statically
    return;
  }

  // Player movement and rotation is always active
  playerPos.x = constrain(mouseX, 20, width - 20);
  playerPos.y = constrain(mouseY, 20, height - 20);
  if (isRotatingLeft) playerAngle -= rotationSpeed;
  if (isRotatingRight) playerAngle += rotationSpeed;
  noCursor();

  // Manage navigation and check for arrivals
  manageNavigation();
  if (activeTargetNode) {
    checkForArrival(activeTargetNode);
  }

  // Update instruction if all original nodes are visited
  const allPresetNodesVisited = nodes
    .filter((n) => !n.isUserNode)
    .every((node) => node.visited);
  if (allPresetNodesVisited) {
    if (!isRecording)
      instructions.html(
        "<b>All preset nodes visited!</b> You can still explore or click Replay."
      );
  }

  drawPlayer(playerPos);
}

// New function to initialize audio and start the game
async function startGame() {
  if (isAudioSetup) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // --- MODIFICATION START: Decode all audio files (both arrival and spatial) ---
  // Create all decoding promises for arrival sounds
  const arrivalPromises = arrivalAudioArrayBuffers.map((buffer) =>
    audioContext.decodeAudioData(buffer.slice(0))
  );

  // Create all decoding promises for spatial sounds
  const spatialPromises = spatialAudioArrayBuffers.map((buffer) =>
    audioContext.decodeAudioData(buffer.slice(0))
  );

  // Wait for all decodings to complete
  try {
    const allPromises = [...arrivalPromises, ...spatialPromises];
    const results = await Promise.allSettled(allPromises);

    // Separate the results
    const arrivalResults = results.slice(0, arrivalPromises.length);
    const spatialResults = results.slice(arrivalPromises.length);

    // Process and store the decoded arrival buffers
    decodedArrivalAudioBuffers = arrivalResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    if (decodedArrivalAudioBuffers.length === 0) {
      throw new Error("No arrival sounds could be decoded.");
    }

    // Process and store the decoded spatial buffers
    decodedSpatialAudioBuffers = spatialResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    if (decodedSpatialAudioBuffers.length === 0) {
      throw new Error("No spatial sounds could be decoded.");
    }

    // Assign sounds to the initial nodes
    nodes.forEach((node, index) => {
      if (!node.isUserNode) {
        // Assign a random SPATIAL sound
        const randomIndex = floor(random(decodedSpatialAudioBuffers.length));
        node.spatialAudioBuffer = decodedSpatialAudioBuffers[randomIndex];

        // Assign a specific ARRIVAL sound based on the node's index
        // Use modulo operator (%) to safely loop through sounds if there are more nodes than sounds
        node.arrivalAudioBuffer =
          decodedArrivalAudioBuffers[index % decodedArrivalAudioBuffers.length];
      }
    });
    // --- MODIFICATION END ---

    setupAllNodeAudio();
    isAudioSetup = true;
    gameHasStarted = true;

    // Update UI
    startButton.hide();
    leftTurnButton.show();
    rightTurnButton.show();
    replayButton.show();
    updateInstructions();
  } catch (e) {
    console.error("Error during audio setup:", e);
    instructions.html("<b>Error:</b> Could not prepare audio files.");
  }
}

// --- Event Handlers ---

function windowResized() {
  resizeCanvas(canvasContainer.width, canvasContainer.height);
  nodes.forEach((node, i) => {
    const positions = [
      { x: 0.25, y: 0.4 },
      { x: 0.3, y: 0.8 },
      { x: 0.5, y: 0.15 },
      { x: 0.7, y: 0.55 },
    ];
    if (i < positions.length && !node.isUserNode) {
      node.pos.set(width * positions[i].x, height * positions[i].y);
    }
  });

  startButton.position(width / 2 - 50, height / 2 + 20);
  replayButton.position(width - 120, height - 70);
  leftTurnButton.position(20, height - 70);
  rightTurnButton.position(80, height - 70);

  if (isAudioSetup) {
    for (let node of nodes) {
      node.updatePannerPosition();
    }
  }
}

function mousePressed() {
  // This function is intentionally left blank as the start button handles audio initialization.
}

function keyPressed() {
  if (!gameHasStarted) return;
  if (key === "q" || key === "Q") isRotatingLeft = true;
  if (key === "e" || key === "E") isRotatingRight = true;
  if (key === "m" || key === "M") {
    toggleRecording();
  }
  if (key === "r" || key === "R") {
    resetGame();
  }
}

function keyReleased() {
  if (key === "q" || key === "Q") isRotatingLeft = false;
  if (key === "e" || key === "E") isRotatingRight = false;
  if (key === "m" || key === "M") {
    toggleRecording();
  }
}

// --- Recording Functions ---

function toggleRecording() {
  if (!isAudioSetup) {
    instructions.html("Please click Start to enable audio first.");
    return;
  }
  isRecording ? stopRecording() : startRecording();
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    isRecording = true;
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(recordedChunks, { type: "audio/webm" });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
      const newNode = new Node(
        playerPos.x,
        playerPos.y,
        floor(random(EMOJI_ARR.length))
      );
      newNode.isUserNode = true;
      newNode.recordedAudioBuffer = decodedAudio;
      newNode.justCreated = true;

      // Assign a random spatial sound to the new user node
      if (decodedSpatialAudioBuffers.length > 0) {
        const randomIndex = floor(random(decodedSpatialAudioBuffers.length));
        newNode.spatialAudioBuffer = decodedSpatialAudioBuffers[randomIndex];
      }

      nodes.push(newNode);
      if (isAudioSetup) {
        newNode.setupAudio(audioContext, newNode.spatialAudioBuffer);
      }
      stream.getTracks().forEach((track) => track.stop());
    };
    mediaRecorder.start();
    leaveMessageButton.html("Stop Recording");
    instructions.html("<b>Recording</b>...release to stop recording.");
  } catch (err) {
    instructions.html("<b>Error:</b> Could not access microphone.");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    isRecording = false;
    leaveMessageButton.html("Leave a Message");
    updateInstructions();
  }
}

// --- Audio and UI Update Functions ---

function manageNavigation() {
  let nodesInRange = [];
  for (let node of nodes) {
    if (node.visited || node.justCreated) continue;
    const d = dist(playerPos.x, playerPos.y, node.pos.x, node.pos.y);
    if (d < node.triggerRadius) {
      nodesInRange.push({ node: node, dist: d });
    }
  }
  let closestNode = null;
  if (nodesInRange.length > 0) {
    nodesInRange.sort((a, b) => a.dist - b.dist);
    closestNode = nodesInRange[0].node;
  }
  activeTargetNode = closestNode;
  if (activeTargetNode) {
    updateInfoPanel(activeTargetNode);
    updateAudio(activeTargetNode);
  } else {
    resetInfoPanel();
    for (let node of nodes) {
      if (node.gainNode) {
        node.gainNode.gain.linearRampToValueAtTime(
          0,
          audioContext.currentTime + 0.1
        );
      }
    }
  }
}

function setupAllNodeAudio() {
  // Pass the node's specific spatial buffer
  for (let node of nodes) {
    if (node.spatialAudioBuffer) {
      node.setupAudio(audioContext, node.spatialAudioBuffer);
    }
  }
}

function updateAudio(targetNode) {
  if (!isAudioSetup || !targetNode) return;
  const audioX = map(playerPos.x, 0, width, -10, 10);
  const audioY = map(playerPos.y, 0, height, -10, 10);
  audioContext.listener.setPosition(audioX, 0, audioY);
  const forwardX = Math.cos(playerAngle);
  const forwardZ = Math.sin(playerAngle);
  audioContext.listener.setOrientation(forwardX, 0, forwardZ, 0, 1, 0);

  for (let node of nodes) {
    if (node.gainNode) {
      if (node === targetNode) {
        const d = dist(playerPos.x, playerPos.y, node.pos.x, node.pos.y);
        const volume = map(d, node.triggerRadius, 0, 0, 1);
        node.gainNode.gain.linearRampToValueAtTime(
          volume,
          audioContext.currentTime + 0.1
        );
      } else {
        node.gainNode.gain.linearRampToValueAtTime(
          0,
          audioContext.currentTime + 0.1
        );
      }
    }
  }
  push();
  noFill();
  stroke(COLOR_PLAYER[0], COLOR_PLAYER[1], COLOR_PLAYER[2], 50);
  strokeWeight(4);
  circle(targetNode.pos.x, targetNode.pos.y, targetNode.triggerRadius * 2);
  pop();
}

function updateInfoPanel(targetNode) {
  if (!targetNode) {
    return;
  }
  // arrowContainer.style("opacity", "0");

  arrowContainer.style("opacity", "1");
  const direction = p5.Vector.sub(targetNode.pos, playerPos);
  const angleToNode = direction.heading();
  const relativeAngle = angleToNode - playerAngle;
  arrow.style("transform", `rotate(${relativeAngle}rad)`);
  const d = dist(playerPos.x, playerPos.y, targetNode.pos.x, targetNode.pos.y);
  distanceText.html(`${(d / 0.2).toFixed(0)} m`);
}

function resetInfoPanel() {
  arrowContainer.style("opacity", "0");
  distanceText.html("-- m");
}

function updateInstructions() {
  if (!gameHasStarted) {
    instructions.html("Click Start to begin your exploration.");
    return;
  }
  if (isRecording) return;
  instructions.html(
    // "Touch and drag to <b>move around</b>. Use bottom left buttons to <b>turn around</b>. Long press navigation bubble to <b>leave a message</b>"
    "<b>move</b> and <b>turn around</b>. Long press navigation bubble to <b>leave a message</b>"
  );
}

function checkForArrival(targetNode) {
  if (!targetNode || targetNode.visited || targetNode.justCreated) return;

  const d = dist(playerPos.x, playerPos.y, targetNode.pos.x, targetNode.pos.y);
  if (d < targetNode.radius) {
    targetNode.visited = true;
    if (targetNode.isUserNode) {
      playRecordedSound(targetNode.recordedAudioBuffer);
      addEmojiToCompass(targetNode.nodeEmoji);
    } else {
      // --- MODIFICATION START: Play the specific arrival sound for the visited node ---
      playArrivalSound(targetNode.arrivalAudioBuffer);
      // --- MODIFICATION END ---
      addEmojiToCompass(targetNode.nodeEmoji);
      console.log(targetNode);
    }
  }
}

function addEmojiToCompass(emoji) {
  // console.log(emoji);
  bubbleEmoji.html(emoji);
  ring.style("opacity", "1");

  setTimeout(() => {
    bubbleEmoji.html("");
    ring.style("opacity", "0");
  }, 8000);
}

// --- MODIFICATION START: This function now accepts a buffer to play ---
function playArrivalSound(buffer) {
  if (!audioContext || !buffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
}
// --- MODIFICATION END ---

function playRecordedSound(buffer) {
  if (!audioContext || !buffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
}

// --- Drawing and Game State Functions ---

function drawPlayer(pos) {
  push();
  translate(pos.x, pos.y);
  rotate(playerAngle + HALF_PI);
  noStroke();
  fill(COLOR_PLAYER);
  beginShape();
  vertex(-12, 12);
  vertex(0, 6);
  vertex(12, 12);
  vertex(0, -18);
  endShape(CLOSE);
  pop();
}

function resetGame() {
  for (let node of nodes) {
    node.visited = false;
    node.justCreated = false;
  }
  updateInstructions();
  cursor(ARROW);
}

// --- Node Class ---
class Node {
  constructor(x, y, i = 0) {
    this.pos = createVector(x, y);
    this.radius = 20;
    this.triggerRadius = 180;
    this.gainNode = null;
    this.pannerNode = null;
    this.audioSource = null;
    this.visited = false;
    this.isUserNode = false;
    this.recordedAudioBuffer = null;
    this.justCreated = false;
    this.spatialAudioBuffer = null;
    // --- MODIFICATION START: Add a property to hold the node's specific arrival sound ---
    this.arrivalAudioBuffer = null;
    // --- MODIFICATION END ---
    this.nodeColor = COLOR_NODE_ARR[floor(random(COLOR_NODE_ARR.length))];
    this.nodeEmoji = EMOJI_ARR[i];
  }

  setupAudio(audioCtx, buffer) {
    if (this.audioSource || !buffer) return;
    this.gainNode = audioCtx.createGain();
    this.pannerNode = audioCtx.createPanner();
    this.audioSource = audioCtx.createBufferSource();
    this.audioSource.buffer = buffer;
    this.audioSource.loop = true;
    this.pannerNode.panningModel = "HRTF";
    this.updatePannerPosition();
    this.gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    this.audioSource.connect(this.pannerNode);
    this.pannerNode.connect(this.gainNode);
    this.gainNode.connect(audioCtx.destination);
    this.audioSource.start();
  }

  updatePannerPosition() {
    if (!this.pannerNode) return;
    const pannerX = map(this.pos.x, 0, width, -10, 10);
    const pannerZ = map(this.pos.y, 0, height, -10, 10);
    this.pannerNode.setPosition(pannerX, 0, pannerZ);
  }

  draw() {
    push();
    //circle
    strokeWeight(1.4);
    if (this.justCreated) {
      stroke(0);
    } else if (this.visited) {
      stroke(0);
    } else {
      fill(this.nodeColor);
      stroke(0);
    }
    circle(this.pos.x, this.pos.y, this.radius * 2);

    //emoji
    if (this.visited) {
    } else {
      fill(0, 0, 0, 250);
      textSize(20);
      textAlign(CENTER, CENTER);
      text(this.nodeEmoji, this.pos.x + 1, this.pos.y + 1);
    }

    //shadow
    image(emojiShadow, this.pos.x - 13, this.pos.y + 24);
    // drawingContext.filter = "blur(4px)";
    // fill(0, 0, 0, 200);
    // ellipse(this.pos.x, this.pos.y + 30, 20, 8);
    // drawingContext.filter = "none";
    pop();
  }
}
