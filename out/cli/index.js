"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndValidate = exports.generatePromptAction = exports.generateAction = void 0;
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const module_1 = require("../language-server/generated/module");
const impromptu_module_1 = require("../language-server/impromptu-module");
const cli_util_1 = require("./cli-util");
const generator_1 = require("./generator");
const generate_prompt_1 = require("./generate-prompt");
const node_1 = require("langium/node");
const generateAction = (fileName, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    const model = yield (0, cli_util_1.extractAstNode)(fileName, services);
    const generatedFilePath = (0, generator_1.generateJavaScript)(model, fileName, opts.destination);
    console.log(chalk_1.default.green(`JavaScript code generated successfully: ${generatedFilePath}`));
});
exports.generateAction = generateAction;
const generatePromptAction = (fileName, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    const model = yield (0, cli_util_1.extractAstNode)(fileName, services);
    const generatedFilePath = (0, generate_prompt_1.generatePrompt)(model, fileName, opts.destination, opts.target);
    console.log(chalk_1.default.green(`Prompt generated successfully: ${generatedFilePath}`));
});
exports.generatePromptAction = generatePromptAction;
const parseAndValidate = (fileName) => __awaiter(void 0, void 0, void 0, function* () {
    // retrieve the services for our language
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    // extract a document for our program
    const document = yield (0, cli_util_1.extractDocument)(fileName, services);
    // extract the parse result details
    const parseResult = document.parseResult;
    // verify no lexer, parser, or general diagnostic errors show up
    if (parseResult.lexerErrors.length === 0 &&
        parseResult.parserErrors.length === 0) {
        console.log(chalk_1.default.green(`Parsed and validated ${fileName} successfully!`));
    }
    else {
        console.log(chalk_1.default.red(`Failed to parse and validate ${fileName}!`));
    }
});
exports.parseAndValidate = parseAndValidate;
function default_1() {
    const program = new commander_1.Command();
    program
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .version(require('../../package.json').version);
    const fileExtensions = module_1.ImpromptuLanguageMetaData.fileExtensions.join(', ');
    program
        .command('generate')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .description('generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file')
        .action(exports.generateAction);
    program
        .command('genprompt')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .option('-t, --target <name>', 'name of the target generative AI system that will receive the prompt')
        .description('Generate the textual prompt stored in a given file')
        .action(exports.generatePromptAction);
    program
        .command('parseAndValidate')
        .argument('<file>', `Source file to parse & validate (ending in ${fileExtensions})`)
        .description('Indicates where a program parses & validates successfully, but produces no output code')
        .action(exports.parseAndValidate);
    program.parse(process.argv);
}
exports.default = default_1;
//# sourceMappingURL=index.js.map