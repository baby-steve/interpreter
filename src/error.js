/**
 * throws error for unexpected character
 * @param character the unexpected character
 * @param line the line number the error occurred on
 * @param col the column number the error occurred on
 */
exports.LexerError = class LexerError extends Error {
    constructor(character, line, col) {
        super(`unexpected character '${character}' at line number ${line} and column ${col}\n`);
        this.name = 'LexerError';
    }
}

/** 
 * unexpected error token
 * @param token the name of unexpected token
 */
exports.UnexpectedTokenError = class UnexpectedTokenError extends Error {
    constructor(token, expectedToken) {
        super(`unexpected token '${token}' expected '${expectedToken}'\n`);
        this.name = 'UnexptectedToken';
    }
}

