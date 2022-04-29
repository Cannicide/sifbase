const { KeyvFile } = require('keyv-file')

/**
 * Acts as a wrapper for a KeyvFile instance.
 * Used to simulate extension of a Map class, in order to enable certain features in Keyv.
 */
class PseudoKeyvFile extends Map {

    constructor(...args) {
        super();
        const file = new KeyvFile(...args);
        this.keys = () => file.keys();
        this.fileGet = key => file.get(key);

        return new Proxy(this, {
            get(_target, prop) {
                if (prop == Symbol.iterator) return Reflect.get(_target, Symbol.iterator).bind(_target);
                if (prop == "namespace") return Reflect.get(_target, "namespace");

                const getter = Reflect.get(file, prop);
                if (typeof getter === 'function') return getter.bind(file);
                return getter;
            },
            set(_target, prop, value) {
                if (prop == "namespace" || prop == "keys" || prop == "fileGet") {
                    Reflect.set(_target, prop, value);
                    return true;
                }
                Reflect.set(file, prop, value);
                return true;
            }
        });
    }

}

module.exports = class SifStore extends PseudoKeyvFile {

    /**
     * Encode/decode functions for the different file types.
     */
    static TYPES = {
        json: {
            encode: input => JSON.stringify(input),
            decode: input => JSON.parse(input)
        },
        sifdb: {
            encode: input => Buffer.from(JSON.stringify(input)).toString("base64"),
            decode: input => JSON.parse(Buffer.from(input, "base64").toString("ascii"))
        }
    }

    /**
     * JSON/SIFDB file manager, extended from KeyvFile.
     * @param {String} path - The path to the file.
     */
    constructor(path, namespace) {
        super({
            filename: path,
            writeDelay: 100,
            encode: SifStore.TYPES[path.split(".").slice(-1)[0]].encode,
            decode: SifStore.TYPES[path.split(".").slice(-1)[0]].decode
        });

        this.namespace = namespace;
    }

    *[Symbol.iterator]() {
        for (const key of this.keys().filter(k => !this.namespace || k.startsWith(this.namespace + ":"))) yield [key, this.fileGet(key)];
    }

}