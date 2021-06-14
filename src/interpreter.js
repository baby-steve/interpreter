const chalk = require('chalk');

const UnexpectedTokenError = require('./error.js').UnexpectedTokenError;
const LexerError = require('./error.js').LexerError;
const SyntaxError = require('./error').SyntaxError;

/*
 * ======= LEXER =====================================================
 */

const TokenType = {
    BEGIN: "BEGIN",
    PRINT: "PRINT",
    LET: "LET",
    IF: "IF",
    THEN: "THEN",
    ELSE: "ELSE",
    ENDIF: "ENDIF",
    WHILE: "WHILE",
    ENDWHILE: "ENDWHILE",
    UNTIL: "UNTIL",
    ENDUNTIL: "ENDUNTIL",
    REPEAT: "REPEAT",
    TRUE: "TRUE",
    FALSE: "FALSE",
    NULL: "NULL",
    STRING: "STRING",
    INTEGER: "INTEGER",
    REAL: "REAL",
    BOOLEAN: "BOOLEAN",
    AND: "AND",
    OR: "OR",
    NOT: "NOT",
    FUNCTION: "FUNCTION",
    RETURN: "RETURN",
    END: "END",

    PLUS: "+",
    MINUS: "-",
    MUL: "*",
    DIV: "/",
    MOD: "%",
    NEWLN: "\n",
    LPAREN: "(",
    RPAREN: ")",
    LBRACE: "{",
    RBRACE: "}",
    LBRACKET: '[',
    RBRACKET: ']',
    COMMA: ",",
    COLON: ":",

    INTEGER_CONST: "INTEGER_CONST",
    REAL_CONST: "REAL_CONST",
    STRING_CONST: "STRING_CONST",
    EQ: "==",
    LT: "<",
    GT: ">",
    LTEQ: "<=",
    GTEQ: ">=",
    ASSIGN: "=",
    ID: "ID",
    EOF: "EOF",
}

function buildReservedKeywords() {
    let reservedKeywords = {}

    for (let key in TokenType) {
        let attr = TokenType[key];
        let val = attr.toLowerCase()
        reservedKeywords[val] = attr;
        if (attr == "END") {
            return reservedKeywords;
        }
    }
}

const RESERVED_KEYWORDS = buildReservedKeywords();

