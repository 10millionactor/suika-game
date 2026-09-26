const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Events
} = Matter;


// ========================================
// 기본 설정
// ========================================

const GAME_WIDTH = 360;
const GAME_HEIGHT = 600;

const GAME_OVER_LINE_Y = 110;

// 화면에서 보이는 실제 바닥 윗면
const FLOOR_TOP = 596;


// ========================================
// 엔진
// ========================================

const engine = Engine.create();

engine.gravity.x = 0;
engine.gravity.y = 1;

// 멈춘 형태소는 자연스럽게 sleep
engine.enableSleeping = true;

// 충돌 안정성
engine.positionIterations = 10;
engine.velocityIterations = 8;
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


// ========================================
// 형태소 9단계
// ========================================

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


// ========================================
// 이미지 로딩
// ========================================

const fruitImages =
  fruitLevels.map(function (fruit) {

    const img = new Image();

    img.src = fruit.image;

    return img;
  });


// ========================================
// 게임 상태
// ========================================

let score = 0;

let previewX =
  GAME_WIDTH / 2;

let canDrop = true;

let pointerDown = false;

let gameOver = false;

let scoreRegistered = false;

let dangerStartTime = null;


// 합체 예약
const mergeQueue = [];


// ========================================
// 시작 형태소
// ========================================

function randomStartLevel() {

  // 1~3단계만 랜덤으로 등장
  return Math.floor(
    Math.random() * 3
  );
}


let currentLevel =
  randomStartLevel();

let nextLevel =
  randomStartLevel();


// ========================================
// 바닥 / 벽
// ========================================

// 실제 충돌 바닥은 44px지만
// 대부분 화면 아래에 있어서
// 화면에는 약 4px만 보임

const floor = Bodies.rectangle(
  GAME_WIDTH / 2,

  FLOOR_TOP + 22,

  GAME_WIDTH + 80,

  44,

  {
    isStatic: true,

    label: "floor",

    restitution: 0,

    // 형태소가 어느 정도 굴러가면서
    // 자연스럽게 멈추도록 조절
    friction: 0.35,

    frictionStatic: 0.45,

    render: {
      fillStyle: "#222"
    }
  }
);


const leftWall = Bodies.rectangle(
  -15,

  GAME_HEIGHT / 2,

  34,

  GAME_HEIGHT + 120,

  {
    isStatic: true,

    label: "wall",

    restitution: 0,

    friction: 0.15,

    render: {
      fillStyle: "#222"
    }
  }
);


