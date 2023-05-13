import type { PageLoad } from './$types';

export const load = (async ({ fetch }) => {
    const data = await fetch("/api/leaderboard", { method: 'GET'})
    return {
        leaderboard: await data.json(),
    };
}) satisfies PageLoad;