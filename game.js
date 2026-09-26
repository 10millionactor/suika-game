const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Events
} = Matter;


// ======================================
// 기본 설정
// ======================================

const GAME_WIDTH = 360;
const GAME_HEIGHT = 600;

const GAME_OVER_LINE_Y = 110;

const FLOOR_TOP = 590;


// ======================================
// Matter.js 엔진
// ======================================

const engine = Engine.create();

engine.enableSleeping = true;

engine.gravity.x = 0;
engine.gravity.y = 1;

engine.positionIterations = 12;
engine.velocityIterations = 10;
engine.constraintIterations = 4;


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


// ======================================
// 형태소 9단계
// ======================================

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


// ======================================
// 이미지 미리 로딩
// ======================================

const fruitImages =
  fruitLevels.map(function (fruit) {

    const img = new Image();

    img.src = fruit.image;

    return img;
  });


// ======================================
// 게임 상태
// ======================================

let score = 0;

let previewX =
  GAME_WIDTH / 2;

let canDrop = true;

let pointerDown = false;

let gameOver = false;

let scoreRegistered = false;

let dangerStartedAt = null;


function randomStartLevel() {

  return Math.floor(
    Math.random() * 3
  );
}


let currentLevel =
  randomStartLevel();

let nextLevel =
  randomStartLevel();


// ======================================
// 바닥 / 벽
// ======================================

const floor = Bodies.rectangle(
  GAME_WIDTH / 2,

  FLOOR_TOP + 40,

  GAME_WIDTH + 160,

  80,

  {
    isStatic: true,

    label: "floor",

    restitution: 0,

    friction: 0.6,

    frictionStatic: 1,

    render: {
      fillStyle: "#222"
    }
  }
);


const leftWall = Bodies.rectangle(
  -40,

  GAME_HEIGHT / 2,

  80,

  GAME_HEIGHT + 200,

  {
    isStatic: true,

    label: "wall",

    restitution: 0,

    friction: 0.6,

    frictionStatic: 1,

    render: {
      fillStyle: "#222"
    }
  }
);


const rightWall = Bodies.rectangle(
  GAME_WIDTH + 40,

  GAME_HEIGHT / 2,

  80,

  GAME_HEIGHT + 200,

  {
    isStatic: true,

    label: "wall",

    restitution: 0,

    friction: 0.6,

    frictionStatic: 1,

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


// ======================================
// 위치 제한
// ======================================

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

  const maxY =
    FLOOR_TOP -
    radius -
    2;


  return Math.min(
    y,
    maxY
  );
}


// ======================================
// 형태소 생성
// ======================================

function createFruit(
  x,
  y,
  level
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

        restitution: 0,

        friction: 0.25,

        frictionStatic: 0.5,

        frictionAir: 0.02,

        density:
          0.0018 +
          level * 0.00015,

        slop: 0.05,

        sleepThreshold: 30,

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


  // 회전 완전 금지
  Body.setInertia(
    body,
    Infinity
  );

  Body.setAngle(
    body,
    0
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


// ======================================
// 렌더링
// ======================================

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


    // 실제 형태소 이미지
    bodies.forEach(
      function (body) {

        if (
          body.label !==
          "fruit"
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
          !fruit ||
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


    // 게임오버 경계선
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

    ctx.lineWidth =
      3;

    ctx.setLineDash(
      [8, 6]
    );

    ctx.stroke();

    ctx.restore();


    if (gameOver) {
      return;
    }


    // 세로 가이드라인
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
      "rgba(0,0,0,0.1)";

    ctx.lineWidth =
      1;

    ctx.stroke();

    ctx.restore();


    // 미리보기
    const fruit =
      fruitLevels[
        currentLevel
      ];


    const img =
      fruitImages[
        currentLevel
      ];


    if (
      !img ||
      !img.complete
    ) {
      return;
    }


    const diameter =
      fruit.radius * 2;


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

      previewX -
        diameter / 2,

      45 -
        diameter / 2,

      diameter,

      diameter
    );


    ctx.restore();
  }
);


// ======================================
// 미리보기 위치
// ======================================

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


  previewX =
    clampX(
      x,
      radius
    );
}


// ======================================
// 조작
// ======================================

render.canvas.addEventListener(
  "pointermove",

  function (event) {

    updatePreviewPosition(
      event.clientX
    );
  }
);


render.canvas.addEventListener(
  "pointerdown",

  function (event) {

    if (gameOver) {
      return;
    }


    pointerDown =
      true;


    try {

      render.canvas
        .setPointerCapture(
          event.pointerId
        );

    } catch (error) {}


    updatePreviewPosition(
      event.clientX
    );
  }
);


render.canvas.addEventListener(
  "pointerup",

  function (event) {

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


    try {

      render.canvas
        .releasePointerCapture(
          event.pointerId
        );

    } catch (error) {}


    dropFruit();
  }
);


render.canvas.addEventListener(
  "pointercancel",

  function () {

    pointerDown =
      false;
  }
);


// ======================================
// 떨어뜨리기
// ======================================

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
    function () {

      if (!gameOver) {

        canDrop =
          true;
      }

    },

    450
  );
}


// ======================================
// 합체
// ======================================

