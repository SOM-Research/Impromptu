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
exports.extractAstNodeVSCode = exports.CodeGenerator = void 0;
const impromptu_module_js_1 = require("./language-server/impromptu-module.js");
const ast_js_1 = require("./language-server/generated/ast.js");
const node_1 = require("langium/node");
// To retrieve the template files
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const generate_prompt_js_1 = require("./cli/gen/generate-prompt.js");
const vscode_uri_1 = require("vscode-uri");
const globby_1 = __importDefault(require("globby"));
const path_1 = require("path");
/**
* Python code generator service main class
*/
class CodeGenerator {
    constructor(context) {
        this.templates = new Map();
        this.GENERIC_PROMPT_SERVICE = 'GENERIC_PROMPT_SERVICE';
        const services = (0, impromptu_module_js_1.createImpromptuServices)(node_1.NodeFileSystem);
        this.services = services; // Services of the languages (including Impromptu)
        this.parser = services.Impromptu.parser.LangiumParser; // CHECK HERE. MAybe only load one file
        // preload Python templates for invoking OpenAI and Stable Diffusion into a dictionary
        var fullFilePath = context.asAbsolutePath(path.join('resources', 'openai-chatgpt-template.py'));
        var template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(generate_prompt_js_1.AISystem.ChatGPT, template); // Add ChatGPT template
        fullFilePath = context.asAbsolutePath(path.join('resources', 'stable-diffusion-template.py'));
        template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(generate_prompt_js_1.AISystem.StableDiffusion, template);
        fullFilePath = context.asAbsolutePath(path.join('resources', 'prompt-service-template.py'));
        template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(this.GENERIC_PROMPT_SERVICE, template);
    }
    /** For selecting a single prompt to generate the code from,
     *  from the set of prompts included in the *.prm file
     *
     * @param model
     * @returns
     */
    getPromptsList(model) {
        const astNode = this.parser.parse(model).value;
        return ((0, ast_js_1.isModel)(astNode) ? (0, generate_prompt_js_1.getPromptsList)(astNode) : undefined);
    }
    /**
     * Get the python prompt that generates the code of a certain asset (located in a certain file) for a certain AI system
     * @param modelName Name of the model's file
     * @param aiSystem Name of the AI system (i.e "midjourney")
     * @param promptName Name of the prompt
     * @returns
     */
    generateCode(modelName, aiSystem, promptName) {
        return __awaiter(this, void 0, void 0, function* () {
            const services = this.services; // Use the service to extract the AST of the wanted file
            const model = yield extractAstNodeVSCode(modelName, services.Impromptu);
            // Needs to import the Ast of the imported files as well
            const template = this.templates.get(this.GENERIC_PROMPT_SERVICE) + this.templates.get(aiSystem);
            return ((0, ast_js_1.isModel)(model) ? this.model2Code(model, aiSystem, template, promptName) : undefined);
        });
    }
    /**
     *  Generation of the output code string
     *
     * @param model Model AST node of the file
     * @param aiSystem GenAI where the prompt will be used
     * @param template service of the chosen AI system
     * @param promptName Asset from the file that it will be generated
     * @returns template modified
     */
    model2Code(model, aiSystem, template, promptName) {
        var _a;
        const prompt = this.getPrompt(model, promptName);
        // Add gnerateAstNode (?)
        if (prompt) {
            const media = this.getPromptOutputMedia(prompt);
            const promptCode = (_a = (0, generate_prompt_js_1.generatePromptCode)(model, aiSystem, prompt)) === null || _a === void 0 ? void 0 : _a.toString();
            if (promptCode) {
                const validators = (0, generate_prompt_js_1.generatePromptTraitValidators)(model, prompt);
                return template
                    .replace('{PROMPT}', promptCode)
                    .replace('{VALIDATORS}', JSON.stringify(validators))
                    .replace('{MEDIA}', media);
            }
        }
        return 'ERROR: Cannot generate prompt code.';
    }
    /**
     * Get the prompt object with a certain name in the model. In case is not a prompt, it does not return nothing
     * @param model
     * @param promptName prompt name
     * @returns
     */
    getPrompt(model, promptName) {
        return model.assets.filter(a => (0, ast_js_1.isPrompt)(a)).filter(a => a.name == promptName)[0];
    }
    /**
     * Get the format output of the prompt
     * @param prompt
     * @returns
     */
    getPromptOutputMedia(prompt) {
        return (prompt.output) ? prompt.output : 'text';
    }
}
exports.CodeGenerator = CodeGenerator;
/**
 * Build the Langium Document that allows to analyze the `.prm` file
 * @param fileName uri of the file, relative to the folder `build_files`
 * @param services LangiumService
 * @param calls_buffer Auxiliar variable with the Assets "visited"
 * @returns
 */