class Token {
    constructor(type, value, lineNum, colNum, length) {
        this.type = type;
        this.value = value;
        this.lineNum = lineNum;
        this.colNum = colNum;
        this.length = length;
    }
}
class Lexer {
    constructor(input) {
        this.input = input;
        this.text = input.split('');
        this.pos = 0;
        this.line = 1;
        this.col = 0;
        this.currentChar = this.text[this.pos];
    }
    error(char) {
        let line = this.line;
        let col = this.col;
        throw new LexerError(char, line, col);
    }
    advance() {
        if (this.currentChar == "\n") {
            this.line += 1;
            this.col = 0;
        }

        this.pos += 1;
        if (this.pos >= this.text.length) {
            this.currentChar = null;
        } else {
            this.currentChar = this.text[this.pos];
            this.col += 1;
        }
    }
    peek() {
        let peekPos = this.pos + 1;
        if (peekPos > this.text.length) {
            return null;
        } else {
            return this.text[peekPos];
        }
    }
    skipWhitespace() {
        while (this.currentChar != null && this.isSpace()) {
            this.advance()
        }
    }
    multiLineComment() {
        while (this.currentChar != '*' || this.peek() != '/' ) {
            this.advance();
        }
        this.advance();
        this.advance();
    }
    singleLineComment() {
        while (this.currentChar != null && this.currentChar != undefined && this.currentChar != '\n') {
            this.advance();
        }
    }
    id() {
        let token = new Token(null, null, this.line, this.col, null);
        let result = '';
        while (this.currentChar != null && this.isAlphaNum() || this.currentChar == "_") {
            result += this.currentChar;
            this.advance();
        }
        if (RESERVED_KEYWORDS.hasOwnProperty(result)) {
            token.type = RESERVED_KEYWORDS[result];
        } else {
            token.type = TokenType.ID;
        }
        token.value = result;
        token.length = result.length;
        return token;
    }
    number() {
        let token = new Token(null, null, this.line, this.col, null);
        let result = '';
        while (this.currentChar != null && this.isDigit()) {
            result += this.currentChar;
            this.advance();
        }
        if (this.currentChar == ".") {
            result += this.currentChar;
            this.advance();
            while (this.currentChar != null && this.isDigit()) {
                result += this.currentChar;
                this.advance();
            }
            token.type = TokenType.REAL_CONST;
            token.value = parseFloat(result, 10);
        } else {
            token.type = TokenType.INTEGER_CONST;
            token.value = parseInt(result, 10);
        }
        token.length = token.value.toString().length;
        return token;
    }
    string() {
        let type = this.currentChar;
        this.advance();
        let result = '';
        while (this.currentChar != null && this.currentChar != type) {
            result += this.currentChar;
            this.advance();
        }
        this.advance();
        return new Token(TokenType.STRING_CONST, result, this.line, this.col, result.length);
    }
    isAlpha() {
        // checks if current character is an alphabetic character
        let code = this.currentChar.charCodeAt(0);
        if ((code > 64 && code < 91) || (code > 96 && code < 123)) {
            return true;
        }
        return false;
    }
    isDigit() {
        // checks if current character is a numeric character
        let code = this.currentChar.charCodeAt(0);
        if (code > 47 && code < 58) {
            return true;
        }
        return false;
    }
    isAlphaNum() {
        // checks if current character is an alphanumeric character
        if (this.isDigit() || this.isAlpha()) {
            return true;
        }
        return false;
    }
    isSpace() {
        // checks if current character is a tab, return, or space
        let str = this.currentChar;
        if (str == " " || str == "\r" || str == "\t") {
            return true;
        }
        return false;
    }
    getNextToken() {
        while (this.currentChar != null && this.currentChar != undefined) {
            if (this.isSpace()) {
                this.skipWhitespace();
            }
            if (this.isAlpha()) {
                return this.id();
            }
            if (this.isDigit()) {
                return this.number();
            }
            if (this.currentChar == '/') {
                if (this.peek() == '*') {
                    this.advance();
                    this.advance();
                    this.multiLineComment();
                    continue;
                } else if (this.peek() == '/') {
                    this.advance();
                    this.advance();
                    this.singleLineComment();
                    continue;
                }
            }
            if (this.currentChar == '\"' || this.currentChar == "\'") {
                return this.string();
            }
            if (this.currentChar == '=') {
                if (this.peek() == '=') {
                    this.advance();
                    this.advance();
                    return new Token(TokenType.EQ, '==', this.line, this.col, 2);
                }
                this.advance();
                return new Token(TokenType.ASSIGN, '=', this.line, this.col, 1);
            }
            if (this.currentChar == '<') {
                if (this.peek() == '=') {
                    this.advance();
                    this.advance();
                    return new Token(TokenType.LTEQ, '<=', this.line, this.col, 2);
                }
                this.advance();
                return new Token(TokenType.LT, '<', this.line, this.col, 1);
            }
            if (this.currentChar == '>') {
                if (this.peek() == '=') {
                    this.advance();
                    this.advance();
                    return new Token(TokenType.GTEQ, '>=', this.line, this.col, 2);
                }
                this.advance();
                return new Token(TokenType.GT, '>', this.line, this.col, 1);
            }
            if (this.currentChar == '%') {
                this.advance();
                return new Token(TokenType.MOD, '%', this.line, this.col, 1);
            }
            if (this.currentChar == '\n') {
                this.advance();
                return new Token(TokenType.NEWLN, '\n', this.line, this.col, 1);
            }
            if (this.currentChar == '+') {
                this.advance();
                return new Token(TokenType.PLUS, '+', this.line, this.col, 1);
            }
            if (this.currentChar == '-') {
                this.advance();
                return new Token(TokenType.MINUS, '-', this.line, this.col, 1);
            }
            if (this.currentChar == '*') {
                this.advance();
                return new Token(TokenType.MUL, '*', this.line, this.col, 1);
            }
            if (this.currentChar == '/') {
                this.advance();
                return new Token(TokenType.DIV, '/', this.line, this.col, 1);
            }
            if (this.currentChar == '(') {
                this.advance();
                return new Token(TokenType.LPAREN, '(', this.line, this.col, 1);
            }
            if (this.currentChar == ')') {
                this.advance();
                return new Token(TokenType.RPAREN, ')', this.line, this.col, 1);
            }
            if (this.currentChar == '{') {
                this.advance();
                return new Token(TokenType.LBRACE, '{', this.line, this.col, 1);
            }
            if (this.currentChar == '}') {
                this.advance();
                return new Token(TokenType.RBRACE, '}', this.line, this.col, 1);
            }
            if (this.currentChar == '[') {
                this.advance();
                return new Token(TokenType.LBRACKET, '[', this.line, this.col, 1);
            }
            if (this.currentChar == ']') {
                this.advance();
                return new Token(TokenType.RBRACKET, ']', this.line, this.col, 1);
            }
            if (this.currentChar == ',') {
                this.advance();
                return new Token(TokenType.COMMA, ',', this.line, this.col, 1);
            }
            if (this.currentChar == ':') {
                this.advance();
                return new Token(TokenType.COLON, ':', this.line, this.col, 1);
            }
            this.error(this.currentChar);
        }
        return new Token(TokenType.EOF, null);
    }
}

// =====================================================================
//  Parser   
// =====================================================================

class BinaryExpression {
    constructor(left, op, right) {
        this.name = this.constructor.name;
        this.left = left;
        this.token = this.op = op;
        this.right = right;
    }
}

class LogicalExpression {
    constructor(left, op, right) {
        this.name = this.constructor.name;
        this.left = left;
        this.token = this.op = op;
        this.right = right;
    }
}

class UnaryExpression {
    constructor(op, expr) {
        this.name = this.constructor.name;
        this.token = this.op = op;
        this.expr = expr;
    }
}

class Number {
    constructor(token) {
        this.name = this.constructor.name;
        this.token = token;
        this.value = token.value;
    }
}

class String {
    constructor(token) {
        this.name = this.constructor.name;
        this.token = token;
        this.value = token.value;
    }
}

class Boolean {
    constructor(token) {
        this.name = this.constructor.name;
        this.token = token;
        this.value = token.value;
    }
}

class Varible {
    constructor(token) {
        this.name = this.constructor.name;
        this.token = token;
        this.value = token.value;
    }
}

class ArrayExpression {
    constructor(elements = []) {
        this.name = this.constructor.name;
        this.elements = elements;
    }
}

class MemberExpression {
    constructor(object, property) {
        this.name = this.constructor.name;
        this.object = object;
        this.property = property;
    }
}

