# News Language Reader - Cursor Handoff Document

이 문서는 `News Language Reader` Chrome 확장 프로그램 프로젝트의 아키텍처, 현재 발생 중인 이슈 분석, 해결 가이드 및 Cursor를 위한 작업 지침을 정리한 인수인계 문서입니다.

---

## 1. 프로젝트 개요

- **프로젝트명:** News Language Reader
- **유형:** Google Chrome Extension (Manifest V3)
- **주요 목적:** 외국어 뉴스 기사(예: NHK 일본어, BBC 영어)를 Mozilla Readability로 정제 추출한 뒤, 브라우저 화면 위에 5:5 비율의 인플레이스 분할 뷰(Split View)로 띄워 읽기 및 어휘 학습을 지원하는 온디바이스 학습 도구.
- **핵심 기술 스택:**
  - Vanilla JavaScript (ES Module + Vite 빌드)
  - Chrome Built-in AI (Prompt API / Gemini Nano / Gemma 4)
  - Mozilla `@mozilla/readability` + DOMParser
  - JavaScript 네이티브 `Intl.Segmenter` (문장 및 단어 경계 토큰화)
  - Web Components / Closed Shadow DOM 격리
  - Vitest (단위 및 통합 테스트)
- **엄격한 설계 제약사항:**
  - **이모지/이모티콘 완전 배제:** 모든 UI, 아이콘, 텍스트, 코드 및 문서에 이모지 사용 불가 (단순 기호, SVG 벡터 아이콘 사용).
  - **흑백/그레이스케일 모노크롬 팔레트:** `#111111`, `#1e1e1e`, `#555555`, `#888888`, `#e5e5e5`, `#f5f5f5`, `#ffffff`.
  - **포인트 컬러:** 버건디 (`#800020`).
  - **인포그래픽 우선 UI:** 텍스트 설명 중심이 아닌 SVG 벡터 아이콘 및 인포그래픽 중심의 간결한 레이아웃.

---

## 2. 현재 발생 중인 이슈 상세

### 증상 (Symptom)
- Chrome 브라우저에서 NHK 뉴스 기사에 접속한 후 단축키 `Alt + L`을 눌러 리더 오버레이를 열었을 때:
  - 좌측 원문 패널에는 본문 문장과 단어 토큰이 정상적으로 분할되어 렌더링됨.
  - 우측 번역/해설 패널에 한국어/영어 번역이 출력되지 않고, 모든 문장 블록에 아래의 에러 안내 문구가 지속적으로 노출됨:
    `Chrome 내장 AI 준비 중 또는 다운로드 중... (에러 상세)`
  - 단어를 클릭했을 때 나타나는 팝오버에도 AI가 계산한 동적 번역 대신 기본 플레이스홀더 데이터가 바인딩됨.

### 원인 분석 (Root Cause Analysis)

1. **Chrome Extension의 Isolated World vs Main World 격리:**
   - Chrome MV3 확장 프로그램의 `content_scripts`는 기본적으로 격리된 JavaScript 환경(Isolated World)에서 동작합니다.
   - Chrome의 실험적 브라우저 내장 AI(`window.ai` 및 `window.LanguageModel`)는 오직 웹페이지 본래의 실행 환경인 **MAIN World**에만 주입됩니다.
   - 따라서 격리된 `content-script`에서 `window.ai`를 직접 조회하면 `undefined`가 되어 세션 생성이 실패합니다.
   - **조치 완료:** `src/content/ai-bridge.js`를 신설하고 `manifest.json`에 `"world": "MAIN"`으로 등록하여 `window.postMessage` 기반의 비동기 브리지 통신을 구축했습니다.

