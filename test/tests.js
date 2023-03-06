const { Sifbase, SIFDB } = require("../src/index");
const db = new Sifbase(__dirname + "/storage/db1.json");
const sifdb = new Sifbase(__dirname + "/storage/db2.sifdb");
const ndb = new Sifbase(__dirname + "/storage/db1.json").table("namespace1");
const adb = new Sifbase(__dirname + "/storage/db1.json", "array");

async function tester() {

    await db.clear();
    await db.importSIFDB(new SIFDB(__dirname + "/storage/importable.sifdb"));
    console.log("Value before:", await db.get("test")); // Expected: undefined
    await db.set("test", "a 2nd value");
    console.log("Value after:", await db.get("test")); // Expected: "a 2nd value"
    console.log("Keyvalue:", await db.get("testkey")); // Expected: "testvalue"

    console.log("Sync keyvalue:", db.cache.get("testkey")); // Expected: "testvalue"
    console.log("Keyword keyvalue:", await db.testkey); // Expected: "testvalue"

    // All values match expected values :)

}

async function sifdbTester() {

    await sifdb.clear();
    console.log("Value before:", await sifdb.get("akey", "default")); // Expected: "default"
    await sifdb.set("akey", "a true value")
    console.log("Value after:", await sifdb.get("akey")); // Expected: "a true value"

    const localsifdb = new SIFDB();
    localsifdb.set("testkey", "testvalue");
    SIFDB.export(__dirname + "/storage/importable.sifdb", localsifdb);

    // All values match expected values :)

}

async function namespaceTester() {

    console.log("Value before:", await ndb.get("test")); // Expected: undefined
    await ndb.set("test", "a 4th value")
    console.log("Value after:", await ndb.get("test")); // Expected: "a 4th value"

    // All values match expected values :)

}

async function arrayTester() {

    await adb.clear();
    console.log("Value nonarray:", await adb.get(0)); // Expected: undefined
    const arr = await adb.asArray();
    console.log("Value before:", await arr[0]); // Expected: undefined
    arr[0] =  "first value";
    await Sifbase.await();
    console.log("Value after:", await arr[0]); // Expected: "first value"
    await arr.push("second value");
    await arr.push("third value");
    console.log("Second value after:", await arr[1]); // Expected: "second value"
    console.log("Arr before splice:", await arr.toRawArray(true)); // Expected: ["first value", "second value", "third value"]
    await arr.splice(0, 1);
    console.log("Arr after splice:", await arr.toRawArray(true)); // Expected: ["second value", "third value"]
    console.log("After splice:", await arr[0]); // Expected: "second value"
    console.log("Find:", await arr.find(v => v.startsWith("th"))); // Expected: "third value"
    console.log("Some:", await arr.some(v => v.startsWith("sth"))); // Expected: false
    console.log("Findex:", await arr.findIndex(v => v.startsWith("th"))); // Expected: 1
    console.log("Mapped:", await (await arr.map(v => "\n\t- Value: " + v)).join(" ")); // Expected: "\n\t-Value: second value\n\t-Value: third value"
    await arr.concat(["fourth value", "fifth value"]);
    console.log("Concat:", await arr.toRawArray(true)); // Expected: ["second value", "third value", "fourth value", "fifth value"]
    console.log("Sliced:", await arr.slice(1, 3)); // Expected: ["third value", "fourth value"]
    console.log("First:", await arr.first()); // Expected: "second value"
    console.log("Last:", await arr.last()); // Expected: "fifth value"
    console.log("Length:", arr.length); // Expected: 4

    console.log("Joined:", await arr.join(",")); // Expected: "second value,third value,fourth value,fifth value"
    console.log("Sync RawArray:", arr.toRawArray()); // Expected: ["second value", "third value", "fourth value", "fifth value"]
    console.log("Includes", await arr.includes("third value")); // Expected: true
    console.log("At (Last):", await arr.at(-1), "| vs Last:", await arr.last()); // Expected: "fifth value" and "fifth value"
    for await (const value of arr) console.log("Iterator Value:", value); // Expected: "second value", "third value", "fourth value", "fifth value"

    // All values match expected values :)

}

async function testMultipleTableReference() {

    const table = sifdb;

    console.log("Value before:", await table.get("akey")); // Expected: "a true value"
    await table.set("akey", ["a large array", 1 , 2 , 3, 4, 5, 6, 7, 8], 6000);
    await table.set("tronch", ["some other array", 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    console.log("Value after:", await table.get("akey")); // Expected: ["a large array", 1 , 2 , 3, 4, 5, 6, 7, 8]

    const table2 = new Sifbase(__dirname + "/storage/db2.sifdb");
    setTimeout(async () => console.log("Value even after:", await table2.get("akey")), 5000); // Expected: ["a large array", 1 , 2 , 3, 4, 5, 6, 7, 8]
    setTimeout(async () => console.log("Value even more after:", await table2.get("akey")), 16000); // Expected: undefined

    // All values match expected values :)
}

async function testIterators() {

    await sifdb.clear();

    const table = sifdb.table("test");
    await table.set("key1", "value1");
    await table.set("key2", "value2");
    await table.set("key3", "value3");

    for await (const [key, value] of table) {
        console.log("Async Key:", key, "Async Value:", value); // Expected: "key1","value1";"key2","value2";"key3","value3"
    }

    // All values match expected values :)

}

// sifdbTester(); // Success :)
// tester(); // Success :)
// namespaceTester(); // Success :)
// arrayTester(); // Success :)
// testMultipleTableReference(); // Success :)
// testIterators(); // Success :)

// All tests successfully passing.