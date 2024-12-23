import fs from 'fs';
import chalk from 'chalk';
//import AbstractFormatter from 'langium';
//import { CompositeGeneratorNode, NL, toString } from 'langium';
import path from 'path';
import * as Ast from '../../language-server/generated/ast';
/* import  { Model, Asset, Snippet, CombinationTrait, NegativeTrait, AudienceTrait, MediumTrait,
         isPrompt, isChain, 
         isComposer, isTextLiteral, isParameterRef, isAssetReuse, isNegativeTrait, 
         isCombinationTrait, isAudienceTrait, isMediumTrait } from '../language-server/generated/ast';
         */
import { extractDestinationAndName, get_file_from, get_imported_asset, get_line_node } from '../cli-util';
import { genAsset_MJ, generatePrompt_MJ } from './generate-prompt_MJ';
import { genAsset_SD, generatePrompt_SD } from './generate-prompt_SD';
import { genAsset_ChatGPT, genBaseSnippet_ChatGPT, generatePrompt_ChatGPT } from './generate-prompt_ChatGPT';
import { genAsset_default, generatePrompt_default } from './generate-prompt_default';

export const AISystem = {
	ChatGPT: "chatgpt",
	StableDiffusion: "stable-diffusion",
    Midjourney: "midjourney"
}



/** 
* Generate a prompt for each asset (Generate the single requested prompt).
* If prompt is not informed, the generator will consider all the prompts included in the model.
* It will generate the code for the single prompt otherwise.
*
*   @param model 
*   @param prompt  Prompt object that it will be addressed
*   @param variables Variables transmitted by command line.
*   @param promptName Prompt transmitted by command line. If it is not declared, `variables` are used in the last prompt of the document
*/
export function generatePromptCode(model: Ast.Model, aiSystem: string | undefined, prompt: Ast.Prompt | undefined,  variables?:string[]|undefined): string[] | undefined {
    var result;
    switch(aiSystem) {
        case AISystem.Midjourney: {
            result = generatePrompt_MJ(model, prompt,variables).filter(e => e !== '\n').filter(function(e){return e});
            break;
        }
        case AISystem.StableDiffusion: {   
            result = generatePrompt_SD(model, prompt, variables).filter(e => e !== '\n').filter(function(e){return e});
            break;
        }
        case AISystem.ChatGPT: {
            result = generatePrompt_ChatGPT(model, prompt, variables);
            break;
        }case undefined: {
            result = generatePrompt_default(model, prompt, variables); 
            break;
        }
        default: {
            console.error(chalk.red(`Wrong parameter: AI system "${aiSystem}" not supported!`));
        }
    }
    return result;
}

/**
 * Given a prompt, checks the value of the attribute `validator`, in case it has it
 * @param prompt 
 * @returns 
 */
export function generatePromptTraitValidators(model: Ast.Model, prompt: Ast.Prompt) {
    const core = (prompt.core.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c)) as unknown) as Ast.Trait[];
    const preffix = ((prompt.prefix) ? (prompt.prefix.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c)) as unknown) as Ast.Trait[] : []);
    const suffix = ((prompt.suffix) ? (prompt.suffix.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c)) as unknown) as Ast.Trait[] : []);
    const snippets = core.concat(preffix).concat(suffix);
    let result = [{trait: '', condition: ''}];
    snippets.forEach(s => {
        // traits with value
        if (Ast.isTextTrait(s)) { // || Ast.isImageTrait(s)) {
            if (s.validator)
                if (! Ast.isSnippet(s.value)) 
                    result.push({ trait: s.value, condition: genBaseSnippet_ChatGPT(s)});// s.validator}); //genTraitValidatorPrompt(model, s.validator?.$refText)});
                else{
                    result.push({ trait: '', condition: genBaseSnippet_ChatGPT(s)});
                }
        }
    })
    return result.filter(t => t.condition); //snippets.flatMap(s => ({trait: s.value, condition: genValidatorPrompt(model, s.validator?.$refText)})).filter(function(e){return e});
}

