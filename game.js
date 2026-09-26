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

// 실제 바닥의 윗면
// 화면에서는 약 4px 정도만 보임
const FLOOR_Y = 596;


// ========================================
// Matter.js 엔진
// ========================================

const engine = Engine.create();

// 멈춘 형태소는 자동으로 sleep
// → 바들거림 감소
engine.enableSleeping = true;

engine.gravity.x = 0;
engine.gravity.y = 1;

// 충돌 안정성
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

let currentLevel =
  randomStartLevel();

let nextLevel =
  randomStartLevel();

let canDrop = true;

let pointerDown = false;

let gameOver = false;

let scoreRegistered = false;

let dangerStartTime = null;


// 합체 예약 목록
// 충돌 이벤트 도중 바로 body를 삭제/생성하지 않음
const mergeQueue = [];


// ========================================
// 시작 형태소 랜덤
// ========================================

function randomStartLevel() {

  return Math.floor(
    Math.random() * 3
  );
}


// ========================================
// 벽 / 바닥
// ========================================


// ------------------------------
// 바닥
//
// 윗면: y = 596
// 실제 몸체 대부분은 화면 아래에 있음
// 그래서 화면상 두껍게 보이지 않음
// ------------------------------

const floor = Bodies.rectangle(
  GAME_WIDTH / 2,

  FLOOR_Y + 20,

  GAME_WIDTH + 80,

  40,

  {
    isStatic: true,

    label: "floor",

    restitution: 0,

    friction: 0.8,

    render: {
      fillStyle: "#222"
    }
  }
);


// ------------------------------
// 왼쪽 벽
// 대부분 화면 바깥
// ------------------------------

const leftWall = Bodies.rectangle(
  -11,

  GAME_HEIGHT / 2,

  30,

  GAME_HEIGHT + 100,

  {
    isStatic: true,

    label: "wall",

    restitution: 0,

    friction: 0.5,

    render: {
      fillStyle: "#222"
    }
  }
);


// ------------------------------
// 오른쪽 벽
// ------------------------------

