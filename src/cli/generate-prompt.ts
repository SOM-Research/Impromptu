import fs from 'fs';
import chalk from 'chalk';
//import AbstractFormatter from 'langium';
//import { CompositeGeneratorNode, NL, toString } from 'langium';
import path from 'path';
import * as Ast from '../language-server/generated/ast';
/* import  { Model, Asset, Snippet, CombinationTrait, NegativeTrait, AudienceTrait, MediumTrait,
         isPrompt, isChain, 
         isComposer, isTextLiteral, isParameterRef, isAssetReuse, isNegativeTrait, 
         isCombinationTrait, isAudienceTrait, isMediumTrait } from '../language-server/generated/ast';
         */
import { extractDestinationAndName, get_imported_asset } from './cli-util';
export const AISystem = {
	ChatGPT: "chatgpt",
	StableDiffusion: "stable-diffusion",
    Midjourney: "midjourney"
}

/** If prompt is not informed, the generator will consider all the prompts included in the model;
* will generate the code for a single prompt, otherwise.
* 
* *Generate a prompt for each asset (Generate the single requested prompt).
*
*   @param model 
*   @param prompt  Prompt object that it will be addresed
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
        }
        case undefined: {
            console.log(chalk.yellow(`No target provided. Using 'chatgpt' by default`));
            result = generatePrompt_ChatGPT(model, prompt, variables); 
            break;
        }
        default: {
            console.log(chalk.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
        }
    }
    return result;
}

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
            console.log(chalk.red(`An asset with that name does not exist`));
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

export function getPromptsList(model: Ast.Model) {
    return model.assets.map(asset => genAssetDescription(asset)).filter(e => e !== undefined);
}

function genAssetDescription(asset: Ast.Asset) {
    if (Ast.isPrompt(asset)) return { name: asset.name, description: asset.description};
    else return undefined;
}

/** 
*Generate a prompt for each asset (Generate the single requested prompt).
*
*   @param model 
*   @param prompt prompt-mode parameter. Indicates the prompt that is run.
*   @param variables Variables transmitted by command line.
*   @return model.assets.flatMap(asset => genAsset_MJ(asset)).filter(e => e !== undefined) as string[];
*    
*/
function generatePrompt_MJ(model: Ast.Model, prompt: Ast.Prompt | undefined, variables?: string[]): string[] {
    // Generate the single requested prompt
    
    if (prompt){
        const parameters= prompt.pars; 
        if (!variables) variables=[];
        if(variables?.length && !parameters){// No variables were announced
            return genAsset_MJ(prompt).filter(e => e !== undefined) as string[];
        }
        else if (parameters.pars.length == variables?.length){  
            var map = new Map<string,string>()
            // Create Mapping
            for (let i = 0; i < variables.length; i++){
                map.set(parameters.pars[i].name,variables[i])
            }
            return genAsset_MJ(prompt, map).filter(e => e !== undefined) as string[];
        }
        else{
            console.log(chalk.red(`The number of values and variables of the prompt does not match.`));
            throw new Error(`The number of values and variables of the prompt does not match.`)
        }
        
    }
    else if (variables){
        // There were given parameters but no prompt -> Last prompt
        const lastPrompt = model.assets[model.assets.length -1];
        if(Ast.isPrompt(lastPrompt)){
            console.log(chalk.yellow(`No prompt were given. Chosing the last one by default`));
            const paramaters= lastPrompt.pars 
            if (paramaters.pars.length == variables?.length){  
                var map = new Map<string,string>()
                // Create Mapping
                for (let i = 0; i < variables.length; i++){
                    map.set(paramaters.pars[i].name,variables[i])
                } 
                return genAsset_MJ(lastPrompt, map).filter(e => e !== undefined) as string[];     
            }          
            else{
                console.log(chalk.red(`The number of values and variables of the prompt does not match.`));
                throw new Error(`The number of values and variables of the prompt does not match.`)  
            }
        }
        else
            return model.assets.flatMap(asset => 
                {if (asset.$container==model){return genAsset_MJ(asset)} else return undefined}).filter(e => e !== undefined) as string[];     
    }

    // Generate a prompt for each asset
    else {
        return model.assets.flatMap(asset => 
            {if (asset.$container==model){return genAsset_MJ(asset)} else return undefined}).filter(e => e !== undefined) as string[];
    }
}



