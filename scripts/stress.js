import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, headers } from './helpers/auth.js';
import { assertOk } from './helpers/checks.js';
import { handleSummary } from './helpers/summary.js';

export { handleSummary };

const maxVu = parseInt(__ENV.STRESS_MAX_VU) || 50;

export const options = {
    stages: [
        { duration: '2m', target: Math.round(maxVu * 0.2) },
        { duration: '2m', target: Math.round(maxVu * 0.6) },
        { duration: '2m', target: maxVu },
        { duration: '2m', target: 0 },
    ],
    thresholds: {
        http_req_failed:   ['rate<0.1'],
        http_req_duration: ['p(95)<3000'],
    },
};

// 가장 무거운 엔드포인트만 반복해서 한계점 탐색
export default function () {
    const list = http.get(`${BASE_URL}/items?size=20`, { headers: headers() });
    assertOk(list, 'item-list');
    sleep(1);

    const kw = 'keyword1';
    const search = http.get(`${BASE_URL}/items?keyword=${encodeURIComponent(kw)}&size=10`, { headers: headers() });
    assertOk(search, 'item-search');
    sleep(1);
}

/*
 * [예시] 프로젝트 적용 시 엔드포인트
 *
 *   GET /letters?size=20
 *   GET /letters?keyword=사랑&size=10
 */
