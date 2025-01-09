import chalk from 'chalk';
import * as Ast from '../../language-server/generated/ast';
import { get_file_from, get_line_node } from '../cli-util';
import { AISystem, extractMedium, genAssetReuse, genImportedAsset } from './generate-prompt';

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
export function generatePrompt_default(model: Ast.Model, prompt: Ast.Prompt | undefined, variables?: string[]): string[] {
    // Generate the single requested prompt

    
    if (prompt){
        const parameters= prompt.pars
        if (!variables) variables=[];
        if(!variables && !parameters){// No variables were announced
            return genAsset_default(prompt).filter(e => e !== undefined) as string[];
        }
        else if (parameters.pars.length == variables?.length){  
            var map = new Map<string,string>()
            // Create Mapping
            for (let i = 0; i < variables.length; i++){
                map.set(parameters.pars[i].name,variables[i])
            }
            
            return genAsset_default(prompt, map).filter(e => e !== undefined) as string[];
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
                return genAsset_default(lastPrompt, map).filter(e => e !== undefined) as string[];     
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
                if (asset.$container==model){return genAsset_default(asset)} else return undefined
            }).filter(e => e !== undefined) as string[];     
    }

    // Generate a prompt for each asset
    else {
        return model.assets.flatMap(asset => 
            {if (asset.$container==model){return genAsset_default(asset)} else return undefined
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
export function genAsset_default(asset: Ast.Asset, variables?: Map<string,string>): string[] {
    if (Ast.isPrompt(asset)) {
        let separator = ', ';
        if (asset.separator !== undefined){
            separator = asset.separator;
        }
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_default(snippet,variables)).filter(e => e !== undefined) as string[]: []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_default(snippet,variables)).filter(e => e !== undefined) as string[]: []);
        
        // Prompt structure: [medium] of [subject] [modifiers]
        // Extract the medium, if there is any, and put it in the front
        const medium = extractMedium(asset.core.snippets);
        var text = [];
        if (asset.core.snippets.length > 1) {
            text = ( medium == undefined ? [] : [ medium, " of " ] );
        } else {
            text = ( medium == undefined ? [] : [ medium ] );
        }

        var core  = asset.core.snippets.flatMap(snippet => genSnippet_default(snippet,variables)).filter(e => e !== undefined) as string[];
        let prompt = prefix.concat(text, core, suffix);
        return [prompt.filter(function(e){return e}).join(separator)];
    } else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_default(snippet,variables)).filter(e => e !== undefined) as string[];;
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
export function genSnippet_default(snippet: Ast.Snippet, variables?:Map<string,string>): string {
    

    const text = genBaseSnippet_default(snippet.content, variables);
    
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

export function genBaseSnippet_default(snippet: Ast.BaseSnippet, variables?:Map<string,string>,
    snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; (arg0: Ast.Snippet, arg1: Map<string, string> | undefined): string; }){
    
    if (! snippet_function){
        snippet_function = genSnippet_default;
    }
    if (Ast.isTextLiteral(snippet)) {
        return ((snippet as unknown) as Ast.TextLiteral).content;
    } else if (Ast.isParameterRef(snippet)) {
        return genParameterRef_default(snippet, variables)
    } else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet,AISystem.StableDiffusion, variables); 
    } 
    // TRAITS
    // The traits with the atribute `content` need to know witch snippet function to ensure compatibilty to possible calls from the specific files
    // Negative
    else if (Ast.isNegativeTrait(snippet)) {
        return genNegativeTrait_default(snippet, variables, snippet_function);
    }
    // Combination
    else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_default(snippet,variables,snippet_function);
    }
    // Audience
    else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_default(snippet,snippet_function);
    }
    else if (Ast.isComparisonTrait(snippet)) {
        return genComparisonTrait_default(snippet, variables,snippet_function);
    }
    
    else if (Ast.isIncludesTrait(snippet)) {
        return genIncludesTrait_default(snippet, variables,snippet_function);
    }
    else if (Ast.isSimilarToTrait(snippet)) {
        return genSimilarToTrait_default(snippet, variables,snippet_function);
    }else if (Ast.isByAuthorTrait(snippet)) {
        return genByAuthorTrait_default(snippet);
    }else if (Ast.isTargetSizeTrait(snippet)) {
        return genTargetSizeTrait_default(snippet);
    }
    // Madium
    else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_default(snippet);
    }
    // Language Register
    else if (Ast.isLanguageRegisterTrait(snippet)) {
        return genLanguageRegister_default(snippet);
    }
    // Literary Style
    else if (Ast.isLiteraryStyleTrait(snippet)) {
        return genLiteraryStyle_default(snippet);
    }
    // Point of View
    else if (Ast.isPointOfViewTrait(snippet)) {
        return genPoinOfView_default(snippet);
    }
    // Camera Angle
    else if (Ast.isCameraAngleTrait(snippet)) {
        return genCameraAngleTrait_default(snippet);
    }
    // Proximity
    else if (Ast.isProximityTrait(snippet)) {
        return genProximityTrait_default(snippet);
    }
     // Effects
    else if (Ast.isEffectsTrait(snippet)) {
        return genEffectsTrait_default(snippet);
    }
     // Camera Settings
     else if (Ast.isCameraSettingsTrait(snippet)) {
        return genCameraSettingsTrait_default(snippet);
    }
    // Lighting
    else if (Ast.isLightingTrait(snippet)) {
        return genLightingTrait_default(snippet);
    }
   return "";
}

