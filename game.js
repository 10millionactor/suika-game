const Engine = Matter.Engine;
const Render = Matter.Render;
const Runner = Matter.Runner;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Events = Matter.Events;
const Body = Matter.Body;

const engine = Engine.create();

const GAME_WIDTH = 360;
const GAME_HEIGHT = 600;

const game = document.getElementById("game");

const render = Render.create({
  element: game,
  engine: engine,
  options: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    wireframes: false,
    background: "#ffffff"
  }
});

Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// =========================
// 기본 설정
// =========================

let score = 0;

let previewX = GAME_WIDTH / 2;
let currentLevel = randomStartLevel();
let nextLevel = randomStartLevel();

let canDrop = true;
let isPointerDown = false;

// 처음에는 0~2단계만 랜덤 등장
function randomStartLevel() {
  return Math.floor(Math.random() * 3);
}

// 단계별 정보
const fruitLevels = [
  { radius: 18, color: "#ff9aa2", score: 1 },
  { radius: 23, color: "#ffb7b2", score: 3 },
  { radius: 29, color: "#ffdac1", score: 6 },
  { radius: 36, color: "#e2f0cb", score: 10 },
  { radius: 44, color: "#b5ead7", score: 15 },
  { radius: 53, color: "#c7ceea", score: 21 },
  { radius: 63, color: "#b8bedd", score: 28 },
  { radius: 74, color: "#f7b2bd", score: 36 },
  { radius: 86, color: "#ffa69e", score: 45 },
  { radius: 98, color: "#84dcc6", score: 55 },
  { radius: 112, color: "#6a994e", score: 66 }
];

// =========================
// 벽 / 바닥
// =========================

const floor = Bodies.rectangle(
  GAME_WIDTH / 2,
  GAME_HEIGHT - 10,
  GAME_WIDTH,
  20,
  {
    isStatic: true,
    render: {
      fillStyle: "#222"
    }
  }
);

const leftWall = Bodies.rectangle(
  5,
  GAME_HEIGHT / 2,
  10,
  GAME_HEIGHT,
  {
    isStatic: true,
    render: {
      fillStyle: "#222"
    }
  }
);

const rightWall = Bodies.rectangle(
  GAME_WIDTH - 5,
  GAME_HEIGHT / 2,
  10,
  GAME_HEIGHT,
  {
    isStatic: true,
    render: {
      fillStyle: "#222"
    }
  }
);

Composite.add(engine.world, [
  floor,
  leftWall,
  rightWall
]);

// =========================
// 실제 공 생성
// =========================

function createFruit(x, y, level) {
  const fruit = fruitLevels[level];

  const body = Bodies.circle(
    x,
    y,
    fruit.radius,
    {
      restitution: 0.12,
      friction: 0.08,
      frictionAir: 0.002,
      density: 0.001 + level * 0.0001,

      label: "fruit",

      render: {
        fillStyle: fruit.color
      }
    }
  );

  body.fruitLevel = level;
  body.isMerging = false;

  Composite.add(engine.world, body);

  return body;
}

// =========================
// 미리보기 공 그리기
// =========================