function extractAstNodeVSCode(fileName, services, calls_buffer) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        let libraries = [];
        let import_names = [];
        if (calls_buffer == undefined)
            calls_buffer = [];
        let new_calls = [];
        if (calls_buffer) {
            const model = (_a = (yield extractDocumentVSCode(fileName, services)).parseResult) === null || _a === void 0 ? void 0 : _a.value;
            if ((0, ast_js_1.isModel)(model)) {
                // get all the imports of the file
                model.imports.forEach(import_line => {
                    import_line.set_assets.forEach(asset => {
                        // Checks that it is imported from a different file
                        if (!(calls_buffer === null || calls_buffer === void 0 ? void 0 : calls_buffer.find(element => element.$container.library == asset.$container.library))) {
                            libraries.push(asset.$container.library);
                            if (asset.name) {
                                import_names.push(asset.name);
                            }
                            new_calls.push(asset);
                        }
                    });
                });
                var exists_errors = false; //Mark there are errors or not
                for (let i = 0; i < new_calls.length; i++) {
                    try {
                        if (!calls_buffer.find(element => libraries[i] == element.$container.library && import_names[i] == element.name)) {
                            // Update the elements that have been called
                            calls_buffer.push(new_calls[i]);
                            const import_model = yield extractAstNodeVSCode(libraries[i].split(".").join("/") + ".prm", services, calls_buffer);
                            let imported_assets = [];
                            import_model.assets.forEach(asset => {
                                //filter to only get the wanted functions
                                if (import_names.find(element => element == asset.name)) {
                                    imported_assets.push(asset);
                                }
                            });
                            model.assets = model.assets.concat(imported_assets);
                        }
                        else {
                        }
                    }
                    catch (e) {
                        /*
                        let line = get_line_node(new_calls[i]);
                        console.error(chalk.red(`[${fileName}: ${line}] Error in the imported file "${(new_calls[i].$container as ImportedAsset).library}.prm".`));
                        console.error(chalk.red("----------------------------------------------------------------------------"))
                        exists_errors = true*/
                    }
                }
                if (exists_errors)
                    throw new Error();
                return model;
            }
            return (_b = (yield extractDocumentVSCode(fileName, services)).parseResult) === null || _b === void 0 ? void 0 : _b.value;
        }
        else {
            return (_c = (yield extractDocumentVSCode(fileName, services)).parseResult) === null || _c === void 0 ? void 0 : _c.value;
        }
    });
}
exports.extractAstNodeVSCode = extractAstNodeVSCode;
function extractDocumentVSCode(fileName, services) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let documents = [];
        const document = yield services.shared.workspace.LangiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path.resolve(fileName)));
        let workspace_path = process.env.WORKSPACE; //Requiered since we are in VSCODE LOCAL
        if (!workspace_path) {
            workspace_path = process.cwd();
        }
        const files_dir = (0, path_1.join)(workspace_path, 'build_files').split('\\').join('/');
        const files = yield (0, globby_1.default)(`${files_dir}/**/*.prm`); // Get all .prm files
        files.forEach(file => documents.push(services.shared.workspace.LangiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path.resolve(file)))));
        yield services.shared.workspace.DocumentBuilder.build(documents, { validationChecks: 'all' }); // Build the document. We need to pass all the .prm files to check for importation errors
        const validationErrors = ((_a = document.diagnostics) !== null && _a !== void 0 ? _a : []).filter(e => e.severity === 1);
        if (validationErrors.length > 0) {
            console.error(`There are validation errors in ${fileName}:`);
            var errors = [];
            for (const validationError of validationErrors) {
                errors.push(`[${fileName}: ${validationError.range.start.line + 1}] Error : ${validationError.message} [${document.textDocument.getText(validationError.range)}]`);
                console.error(errors.at(-1));
            }
            console.error("----------------------------------------------------------------------------");
            throw new Error(errors.join("\n"));
        }
        return document;
    });
}
//# sourceMappingURL=impromptu-code-generator.js.map