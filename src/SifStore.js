const { KeyvFile } = require('keyv-file')

module.exports = class SifStore extends KeyvFile {

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
    constructor(path) {
        super({
            filename: path,
            writeDelay: 100,
            encode: SifStore.TYPES[path.split(".").slice(-1)[0]].encode,
            decode: SifStore.TYPES[path.split(".").slice(-1)[0]].decode
        });
    }

}