# 2026년 모아보는 정책한눈

수의계약·위수탁지원사업 등 2026년 정책 공고를 한곳에서 검색하는 웹앱입니다.

## 주요 기능
- **검색유형 버튼**: 전체 / 수의계약 / 위수탁지원사업 (누르면 바로 필터링)
- **키워드 검색**: 공고명·사업내용·지원대상·기관을 한꺼번에 검색 (띄어쓰기로 여러 단어를 넣으면 모두 포함된 공고)
- **조건 검색**: 공고명, 공고일(기간), 주체기관, 사업기간(기간)
- **결과 표**: 공고일 · 주체기관 · 사업기간 · 정책사업내용 · 예산 · 지원마감일
  - 정책사업내용 칸에 공고명(굵게)과 사업 요약을 함께 표시
  - 예산은 `12억 5,000만원` 형식으로 표시
- **정렬**: 공고일·예산·지원마감일 머리글 클릭 (모바일은 정렬 메뉴)
  - 지원마감일 정렬 시 이미 마감된 공고는 항상 맨 뒤
- **더보기**: 10건씩 나눠 표시
- **상세 보기**: 공고명을 누르면 지원대상 등 전체 정보 표시
- **D-day 배지**: 마감 7일 이내는 빨간색, 지난 공고는 `마감`
- **링크 공유**: 검색 조건·정렬·열어 둔 공고가 주소(URL)에 저장되어 그대로 공유 가능
- **모바일**: 좁은 화면에서는 표가 카드형 목록으로 바뀜
- **관심공고**: 공고명 옆 ☆을 눌러 저장, `★ 관심공고만`으로 모아 보기 (이 기기 브라우저에 저장)
- **마감 알림**: 관심공고 중 마감 7일 이내 공고를 화면 위쪽에 표시
- **엑셀 다운로드**: 현재 검색·정렬 결과 전체를 CSV(엑셀에서 열림)로 저장
- **비슷한 공고**: 상세 보기에서 같은 유형·기관·비슷한 제목의 공고 추천
- **화면 모드**: 오른쪽 위 버튼으로 자동 / 밝게 / 어둡게
- **접근성**: 키보드 초점 표시, '검색 결과로 바로가기', 움직임 줄이기 설정 존중
- **휴대폰 알림**: 관심 키워드에 맞는 새 공고를 매일 아침 9시에 휴대폰으로 알림 (무료 앱 ntfy, 아래 '휴대폰 알림' 참고)
- **매일 자동 갱신**: 매일 아침 구글 시트·CSV, 나라장터 API에서 공고를 모아 데이터 갱신, 새 공고에 `NEW` 표시 (아래 '공고 데이터 매일 갱신' 참고)

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
js/data/sources/        데이터 출처 (jsonSource: 샘플 JSON, apiSource: 외부 API)
js/data/adapters/       API 응답 → 공고 데이터 변환 방식
js/data/normalize.js    날짜·예산 형식 정리, 잘못된 항목 제외
js/services/filter.js   검색·정렬 로직
js/services/format.js   날짜·예산 표시 형식
js/services/date.js     D-day 계산
js/services/urlState.js 검색 상태 ↔ URL 주소 변환
js/services/storage.js  브라우저 저장소 안전 사용
js/services/favorites.js 관심공고 저장
js/services/csv.js      엑셀(CSV) 만들기·내려받기
js/services/recommend.js 비슷한 공고 추천 (규칙 기반 + AI 연결 자리)
js/services/alerts.js   알림 대상 공고 찾기·알림 문구 만들기
js/services/ntfy.js     ntfy 알림 보내기
js/components/          헤더, 화면 모드, 카테고리 버튼, 검색 폼, 결과 표, 정렬 메뉴, 더보기,
                        상세 보기 창, 관심공고 별, 결과 도구, 마감 알림, 휴대폰 알림 설정