2. **Chrome 온디바이스 모델 파일의 로컬 다운로드 미완료 상태:**
   - Chrome Prompt API는 브라우저 내부에서 모델 파일(약 1.5GB ~ 2.2GB)을 백그라운드로 다운로드받아 로컬 캐시에 저장한 뒤에 활성화됩니다.
   - 사용자의 Chrome 브라우저에서 `chrome://flags`만 켜져 있고 모델 다운로드가 아직 진행 중이거나 실패한 경우, `capabilities.available`이 `'after-download'` 또는 `'no'` 상태를 반환하거나 `lm.create()` 호출 시 `NotSupportedError: The model is not available` 에러를 발생시킵니다.
   - `content-script.js`의 문장 처리 큐(`processQueue`)에서 `aiClient.translateSentenceWithContext()`가 예외를 던지며 catch 블록으로 빠지게 됩니다.

3. **Chrome 버전에 따른 Prompt API 명칭 및 시그니처 변동 (Gemma 4 등):**
   - 최신 크롬(카나리아/개발자 빌드 또는 131+)에서는 기존의 `capabilities()` 메서드 외에 W3C 표준 초안에 따른 `availability()` 메서드가 도입되었습니다.
   - 객체 경로 또한 `window.ai.languageModel`뿐만 아니라 전역 `window.LanguageModel` 형태로 노출되는 브라우저 빌드가 존재합니다.
   - 모델 호출 시 응답이 문자열(String)이 아닌 스트리밍(ReadableStream)으로 반환되는 버전 차이가 있을 수 있습니다.

---

## 3. 코드베이스 구조 및 역할

```
news-language-reader/
├── manifest.json                     # MV3 매니페스트. content_scripts (bundle + ai-bridge) 정의
├── vite.config.js                    # Vite IIFE 번들러 설정 (content-script.bundle.js 생성)
├── package.json                      # vitest, vite, @mozilla/readability 의존성
├── HANDOFF.md                        # 본 인수인계 문서
├── src/
│   ├── background/
│   │   └── service-worker.js         # 확장 프로그램 단축키(Alt+L) 및 아이콘 클릭 시 오버레이 토글 메시지 전달
│   ├── content/
│   │   ├── ai-bridge.js              # [MAIN World] window.ai / LanguageModel을 직접 호출하고 postMessage로 중계
│   │   ├── content-script.js         # [Isolated World] 기사 추출, UI 렌더링, 큐 처리, 팝오버 및 단축키 제어
│   │   ├── parser.js                 # Mozilla Readability 래퍼 (기사 제목, 본문 단락 추출)
│   │   └── shadow-host.js            # 호스트 웹페이지 CSS 오염 방지를 위한 Closed Shadow DOM 생성
│   ├── core/
│   │   ├── ai-client.js              # Prompt API 클라이언트. ai-bridge와 postMessage 비동기 통신
│   │   ├── nlp-segmenter.js          # Intl.Segmenter 문장 및 단어 토크나이저 (s_X_w_Y ID 부여)
│   │   ├── prompt-templates.js       # 슬라이딩 윈도우 문맥 번역 및 단어 정렬 JSON 프롬프트 템플릿
│   │   └── word-aligner.js           # 원문 토큰과 번역 단어 간의 형태소 기반 1:1 하이라이트 매퍼
│   ├── overlay/
│   │   ├── popover.js                # 단어 클릭 시 어휘 상세(원형, 독음, 품사, 한/영 번역, 뉘앙스) 팝오버
│   │   ├── reader-view.css           # 모노크롬 + 버건디 스타일시트
│   │   ├── reader-view.js            # 5:5 좌우 분할 스크롤 동기화 UI 빌더
│   │   └── summary-view.js           # 학습 완료 시 생성되는 문맥 학습 노트 요약 뷰
│   └── storage/
│       ├── storage-manager.js        # chrome.storage.local 기반 학습 세션, 저장 단어/문장 관리
│       └── exporters.js              # Markdown 및 CSV 내보내기 포맷터
└── tests/                            # Vitest 테스트 스위트 (10개 파일, 19개 테스트 100% 통과)
```

---

