// ========================================
// Supabase 설정
// ========================================

const SUPABASE_URL =
  "https://webigdugwinewuyhybnx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_45Z1QOfL9KydKB60_wHMJA_Ztr1a1e9";


if (
  !SUPABASE_URL.startsWith("https://")
) {
  throw new Error(
    "Supabase URL이 잘못되었습니다."
  );
}


if (
  !SUPABASE_KEY.startsWith(
    "sb_publishable_"
  )
) {
  throw new Error(
    "Supabase Publishable Key가 잘못되었습니다."
  );
}


// Supabase 클라이언트 생성
const db =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


console.log(
  "Supabase 연결 준비 완료"
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


  // 닉네임 검사
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


  // 점수 검사
  const numericScore =
    Number(score);


  if (
    !Number.isFinite(
      numericScore
    ) ||
    numericScore < 0
  ) {

    throw new Error(
      "점수가 올바르지 않습니다."
    );
  }


  // 전화번호는 선택사항
  if (cleanPhone) {

    if (
      cleanPhone.length > 20
    ) {

      throw new Error(
        "전화번호를 확인해주세요."
      );
    }


    // 숫자 / + / - / 괄호 / 공백만 허용
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


  // ==================================
  // RPC 사용
  //
  // 공개 rankings와
  // 비공개 ranking_contacts를
  // 서버 함수에서 동시에 저장
  // ==================================

  const {
    error
  } =
    await db.rpc(
      "submit_score",
      {
        p_nickname:
          cleanNickname,

        p_score:
          Math.floor(
            numericScore
          ),

        p_phone:
          cleanPhone || null
      }
    );


  if (error) {

    console.error(
      "점수 저장 실패:",
      error
    );


    throw new Error(
      error.message ||
      "점수 등록에 실패했습니다."
    );
  }


  console.log(
    "점수 등록 성공"
  );
}


// ========================================
// 공개 TOP 10 불러오기
// ========================================

async function loadRanking() {

  const rankingList =
    document.getElementById(
      "rankingList"
    );


  if (!rankingList) {

    console.error(
      "rankingList 요소가 없습니다."
    );

    return;
  }


  rankingList.innerHTML =
    "<li>랭킹 불러오는 중...</li>";


  try {

    // 중요:
    // 전화번호는 절대 조회하지 않음
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


    console.log(
      "랭킹 데이터:",
      data
    );


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


        // 순위
        const rank =
          document.createElement(
            "span"
          );


        rank.className =
          "ranking-rank";


        rank.textContent =
          `${index + 1}위`;


        // 닉네임
        const name =
          document.createElement(
            "span"
          );


        name.className =
          "ranking-name";


        name.textContent =
          player.nickname;


        // 점수
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


        li.appendChild(
          rank
        );


        li.appendChild(
          name
        );


        li.appendChild(
          score
        );


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


// 페이지 처음 열었을 때
// 랭킹 불러오기
window.addEventListener(
  "DOMContentLoaded",

  function () {

    loadRanking();
  }
);
