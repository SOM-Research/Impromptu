import { AstNode, LangiumDocument, LangiumParser, LangiumServices, LangiumSharedServices} from 'langium';
import { createImpromptuServices, ImpromptuServices } from './language-server/impromptu-module.js';
import { Model, isModel, Prompt, isPrompt, Asset, ImportedAsset, AssetImport } from './language-server/generated/ast.js';
import { NodeFileSystem } from 'langium/node';

// To retrieve the template files
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext } from 'vscode';
import { generatePromptCode, AISystem, getPromptsList, generatePromptTraitValidators } from './cli/gen/generate-prompt.js';
import { URI } from 'vscode-uri';
import globby from 'globby';
import { join } from 'path';

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
        const model = await extractAstNodeVSCode<Model>(modelName, services.Impromptu);
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
 

/**
 * Build the Langium Document that allows to analyze the `.prm` file
 * @param fileName uri of the file, relative to the folder `build_files`
 * @param services LangiumService
 * @param calls_buffer Auxiliar variable with the Assets "visited"
 * @returns 
 */
export async function extractAstNodeVSCode<T extends AstNode>(fileName: string, services: LangiumServices, calls_buffer?:AssetImport[]): Promise<T> {
    let libraries:string[]=[]
    let import_names: string[]=[]

    if (calls_buffer==undefined)  calls_buffer=[];
    let new_calls:AssetImport[]=[]

    if (calls_buffer){
        const model = (await extractDocumentVSCode(fileName, services)).parseResult?.value as T;
        
        if (isModel(model)){
            // get all the imports of the file
            model.imports.forEach( import_line => {
                import_line.set_assets.forEach( asset =>{
                    // Checks that it is imported from a different file
                    if(! calls_buffer?.find(element => (element.$container as ImportedAsset).library==(asset.$container as ImportedAsset).library)){
                        libraries.push((asset.$container as ImportedAsset).library);
                        if (asset.name){
                            import_names.push(asset.name);
                        }
                        new_calls.push(asset);
                    }
                })   
            })
            
            

            var exists_errors=false; //Mark there are errors or not
            for (let i=0; i < new_calls.length; i++){
                try{
                    if (!calls_buffer.find(element=> libraries[i]==(element.$container as ImportedAsset).library && import_names[i]==element.name )) {
                        // Update the elements that have been called
                        calls_buffer.push(new_calls[i]);
                        
                        const import_model = await extractAstNodeVSCode<Model>(libraries[i].split(".").join("/")+".prm", services,calls_buffer);
                        let imported_assets: Asset[]=[];
                        import_model.assets.forEach(asset =>{
                            //filter to only get the wanted functions
                            if(import_names.find(element => element==asset.name)){
                                imported_assets.push(asset);
                            }
                        });
                        model.assets=model.assets.concat(imported_assets);
                    }else{
                    }
                }
                catch (e){
                    /*
                    let line = get_line_node(new_calls[i]);
                    console.error(chalk.red(`[${fileName}: ${line}] Error in the imported file "${(new_calls[i].$container as ImportedAsset).library}.prm".`));
                    console.error(chalk.red("----------------------------------------------------------------------------"))
                    exists_errors = true*/
                }
            }
            if(exists_errors) throw new Error();
            return model
        } return (await extractDocumentVSCode(fileName, services)).parseResult?.value as T;
    }
    else{
        return (await extractDocumentVSCode(fileName, services)).parseResult?.value as T;
    }
}

async function extractDocumentVSCode(fileName: string, services: LangiumServices): Promise<LangiumDocument> {
    
    let documents:LangiumDocument<AstNode>[] = []
    const document = await services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(fileName))); 
    
    let workspace_path = process.env.WORKSPACE //Requiered since we are in VSCODE LOCAL
    if (!workspace_path){
        workspace_path= process.cwd()
    }
    const files_dir = join(workspace_path,'build_files').split('\\').join('/')
    
    const files = await globby(`${files_dir}/**/*.prm`);   // Get all .prm files
    files.forEach(file => 
        documents.push(services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(file))))
    )
    await services.shared.workspace.DocumentBuilder.build(documents, { validationChecks: 'all' }); // Build the document. We need to pass all the .prm files to check for importation errors

        
    const validationErrors =(document.diagnostics ?? []).filter(e => e.severity === 1);
    
    if (validationErrors.length > 0) {
        console.error(`There are validation errors in ${fileName}:`);
        var errors = []
        for (const validationError of validationErrors) {
            errors.push(`[${fileName}: ${validationError.range.start.line + 1}] Error : ${validationError.message} [${document.textDocument.getText(validationError.range)}]`);
            console.error(
                errors.at(-1)
            );
        }
        console.error("----------------------------------------------------------------------------")
        throw new Error(errors.join("\n"));
    }

    return document;
}