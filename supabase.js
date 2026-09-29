const SUPABASE_URL =
  "https://webigdugwinewuyhybnx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_45Z1QOfL9KydKB60_wHMJA_Ztr1a1e9";


const db =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


// ========================================
// 점수 + 연락처 저장
// ========================================

async function saveScore(
  nickname,
  score,
  phone = ""
) {
  const cleanNickname =
    String(nickname).trim();

  const cleanPhone =
    String(phone).trim();

  const cleanScore =
    Number(score);


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
    !Number.isFinite(cleanScore) ||
    cleanScore < 0
  ) {
    throw new Error(
      "잘못된 점수입니다."
    );
  }


  if (cleanPhone) {
    const phonePattern =
      /^[0-9+() -]{7,20}$/;

    if (
      !phonePattern.test(
        cleanPhone
      )
    ) {
      throw new Error(
        "전화번호 형식을 확인해주세요."
      );
    }
  }


  const {
    error
  } =
    await db.rpc(
      "submit_score",
      {
        p_nickname:
          cleanNickname,

        p_score:
          Math.floor(cleanScore),

        p_phone:
          cleanPhone || null
      }
    );


  if (error) {
    console.error(
      "점수 등록 실패:",
      error
    );

    throw new Error(
      "점수 등록에 실패했습니다."
    );
  }
}


// ========================================
// TOP 10
// ========================================

async function loadRanking() {

  const rankingList =
    document.getElementById(
      "rankingList"
    );


  if (!rankingList) {
    return;
  }


  rankingList.innerHTML =
    "<li>랭킹 불러오는 중...</li>";


  try {
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
      throw error;
    }


    rankingList.innerHTML =
      "";


    if (
      !data ||
      data.length === 0
    ) {
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
          `${index + 1}위`;


        const name =
          document.createElement(
            "span"
          );

        name.className =
          "ranking-name";

        name.textContent =
          player.nickname;


        const score =
          document.createElement(
            "span"
          );

        score.className =
          "ranking-score";

        score.textContent =
          Number(
            player.score
          ).toLocaleString();


        li.appendChild(rank);
        li.appendChild(name);
        li.appendChild(score);

        rankingList.appendChild(
          li
        );
      }
    );

  } catch (error) {

    console.error(
      "랭킹 불러오기 실패:",
      error
    );

    rankingList.innerHTML =
      "<li>랭킹을 불러오지 못했습니다.</li>";
  }
}


window.addEventListener(
  "DOMContentLoaded",
  function () {
    loadRanking();
  }
);