/** 
 *  Generates the prompt in MidJourney related to an `Asset`, which more important elements are `prefix`, `core` and `suffix`
 * 
 * @param asset Asset to be translated
 * @param variables map of the variables and their respective values (in case of being an AssetReuse call)
 * @returns string Array, where each element is the translation of each part of the Asset
 */
export function genAsset_MJ(asset: Ast.Asset, variables?: Map<string,string>): string[] {
    if (Ast.isPrompt(asset)) {
        let separator = ', ';
        if (asset.separator !== undefined){
            separator = asset.separator;
        }
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_MJ(snippet,variables)).filter(e => e !== undefined) as string[]: []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_MJ(snippet,variables)).filter(e => e !== undefined) as string[]: []);
        
        // Prompt structure: [medium] of [subject] [modifiers]
        // Extract the medium, if there is any, and put it in the front
        const medium = extractMedium(asset.core.snippets);
        var text = [];
        if (asset.core.snippets.length > 1) {
            text = ( medium == undefined ? [] : [ medium, " of " ] );
        } else {
            text = ( medium == undefined ? [] : [ medium ] );
        }

        var core  = asset.core.snippets.flatMap(snippet => genSnippet_MJ(snippet,variables)).filter(e => e !== undefined) as string[];
        let prompt = prefix.concat(text, core, suffix);
        return [prompt.filter(function(e){return e}).join(separator)];
    } else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_MJ(snippet,variables)).filter(e => e !== undefined) as string[];
    } else if (Ast.isChain(asset)) {
        return [];
    } else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, AISystem.Midjourney, variables);
    }
    return [];  
}



/**
 * Generate the prompt of an imported Asset
 * 
 * @param asset the ImportedAsset
 * @param aiSystem AI used
 * @param variables Mapping used in the father's asset
 * @returns prompt realted to the imported asset (string[])
 */

export function genImportedAsset(asset:Ast.ImportedAsset, aiSystem:string|undefined, variables?: Map<string,string>):string[]{

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
                result = genAsset_MJ(imported_asset,new_map);
                break;
            }
            case AISystem.StableDiffusion: {   
                result = genAsset_SD(imported_asset,new_map);
                break;
            }
            case AISystem.ChatGPT: {
                result = genAsset_ChatGPT(imported_asset,new_map);
                break;
            }
            default: {
                console.log(chalk.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
                throw new Error();
            }
        }
        return result;
    }
    else {
        console.log(chalk.red(`Import error. Does not exist an asset with the name "${asset.name}" in the library.`));
        throw new Error();
    }
}

/**
 * Get the snippets that are `medium`. In case of more than one, only the first one is returned
 * @param snippets array of Snippets
 * @returns value of the `medium` snippet
 */
function extractMedium(snippets: Ast.Snippet[]): string | undefined {
    const mediumOnly = snippets.filter(s => Ast.isMediumTrait(s.content));
    const medium     = (mediumOnly as unknown) as Ast.MediumTrait[];
    if (mediumOnly.length == 0) { 
        return undefined;
    } else if (mediumOnly.length > 1) {
        console.log(chalk.yellow(`Multiple 'medium' specified in the prompt. Using the first one.`));
    }
    return medium[0].value;
}

