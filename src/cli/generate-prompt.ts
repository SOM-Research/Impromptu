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
import { extractDestinationAndName } from './cli-util';

export function generatePromptCode(model: Ast.Model, aiSystem: string | undefined): string[] | undefined {
    var result;
    switch(aiSystem) {
        case 'midjourney': {
            result = generatePrompt_MJ(model);
            break;
        }
        case 'stable-diffusion': {   
            result = generatePrompt_SD(model);
            break;
        }
        case 'chatgpt': {
            result = generatePrompt_ChatGPT(model);
            break;
        }
        case undefined: {
            console.log(chalk.yellow(`No target provided. Using 'midjourney' by default`));
            result = generatePrompt_MJ(model); 
            break;
        }
        default: {
            console.log(chalk.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
        }
    }
    return result;
}

export function generatePrompt(model: Ast.Model, filePath: string, destination: string | undefined, aiSystem: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.txt`;

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }

    var result = generatePromptCode(model, aiSystem);
    // switch(aiSystem) {
    //     case 'midjourney': {
    //         result = generatePrompt_MJ(model);
    //         break;
    //     }
    //     case 'stable-diffusion': {   
    //         result = generatePrompt_SD(model);
    //         break;
    //     }
    //     case undefined: {
    //         console.log(chalk.yellow(`No target provided. Using 'midjourney' by default`));
    //         result = generatePrompt_MJ(model); 
    //         break;
    //     }
    //     default: {
    //         console.log(chalk.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
    //     }
    // } 

    if (result != null) {
        fs.writeFileSync(generatedFilePath, result.toString());
    }

    return generatedFilePath;
}

function generatePrompt_MJ(model: Ast.Model): string[] {
    // Generate a prompt for each asset
   return model.assets.flatMap(asset => genAsset_MJ(asset)).filter(e => e !== undefined) as string[];
}

function genAsset_MJ(asset: Ast.Asset): string[] {
    if (Ast.isPrompt(asset)) {
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_MJ(snippet)).filter(e => e !== undefined) as string[]: []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_MJ(snippet)).filter(e => e !== undefined) as string[]: []);
        
        // Prompt structure: [medium] of [subject] [modifiers]
        // Extract the medium, if there is any, and put it in the front
        const medium = extractMedium(asset.core.snippets);
        var text = [];
        if (asset.core.snippets.length > 1) {
            text = ( medium == undefined ? [] : [ medium, " of " ] );
        } else {
            text = ( medium == undefined ? [] : [ medium ] );
        }
        var core  = asset.core.snippets.flatMap(snippet => genSnippet_MJ(snippet)).filter(e => e !== undefined) as string[];
        return prefix.concat(text, core, suffix);
    } else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_MJ(snippet)).filter(e => e !== undefined) as string[];
    } else if (Ast.isChain(asset)) {
        return [];
    }
    return [];
 }

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

 function genSnippet_MJ(snippet: Ast.Snippet): string {
    const text = genBaseSnippet_MJ(snippet.content);
    
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


function genBaseSnippet_MJ(snippet: Ast.BaseSnippet): string {
    if (Ast.isTextLiteral (snippet)) {
        return ((snippet as unknown) as Ast.TextLiteral).content;
    } else if (Ast.isParameterRef(snippet)) {
        return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;
    } else if (Ast.isAssetReuse(snippet)) {
        return "";
    } else if (Ast.isNegativeTrait(snippet)) {
        return genNegativeTrait_MJ(snippet);
    } else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_MJ(snippet);
    } else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_MJ(snippet);
    } else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_MJ(snippet);
    }
   return "";
}

function genNegativeTrait_MJ(snippet: Ast.NegativeTrait): string {
    return "--no " + genSnippet_SD(snippet.content).toString();
}

function genCombinationTrait_MJ(snippet: Ast.CombinationTrait): string {
    const contents  = snippet.contents;
    const texts     = contents.flatMap(subSnippet => genSnippet_SD(subSnippet)).filter(e => e !== undefined) as string[];
    const cleanText = texts.filter(function(e){return e}); // remove empty elements from array
    return "[" + cleanText.join(" : ") + " :0.5]";
    //combineStrings(texts, " : ", " : ") + " :0.5]";
}

function genAudienceTrait_MJ(snippet: Ast.AudienceTrait): string {
    const content  = snippet.content;
    const text     = genSnippet_SD(content);
    return "for " + text;
}

function genMediumTrait_MJ(snippet: Ast.MediumTrait): string {
    const text  = snippet.value;
    return text;
}

function generatePrompt_SD(model: Ast.Model): string[] {
    // Generate a prompt for each asset
   return model.assets.flatMap(asset => genAsset_SD(asset)).filter(e => e !== undefined) as string[];
}

function genAsset_SD(asset: Ast.Asset): string[] {
    if (Ast.isPrompt(asset)) {
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_SD(snippet)).filter(e => e !== undefined) as string[]: []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_SD(snippet)).filter(e => e !== undefined) as string[]: []);
        
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
        
        const core  = asset.core.snippets.flatMap(snippet => genSnippet_SD(snippet)).filter(e => e !== undefined) as string[];
        
        const negativeModifiers = extractNegativeModifiers(asset.core.snippets);
        const negativeText = negativeModifiers.flatMap(snippet => genSnippet_SD(((snippet.content as unknown) as Ast.NegativeTrait).content)).filter(e => e !== undefined) as string[];

        // Build the final prompt
        const positive = ["Positive prompt:\n"].concat(prefix, text, core, suffix);
        const negative = ["Negative prompt:\n"].concat(negativeText);
        return positive.concat(['\n'], negative);
    } else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_SD(snippet)).filter(e => e !== undefined) as string[];;
    } else if (Ast.isChain(asset)) {
        return [];
    }
    return [];
 }

 function extractNegativeModifiers(snippets: Ast.Snippet[]): Ast.Snippet[] {
    const negative = snippets.filter(s => Ast.isNegativeTrait(s.content));
    return negative;
}


function genSnippet_SD(snippet: Ast.Snippet): string {
    const text = genBaseSnippet_SD(snippet.content);
    
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

function genBaseSnippet_SD(snippet: Ast.BaseSnippet): string {
    if (Ast.isTextLiteral(snippet)) {
        return ((snippet as unknown) as Ast.TextLiteral).content;
    } else if (Ast.isParameterRef(snippet)) {
        return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;
    } else if (Ast.isAssetReuse(snippet)) {
        return "";
    } else if (Ast.isNegativeTrait(snippet)) {
        return "";
    } else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_SD(snippet);
    } else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_SD(snippet);
    } else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_SD(snippet);
    } 
   return "";
}

/* function genNegativeTrait_SD(snippet: Ast.NegativeTrait): string  {
    return genSnippet_SD(snippet.content).toString();
} */

function genCombinationTrait_SD(snippet: Ast.CombinationTrait): string  {
    const contents  = snippet.contents;
    const texts     = contents.flatMap(subSnippet => genSnippet_SD(subSnippet)).filter(e => e !== undefined) as string[];
    const cleanTexts  = texts.filter(function(e){return e}); // remove empty elements from array
    return "a combination of " + cleanTexts.slice(0, -1).join(',')+' and '+cleanTexts.slice(-1);
    //combineStrings(texts, ", ", " and ");
}

function genAudienceTrait_SD(snippet: Ast.AudienceTrait): string  {
    const content  = snippet.content;
    const text     = genSnippet_SD(content);
    return "for " + text;
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

function generatePrompt_ChatGPT(model: Ast.Model): string[] {
    // Generate a prompt for each asset
   const prompt = model.assets.flatMap(asset => genAsset_ChatGPT(asset)).filter(e => e !== undefined) as string[];
   return [prompt.filter(function(e){return e}).join('. ')];
}

function genAsset_ChatGPT(asset: Ast.Asset): string[] {
    if (Ast.isPrompt(asset)) {
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)).filter(e => e !== undefined) as string[]: []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)).filter(e => e !== undefined) as string[]: []);
        
        const core  = asset.core.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)).filter(e => e !== undefined) as string[];
        
        //const negativeModifiers = extractNegativeModifiers(asset.core.snippets);
        //const negativeText = negativeModifiers.flatMap(snippet => genSnippet_ChatGPT(((snippet.content as unknown) as Ast.NegativeTrait).content)).filter(e => e !== undefined) as string[];

        // Build the final prompt
        const prompt = prefix.concat(core, suffix);
        //const positive = ["Positive prompt:"].concat(prefix, core, suffix);
        //const negative = ["Negative prompt:"].concat(negativeText);
        //return positive.concat(['\n'], negative);
        return prompt;
    } else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)).filter(e => e !== undefined) as string[];;
    } else if (Ast.isChain(asset)) {
        return [];
    }
    return [];
 }

 function genSnippet_ChatGPT(snippet: Ast.Snippet): string {
    return genBaseSnippet_ChatGPT(snippet.content);
}

 function genBaseSnippet_ChatGPT(snippet: Ast.BaseSnippet): string {
    if (Ast.isTextLiteral(snippet)) {
        return ((snippet as unknown) as Ast.TextLiteral).content;
    } else if (Ast.isParameterRef(snippet)) {
        return ((snippet as unknown) as Ast.ParameterRef).param.$refText ;
    } else if (Ast.isAssetReuse(snippet)) {
        return "";
    } else if (Ast.isNegativeTrait(snippet)) {
        return "";
    } else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_SD(snippet);
    } else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_SD(snippet);
    } else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_SD(snippet);
    } 
   return "";
}