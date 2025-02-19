import chalk from 'chalk';
import * as Ast from '../../language-server/generated/ast';
import { get_file_from, get_line_node } from '../cli-util';
import { AISystem, extractMedium, genAssetReuse, genImportedAsset } from './generate-prompt';
import * as df from './generate-prompt_default';
// MODEL -------------------------------------------------------------------------------
/**
 * Generate a prompt for each asset (Generate the single requested prompt).
 *
 *   @param model 
 *   @param prompt 
 *   @param variables Variables transmitted by command line.
 *   @param promptName Prompt transmitted by command line. If it is not declared, `variables` are used in the last prompt of the document
 *   @returns string[]
 */
export function generatePrompt_base(model: Ast.Model, prompt: Ast.Prompt | undefined, variables?: string[]): string[] {
    // Generate the single requested prompt

    
    if (prompt){
        const parameters= prompt.pars
        if (!variables) variables=[];
        if(!variables && !parameters){// No variables were announced
            return genAsset_base(prompt).filter(e => e !== undefined) as string[];
        }
        else if (parameters.pars.length == variables?.length){  
            var map = new Map<string,string>()
            // Create Mapping
            for (let i = 0; i < variables.length; i++){
                map.set(parameters.pars[i].name,variables[i])
            }
            
            return genAsset_base(prompt, map).filter(e => e !== undefined) as string[];
        }
        else{    
            let line = get_line_node(prompt);
            let file = get_file_from(prompt);
            console.log(chalk.red(`[${file}]-Error in line `+ line+`: The number of values and variables of the prompt does not match.`));
            throw new Error(`[${file}]-Error in line `+ line+`: The number of values and variables of the prompt does not match.`)
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
                return genAsset_base(lastPrompt, map).filter(e => e !== undefined) as string[];     
            }
            else{
                let line = get_line_node(lastPrompt);
                let file = get_file_from(lastPrompt);
                console.log(chalk.red(`[${file}]-Error in line `+ line+`: The number of values and variables of the prompt does not match.`));
                throw new Error(`[${file}]-Error in line `+ line+`: The number of values and variables of the prompt does not match.`) 
            }   
        }
        else
            return model.assets.flatMap(asset => {
                if (asset.$container==model){return genAsset_base(asset)} else return undefined
            }).filter(e => e !== undefined) as string[];     
    }

    // Generate a prompt for each asset
    else {
        return model.assets.flatMap(asset => 
            {if (asset.$container==model){return genAsset_base(asset)} else return undefined
        }).filter(e => e !== undefined) as string[];
    }
}

// ASSET -------------------------------------------------------------------------------
/**
 * Generate the prompt of an Asset
 * 
 * @param asset 
 * @param variables 
 * @returns string[]. Each string belongs to the prompting of each element of the Asset (i.e, prefix, core, suffix in case it is a Prompt)
 */
export function genAsset_base(asset: Ast.Asset, variables?: Map<string,string>): string[] {
    if (Ast.isPrompt(asset)) {
        let separator = ', ';
        if (asset.separator !== undefined){
            separator = asset.separator;
        }
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_base(snippet,variables)).filter(e => e !== undefined) as string[]: []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_base(snippet,variables)).filter(e => e !== undefined) as string[]: []);
        
        // Prompt structure: [medium] of [subject] [modifiers]
        // Extract the medium, if there is any, and put it in the front
        const medium = extractMedium(asset.core.snippets);
        var text = [];
        if (asset.core.snippets.length > 1) {
            text = ( medium == undefined ? [] : [ medium, " of " ] );
        } else {
            text = ( medium == undefined ? [] : [ medium ] );
        }

        var core  = asset.core.snippets.flatMap(snippet => genSnippet_base(snippet,variables)).filter(e => e !== undefined) as string[];
        let prompt = prefix.concat(text, core, suffix);
        return [prompt.filter(function(e){return e}).join(separator)];
    } else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_base(snippet,variables)).filter(e => e !== undefined) as string[];;
    } else if (Ast.isChain(asset)) {
        let line = get_line_node(asset);
        let file = get_file_from(asset); 
        console.log(chalk.yellow(`[${file}]-Warning in line ${line}: Chain assets are not yet implemented. It is ignored`));
        return [];
    } else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, AISystem.StableDiffusion, variables);
    }
    return [];
 }


// SNIPPETS -------------------------------------------------------------------------------
/**
 * Genenerate the prompt of a snippet `Snippet`
 * 
 * @param snippet Snippet
 * @param variables 
 * @returns 
 */
export function genSnippet_base(snippet: Ast.Snippet, variables?:Map<string,string>): string {
    

    const text = genBaseSnippet_base(snippet.content, variables);
    
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

export function genBaseSnippet_base(snippet: Ast.BaseSnippet, variables?:Map<string,string>,
    snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; (arg0: Ast.Snippet, arg1: Map<string, string> | undefined): string; }){
    
    if (! snippet_function){
        snippet_function = genSnippet_base;
    }
    if (Ast.isTextLiteral(snippet)) {
        return ((snippet as unknown) as Ast.TextLiteral).content;
    } else if (Ast.isInputRef(snippet)) {
        return genInputRef(snippet, variables)
    } else if (Ast.isConditional(snippet)) { 
        return genConditional(snippet,variables);
    } else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet,AISystem.StableDiffusion, variables); 
    }  // TRAITS
    // The traits with the atribute `content` need to know which snippet function to ensure compatibilty to possible calls from the specific files
    else if (Ast.isTrait(snippet)){
        return df.genTraits_default(snippet,variables, genSnippet_base);
    }
    return "";
}

/**
 * Generates the text related to a parameter (usally by getting the value given to it)
 * @param snippet Paramater Ref
 * @param variables Mappping of the assets' varaibles and their value
 * @returns 
 */
export function genParameterRef_base(snippet: Ast.ParameterRef,variables?: Map<string,string>){
    if (!variables){
        return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;}
    else{
        return variables.get(((snippet as unknown) as Ast.ParameterRef).param.$refText) as string;}
}

/**
 * Generates the text related to an Input (a paramter or a metadata), usally by getting the value given to it
 * @param snippet InputRef
 * @param variables Mappping of the assets' varaibles and their value
 * @returns 
 */
export function genInputRef(snippet: Ast.InputRef,variables?: Map<string,string>){
    if (Ast.isParameterRef(snippet)){
        return genParameterRef_base(snippet,variables)
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
 * Generates the prompt text associated with a conditional snippet
 * @param snippet Conditional Snippet
 * @param variables Mappping of the assets' varaibles and their value
 * @returns 
 */
export function genConditional(snippet: Ast.Conditional,variables?: Map<string,string>){
    let value = genInputRef(snippet.param,variables)
    if (value == snippet.condition){
        return genSnippet_base(snippet.result,variables);
    } else{
        if (snippet.neg_result){
            return genSnippet_base(snippet.neg_result, variables);
        }else return ""
    }
}

// TRAITS -------------------------------------------------------------------------------