/**
 * Generate the prompt associated to an `Snippet` in Midjourney. A Snippet consist of two elements.
 * The `content`, which is a `BaseSnippet` element, and the `weight related to that content`
 * 
 * @param snippet `Snippet`
 * @param variables Map of the varaibles and their respective values transmitted through command line of referenced by a ParamInvokation
 * @returns string
 */
 function genSnippet_MJ(snippet: Ast.Snippet, variables?:Map<string,string>): string {
    const text = genBaseSnippet_MJ(snippet.content,variables);
    
    if (snippet.weight != null) {
        switch(snippet.weight.relevance) {
            case 'min': { return text + "::0.2"; }
            case 'low':     { return text + "::0.5";}
            case 'medium':  { return text; }
            case 'high':    { return text + "::2"; }
            case 'max': { return text + "::3"; }
            default:        { return ""; }
        }
    } else {
        return text;
    }
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
        if(Ast.isImportedAsset(snippetRef)){
            let imported_asset= get_imported_asset(snippetRef);
            if( Ast.isPrompt(imported_asset) || Ast.isComposer(imported_asset)){
                if (imported_asset.pars.pars.length != assetReuse.pars?.pars.length){
                    console.log(chalk.red("The imported asset "+snippetRef.name+" needs "+imported_asset.pars.pars.length+" variables."));
                    throw Error("The imported asset "+snippetRef.name+" needs "+imported_asset.pars.pars.length+" variables." )
                }

            }else if(Ast.isChain(imported_asset)){
                if(assetReuse.pars?.pars && assetReuse.pars?.pars.length>0){
                    console.log(chalk.red("A Chain cannot have parameters"));
                    throw Error("A Chain cannot have parameters");
                }
            }
            else{
                console.log(chalk.red("You can't import an import"));
                throw Error("You can't import an import");
            }
        }

        if (Ast.isAsset(snippetRef)){     
            // Variables
            
            var map = new Map<string,string>()
            if (assetReuse.pars){
                // Mapping the value of the variables
                let values = getParamNames(assetReuse.pars?.pars, aiSystem, previousMap)
                // Create Mapping
                let variables
                if (!Ast.isImportedAsset(snippetRef)&& !Ast.isChain(snippetRef)){
                    variables = snippetRef.pars.pars
                }else if(Ast.isImportedAsset(snippetRef)){
                    let imported_asset = get_imported_asset(snippetRef)
                    variables = imported_asset.pars.pars
                }
                if(variables){
                    for (let variable in variables){
                        map.set(variables[variable].name,values[variable])
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
                    }
                    case undefined: {
                        console.log(chalk.red(`No target provided. Using 'chatgpt' by default`));
                        result = genAsset_ChatGPT(snippetRef,map).toString()
                        break;
                    }
                    default: {
                        console.log(chalk.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
                        result=""
                    }
                }
                return result;
                
            }
            else{
                return "";
            }
        }
        else{
            return '';
        }
}

/**
 * Generate the prompt of a `BaseSnippet` in MidJourney. A `BaseSnippet` can be a text literal (`TextLiteral`),
 * a parameter reference (`ParameterRef`), a reference to a previous `Asset` (`AssetReuse`), or a trait (`NegativeTrait`, `CombinationTrait`,etc).
 * 
 * @param snippet BaseSnippet
 * @param variables Map of the variables and the values. Case that we are in a AssetReuse.
 *  The variable should only be changed when the Snipper is `AssetReuse`, `ParameterRef` and some `Trait`
 * @returns prompt
 */
export function genBaseSnippet_MJ(snippet: Ast.BaseSnippet, variables?:Map<string,string>|undefined): string{

    if (Ast.isTextLiteral (snippet)) {
        return ((snippet as unknown) as Ast.TextLiteral).content;
    } else if (Ast.isParameterRef(snippet)) {
        if (!variables){
            return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;}
        else{
            return variables.get(((snippet as unknown) as Ast.ParameterRef).param.$refText) as string ;}
    } else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet, AISystem.Midjourney, variables)
    } else if (Ast.isNegativeTrait(snippet)) {
        return genNegativeTrait_MJ(snippet,variables);
    } else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_MJ(snippet, variables);
    } else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_MJ(snippet);
    } else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_MJ(snippet);
    }
   return "";
}