class VaribleDeclaration {
    constructor(token, init = null, type = null) {
        this.name = this.constructor.name;
        this.id = token.value;
        this.init = init;
        this.type = type;
    }
}

class Type {
    constructor(token) {
        this.name = this.constructor.name;
        this.token = token;
        this.value = token.value;
    }
}

class Parameter {
    constructor(token, type) {
        this.name = this.constructor.name;
        this.token = token;
        this.value = token.value;
        this.type = type;
    }
}

class FunctionDeclaration {
    constructor(token, params, body) {
        this.name = this.constructor.name;
        this.id = token.value;
        this.params = params;
        this.body = body;
        this.symbol = null;
    }
}

class AssignExpression {
    constructor(left, op, right) {
        this.name = this.constructor.name;
        this.left = left;
        this.token = this.op = op;
        this.right = right;
    }
}

class ExpressionStatement {
    constructor(expr) {
        this.name = this.constructor.name;
        this.expr = expr;
    }
}

class CallExpression {
    constructor(callee, args, token) {
        this.name = this.constructor.name;
        this.callee = callee;
        this.args = args;
        this.token = token;
    }
}

class BlockStatement {
    constructor(body) {
        this.name = this.constructor.name;
        this.body = body;
    }
}

class PrintStatement {
    constructor(expr) {
        this.name = this.constructor.name;
        this.expr = expr;
    }
}

class ReturnStatement {
    constructor(expr) {
        this.name = this.constructor.name;
        this.expr = expr;
    }
}

class IfStatement {
    constructor(test, consequent, alternate) {
        this.name = this.constructor.name;
        this.test = test;
        this.consequent = consequent;
        this.alternate = alternate;
    }
}

class WhileStatement {
    constructor(test, body) {
        this.name = this.constructor.name;
        this.test = test;
        this.body = body;
    }
}

class UntilStatement {
    constructor(test, body) {
        this.name = this.constructor.name;
        this.test = test;
        this.body = body;
    }
}

class Program {
    constructor(body) {
        this.name = this.constructor.name;
        this.body = body;
    }
}

class Empty { }

