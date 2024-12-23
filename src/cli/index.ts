import chalk from 'chalk';
import { Command } from 'commander';
import { Model } from '../language-server/generated/ast';
import { ImpromptuLanguageMetaData } from '../language-server/generated/module';
import { createImpromptuServices } from '../language-server/impromptu-module';
import { extractAstNode, extractDocument } from './cli-util';
import { generateJavaScript } from './generator';
import { generatePrompt } from './gen/generate-prompt';
import { NodeFileSystem } from 'langium/node';
import { readdirSync,  readFileSync} from 'node:fs';
import { addLLM, removeLLM } from './files_management';



const gen_folder='src/cli/gen'; // TODO: Check where is used

export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    const model = await extractAstNode<Model>(fileName, services);
    const generatedFilePath = generateJavaScript(model, fileName, opts.destination);
    console.log(chalk.green(`JavaScript code generated successfully: ${generatedFilePath}`));
};


export const generatePromptAction = async (fileName: string, opts: GenPromptOptions): Promise<void> => {
   
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    try{
        const model = await extractAstNode<Model>(fileName, services);
        
        var validPrompt= true;
        if(opts.prompt){
            // In case a certain prompt is sent, we have to check that the prompt exists
            validPrompt= false;
            if (model.assets.find(element => element.name == opts.prompt)){
                validPrompt= true;
            }
        }

        if(validPrompt){  
            try{
                const generatedFilePath = generatePrompt(model, `${fileName}`, opts.destination, opts.target, opts.variables, opts.prompt);
                console.log(chalk.green(`Prompt generated successfully: ${generatedFilePath}`));
            } 
            catch(e){}
            
        }
        else {
            console.log(chalk.red(`Incorrect command. Prompt ${opts.prompt} does not exist in that document.`))
            throw new Error(`Incorrect command. Prompt ${opts.prompt} does not exist in that document.`)
        }     
    }catch(e){
    }
    
};



/**
 *  Promise of the testing command 
 */
export const testing = async(): Promise<void> => {
    //const services = createImpromptuServices(NodeFileSystem).Impromptu;
    //const dir= 'examples/test/'
    //const testList= ['exampleChatGPT.prm','exampleHeritage.prm','output-validators.prm','testMissingPrompt.prm']


    //var testFile=dir+testList[0] // Example of Heritage. Check that NewMain runs Draw() beacuse it runs Mixture

    //const model = await extractAstNode<Model>(fileName, services);
};

/**
 * Generate the files from all the .prm files of a folder
 * @param fileName 
 * @param opts 
 */
export const generateAll = async(fileName: string, opts: GenPromptOptions):Promise<void> =>{
    
    readdirSync(fileName).forEach(file => {
        if (/[^].prm/.test(file)){
            generatePromptAction(fileName+'/'+file, opts)
        }
    });
};


export type GenAIOptions = {
    alias?: string;
    promptName?: string;
}

/**
 * Add an additional AI System and create a document to customize its generated prompts
 * @param llm : LLM to add
 * @param opts:
 *      @param alias Name used in the file and files' fuctions i.e. `genPrompt_<alias>`
 *      @param promptName Name used in the CLI to refereing the LLM. If it is not given is `llm` in lower case
 */
export const addAI = async(llm: string, opts:GenAIOptions):Promise<void> =>{
    let fileAlias:string
    console.log("asad")
    if (opts.alias){
        fileAlias = opts.alias;
    }else{
        fileAlias = `${llm}`;
    }
    const file= `generate-prompt_${fileAlias}.ts`

    let command:string
    if (!opts.promptName){
        command = llm.toLowerCase();
    }else{
        command = opts.promptName;
    }
    

    try{
        addLLM(llm,file,fileAlias,command)
    }catch(e){}
};

/**
 * Remove the file and the code in `generate-prompt.ts` that specify Impromptu the behavior for a certain LLM
 * @param llm LLM to delete
 */
export const removeAI = async (llm: string): Promise<void> => {
    const generate_prompt = readFileSync(`${gen_folder}/generate-prompt.ts`);
    let content = generate_prompt.toString();
    
    removeLLM(llm, content)
    
}




export type GenPromptOptions = {
    destination?: string;
    target?: string;
    variables?: string[];
    prompt?: string;
    
}

export const parseAndValidate = async (alias: string): Promise<void> => {
    // retrieve the services for our language
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    // extract a document for our program
    const document = await extractDocument(alias, services);
    // extract the parse result details
    const parseResult = document.parseResult;
    // verify no lexer, parser, or general diagnostic errors show up
    if (parseResult.lexerErrors.length === 0 && 
        parseResult.parserErrors.length === 0
    ) {
        console.log(chalk.green(`Parsed and validated ${alias} successfully!`));
    } else {
        console.log(chalk.red(`Failed to parse and validate ${alias}!`));
    }
};

/**
 * Tell the Impromptu's version used
 */

export const version = async (): Promise<void> => {
    console.log(process.env.npm_package_version)
}

export type GenerateOptions = {
    destination?: string;
}

export default function(): void {
    const program = new Command();

    program
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        .version(require('../../package.json').version);

    const fileExtensions = ImpromptuLanguageMetaData.fileExtensions.join(', ');
    program
        .command('generate')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .description('generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file')
        .action(generateAction);

    program
        .command('genprompt')
        .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .option('-p, --prompt <prompt>', 'Prompt where the varaibles are used')
        .option('-v, --variables <var...>', 'arguments transmitted to the prompt')
        .option('-t, --target <name>', 'name of the target generative AI system that will receive the prompt')
        .description('Generate the textual prompt stored in a given file')
        .action(generatePromptAction);

    program
        .command('parseAndValidate')
        .argument('<file>', `Source file to parse & validate (ending in ${fileExtensions})`)
        .description('Indicates where a program parses & validates successfully, but produces no output code')
        .action(parseAndValidate)
    
    program 
        .command('version')
        .action(version)
        
    program
        .command('addAI')
        .argument('<LLM>',`Name used in for refering to the LLM`)
        .option('-f, --alias <alias>','Name of the file where the function will be located.')
        .option('-pn, --promptName <promptName>','Name of the file where declared in the CLI.')
        .description('Add a new AI System so it can be customize.')
        .action(addAI);
        
    program
        .command('removeAI')
        .argument('<LLM>',`Name used in for refering to the LLM`)
        .description('Remove an AI System so it can be customize.')
        .action(removeAI);


    program
        .command('genpromptAll')
        .argument('<file>', `source directory (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .option('-t, --target <name>', 'name of the target generative AI system that will receive the prompt')
        .description('Generate the textual prompt stored in a given file')
        .action(generateAll);

    program.parse(process.argv);
}
