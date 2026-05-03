---
created: 2026-03-18T11:38:43 (UTC +09:00)
tags:
  - 음악
  - 기획
source: https://claude.ai/chat/fa840ce1-f739-433b-9f3b-c347bfa12da3
author:
---

목표 및 컨셉 : 
1. 뮤직플레이어를 만들려고 함 
2. 음악 정보는 스포티파이 API를 사용하고, 음악 소스는 4shared, 유튜브 영상을 사용함
3. 기능으로 : 플레이, 노래 검색, 지난 플레이 리스트, 그룹별 즐겨찾기, 다운로드, 가사 노출(on/off), 노래에 태그(감정, 느낌 단어에 집중) 저장, 
4. AI 큐레이션
5. - 예시 : 이 노래와 비슷한 노래 추천, 비 오는날 듣기 좋은 노래 추천
6. - 구현 구조 : Spotify metadata + 제미나이, prompt 기반 playlist 생성
    추천 기능 : 최근 7일 자주 들은 곡 자동 리스트

==처음에는 로컬 DB 사용으로 개발하고 이후 구글 드라이브 DB 사용으로 확장할 계획임. 
따라서 이를 대비해 **스토리지 레이어를 인터페이스로 분리**할 것. 
앱 코드는 데이터가 어디 저장되는지 모르고, 오직 `db` 객체만 바라보게 만들도록 함==
==그러면 구현은 로컬만, 인터페이스는 미래까지 대비 가능==

## 추가로 신경 쓸 것 하나 — 데이터 구조
로컬 DB 구현 시 구글 드라이브에서도 문제없는 **JSON 친화적 구조**로 설계하면 됩니다. 관계형(join)에 의존하지 않고, 각 엔티티를 독립된 JSON으로 관리하는 방식입니다.


![[음악 플레이 개발단계.jpg]]

---
각 단계를 상세히 설명해드릴게요.
## Phase 1 — 기반 환경 구축

**기술 스택 결정**

-   프론트엔드: React + TypeScript + Vite
-   백엔드: Node.js + Express (또는 Fastify)
-   데이터베이스: 로컬 저장: IndexedDB (사용자 데이터, 캐시, 재생 히스토리, 즐겨찾기)
-   Google Drive로 바꿀 때 `IndexedDB` 구현체만 `Google Drive` 구현체로 교체

    ### 보류 / 제외 (구현하지 않음) 
- ~~PostgreSQL (사용자 데이터) + Redis (캐시) : Docker로 실행(도커 프로그램 및 이미지를 C드라이브가 아닌 다른 곳에 설치되고 저장 되도록 함)~~


**API 연동 준비**

