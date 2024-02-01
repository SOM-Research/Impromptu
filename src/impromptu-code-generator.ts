import { AstNode, LangiumParser} from 'langium';
import { createImpromptuServices } from './language-server/impromptu-module.js';
import { Model, isModel } from './language-server/generated/ast.js';
import { NodeFileSystem } from 'langium/node';

// To retrieve the template files
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext } from 'vscode';
import { generatePromptCode } from './cli/generate-prompt';

export interface Generator {
    // Load the Abstract Syntax Tree of the .prm active file
    generateChatGPT(model : string | AstNode, context: ExtensionContext) : string | undefined;
    // Receives the parsed AST, generates the Python code, and returns it
    model2Code(model : Model, context: ExtensionContext) : string | undefined;
}
 
/**
* ChatGPT Python code generator service main class
*/
export class CodeGenerator implements Generator {

    private readonly parser: LangiumParser;
    private template = "NONE generated";

    constructor(context: ExtensionContext) {       
        const services = createImpromptuServices(NodeFileSystem);
        this.parser = services.Impromptu.parser.LangiumParser;

        let fullFilePath = context.asAbsolutePath(path.join('resources', 'openai-chatgpt-template.py'));
        this.template = fs.readFileSync(fullFilePath, "utf8");
    }

    generateChatGPT(model : string) : string | undefined { // | AstNode) : string | undefined {
        //const astNode = (typeof(Model) == 'string' ? this.parser.parse(Model).value : Model);
        //return (isModel(astNode) ? this.model2Html(astNode) : undefined);
        const astNode = this.parser.parse(model).value;
        return (isModel(astNode) ? this.model2Code(astNode) : undefined);
    }

    // Generation of the output code string
    model2Code(model : Model) : string | undefined {
        const promptCode = generatePromptCode(model, 'chatgpt');
        if (promptCode != null) {
            return this.template.replace('{PROMPT}', promptCode.toString());
        }
        else
            return 'ERROR: Cannot generate prompt code.';
    }
}
 