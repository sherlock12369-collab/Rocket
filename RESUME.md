# 🚀 프로젝트 재개 가이드 (Resume Guide)

이 문서는 현재 중단된 작업을 나중에 다시 시작할 때 참고하기 위한 가이드입니다.

## 📍 현재 진행 상태
- **프론트엔드**: Next.js에서 **Vue 3 + Vite + Tailwind 4**로 마이그레이션 완료.
- **디자인**: **삼성닷컴(Samsung.com/sec)** 스타일의 프리미엄 미니멀 UI 반영 완료.
- **확장 기능**:
    - [x] 신규 대원 등록 (Admin)
    - [x] 주문 통합 관제 센터 (Admin)
    - [x] 포인트 획득 미션 시스템 (User)
    - [x] 삼성 스타일 헤더 및 히어로 섹션

---

## 🛠️ 다시 시작하는 방법

1.  **의존성 설치**:
    ```bash
    npm install
    ```
2.  **서버 실행** (두 개의 터미널이 필요합니다):
    - **터미널 1 (프론트엔드)**: `npm run dev` (Vite, http://localhost:5173)
    - **터미널 2 (백엔드/API)**: `npm run server` (Express, http://localhost:3001)

3.  **데이터베이스 확인**:
    - `.env.local` 파일의 `MONGODB_URI`가 올바른지 확인하세요.

---

## 📝 다음 작업 추천 (Next Steps)
- [ ] **실제 데이터 연동**: 현재 `CartView.vue`와 `AdminOrders.vue` 등 일부 뷰에 포함된 더미 데이터를 실제 API(`server/index.ts`)와 완전히 연결하기.
- [ ] **인증 로직 완성**: `LoginView.vue`의 폼 전송 시 JWT 토근을 저장하고 `App.vue`의 헤더에 로그인 상태 반영하기.
- [ ] **미션 업로드 구현**: `Missions.vue`에서 실제로 이미지 파일을 업로드하고 관리자에게 알림을 보내는 기능 추가.

---

**정리 일자**: 2026-02-17
**담당 대원**: Antigravity 🚀
