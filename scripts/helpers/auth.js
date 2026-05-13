export const BASE_URL = __ENV.BASE_URL;
export const ACCESS_TOKEN = __ENV.ACCESS_TOKEN;

export function headers() {
    return {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    };
}
