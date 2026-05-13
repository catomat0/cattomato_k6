# cattomato k6

Spring Boot 백엔드 범용 부하 테스트 프로젝트입니다.

> k6 스크립트는 `.js` 텍스트 파일이 실행 단위입니다. Spring Boot와 달리 빌드, 이미지 관리가 필요 없습니다.
> InfluxDB와 k6 실행 환경은 공식 Docker 이미지를 그대로 사용하므로 Dockerfile도 필요 없습니다.
> `git pull` 로 스크립트를 최신화하면 다음 실행 시 바로 반영됩니다.

---

## 프로젝트 구조

```
.env.k6.example              환경변수 템플릿
docker-compose.yml           InfluxDB 컨테이너 설정
run.sh                       전체 테스트 순차 실행 스크립트
results/                     실행 로그 저장 (.gitignore 처리)
scripts/
  helpers/
    auth.js                  BASE_URL, JWT 헤더 설정
    checks.js                응답 검증, 에러율 메트릭, 목록 추출
    summary.js               테스트 종료 시 임계값 실패 원인 출력
  smoke.js                   VU 1, 1분
  load.js                    VU 최대 LOAD_MAX_VU, 5분
  stress.js                  VU 단계적 증가 STRESS_MAX_VU까지, 8분
```

---

## 사전 준비

### 1. 환경변수 설정

```bash
cp .env.k6.example .env.k6
```

`.env.k6`를 열어 실제 값을 채웁니다.

```
BASE_URL=http://<본서버-private-ip>:8080
ACCESS_TOKEN=<테스트 계정 JWT Access Token>

INFLUXDB_HOST=influxdb
INFLUXDB_PORT=8086
INFLUXDB_DB=k6
INFLUXDB_URL=http://influxdb:8086/k6

LOAD_MAX_VU=50
STRESS_MAX_VU=50
```

> Access Token은 테스트 계정으로 로그인 후 발급된 JWT를 직접 입력합니다.

> `LOAD_MAX_VU`, `STRESS_MAX_VU`는 프로젝트 규모에 맞게 조정합니다. 중간 단계 VU는 최댓값 기준으로 자동 비례 계산됩니다.

### 2. InfluxDB 실행

```bash
docker compose up -d influxdb
```

### 3. Grafana 접근 (SSH 포트 포워딩)

Grafana 포트를 외부에 열지 않는 경우 SSH 터널링으로 접근합니다.

```bash
ssh -L <로컬포트>:localhost:<서버 Grafana 포트> -i <키페어.pem> ubuntu@<본서버-ip>
```

로컬 3000번이 이미 사용 중이면 로컬 포트를 다르게 지정합니다.

```bash
# 예시: 로컬 3001 → 서버 3000 (Grafana)
ssh -L 3001:localhost:3000 -i deare-ec2.pem ubuntu@<본서버-ip>
```

접속 후 브라우저에서 `http://localhost:3001` 로 Grafana에 접근합니다.

### 4. Grafana 데이터 소스 연결

기존 Grafana에서 InfluxDB 데이터 소스를 추가합니다.

```
URL:      http://<k6-EC2-private-ip>:8086
Database: k6
```

대시보드 Import → ID `2587` (k6 Load Testing Results)

---

## 테스트 실행

### 전체 자동 실행 (권장)

smoke → load → stress 순서로 실행하며, 단계 실패 시 이후 단계는 실행하지 않습니다.

```bash
chmod +x run.sh
./run.sh
```

실행 로그는 `results/run-<timestamp>.log` 에 자동 저장됩니다.

### 개별 실행

```bash
# Smoke (기본 동작 확인 — VU 1, 1분)
docker compose --profile run run --rm k6 \
  run --out influxdb=http://influxdb:8086/k6 /scripts/smoke.js

# Load (정상 부하 — VU 최대 50, 5분)
docker compose --profile run run --rm k6 \
  run --out influxdb=http://influxdb:8086/k6 /scripts/load.js

# Stress (한계 탐색 — VU 10→30→50, 8분)
docker compose --profile run run --rm k6 \
  run --out influxdb=http://influxdb:8086/k6 /scripts/stress.js
```

---

## 테스트 단계별 목적

| 단계 | VU | 시간 | 목적 |
|---|---|---|---|
| Smoke | 1 (고정) | 1분 | 배포 후 기본 동작 확인 |
| Load | 최대 `LOAD_MAX_VU` | 5분 | 실제 트래픽 패턴 시뮬레이션 |
| Stress | `STRESS_MAX_VU`의 20%→60%→100% | 8분 | 단계적 부하 증가로 병목 지점 탐색 |

### Load 트래픽 분산

```
50% — readFlow     목록 → 상세 조회
30% — searchFlow   키워드 검색
20% — dashboardFlow 대시보드 + 집계 조회
```

비율은 고정이며 각 VU 반복마다 랜덤하게 플로우가 결정됩니다.

---

## 실패 로그 예시

```
[2025-05-13 14:35:01] ▶ load.js 시작
✗ 임계값 초과:
  [FAIL] http_req_duration | 조건: p(95)<1000 | 실제값: p(95)=1843ms
  [FAIL] errors            | 조건: rate<0.05  | 실제값: rate=8.21%
[2025-05-13 14:35:01] ✗ load.js 실패 — 위 로그에서 [FAIL] 항목 확인
[2025-05-13 14:35:01] 중단: 이후 단계 실행하지 않음
```

---

## 새 프로젝트에 적용할 때

1. `.env.k6`의 `BASE_URL`, `ACCESS_TOKEN` 교체
2. `.env.k6`의 `LOAD_MAX_VU`, `STRESS_MAX_VU` 프로젝트 규모에 맞게 조정
3. `scripts/helpers/checks.js`의 `extractList()` 응답 구조 확인
4. `scripts/smoke.js`, `load.js`, `stress.js`의 엔드포인트를 대상 프로젝트에 맞게 수정
   - 각 파일 하단 주석 `[예시]` 참고
