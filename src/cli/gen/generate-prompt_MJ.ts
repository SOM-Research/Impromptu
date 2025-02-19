import chalk from 'chalk';
import * as Ast from '../../language-server/generated/ast';
import { get_file_from, get_line_node } from '../cli-util';
import { AISystem, extractMedium, genAssetReuse, genImportedAsset } from './generate-prompt';
import * as df from './generate-prompt_default';

/** 
*Generate a prompt for each asset (Generate the single requested prompt).
*
*   @param model 
*   @param prompt prompt-mode parameter. Indicates the prompt that is run.
*   @param variables Variables transmitted by command line.
*   @return model.assets.flatMap(asset => genAsset_MJ(asset)).filter(e => e !== undefined) as string[];
*    
*/
export function generatePrompt_MJ(model: Ast.Model, prompt: Ast.Prompt | undefined, variables?: string[]): string[] {
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
            let line = get_line_node(prompt);
            let file = get_file_from(prompt);
            console.log(`[${file}]-Error in line ${line}: The number of values and variables of the prompt does not match.`);
            throw new Error(`[${file}]-Error in line ${line}: The number of values and variables of the prompt does not match.`)
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
                let line = get_line_node(lastPrompt);
                let file = get_file_from(lastPrompt);
                console.log(`[${file}]-Error in line ${line}: The number of values and variables of the prompt does not match.`);
                throw new Error(`[${file}]-Error in line ${line}: The number of values and variables of the prompt does not match.`)  
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
        let file = get_file_from(asset);
        let line = get_line_node(asset);
        console.log(chalk.yellow(`[${file}]- Warning in line ${line}: Chains are not implemented in Midjourney mode yet.Its prompt will be omitted.`));
        return [];
    } else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, AISystem.Midjourney, variables);
    }
    let file = get_file_from(asset);
    let line = get_line_node(asset);
    console.log(chalk.yellow(`[${file}]- Warning in line ${line}: Unkwown asset type. Its prompt will be omitted`));
    return [];  
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
    } else if (Ast.isInputRef(snippet)) {
            return genInputRef(snippet, variables)
    } else if (Ast.isConditional(snippet)) { 
        return genConditional(snippet,variables);
    } else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet, AISystem.Midjourney, variables)
    } else if (Ast.isTrait(snippet)){ 
        if (Ast.isNegativeTrait(snippet)) {
            return genNegativeTrait_MJ(snippet,variables);
        } else if (Ast.isCombinationTrait(snippet)) {
            return genCombinationTrait_MJ(snippet, variables);
        } else if (Ast.isAudienceTrait(snippet)) {
            return genAudienceTrait_MJ(snippet);
        } else if (Ast.isMediumTrait(snippet)) {
            return genMediumTrait_MJ(snippet);
        }else{
            return df.genTraits_default(snippet,variables,genSnippet_MJ)
        }
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
    return "--no " + genSnippet_MJ(snippet.content,variables).toString();
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
    const texts     = contents.flatMap(subSnippet => genSnippet_MJ(subSnippet)).filter(e => e !== undefined) as string[]; // Why snippet_SD
    var cleanText = texts.filter(function(e){return e}); // remove empty elements from array
    
    cleanText.forEach(element=>{
        if (variables?.has(element)){
            cleanText[cleanText.indexOf(element)] = variables.get(element) as string;
        }
    })
    if (cleanText.length < 2){
        let file = get_file_from(snippet);
        let line = get_line_node(snippet);
        console.log(chalk.yellow(`[${file}]- Warning in line ${line}: The combination trait only one parameter. It will be omitted.`));
        return "";
    }
    else if (cleanText.length > 2){
        let file = get_file_from(snippet);
        let line = get_line_node(snippet);
        console.log(chalk.yellow(`[${file}]- Warning in line ${line}: The combination trait has more than two parameters. The answer of the prompt may be odd.`));
    }
    return "[" + cleanText.join(" : ") + " :"+1/cleanText.length+"]";
    //combineStrings(texts, " : ", " : ") + " :0.5]";
}

export function genAudienceTrait_MJ(snippet: Ast.AudienceTrait): string {
    return df.genAudienceTrait_default(snippet,genSnippet_MJ);
}

function genMediumTrait_MJ(snippet: Ast.MediumTrait): string {
    return df.genMediumTrait_default(snippet)
}

/**
 * Generates the text related to an Input (a paramter or a metadata), usally by getting the value given to it
 * @param snippet InputRef
 * @param variables Mappping of the assets' varaibles and their value
 * @returns 
 */
export function genInputRef(snippet: Ast.InputRef,variables?: Map<string,string>){
    if (Ast.isParameterRef(snippet)){
        return genParameterRef(snippet,variables)
    }
    else if(Ast.isMultimodalRef(snippet)){
        let line = get_line_node(snippet);
        let file = get_file_from(snippet);
        console.log(chalk.red(`[${file}]-Error in line `+ line+`: Multimodal is not yet implemented.`));
        throw new Error(`[${file}]-Error in line `+ line+`: Multimodal is not yet implemented.`)
    }
    let line = get_line_node(snippet);
    let file = get_file_from(snippet);
    console.log(chalk.red(`[${file}]-Error in line `+ line+`: ERROR`));
    throw new Error(`[${file}]-Error in line `+ line+`: ERROR`)    
}

/**
 * Generates the text related to a parameter (usally by getting the value given to it)
 * @param snippet Paramater Ref
 * @param variables Mappping of the assets' varaibles and their value
 * @returns 
 */
function genParameterRef(snippet: Ast.ParameterRef,variables?: Map<string,string>){
    if (!variables){
        return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;}
    else{
        return variables.get(((snippet as unknown) as Ast.ParameterRef).param.$refText) as string;}
}

/**
 * Generates the prompt text associated with a conditional snippet
 * @param snippet Conditional Snippet
 * @param variables Mappping of the assets' varaibles and their value
 * @returns 
 */
export function genConditional(snippet: Ast.Conditional,variables?: Map<string,string>){
    let value = genInputRef(snippet.param,variables)
    if (value == snippet.condition){
        return genSnippet_MJ(snippet.result,variables);
    } else{
        if (snippet.neg_result){
            return genSnippet_MJ(snippet.neg_result, variables);
        }else return ""
    }
}