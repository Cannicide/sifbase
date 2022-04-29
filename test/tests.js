const { Sifbase, SIFDB } = require("../src/index");
const db = new Sifbase(__dirname + "/storage/db1.json");
const sifdb = new Sifbase(__dirname + "/storage/db2.sifdb");
const ndb = new Sifbase(__dirname + "/storage/db1.json").table("namespace1");
const adb = new Sifbase(__dirname + "/storage/db1.json", "array");

async function tester() {

    await db.clear();
    await db.importSIFDB(new SIFDB(__dirname + "/storage/importable.sifdb"));
    console.log("Value before:", await db.get("test"));
    await db.set("test", "a 2nd value")
    console.log("Value after:", await db.get("test"));
    console.log("Keyvalue:", await db.get("testkey"));

    console.log("Sync keyvalue:", db.cache.get("testkey"));
    console.log("Keyword keyvalue:", await db.testkey);

}

async function sifdbTester() {

    await sifdb.clear();
    console.log("Value before:", await sifdb.get("akey", "default"));
    await sifdb.set("akey", "a true value")
    console.log("Value after:", await sifdb.get("akey"));

    const localsifdb = new SIFDB();
    localsifdb.set("testkey", "testvalue");
    SIFDB.export(__dirname + "/storage/importable.sifdb", localsifdb);

}

async function namespaceTester() {

    console.log("Value before:", await ndb.get("test"));
    await ndb.set("test", "a 4th value")
    console.log("Value after:", await ndb.get("test"));

}

async function arrayTester() {

    await adb.clear();
    console.log("Value nonarray:", await adb.get(0));
    const arr = await adb.asArray();
    console.log("Value before:", await arr[0]);
    arr[0] =  "first value";
    await Sifbase.await();
    console.log("Value after:", await arr[0]);
    await arr.push("second value");
    await arr.push("third value");
    console.log("Second value after:", await arr[1]);
    console.log("Arr before splice:", await arr.toRawArray());
    await arr.splice(0, 1);
    console.log("Arr after splice:", await arr.toRawArray());
    console.log("After splice:", await arr[0]);
    console.log("Find:", await arr.find(v => v.startsWith("th")));
    console.log("Some:", await arr.some(v => v.startsWith("sth")));
    console.log("Findex:", await arr.findIndex(v => v.startsWith("th")));
    console.log("Mapped:", await (await arr.map(v => "\n\t- Value: " + v)).join(" "));
    await arr.concat(["fourth value", "fifth value"]);
    console.log("Concat:", await arr.toRawArray());
    console.log("Sliced:", await arr.slice(1, 3));
    console.log("First:", await arr.first());
    console.log("Last:", await arr.last());
    console.log("Length:", arr.length);

}

async function testMultipleTableReference() {
    // await sifdb.clear();

    const table = sifdb;

    console.log("Value before:", await table.get("akey"));
    await table.set("akey", ["a large array", 1 , 2 , 3, 4, 5, 6, 7, 8], 6000);
    await table.set("tronch", ["some other array", 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    console.log("Value after:", await table.get("akey"));

    const table2 = new Sifbase(__dirname + "/storage/db2.sifdb");
    setTimeout(async () => console.log("Value even after:", await table2.get("akey")), 5000);
    setTimeout(async () => console.log("Value even more after:", await table2.get("akey")), 16000);
}

async function testIterators() {

    await sifdb.clear();

    const table = sifdb.table("test");
    await table.set("key1", "value1");
    await table.set("key2", "value2");
    await table.set("key3", "value3");

    for await (const [key, value] of table) {
        console.log("Async Key:", key, "Async Value:", value);
    }

}

// tester();
// sifdbTester();
// namespaceTester();
// arrayTester();
// testMultipleTableReference();
// testIterators();