export function genParameterRef_default(snippet: Ast.ParameterRef,variables?: Map<string,string>){
    if (!variables){
        return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;}
    else{
        return variables.get(((snippet as unknown) as Ast.ParameterRef).param.$refText) as string;}
}


// TRAITS -------------------------------------------------------------------------------

// General Trait
// Multiple Contents traits
export function genCombinationTrait_default(snippet:Ast.CombinationTrait, variables?: Map<string,string>,
     snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; }){
    if (! snippet_function){
        snippet_function = genSnippet_default;
    }
    const contents  = snippet.contents;
    const texts     = contents.flatMap(subSnippet => {
        if(snippet_function)  
            return snippet_function(subSnippet,variables); 
        else return ""
    }).filter(e => e !== undefined) as string[];
    const cleanTexts  = texts.filter(function(e){return e}); // remove empty elements from array}
    return "a combination of " + cleanTexts.slice(0, -1).join(',')+' and '+cleanTexts.slice(-1);
}


function genComparisonTrait_default(snippet:Ast.ComparisonTrait, variables?: Map<string,string>,
    snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; }){
    if (! snippet_function){
        snippet_function = genSnippet_default;
    }
    return snippet_function(snippet.content1, variables) + " is more " + snippet_function(snippet.comparison, variables) + " than " +genSnippet_default(snippet.content2, variables)
}

export function genIncludesTrait_default(snippet: Ast.IncludesTrait, variables?: Map<string, string>,
    snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string;} ){
    if (! snippet_function){
        snippet_function = genSnippet_default;
    }
    const contents  = snippet.contents;
    const texts     = contents.flatMap(subSnippet => {
        if(snippet_function)  
            return snippet_function(subSnippet,variables); 
        else return ""
    }).filter(e => e !== undefined) as string[];
    const cleanText  = texts.filter(function(e){return e}); // remove empty elements from array
    return "Contents:"+ cleanText.join(", "); // TODO
}

export function genSimilarToTrait_default(snippet: Ast.SimilarToTrait, variables?: Map<string, string>,
    snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; (arg0: Ast.Snippet, arg1: Map<string, string> | undefined): string; }){
    if (! snippet_function){
        snippet_function = genSnippet_default;
    }
    const content  = snippet.content;
    const text     = snippet_function(content);
    return "The answers has to be resemble " + text;
}

// Single-content traits
export function genNegativeTrait_default(snippet:Ast.NegativeTrait, variables?: Map<string, string>,
        snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; (arg0: Ast.Snippet, arg1: Map<string, string> | undefined): string; }){
    if (! snippet_function){
        snippet_function = genSnippet_default;
    }
    return "no" + snippet_function(snippet.content).toString();
}

export function genAudienceTrait_default(snippet: Ast.AudienceTrait,
        snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; (arg0: Ast.Snippet, arg1: Map<string, string> | undefined): string; }){
    if (! snippet_function){
        snippet_function = genSnippet_default;
    }
    const content  = snippet.content;
    const text     = snippet_function(content);
    return "for " + text;
}


export function genTargetSizeTrait_default(snippet: Ast.TargetSizeTrait,
        snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; (arg0: Ast.Snippet, arg1: Map<string, string> | undefined): string; }){
    if (! snippet_function){
        snippet_function = genSnippet_default;
    }
    return `The answer should consists of ${snippet.type} ${snippet.amount} ${snippet.unit} of ${snippet.dimension}`; // TODO
    }

// Basic Traits: They do not have `content` => Their values does not depend on a snippet
export function genByAuthorTrait_default(snippet: Ast.ByAuthorTrait){
const text  = snippet.value;
return "imitate " + text+" style";
}

// Picture Traits
export function genCameraAngleTrait_default(snippet: Ast.CameraAngleTrait): string  {
    const text = snippet.value
    return "from a " + text;
}

export function genProximityTrait_default(snippet: Ast.ProximityTrait): string  {
    const text = snippet.value
    return text +" picture";
}
export function genLightingTrait_default(snippet: Ast.LightingTrait): string  {
    const text = snippet.value
    return text +" lighting";
}

export function genMediumTrait_default(snippet: Ast.MediumTrait): string {
    const text  = snippet.value;
    return "Style:"+text;
}

export function genEffectsTrait_default(snippet:Ast.EffectsTrait){
    const text  = snippet.value;
    return text+" effect"
}

export function genCameraSettingsTrait_default(snippet:Ast.CameraSettingsTrait){
    const text  = snippet.value;
    return "Pretend the picture was was taken with a camera with "+text+" effect"
}

// Text Traits
export function genLanguageRegister_default(snippet:Ast.LanguageRegisterTrait){
    const text  = snippet.value;
    return "The answer is written using a " + text+ " register";
}

export function genLiteraryStyle_default(snippet:Ast.LiteraryStyleTrait){
    const text  = snippet.value;
    return "The answer is written as a " + text;
}
export function genPoinOfView_default(snippet:Ast.PointOfViewTrait){
    const text  = snippet.value;
    return "The answer is written in " + text;
}


export function genTraits_default(trait:Ast.Trait, variables?:Map<string,string>,snippet_function?: { (snippet: Ast.Snippet, variables?: Map<string, string>): string; (arg0: Ast.Snippet, arg1: Map<string, string> | undefined): string; }){
    return genBaseSnippet_default(trait,variables,snippet_function);
}