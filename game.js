const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

// 물리 엔진 생성
const engine = Engine.create();

// 게임판 크기
const GAME_WIDTH = 360;
const GAME_HEIGHT = 600;

// 렌더링
const render = Render.create({
  element: document.getElementById("game"),
  engine: engine,
  options: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    wireframes: false,
    background: "#ffffff"
  }
});

Render.run(render);

// 엔진 실행
const runner = Runner.create();
Runner.run(runner, engine);

// 바닥
const floor = Bodies.rectangle(
  GAME_WIDTH / 2,
  GAME_HEIGHT - 10,
  GAME_WIDTH,
  20,
  {
    isStatic: true,
    render: {
      fillStyle: "#333"
    }
  }
);

// 왼쪽 벽
const leftWall = Bodies.rectangle(
  5,
  GAME_HEIGHT / 2,
  10,
  GAME_HEIGHT,
  {
    isStatic: true,
    render: {
      fillStyle: "#333"
    }
  }
);

// 오른쪽 벽
const rightWall = Bodies.rectangle(
  GAME_WIDTH - 5,
  GAME_HEIGHT / 2,
  10,
  GAME_HEIGHT,
  {
    isStatic: true,
    render: {
      fillStyle: "#333"
    }
  }
);

Composite.add(engine.world, [
  floor,
  leftWall,
  rightWall
]);

// 게임판 클릭하면 공 생성
render.canvas.addEventListener("click", (event) => {
  const rect = render.canvas.getBoundingClientRect();

  const x =
    (event.clientX - rect.left) *
    (GAME_WIDTH / rect.width);

  const ball = Bodies.circle(
    x,
    50,
    25,
    {
      restitution: 0.3,
      friction: 0.05,
      render: {
        fillStyle: "#ff8fa3"
      }
    }
  );

  Composite.add(engine.world, ball);
});