data/policies.json      공고 데이터
alerts/subscriptions.json  휴대폰 알림 관심 키워드
scripts/update-data.mjs 매일 공고 데이터 갱신 스크립트
scripts/sources.json    갱신할 데이터 출처 설정 (켜기/끄기)
scripts/collectors/     출처별 수집기 (csv: 구글 시트·CSV, naraBid: 나라장터 API)
scripts/notify.mjs      매일 아침 알림 발송 스크립트
templates/policies-template.csv  공고 입력용 표 양식
.github/workflows/daily.yml  매일 08:30 갱신 → 저장 → 알림 자동 실행 설정
```

## 확장 방법
| 하고 싶은 것 | 수정할 곳 |
|---|---|
| 카테고리 추가 | `js/config.js`의 `CATEGORIES`에 한 줄 추가 + 데이터 `category` 값 맞추기 |
| 표 열 추가·순서 변경 | `js/config.js`의 `COLUMNS` |
| 검색 조건 추가 | `js/config.js`의 `SEARCH_FIELDS` (`keyword` / `text` / `select` / `dateRange`) — URL 공유도 자동 적용 |
| 키워드 검색 대상 항목 | `js/config.js`의 `SEARCH_FIELDS` 중 `keyword`의 `fields` |
| 정렬 가능한 열 추가 | `js/config.js`의 `COLUMNS` 항목에 `sort` 추가 |
| 상세 보기 항목 변경 | `js/config.js`의 `DETAIL_FIELDS` |
| 한 번에 보이는 건수, 마감 임박 기준 | `js/config.js`의 `PAGE_SIZE`, `DEADLINE_WARNING_DAYS` |
| 색상 변경 | `css/tokens.css` |
| 공공 API 연동 | 아래 'API 연동' 참고 |
| 엑셀 다운로드 항목 | `js/config.js`의 `EXPORT_FIELDS` |
| AI 추천 연결 | `js/services/recommend.js`의 `ai` 구현 후 `config.js`의 `RECOMMENDER`를 `'ai'`로 |

## API 연동
1. `js/data/adapters/`에 응답을 공고 형식으로 바꾸는 함수를 만들고 `adapters/index.js`에 등록합니다.
   공고 형식은 `data/policies.json`과 같으며(`id`, `category`, `title`, `announceDate`, `agency`,
   `period{start,end}`, `content`, `target`, `budget`, `deadline`, `url`), 날짜는 `20260302`·`2026.03.02` 같은
   표기도 자동으로 정리됩니다.
2. `js/config.js`에서 `DATA_SOURCE = 'api'`, `API_CONFIG.endpoint`·`adapter`를 설정합니다.
3. API가 실패하면 `fallbackToJson: true`일 때 샘플 데이터로 대체하고 화면 하단에 안내합니다.

> **주의**: 공공데이터포털 등 인증키가 필요한 API는 키를 이 앱(브라우저 코드)에 넣지 마세요.
> 누구나 볼 수 있습니다. 또 많은 공공 API는 브라우저에서 직접 호출하는 것(CORS)을 막아 둡니다.
> 자체 서버(프록시)에서 키를 붙여 호출하고, `endpoint`에는 그 서버 주소를 적는 방식을 권장합니다.
> 실제 공공 API는 아직 연결해 보지 않았으므로, 연결 시 응답 필드 이름을 API 문서로 확인해야 합니다.

## 공고 데이터 매일 갱신
매일 08:30(한국 시각)에 GitHub Actions가 `scripts/update-data.mjs`로 공고를 모아 `data/policies.json`을 갱신하고
저장소에 저장합니다. 사이트(GitHub Pages)는 저장된 데이터로 자동으로 다시 만들어지고, 이어서 휴대폰 알림을 보냅니다.

### 데이터 출처 켜기
`scripts/sources.json`에서 쓸 출처의 `"enabled"`를 `true`로 바꾸고, 필요한 값을 GitHub 저장소
**Settings → Secrets and variables → Actions → Secrets**에 등록합니다. 두 출처를 함께 써도 됩니다.

| 출처 | 내용 | 등록할 Secret |
|---|---|---|
| `sheet` (구글 시트·CSV) | 직접 정리한 공고. 수의계약·위수탁지원사업 모두 가능 | `POLICY_SHEET_CSV_URL` |
| `nara` (나라장터 API) | 조달청 나라장터의 수의계약 공고 자동 수집 | `DATA_GO_KR_KEY` |

**구글 시트로 관리하기 (권장)**
1. `templates/policies-template.csv`를 구글 시트로 가져옵니다. 열: 공고ID(선택), 검색유형, 공고명, 공고일, 주체기관,
   사업기간, 정책사업내용, 지원대상, 예산(원), 지원마감일, 공고URL(선택)
   - 사이트의 **엑셀 다운로드** 파일도 같은 열 이름이라 그대로 가져와 고칠 수 있습니다.
   - 예산은 `30000000`, `3,000만원`, `12억 5000만원` 모두 됩니다. 검색유형은 `수의계약` 또는 `위수탁지원사업`.
   - 공고명을 나중에 고칠 수 있다면 **공고ID**를 넣어 두세요. (없으면 공고명·기관·공고일로 ID를 만들어서, 고치면 새 공고로 인식)
2. 시트 메뉴 **파일 → 공유 → 웹에 게시**에서 시트를 **쉼표로 구분된 값(.csv)** 으로 게시하고 주소를 복사합니다.
3. 그 주소를 Secret `POLICY_SHEET_CSV_URL`로 등록하고 `sources.json`의 `sheet`를 켭니다.

**나라장터 API 연결**
1. 공공데이터포털(data.go.kr)에서 **조달청_나라장터 입찰공고정보서비스** 활용 신청을 하고 인증키(일반 인증키, Decoding)를 받습니다.
2. 인증키를 Secret `DATA_GO_KR_KEY`로 등록하고 `sources.json`의 `nara`를 켭니다.
3. 계약 방법에 "수의"가 들어간 공고만 `수의계약`으로 가져옵니다. (`contractMethodIncludes`로 변경)

> ⚠ 나라장터 수집기는 실제 API로 시험하지 못했습니다. 처음 연결한 뒤 Actions 실행 결과를 확인하고,
> 오류가 나면 공공데이터포털 문서의 주소(`endpoint`)·기능 이름(`operations`)·응답 필드 이름을
> `sources.json`과 `scripts/collectors/naraBid.js`에 맞춰 주세요.

### 갱신 규칙
- 처음 들어온 공고에는 수집한 날짜(`firstSeen`)를 기록하고, 사이트에서 이틀 동안 `NEW`로 표시합니다.
- **9시 알림은 그날 갱신에서 새로 들어온 공고**만 대상으로 합니다. 출처를 처음 연결한 날은 기존 공고가 한꺼번에
  들어오므로 알림을 보내지 않습니다.
- 실제 출처에서 공고가 들어오면 시연용 샘플 공고는 자동으로 지워집니다.
- 마감일(없으면 공고일)이 `keepDays`(기본 365일)보다 오래된 공고는 지웁니다.
- 출처 하나가 실패해도 그 출처의 기존 공고는 유지하고 나머지는 갱신합니다. 모든 출처가 실패하면 작업이 실패로 표시됩니다.
- 실행 결과(출처별 수신·새 공고 건수)는 **Actions** 탭의 실행 기록에서 볼 수 있습니다.
- 출처를 하나도 켜지 않으면 `data/policies.json`을 직접 고치는 방식으로 쓸 수 있고, 이때 알림은 어제 공고일인 공고를 대상으로 합니다.

```bash
# 내 컴퓨터에서 확인 (저장하지 않고 결과만 출력)
POLICY_SHEET_CSV_URL="게시한 CSV 주소" node scripts/update-data.mjs --dry-run
```

새 출처를 붙이려면 `scripts/collectors/`에 수집기를 만들어 `collectors/index.js`에 등록하고 `sources.json`에 추가합니다.

## 휴대폰 알림 (매일 아침 9시)
관심 키워드에 맞는 공고가 새로 올라오면 매일 아침 9시(한국 시각)에 휴대폰으로 알려 줍니다.
서버 없이 **GitHub Actions**(매일 자동 실행)와 무료 푸시 알림 앱 **ntfy**를 사용합니다.

### 설정 방법
사이트 오른쪽 위 **휴대폰 알림** 버튼을 누르면 아래 과정을 화면에서 안내하고, 설정 내용을 만들어 줍니다.

1. 휴대폰에 **ntfy** 앱을 설치합니다. (Play 스토어·App Store에서 "ntfy" 검색)
2. 사이트의 알림 설정 창에서 관심 키워드를 입력하고, 만들어진 **알림 주제 이름**을 앱에서 구독합니다.
   **테스트 알림 보내기**로 알림이 오는지 확인하세요.
3. GitHub 저장소 **Settings → Secrets and variables → Actions → Secrets**에 `NTFY_TOPIC` = 알림 주제 이름을 추가합니다.
4. 설정 창의 내용을 복사해 `alerts/subscriptions.json`에 저장(커밋)합니다.
5. (선택) 같은 화면 **Variables**에 `SITE_URL` = 사이트 주소를 추가하면 알림을 눌렀을 때 사이트가 열립니다.

### 동작 방식
- `.github/workflows/daily.yml`이 매일 08:30에 공고를 갱신한 뒤 `scripts/notify.mjs`를 실행합니다.
  GitHub의 예약 실행은 몇 분~수십 분 늦을 수 있어 미리 실행하고, ntfy 예약 발송으로 **09:00에 도착**하게 합니다.
- 그날 갱신에서 새로 들어온 공고 중 키워드가 하나라도 맞는 공고를 모아 알림 한 건으로 보냅니다. 맞는 공고가 없으면 보내지 않습니다.
  키워드는 검색 화면의 키워드 검색과 같은 규칙입니다. (띄어쓰기로 나눈 단어가 모두 들어 있으면 일치)
- 받는 사람을 늘리려면 `subscriptions.json`에 항목을 추가하고 `topicEnv`를 `NTFY_TOPIC_2` 같은 새 이름으로 정한 뒤,
  같은 이름의 Secret을 등록하고 워크플로 파일의 `env`에도 한 줄 추가합니다.
- **Actions** 탭에서 이 워크플로를 수동 실행(Run workflow)할 수 있습니다. 시작 날짜를 넣으면 그날부터의 공고로 바로 시험 발송합니다.

```bash
# 내 컴퓨터에서 확인 (보내지 않고 내용만 출력)
node scripts/notify.mjs --dry-run --since 2026-01-01
```

### 알아둘 점
- 예약 실행은 **main(기본) 브랜치에 병합된 뒤**부터 동작합니다.
- 실제 알림을 받으려면 위 '공고 데이터 매일 갱신'에서 데이터 출처를 켜야 합니다. (샘플 데이터에는 새 공고가 생기지 않음)
- ntfy 주제 이름을 아는 사람은 누구나 그 알림을 볼 수 있습니다. 추측하기 어려운 이름을 쓰고 공개하지 마세요.
- 공개 저장소는 60일 동안 변경이 없으면 GitHub가 예약 실행을 멈춥니다. Actions 탭에서 다시 켤 수 있습니다.

## 저장 데이터
관심공고와 화면 모드는 이 기기의 브라우저(localStorage)에만 저장됩니다.
다른 기기와 공유되지 않으며, 브라우저 기록을 지우면 사라집니다.

자세한 개발 계획은 [PLAN.md](PLAN.md)를 참고하세요.