class Parser {
    constructor(lexer) {
        this.lexer = lexer;
        this.currentToken = this.lexer.getNextToken();
    }
    error(unexpectedToken, expectedToken) {
        throw new UnexpectedTokenError(unexpectedToken, expectedToken);
    }
    eat(tokenType) {
        /* compare the current token type with the passed token
        * type and if they match then "eat" the current token
        * and assign the next token to the self.current_token,
        * otherwise raise an exception. 
        */
        if (this.currentToken.type == tokenType) {
            this.currentToken = this.lexer.getNextToken();
        } else {
            this.error(this.currentToken.value, TokenType[tokenType]);
        }
    }
    program() {
        /* program: block */
        let blockNode = this.block();
        return new Program(blockNode);
    }
    block() {
        /* block: statementList */
        let compoundStmtNode = this.statementList();
        return new BlockStatement(compoundStmtNode);
    }
    statementList() {
        /* statementList: statement { "\n", statement } */
        let node = this.statement();

        // check if node is equal to null. if it isn't, initiate an array with it.
        // otherwise initiate an empty array
        let results = node != null ? [node] : [];

        while (this.currentToken.type == TokenType.NEWLN) {
            this.eat(TokenType.NEWLN);
            let stmt = this.statement();
            if (stmt != null) results.push(stmt);
        }
        return results;
    }
    statement() {
        /* statement: 
            | expressionStatement
            | declarationStatement
            | printStatement
            | whileStatement
            | untilStatement
            | ifStatement
            | functionDecl
        */
        let node, val = this.currentToken.type;
        switch (val) {
            case TokenType.ID:
                node = this.expressionStmt();
                break;
            case TokenType.LET:
                node = this.declarationStmt();
                break;
            case TokenType.PRINT:
                node = this.printStmt();
                break;
            case TokenType.WHILE:
                node = this.whileStmt();
                break;
            case TokenType.UNTIL:
                node = this.untilStmt();
                break;
            case TokenType.IF:
                node = this.ifStmt();
                break;
            case TokenType.FUNCTION:
                node = this.functionDecl();
                break;
            case TokenType.RETURN:
                node = this.returnStmt();
                break;
            default:
                return null;
        }
        return node;
    }
    ifStmt() {
        /* if_stmt: 
            | "if" "(" expression ")" "then" block elsif_stmt "endif"
            | "if" "(" expression ")" "then" block [else_block] "endif" 
        */
        this.eat(TokenType.IF);
        this.eat(TokenType.LPAREN);
        let test = this.expression();
        this.eat(TokenType.RPAREN);
        this.eat(TokenType.THEN);
        let consequent = this.block();
        let alternate;
        if (this.currentToken.type == TokenType.ELSE) {
            this.eat(TokenType.ELSE);
            alternate = this.currentToken.type == TokenType.IF ? this.elseIfStmt() : this.block();
        } else {
            alternate = null;
        }
        this.eat(TokenType.ENDIF);
        return new IfStatement(test, consequent, alternate);
    }
    elseIfStmt() {
        /* elsif_stmt: 
            | "elsif" "(" expression ")" "then" block [elsif_stmt]
            | "elsif" "(" expression ")" "then" block [else_block] 
        */
        this.eat(TokenType.IF);
        this.eat(TokenType.LPAREN);
        let test = this.expression();
        this.eat(TokenType.RPAREN);
        this.eat(TokenType.THEN);
        let consequent = this.block();
        let alternate;
        if (this.currentToken.type == TokenType.ELSE) {
            this.eat(TokenType.ELSE);
            alternate = this.currentToken.type == TokenType.IF ? this.elseIfStmt() : this.block();
        } else {
            alternate = null;
        }
        return new IfStatement(test, consequent, alternate);
    }
    whileStmt() {
        /* whileStmt : "while" "(" expr ")" block "endwhile" */
        this.eat(TokenType.WHILE);
        this.eat(TokenType.LPAREN);
        let test = this.expression();
        this.eat(TokenType.RPAREN);
        this.eat(TokenType.REPEAT);
        let body = this.block();
        this.eat(TokenType.ENDWHILE);
        return new WhileStatement(test, body);
    }
    untilStmt() {
        /* untilStmt : "until" "(" expr ")" block "enduntil" */
        this.eat(TokenType.UNTIL);
        this.eat(TokenType.LPAREN);
        let test = this.expression();
        this.eat(TokenType.RPAREN);
        this.eat(TokenType.REPEAT);
        let body = this.block();
        this.eat(TokenType.ENDUNTIL);
        return new UntilStatement(test, body);
    }
    printStmt() {
        /* printStmt : "print" expr */
        this.eat(TokenType.PRINT);
        return new PrintStatement(this.expression());
    }
    returnStmt() {
        this.eat(TokenType.RETURN);
        let expr = this.expression();
        return new ReturnStatement(expr);
    }
    functionDecl() {
        /* functionDecl : "function" ID paramList "{" block "}" */
        this.eat(TokenType.FUNCTION);
        let token = this.varible();
        let params = this.paramsList();
        this.eat(TokenType.LBRACE);
        let body = this.block();
        this.eat(TokenType.RBRACE);
        return new FunctionDeclaration(token, params, body);
    }
    paramsList() {
        /* paramlist : "(" [param { "," param } ] ")" */
        this.eat(TokenType.LPAREN);
        let params = [];
        if (this.currentToken.type != TokenType.RPAREN) {
            params.push(this.param());
            while (this.currentToken.type == TokenType.COMMA) {
                this.eat(TokenType.COMMA);
                params.push(this.param());
            }
        }
        this.eat(TokenType.RPAREN);
        return params;
    }
    param() {
        /* param : variable ":" type */
        let token = this.varible();
        this.eat(TokenType.COLON);
        let type = this.type();
        return new Parameter(token, type);
    }
    type() {
        /* type :
            | "string" 
            | "integer"
            | "real"
            | "boolean"
        */
        let token = this.currentToken;
        switch (this.currentToken.type) {
            case TokenType.INTEGER:
                this.eat(TokenType.INTEGER);
                break;
            case TokenType.STRING:
                this.eat(TokenType.STRING);
                break;
            case TokenType.REAL:
                this.eat(TokenType.REAL);
                break;
            case TokenType.BOOLEAN:
                this.eat(TokenType.BOOLEAN);
                break;
            default:
                this.error(this.currentToken, "a varible type such as string, int, real or boolean");
                break;
        }
        return new Type(token);
    }
    declarationStmt() {
        /* declarationStmt : "let" NAME [ ":" type][ "=" expr ] */
        this.eat(TokenType.LET);
        let token = this.varible();
        let init = null;
        let type = null;
        if (this.currentToken.type == TokenType.COLON) {
            this.eat(TokenType.COLON);
            type = this.type();
        }
        if (this.currentToken.type == TokenType.ASSIGN) {
            this.eat(TokenType.ASSIGN);
            init = this.expression();
        }
        return new VaribleDeclaration(token, init, type);
    }
    expressionStmt() {
        /* expressionStmt : assignmentStmt | callExpression */
        if (this.lexer.currentChar == '(') {
            return this.callExpression();
        } else {
            return this.assignmentStmt();
        } 
    }
    callExpression() {
        /* callExpression : ID "(" [ expr { "," expr } ] ")" */
        let callee = this.currentToken.value;
        let token = this.currentToken;
        this.eat(TokenType.ID);
        this.eat(TokenType.LPAREN);
        let actualParams = [];
        if (this.currentToken.type != TokenType.RPAREN) {
            let node = this.expression();
            actualParams.push(node);
        }
        while (this.currentToken.type == TokenType.COMMA) {
            this.eat(TokenType.COMMA);
            let node = this.expression();
            actualParams.push(node);
        }
        this.eat(TokenType.RPAREN);
        return new CallExpression(callee, actualParams, token);
    }
    assignmentStmt() {
        /* assignmentStmt : identifier "=" expr */
        let left = this.varible();
        let op = this.currentToken;
        this.eat(TokenType.ASSIGN);
        let right = this.expression();
        return new AssignExpression(left, op, right);
    }
    varible() {
        /* identifer */
        let node = new Varible(this.currentToken);
        this.eat(TokenType.ID);
        return node;
    }
    expression() {
        /* expression : boolean_expression */
        return this.booleanExpression();
    }
    booleanExpression() {
        /* boolean_expression : boolean_factor {"and" booleanFactor} */
        let node = this.booleanTerm();
        let val = this.currentToken.type;
        while (val == TokenType.OR) {
            let token = this.currentToken;
            this.eat(TokenType.OR);
            return new LogicalExpression(node, token, this.booleanExpression());
        }
        return node;
    }
    booleanTerm() {
        /* boolean_expression : boolean_factor {"and" booleanFactor} */
        let node = this.booleanFactor();
        let val = this.currentToken.type;
        while (val == TokenType.AND) {
            let token = this.currentToken;
            this.eat(TokenType.AND);
            return new LogicalExpression(node, token, this.booleanTerm());
        }
        return node;
    }
    booleanFactor() {
        /* boolean_factor = sum [( "=" | "<" | "<=" | ">" | ">=" | "!=") sum ] */
        let node = this.sum();
        let val = this.currentToken.type;
        while (val == TokenType.EQ || val == TokenType.GT || val == TokenType.GTEQ || val == TokenType.LT || val == TokenType.LTEQ) {
            let token = this.currentToken;
            if (token.type == TokenType.EQ) {
                this.eat(TokenType.EQ);
            } else if (token.type == TokenType.LT) {
                this.eat(TokenType.LT);
            } else if (token.type == TokenType.GT) {
                this.eat(TokenType.GT);
            } else if (token.type == TokenType.GTEQ) {
                this.eat(TokenType.GTEQ);
            } else if (token.type == TokenType.LTEQ) {
                this.eat(TokenType.LTEQ);
            }
            return new BinaryExpression(node, token, this.sum());
        }
        return node;
    }
    sum() {
        /* sum:
        | sum '+' term 
        | sum '-' term 
        | term
        */
        let node = this.term();

        while (this.currentToken.type == TokenType.PLUS || this.currentToken.type == TokenType.MINUS) {
            let token = this.currentToken;
            if (token.type == TokenType.PLUS) {
                this.eat(TokenType.PLUS);
            } else if (token.type == TokenType.MINUS) {
                this.eat(TokenType.MINUS);
            }

            node = new BinaryExpression(node, token, this.term());
        }
        return node;
    }
    term() {
        /* term:
        | term '*' factor 
        | term '/' factor
        | term '%' factor 
        | factor 
        */
        let node = this.memberExpression();
        
        while (this.currentToken.type == TokenType.MUL
            || this.currentToken.type == TokenType.DIV
            || this.currentToken.type == TokenType.MOD) {
            let token = this.currentToken;
            if (token.type == TokenType.DIV) {
                this.eat(TokenType.DIV);
            } else if (token.type == TokenType.MUL) {
                this.eat(TokenType.MUL);
            } else if (token.type == TokenType.MOD) {
                this.eat(TokenType.MOD);
            }
            node = new BinaryExpression(node, token, this.memberExpression());
        }
        return node;
    }
    memberExpression() {
        let node = this.factor();
        while (this.currentToken.type == TokenType.LBRACKET) {
            this.eat(TokenType.LBRACKET);
            let property = this.expression();
            this.eat(TokenType.RBRACKET);
            node = new MemberExpression(node, property);
        }
        return node;
    }
    factor() {
        /* factor:
        | '+' factor 
        | '-' factor   
        | stirng
        | real
        | integer
        | varible
        */
        let token = this.currentToken;
        let node;
        switch (token.type) {
            case TokenType.PLUS:
                this.eat(TokenType.PLUS);
                node = new UnaryExpression(token, this.factor());
                return node;
            case TokenType.MINUS:
                this.eat(TokenType.MINUS);
                node = new UnaryExpression(token, this.factor());
                return node;
            case TokenType.INTEGER_CONST:
                this.eat(TokenType.INTEGER_CONST);
                node = new Number(token);
                return node;
            case TokenType.REAL_CONST:
                this.eat(TokenType.REAL_CONST);
                node = new Number(token);
                return node;
            case TokenType.STRING_CONST:
                this.eat(TokenType.STRING_CONST);
                node = new String(token);
                return node;
            case TokenType.TRUE:
                this.eat(TokenType.TRUE);
                node = new Boolean(token);
                return node;
            case TokenType.FALSE:
                this.eat(TokenType.FALSE);
                node = new Boolean(token);
                return node;
            case TokenType.LPAREN:
                this.eat(TokenType.LPAREN);
                node = this.sum();
                this.eat(TokenType.RPAREN);
                return node;
            case TokenType.LBRACKET:
                node = this.array();
                return node;
            case TokenType.ID:
                if (this.lexer.currentChar == "(") {
                    return this.callExpression();
                } else {
                    return this.varible();
                }
            default:
                this.error();
                break
        }
    }
    array() {
        this.eat(TokenType.LBRACKET);
        let elements = [];
        if (this.currentToken.type != TokenType.RBRACKET) {
            let element = this.expression();
            elements.push(element);
            while (this.currentToken.type == TokenType.COMMA) {
                this.eat(TokenType.COMMA);
                elements.push(this.expression());
            }
        }
        this.eat(TokenType.RBRACKET);
        return new ArrayExpression(elements);
    }
    empty() {
        return null;
    }
    parse() {
        let node = this.program();
        if (this.currentToken.type != TokenType.EOF) {
            this.error(this.currentToken.type, TokenType.EOF);
        }
        return node;
    }
}

