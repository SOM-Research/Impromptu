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
/**
* Python code generator service main class
*/
class CodeGenerator {
    constructor(context) {
        this.templates = new Map();
        this.GENERIC_PROMPT_SERVICE = 'GENERIC_PROMPT_SERVICE';
        const services = (0, impromptu_module_js_1.createImpromptuServices)(node_1.NodeFileSystem);
        this.parser = services.Impromptu.parser.LangiumParser;
        // preload Python templates for invoking OpenAI and Stable Diffusion into a dictionary
        var fullFilePath = context.asAbsolutePath(path.join('resources', 'openai-chatgpt-template.py'));
        var template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(generate_prompt_1.AISystem.ChatGPT, template);
        fullFilePath = context.asAbsolutePath(path.join('resources', 'stable-diffusion-template.py'));
        template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(generate_prompt_1.AISystem.StableDiffusion, template);
        fullFilePath = context.asAbsolutePath(path.join('resources', 'prompt-service-template.py'));
        template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(this.GENERIC_PROMPT_SERVICE, template);
    }
    // For selecting a single prompt to generate the code from,
    // from the set of prompts included in the *.prm file
    getPromptsList(model) {
        const astNode = this.parser.parse(model).value;
        return ((0, ast_js_1.isModel)(astNode) ? (0, generate_prompt_1.getPromptsList)(astNode) : undefined);
    }
    generateCode(modelName, aiSystem, promptName) {
        const model = this.parser.parse(modelName).value;
        const template = this.templates.get(this.GENERIC_PROMPT_SERVICE) + this.templates.get(aiSystem);
        return ((0, ast_js_1.isModel)(model) ? this.model2Code(model, aiSystem, template, promptName) : undefined);
    }
    // Generation of the output code string
    model2Code(model, aiSystem, template, promptName) {
        var _a;
        const prompt = this.getPrompt(model, promptName);
        if (prompt) {
            const media = this.getPromptOutputMedia(prompt);
            const promptCode = (_a = (0, generate_prompt_1.generatePromptCode)(model, aiSystem, prompt)) === null || _a === void 0 ? void 0 : _a.toString();
            if (promptCode) {
                const validators = (0, generate_prompt_1.generatePromptValidators)(model, prompt);
                return template
                    .replace('{PROMPT}', promptCode)
                    .replace('{VALIDATORS}', JSON.stringify(validators))
                    .replace('{MEDIA}', media);
            }
        }
        return 'ERROR: Cannot generate prompt code.';
    }
    getPrompt(model, promptName) {
        return model.assets.filter(a => (0, ast_js_1.isPrompt)(a)).filter(a => a.name == promptName)[0];
    }
    getPromptOutputMedia(prompt) {
        return (prompt.output) ? prompt.output : 'text';
    }
}
exports.CodeGenerator = CodeGenerator;
//# sourceMappingURL=impromptu-code-generator.js.map