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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerator = void 0;
const impromptu_module_js_1 = require("./language-server/impromptu-module.js");
const ast_js_1 = require("./language-server/generated/ast.js");
const node_1 = require("langium/node");
// To retrieve the template files
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const generate_prompt_1 = require("./cli/generate-prompt");
let Templates = new Map();
/**
* Python code generator service main class
*/
class CodeGenerator {
    constructor(context) {
        const services = (0, impromptu_module_js_1.createImpromptuServices)(node_1.NodeFileSystem);
        this.parser = services.Impromptu.parser.LangiumParser;
        var fullFilePath = context.asAbsolutePath(path.join('resources', 'openai-chatgpt-template.py'));
        var template = fs.readFileSync(fullFilePath, "utf8");
        Templates.set(generate_prompt_1.AISystem.ChatGPT, template);
        fullFilePath = context.asAbsolutePath(path.join('resources', 'stable-diffusion-template.py'));
        template = fs.readFileSync(fullFilePath, "utf8");
        Templates.set(generate_prompt_1.AISystem.StableDiffusion, template);
    }
    getPromptsList(model) {
        const astNode = this.parser.parse(model).value;
        return ((0, ast_js_1.isModel)(astNode) ? (0, generate_prompt_1.getPromptsList)(astNode) : undefined);
    }
    generateCode(model, aiSystem, prompt) {
        const astNode = this.parser.parse(model).value;
        var template = Templates.get(aiSystem);
        return ((0, ast_js_1.isModel)(astNode) ? this.model2Code(astNode, aiSystem, template, prompt) : undefined);
    }
    // Generation of the output code string
    model2Code(model, aiSystem, template, prompt) {
        // TODO: should return a complex structure for: negative prompts, hyper parameters, and validation
        const promptCode = (0, generate_prompt_1.generatePromptCode)(model, aiSystem, prompt);
        if (promptCode != null) {
            return template.replace('{PROMPT}', promptCode.filter(e => e !== '\n').filter(function (e) { return e; }).toString());
        }
        else
            return 'ERROR: Cannot generate prompt code.';
    }
}
exports.CodeGenerator = CodeGenerator;
//# sourceMappingURL=impromptu-code-generator.js.map