/**
 * Get the prompt of a negative trait
 * 
 * @param snippet `Snippet` to negate
 * @param variables Map of the variables and the values. Case that we are in a AssetReuse
 * @returns prompt
 */
function genNegativeTrait_MJ(snippet: Ast.NegativeTrait,variables?:Map<string,string>): string {
    return "--no " + genSnippet_SD(snippet.content,variables).toString();
}

/**
 * Get the prompt for snippet of a mixture between two or more concepts 
 * 
 * @param snippet CombinationTrait Snippet
 * @param variables Map of the variables and the values. Case that we are in a AssetReuse
 * @returns prompt
 */
function genCombinationTrait_MJ(snippet: Ast.CombinationTrait, variables?:Map<string,string>): string {
    const contents  = snippet.contents;
    const texts     = contents.flatMap(subSnippet => genSnippet_SD(subSnippet)).filter(e => e !== undefined) as string[];
    var cleanText = texts.filter(function(e){return e}); // remove empty elements from array
    
    cleanText.forEach(element=>{
        if (variables?.has(element)){
            cleanText[cleanText.indexOf(element)] = variables.get(element) as string;
        }
    })
    return "[" + cleanText.join(" : ") + " :"+1/cleanText.length+"]";
    //combineStrings(texts, " : ", " : ") + " :0.5]";
}

export function genAudienceTrait_MJ(snippet: Ast.AudienceTrait): string {
    const content  = snippet.content;
    const text     = genSnippet_SD(content);
    return "for " + text;
}

function genMediumTrait_MJ(snippet: Ast.MediumTrait): string {
    const text  = snippet.value;
    return text;
}

/**
 * Generate a prompt for each asset (Generate the single requested prompt).
 * StableDiffusion Version
 *
 *   @param model 
 *   @param prompt 
 *   @param variables Variables transmitted by command line.
 *   @param promptName Prompt transmitted by command line. If it is not declared, `variables` are used in the last prompt of the document
 *   @returns string[]
 */
function generatePrompt_SD(model: Ast.Model, prompt: Ast.Prompt | undefined, variables?: string[]): string[] {
    // Generate the single requested prompt

    
    if (prompt){
        const parameters= prompt.pars
        if (!variables) variables=[];
        if(!variables && !parameters){// No variables were announced
            return genAsset_SD(prompt).filter(e => e !== undefined) as string[];
        }
        else if (parameters.pars.length == variables?.length){  
            var map = new Map<string,string>()
            // Create Mapping
            for (let i = 0; i < variables.length; i++){
                map.set(parameters.pars[i].name,variables[i])
            }
            
            return genAsset_SD(prompt, map).filter(e => e !== undefined) as string[];
        }
        else{    
            console.log(chalk.red(`The number of values and variables of the prompt does not match.`));
            throw new Error()
        }
        
    }
    else if (variables){
        const lastPrompt = model.assets[model.assets.length -1];
        model.assets[0].name
        if(Ast.isPrompt(lastPrompt)){
            console.log(chalk.yellow(`No prompt were given. Chosing the last one by default`));
            const paramaters= lastPrompt.pars 
            if (paramaters.pars.length == variables?.length){  
                var map = new Map<string,string>()
                // Create Mapping
                for (let i = 0; i < variables.length; i++){
                    map.set(paramaters.pars[i].name,variables[i])
                } 
                return genAsset_SD(lastPrompt, map).filter(e => e !== undefined) as string[];     
            }
            else{
                console.log(chalk.red(`The number of values and variables of the prompt does not match.`));
                throw new Error() 
            }   
        }
        else
            return model.assets.flatMap(asset => {
                if (asset.$container==model){return genAsset_SD(asset)} else return undefined
            }).filter(e => e !== undefined) as string[];     
    }

    // Generate a prompt for each asset
    else {
        return model.assets.flatMap(asset => 
            {if (asset.$container==model){return genAsset_SD(asset)} else return undefined
        }).filter(e => e !== undefined) as string[];
    }
}

