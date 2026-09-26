const Engine = Matter.Engine;
const Render = Matter.Render;
const Runner = Matter.Runner;
const Bodies = Matter.Bodies;
const Composite = Matter.Composite;
const Events = Matter.Events;
const Body = Matter.Body;

const GAME_WIDTH = 360;
const GAME_HEIGHT = 600;

// =========================
// 엔진
// =========================

const engine = Engine.create();

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

Runner.run(
  runner,
  engine
);

// =========================
// 9단계 데이터
// =========================

const fruitLevels = [
  {
    radius: 20,
    image: "images/01.png",
    score: 1
  },

  {
    radius: 27,
    image: "images/02.png",
    score: 3
  },

  {
    radius: 35,
    image: "images/03.png",
    score: 6
  },

  {
    radius: 44,
    image: "images/04.png",
    score: 10
  },

  {
    radius: 54,
    image: "images/05.png",
    score: 15
  },

  {
    radius: 65,
    image: "images/06.png",
    score: 21
  },

  {
    radius: 78,
    image: "images/07.png",
    score: 28
  },

  {
    radius: 92,
    image: "images/08.png",
    score: 36
  },

  {
    radius: 108,
    image: "images/09.png",
    score: 50
  }
];

// =========================
// 이미지 로딩
// =========================

const fruitImages = fruitLevels.map(
  function (fruit) {

    const img = new Image();

    img.src = fruit.image;

    return img;
  }
);

// =========================
// 게임 상태
// =========================

let score = 0;

let previewX =
  GAME_WIDTH / 2;

let canDrop = true;

let isPointerDown = false;

function randomStartLevel() {
  return Math.floor(
    Math.random() * 3
  );
}

let currentLevel =
  randomStartLevel();

let nextLevel =
  randomStartLevel();

// =========================
// 벽
// =========================

