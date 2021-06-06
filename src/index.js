const fs = require('fs');
const yargs = require('yargs');

const Lexer = require('./interpreter.js').lexer;
const Parser = require('./interpreter.js').parser;
const SemanticAnalyzer = require('./interpreter.js').semanticAnalyzer;
const Interpreter = require('./interpreter.js').interpreter;

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
        if (args.scope) console.log(console.log(semanticAnalyzer.symtab));
        if (args.ast) {
            let output = JSON.stringify(tree, null, 2);
            fs.writeFile('AST.json', output, (err) => {
                if (err) {
                    console.log(err);
                }
            });
        }
    });

}

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
    .option('ast', {
        description: 'generate an AST as json file'
    })
    .help()
    .alias('help', 'h')
    .alias('version', 'v')
    .argv;

if (args._) {
    let filePath = args._[0];
    main(filePath);
}