/**
 * Generate the prompt of an Asset in Stable Diffusion
 * 
 * @param asset 
 * @param variables 
 * @returns string[]. Each string belongs to the prompting of each element of the Asset (i.e, prefix, core, suffix in case it is a Prompt)
 */
export function genAsset_SD(asset: Ast.Asset, variables?: Map<string,string>): string[] {
    if (Ast.isPrompt(asset)) {
        
        let separator = ', ';
        if (asset.separator !== undefined){
            separator = asset.separator;
        }
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_SD(snippet,variables)).filter(e => e !== undefined) as string[]: []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_SD(snippet,variables)).filter(e => e !== undefined) as string[]: []);
        
        // Prompt structure: 
        // Positive prompt: [medium] of [subject] [modifiers]
        // Negative prompt: [negative modifiers]
        // - Extract the medium, if there is any, and put it in the front
        // - Extract the negative modifiers, if there are any, and process them separately
        const medium = extractMedium(asset.core.snippets);
        var text = [];
        if (asset.core.snippets.length > 1) {
            text = ( medium == undefined ? [] : [ medium, " of " ] );
        } else {
            text = ( medium == undefined ? [] : [ medium ] );
        }
        
        const core  = asset.core.snippets.flatMap(snippet => genSnippet_SD(snippet,variables)).filter(e => e !== undefined) as string[];
        let positive_prompt = prefix.concat(text,core, suffix).filter(function(e){return e}).join(separator);

        const negativeModifiers = extractNegativeModifiers(asset.core.snippets);
        const negativeText = negativeModifiers.flatMap(snippet => genSnippet_SD(((snippet.content as unknown) as Ast.NegativeTrait).content, variables)).filter(e => e !== undefined) as string[];
        let negative_prompt = negativeText.filter(function(e){return e}).join(separator);
        // Build the final prompt
        const positive = ["Positive prompt:\n"].concat(positive_prompt);
        const negative = ["Negative prompt:\n"].concat(negative_prompt);
        return positive.concat(['\n'], negative);
    } else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_SD(snippet,variables)).filter(e => e !== undefined) as string[];;
    } else if (Ast.isChain(asset)) {
        return [];
    } else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, AISystem.StableDiffusion, variables);
    }
    return [];
 }
/**
 * For an array of snippets, extract the ones that (their content) are NegativeTrait
 * @param snippets 
 * @returns 
 */
 function extractNegativeModifiers(snippets: Ast.Snippet[]): Ast.Snippet[] {
    const negative = snippets.filter(s => Ast.isNegativeTrait(s.content));
    return negative;
}

/**
 * Genenerate the prompt of a snippet `Snippet` in StableDiffusion
 * 
 * @param snippet Snippet
 * @param variables 
 * @returns 
 */
function genSnippet_SD(snippet: Ast.Snippet, variables?:Map<string,string>): string {
    const text = genBaseSnippet_SD(snippet.content, variables);
    
    if (snippet.weight != null) {
        switch(snippet.weight.relevance) {
            case 'min': { return "[[" + text + "]]"; }
            case 'low':     { return "[" + text + "]";}
            case 'medium':  { return text; }
            case 'high':    { return "(" + text + ")"; }
            case 'max': { return "((" + text + "))"; }
            default:        { return ""; }
        }
    } else {
        return text;
    }
}

