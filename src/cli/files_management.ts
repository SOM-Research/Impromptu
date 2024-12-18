import chalk from "chalk";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";

const gen_folder='src/cli/gen';

const AISystem_RegEx= /export(\s+)const(\s+)AISystem(\s+)=(\s+){(\s|\S)*?}/; // => export const AI System = { ..... }


export function addLLM(llm:string,file:string,fileAlias:string,command:string){
    
            if (existsSync(`${gen_folder}/${file}`)) {
                console.error(chalk.red(`The file ${file} already exists.`));
                throw new Error();
            }
            const generate_prompt = readFileSync(`${gen_folder}/generate-prompt.ts`)
            let content = generate_prompt.toString();
            checkAI(llm,content)
            
            
            // Create a new file with the default coding
            createFile(file,fileAlias,content)
           
            
            // Change the `generate-prompt.ts` file so that it accepts the new LLM
            
            content = generate_prompt.toString()
    
            content = changeMainFile(llm,fileAlias,command,content)
            
            console.log(chalk.green(`AI System "${llm}" added correctly`));
            writeFileSync(`${gen_folder}/generate-prompt.ts`,content);

}


function checkAI(llm:string, content:string){
    
    const AIObject = content.match(AISystem_RegEx);
    // Check if it is already imported
    
    if (AIObject){
        // Check if the llm is already in the object `AISystem` but linked with a different file 
        if (AIObject[0].match(`\s${llm}:`)){ // => \s<llm>:  \s and ':' are needed to enclose the word and do not chose another LLM that contains it
            console.error(chalk.red(`AI system "${llm}" already added in another file`));
            
            throw new Error(`AI system "${llm}" already added in another file`);
        }
    }
}

function createFile(file:string,fileAlias:string,content:string){
    const generate_prompt_base = readFileSync(`${gen_folder}/generate-prompt_base.ts`)
    content = generate_prompt_base.toString()
    content=content.replaceAll('_base',`_${fileAlias}`)
    writeFileSync(`${gen_folder}/${file}`,content);
}


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

export function removeLLM(llm:string, content:string){
    
    // Get the command and checks that the LLM is saved
    content = removeImports(llm,content)
    
    let llm_alias= getAI_Alias(llm, content)
    if (content && llm_alias){
        content = removeSwitch(llm,llm_alias,content)

        unlinkSync(`${gen_folder}/generate-prompt${llm_alias}.ts`); // Remove the file of the LLM
        writeFileSync(`${gen_folder}/generate-prompt.ts`,content);
        console.log(chalk.green(`The AI System "${llm}" has been removed correctly`));
    }
    else{
        console.log(chalk.blue(`It does not exist any AI system is saved by the name of "${llm}".`));
       
    }
}

/**
 * Obtain the alias used for a certain LLM analysing the name of the functions imported
 * @param llm LLM
 * @param content Text to analyse (generally, `generate-prompt.ts`)
 * @returns 
 */
function getAI_Alias(llm:string, content:string):string|undefined{
    const llm_case_RegEx= new RegExp(String.raw`case AISystem\.${llm}:(\s|\S)*?break;(\s)*}`, "gm");
    const llm_case = content.match(llm_case_RegEx)?.toString()
    if (llm_case){
        const aux_RegEx = llm_case.match(/generatePrompt_(\s|\S)*?(\s)*\(/gm) // => /generatePrompt_......\s
        if (aux_RegEx){
            const alias = aux_RegEx[0].match(/_(\s|\S)*?(\s)*\(/gm)?.toString().split('(')[0]
            return alias // alias = _....
        }
    }
    return undefined
}

function removeImports(llm:string, content:string){
    // Remove from the AISystem
    const AIObject = content.match(AISystem_RegEx);
    if (AIObject){
        if(AIObject[0].match(llm)){ // Check if the llm is already in the object `AISystem` but linked with a different file 
            const llm_entry_RegEx = new RegExp(String.raw`(\s)*${llm}(\s)*:(\s)*"((.)*)"((.)*)`, "gm"); // => \s<llm>: "..."

            content = content.replace(AISystem_RegEx,AIObject[0].replace(llm_entry_RegEx,''))

            const llm_alias= getAI_Alias(llm, content);
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

function removeSwitch(llm:string,llm_alias:string,content:string){
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
