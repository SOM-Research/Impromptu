"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.version = exports.parseAndValidate = exports.removeAI = exports.addAI = exports.generateAll = exports.generatePromptAction = void 0;
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const module_1 = require("../language-server/generated/module");
const impromptu_module_1 = require("../language-server/impromptu-module");
const cli_util_1 = require("./cli-util");
const generate_prompt_1 = require("./gen/generate-prompt");
const node_1 = require("langium/node");
const node_fs_1 = require("node:fs");
const files_management_1 = require("./files_management");
const readline = __importStar(require("readline"));
const path_1 = __importDefault(require("path"));
/**
 * Generate a prompt form the file transmitted
 * @param fileName relative path of the `.prm` (string)
 * @param opts :
 *      @param destination Name used in the file and files' fuctions i.e. `genPrompt_<alias>`
 *      @param target LLM where the prompt will be used
 *      @param prompt If sent, the prompt it will be generated. If not sent, prompts of all assets in the file are generated instead.
 *      @param variables values give to prompt's inputs
 */
const generatePromptAction = (fileName, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    try {
        const model = yield (0, cli_util_1.extractAstNode)(path_1.default.resolve('build_files/' + fileName), services);
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
 * Generate the files from all the .prm files of a folder
 * @param folderName relative path to the folder
 * @param opts
 */
const generateAll = (folderName, opts) => __awaiter(void 0, void 0, void 0, function* () {
    (0, node_fs_1.readdirSync)(folderName).forEach(file => {
        if (/[^].prm/.test(file)) {
            (0, exports.generatePromptAction)(folderName + '/' + file, opts);
        }
    });
});
exports.generateAll = generateAll;
/**
 * Add an additional AI System and create a document to customize its generated prompts
 * @param llm : LLM to add
 * @param opts:
 *      @param promptName Name used in the CLI to refereing the LLM. If it is not given is `llm` in lower case.
 *      @param alias Name used in the file and files' fuctions i.e. `genPrompt_<alias>`. OPTIONAL
 *      @param command Name used in the CLI. OPTIONAL
 */
const addAI = (llm, opts) => __awaiter(void 0, void 0, void 0, function* () {
    let fileAlias;
    // If no alias was transmitted, the alias of the LLM will be the name
    if (opts) {
        if (opts.alias) {
            fileAlias = opts.alias;
        }
        else {
            fileAlias = `${llm}`;
        }
    }
    else {
        fileAlias = `${llm}`;
    }
    // If no command was transmitted, the command of the LLM will be the name, but in lower case
    let command;
    if (opts) {
        if (!opts.promptName) {
            command = llm.toLowerCase();
        }
        else {
            command = opts.promptName;
        }
    }
    else {
        command = `${llm}`;
    }
    try {
        (0, files_management_1.addLLM)(llm, fileAlias, command);
    }
    catch (e) { }
});
exports.addAI = addAI;
/**
 * Remove the file and the code in `generate-prompt.ts` that specify Impromptu the behavior for a certain LLM
 * @param llm LLM to delete
 */
const removeAI = (llm) => __awaiter(void 0, void 0, void 0, function* () {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const llm_alias = (0, files_management_1.getAI_Alias)(llm);
    // Confirmation that the LLM is wanted to be deleted
    if (llm_alias != undefined) {
        rl.question(`Are you sure you want to delete content related to the LLM "${llm}"? [y/n] `, (answer) => {
            switch (answer.toLowerCase()) {
                case 'y':
                    (0, files_management_1.removeLLM)(llm);
                    break;
                case 'n':
                    console.log('Deletion stopped');
                    break;
                default:
                    console.log('Deletion stopped');
            }
            rl.close();
        });
    }
    else {
        console.log(chalk_1.default.blue(`It does not exist any AI system is saved by the name of "${llm}".`));
        rl.close();
    }
});
exports.removeAI = removeAI;
const parseAndValidate = (alias) => __awaiter(void 0, void 0, void 0, function* () {
    // retrieve the services for our language
    const services = (0, impromptu_module_1.createImpromptuServices)(node_1.NodeFileSystem).Impromptu;
    // extract a document for our program
    const document = yield (0, cli_util_1.extractDocument)(path_1.default.resolve('build_files/' + alias), services);
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
    /*
    program
        .command('generate')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .description('generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file')
        .action(generateAction);
    */
    program
        .command('genprompt')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'directory where the generated file is created')
        .option('-p, --prompt <prompt>', 'Prompt where the varaibles are used')
        .option('-v, --variables <var...>', 'arguments transmitted to the prompt')
        .option('-t, --target <name>', 'name of the target generative AI system that will receive the prompt')
        .description('Generate the textual prompt stored in a given .prm file.')
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