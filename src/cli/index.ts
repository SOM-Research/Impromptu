import chalk from 'chalk';
import { Command } from 'commander';
import { Model } from '../language-server/generated/ast';
import { ImpromptuLanguageMetaData } from '../language-server/generated/module';
import { createImpromptuServices } from '../language-server/impromptu-module';
import { extractAstNode, extractDocument } from './cli-util';
import { generatePrompt } from './gen/generate-prompt';
import { NodeFileSystem } from 'langium/node';
import { readdirSync} from 'node:fs';
import { addLLM, getAI_Alias, removeLLM } from './files_management';
import * as readline from 'readline';
import path from 'path';

/**
 * Generate a prompt form the file transmitted 
 * @param fileName relative path of the `.prm` (string)
 * @param opts :
 *      @param destination Name used in the file and files' fuctions i.e. `genPrompt_<alias>`
 *      @param target LLM where the prompt will be used
 *      @param prompt If sent, the prompt it will be generated. If not sent, prompts of all assets in the file are generated instead.
 *      @param variables values give to prompt's inputs 
 */
export const generatePromptAction = async (fileName: string, opts: GenPromptOptions): Promise<void> => {

    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    try{
        const model = await extractAstNode<Model>(path.resolve('build_files/'+fileName), services);
        
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
 * Generate the files from all the .prm files of a folder
 * @param folderName relative path to the folder
 * @param opts 
 */
export const generateAll = async(folderName: string, opts: GenPromptOptions):Promise<void> =>{
    
    readdirSync(folderName).forEach(file => {
        if (/[^].prm/.test(file)){
            generatePromptAction(folderName+'/'+file, opts)
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
 *      @param promptName Name used in the CLI to refereing the LLM. If it is not given is `llm` in lower case.
 *      @param alias Name used in the file and files' fuctions i.e. `genPrompt_<alias>`. OPTIONAL
 *      @param command Name used in the CLI. OPTIONAL
 */
export const addAI = async(llm: string, opts:GenAIOptions):Promise<void> =>{
    let fileAlias:string

    // If no alias was transmitted, the alias of the LLM will be the name
    if (opts){
        if (opts.alias){
            fileAlias = opts.alias;
        }else{
            fileAlias = `${llm}`;
        }
    }else{
        fileAlias = `${llm}`;
    }

    // If no command was transmitted, the command of the LLM will be the name, but in lower case
    let command:string
    if (opts){
        if (!opts.promptName){
            command = llm.toLowerCase();
        }else{
            command = opts.promptName;
        }
    }else{
        command = `${llm}`;
    }   

    try{
        addLLM(llm,fileAlias,command)
    }catch(e){}
};

/**
 * Remove the file and the code in `generate-prompt.ts` that specify Impromptu the behavior for a certain LLM
 * @param llm LLM to delete
 */
export const removeAI = async (llm: string): Promise<void> => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const llm_alias= getAI_Alias(llm)

    // Confirmation that the LLM is wanted to be deleted
    if(llm_alias!=undefined){
        rl.question(`Are you sure you want to delete content related to the LLM "${llm}"? [y/n] `, (answer) => {
            switch(answer.toLowerCase()) {
            case 'y':
                removeLLM(llm)
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
    else{
        console.log(chalk.blue(`It does not exist any AI system is saved by the name of "${llm}".`));
        rl.close();
    }
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
    const document = await extractDocument(path.resolve('build_files/'+alias), services);
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