// =====================================================================
//
//  AST node visitor   
//
// =====================================================================

class NodeVisitor {
    visit(node) {
        switch (node.constructor.name) {
            case "BinaryExpression": return this.visitBinaryExpression(node);
            case "UnaryExpression": return this.visitUnaryExpression(node);
            case "Number": return this.visitNumber(node);
            case "String": return this.visitString(node);
            case "Boolean": return this.visitBoolean(node);
            case "Varible": return this.visitVarible(node);
            case "ArrayExpression": return this.visitArrayExpression(node);
            case "VaribleDeclaration": return this.visitVaribleDeclaration(node);
            case "AssignExpression": return this.visitAssignExpression(node);
            case "LogicalExpression": return this.visitLogicalExpression(node);
            case "MemberExpression": return this.visitMemberExpression(node);
            case "ExpressionStatement": return this.visitExpressionStatement(node);
            case "BlockStatement": return this.visitBlockStatement(node);
            case "ReturnStatement": return this.visitReturnStatement(node);
            case "PrintStatement": return this.visitPrintStatement(node);
            case "IfStatement": return this.visitIfStatement(node);
            case "WhileStatement": return this.visitWhileStatement(node);
            case "UntilStatement": return this.visitUntilStatement(node);
            case "FunctionDeclaration": return this.visitFunctionDeclaration(node);
            case "CallExpression": return this.visitCallExpression(node);
            case "Program": return this.visitProgram(node);
            default:
                this.error(node.constructor.name);
                break;
        }
    }
    error(name) {
        let message = "no visit" + name + " method";
        throw new Error(message);
    }
}