Events.on(
  engine,
  "collisionStart",

  function (event) {

    if (gameOver) {
      return;
    }


    event.pairs.forEach(
      function (pair) {

        const a =
          pair.bodyA;


        const b =
          pair.bodyB;


        if (
          a.label !==
            "fruit" ||

          b.label !==
            "fruit"
        ) {
          return;
        }


        if (
          a.fruitLevel !==
          b.fruitLevel
        ) {
          return;
        }


        if (
          a.isMerging ||
          b.isMerging
        ) {
          return;
        }


        const level =
          a.fruitLevel;


        if (
          level >=
          fruitLevels.length -
            1
        ) {
          return;
        }


        mergeFruits(
          a,
          b
        );
      }
    );
  }
);


// ======================================
// 합체 처리
// ======================================

function mergeFruits(
  a,
  b
) {

  if (
    a.isMerging ||
    b.isMerging
  ) {
    return;
  }


  a.isMerging =
    true;

  b.isMerging =
    true;


  const nextLevel =
    a.fruitLevel + 1;


  const nextRadius =
    fruitLevels[
      nextLevel
    ].radius;


  const middleX =
    (
      a.position.x +
      b.position.x
    ) / 2;


  const middleY =
    (
      a.position.y +
      b.position.y
    ) / 2;


  const safeX =
    clampX(
      middleX,
      nextRadius
    );


  const safeY =
    clampY(
      middleY - 4,
      nextRadius
    );


  Composite.remove(
    engine.world,
    a
  );


  Composite.remove(
    engine.world,
    b
  );


  setTimeout(
    function () {

      const merged =
        createFruit(
          safeX,
          safeY,
          nextLevel
        );


      Body.setVelocity(
        merged,
        {
          x: 0,
          y: 0
        }
      );


      Body.setInertia(
        merged,
        Infinity
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

    },

    0
  );
}


// ======================================
// 형태소 안정화
// ======================================

function stabilizeFruit(
  body
) {

  if (
    body.label !==
    "fruit"
  ) {
    return;
  }


  const fruit =
    fruitLevels[
      body.fruitLevel
    ];


  const radius =
    fruit.radius;


  let x =
    body.position.x;

  let y =
    body.position.y;


  let corrected =
    false;


  // 왼쪽 이탈
  if (
    x - radius <
    -5
  ) {

    x =
      radius + 2;

    corrected =
      true;
  }


  // 오른쪽 이탈
  if (
    x + radius >
    GAME_WIDTH + 5
  ) {

    x =
      GAME_WIDTH -
      radius -
      2;

    corrected =
      true;
  }


  // 아래 이탈
  if (
    y + radius >
    FLOOR_TOP + 12
  ) {

    y =
      FLOOR_TOP -
      radius -
      2;

    corrected =
      true;
  }


  if (
    y >
    GAME_HEIGHT + 50
  ) {

    y =
      FLOOR_TOP -
      radius -
      4;

    corrected =
      true;
  }


  if (corrected) {

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
  }


  // 거의 멈췄으면 미세 속도 제거
  if (
    body.speed < 0.08 &&
    !body.isMerging
  ) {

    Body.setVelocity(
      body,
      {
        x: 0,
        y: 0
      }
    );
  }


  // 너무 빠른 이동 방지
  const MAX_SPEED =
    10;


  const vx =
    Math.max(
      -MAX_SPEED,

      Math.min(
        MAX_SPEED,
        body.velocity.x
      )
    );


  const vy =
    Math.max(
      -MAX_SPEED,

      Math.min(
        MAX_SPEED,
        body.velocity.y
      )
    );


  if (
    vx !==
      body.velocity.x ||

    vy !==
      body.velocity.y
  ) {

    Body.setVelocity(
      body,
      {
        x: vx,
        y: vy
      }
    );
  }
}


// ======================================
// 매 프레임
// ======================================

Events.on(
  engine,
  "afterUpdate",

  function () {

    const bodies =
      Composite.allBodies(
        engine.world
      );


    bodies.forEach(
      stabilizeFruit
    );


    checkGameOver();
  }
);


// ======================================
// 게임오버 판정
// ======================================

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
      function (body) {

        return (
          body.label ===
          "fruit"
        );
      }
    );


  let danger =
    false;


  for (
    const body
    of fruits
  ) {

    if (
      now -
        body.spawnTime <
      1200
    ) {
      continue;
    }


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


  if (!danger) {

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


// ======================================
// 게임오버
// ======================================

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


// ======================================
// 랭킹 등록
// ======================================

const registerButton =
  document.getElementById(
    "registerScore"
  );


if (registerButton) {

  registerButton.addEventListener(
    "click",

    async function () {

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
          ? nicknameInput
              .value
              .trim()
          : "";


      if (!nickname) {

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

      } catch (error) {

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


// ======================================
// 엔터로 등록
// ======================================

const nicknameInput =
  document.getElementById(
    "nickname"
  );


if (
  nicknameInput &&
  registerButton
) {

  nicknameInput.addEventListener(
    "keydown",

    function (event) {

      if (
        event.key ===
        "Enter"
      ) {

        registerButton.click();
      }
    }
  );
}


// ======================================
// 다시하기
// ======================================

const restartButton =
  document.getElementById(
    "restartButton"
  );


if (restartButton) {

  restartButton.addEventListener(
    "click",

    function () {

      location.reload();
    }
  );
}


// ======================================
// 점수 표시
// ======================================

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


// ======================================
// NEXT 표시
// ======================================

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


// ======================================
// 시작
// ======================================

updateScore();

updateNextDisplay();
