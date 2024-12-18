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
exports.version = exports.parseAndValidate = exports.removeAI = exports.addAI = exports.generateAll = exports.testing = exports.generatePromptAction = exports.generateAction = void 0;
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const module_1 = require("../language-server/generated/module");
const impromptu_module_1 = require("../language-server/impromptu-module");
const cli_util_1 = require("./cli-util");
const generator_1 = require("./generator");
const generate_prompt_1 = require("./gen/generate-prompt");
const node_1 = require("langium/node");
const node_fs_1 = require("node:fs");
const files_management_1 = require("./files_management");
const gen_folder = 'src/cli/gen'; // TODO: Check where is used
const generateAction = (fileName, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    const model = yield (0, cli_util_1.extractAstNode)(fileName, services);
    const generatedFilePath = (0, generator_1.generateJavaScript)(model, fileName, opts.destination);
    console.log(chalk_1.default.green(`JavaScript code generated successfully: ${generatedFilePath}`));
});
exports.generateAction = generateAction;
const generatePromptAction = (fileName, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    try {
        const model = yield (0, cli_util_1.extractAstNode)(fileName, services);
        var validPrompt = true;
        if (opts.prompt) {
            // In case a certain prompt is sent, we have to check that the prompt exists
            validPrompt = false;
            if (model.assets.find(element => element.name == opts.prompt)) {
                validPrompt = true;
            }
        }
        if (validPrompt) {
            try {
                const generatedFilePath = (0, generate_prompt_1.generatePrompt)(model, `${fileName}`, opts.destination, opts.target, opts.variables, opts.prompt);
                console.log(chalk_1.default.green(`Prompt generated successfully: ${generatedFilePath}`));
            }
            catch (e) { }
        }
        else {
            console.log(chalk_1.default.red(`Incorrect command. Prompt ${opts.prompt} does not exist in that document.`));
            throw new Error(`Incorrect command. Prompt ${opts.prompt} does not exist in that document.`);
        }
    }
    catch (e) {
    }
});
exports.generatePromptAction = generatePromptAction;
/**
 *  Promise of the testing command
 */
const testing = () => __awaiter(void 0, void 0, void 0, function* () {
    //const services = createImpromptuServices(NodeFileSystem).Impromptu;
    //const dir= 'examples/test/'
    //const testList= ['exampleChatGPT.prm','exampleHeritage.prm','output-validators.prm','testMissingPrompt.prm']
    //var testFile=dir+testList[0] // Example of Heritage. Check that NewMain runs Draw() beacuse it runs Mixture
    //const model = await extractAstNode<Model>(fileName, services);
});
exports.testing = testing;
/**
 * Generate the files from all the .prm files of a folder
 * @param fileName
 * @param opts
 */
const generateAll = (fileName, opts) => __awaiter(void 0, void 0, void 0, function* () {
    (0, node_fs_1.readdirSync)(fileName).forEach(file => {
        if (/[^].prm/.test(file)) {
            (0, exports.generatePromptAction)(fileName + '/' + file, opts);
        }
    });
});
exports.generateAll = generateAll;
/**
 * Add an additional AI System and create a document to customize its generated prompts
 * @param llm : LLM to add
 * @param opts:
 *      @param alias Name used in the file and files' fuctions i.e. `genPrompt_<alias>`
 *      @param promptName Name used in the CLI to refereing the LLM. If it is not given is `llm` in lower case
 */
const addAI = (llm, opts) => __awaiter(void 0, void 0, void 0, function* () {
    let fileAlias;
    if (opts.alias) {
        fileAlias = opts.alias;
    }
    else {
        fileAlias = `${llm}`;
    }
    const file = `generate-prompt_${fileAlias}.ts`;
    let command;
    if (!opts.promptName) {
        command = llm.toLowerCase();
    }
    else {
        command = opts.promptName;
    }
    try {
        (0, files_management_1.addLLM)(llm, file, fileAlias, command);
    }
    catch (e) { }
});
exports.addAI = addAI;
/**
 * Remove the file and the code in `generate-prompt.ts` that specify Impromptu the behavior for a certain LLM
 * @param llm LLM to delete
 */
const removeAI = (llm) => __awaiter(void 0, void 0, void 0, function* () {
    const generate_prompt = (0, node_fs_1.readFileSync)(`${gen_folder}/generate-prompt.ts`);
    let content = generate_prompt.toString();
    (0, files_management_1.removeLLM)(llm, content);
});
exports.removeAI = removeAI;
const parseAndValidate = (alias) => __awaiter(void 0, void 0, void 0, function* () {
    // retrieve the services for our language
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    // extract a document for our program
    const document = yield (0, cli_util_1.extractDocument)(alias, services);
    // extract the parse result details
    const parseResult = document.parseResult;
    // verify no lexer, parser, or general diagnostic errors show up
    if (parseResult.lexerErrors.length === 0 &&
        parseResult.parserErrors.length === 0) {
        console.log(chalk_1.default.green(`Parsed and validated ${alias} successfully!`));
    }
    else {
        console.log(chalk_1.default.red(`Failed to parse and validate ${alias}!`));
    }
});
exports.parseAndValidate = parseAndValidate;
/**
 * Tell the Impromptu's version used
 */
const version = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(process.env.npm_package_version);
});
exports.version = version;
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
        .option('-p, --prompt <prompt>', 'Prompt where the varaibles are used')
        .option('-v, --variables <var...>', 'arguments transmitted to the prompt')
        .option('-t, --target <name>', 'name of the target generative AI system that will receive the prompt')
        .description('Generate the textual prompt stored in a given file')
        .action(exports.generatePromptAction);
    program
        .command('parseAndValidate')
        .argument('<file>', `Source file to parse & validate (ending in ${fileExtensions})`)
        .description('Indicates where a program parses & validates successfully, but produces no output code')
        .action(exports.parseAndValidate);
    program
        .command('version')
        .action(exports.version);
    program
        .command('addAI')
        .argument('<LLM>', `Name used in for refering to the LLM`)
        .option('-f, --alias <alias>', 'Name of the file where the function will be located.')
        .option('-pn, --promptName <promptName>', 'Name of the file where declared in the CLI.')
        .description('Add a new AI System so it can be customize.')
        .action(exports.addAI);
    program
        .command('removeAI')
        .argument('<LLM>', `Name used in for refering to the LLM`)
        .description('Remove an AI System so it can be customize.')
        .action(exports.removeAI);
    program
        .command('genpromptAll')
        .argument('<file>', `source directory (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .option('-t, --target <name>', 'name of the target generative AI system that will receive the prompt')
        .description('Generate the textual prompt stored in a given file')
        .action(exports.generateAll);
    program.parse(process.argv);
}
exports.default = default_1;
//# sourceMappingURL=index.js.map