// =====================================================================
//
//  Symbols, Tables
//
// =====================================================================

class BuiltinType {
    constructor() { }
}

class BooleanType extends BuiltinType {
    constructor() {
        super();
        this.name = 'BOOLEAN'
    }
}

class IntegerType extends BuiltinType {
    constructor() {
        super();
        this.name = 'INTEGER'
    }
}

class RealType extends BuiltinType {
    constructor() {
        super();
        this.name = 'REAL'
    }
}

class StringType extends BuiltinType {
    constructor() {
        super();
        this.name = 'STRING'
    }
}

class ArrayType extends BuiltinType {
    constructor(elements = []) {
        super();
        this.name = 'ARRAY'
        this.elements = elements;
    }
}

class VarSymbol {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }
}

class FunctionSymbol {
    constructor(name, type) {
        this.name = name;
        this.type = type;
        this.formalParams = [];
        this.blockAST = null;
    }
}

class SymbolTable {
    constructor(scopeName, scopeLevel, enclosingScope = null) {
        this.symbols = {}
        this.scopeName = scopeName;
        this.scopeLevel = scopeLevel;
        this.enclosingScope = enclosingScope;
    }
    initBuiltins() {
        this.insert(new IntegerType());
        this.insert(new RealType());
        this.insert(new BooleanType());
        this.insert(new StringType());
        this.insert(new ArrayType());
    }
    insert(symbol) {
        symbol.scopeLevel = this.scopeLevel;
        this.symbols[symbol.name] = symbol;
    }
    lookup(name, currentScopeOnly) {
        let symbol = this.symbols[name];

        if (symbol != null) {
            return symbol;
        }
        if (currentScopeOnly) {
            return null;
        }
        if (this.enclosingScope != null) {
            return this.enclosingScope.lookup(name);
        }
    }
    print() {
        let lines = [];
        for (const key in this.symbols) {
            if (Object.hasOwnProperty.call(this.symbols, key)) {
                const element = this.symbols[key];
                let name = element.name;
                let type = element.type;
                let line = `${name} : <${type.name}>`;
                lines.push(line);
            }
        }
        console.log(lines.join('\n'));
    }
}
class SemanticAnalyzer extends NodeVisitor {
    constructor() {
        super();
        this.currentScope = null;
        this.logScope = false;
    }
    log(message) {
        if (this.logScope) {
            console.log(message);
        }
    }
    visitProgram(node) {
        this.log("Enter scope: Global");
        let globalScope = new SymbolTable("global", 1, this.currentScope);
        globalScope.initBuiltins();
        this.currentScope = globalScope;

        this.visit(node.body);

        this.log(globalScope);
        this.currentScope = this.currentScope.enclosingScope;
        this.log("Leave scope: Global");
    }
    visitBlockStatement(node) {
        node.body.forEach(element => {
            this.visit(element);
        });
    }
    visitFunctionDeclaration(node) {
        let fnName = node.id;
        let fnSymbol = new FunctionSymbol(fnName);
        this.currentScope.insert(fnSymbol, false);

        this.log(`Enter scope: ${fnName}`);
        let functionScope = new SymbolTable(fnName, this.currentScope.scopeLevel + 1, this.currentScope);

        this.currentScope = functionScope;

        for (let i = 0; i < node.params.length; i++) {
            let nodeType = this.currentScope.lookup(node.params[i].type.token.type);
            let paramName = node.params[i].value;
            let varSymbol = new VarSymbol(paramName, nodeType);
            this.currentScope.insert(varSymbol);
            fnSymbol.formalParams.push(varSymbol);
        }

        this.visit(node.body);

        if (fnSymbol.type == undefined) fnSymbol.type = "NULL";

        this.log(this.currentScope);
        this.currentScope = this.currentScope.enclosingScope;
        this.log(`Leave scope: ${fnName}`);
        fnSymbol.blockAST = node.body;
    }
    visitWhileStatement(node) {
        this.visit(node.body);
    }
    visitUntilStatement(node) {
        this.visit(node.body);
    }
    visitIfStatement(node) {
        this.visit(node.test);
        this.visit(node.consequent);
        if (node.alternate != null) this.visit(node.alternate);
    }
    visitReturnStatement(node) {
        if (this.currentScope.scopeLevel == 1) throw new Error("cannot have a return statement outside of a function");
        let val = this.visit(node.expr);
        let scopeName = this.currentScope.scopeName;
        this.currentScope.enclosingScope.symbols[scopeName].type = val;
        return val;
    }
    visitPrintStatement(node) {
        this.visit(node.expr);
    }
    visitLogicalExpression(node) {
        this.visit(node.left);
        this.visit(node.right);
    }
    visitExpressionStatement(node) {
        return this.visit(node.expr);
    }
    visitCallExpression(node) {
        for (let i = 0; i < node.args.length; i++) {
            this.visit(node.args[i]);
        }

        let fnSymbol = this.currentScope.lookup(node.callee);
        if (fnSymbol == undefined) throw new Error(`function ${node.callee} is not defined`);
        node.symbol = fnSymbol;
    }
    visitMemberExpression(node) {
        let object = this.visit(node.object);
        let property = node.property.value;
        let member;
        if (object.name == 'ARRAY') {
            member = object.elements[property];
        } else if (object.name == 'STRING') {
            member = new StringType();
        }
        return member == null ? 'NULL' : member;
    }
    visitUnaryExpression(node) {
        return this.visit(node.expr);
    }
    visitBinaryExpression(node) {
        let val1 = this.visit(node.left);
        let val2 = this.visit(node.right);
        if (node.op.type == TokenType.PLUS
            || node.op.type == TokenType.MINUS
            || node.op.type == TokenType.DIV
            || node.op.type == TokenType.MUL
            || node.op.type == TokenType.MOD) {
            let op1 = val1.name;
            let op2 = val2.name;
            if (val1.name != val2.name) throw new Error(`Cannot operate on different types: ${op1}, ${op2}`);
        }
        return val1;
    }
    visitVaribleDeclaration(node) {
        let varInit = node.init;
        let varType = node.type != null ? node.type.token.type : null;
        let typeName;
        if (varType == null) {
            typeName = varInit == null ? 'NULL' : this.visit(node.init);
        } else {
            if (varInit == null) {
                typeName = varType;
            } else {
                let initType = this.visit(node.init);
                if (varType != initType) {
                    throw new Error("blah blah blah");
                }
                typeName = varType
            }
        }
        let varName = node.id;
        let varSymbol = new VarSymbol(varName, typeName);
        // handle duplicate declarations
        if (this.currentScope.lookup(varName, true) != null) {
            throw new Error(`duplicate identifier '${varName}' found\n`);
        }
        this.currentScope.insert(varSymbol);
    }
    visitAssignExpression(node) {
        let varName = node.left.value;
        let value = this.visit(node.right);
        let symbol = this.currentScope.lookup(varName);
        // reassign a type to the varible if it's null
        if (symbol.type == "NULL") symbol.type = value;
        // throw an error if the variable's type is not the same as the value being assigned to it
        if (symbol.type.name != value.name) throw new Error(`assignment error`);
        return value;
    }
    visitVarible(node) {
        let varName = node.value;
        let varSymbol = this.currentScope.lookup(varName);
        if (varSymbol == null) throw new Error(`Symbol not found '${varName}'`);
        return varSymbol.type;
    }
    visitArrayExpression(node) {
        let elements = node.elements.map(el => { return this.visit(el) });
        return new ArrayType(elements);
    }
    visitBoolean(node) {
        return new BooleanType();
    }
    visitString(node) {
        return new StringType();
    }
    visitNumber(node) {
        return node.token.type == 'INTEGER_CONST' ? new IntegerType() : new RealType();
    }
    analyze(tree) {
        this.visitProgram(tree);
    }
}

