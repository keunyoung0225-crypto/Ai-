// scripts/collectors/myApi.js
import fetch from 'node-fetch'; // 필요시 fetch나 axios 사용

export async function collectMyApi() {
  try {
    const response = await fetch('https://api.example.com/policies');
    const json = await response.json();

    // API 응답 데이터를 프로젝트 표준 공고 형식으로 변환
    return json.items.map(item => ({
      id: item.notice_id,
      title: item.title,
      category: "지원금", // 설정된 카테고리에 맞게 매핑
      deadline: item.end_date,
      url: item.link
    }));
  } catch (error) {
    console.error("MyAPI 수집 실패:", error);
    return [];
  }
}