export function genBaseSnippet_SD(snippet: Ast.BaseSnippet, variables?:Map<string,string>): string {
    
    if (Ast.isTextLiteral(snippet)) {
        return ((snippet as unknown) as Ast.TextLiteral).content;
    } else if (Ast.isParameterRef(snippet)) {
        if (!variables){
            return (snippet  as Ast.ParameterRef).param.$refText ;}
        else{
            return variables.get((snippet  as Ast.ParameterRef).param.$refText) as string ;}
    } else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet,AISystem.StableDiffusion, variables); 
    } else if (Ast.isNegativeTrait(snippet)) {
        return ""; // the Negative Traits in SD are in the Negative Prompt part, as an ordary Trait
    } else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_SD(snippet,variables);
    } else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_SD(snippet);
    } else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_SD(snippet);
    } else if (Ast.isCameraAngleTrait(snippet)) {
        return genCameraAngleTrait_SD(snippet);
    } else if (Ast.isProximityTrait(snippet)) {
        return genProximityTrait_SD(snippet);
    } else if (Ast.isLightingTrait(snippet)) {
        return genLightingTrait_SD(snippet);
    } 
   return "";
}

/* Not neccesary. Maybe reactivate?
function genNegativeTrait_SD(snippet: Ast.NegativeTrait): string  {
    return genSnippet_SD(snippet.content).toString();
} */

function genCombinationTrait_SD(snippet: Ast.CombinationTrait,variables?:Map<string,string>): string  {
    const contents  = snippet.contents;
    const texts     = contents.flatMap(subSnippet => genSnippet_SD(subSnippet,variables)).filter(e => e !== undefined) as string[];
    const cleanTexts  = texts.filter(function(e){return e}); // remove empty elements from array
    return "a combination of " + cleanTexts.slice(0, -1).join(',')+' and '+cleanTexts.slice(-1);
    //combineStrings(texts, ", ", " and ");
}

function genAudienceTrait_SD(snippet: Ast.AudienceTrait): string  {
    const content  = snippet.content;
    const text     = genSnippet_SD(content);
    return "for " + text;
}

function genCameraAngleTrait_SD(snippet: Ast.CameraAngleTrait): string  {
    const text = snippet.value
    return "from a " + text;
}

function genProximityTrait_SD(snippet: Ast.ProximityTrait): string  {
    const text = snippet.value
    return text +" picture";
}
function genLightingTrait_SD(snippet: Ast.LightingTrait): string  {
    const text = snippet.value
    return text +" lighting";
}