## 4. Cursor 작업자를 위한 진단 및 해결 가이드 (Checklist)

Cursor에서 이 문제를 이어받아 디버깅할 때 아래 순서대로 확인 및 조치하시기 바랍니다.

### Step 1. 브라우저 콘솔의 실제 에러 확인
- NHK 기사 페이지에서 `F12` 개발자 도구를 열고 `Console` 탭을 확인합니다.
- `content-script.js`에 추가된 다음 로그를 확인합니다:
  ```
  [NewsLanguageReader] Translation failed for sentence: s_0 Error: ...
  ```
- 에러 메시지가 무엇인지 확인합니다:
  - `Timeout waiting for AI bridge on action: createSession`: 브리지 통신 미응답
  - `Chrome 내장 AI API (Prompt API / LanguageModel)를 페이지에서 찾을 수 없습니다`: `window.ai` 부재
  - `NotSupportedError` 또는 `The model is not available`: 모델 가중치 파일 미다운로드

### Step 2. MAIN World에서 Chrome Built-in AI 상태 직접 검증
- 개발자 도구의 콘솔 창 상단 드롭다운(기본값 `top`)에서 콘솔 명령을 직접 입력하여 확인합니다:
  ```javascript
  // 1. 객체 존재 여부 확인
  console.log(window.ai, window.LanguageModel);

  // 2. 가용성 확인
  if (window.ai?.languageModel) {
    const caps = await (window.ai.languageModel.availability ? window.ai.languageModel.availability() : window.ai.languageModel.capabilities());
    console.log('AI Status:', caps);
  }
  ```
- 만약 `undefined`라면 Chrome 브라우저의 플래그 설정 및 하드웨어 가속 상태를 점검해야 합니다.

### Step 3. Chrome 모델 다운로드 컴포넌트 점검 (`chrome://components`)
- Chrome 주소창에 `chrome://components`를 입력하고 이동합니다.
- `Optimization Guide On Device Model` 항목을 찾습니다.
- 상태 확인:
  - 버전이 `0.0.0.0`이면 모델 다운로드가 아직 시작되지 않았거나 대기 중인 상태입니다.
  - **Check for update(업데이트 확인)** 버튼을 클릭하여 모델 다운로드를 강제 트리거합니다. 다운로드가 완료되면 버전 번호(예: `2024.x.x.x`)가 나타납니다.

### Step 4. 외부 API 키(BYOK) 또는 Mock 폴백(Fallback) 모드 지원 강화
- 사용자의 로컬 Chrome 환경에서 GPU 가속 불가, 디스크 용량, 지역 제한 등으로 온디바이스 모델 다운로드가 불가능한 경우에도 개발 및 실제 사용이 가능하도록 **폴백(Fallback) 구조**를 보강하는 것을 권장합니다:
  - `src/core/ai-client.js`에 OpenAI 호환 / Gemini Flash API 키를 옵션 팝업(`chrome.storage.local`)에서 입력받아 처리할 수 있는 BYOK 분기 활성화.
  - 로컬 AI 미준비 상태(`availability === 'downloading'` 또는 `'no'`)일 때 즉각적으로 정적/규칙 기반 어휘 분석이나 로컬 사전 폴백으로 작동할 수 있는 안전장치 마련.

### Step 5. 빌드 및 테스트 확인
코드 수정 후 반드시 아래 명령어로 빌드 및 테스트가 통과하는지 검증해야 합니다:
```bash
cd news-language-reader
npm run build
npm test
```
- 번들 결과물인 `dist/content-script.bundle.js`가 반드시 최신으로 빌드되어야 확장 프로그램에 반영됩니다.

---

## 5. 원격 저장소 정보
- **GitHub 저장소:** `https://github.com/DoDuekChill/news-language-reader`
- **현재 브랜치:** `main`
- **최신 커밋 상태:** MAIN World ai-bridge 및 상세 에러 로깅 반영 완료.
