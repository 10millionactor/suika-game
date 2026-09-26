// ==============================
// Supabase 설정
// ==============================


const SUPABASE_URL = "https://webigdugwinewuyhybnx.supabase.co"
  

const SUPABASE_KEY = "sb_publishable_45Z1QOfL9KydKB60_wHMJA_Ztr1a1e9"
  

// 클라이언트 생성
const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==============================
// 점수 등록
// ==============================

async function saveScore(
  nickname,
  score
) {

  const cleanNickname =
    nickname.trim();

  if (!cleanNickname) {
    throw new Error(
      "닉네임을 입력해주세요."
    );
  }

  if (
    cleanNickname.length > 10
  ) {
    throw new Error(
      "닉네임은 10자 이하로 입력해주세요."
    );
  }

  if (
    !Number.isInteger(score) ||
    score < 0
  ) {
    throw new Error(
      "잘못된 점수입니다."
    );
  }

  const { error } =
    await db
      .from("rankings")
      .insert([
        {
          nickname:
            cleanNickname,

          score:
            score
        }
      ]);

  if (error) {
    console.error(error);

    throw new Error(
      "점수 등록에 실패했습니다."
    );
  }
}


// ==============================
// TOP 10 불러오기
// ==============================

async function loadRanking() {

  const rankingList =
    document.getElementById(
      "rankingList"
    );

  rankingList.innerHTML =
    "<li>랭킹 불러오는 중...</li>";

  const {
    data,
    error
  } =
    await db
      .from("rankings")
      .select(
        "nickname, score"
      )
      .order(
        "score",
        {
          ascending: false
        }
      )
      .limit(10);

  if (error) {

    console.error(error);

    rankingList.innerHTML =
      "<li>랭킹을 불러오지 못했습니다.</li>";

    return;
  }

  rankingList.innerHTML = "";

  if (!data.length) {

    rankingList.innerHTML =
      "<li>아직 등록된 기록이 없습니다.</li>";

    return;
  }

  data.forEach(
    function (
      player,
      index
    ) {

      const li =
        document.createElement(
          "li"
        );

      li.className =
        "ranking-item";

      const rank =
        document.createElement(
          "span"
        );

      rank.className =
        "ranking-rank";

      rank.textContent =
        (index + 1) + "위";


      const name =
        document.createElement(
          "span"
        );

      name.className =
        "ranking-name";

      // textContent를 사용해서
      // HTML 삽입 방지
      name.textContent =
        player.nickname;


      const score =
        document.createElement(
          "span"
        );

      score.className =
        "ranking-score";

      score.textContent =
        player.score.toLocaleString();


      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(score);

      rankingList.appendChild(li);
    }
  );
}


// 페이지 열리면 랭킹 로드
loadRanking();

