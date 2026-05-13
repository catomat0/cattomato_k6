export function handleSummary(data) {
    const failed = [];

    for (const [metricName, metric] of Object.entries(data.metrics)) {
        if (!metric.thresholds) continue;

        for (const [condition, result] of Object.entries(metric.thresholds)) {
            if (!result.ok) {
                const actual = resolveActual(condition, metric.values);
                failed.push(`  [FAIL] ${metricName} | 조건: ${condition} | 실제값: ${actual}`);
            }
        }
    }

    if (failed.length === 0) {
        console.log('✓ 모든 임계값 통과');
    } else {
        console.error('✗ 임계값 초과:');
        failed.forEach(line => console.error(line));
    }

    return {};
}

function resolveActual(condition, values) {
    if (condition.includes('p(99)')) return `p(99)=${Math.round(values['p(99)'])}ms`;
    if (condition.includes('p(95)')) return `p(95)=${Math.round(values['p(95)'])}ms`;
    if (condition.includes('rate'))  return `rate=${(values.rate * 100).toFixed(2)}%`;
    return JSON.stringify(values);
}
