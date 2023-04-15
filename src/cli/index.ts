import chalk from 'chalk';
import { Command } from 'commander';
import { Model } from '../language-server/generated/ast';
import { ImpromptuLanguageMetaData } from '../language-server/generated/module';
import { createImpromptuServices } from '../language-server/impromptu-module';
import { extractAstNode, extractDocument } from './cli-util';
import { generateJavaScript } from './generator';
import { generatePrompt } from './generate-prompt';
import { NodeFileSystem } from 'langium/node';


export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    const model = await extractAstNode<Model>(fileName, services);
    const generatedFilePath = generateJavaScript(model, fileName, opts.destination);
    console.log(chalk.green(`JavaScript code generated successfully: ${generatedFilePath}`));
};

export const generatePromptAction = async (fileName: string, opts: GenPromptOptions): Promise<void> => {
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    const model = await extractAstNode<Model>(fileName, services);
    const generatedFilePath = generatePrompt(model, fileName, opts.destination, opts.target);
    console.log(chalk.green(`Prompt generated successfully: ${generatedFilePath}`));
};

export type GenPromptOptions = {
    destination?: string;
    target?: string;
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
        .option('-t, --target <name>', 'name of the target generative AI system that will receive the prompt')
        .description('Generate the textual prompt stored in a given file')
        .action(generatePromptAction);

    program
        .command('parseAndValidate')
        .argument('<file>', `Source file to parse & validate (ending in ${fileExtensions})`)
        .description('Indicates where a program parses & validates successfully, but produces no output code')
        .action(parseAndValidate) 

    program.parse(process.argv);
}