function genMediumTrait_SD(snippet: Ast.MediumTrait): string {
    const text  = snippet.value;
    return text;
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

/** Generate a prompt for each asset (Generate the single requested prompt). 
 *
 *   @param model 
 *   @param prompt 
 *   @param variables Variables transmitted by command line.
 *   @param promptName Prompt transmitted by command line. If it is not declared, `variables` are used in the last prompt of the document
 *   @returns string[]. The solutions of different assets are divided by dots
 */

function generatePrompt_ChatGPT(model: Ast.Model, prompt: Ast.Prompt | undefined, variables?: string[],promptName?:string): string[] {
    // Generate the single requested prompt
    
    if (prompt){
        const parameters= prompt.pars 
        if (!variables) variables=[];
        if(!variables && !parameters){// No variables were announced
            return genAsset_MJ(prompt).filter(e => e !== undefined) as string[];
        }
        else if (parameters.pars.length == variables?.length){  
            var map = new Map<string,string>()
            // Create Mapping
            for (let i = 0; i < variables.length; i++){
                map.set(parameters.pars[i].name,variables[i])
            }
            return genAsset_ChatGPT(prompt, map).filter(e => e !== undefined) as string[];
        }
        else{
            
            console.log(chalk.red(`The number of values and variables of the prompt does not match.`));
            throw new Error();
        }
        
    }
    else if (variables){
        const lastPrompt = model.assets[model.assets.length -1];
        if(Ast.isPrompt(lastPrompt)){
            console.log(chalk.yellow(`No prompt were given. Chosing the last one by default`));
            const paramaters= lastPrompt.pars 
            if (paramaters.pars.length == variables?.length){  
                var map = new Map<string,string>()
                // Create Mapping
                for (let i = 0; i < variables.length; i++){
                    map.set(paramaters.pars[i].name,variables[i])
                } 
                return genAsset_ChatGPT(lastPrompt, map).filter(e => e !== undefined) as string[];     
            }
            else{
                console.log(chalk.red(`The number of values and variables of the prompt does not match.`));
                throw new Error();  
            }
                   
        }
        else
            return model.assets.flatMap(asset => {
                if (asset.$container==model){return genAsset_ChatGPT(asset)} else return undefined
            }).filter(e => e !== undefined) as string[];     
    }

    // Generate a prompt for each asset
    else {
        return model.assets.flatMap(asset =>{
            if (asset.$container==model){return genAsset_ChatGPT(asset)} else return undefined
        }).filter(e => e !== undefined) as string[];
    }
}

/**
 * Generate the prompt for ChatGPT related to an Asset
 * @param asset Asset
 * @param variables Mapping of values-parameter transmited to the asset. In case no Map were sent, the Parameters names remains unchanged in the generated prompt.
 * @returns 
 */
export function genAsset_ChatGPT(asset: Ast.Asset, variables?: Map <string, string>): string[] {
    if (Ast.isPrompt(asset)) {
        let separator = '. ';
        if (asset.separator !== undefined){
            separator = asset.separator;
        }

        const preffix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet, variables)) as string[] : []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet, variables)) as string[] : []);
        const core  = asset.core.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet, variables));
        
        // Build the final prompt
        const prompt = preffix.concat(core, suffix);

        return [prompt.filter(function(e){return e}).join(separator)];

    } else if (Ast.isComposer(asset)) {
        console.log(chalk.yellow("Composers are not implemented in ChatGPT yet"));
        return [];
    } else if (Ast.isChain(asset)) {
        console.log(chalk.yellow("Composers are not implemented in ChatGPT yet"));
        return [];
    } else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, AISystem.ChatGPT, variables);
    }
    return [];
 }

 /**
  * Generate the prompt of a Snippet in ChatGPT.
  * @param snippet 
  * @param variables 
  * @returns 
  */
 function genSnippet_ChatGPT(snippet: Ast.Snippet, variables?: Map <string, string>): string {
    if (snippet.weight){
        console.log(chalk.yellow("Weight of the snippet is not implemented in the ChatGPT mode, so it will be ignored."));
    }
    return genBaseSnippet_ChatGPT(snippet.content, variables);
}

/**
 * Generates the prompt for ChatGPT from a snippet BaseSnippet
 * 
 * @param snippet  BaseSnippet
 * @param variables Map of the variables with its values 
 * @returns 
 */
export function genBaseSnippet_ChatGPT(snippet: Ast.BaseSnippet, variables?: Map<string,string>): string {
    if (Ast.isTextLiteral(snippet)) {
        return ((snippet as unknown) as Ast.TextLiteral).content;
    } else if (Ast.isLanguageRegisterTrait(snippet)) {
        return "The answer is written using a " + snippet.value + " register";
    } else if (Ast.isLiteraryStyleTrait(snippet)) {
        return "The answer is written as a " + snippet.value;
    } else if (Ast.isPointOfViewTrait(snippet)) {
        return "The answer is written in " + snippet.value;
    }else if (Ast.isParameterRef(snippet)) {
        if (!variables){
            return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;}
        else{
            return variables.get(((snippet as unknown) as Ast.ParameterRef).param.$refText) as string ;}
    }else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet, AISystem.ChatGPT, variables)
    }else if (Ast.isNegativeTrait(snippet)) {
        return "Avoid " + genSnippet_ChatGPT(snippet.content, variables);
    }else if (Ast.isComparisonTrait(snippet)) {
        return genSnippet_ChatGPT(snippet.content1, variables) + " is more " + genSnippet_ChatGPT(snippet.comparison, variables) + " than " +genSnippet_ChatGPT(snippet.content2, variables);
    }
    // } else if (Ast.isCombinationTrait(snippet)) {
    //     return "";
    // } else if (Ast.isAudienceTrait(snippet)) {
    //     return "";
    // } else if (Ast.isMediumTrait(snippet)) {
    //     return "";
    // }
    return "";
}
