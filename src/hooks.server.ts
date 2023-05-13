import { start } from "$lib/server/mongo/db";

start().then( () => {
    console.log("Mongo started!")
});