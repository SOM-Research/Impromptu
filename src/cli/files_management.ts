import chalk from "chalk";
import fs, { existsSync } from 'fs';
import { readFileSync, unlinkSync, writeFileSync } from "fs";

const gen_folder='src/cli/gen';

const AISystem_RegEx= /export(\s+)const(\s+)AISystem(\s+)=(\s+){(\s|\S)*?}/; // => export const AI System = { ..... }

type AISyst ={
    name:string,
    alias:string,
    command:string
}

/**
 * Add a certain LLM to the JSON `cli/gen/llm_json.json` (it is hidden).
 * @param llm Name to identify the LLM
 * @param fileAlias Alias used to create its related files
 * @param command name used in the CLI
 */
function add_in_JSON(llm: string, fileAlias: string, command: string){

    const data = fs.readFileSync(`${gen_folder}/llm_json.json`,'utf-8');
    
    const data_json = JSON.parse(data);
    let newLLM: AISyst = { name: llm, alias: fileAlias, command:command };
    data_json.push(newLLM)
    
    fs.writeFileSync(`${gen_folder}/llm_json.json`,JSON.stringify(data_json))

}

/**
 * Creates a custom prompt generator to the wanted LLM. It also modify `generate-prompt` and add it to the JSON
 * @param llm wanted LLM
 * @param fileAlias Name used to deno LLM's file and prompts
 * @param command Name used to refer the LLM in the CLI
 */
export function addLLM(llm:string,fileAlias:string,command:string){
    
    const file = `generate-prompt_${fileAlias}.ts`
    
    // add in the JSON
    checkAI(llm, fileAlias, command) // First check if already exists
    add_in_JSON(llm,fileAlias,command)

    const generate_prompt = readFileSync(`${gen_folder}/generate-prompt.ts`);

    
    // Create a new file with the default coding
    
    createFile(file,fileAlias);
    
    // Change the `generate-prompt.ts` file so that it accepts the new LLM
    
    let content = generate_prompt.toString();

    content = changeMainFile(llm,fileAlias,command,content);
    
    console.log(chalk.green(`AI System "${llm}" added correctly`));
    writeFileSync(`${gen_folder}/generate-prompt.ts`,content);

}

/**
 * Checks whether a LLM is already considered individually or not (whether is it in the .json or not)
 * @param llm 
 * @param fileAlias 
 * @param command 
 */
function checkAI(llm:string,fileAlias:string,command:string){
    
    const data = fs.readFileSync(`${gen_folder}/llm_json.json`,'utf-8');
            
    const data_json = JSON.parse(data);
    const data_located = data_json.filter((element: { [x: string]: string; }) =>
       element["name"]==llm||element["alias"]==fileAlias ||element["name"]==command
    )
    if (data_located.length>0){
        console.error(chalk.red(`The LLM "${llm}" is already added.`));
        throw new Error("LLM is already added")
    }
}

/**
 * Create the file that will manage the behavior of a certain LLM
 * @param file 
 * @param fileAlias alias of the LLM
 */
function createFile(file:string,fileAlias:string){
    // Checks if the file already exists
    if (existsSync(`${gen_folder}/${file}`)) {
        console.error(chalk.red(`The file ${file} already exists. An error may have occuror while removing an LLM before. Please delete it manually`));
        throw new Error();
    }
    const generate_prompt_base = readFileSync(`${gen_folder}/generate-prompt_base.ts`) // 
    let content = generate_prompt_base.toString()
    content=content.replaceAll('_base',`_${fileAlias}`)
    writeFileSync(`${gen_folder}/${file}`,content);
}

/**
 * Make the changes in `generate-prompt-ts` to be able to access the file `generate-prompt_<alias>`
 * @param llm name of the llm
 * @param fileAlias Alias thatidentity the file
 * @param command name used in CLI
 * @param content string with the content of the file
 * @returns 
 */
function changeMainFile(llm:string, fileAlias:string, command:string, content:string){
    // Write the importations
    let reg = /import((.)*?)from '.\/generate-prompt_default'(;)?/gm // ==> import......from '.\/generate-prompt_default'
    content.match(reg)?.forEach(element =>{
        content=content.replace(
            element,
            element.replaceAll('_default',`_${fileAlias}`)+'\n'+element 
        )
    })
    
    // Indicate the new language in the AISystem 
    reg = /export((.)*?)AISystem((.)*?){/gm
    content.match(reg)?.forEach(element =>{
        content=content.replace(
            element,
            element +'\n'+`\t${llm}: "${command}",`
        )
    })

    
    reg = /case undefined((\s|\S)*?)\_default((\s|\S)*?)break;((\s|\S)*?)}/gm
    
    // Add the new case in the switch
    //
    content.match(reg)?.forEach(element =>{
        content=content.replace(
            element,
            element.replace('_default',`_${fileAlias}`).replace('undefined',`AISystem.${llm}`)+
            element 
        )
    })
    
    return content

}