// function genValidatorPrompt(model: Ast.Model, prompt: string | undefined): string {
//     if (prompt) {
//         const asset = model.assets.filter(a => Ast.isPrompt(a)).filter(a => a.name == prompt)[0] as Ast.Prompt;
//         return genAsset_ChatGPT(asset).join('.');
//     }
//     return '';
// }

/**
 * Main function of the Command Line functionality. 
 * Generate the prompt for an associated `Model` in an `AISystem`.
 * 
 * @param model Model 
 * @param filePath URI of the document where the code is located
 * @param destination URI whre the generated prompt will be located
 * @param aiSystem `AISytem` where the prompt will be used
 * @param variables Variables transmittede through command line, and used in a prompt of the asset
 * @param promptName `name` of the prompt where `variables`will be used. It is the last one by default.
 * @returns URI of the generated file (`destination`/name.txt)
 */
export function generatePrompt(model: Ast.Model, filePath: string, destination: string | undefined, aiSystem: string | undefined, variables?:string[], promptName?:string): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.txt`;

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }
    
    if (promptName){
        // Case a prompt were given
        const prompt=model.assets.find(element => 
            element.name==promptName);
        if (Ast.isPrompt(prompt)){
            var result = generatePromptCode(model, aiSystem, prompt, variables);
        }
        else{
            console.error(chalk.red(`An asset with that name does not exist`));
            throw new Error();
        }
    }
    else
        var result = generatePromptCode(model, aiSystem, undefined, variables);

    if (result != null) {
        fs.writeFileSync(generatedFilePath, result.join(' '));
    }
    
    return generatedFilePath;
}



/**
 * Gets the assets of a model. Empty assets are removed.
 * 
 */
export function getPromptsList(model: Ast.Model) {
    return model.assets.map(asset => genAssetDescription(asset)).filter(e => e !== undefined);
}

/**
 * Return the name and the description (serparated) of an asset
 * 
 * @param asset 
 * @returns `\{name:string, description:string|undefined}` or `undefined`
 */
function genAssetDescription(asset: Ast.Asset) {
    if (Ast.isPrompt(asset)) return { name: asset.name, description: asset.description};
    else return undefined;
}




/**
 * Generate the prompt of an imported Asset. Needed to link the parameters with its respective inputs
 * 
 * @param asset the ImportedAsset
 * @param aiSystem AI used
 * @param variables Mapping used in the father's asset
 * @returns prompt realted to the imported asset (string[])
 */

export function genImportedAsset(asset:Ast.AssetImport, aiSystem:string|undefined, variables?: Map<string,string>):string[]{

    // '*'Case: all assets of the file will be imported
    
    // get the prompt that is wanted to be imported: it should have the same name but different container from the desired "library" (contained in asset.library)
    let imported_asset = get_imported_asset(asset)
    if (Ast.isAsset(imported_asset)){
        let new_map

        if (variables){
            // In case parameters were given, we have to extend that map to the imported asset
            new_map = variables;
        }
        // If not variables are sent it is undefined and thus no map will be sent to the Asset

        let result;
        switch(aiSystem) {
            case AISystem.Midjourney: {
                try{
                result = genAsset_MJ(imported_asset,new_map); 
                // try-catch may not be needed
                }catch(e){
                    let file = get_file_from(asset);
                    let line = get_line_node(asset);
                    console.error(chalk.red(`[${file}: ${line}] Error: Sudden error in imported function ${asset.name}.`));
                    throw new Error();
                }
                break;
            }
            case AISystem.StableDiffusion: {   
                try{
                    result = genAsset_SD(imported_asset,new_map);
                }catch(e){
                    let file = get_file_from(asset);
                    let line = get_line_node(asset);
                    console.error(chalk.red(`[${file}: ${line}] Error: Sudden error in imported function ${asset.name}.`));
                    throw new Error();
                }
                break;
            }
            case AISystem.ChatGPT: {
                try{
                    result = genAsset_ChatGPT(imported_asset,new_map);
                }catch(e){
                    let file = get_file_from(asset);
                    let line = get_line_node(asset);
                    console.error(chalk.red(`[${file}: ${line}] Error: Sudden error in imported function ${asset.name}.`));
                    throw new Error();
                }
                break;
            }case undefined: {
                try{
                    result = genAsset_default(imported_asset,new_map);
                }catch(e){
                    let file = get_file_from(asset);
                    let line = get_line_node(asset);
                    console.error(chalk.red(`[${file}: ${line}] Error: Sudden error in imported function ${asset.name}.`));
                    throw new Error();
                }
                break;
            }
            default: {
                let file = get_file_from(asset);
                let line = get_line_node(asset);
                console.error(chalk.red(`[${file}: ${line}] Error: Sudden error in imported function ${asset.name}.`));
                throw new Error();
            }

        }
        return result;
    }
    else {
        // Theorically alrerady checked
        let line = get_line_node(asset);
        let file = get_file_from(asset);
        console.error(chalk.red(`[${file}: ${line}] Error: Import error. Does not exist an asset with the name "${asset.name}" in the library.`));
        throw new Error(`[${file}: ${line}] Error: Import error. Does not exist an asset with the name "${asset.name}" in the library.`);
    }
}

/**
 * Get the snippets that are `medium`. In case of more than one, only the first one is returned
 * @param snippets array of Snippets
 * @returns value of the `medium` snippet
 */
export function extractMedium(snippets: Ast.Snippet[]): string | undefined {
    const mediumOnly = snippets.filter(s => Ast.isMediumTrait(s.content));
    const medium     = (mediumOnly as unknown) as Ast.MediumTrait[];
    if (mediumOnly.length == 0) { 
        return undefined;
    } else if (mediumOnly.length > 1) {
        let line = get_line_node(snippets[0].$container);
        let file = get_file_from(snippets[0].$container); //get_file_from(snippets[0].$container);
        console.log(chalk.yellow(`[${file}: ${line}] Warning: Multiple 'medium' specified in the prompt. Using the first one.`));
    }
    return medium[0].value;
}


/**
 * Get the `name` of all the `Snippet` in the container `pars`
 * @param pars 
 * @param previousMap Map of the variables and their value, declared in a `Prompt` different of where these Snippet is located.
 * @returns 
 */
function getParamNames(pars:Ast.Snippet[], aiSystem:string|undefined,previousMap?:Map<string,string>): string[]{

    let sol=[]
    for(let element in pars){
        sol.push(getParamName(pars[element], aiSystem,previousMap))
    }
    return sol
}

/**
 * Get the name of a `Snippet` (i.e. the reference of a parameter).
 * @param pars Parameters in ParamInvokation
 * @param previousMap Map of the variables and its value, declared in a foreigner `Prompt`.
 * @returns string[]
 */
function getParamName(element:Ast.Snippet, aiSystem:string|undefined, previousMap?:Map<string,string>): string{

    if (Ast.isAssetReuse(element.content)){
        return genAssetReuse( element.content, aiSystem, previousMap).toString(); 
    }
    else if (Ast.isTextLiteral(element.content)){
        return element.content.content
    }
    else if (Ast.isInputRef(element.content)){
        if(previousMap){
            return previousMap.get(element.content.param.$refText) as string
        }
        else return element.content.param.$refText
    }
    else return ''
}


/**
 * Give the return prompt of an `AssetReuse` object. An `AssetReuse` references another `Asset`, 
 * but the variables used inthat prompt are changed by the `values` indicated in the paramters `pars` of `AssetReuse`,
 * which is a `ParamInvokation` container with several `Snippet` called `pars`  
 * @param assetReuse `AssetReuse`
 * @param aiSystem AI Sytem of the prompt
 * @param previousMap Mapping of variables - values comming from adove
 * 
 * @returns string
 */
export function genAssetReuse(assetReuse: Ast.AssetReuse, aiSystem:string|undefined,  previousMap?:Map<string,string>): string{
    let snippetRef= assetReuse.asset.ref
        // In case the Assets had variables we have to change them
        // Check the number of variables is correct
    if (Ast.isReferenciable(snippetRef)){ 
        var map = new Map<string,string>() 
        if(Ast.isAssetImport(snippetRef)){
            // If it is an import, the snippetRef is the reference of the referenciable object

            // Get the line where the referenced asset is located (to define the errors)
            let line = get_line_node(assetReuse);
            let file = get_file_from(snippetRef);
            let imported_asset= get_imported_asset(snippetRef);
            if( Ast.isPrompt(imported_asset) || Ast.isComposer(imported_asset)){
                if (imported_asset.pars.pars.length != assetReuse.pars?.pars.length){
                    console.log(chalk.red(`[${file}: ${line}] Error: The imported asset ${snippetRef.name} needs ${imported_asset.pars.pars.length} variables.`));
                    throw Error(`[${file}: ${line}] Error: The imported asset ${snippetRef.name} needs ${imported_asset.pars.pars.length} variables.` )
                }
  
            }else if(Ast.isChain(imported_asset)){
                if(assetReuse.pars?.pars && assetReuse.pars?.pars.length>0){
                    console.log(chalk.red(`[${file}: ${line}] Error: A Chain cannot have parameters`));
                    throw Error(`[${file}: ${line}] Error: A Chain cannot have parameters`);
                }
            }
            else{
                console.log(chalk.red(`[${file}: ${line}] Error: You can't import an import`));
                throw Error(`[${file}: ${line}] Error: You can't import an import`);
            }
            if (assetReuse.pars && !Ast.isChain(imported_asset)){ // Second condition need to avoid errors
                let variables = imported_asset.pars.pars;
                let values = getParamNames(assetReuse.pars?.pars, aiSystem, previousMap)
                if(variables){
                    for (let variable in variables){
                        map.set(variables[variable].name,values[variable])
                    }
                }
            }
            snippetRef=imported_asset
        } else if (Ast.isAsset(snippetRef)){     
                
                if (assetReuse.pars){
                    // Mapping the value of the variables
                    let values = getParamNames(assetReuse.pars?.pars, aiSystem, previousMap)
                    // Create Mapping
                    let variables
                    if (!Ast.isImportedAsset(snippetRef)&& !Ast.isChain(snippetRef)){
                        variables = snippetRef.pars.pars
                    }
                    if(variables){
                        for (let variable in variables){
                            map.set(variables[variable].name,values[variable])
                        }
                    }
                }  else{
                    console.error(chalk.red(`An AssetReuse should have the structure: <name>(<parameters>)`));
                    return "";
                } 
            }  
            var result
            switch(aiSystem) {
                case AISystem.Midjourney: {
                    result = genAsset_MJ(snippetRef,map).toString();
                    break;
                }
                case AISystem.StableDiffusion: {   
                    result = genAsset_SD(snippetRef,map).toString()
                    break;
                }
                case AISystem.ChatGPT: {
                    result = genAsset_ChatGPT(snippetRef,map).toString()
                    break;
                }case undefined: {
                    console.error(chalk.yellow(`No target provided. Using 'chatgpt' by default`));
                    result = genAsset_default(snippetRef,map).toString()
                    break;
                }
                default: {
                    console.error(chalk.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
                    result=""
                }
            }
            return result;
             
        }
        else{
            throw new Error(`The snippet is not referencing an asset`);
            return '';
        }
}


// Note: shouldn't be necessary; already replaced with array operators
// function combineStrings(contents: string[], separator: string, lastSeparator: string ): string {
//     var result = "";
//     for(var i = 0; i < contents.length; i++) {
//         if (contents[i]!="") {
//             result = result + contents[i];
//             if (i+1 < contents.length-1) {
//                 result += separator;
//             } else if (i+1 == contents.length-1) {
//                 result += lastSeparator;
//             }
//         }
//     }
//     return result;
// }

