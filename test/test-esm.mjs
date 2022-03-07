import Sifbase from "../src/wrapper.mjs";
const __dirname = Sifbase.__dirname(import.meta);
const sifdb = new Sifbase(__dirname + "/storage/db2.sifdb");

async function sifdbTester() {

    await sifdb.clear();
    console.log("Value before:", await sifdb.get("akey", "default"));
    await sifdb.set("akey", "a true value")
    console.log("Value after:", await sifdb.get("akey"));

}

// sifdbTester()