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
// 게임 상태
// =========================

let score = 0;
let previewX = GAME_WIDTH / 2;
let canDrop = true;
let isPointerDown = false;

function randomStartLevel() {
  return Math.floor(Math.random() * 3);
}

let currentLevel = randomStartLevel();
let nextLevel = randomStartLevel();

// =========================
// 9단계 이미지
// =========================

const fruitLevels = [
  { radius: 20, image: "images/01.png", score: 1 },
  { radius: 27, image: "images/02.png", score: 3 },
  { radius: 35, image: "images/03.png", score: 6 },
  { radius: 44, image: "images/04.png", score: 10 },
  { radius: 54, image: "images/05.png", score: 15 },
  { radius: 65, image: "images/06.png", score: 21 },
  { radius: 78, image: "images/07.png", score: 28 },
  { radius: 92, image: "images/08.png", score: 36 },
  { radius: 108, image: "images/09.png", score: 50 }
];

// 미리보기용 이미지 미리 로딩
const fruitImages = fruitLevels.map(function (fruit) {
  const img = new Image();
  img.src = fruit.image;
  return img;
});

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
        sprite: {
          texture: fruit.image,

          // 이미지가 256 x 256 기준
          xScale: (fruit.radius * 1.2) / 256,
          yScale: (fruit.radius * 1.2) / 256
        }
      }
    }
  );

  body.fruitLevel = level;
  body.isMerging = false;

  Composite.add(engine.world, body);

  return body;
}

// =========================
// 미리보기 이미지
// =========================

Events.on(render, "afterRender", function () {
  const ctx = render.context;

  const fruit = fruitLevels[currentLevel];
  const img = fruitImages[currentLevel];

  // 가이드라인
  ctx.beginPath();
  ctx.moveTo(previewX, 0);
  ctx.lineTo(previewX, GAME_HEIGHT);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 미리보기 이미지
  if (img.complete) {
    ctx.save();

    ctx.beginPath();
    ctx.arc(
      previewX,
      45,
      fruit.radius,
      0,
      Math.PI * 2
    );

    ctx.clip();

    ctx.drawImage(
      img,
      previewX - fruit.radius,
      45 - fruit.radius,
      fruit.radius * 2,
      fruit.radius * 2
    );

    ctx.restore();
  }
});

// =========================
// 미리보기 위치 조절
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
// PC 조작
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
// 모바일 조작
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

  currentLevel = nextLevel;
  nextLevel = randomStartLevel();

  updateNextDisplay();

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

        // 마지막 단계는 더 이상 합체하지 않음
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
// 점수
// =========================

function updateScore() {
  const scoreElement =
    document.getElementById("score");

  if (scoreElement) {
    scoreElement.textContent = score;
  }
}

// =========================
// NEXT
// =========================

function updateNextDisplay() {
  const nextElement =
    document.getElementById("nextFruit");

  if (!nextElement) return;

  nextElement.src =
    fruitLevels[nextLevel].image;
}

updateScore();
updateNextDisplay();

