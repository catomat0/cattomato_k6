import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, headers } from './helpers/auth.js';
import { assertOk, extractList } from './helpers/checks.js';
import { handleSummary } from './helpers/summary.js';

export { handleSummary };

export const options = {
    vus: 1,
    duration: '1m',
    thresholds: {
        http_req_failed:   ['rate<0.01'],
        http_req_duration: ['p(95)<500'],
        errors:            ['rate<0.01'],
    },
};

export default function () {
    // 목록 조회
    const list = http.get(`${BASE_URL}/items?size=10`, { headers: headers() });
    assertOk(list, 'item-list');

    // 상세 조회 (목록 첫 번째 id 활용)
    const items = extractList(list);
    if (items.length > 0) {
        const id = items[0].id;
        const detail = http.get(`${BASE_URL}/items/${id}`, { headers: headers() });
        assertOk(detail, 'item-detail');
    }
    sleep(1);

    // 서브 리소스 조회
    const sub = http.get(`${BASE_URL}/sub-items`, { headers: headers() });
    assertOk(sub, 'sub-item-list');
    sleep(1);
}

/**
 * [예시] 프로젝트 적용 시
 *
 * const home = http.get(`${BASE_URL}/home`, { headers: headers() });
 * assertOk(home, 'home');
 *
 * const list = http.get(`${BASE_URL}/letters?size=10&sort=createdAt,desc`, { headers: headers() });
 * assertOk(list, 'letter-list');
 *
 * const items = extractList(list);
 * if (items.length > 0) {
 *     const detail = http.get(`${BASE_URL}/letters/${items[0].id}`, { headers: headers() });
 *     assertOk(detail, 'letter-detail');
 * }
 *
 * const folders = http.get(`${BASE_URL}/folders`, { headers: headers() });
 * assertOk(folders, 'folder-list');
 */
