# [개인 프로젝트 보고서] FitRoutine: 개인 운동 루틴 및 식단 칼로리 트래커 웹 서비스

본 보고서는 일상생활 속 건강 관리를 돕는 데이터베이스 기반의 웹 서비스 **FitRoutine**의 개발 개요 및 기술 구현 사항을 정리한 문서입니다. (제출 서식 준수, A4 3장 이내 분량)

---

## 1. 기획 취지 및 주제 선정

### 1.1 기획 취지
현대 사회에서 건강과 웰빙에 대한 관심이 급증함에 따라 개인의 운동 상태와 식사 섭취 데이터를 데이터베이스에 기록하고 추적하는 일이 중요해졌습니다. 본 프로젝트는 데이터베이스의 본질인 **CRUD(생성, 읽기, 수정, 삭제) 처리**와 **사용자별 데이터 관리**가 일상에서 유용하게 기여할 수 있는 피트니스 트래커를 구현하였습니다.

### 1.2 주제 선정 이유
* **데이터 관리의 중요성**: 운동 칼로리 소모량과 식단 칼로리 섭취량은 일별 누적 통계를 구해야 하므로 영구적인 데이터베이스 저장이 반드시 필요합니다.
* **사용자별 격리성**: 피트니스 정보는 지극히 개인적인 민감한 데이터이므로 **사용자 인증 및 세션 미들웨어**를 통해 계정마다 완벽히 격리된 환경을 제공해야 합니다.
* **시각화 피드백**: 기록된 데이터를 차트(Chart.js)를 통해 주간 흐름으로 제시하여 사용자에게 강력한 건강 피드백을 전달할 수 있습니다.

---

## 2. 개발 스택 및 시스템 아키텍처

본 프로젝트는 수업 시간에 배운 내용을 전적으로 적용하여 설계되었습니다.

### 2.1 개발 스택
* **Backend**: Node.js, Express Framework
* **Database**: MongoDB (Mongoose ODM)
* **Session**: express-session (쿠키 기반의 서버 세션 인증)
* **Encryption**: bcryptjs (비밀번호 단방향 암호화 해싱)
* **Frontend**: HTML5, Vanilla CSS (다크 글래스모피즘 테마), Vanilla JavaScript (AJAX), Chart.js (차트 시각화)

### 2.2 시스템 아키텍처 및 라우팅 흐름
```text
[Client (Browser)] 
       │ (1. HTTP Request)
       ▼
[Express Server (server.js)] 
       │ (2. Session & Body-Parser Middleware)
       ├─► [auth.js (Authentication Middleware)] ──► (미인증 시 /login.html 리다이렉트)
       │ (3. Route Controllers)
       ▼
[Mongoose ODM (models/)] ──► [MongoDB Database] (4. Query & Save)
```

---

## 3. 데이터베이스 설계 (ERD 및 스키마)

본 서비스는 MongoDB를 이용해 다대일(1:N) 관계의 3개 컬렉션을 구축했습니다.

### 3.1 User 컬렉션 (사용자)
| 필드명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | 고유 식별자 |
| `username` | String | Required | 사용자 이름 |
| `email` | String | Required, Unique | 이메일 주소 (로그인 ID) |
| `password` | String | Required | 암호화된 비밀번호 (Bcrypt) |
| `createdAt` | Date | Default: Date.now | 계정 생성 일시 |

### 3.2 Workout 컬렉션 (운동 기록)
| 필드명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | 고유 식별자 |
| `user` | ObjectId | Ref: 'User', Required | 작성한 유저의 외래키 |
| `title` | String | Required | 운동 이름 (예: 데드리프트) |
| `category` | String | Enum, Required | Cardio / Strength / Flexibility / Other |
| `duration` | Number | Required (Min: 1) | 운동 시간 (분 단위) |
| `calories` | Number | Required (Min: 0) | 소모 칼로리 (kcal) |
| `date` | Date | Default: Date.now | 운동 수행 날짜 |

### 3.3 Meal 컬렉션 (식단 기록)
| 필드명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | 고유 식별자 |
| `user` | ObjectId | Ref: 'User', Required | 작성한 유저의 외래키 |
| `title` | String | Required | 식사 내용 (예: 닭가슴살 샐러드) |
| `type` | String | Enum, Required | Breakfast / Lunch / Dinner / Snack |
| `calories` | Number | Required (Min: 0) | 섭취 칼로리 (kcal) |
| `protein` | Number | Default: 0 | 단백질 함량 (g) |
| `carbs` | Number | Default: 0 | 탄수화물 함량 (g) |
| `fat` | Number | Default: 0 | 지방 함량 (g) |
| `date` | Date | Default: Date.now | 식사 일시 |

