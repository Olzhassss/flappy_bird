import { MongoClient } from "mongodb";
import { PRIVATE_STATIC_DB_URL } from "$env/static/private";

const client = new MongoClient(PRIVATE_STATIC_DB_URL);

export async function start() {
    console.log("Mongo is starting . . .");
    return client.connect();
}

export default client.db("testdb");