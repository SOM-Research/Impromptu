import chalk from 'chalk';
import * as Ast from '../language-server/generated/ast';
import { get_file_from, get_line_node } from './cli-util';
import { AISystem, genAssetReuse, genImportedAsset } from './generate-prompt';

/** Generate a prompt for each asset (Generate the single requested prompt). 
 *
 *   @param model 
 *   @param prompt 
 *   @param variables Variables transmitted by command line.
 *   @param promptName Prompt transmitted by command line. If it is not declared, `variables` are used in the last prompt of the document
 *   @returns string[]. The solutions of different assets are divided by dots
 */

export function generatePrompt_ChatGPT(model: Ast.Model, prompt: Ast.Prompt | undefined, variables?: string[],promptName?:string): string[] {
    // Generate the single requested prompt
    
    if (prompt){
        const parameters= prompt.pars 
        if (!variables) variables=[];
        if(!variables && !parameters){ // No variables were announced
            return genAsset_ChatGPT(prompt).filter(e => e !== undefined) as string[];
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
            let line = get_line_node(prompt);
            let file = get_file_from(prompt);
            console.log(`[${file}]-Error in line ${line}: The number of values and variables of the prompt does not match.`);
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
                let line = get_line_node(lastPrompt)
                let file = get_file_from(lastPrompt);
                console.log(`[${file}]-Error in line ${line}: The number of values and variables of the prompt does not match.`);
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
        let separator = '. ';
        if (asset.separator !== undefined){
            separator = asset.separator;
        }
        const snippets = (asset.contents!= null ? asset.contents.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet, variables)) as string[] : []); 
        return [snippets.filter(function(e){return e}).join(separator)];
    } else if (Ast.isChain(asset)) {
        let file = get_file_from(asset);
        let line = get_line_node(asset);
        console.log(chalk.yellow(`[${file}]- Warning in line ${line}: Chains are not implemented in ChatGPT yet. Its prompt will be omitted.`));
        return [""];
    } else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, AISystem.ChatGPT, variables);
    }
    console.log(chalk.yellow(`Unkwonw asset`));
    return [];
 }

 /**
  * Generate the prompt of a Snippet in ChatGPT.
  * @param snippet 
  * @param variables 
  * @returns 
  */
export function genSnippet_ChatGPT(snippet: Ast.Snippet, variables?: Map <string, string>): string {
    if (snippet.weight){
        let file = get_file_from(snippet);
        let line = get_line_node(snippet);
        console.log(chalk.yellow(`[${file}]- Warning in line ${line}: Weights of a snippet are not implemented in ChatGPT yet. Its prompt will be omitted.`));
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
        return genTextLiteral(snippet);
    } else if (Ast.isLanguageRegisterTrait(snippet)) {
        return genLanguageRegister(snippet);
    } else if (Ast.isLiteraryStyleTrait(snippet)) {
        return genLiteraryStyle(snippet);
    } else if (Ast.isPointOfViewTrait(snippet)) {
        return genPoinOfView(snippet);
    }else if (Ast.isParameterRef(snippet)) {
        return genParameterRef(snippet,variables);
    }else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet, AISystem.ChatGPT, variables)
    }else if (Ast.isNegativeTrait(snippet)) {
        return genNegativeTait(snippet,variables);
    }else if (Ast.isComparisonTrait(snippet)) {
        return genComparisonTrait(snippet, variables);
    }
    // } else if (Ast.isCombinationTrait(snippet)) {
    //     return "";
    else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait(snippet, variables);
    }
    // } else if (Ast.isMediumTrait(snippet)) {
    //     return "";
    // }
    else{
        let file = get_file_from(snippet);
        let line = get_line_node(snippet);
        console.log(chalk.yellow(`[${file}]- Warning in line ${line}: ${snippet.$type} snippets are not implemented in ChatGPT yet.Its prompt will be omitted.`));
    }return"";
}

function genTextLiteral(snippet:Ast.TextLiteral){
    return snippet.content;
}

function genLanguageRegister(snippet:Ast.LanguageRegisterTrait){
    return "The answer is written using a " + snippet.value + " register";
}

function genLiteraryStyle(snippet:Ast.LiteraryStyleTrait){
    return "The answer is written as a " + snippet.value;
}

function genPoinOfView(snippet:Ast.PointOfViewTrait){
    return "The answer is written in " + snippet.value;
}

function genParameterRef(snippet: Ast.ParameterRef,variables?: Map<string,string>){
    if (!variables){
        return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;}
    else{
        return variables.get(((snippet as unknown) as Ast.ParameterRef).param.$refText) as string;}
}

function genNegativeTait(snippet:Ast.NegativeTrait, variables?: Map<string,string>){
    return "Avoid " + genSnippet_ChatGPT(snippet.content, variables);
}

function genComparisonTrait(snippet:Ast.ComparisonTrait,variables?: Map<string,string>){
    return genSnippet_ChatGPT(snippet.content1, variables) + " is more " + genSnippet_ChatGPT(snippet.comparison, variables) + " than " +genSnippet_ChatGPT(snippet.content2, variables)
}

function genAudienceTrait(snippet:Ast.AudienceTrait,variables?: Map<string,string>){
    return "The activity is intended for the following audience: " + genSnippet_ChatGPT(snippet.content, variables)
}