// =====================================================================
//
//  Interpreter
//
// =====================================================================

class CallStack {
    constructor() {
        this.records = [];
    }
    push(ar) {
        this.records.push(ar);
    }
    pop() {
        return this.records.pop();
    }
    peek() {
        return this.records.slice(-1)[0];
    }
    getRecord(index) {
        let ar = this.records[index - 1];
        if (ar != undefined) {
            return ar;
        }
        return null;
    }
    str() {
        // outputs the call stack in a slightly easier to read way
        // however not sure that it's working properly
        let h1 = "CALL STACK";
        let lines = [h1];
        this.records.reverse().forEach(ar => {
            lines.push(ar.str());
        });
        return lines.join("\n");
    }
}

class ActivationRecord {
    constructor(name, type, nestingLevel) {
        this.name = name;
        this.type = type;
        this.nestingLevel = nestingLevel;
        this.members = {}
    }
    get(key) {
        return this.members[key];
    }
    set(key, value) {
        this.members[key] = value;
    }
    str() {
        let line = [`${chalk.blue(this.nestingLevel)}: ${this.type} ${this.name}`];
        Object.keys(this.members).forEach(key => {
            let ws = Array(15 - key.length).join(" ");
            let string = `  ${key} ${ws}: ${chalk.greenBright(JSON.stringify(this.members[key]))}`;
            line.push(string);
        });
        line.push(" ");
        return line.join("\n");
    }
}

