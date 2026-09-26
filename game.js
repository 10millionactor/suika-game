const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Events
} = Matter;


// =====================================
// 기본 설정
// =====================================

const GAME_WIDTH = 360;
const GAME_HEIGHT = 600;

const GAME_OVER_LINE_Y = 110;

const FLOOR_TOP = 590;

const WALL_THICKNESS = 80;


// =====================================
// 엔진
// =====================================

const engine = Engine.create();

engine.gravity.x = 0;
engine.gravity.y = 1;

engine.positionIterations = 10;
engine.velocityIterations = 8;

const gameElement =
  document.getElementById("game");

const render = Render.create({
  element: gameElement,
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


// =====================================
// 형태소 9단계
// =====================================

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


// =====================================
// 이미지 로딩
// =====================================

const fruitImages =
  fruitLevels.map((fruit) => {

    const image =
      new Image();

    image.src =
      fruit.image;

    return image;
  });


// =====================================
// 게임 상태
// =====================================

let score = 0;

let gameOver = false;

let scoreRegistered = false;

let canDrop = true;

let pointerDown = false;

let previewX =
  GAME_WIDTH / 2;

let dangerStartedAt = null;

let mergeLock = false;


function randomStartLevel() {

  return Math.floor(
    Math.random() * 3
  );
}


let currentLevel =
  randomStartLevel();

let nextLevel =
  randomStartLevel();


// =====================================
// 두꺼운 바닥 / 벽
// =====================================

// 화면 아래쪽에 매우 두꺼운 바닥 배치
const floor = Bodies.rectangle(
  GAME_WIDTH / 2,

  FLOOR_TOP +
    WALL_THICKNESS / 2,

  GAME_WIDTH +
    WALL_THICKNESS * 2,

  WALL_THICKNESS,

  {
    isStatic: true,

    label: "floor",

    restitution: 0,

    friction: 0.4,

    render: {
      fillStyle: "#222"
    }
  }
);


// 왼쪽 벽
const leftWall = Bodies.rectangle(
  -WALL_THICKNESS / 2,

  GAME_HEIGHT / 2,

  WALL_THICKNESS,

  GAME_HEIGHT +
    WALL_THICKNESS * 2,

  {
    isStatic: true,

    label: "wall",

    restitution: 0,

    friction: 0.4,

    render: {
      fillStyle: "#222"
    }
  }
);


// 오른쪽 벽
const rightWall = Bodies.rectangle(
  GAME_WIDTH +
    WALL_THICKNESS / 2,

  GAME_HEIGHT / 2,

  WALL_THICKNESS,

  GAME_HEIGHT +
    WALL_THICKNESS * 2,

  {
    isStatic: true,

    label: "wall",

    restitution: 0,

    friction: 0.4,

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


// =====================================
// 위치 안전 보정
// =====================================

function clampX(
  x,
  radius
) {

  const min =
    radius + 2;

  const max =
    GAME_WIDTH -
    radius -
    2;

  return Math.max(
    min,
    Math.min(
      max,
      x
    )
  );
}


function clampY(
  y,
  radius
) {

  // 형태소의 아래가 FLOOR_TOP 밑으로 가지 않게
  const max =
    FLOOR_TOP -
    radius -
    2;

  return Math.min(
    y,
    max
  );
}


// =====================================
// 형태소 생성
// =====================================

function createFruit(
  x,
  y,
  level,
  options = {}
) {

  const fruit =
    fruitLevels[level];

  const safeX =
    clampX(
      x,
      fruit.radius
    );

  const safeY =
    clampY(
      y,
      fruit.radius
    );

  const body =
    Bodies.circle(
      safeX,
      safeY,
      fruit.radius,

      {
        label: "fruit",

        restitution: 0.02,

        friction: 0.15,

        frictionStatic: 0.3,

        frictionAir: 0.008,

        density:
          0.0015 +
          level * 0.00015,

        slop: 0.02,

        render: {
          visible: false
        }
      }
    );


  body.fruitLevel =
    level;

  body.isMerging =
    false;

  body.spawnTime =
    Date.now();

  body.safeCreated =
    options.safeCreated === true;


  Body.setVelocity(
    body,
    {
      x: 0,
      y: 0
    }
  );


  Body.setAngularVelocity(
    body,
    0
  );


  Composite.add(
    engine.world,
    body
  );


  return body;
}


// =====================================
// 직접 이미지 렌더링
// =====================================

Events.on(
  render,
  "afterRender",
  () => {

    const ctx =
      render.context;

    const bodies =
      Composite.allBodies(
        engine.world
      );


    // -----------------------------
    // 실제 형태소
    // -----------------------------

    for (
      const body
      of bodies
    ) {

      if (
        body.label !==
        "fruit"
      ) {
        continue;
      }


      const level =
        body.fruitLevel;

      const fruit =
        fruitLevels[level];

      const image =
        fruitImages[level];


      if (
        !fruit ||
        !image ||
        !image.complete
      ) {
        continue;
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
        image,

        -diameter / 2,
        -diameter / 2,

        diameter,
        diameter
      );


      ctx.restore();
    }


    // -----------------------------
    // 게임오버 선
    // -----------------------------

    ctx.save();

    ctx.beginPath();

    ctx.moveTo(
      0,
      GAME_OVER_LINE_Y
    );

    ctx.lineTo(
      GAME_WIDTH,
      GAME_OVER_LINE_Y
    );

    ctx.strokeStyle =
      "#ff3b30";

    ctx.lineWidth = 3;

    ctx.setLineDash(
      [8, 6]
    );

    ctx.stroke();

    ctx.restore();


    // -----------------------------
    // 미리보기
    // -----------------------------

    if (gameOver) {
      return;
    }


    ctx.save();

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
      "rgba(0, 0, 0, 0.1)";

    ctx.lineWidth = 1;

    ctx.stroke();

    ctx.restore();


    const previewFruit =
      fruitLevels[
        currentLevel
      ];

    const previewImage =
      fruitImages[
        currentLevel
      ];


    if (
      !previewImage ||
      !previewImage.complete
    ) {
      return;
    }


    const previewSize =
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
      previewImage,

      previewX -
        previewSize / 2,

      45 -
        previewSize / 2,

      previewSize,
      previewSize
    );


    ctx.restore();
  }
);


// =====================================
// 미리보기 위치
// =====================================

function updatePreviewPosition(
  clientX
) {

  if (gameOver) {
    return;
  }


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


  x =
    clampX(
      x,
      radius
    );


  previewX = x;
}


// =====================================
// PC + 모바일 통합
// =====================================

render.canvas
  .addEventListener(
    "pointermove",
    (event) => {

      updatePreviewPosition(
        event.clientX
      );
    }
  );


render.canvas
  .addEventListener(
    "pointerdown",
    (event) => {

      if (gameOver) {
        return;
      }


      pointerDown =
        true;


      updatePreviewPosition(
        event.clientX
      );
    }
  );


render.canvas
  .addEventListener(
    "pointerup",
    (event) => {

      if (
        !pointerDown ||
        gameOver
      ) {
        return;
      }


      pointerDown =
        false;


      updatePreviewPosition(
        event.clientX
      );


      dropFruit();
    }
  );


render.canvas
  .addEventListener(
    "pointercancel",
    () => {

      pointerDown =
        false;
    }
  );


// =====================================
// 떨어뜨리기
// =====================================

function dropFruit() {

  if (
    !canDrop ||
    gameOver
  ) {
    return;
  }


  canDrop =
    false;


  createFruit(
    previewX,
    50,
    currentLevel
  );


  currentLevel =
    nextLevel;


  nextLevel =
    randomStartLevel();


  updateNextDisplay();


  setTimeout(
    () => {

      if (!gameOver) {

        canDrop =
          true;
      }

    },
    450
  );
}


// =====================================
// 합체
// =====================================

Events.on(
  engine,
  "collisionStart",
  (event) => {

    if (
      gameOver ||
      mergeLock
    ) {
      return;
    }


    for (
      const pair
      of event.pairs
    ) {

      const a =
        pair.bodyA;

      const b =
        pair.bodyB;


      if (
        a.label !== "fruit" ||
        b.label !== "fruit"
      ) {
        continue;
      }


      if (
        a.fruitLevel !==
        b.fruitLevel
      ) {
        continue;
      }


      if (
        a.isMerging ||
        b.isMerging
      ) {
        continue;
      }


      const level =
        a.fruitLevel;


      if (
        level >=
        fruitLevels.length - 1
      ) {
        continue;
      }


      mergeFruits(
        a,
        b
      );


      // 한 프레임에 같은 바디가 여러 번
      // 합체되는 것을 막기 위해 1쌍만 처리
      break;
    }
  }
);


function mergeFruits(
  a,
  b
) {

  a.isMerging =
    true;

  b.isMerging =
    true;

  mergeLock =
    true;


  const nextLevel =
    a.fruitLevel + 1;


  const nextRadius =
    fruitLevels[
      nextLevel
    ].radius;


  const midpointX =
    (
      a.position.x +
      b.position.x
    ) / 2;


  const midpointY =
    (
      a.position.y +
      b.position.y
    ) / 2;


  // 두 공의 속도를 거의 이어받지 않고
  // 합체 위치만 참고
  const safeX =
    clampX(
      midpointX,
      nextRadius
    );


  const safeY =
    clampY(
      midpointY -
        2,
      nextRadius
    );


  // 먼저 두 형태소 제거
  Composite.remove(
    engine.world,
    a
  );

  Composite.remove(
    engine.world,
    b
  );


  // 바로 생성하지 않고
  // 다음 물리 틱에 생성해서 관통 가능성 줄임
  setTimeout(
    () => {

      const merged =
        createFruit(
          safeX,
          safeY,
          nextLevel,
          {
            safeCreated: true
          }
        );


      Body.setVelocity(
        merged,
        {
          x: 0,
          y: 0
        }
      );


      Body.setAngularVelocity(
        merged,
        0
      );


      score +=
        fruitLevels[
          nextLevel
        ].score;


      updateScore();


      mergeLock =
        false;

    },
    0
  );
}


// =====================================
// 형태소 안전 검사
// =====================================

function keepFruitInside(
  body
) {

  if (
    body.label !==
    "fruit"
  ) {
    return;
  }


  const radius =
    fruitLevels[
      body.fruitLevel
    ].radius;


  let x =
    body.position.x;

  let y =
    body.position.y;

  let corrected =
    false;


  // 왼쪽으로 빠짐
  if (
    x - radius <
    0
  ) {

    x =
      radius + 2;

    corrected =
      true;
  }


  // 오른쪽으로 빠짐
  if (
    x + radius >
    GAME_WIDTH
  ) {

    x =
      GAME_WIDTH -
      radius -
      2;

    corrected =
      true;
  }


  // 아래로 빠짐
  if (
    y + radius >
    FLOOR_TOP + 5
  ) {

    y =
      FLOOR_TOP -
      radius -
      2;

    corrected =
      true;
  }


  // 혹시 완전히 화면 밖까지 빠졌을 경우
  if (
    y >
    GAME_HEIGHT + 100
  ) {

    y =
      FLOOR_TOP -
      radius -
      4;

    corrected =
      true;
  }


  if (
    corrected
  ) {

    Body.setPosition(
      body,
      {
        x,
        y
      }
    );


    Body.setVelocity(
      body,
      {
        x: 0,
        y: 0
      }
    );


    Body.setAngularVelocity(
      body,
      0
    );
  }


  // 지나치게 빠른 속도 제한
  const maxSpeed = 12;


  if (
    Math.abs(
      body.velocity.x
    ) >
    maxSpeed ||
    Math.abs(
      body.velocity.y
    ) >
    maxSpeed
  ) {

    Body.setVelocity(
      body,
      {
        x:
          Math.max(
            -maxSpeed,
            Math.min(
              maxSpeed,
              body.velocity.x
            )
          ),

        y:
          Math.max(
            -maxSpeed,
            Math.min(
              maxSpeed,
              body.velocity.y
            )
          )
      }
    );
  }


  // 백스핀 과도한 것 제한
  const maxAngularSpeed =
    0.15;


  if (
    Math.abs(
      body.angularVelocity
    ) >
    maxAngularSpeed
  ) {

    Body.setAngularVelocity(
      body,

      Math.sign(
        body.angularVelocity
      ) *
        maxAngularSpeed
    );
  }
}


// 매 물리 업데이트마다
// 모든 형태소 안전 검사
Events.on(
  engine,
  "afterUpdate",
  () => {

    const bodies =
      Composite.allBodies(
        engine.world
      );


    bodies.forEach(
      keepFruitInside
    );


    checkGameOver();
  }
);


// =====================================
// 게임오버 검사
// =====================================

function checkGameOver() {

  if (gameOver) {
    return;
  }


  const now =
    Date.now();


  const fruits =
    Composite.allBodies(
      engine.world
    ).filter(
      (body) =>
        body.label ===
        "fruit"
    );


  let danger =
    false;


  for (
    const body
    of fruits
  ) {

    // 새로 떨어뜨린 형태소는 잠시 제외
    if (
      now -
        body.spawnTime <
      1200
    ) {
      continue;
    }


    // 합체 중 제외
    if (
      body.isMerging
    ) {
      continue;
    }


    const radius =
      fruitLevels[
        body.fruitLevel
      ].radius;


    const top =
      body.position.y -
      radius;


    // 빨간선 위에 있고
    // 거의 안정된 상태일 때만 위험
    if (
      top <
        GAME_OVER_LINE_Y &&
      body.speed <
        1.2
    ) {

      danger =
        true;

      break;
    }
  }


  if (
    !danger
  ) {

    dangerStartedAt =
      null;

    return;
  }


  if (
    dangerStartedAt ===
    null
  ) {

    dangerStartedAt =
      now;

    return;
  }


  if (
    now -
      dangerStartedAt >=
    1500
  ) {

    endGame();
  }
}


// =====================================
// 게임오버
// =====================================

function endGame() {

  if (gameOver) {
    return;
  }


  gameOver =
    true;

  canDrop =
    false;


  const finalScore =
    document.getElementById(
      "finalScore"
    );


  const modal =
    document.getElementById(
      "gameOverModal"
    );


  const nickname =
    document.getElementById(
      "nickname"
    );


  if (finalScore) {

    finalScore.textContent =
      score.toLocaleString();
  }


  if (modal) {

    modal.style.display =
      "flex";
  }


  if (nickname) {

    nickname.focus();
  }
}


// =====================================
// 랭킹 등록
// =====================================

const registerButton =
  document.getElementById(
    "registerScore"
  );


if (registerButton) {

  registerButton
    .addEventListener(
      "click",

      async () => {

        if (
          scoreRegistered
        ) {
          return;
        }


        const nicknameInput =
          document.getElementById(
            "nickname"
          );


        const message =
          document.getElementById(
            "registerMessage"
          );


        const nickname =
          nicknameInput
            ?.value
            .trim();


        if (
          !nickname
        ) {

          if (message) {

            message.textContent =
              "닉네임을 입력해주세요.";
          }

          return;
        }


        try {

          if (message) {

            message.textContent =
              "등록 중...";
          }


          await saveScore(
            nickname,
            score
          );


          scoreRegistered =
            true;


          registerButton.disabled =
            true;


          if (message) {

            message.textContent =
              "🏆 랭킹 등록 완료!";
          }


          if (
            typeof loadRanking ===
            "function"
          ) {

            await loadRanking();
          }

        }

        catch (error) {

          console.error(
            error
          );


          if (message) {

            message.textContent =
              error.message ||
              "랭킹 등록에 실패했습니다.";
          }
        }
      }
    );
}


// =====================================
// 엔터로 등록
// =====================================

const nicknameInput =
  document.getElementById(
    "nickname"
  );


if (
  nicknameInput &&
  registerButton
) {

  nicknameInput
    .addEventListener(
      "keydown",

      (event) => {

        if (
          event.key ===
          "Enter"
        ) {

          registerButton.click();
        }
      }
    );
}


// =====================================
// 다시하기
// =====================================

const restartButton =
  document.getElementById(
    "restartButton"
  );


if (restartButton) {

  restartButton
    .addEventListener(
      "click",

      () => {

        location.reload();
      }
    );
}


// =====================================
// 점수 표시
// =====================================

function updateScore() {

  const scoreElement =
    document.getElementById(
      "score"
    );


  if (scoreElement) {

    scoreElement.textContent =
      score.toLocaleString();
  }
}


// =====================================
// NEXT 표시
// =====================================

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


// =====================================
// 시작
// =====================================

updateScore();

updateNextDisplay();