const rightWall = Bodies.rectangle(
  GAME_WIDTH + 11,

  GAME_HEIGHT / 2,

  30,

  GAME_HEIGHT + 100,

  {
    isStatic: true,

    label: "wall",

    restitution: 0,

    friction: 0.5,

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
// 안전한 X 위치
// ========================================

function clampX(
  x,
  radius
) {

  const min =
    radius + 5;

  const max =
    GAME_WIDTH -
    radius -
    5;


  return Math.max(
    min,
    Math.min(
      max,
      x
    )
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


  // 바닥 속에서 생성되는 것 방지
  const maximumY =
    FLOOR_Y -
    fruit.radius -
    2;


  const safeY =
    Math.min(
      y,
      maximumY
    );


  const body =
    Bodies.circle(
      safeX,
      safeY,
      fruit.radius,

      {
        label: "fruit",

        // 튀는 힘 제거
        restitution: 0,

        friction: 0.22,

        frictionStatic: 0.5,

        // 움직임 안정화
        frictionAir: 0.01,

        density:
          0.0018 +
          level * 0.00015,

        // 작은 위치 오차 허용
        // 너무 낮으면 바들거림 증가
        slop: 0.04,

        sleepThreshold: 45,

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


  // ==================================
  // 회전 완전 금지
  // ==================================

  Body.setInertia(
    body,
    Infinity
  );

  Body.setAngularVelocity(
    body,
    0
  );

  Body.setAngle(
    body,
    0
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


    // --------------------------------
    // 실제 형태소
    // --------------------------------

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


        // ★ 일부러 ctx.rotate() 없음
        // 이미지가 빙글빙글 돌지 않음


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


    // --------------------------------
    // 빨간 게임오버 선
    // --------------------------------

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


    // --------------------------------
    // 낙하 위치 가이드
    // --------------------------------

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
      "rgba(0,0,0,0.10)";

    ctx.lineWidth =
      1;

    ctx.stroke();

    ctx.restore();


    // --------------------------------
    // 위쪽 미리보기
    // --------------------------------

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


    const size =
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
        size / 2,

      45 -
        size / 2,

      size,
      size
    );


    ctx.restore();
  }
);


// ========================================
// 마우스 / 터치 위치
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
// PC + 모바일 조작
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
// 형태소 떨어뜨리기
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


        // 마지막 단계는 합체 안 함
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
// 예약된 합체 처리
// ========================================

function processMergeQueue() {

  if (
    mergeQueue.length === 0
  ) {
    return;
  }


  while (
    mergeQueue.length > 0
  ) {

    const merge =
      mergeQueue.shift();


    const a =
      merge.a;

    const b =
      merge.b;


    // 이미 world에서 없어진 body인지 확인
    const bodies =
      Composite.allBodies(
        engine.world
      );


    if (
      !bodies.includes(a) ||
      !bodies.includes(b)
    ) {
      continue;
    }


    const nextLevel =
      merge.level + 1;


    const newRadius =
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
        newRadius
      );


    // ---------------------------------
    // 새 형태소가 바닥에 박히지 않도록
    // ---------------------------------

    const lowestSafeY =
      FLOOR_Y -
      newRadius -
      3;


    newY =
      Math.min(
        newY,
        lowestSafeY
      );


    // 합체할 때 아주 약간 위로
    // 공간을 확보
    newY -= 2;


    // 기존 2개 삭제
    Composite.remove(
      engine.world,
      a
    );


    Composite.remove(
      engine.world,
      b
    );


    // 새 형태소 생성
    const newFruit =
      createFruit(
        newX,
        newY,
        nextLevel
      );


    // 합체 직후 속도 없음
    Body.setVelocity(
      newFruit,
      {
        x: 0,
        y: 0
      }
    );


    Body.setAngularVelocity(
      newFruit,
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
// 비정상 이탈만 복구
//
// 중요:
// 매 프레임 위치를 강제로 고치는 게 아님.
// 진짜 게임판 밖으로 빠진 경우에만 실행.
// 그래서 바들거림을 만들지 않음.
// ========================================

function emergencyRescue() {

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
      // 아래로 완전히 빠진 경우
      // --------------------------------

      if (
        body.position.y >
        GAME_HEIGHT + 60
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
              FLOOR_Y -
              radius -
              10
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


        return;
      }


      // --------------------------------
      // 옆으로 완전히 빠진 경우
      // --------------------------------

      if (
        body.position.x <
          -50 ||

        body.position.x >
          GAME_WIDTH + 50
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
            y:
              Math.min(
                body.velocity.y,
                4
              )
          }
        );
      }


      // --------------------------------
      // 비정상적으로 빠른 속도만 제한
      // --------------------------------

      const maxSpeed = 14;


      if (
        body.speed >
        maxSpeed
      ) {

        const scale =
          maxSpeed /
          body.speed;


        Body.setVelocity(
          body,
          {
            x:
              body.velocity.x *
              scale,

            y:
              body.velocity.y *
              scale
          }
        );
      }
    }
  );
}


// ========================================
// 매 물리 프레임 이후
// ========================================

Events.on(
  engine,
  "afterUpdate",

  function () {

    // 충돌 처리 끝난 다음 합체
    processMergeQueue();


    // 정말 비정상 이탈했을 때만 복구
    emergencyRescue();


    checkGameOver();
  }
);


// ========================================
// 게임오버 검사
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


    // 막 떨어진 형태소는 제외
    if (
      now -
      body.spawnTime <
      1200
    ) {
      continue;
    }


    // 합체 예정 형태소 제외
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


    // 빨간선을 넘어가 있고
    // 거의 움직이지 않을 때
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


  // 1.5초 이상 계속 선 위에 있으면 게임 종료
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
          ? nicknameInput.value.trim()
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
// Enter → 랭킹 등록
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
// 점수 표시
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
// NEXT 표시
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