---

## 4. 핵심 기능 구현 상세 (수업 연계 기술)

### 4.1 Node.js & 비동기 처리 (Async/Await)
모든 데이터베이스 CRUD와 로그인 인증 로직은 Node.js의 비동기 처리 방식인 `async/await` 문법을 활용하여 작성되었습니다. 이를 통해 콜백 지옥(Callback Hell)을 방지하고 코드 가독성 및 예외 처리(try/catch)의 안정성을 대폭 개선했습니다.

### 4.2 Express 미들웨어 및 세션 인증
* `express.json()` 및 `express.urlencoded()` 미들웨어를 사용하여 폼 입력과 JSON 형식의 API 본문을 파싱합니다.
* `express-session` 미들웨어로 메모리 기반 세션을 생성하여 유저 상태를 유지합니다.
* 커스텀 미들웨어 `isAuthenticated`를 작성하여 보안을 강화했습니다:
  ```javascript
  const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) return next();
    
    // API 요청은 401 에러 반환, 페이지 요청은 로그인 페이지로 리다이렉트
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }
    res.redirect('/login.html');
  };
  ```

### 4.3 데이터베이스 연동 및 CRUD API 작성
로그인한 사용자의 고유 `req.session.userId` 값을 기준으로 데이터를 바인딩하여 타인의 정보 노출을 엄격히 통제합니다.
* **Create**: 사용자가 작성한 운동 및 식단 데이터를 Mongoose의 `create()` 메소드로 데이터베이스에 기록합니다.
* **Read**: Mongoose의 `find({ user: userId })` 및 `sort({ date: -1 })`을 통해 사용자의 최신 데이터를 정렬하여 반환합니다.
* **Delete**: 타인의 데이터를 마음대로 삭제하지 못하도록 `findOne({ _id: req.params.id, user: req.session.userId })` 검증 단계를 거친 후 `deleteOne()` 메소드를 수행합니다.

### 4.4 폼 및 비동기(AJAX) 라우팅 처리
로그인 및 회원가입은 HTML form 태그의 기본 동작을 `e.preventDefault()`로 가로챈 후, Vanilla JS의 `fetch` API를 사용하여 비동기식으로 백엔드 API와 통신합니다. 이로 인해 화면이 새로고침되는 불쾌함 없이 유효성 검사 및 토스트 알림을 지원합니다.

---

## 5. Render 클라우드 서버 배포 절차

Render 사이트에 안정적으로 서버를 구동하고 MongoDB Atlas 데이터베이스에 연결하기 위해 아래와 같이 설정 및 배포를 진행하였습니다.

### 5.1 MongoDB Atlas (클라우드 DB) 연동
1. MongoDB Atlas 계정에 가입하고 무료 클러스터(M0)를 생성합니다.
2. Network Access 메뉴에서 Render 서버의 IP가 접근 가능하도록 설정합니다. (간편한 평가 테스트를 위해 `0.0.0.0/0` 허용 권장)
3. Database User를 생성하고 연결 문자열(Connection String)을 확보합니다.

### 5.2 Render 배포 환경설정
1. **Repository**: GitHub 저장소에 구현 코드를 Push합니다. (보안상의 이유로 `.env` 파일과 `node_modules`는 `.gitignore`에 등록하여 제외)
2. **Render Web Service 생성**: Render 대시보드에서 신규 Web Service를 생성하고 GitHub 저장소를 연동합니다.
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Environment Variables**: 대시보드의 **Environment** 탭에 다음 변수들을 추가합니다:
   * `NODE_ENV` = `production`
   * `SESSION_SECRET` = `임의의_긴_세션_보안_키_값`
   * `MONGODB_URI` = `mongodb+srv://<유저명>:<암호>@cluster.mongodb.net/fitroutine?retryWrites=true&w=majority`

이 절차를 성공적으로 이행하면 Render가 제공하는 고유한 도메인 URL로 전 세계 어디서든 본 피트니스 서비스에 안정적으로 로그인하고 운동 및 식단을 관리할 수 있게 됩니다.
