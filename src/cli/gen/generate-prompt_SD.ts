import chalk from 'chalk';
import * as Ast from '../../language-server/generated/ast';
import { get_file_from, get_line_node } from '../cli-util';
import { AISystem, extractMedium, genAssetReuse, genImportedAsset } from './generate-prompt';
import * as df from './generate-prompt_default';

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
export function generatePrompt_SD(model: Ast.Model, prompt: Ast.Prompt | undefined, variables?: string[]): string[] {
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
                return genAsset_SD(lastPrompt, map).filter(e => e !== undefined) as string[];     
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
        
        let separator = ', '; // Default seperator,
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
            text = ( medium == undefined ? [] : [ medium, " of " ] ); // SD supports more than one medium
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
        const negative = ["\nNegative prompt:\n"].concat(negative_prompt);
        return positive.concat(['\n'], negative);
    } else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_SD(snippet,variables)).filter(e => e !== undefined) as string[];;
    } else if (Ast.isChain(asset)) {
        let line = get_line_node(asset);
        let file = get_file_from(asset); 
        console.log(chalk.yellow(`[${file}]-Warning in line ${line}: Chain assets are not yet implemented for StableDiffusion. It is ignored`));
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
export function genSnippet_SD(snippet: Ast.Snippet, variables?:Map<string,string>): string {
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
        return genParameterRef(snippet, variables)
    } else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet,AISystem.StableDiffusion, variables); 
    } else if (Ast.isTrait(snippet)){ 
        if (Ast.isNegativeTrait(snippet)) {
            return genNegativeTrait(snippet)
        } else if (Ast.isCombinationTrait(snippet)) {
            return genCombinationTrait_SD(snippet,variables);
        } else if (Ast.isMediumTrait(snippet)) {
            return genMediumTrait_SD(snippet);
        } else if (Ast.isCameraAngleTrait(snippet)) {
            return genCameraAngleTrait_SD(snippet);
        } else if (Ast.isProximityTrait(snippet)) {
            return genProximityTrait_SD(snippet);
        } else if (Ast.isLightingTrait(snippet)) {
            return genLightingTrait_SD(snippet); 
        }else{
            return df.genTraits_default(snippet,variables,genSnippet_SD)
        }
    }
    
    
    
   return "";
}


function genCombinationTrait_SD(snippet: Ast.CombinationTrait,variables?:Map<string,string>): string  {
    const contents  = snippet.contents;
    const texts     = contents.flatMap(subSnippet => genSnippet_SD(subSnippet,variables)).filter(e => e !== undefined) as string[];
    const cleanTexts  = texts.filter(function(e){return e}); // remove empty elements from array
    return "a combination of " + cleanTexts.slice(0, -1).join(',')+' and '+cleanTexts.slice(-1);
    //combineStrings(texts, ", ", " and ");
}

function genCameraAngleTrait_SD(snippet: Ast.CameraAngleTrait): string  {
    return df.genCameraAngleTrait_default(snippet)
}

function genProximityTrait_SD(snippet: Ast.ProximityTrait): string  {
    return df.genProximityTrait_default(snippet);
}

function genLightingTrait_SD(snippet: Ast.LightingTrait): string  {
    return df.genLightingTrait_default(snippet)
}

function genMediumTrait_SD(snippet: Ast.MediumTrait): string {
    const text  = snippet.value;
    return text;
}

function genParameterRef(snippet: Ast.ParameterRef,variables?: Map<string,string>){
    if (!variables){
        return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;}
    else{
        return variables.get(((snippet as unknown) as Ast.ParameterRef).param.$refText) as string;}
}
 function genNegativeTrait(snippet:Ast.NegativeTrait){
    let file = get_file_from(snippet);
    let line = get_line_node(snippet);
    console.log(chalk.yellow(`[${file}]- Warning in line ${line}: A Negative Trait should not exist in StableDiffusion`));
    return ""; // the Negative Traits in SD are in the Negative Prompt part, as an ordinary Trait
 }