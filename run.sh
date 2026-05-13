#!/bin/bash

INFLUXDB_URL="http://influxdb:8086/k6"
LOG_FILE="results/run-$(date +%Y%m%d-%H%M%S).log"

mkdir -p results

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

run() {
    local script=$1
    log "▶ ${script} 시작"

    if docker compose --profile run run --rm k6 \
        run --out influxdb=${INFLUXDB_URL} /scripts/${script} 2>&1 | tee -a "$LOG_FILE"; then
        log "✓ ${script} 통과"
    else
        log "✗ ${script} 실패 — 위 로그에서 [FAIL] 항목 확인"
        log "중단: 이후 단계 실행하지 않음"
        exit 1
    fi
}

log "===== 테스트 시작 ====="

run smoke.js
run load.js
run stress.js

log "===== 전체 테스트 완료 ====="
