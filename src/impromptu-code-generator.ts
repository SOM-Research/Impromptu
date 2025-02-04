import { AstNode, LangiumParser, LangiumSharedServices} from 'langium';
import { createImpromptuServices, ImpromptuServices } from './language-server/impromptu-module.js';
import { Model, isModel, Prompt, isPrompt } from './language-server/generated/ast.js';
import { NodeFileSystem } from 'langium/node';

// To retrieve the template files
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext } from 'vscode';
import { generatePromptCode, AISystem, getPromptsList, generatePromptTraitValidators } from './cli/gen/generate-prompt.js';

import { extractAstNode } from './cli/cli-util.js';

export interface Generator {
    // Load the Abstract Syntax Tree of the .prm active file
    generateCode(model : string | AstNode, aiSystem : string, prompt: string, context: ExtensionContext) : Promise<string | undefined>;
    // Receives the parsed AST, generates the Python code, and returns it
    model2Code(model : Model, provider: string, template: string, prompt: string, context: ExtensionContext) : string | undefined;
}
 
/**
* Python code generator service main class
*/
export class CodeGenerator implements Generator {
    
    private readonly parser: LangiumParser;
    private readonly services: {
        shared: LangiumSharedServices;
        Impromptu: ImpromptuServices;
    }

    templates = new Map();
    private readonly GENERIC_PROMPT_SERVICE = 'GENERIC_PROMPT_SERVICE';

    constructor(context: ExtensionContext) {       
        const services = createImpromptuServices(NodeFileSystem);
        this.services = services // Services of the languages (including Impromptu)
        this.parser = services.Impromptu.parser.LangiumParser;// CHECK HERE. MAybe only load one file
        // preload Python templates for invoking OpenAI and Stable Diffusion into a dictionary
        var fullFilePath = context.asAbsolutePath(path.join('resources', 'openai-chatgpt-template.py'));
        var template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(AISystem.ChatGPT, template); // Add ChatGPT template
        fullFilePath = context.asAbsolutePath(path.join('resources', 'stable-diffusion-template.py'));
        template = fs.readFileSync(fullFilePath, "utf8");
        this.templates.set(AISystem.StableDiffusion, template);
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
    getPromptsList(model: string) {
        const astNode = this.parser.parse(model).value;
        return (isModel(astNode) ? getPromptsList(astNode) : undefined);
    }

    /**
     * Get the python prompt that generates the code of a certain asset (located in a certain file) for a certain AI system
     * @param modelName Name of the model's file
     * @param aiSystem Name of the AI system (i.e "midjourney")
     * @param promptName Name of the prompt
     * @returns 
     */
    async generateCode(modelName: string, aiSystem: string, promptName: string) : Promise<string | undefined> {
        const services = this.services; // Use the service to extract the AST of the wanted file
        const model = await extractAstNode<Model>(modelName, services.Impromptu);
        // Needs to import the Ast of the imported files as well
        const template = this.templates.get(this.GENERIC_PROMPT_SERVICE) + this.templates.get(aiSystem);
        return (isModel(model) ? this.model2Code(model, aiSystem, template, promptName) : undefined);
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
    model2Code(model: Model, aiSystem: string, template: string, promptName: string) : string | undefined {
        const prompt = this.getPrompt(model, promptName); // Get the prompts of the file
        
        if (prompt) {
            const media = this.getPromptOutputMedia(prompt) // Obtain the media of the answer
        
            const promptCode = generatePromptCode(model, aiSystem, prompt)?.toString(); // Generate the prompt
            if (promptCode) {
                const validators = generatePromptTraitValidators(model, prompt);
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
    getPrompt(model: Model, promptName: string): Prompt | undefined {
        return model.assets.filter(a => isPrompt(a)).filter(a => a.name == promptName)[0] as Prompt;
    }

    /**
     * Get the format output of the prompt
     * @param prompt 
     * @returns 
     */
    getPromptOutputMedia(prompt: Prompt): string {
        return (prompt.output) ? prompt.output : 'text';
    }
}
 