Spotify의 경우 [developer.spotify.com](https://developer.spotify.com/)에서 앱을 등록하고 `Client ID / Client Secret`을 발급받습니다. Spotify API는 음악 **검색, 앨범 커버, 트랙 메타데이터, 아티스트 정보**를 담당합니다. 단, **실제 음원 스트리밍**은 제공하지 않아서 4shared/YouTube로 소스를 별도 매칭해야 합니다.

YouTube는 `youtube-dl` 또는 `yt-dlp` 라이브러리로 오디오를 추출하고, 4shared는 API 또는 직접 링크를 통해 파일을 서빙합니다.

## Phase 2 — 백엔드 서버

**핵심 엔드포인트 설계**

```sql
GET  /api/search?q=아이유          → Spotify 검색 프록시
GET  /api/stream/:trackId          → 오디오 스트리밍 (range 요청 지원)
GET  /api/lyrics/:trackId          → 가사 (Genius API 또는 LRC 파일)
GET  /api/download/:trackId        → 파일 다운로드
POST /api/favorites                → 즐겨찾기 저장
GET  /api/history                  → 재생 기록
```

"Node.js + Express로 Spotify 검색 API를 만들어줘. 조건: - GET /api/search?q=검색어 - Spotify Web API에서 트랙 목록 가져오기 - 응답 형태: { tracks: [{id, title, artist, coverUrl, duration}] } - 토큰 만료 시 자동 갱신 처리 - 검색어 없으면 400 에러 - Jest 테스트 코드도 같이 작성해줘"

**스트리밍 서버 핵심 포인트**: HTTP Range Request를 반드시 구현해야 seek(앞뒤 이동)가 동작합니다. `Accept-Ranges: bytes` 헤더와 `206 Partial Content` 응답이 필수입니다.

**Spotify → 실제 소스 매칭 로직**: Spotify에서 트랙 이름 + 아티스트를 받아 YouTube에서 동일 곡을 검색하거나, 4shared에서 파일명으로 매칭하는 중간 레이어가 필요합니다.

유튜브 검색 시에는 쿼리를 조합할 때 백엔드에서 자동으로 `"{제목} {아티스트} official audio"` 또는 `"{제목} {아티스트} topic"`이라는 키워드를 붙여서 검색하도록 로직을 강제해 음원 퀄리티를 높인다.

- `yt-dlp`를 이용해 지속적으로 YouTube 오디오를 추출하면, 해당 서버의 IP가 YouTube로부터 차단당할 위험이 크다.
    
- 에러 핸들링을 철저히 기획해야 한다. 스트리밍 실패 시 클라이언트에게 명확한 에러(예: "현재 소스를 불러올 수 없습니다")를 전달하고, 4shared 등 대체 소스로 Fallback(우회)하는 로직이 백엔드에 반드시 포함되어야 한다. 

**AI 큐레이션 (Gemini) 데이터 파이프라인 구체화**
- **이슈:** '비 오는 날 듣기 좋은 노래' 등의 AI 큐레이션을 위해서는 AI가 사용자의 노래 취향이나 태그 목록을 알아야 한다.
    
- **제안:** 클라이언트(React)에서 최근 재생한 50곡의 메타데이터와 사용자가 직접 입력한 감정 태그(JSON)를 묶어서 프롬프트와 함께 백엔드(Gemini API 연동)로 전송하는 흐름을 명시해야 한다.



==백엔드 검토 도구 3가지==
**1단계 — Postman / Thunder Client (수동 테스트)** **2단계 — 터미널 curl (빠른 확인)** **3단계 — 자동화 테스트 코드 (반복 검증)**

## Phase 3 — 프론트엔드 UI

**컴포넌트 구조**

```swift
App
├── SearchBar          ← Spotify API 검색
├── SearchResults      ← 트랙/앨범/아티스트 목록
├── Player             ← 핵심 재생 컨트롤
│   ├── ProgressBar    ← seek 슬라이더
│   ├── Controls       ← 이전/재생/다음/볼륨
│   └── LyricsToggle   ← 가사 ON/OFF 버튼
├── LyricsPanel        ← 가사 표시 (싱크 하이라이트)
├── Library
│   ├── History        ← 지난 재생 리스트
│   └── Favorites      ← 그룹별 즐겨찾기
└── DownloadManager    ← 다운로드 진행률
```

**상태 관리**: Zustand를 추천합니다. 재생 상태(`currentTrack`, `isPlaying`, `progress`), 즐겨찾기, 히스토리를 전역 스토어로 관리합니다.

**가사 싱크**: `.lrc` 파일 포맷(`[mm:ss.xx] 가사 텍스트`)을 파싱해서 현재 재생 시간과 매칭하면 실시간 하이라이트가 됩니다.


**AI 큐레이션 / Gemini 추천** → Phase 3~4 사이 신규 단계 — Spotify 메타데이터 + Gemini API 연동이 필요해서 별도 작업

## Phase 4 — 데이터 저장 및 기능 완성

**재생 히스토리**: `IndexedDB`에 `{trackId, title, artist, playedAt, duration}` 형태로 저장. 최근 200곡 유지 후 오래된 것부터 삭제.

**태그 저장** → Phase 4 (데이터 저장) — IndexedDB에 태그 필드 추가, 단순 저장 기능
**자동 플레이리스트 (최근 7일)** → Phase 4 (데이터 저장) — 히스토리 데이터 기반 집계, DB 설계와 함께

**그룹별 즐겨찾기**:

json

```bash
{
  "groups": [
    { "id": "1", "name": "드라이브 플레이리스트", "tracks": [...] },
    { "id": "2", "name": "운동할 때", "tracks": [...] }
  ]
}
```

드래그앤드롭(`@dnd-kit` 라이브러리)으로 트랙 순서 변경을 지원하면 UX가 좋습니다.

**다운로드 관리**: 브라우저에서는 `Blob` + `URL.createObjectURL`로 저장, 진행률은 `fetch` + `ReadableStream`으로 구현합니다.

___
## Phase 5 — 배포 및 최적화

-   **프론트엔드**: Vercel 또는 Netlify (무료 호스팅)
-   ==**백엔드**: Railway 
- -  **스트리밍 최적화**: CDN 캐싱, 오디오 버퍼 사이즈 조정, lazy loading
-
- ### 보류 / 제외 (구현하지 않음) 
    -   ~~Fly.io (컨테이너 배포)==~~~~
    -  ~~**PWA 전환**: `service worker` + `manifest.json` 추가 시 모바일 홈화면 설치 가능~~

## Railway 실제 배포 과정 (5단계)
```
1. railway.app 가입 → GitHub 연결

2. 내 백엔드 폴더에 파일 하나 추가
   (Dockerfile 없어도 되지만, 있으면 더 안정적)

3. GitHub에 push

4. Railway 대시보드에서 "New Project → Deploy from GitHub" 클릭

5. 환경변수 입력 (Spotify API Key, JWT Secret 등)
   → 자동으로 https://myapp.up.railway.app 주소 생성
```

## 권장 개발 순서

1.  **먼저 Spotify 검색 + 결과 UI : 검색창 → 트랙 목록 표시까지
2.  오디오 스트리밍 연결 : 유튜브, 4shared 소스 연동
3.  **플레이어 컨트롤** (재생/정지/seek/볼륨)
4.  **히스토리 + 즐겨찾기** 로컬 저장 : indexedDB 기본 구조 잡기 - 태그 필드로 함께 설계
5.  태그 저장 기능 : 감성, 느낌 태그 입력 UI + indexedDB 저장 (예: #잔잔한 #비오는날 -> 나중에 AI 추천 재료가 됨)
6.  **가사** 연동 + ON/OFF : Genius API 또는 LRC 싱크
7.  자동 플레이 리스트 : 최근 7일 재생 횟수 집계 -> 자동 리스트 생성. 히스토리 데이터 있어야 가능 - 4단계 이후에 가능 
8.  **다운로드** 기능 : 진행률 표시 + 로컬 저장
9.  AI 큐레이션(제미나이) : 스포티파이 메타데이터 + 사용자 태그 -> 제미나이 프롬프트
     비슷한 곡 추천, 상황별 추천, 프롤프트 기반 플레이 리스트. 태그, 히스토리 데이터가 쌓인 후에 의미 있음 - 마지막에 붙임
10.  **배포**

## 순서를 이렇게 잡은 이유

**태그가 5번인 이유** — IndexedDB 구조를 잡는 4번 직후에 붙여야 합니다. 나중에 태그 필드를 추가하면 DB 스키마를 수정해야 해서 번거롭거든요. 처음부터 `{ id, title, artist, tags: [] }` 형태로 설계해두면 공짜입니다.

**자동 플레이리스트가 7번인 이유** — 히스토리 데이터가 실제로 쌓여야 "최근 7일"을 집계할 수 있습니다. 4번에서 히스토리 저장이 완성된 후에 의미가 생겨요.

**AI 큐레이션이 9번(마지막)인 이유** — 세 가지 재료가 모두 준비된 후에야 제대로 동작합니다.

Spotify 메타데이터 (BPM, 장르, 에너지) ← 1번에서 준비 +
사용자 태그 ( #잔잔한 #비오는날) ← 5번에서 준비 +
재생 히스토리 (자주 들은 곡 패턴) ← 4번에서 준비 
→ Gemini 프롬프트로 전달 → "비 오는 날 듣기 좋은 곡 추천"


=====================================================
## 구글 드라이브로 확장 할때 참고할 내용 

구글 드라이브를 사용자별 개인 DB"로 쓰는 구조
## 핵심 원리

Google OAuth로 로그인하면 사용자의 구글 드라이브에 **앱 전용 폴더**(`/MusicPlayer/`)를 자동 생성하고, 그 안에 그 사람만의 데이터를 JSON 파일로 저장합니다.

```
사용자 A의 구글 드라이브
└── MusicPlayer/              ← 앱이 자동 생성
    ├── favorites.json        ← 그룹별 즐겨찾기
    ├── history.json          ← 재생 히스토리
    ├── playlists.json        ← 플레이리스트
    └── settings.json         ← 개인 설정 (가사 on/off 등)
```

이렇게 하면 서버에 DB를 따로 운영하지 않아도 되고, 데이터는 100% 사용자 본인 드라이브에 저장됩니다.

## 구현 방법 단계별

**Step 1 — Google OAuth 설정**

[console.cloud.google.com](https://console.cloud.google.com)에서 프로젝트를 만들고, 두 가지 스코프를 요청합니다.

```
https://www.googleapis.com/auth/drive.appdata   ← 앱 전용 숨김 폴더 (권장)
또는
https://www.googleapis.com/auth/drive.file       ← 사용자가 볼 수 있는 폴더
```

`drive.appdata`는 앱이 만든 파일만 접근 가능한 샌드박스 폴더라서 보안상 더 좋고, `drive.file`은 사용자가 파일 탐색기에서 직접 볼 수 있어서 투명성이 높습니다. 목적에 맞게 선택하면 됩니다.

**Step 2 — 로그인 후 초기화 로직**

javascript

```javascript
// 로그인 직후 실행
async function initUserDrive(accessToken) {
  // 1. MusicPlayer 폴더가 있는지 확인
  const folder = await findOrCreateFolder('MusicPlayer', accessToken)
  
  // 2. 없으면 기본 파일들 생성
  if (!folder.existed) {
    await createFile('favorites.json', { groups: [] }, folder.id, accessToken)
    await createFile('history.json',   { tracks: [] }, folder.id, accessToken)
    await createFile('playlists.json', { lists: [] },  folder.id, accessToken)
  }
  
  return folder.id
}
```

**Step 3 — 데이터 읽기/쓰기**

javascript

```javascript
// 즐겨찾기 불러오기
async function loadFavorites(accessToken) {
  const fileId = await findFileId('favorites.json', accessToken)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.json()
}

// 즐겨찾기 저장
async function saveFavorites(data, accessToken) {
  const fileId = await findFileId('favorites.json', accessToken)
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
}


## 구글 드라이브 DB의 장단점

장점으로는 서버 DB 비용이 0원이고, 데이터가 사용자 본인 소유라 개인정보 이슈가 없으며, 구글이 자동으로 백업과 버전 관리를 해줍니다. 여러 기기에서 자동 동기화도 됩니다.

단점은 Drive API 호출에 네트워크 지연(100~300ms)이 생기므로 앱 시작 시 전체를 한 번에 불러와서 메모리에 캐싱해두는 전략이 필수입니다. 또 구글 Drive API의 무료 할당량(하루 1억 요청)이 있는데, 사용자 수가 수만 명 이상 되면 고려가 필요합니다.

---

## 권장 캐싱 전략

javascript

```javascript
// 앱 시작 시 1회 로드 → 메모리에 보관 → 변경 시에만 Drive에 저장
const store = {
  favorites: null,
  history: null,
  
  async load(accessToken) {
    this.favorites = await loadFavorites(accessToken)
    this.history   = await loadHistory(accessToken)
  },
  
  addToHistory(track) {
    this.history.tracks.unshift(track)          // 메모리 즉시 반영
    saveHistory(this.history, accessToken)       // 백그라운드로 Drive 저장
  }
}
```

이 구조라면 사용자 A가 로그인하면 A의 드라이브에서 데이터를 읽고, 사용자 B가 로그인하면 B의 드라이브에서 읽는 완전히 독립된 멀티유저 시스템이 됩니다
