import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, headers } from './helpers/auth.js';
import { assertOk, extractList } from './helpers/checks.js';
import { handleSummary } from './helpers/summary.js';

export { handleSummary };

const maxVu = parseInt(__ENV.LOAD_MAX_VU) || 50;

export const options = {
    stages: [
        { duration: '1m', target: Math.round(maxVu * 0.2) },
        { duration: '3m', target: maxVu },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_failed:   ['rate<0.05'],
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        errors:            ['rate<0.05'],
    },
};

export default function () {
    const rand = Math.random();

    if (rand < 0.5)      readFlow();
    else if (rand < 0.8) searchFlow();
    else                 dashboardFlow();
}

// 목록 -> 상세 조회 (가장 빈번한 패턴, 50%)
function readFlow() {
    const list = http.get(`${BASE_URL}/items?size=10`, { headers: headers() });
    assertOk(list, 'item-list');

    const items = extractList(list);
    if (items.length > 0) {
        const id = items[0].id;
        const detail = http.get(`${BASE_URL}/items/${id}`, { headers: headers() });
        assertOk(detail, 'item-detail');
    }
    sleep(2);
}

// 키워드 검색 (30%)
function searchFlow() {
    const keywords = ['keyword1', 'keyword2', 'keyword3'];
    const kw = keywords[Math.floor(Math.random() * keywords.length)];

    const res = http.get(`${BASE_URL}/items?keyword=${encodeURIComponent(kw)}&size=10`, { headers: headers() });
    assertOk(res, 'item-search');
    sleep(2);
}

// 대시보드 + 집계 조회 (20%)
function dashboardFlow() {
    const dashboard = http.get(`${BASE_URL}/dashboard`, { headers: headers() });
    assertOk(dashboard, 'dashboard');

    const stats = http.get(`${BASE_URL}/stats`, { headers: headers() });
    assertOk(stats, 'stats');
    sleep(2);
}

/**
 * [예시] 프로젝트 적용 시
 *
 * readFlow:
 *   GET /letters?size=10
 *   GET /letters/${id}
 *
 * searchFlow:
 *   keywords = ['사랑', '고마워', '생일', '보고싶어', '응원', '축하']
 *   GET /letters?keyword=${kw}&size=10
 *
 * dashboardFlow:
 *   GET /home
 *   GET /reports
 */
