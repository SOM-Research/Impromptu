import { AstNode, LangiumParser} from 'langium';
import { createImpromptuServices } from './language-server/impromptu-module.js';
import { Model, isModel, Prompt, isPrompt } from './language-server/generated/ast.js';
import { NodeFileSystem } from 'langium/node';

// To retrieve the template files
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext } from 'vscode';
import { generatePromptCode, AISystem, getPromptsList, generatePromptValidators } from './cli/generate-prompt';

export interface Generator {
    // Load the Abstract Syntax Tree of the .prm active file
    generateCode(model : string | AstNode, aiSystem : string, prompt: string, context: ExtensionContext) : string | undefined;
    // Receives the parsed AST, generates the Python code, and returns it
    model2Code(model : Model, provider: string, template: string, prompt: string, context: ExtensionContext) : string | undefined;
}
 
/**
* Python code generator service main class
*/
export class CodeGenerator implements Generator {

    private readonly parser: LangiumParser;

    templates = new Map();
    private readonly GENERIC_PROMPT_SERVICE = 'GENERIC_PROMPT_SERVICE';

    constructor(context: ExtensionContext) {       
        const services = createImpromptuServices(NodeFileSystem);
        this.parser = services.Impromptu.parser.LangiumParser;

        // preload Python templates for invoking OpenAI and Stable Diffusion into a dictionary
        var fullFilePath = context.asAbsolutePath(path.join('resources', 'openai-chatgpt-template.py'));
        var template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(AISystem.ChatGPT, template);
        fullFilePath = context.asAbsolutePath(path.join('resources', 'stable-diffusion-template.py'));
        template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(AISystem.StableDiffusion, template);
        fullFilePath = context.asAbsolutePath(path.join('resources', 'prompt-service-template.py'));
        template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(this.GENERIC_PROMPT_SERVICE, template);
    }

    // For selecting a single prompt to generate the code from,
    // from the set of prompts included in the *.prm file
    getPromptsList(model: string) {
        const astNode = this.parser.parse(model).value;
        return (isModel(astNode) ? getPromptsList(astNode) : undefined);
    }

    generateCode(modelName: string, aiSystem: string, promptName: string) : string | undefined {
        const model = this.parser.parse(modelName).value;
        const template = this.templates.get(this.GENERIC_PROMPT_SERVICE) + this.templates.get(aiSystem);
        return (isModel(model) ? this.model2Code(model, aiSystem, template, promptName) : undefined);
    }

    // Generation of the output code string
    model2Code(model : Model, aiSystem: string, template: string, promptName: string) : string | undefined {
        const prompt = this.getPrompt(model, promptName);
        if (prompt) {
            const promptCode = generatePromptCode(model, aiSystem, prompt)?.toString();
            if (promptCode) {
                const validators = generatePromptValidators(model, prompt);
                return template.replace('{PROMPT}', promptCode).replace('{VALIDATORS}', JSON.stringify(validators));
            }
        }
        return 'ERROR: Cannot generate prompt code.';
    }

    getPrompt(model: Model, promptName: string): Prompt | undefined {
        return model.assets.filter(a => isPrompt(a)).filter(a => a.name == promptName)[0] as Prompt;
    }
}
 