class Interpreter extends NodeVisitor {
    constructor(tree) {
        super();
        this.tree = tree;
        this.callStack = new CallStack();
        this.logScope = false;
    }
    log(message) {
        if (this.logScope == true) {
            console.log(message);
        }
    }
    visitProgram(node) {
        let name = node.constructor.name;
        this.log('Enter: PROGRAM');
        let ar = new ActivationRecord(name, 'PROGRAM', 1);
        this.callStack.push(ar);
        this.log(this.callStack);

        this.visit(node.body);

        this.log("Leave: PROGRAM");
        this.log(this.callStack);

        this.callStack.pop();
    }
    visitBlockStatement(node) {
        let returnValue;
        node.body.some(child => {
            let val = this.visit(child);
            if (val != undefined) return returnValue = val;
        }); true
        return returnValue;
    }
    visitWhileStatement(node) {
        while (this.visit(node.test)) {
            let returnValue = this.visit(node.body);
            if (returnValue != undefined) return returnValue;
        }
    }
    visitUntilStatement(node) {
        while (!(this.visit(node.test))) {
            let returnValue = this.visit(node.body);
            if (returnValue != undefined) return returnValue;
        }
    }
    visitIfStatement(node) {
        if (this.visit(node.test)) {
            return this.visit(node.consequent);
        } else if (node.alternate != null) {
            return this.visit(node.alternate);
        }
    }
    visitPrintStatement(node) {
        console.log(this.visit(node.expr));
    }
    visitReturnStatement(node) {
        let returnValue = this.visit(node.expr);
        return returnValue;
    }
    visitFunctionDeclaration(node) {
        return;
    }
    visitCallExpression(node) {
        let name = node.callee;
        let symbol = node.symbol;
        let ar = new ActivationRecord(name, "FUNCTION", symbol.scopeLevel + 1);

        let formalParams = symbol.formalParams;
        let actualParams = node.args;

        for (let i = 0; i < actualParams.length; i++) {
            let paramSymbol = formalParams[i];
            let argumentNode = actualParams[i];
            ar.set(paramSymbol.name, this.visit(argumentNode));
        }

        this.callStack.push(ar);

        this.log(`Enter: FUNCTION ${name}`);
        this.log(this.callStack);

        let returnVal = this.visit(symbol.blockAST);

        this.log(`Leave: FUNCTION ${name}`);
        this.log(this.callStack);
        this.callStack.pop();

        return returnVal;
    }
    visitMemberExpression(node) {
        let object = this.visit(node.object);
        let index = this.visit(node.property);
        let value = object[index];
        return value == undefined ? null : value;
    }
    visitExpressionStatement(node) {
        this.visit(node.expr);
    }
    visitLogicalExpression(node) {
        let left = this.visit(node.left);
        let right = this.visit(node.right);

        if (node.op.type == TokenType.AND) {
            return left && right;
        } else if (node.op.type == TokenType.OR) {
            return left || right;
        }
        return false;
    }
    visitAssignExpression(node) {
        let varName = node.left.value;
        let varValue = this.visit(node.right);
        let ar = this.callStack.peek();
        ar.set(varName, varValue);
    }
    visitUnaryExpression(node) {
        let op = node.op.type;
        if (op == TokenType.PLUS) {
            return +this.visit(node.expr);
        } else if (op == TokenType.MINUS) {
            return -this.visit(node.expr);
        }
    }
    visitBinaryExpression(node) {
        let op = node.op.type;
        switch (op) {
            // maths
            case TokenType.PLUS:
                return this.visit(node.left) + this.visit(node.right);
            case TokenType.MINUS:
                return this.visit(node.left) - this.visit(node.right);
            case TokenType.MUL:
                return this.visit(node.left) * this.visit(node.right);
            case TokenType.DIV:
                return this.visit(node.left) / this.visit(node.right);
            case TokenType.MOD:
                return this.visit(node.left) % this.visit(node.right);

            // comparsion operators
            case TokenType.LT:
                return this.visit(node.left) < this.visit(node.right);
            case TokenType.LTEQ:
                return this.visit(node.left) <= this.visit(node.right);
            case TokenType.GT:
                return this.visit(node.left) > this.visit(node.right);
            case TokenType.GTEQ:
                return this.visit(node.left) >= this.visit(node.right);
            case TokenType.EQ:
                return this.visit(node.left) === this.visit(node.right);
            default:
                break;
        }
    }
    visitVaribleDeclaration(node) {
        let varName = node.id;
        let varValue = node.init != null ? this.visit(node.init) : null;
        let ar = this.callStack.peek();
        ar.set(varName, varValue);
    }
    visitVarible(node) {
        let varName = node.value;
        let ar = this.callStack.peek();
        let varValue = ar.get(varName);
        if (varValue == undefined) {
            let level = ar.nestingLevel - 1;
            while (level > 0) {
                let prevAR = this.callStack.getRecord(level);
                varValue = prevAR.get(varName);
                level = prevAR.nestingLevel - 1;
            }
        }
        return varValue;
    }
    visitArrayExpression(node) {
        let array = node.elements.map(el => { return this.visit(el) });
        return array;
    }
    visitBoolean(node) {
        return node.value;
    }
    visitString(node) {
        return node.value;
    }
    visitNumber(node) {
        return node.value;
    }
    interpret() {
        if (this.tree == null) {
            return '';
        }
        return this.visit(this.tree);
    }
}

// a bunch of (messy) exports. feel like I should change this

exports.tokenTypes = TokenType;
exports.token = Token;
exports.parser = Parser;
exports.lexer = Lexer;
exports.nodes = {
    number: Number,
    binOp: BinaryExpression,
    unOp: UnaryExpression,
    string: String,
    bool: Boolean,
    var: Varible,
    varDecl: VaribleDeclaration,
    assign: AssignExpression,
    exprStmt: ExpressionStatement,
    block: BlockStatement,
    print: PrintStatement,
    if: IfStatement,
    while: WhileStatement,
    until: UntilStatement,
    program: Program,
}
exports.nodeVisitor = NodeVisitor;
exports.varSymbol = VarSymbol;
exports.builtinType = BuiltinType;
exports.semanticAnalyzer = SemanticAnalyzer;
exports.interpreter = Interpreter;