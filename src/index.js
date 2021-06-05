/**
 * TODO:
 * 1. parse command line arguments
 * 2. add scoped varibles (for loops, conditionals, functions...)
 */

const fs = require('fs');
const yargs = require('yargs');
const chalk = require('chalk');

const UnexpectedTokenError = require('./error.js').UnexpectedTokenError;
const LexerError = require('./error.js').LexerError;

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
    AND: "AND",
    OR: "OR",
    NOT: "NOT",
    END: "END",

    PLUS: "+",
    MINUS: "-",
    MUL: "*",
    DIV: "/",
    MOD: "%",
    NEWLN: "\n",
    LPAREN: "(",
    RPAREN: ")",

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
        if (this.pos > this.text.length) {
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
        while (this.peek() != '/' && this.currentChar != '*') {
            this.advance();
        }
        this.advance();
        this.advance();
    }
    singleLineComment() {
        while (this.currentChar != '\n') {
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
        let result = '';
        while (this.currentChar != null && this.currentChar != '\"') {
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
        while (this.currentChar != null) {
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
                } else if (this.peek() == '/') {
                    this.advance();
                    this.advance();
                    this.singleLineComment();
                }
            }
            if (this.currentChar == '\"') {
                this.advance();
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
        this.left = left;
        this.token = this.op = op;
        this.right = right;
    }
}

class LogicalExpression {
    constructor(left, op, right) {
        this.left = left;
        this.token = this.op = op;
        this.right = right;
    }
}

class UnaryExpression {
    constructor(op, expr) {
        this.token = this.op = op;
        this.expr = expr;
    }
}

class Number {
    constructor(token) {
        this.token = token;
        this.value = token.value;
    }
}

class String {
    constructor(token) {
        this.token = token;
        this.value = token.value;
    }
}

class Boolean {
    constructor(token) {
        this.token = token;
        this.value = token.value;
    }
}

class Varible {
    constructor(token) {
        this.token = token;
        this.value = token.value;
    }
}

class VaribleDeclaration {
    constructor(token, init = null) {
        this.id = token.value;
        this.init = init;
    }
}

class AssignExpression {
    constructor(left, op, right) {
        this.left = left;
        this.token = this.op = op;
        this.right = right;
    }
}

class ExpressionStatement {
    constructor(expr) {
        this.expr = expr;
    }
}

class BlockStatement {
    constructor(body) {
        this.body = body;
    }
}

class PrintStatement {
    constructor(expr) {
        this.expr = expr;
    }
}

class IfStatement {
    constructor(test, consequent, alternate) {
        this.test = test;
        this.consequent = consequent;
        this.alternate = alternate;
    }
}

class WhileStatement {
    constructor(test, body) {
        this.test = test;
        this.body = body;
    }
}

class UntilStatement {
    constructor(test, body) {
        this.test = test;
        this.body = body;
    }
}

class Program {
    constructor(body) {
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
            this.error(this.currentToken.type, tokenType);
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
            default:
                return null;
        }
        return node;
    }
    ifStmt() {
        /* ifStmt : "if" "(" expr ")" "then" block [elseBlock] "endif" */
        this.eat(TokenType.IF);
        this.eat(TokenType.LPAREN);
        let test = this.expression();
        this.eat(TokenType.RPAREN);
        this.eat(TokenType.THEN);
        let consequent = this.block();
        let alternate = this.currentToken.type == TokenType.ELSE ? this.elseBlock() : null;
        this.eat(TokenType.ENDIF);
        return new IfStatement(test, consequent, alternate);
    }
    elseBlock() {
        /* elseBlock : "else" block */
        this.eat(TokenType.ELSE);
        return this.block();
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
    declarationStmt() {
        /* declarationStmt : "let" NAME [ "=", expr ] */
        this.eat(TokenType.LET);
        let token = this.varible();
        let init = null;
        if (this.currentToken.type == TokenType.ASSIGN) {
            this.eat(TokenType.ASSIGN);
            init = this.expression();
        }
        return new VaribleDeclaration(token, init);
    }
    expressionStmt() {
        /* expressionStmt : expr */
        return new ExpressionStatement(this.assignmentStmt());
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
        return this.booleanFactor();
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
        let node = this.factor();

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
            node = new BinaryExpression(node, token, this.factor());
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
            default:
                node = this.varible();
                return node;
        }
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
exports.parser = Parser;

// =====================================================================
//
//  AST node visitor   
//
// =====================================================================

class NodeVisitor {
    /*visit(node) {
        const METHODS = {
            "BinaryExpression": this.visitBinaryExpression,//(),
            "UnaryExpression": this.visitUnaryExpression,//(),
            "Number": this.visitNumber,//(),
            "String": this.visitString,//(),
            "Boolean": this.visitBoolean,//(),
            "Varible": this.visitVarible,//(),
            "VaribleDeclaration": this.visitVaribleDeclaration,//(),
            "AssignExpression": this.visitAssignExpression,//(),
            "ExpressionStatement": this.visitExpressionStatement,//(),
            "BlockStatement": this.visitBlockStatement,//(),
            "PrintStatement": this.visitPrintStatement,//(),
            "IfStatement": this.visitIfStatement,//(),
            "WhileStatement": this.visitWhileStatement,//(),
            "UntilStatement": this.visitUntilStatement,//(),
            "Program": this.visitProgram,//(),
        }

        let name = node.constructor.name;
        console.log("current node: " + name);
        if (METHODS.hasOwnProperty(name)) {
            console.log(METHODS);
            return METHODS[name](node);
        } else {
            return this.error(name);
        }
    }*/
    visit(node) {
        switch (node.constructor.name) {
            case "BinaryExpression": return this.visitBinaryExpression(node);
            case "UnaryExpression": return this.visitUnaryExpression(node);
            case "Number": return this.visitNumber(node);
            case "String": return this.visitString(node);
            case "Boolean": return this.visitBoolean(node);
            case "Varible": return this.visitVarible(node);
            case "VaribleDeclaration": return this.visitVaribleDeclaration(node);
            case "AssignExpression": return this.visitAssignExpression(node);
            case "ExpressionStatement": return this.visitExpressionStatement(node);
            case "BlockStatement": return this.visitBlockStatement(node);
            case "PrintStatement": return this.visitPrintStatement(node);
            case "IfStatement": return this.visitIfStatement(node);
            case "WhileStatement": return this.visitWhileStatement(node);
            case "UntilStatement": return this.visitUntilStatement(node);
            case "Program": return this.visitProgram(node);
            default:
                this.error();
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
//  Symbols, Tables and Semantic Analysis
//
// =====================================================================

class Symbol {
    constructor(name, type) {
        this.name = name;
    }
}

class VarSymbol extends Symbol {
    constructor(name, type) {
        super(name);
        this.type = type;
    }
}

class BuiltinTypeSymbol extends Symbol {
    constructor(name) {
        super(name);
    }
}

class SymbolTable {
    constructor() {
        this.symbols = {}
        this.initBuiltins();
    }
    initBuiltins() {
        this.insert(new BuiltinTypeSymbol('INTEGER'));
        this.insert(new BuiltinTypeSymbol('REAL'));
        this.insert(new BuiltinTypeSymbol('NUMBER'));
        this.insert(new BuiltinTypeSymbol('STRING'));
        this.insert(new BuiltinTypeSymbol('BOOLEAN'));
        this.insert(new BuiltinTypeSymbol('NULL'));
    }
    printContent() {
        let header = '\nSymbol table contents';
        let underLine = '====================';
        let lines = [header, underLine + underLine];
        for (let key in this.symbols) {
            let ws = Array(10 - key.length).join(" ");
            let val = this.symbols[key];
            let className = val.constructor.name;
            let name = val.name;
            let type = val.type != undefined ? `, type='${chalk.yellow(val.type.name)}'` : "";
            lines.push(`${ws}${key} : <${chalk.blue(className)}(name='${chalk.green(name)}'${type}>`);
        }
        //console.log(lines.join('\n'));
    }
    insert(symbol) {
        //console.log(`Insert: <${symbol.name}>`);
        this.symbols[symbol.name] = symbol;
    }
    lookup(name) {
        //console.log(`Lookup: <${name}>`);
        let symbol = this.symbols[name];
        return symbol;
    }
}

class SemanticAnalyzer extends NodeVisitor {
    constructor() {
        super();
        this.symtab = new SymbolTable();
    }
    visitProgram(node) {
        this.visit(node.body);
    }
    visitBlockStatement(node) {
        node.body.forEach(element => { this.visit(element) });
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
    visitPrintStatement(node) {
        this.visit(node.expr);
    }
    visitExpressionStatement(node) {
        return this.visit(node.expr);
    }
    visitUnaryExpression(node) {
        return this.visit(node.expr);
    }
    visitBinaryExpression(node) {
        let val1 = this.visit(node.left);
        let val2 = this.visit(node.right);
        if (val1 != val2) {
            throw new Error(`Cannot operate on different types: ${val1}, ${val2}`)
        }
        return val1;
    }
    visitVaribleDeclaration(node) {
        let varInit = node.init;

        // check if the varible was declared with a value, if it wasn't set the type to null
        let typeName = varInit == null ? "NULL" : this.visit(node.init);

        let typeSymbol = this.symtab.lookup(typeName);

        let varName = node.id;
        let varSymbol = new VarSymbol(varName, typeSymbol);

        // handle duplicate declarations
        if (this.symtab.lookup(varName) != null) {
            throw new Error
                (`duplicate identifier '${varName}' found.\n varibles can only be declared once inside a scope.\n I think so, anyways.\n`)
        }

        this.symtab.insert(varSymbol);
    }
    visitAssignExpression(node) {
        let varName = node.left.value;
        let value = this.visit(node.right);
        // reassign a type to the varible
        if (this.symtab.lookup(varName).type.name == "NULL") this.symtab.lookup(varName).type.name = value;
        return value;
    }
    visitVarible(node) {
        let varName = node.value;
        let varSymbol = this.symtab.lookup(varName);
        // check to make sure the varible is not undefined
        if (varSymbol == null) throw new Error(`Symbol not found '${varName}'`);
        return varSymbol.type.name;
    }
    visitBoolean() {
        return "BOOLEAN";
    }
    visitString() {
        return "STRING";
    }
    visitNumber(node) {
        if (node.token.type == "INTEGER_CONST") {
            return "INTEGER";
        } else {
            return "REAL";
        }
    }
}

// =====================================================================
//
//  Interpreter
//
// =====================================================================

class Interpreter extends NodeVisitor {
    constructor(tree) {
        super();
        this.tree = tree;
        this.GlobalMemory = {};
    }
    visitProgram(node) {
        this.visit(node.body);
    }
    visitBlockStatement(node) {
        node.body.forEach(child => { this.visit(child) });
    }
    visitWhileStatement(node) {
        while (this.visit(node.test)) {
            this.visit(node.body);
        }
    }
    visitUntilStatement(node) {
        while (!(this.visit(node.test))) {
            this.visit(node.body);
        }
    }
    visitIfStatement(node) {
        if (this.visit(node.test)) {
            this.visit(node.consequent);
        } else if (node.alternate != null) {
            this.visit(node.alternate);
        }
    }
    visitPrintStatement(node) {
        console.log(this.visit(node.expr));
    }
    visitExpressionStatement(node) {
        this.visit(node.expr);
    }
    visitAssignExpression(node) {
        let varName = node.left.value;
        let varValue = this.visit(node.right);
        this.GlobalMemory[varName] = varValue;
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
                return this.visit(node.left) == this.visit(node.right);
            default:
                break;
        }
    }
    visitVaribleDeclaration(node) {
        let varName = node.id;
        let varValue = node.init != null ? this.visit(node.init) : null;
        this.GlobalMemory[varName] = varValue;
    }
    visitVarible(node) {
        let varName = node.value;
        let varValue = this.GlobalMemory[varName];
        return varValue;
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
exports.interpreter = Interpreter;

// =====================================================================
//
//  Run
//
// =====================================================================

function main(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        let text = data;
        let lexer = new Lexer(text);
        let parser = new Parser(lexer);

        let tree = parser.parse();

        let semanticAnalyzer = new SemanticAnalyzer();
        semanticAnalyzer.visit(tree);

        let interpreter = new Interpreter(tree);
        interpreter.interpret();
        if (args.memory) console.log(interpreter.GlobalMemory);
        if (args.scope) console.log(console.log(semanticAnalyzer.symtab))
        /*
        try {
            semanticAnalyzer.visit(tree);
        } catch (error) {
            console.log(error);
        }
        
        console.log(JSON.stringify(semanticAnalyzer.symtab.symbols, null, 2));*/
        //console.log(semanticAnalyzer.symtab.printContent());
        //console.log(parser.parse());
        /*
        let result = parser.parse();
        let output = JSON.stringify(result);
    
        fs.writeFile('AST.json', output, (err) => {
            if (err) {
                console.log(err)
                return
            }
        });*/
    });

}
/*
const args = yargs
    .scriptName('interpreter')
    .command('<file-path>', 'the file path of the input file', {
        type: 'string'
    })
    .option('memory', {
        alias: 'm',
        description: 'log the global memory',
        type: 'boolean',
    })
    .option('scope', {
        alias: 's',
        description: 'log the symbol table',
        type: 'boolean',
    })
    .help()
    .alias('help', 'h')
    .alias('version', 'v')
    .argv;

if (args._) {
    let filePath = args._[0];
    main(filePath);
}
*/
exports.tokenTypes = TokenType; 
exports.token = Token;
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

exports.symbol = Symbol;
exports.varSymbol = VarSymbol;
exports.builtinTypeSymbol = BuiltinTypeSymbol;