import { check } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export function assertOk(res, name) {
    const ok = check(res, {
        [`${name} status 200`]: (r) => r.status === 200,
        [`${name} < 1000ms`]:   (r) => r.timings.duration < 1000,
    });
    errorRate.add(!ok);

    if (!ok) {
        console.error(
            `[FAIL] ${name} | status=${res.status} | ${Math.round(res.timings.duration)}ms | url=${res.url}`
        );
    }
}

// 프로젝트 응답 구조에 맞게 수정
// ex) : { code, message, data: { content: [...] } }
export function extractList(res) {
    try {
        return res.json()?.data?.content ?? [];
    } catch {
        return [];
    }
}