Events.on(render, "afterRender", function () {
  const ctx = render.context;

  const fruit = fruitLevels[currentLevel];

  // 세로 가이드라인
  ctx.beginPath();
  ctx.moveTo(previewX, 0);
  ctx.lineTo(previewX, GAME_HEIGHT);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 미리보기 공
  ctx.beginPath();
  ctx.arc(
    previewX,
    45,
    fruit.radius,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = fruit.color;
  ctx.fill();

  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.stroke();
});

// =========================
// 위치 조절
// =========================

function updatePreviewPosition(clientX) {
  const rect = render.canvas.getBoundingClientRect();

  let x =
    (clientX - rect.left) *
    (GAME_WIDTH / rect.width);

  const radius = fruitLevels[currentLevel].radius;

  const minX = radius + 10;
  const maxX = GAME_WIDTH - radius - 10;

  if (x < minX) x = minX;
  if (x > maxX) x = maxX;

  previewX = x;
}

// =========================
// PC 마우스
// =========================

render.canvas.addEventListener(
  "mousemove",
  function (event) {
    updatePreviewPosition(event.clientX);
  }
);

render.canvas.addEventListener(
  "mousedown",
  function (event) {
    isPointerDown = true;
    updatePreviewPosition(event.clientX);
  }
);

render.canvas.addEventListener(
  "mouseup",
  function (event) {
    if (!isPointerDown) return;

    isPointerDown = false;

    updatePreviewPosition(event.clientX);

    dropFruit();
  }
);

// =========================
// 모바일 터치
// =========================

render.canvas.addEventListener(
  "touchstart",
  function (event) {
    event.preventDefault();

    isPointerDown = true;

    const touch = event.touches[0];

    if (touch) {
      updatePreviewPosition(touch.clientX);
    }
  },
  { passive: false }
);

render.canvas.addEventListener(
  "touchmove",
  function (event) {
    event.preventDefault();

    const touch = event.touches[0];

    if (touch) {
      updatePreviewPosition(touch.clientX);
    }
  },
  { passive: false }
);

render.canvas.addEventListener(
  "touchend",
  function (event) {
    event.preventDefault();

    if (!isPointerDown) return;

    isPointerDown = false;

    dropFruit();
  },
  { passive: false }
);

// =========================
// 공 떨어뜨리기
// =========================

function dropFruit() {
  if (!canDrop) return;

  canDrop = false;

  const levelToDrop = currentLevel;

  createFruit(
    previewX,
    50,
    levelToDrop
  );

  // 다음 공으로 변경
  currentLevel = nextLevel;
  nextLevel = randomStartLevel();

  updateNextDisplay();

  // 연속 생성 방지
  setTimeout(function () {
    canDrop = true;
  }, 450);
}

// =========================
// 합체
// =========================

Events.on(
  engine,
  "collisionStart",
  function (event) {
    event.pairs.forEach(function (pair) {
      const a = pair.bodyA;
      const b = pair.bodyB;

      if (
        a.label === "fruit" &&
        b.label === "fruit" &&
        a.fruitLevel === b.fruitLevel &&
        !a.isMerging &&
        !b.isMerging
      ) {
        const level = a.fruitLevel;

        // 마지막 단계는 합체 안 함
        if (level >= fruitLevels.length - 1) {
          return;
        }

        a.isMerging = true;
        b.isMerging = true;

        const newX =
          (a.position.x + b.position.x) / 2;

        const newY =
          (a.position.y + b.position.y) / 2;

        const velocityX =
          (a.velocity.x + b.velocity.x) / 2;

        const velocityY =
          (a.velocity.y + b.velocity.y) / 2;

        setTimeout(function () {
          Composite.remove(engine.world, a);
          Composite.remove(engine.world, b);

          const newFruit = createFruit(
            newX,
            newY,
            level + 1
          );

          Body.setVelocity(
            newFruit,
            {
              x: velocityX,
              y: velocityY
            }
          );

          score += fruitLevels[level + 1].score;

          updateScore();
        }, 0);
      }
    });
  }
);

// =========================
// 점수 표시
// =========================

function updateScore() {
  const scoreElement =
    document.getElementById("score");

  if (scoreElement) {
    scoreElement.textContent = score;
  }
}

// =========================
// NEXT 표시
// =========================

function updateNextDisplay() {
  const nextElement =
    document.getElementById("nextFruit");

  if (!nextElement) return;

  const fruit = fruitLevels[nextLevel];

  nextElement.style.width =
    fruit.radius * 1.2 + "px";

  nextElement.style.height =
    fruit.radius * 1.2 + "px";

  nextElement.style.backgroundColor =
    fruit.color;

  nextElement.style.borderRadius = "50%";
}

updateNextDisplay();