const rightWall = Bodies.rectangle(
  GAME_WIDTH + 15,

  GAME_HEIGHT / 2,

  34,

  GAME_HEIGHT + 120,

  {
    isStatic: true,

    label: "wall",

    restitution: 0,

    friction: 0.15,

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


// ========================================
// 안전 위치 계산
// ========================================

function clampX(
  x,
  radius
) {

  const minX =
    radius + 4;

  const maxX =
    GAME_WIDTH -
    radius -
    4;


  return Math.max(
    minX,
    Math.min(
      maxX,
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


// ========================================
// 형태소 생성
// ========================================

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

        // 아주 살짝만 튐
        restitution: 0.03,

        // 핵심:
        // 적당히 굴러가도록 마찰값 낮춤
        friction: 0.12,

        frictionStatic: 0.22,

        // 움직임이 자연스럽게 감속
        frictionAir: 0.004,

        density:
          0.0018 +
          level * 0.00012,

        slop: 0.04,

        // 너무 빨리 sleep 되지 않게
        sleepThreshold: 80,

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


  // 처음 생성할 때는 스핀 없음.
  // 이후 충돌로 생기는 자연스러운 회전은 허용.
  Body.setAngularVelocity(
    body,
    0
  );


  Body.setVelocity(
    body,
    {
      x: 0,
      y: 0
    }
  );


  Composite.add(
    engine.world,
    body
  );


  return body;
}


// ========================================
// 렌더링
// ========================================

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


    // ------------------------------------
    // 떨어진 형태소
    // ------------------------------------

    bodies.forEach(
      function (body) {

        if (
          body.label !== "fruit"
        ) {
          return;
        }


        const fruit =
          fruitLevels[
            body.fruitLevel
          ];


        const img =
          fruitImages[
            body.fruitLevel
          ];


        if (
          !fruit ||
          !img ||
          !img.complete
        ) {
          return;
        }


        const size =
          fruit.radius * 2;


        ctx.save();


        ctx.translate(
          body.position.x,
          body.position.y
        );


        // 자연스럽게 실제 회전 표시
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

          -size / 2,
          -size / 2,

          size,
          size
        );


        ctx.restore();
      }
    );


    // ------------------------------------
    // 게임오버 빨간선
    // ------------------------------------

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


    // ------------------------------------
    // 낙하 가이드
    // ------------------------------------

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
      "rgba(0, 0, 0, 0.10)";


    ctx.lineWidth =
      1;


    ctx.stroke();

    ctx.restore();


    // ------------------------------------
    // 현재 형태소 미리보기
    // ------------------------------------

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


// ========================================
// 미리보기 위치
// ========================================

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


// ========================================
// PC / 모바일 조작
// ========================================

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


    pointerDown = true;


    updatePreviewPosition(
      event.clientX
    );


    try {

      render.canvas
        .setPointerCapture(
          event.pointerId
        );

    } catch (error) {}
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


    pointerDown = false;


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

    pointerDown = false;
  }
);


// ========================================
// 떨어뜨리기
// ========================================

function dropFruit() {

  if (
    !canDrop ||
    gameOver
  ) {
    return;
  }


  canDrop = false;


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

        canDrop = true;
      }

    },

    450
  );
}


// ========================================
// 충돌 → 합체 예약
// ========================================

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
          a.label !== "fruit" ||
          b.label !== "fruit"
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


        // 마지막 단계는 합체하지 않음
        if (
          level >=
          fruitLevels.length - 1
        ) {
          return;
        }


        // 중복 합체 방지
        a.isMerging = true;
        b.isMerging = true;


        mergeQueue.push({
          a: a,
          b: b,
          level: level
        });
      }
    );
  }
);


// ========================================
// 합체 처리
// ========================================

function processMergeQueue() {

  while (
    mergeQueue.length > 0
  ) {

    const item =
      mergeQueue.shift();


    const a =
      item.a;

    const b =
      item.b;


    const worldBodies =
      Composite.allBodies(
        engine.world
      );


    if (
      !worldBodies.includes(a) ||
      !worldBodies.includes(b)
    ) {
      continue;
    }


    const nextLevel =
      item.level + 1;


    const nextRadius =
      fruitLevels[
        nextLevel
      ].radius;


    let newX =
      (
        a.position.x +
        b.position.x
      ) / 2;


    let newY =
      (
        a.position.y +
        b.position.y
      ) / 2;


    newX =
      clampX(
        newX,
        nextRadius
      );


    // 커진 형태소가 바닥에
    // 박혀서 튕기는 것 방지
    newY =
      Math.min(
        newY - 2,

        FLOOR_TOP -
        nextRadius -
        3
      );


    // 두 형태소 제거
    Composite.remove(
      engine.world,
      a
    );


    Composite.remove(
      engine.world,
      b
    );


    // 새 형태소 생성
    const merged =
      createFruit(
        newX,
        newY,
        nextLevel
      );


    // 합체 직후 갑자기 날아가는 것만 방지
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
  }
}


// ========================================
// 물리 안전장치
// ========================================