const floor = Bodies.rectangle(
  GAME_WIDTH / 2,
  GAME_HEIGHT - 5,

  GAME_WIDTH,
  10,

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

Composite.add(
  engine.world,

  [
    floor,
    leftWall,
    rightWall
  ]
);

// =========================
// 공 생성
// =========================

function createFruit(
  x,
  y,
  level
) {

  const fruit =
    fruitLevels[level];

  const body =
    Bodies.circle(
      x,
      y,
      fruit.radius,

      {
        restitution: 0.1,
        friction: 0.08,
        frictionAir: 0.002,

        label: "fruit",

        render: {
          visible: false
        }
      }
    );

  body.fruitLevel = level;

  body.isMerging = false;

  Composite.add(
    engine.world,
    body
  );

  return body;
}

// =========================
// 그림 렌더링
// =========================

Events.on(
  render,
  "afterRender",

  function () {

    const ctx =
      render.context;

    const bodies =
      Composite.allBodies(
        engine.world
      );

    // =====================
    // 실제 떨어진 공
    // =====================

    bodies.forEach(
      function (body) {

        if (
          body.label !== "fruit"
        ) {
          return;
        }

        const level =
          body.fruitLevel;

        const fruit =
          fruitLevels[level];

        const img =
          fruitImages[level];

        if (
          !img ||
          !img.complete
        ) {
          return;
        }

        const diameter =
          fruit.radius * 2;

        ctx.save();

        ctx.translate(
          body.position.x,
          body.position.y
        );

        ctx.rotate(
          body.angle
        );

        ctx.beginPath();

        ctx.arc(
          0,
          0,
          fruit.radius,
          0,
          Math.PI * 2
        );

        ctx.clip();

        ctx.drawImage(
          img,

          -diameter / 2,
          -diameter / 2,

          diameter,
          diameter
        );

        ctx.restore();
      }
    );

    // =====================
    // 가이드라인
    // =====================

    ctx.beginPath();

    ctx.moveTo(
      previewX,
      0
    );

    ctx.lineTo(
      previewX,
      GAME_HEIGHT
    );

    ctx.strokeStyle =
      "rgba(0,0,0,0.12)";

    ctx.lineWidth = 1;

    ctx.stroke();

    // =====================
    // 미리보기
    // =====================

    const previewFruit =
      fruitLevels[
        currentLevel
      ];

    const previewImg =
      fruitImages[
        currentLevel
      ];

    if (
      previewImg &&
      previewImg.complete
    ) {

      const diameter =
        previewFruit.radius * 2;

      ctx.save();

      ctx.beginPath();

      ctx.arc(
        previewX,
        45,
        previewFruit.radius,
        0,
        Math.PI * 2
      );

      ctx.clip();

      ctx.drawImage(
        previewImg,

        previewX -
          diameter / 2,

        45 -
          diameter / 2,

        diameter,
        diameter
      );

      ctx.restore();
    }
  }
);

// =========================
// 미리보기 이동
// =========================

function updatePreviewPosition(
  clientX
) {

  const rect =
    render.canvas
      .getBoundingClientRect();

  let x =
    (
      clientX -
      rect.left
    ) *
    (
      GAME_WIDTH /
      rect.width
    );

  const radius =
    fruitLevels[
      currentLevel
    ].radius;

  const minX =
    radius + 10;

  const maxX =
    GAME_WIDTH -
    radius -
    10;

  if (x < minX) {
    x = minX;
  }

  if (x > maxX) {
    x = maxX;
  }

  previewX = x;
}

// =========================
// PC
// =========================

render.canvas.addEventListener(
  "mousemove",

  function (event) {

    updatePreviewPosition(
      event.clientX
    );
  }
);

render.canvas.addEventListener(
  "mousedown",

  function (event) {

    isPointerDown = true;

    updatePreviewPosition(
      event.clientX
    );
  }
);

render.canvas.addEventListener(
  "mouseup",

  function (event) {

    if (
      !isPointerDown
    ) {
      return;
    }

    isPointerDown = false;

    updatePreviewPosition(
      event.clientX
    );

    dropFruit();
  }
);

// =========================
// 모바일
// =========================

render.canvas.addEventListener(
  "touchstart",

  function (event) {

    event.preventDefault();

    isPointerDown = true;

    const touch =
      event.touches[0];

    if (touch) {

      updatePreviewPosition(
        touch.clientX
      );
    }
  },

  {
    passive: false
  }
);

render.canvas.addEventListener(
  "touchmove",

  function (event) {

    event.preventDefault();

    const touch =
      event.touches[0];

    if (touch) {

      updatePreviewPosition(
        touch.clientX
      );
    }
  },

  {
    passive: false
  }
);

render.canvas.addEventListener(
  "touchend",

  function (event) {

    event.preventDefault();

    if (
      !isPointerDown
    ) {
      return;
    }

    isPointerDown = false;

    dropFruit();
  },

  {
    passive: false
  }
);

// =========================
// 떨어뜨리기
// =========================

function dropFruit() {

  if (!canDrop) {
    return;
  }

  canDrop = false;

  const level =
    currentLevel;

  createFruit(
    previewX,
    50,
    level
  );

  currentLevel =
    nextLevel;

  nextLevel =
    randomStartLevel();

  updateNextDisplay();

  setTimeout(
    function () {

      canDrop = true;

    },

    450
  );
}

// =========================
// 합체
// =========================

Events.on(
  engine,
  "collisionStart",

  function (event) {

    event.pairs.forEach(
      function (pair) {

        const a =
          pair.bodyA;

        const b =
          pair.bodyB;

        if (
          a.label ===
            "fruit" &&

          b.label ===
            "fruit" &&

          a.fruitLevel ===
            b.fruitLevel &&

          !a.isMerging &&
          !b.isMerging
        ) {

          const level =
            a.fruitLevel;

          if (
            level >=
            fruitLevels.length -
              1
          ) {

            return;
          }

          a.isMerging = true;

          b.isMerging = true;

          const newX =
            (
              a.position.x +
              b.position.x
            ) / 2;

          const newY =
            (
              a.position.y +
              b.position.y
            ) / 2;

          const velocityX =
            (
              a.velocity.x +
              b.velocity.x
            ) / 2;

          const velocityY =
            (
              a.velocity.y +
              b.velocity.y
            ) / 2;

          setTimeout(
            function () {

              Composite.remove(
                engine.world,
                a
              );

              Composite.remove(
                engine.world,
                b
              );

              const newFruit =
                createFruit(
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

              score +=
                fruitLevels[
                  level + 1
                ].score;

              updateScore();
            },

            0
          );
        }
      }
    );
  }
);

// =========================
// 점수
// =========================

function updateScore() {

  const scoreElement =
    document.getElementById(
      "score"
    );

  if (
    scoreElement
  ) {

    scoreElement.textContent =
      score;
  }
}

// =========================
// NEXT
// =========================

function updateNextDisplay() {

  const nextElement =
    document.getElementById(
      "nextFruit"
    );

  if (!nextElement) {
    return;
  }

  nextElement.src =
    fruitLevels[
      nextLevel
    ].image;
}

updateScore();

updateNextDisplay();