/**
 * Delete a LLM from the JSON `cli/gen//llm_json.json` (hidden file)
 * @param llm 
 */
function remove_from_JSON(llm:string){
    const data = fs.readFileSync(`${gen_folder}/llm_json.json`,'utf-8');
            
    const data_json = JSON.parse(data);
    const data_updated = data_json.filter((element: { [x: string]: string; }) =>
        element["name"]!=llm
    )
    fs.writeFileSync(`${gen_folder}/llm_json.json`,JSON.stringify(data_updated));
}

/**
 * Delete the custom behavior of a LLM
 * @param llm 
 */
export function removeLLM(llm:string){
    
    const generate_prompt = readFileSync(`${gen_folder}/generate-prompt.ts`);
    let content = generate_prompt.toString();
    let llm_alias= getAI_Alias(llm)

    // Get the command and checks that the LLM is saved
    content = removeImports(llm,content);

    // remove from JSON
    remove_from_JSON(llm);

    content = removeSwitch(llm,llm_alias as string,content);

    unlinkSync(`${gen_folder}/generate-prompt${llm_alias}.ts`); // Remove the file of the LLM
    writeFileSync(`${gen_folder}/generate-prompt.ts`,content);
    console.log(chalk.green(`The AI System "${llm}" has been removed correctly`));

}


/**
 * Obtain the alias used for a certain LLM analysing the name of the functions imported
 * @param llm LLM
 * @param content Text to analyse (generally, `generate-prompt.ts`)
 * @returns 
 */
export function getAI_Alias(llm:string):string|undefined{
    
    const data = fs.readFileSync(`${gen_folder}/llm_json.json`,'utf-8');
    let alias='';
    
    JSON.parse(data).forEach((element: { [x: string]: string; }) => {
        if (element["name"]==llm)
            alias = element["alias"]
    })
    if (alias)
        return '_'+alias;
    else{
        return undefined
    }
}

export function getAI_LLM(llm_command:string):string|undefined{
    const data = fs.readFileSync(`${gen_folder}/llm_json.json`,'utf-8');
    let llm='';
    
    JSON.parse(data).forEach((element: { [x: string]: string; }) => {
        if (element["command"]==llm_command)
            llm = element["name"]
    })
    if (llm)
        return llm;
    else{
        return undefined
    }
}


/**
 * Remove the ''import line'' related of a LLM from a content of a file
 * @param llm 
 * @param content 
 * @returns 
 */
export function removeImports(llm:string, content:string):string{
    // Remove from the AISystem
    const AIObject = content.match(AISystem_RegEx);
    if (AIObject){
        if(AIObject[0].match(llm)){ // Check if the llm is already in the object `AISystem` but linked with a different file 
            const llm_entry_RegEx = new RegExp(String.raw`(\s)*${llm}(\s)*:(\s)*"((.)*)"((.)*)`, "gm"); // => \s<llm>: "..."

            content = content.replace(AISystem_RegEx,AIObject[0].replace(llm_entry_RegEx,''))

            const llm_alias= getAI_Alias(llm);
            // Get rid of the imports
            if (llm_alias){
                const llm_import_RegEx = new RegExp(String.raw`(\s)*import((.)*?)from(\s)*'.\/generate-prompt${llm_alias}(\s)*'(;)?`,'gm') 
                // import.....from './generate-prompt<llm_alias>'
                content = content.replace(llm_import_RegEx,'');

            }
            return content
        }
    }
    return ''
}

/**
 * Remove a llm from the possibilities of the switches contained in a certain content of a file
 * @param llm 
 * @param llm_alias 
 * @param content 
 * @returns 
 */
export function removeSwitch(llm:string,llm_alias:string,content:string){
    const switch_case_RegEx = new RegExp(String.raw`case(\s)*AISystem\.${llm}((\s|\S)*?)${llm_alias}(\s)*\(((\s|\S)*?)break;((\s|\S)*?)}`,'gm')
    // case AISystem.<llm> 
    // .
    // ...<llm_alias>..
    // .
    // break;
    //.
    // }

    // Add the new case in the switch
    content=content.replace(switch_case_RegEx,'');
    return content
}
