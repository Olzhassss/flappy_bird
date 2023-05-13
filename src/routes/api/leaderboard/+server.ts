import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { leaderboard } from '$lib/server/mongo/leaderboard';


export const POST: RequestHandler = async ({ request }) => {
	const { name, score } = await request.json();
    
    try {
        if (name.length < 25 && name.length > 2){  
            leaderboard.insertOne({
                name: name,
                score: parseInt(score),
            })
        }
    } catch {
        throw error(400, 'Bad request!');
    }
   
	return new Response("Success", {status: 200});
};

export const GET: RequestHandler = async () => {    
	return json ( await leaderboard.find().sort( "score", -1 ).limit( 10 ).toArray(), { status: 200 } );
};