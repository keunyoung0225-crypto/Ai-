# 2026년 정책모아

수의계약·위수탁지원사업 등 2026년 정책 공고를 한곳에서 검색하는 웹앱입니다.

## 주요 기능
- **검색유형 버튼**: 전체 / 수의계약 / 위수탁지원사업 (누르면 바로 필터링)
- **조건 검색**: 공고명, 공고일(기간), 주체기관, 사업기간(기간)
- **결과 표**: 공고일 · 주체기관 · 사업기간 · 정책사업내용 · 예산 · 지원마감일
  - 정책사업내용 칸에 공고명(굵게)과 사업 요약을 함께 표시
  - 예산은 `12억 5,000만원` 형식으로 표시

> 현재 공고 데이터(`data/policies.json`)는 **시연용 가상 데이터**입니다.

## 실행 방법
ES 모듈과 JSON 파일을 사용하므로 `index.html`을 더블클릭(`file://`)하면 동작하지 않습니다.
아래처럼 간단한 웹 서버로 실행하거나 GitHub Pages 주소로 접속하세요.

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## GitHub Pages 배포
1. 저장소 **Settings → Pages**
2. **Source**: `Deploy from a branch`, **Branch**: 배포할 브랜치 / `/ (root)` 선택 후 Save
3. 잠시 후 `https://<사용자명>.github.io/<저장소명>/` 에서 확인

## 폴더 구조
```
index.html              페이지 뼈대
css/tokens.css          색상·글꼴·간격 변수 (배경 하늘색 등)
css/base.css            기본 레이아웃
css/components.css      버튼·검색폼·표 스타일
js/config.js            ★ 카테고리·검색 조건·표 열 정의
js/main.js              앱 시작점 (부품 연결)
js/state.js             검색 상태 저장소
js/data/repository.js   데이터 조회 창구
js/data/sources/        데이터 출처 (jsonSource: 샘플, apiSource: API 연동 자리)
js/services/filter.js   검색·정렬 로직
js/services/format.js   날짜·예산 표시 형식
js/components/          헤더, 카테고리 버튼, 검색 폼, 결과 표
data/policies.json      공고 데이터
```

## 확장 방법
| 하고 싶은 것 | 수정할 곳 |
|---|---|
| 카테고리 추가 | `js/config.js`의 `CATEGORIES`에 한 줄 추가 + 데이터 `category` 값 맞추기 |
| 표 열 추가·순서 변경 | `js/config.js`의 `COLUMNS` |
| 검색 조건 추가 | `js/config.js`의 `SEARCH_FIELDS` (`text` / `select` / `dateRange`) |
| 색상 변경 | `css/tokens.css` |
| 공공 API 연동 | `js/data/sources/apiSource.js` 구현 후 `config.js`의 `DATA_SOURCE`를 `'api'`로 |

자세한 개발 계획은 [PLAN.md](PLAN.md)를 참고하세요.
