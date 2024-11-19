import chalk from 'chalk';
import { Command } from 'commander';
import { Model } from '../language-server/generated/ast';
import { ImpromptuLanguageMetaData } from '../language-server/generated/module';
import { createImpromptuServices } from '../language-server/impromptu-module';
import { check_loops, extractAstNode, extractDocument } from './cli-util';
import { generateJavaScript } from './generator';
import { generatePrompt } from './generate-prompt';
import { NodeFileSystem } from 'langium/node';
import { readdirSync } from 'node:fs';

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
        
        check_loops(model) // Ckecks that any recursion loop happens
        
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


export const generateAll = async(fileName: string, opts: GenPromptOptions):Promise<void> =>{
    
    readdirSync(fileName).forEach(file => {
        if (/[^].prm/.test(file)){
            generatePromptAction(fileName+'/'+file, opts)
        }
    });
};


export type GenPromptOptions = {
    destination?: string;
    target?: string;
    variables?: string[];
    prompt?: string;
    
}

export const parseAndValidate = async (fileName: string): Promise<void> => {
    // retrieve the services for our language
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    // extract a document for our program
    const document = await extractDocument(fileName, services);
    // extract the parse result details
    const parseResult = document.parseResult;
    // verify no lexer, parser, or general diagnostic errors show up
    if (parseResult.lexerErrors.length === 0 && 
        parseResult.parserErrors.length === 0
    ) {
        console.log(chalk.green(`Parsed and validated ${fileName} successfully!`));
    } else {
        console.log(chalk.red(`Failed to parse and validate ${fileName}!`));
    }
};

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
        .command('testing')
        .description('Uses several examples to check that the progem works properly')
        .action(testing)

    program
        .command('genpromptAll')
        .argument('<file>', `source directory (possible file extensions: ${fileExtensions})`)
        .option('-d, --destination <dir>', 'destination directory of generating')
        .option('-t, --target <name>', 'name of the target generative AI system that will receive the prompt')
        .description('Generate the textual prompt stored in a given file')
        .action(generateAll);

    program.parse(process.argv);
}