function physicsSafety() {

  const bodies =
    Composite.allBodies(
      engine.world
    );


  bodies.forEach(
    function (body) {

      if (
        body.label !== "fruit"
      ) {
        return;
      }


      const radius =
        fruitLevels[
          body.fruitLevel
        ].radius;


      // --------------------------------
      // 너무 빠른 이동만 제한
      // --------------------------------

      const MAX_SPEED = 14;


      if (
        body.speed >
        MAX_SPEED
      ) {

        const ratio =
          MAX_SPEED /
          body.speed;


        Body.setVelocity(
          body,
          {
            x:
              body.velocity.x *
              ratio,

            y:
              body.velocity.y *
              ratio
          }
        );
      }


      // --------------------------------
      // 너무 심한 회전만 제한
      //
      // 회전 자체는 허용
      // --------------------------------

      const MAX_ANGULAR_SPEED =
        0.08;


      if (
        Math.abs(
          body.angularVelocity
        ) >
        MAX_ANGULAR_SPEED
      ) {

        Body.setAngularVelocity(
          body,

          Math.sign(
            body.angularVelocity
          ) *
          MAX_ANGULAR_SPEED
        );
      }


      // --------------------------------
      // 정말 아래로 빠진 경우만 복구
      // --------------------------------

      if (
        body.position.y >
        GAME_HEIGHT + 70
      ) {

        Body.setPosition(
          body,
          {
            x:
              clampX(
                body.position.x,
                radius
              ),

            y:
              FLOOR_TOP -
              radius -
              8
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


      // --------------------------------
      // 옆으로 완전히 빠진 경우
      // --------------------------------

      if (
        body.position.x <
          -70 ||

        body.position.x >
          GAME_WIDTH + 70
      ) {

        Body.setPosition(
          body,
          {
            x:
              clampX(
                body.position.x,
                radius
              ),

            y:
              body.position.y
          }
        );


        Body.setVelocity(
          body,
          {
            x: 0,
            y: body.velocity.y
          }
        );
      }
    }
  );
}


// ========================================
// 매 물리 프레임 종료 후
// ========================================

Events.on(
  engine,
  "afterUpdate",

  function () {

    // 충돌 이벤트가 끝난 뒤 합체
    processMergeQueue();


    // 비정상적인 물리 현상만 제한
    physicsSafety();


    // 게임오버 확인
    checkGameOver();
  }
);


// ========================================
// 게임오버 판정
// ========================================

function checkGameOver() {

  if (gameOver) {
    return;
  }


  const now =
    Date.now();


  const bodies =
    Composite.allBodies(
      engine.world
    );


  let danger =
    false;


  for (
    const body
    of bodies
  ) {

    if (
      body.label !== "fruit"
    ) {
      continue;
    }


    // 막 떨어진 형태소 제외
    if (
      now -
      body.spawnTime <
      1200
    ) {
      continue;
    }


    // 곧 합체될 형태소 제외
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
        1.1
    ) {

      danger = true;

      break;
    }
  }


  if (!danger) {

    dangerStartTime = null;

    return;
  }


  if (
    dangerStartTime === null
  ) {

    dangerStartTime =
      now;

    return;
  }


  if (
    now -
    dangerStartTime >=
    1500
  ) {

    endGame();
  }
}


// ========================================
// 게임오버
// ========================================

function endGame() {

  if (gameOver) {
    return;
  }


  gameOver = true;

  canDrop = false;


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


// ========================================
// 랭킹 등록
// ========================================

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


      if (
        nickname.length > 10
      ) {

        if (message) {

          message.textContent =
            "닉네임은 10자 이하로 입력해주세요.";
        }

        return;
      }


      try {

        if (message) {

          message.textContent =
            "등록 중...";
        }


        if (
          typeof saveScore !==
          "function"
        ) {

          throw new Error(
            "랭킹 서버 연결을 확인해주세요."
          );
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


// ========================================
// Enter → 등록
// ========================================

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
        event.key === "Enter"
      ) {

        registerButton.click();
      }
    }
  );
}


// ========================================
// 다시하기
// ========================================

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


// ========================================
// 점수
// ========================================

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


// ========================================
// NEXT
// ========================================

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


// ========================================
// 시작
// ========================================

updateScore();

updateNextDisplay();
