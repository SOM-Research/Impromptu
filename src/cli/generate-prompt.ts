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

export const AISystem = {
	ChatGPT: "chatgpt",
	StableDiffusion: "stable-diffusion",
    Midjourney: "midjourney"
}

export function generatePromptCode(model: Ast.Model, aiSystem: string | undefined, prompt: Ast.Prompt | undefined): string[] | undefined {
    var result;
    switch(aiSystem) {
        case AISystem.Midjourney: {
            result = generatePrompt_MJ(model, prompt).filter(e => e !== '\n').filter(function(e){return e});
            break;
        }
        case AISystem.StableDiffusion: {   
            result = generatePrompt_SD(model, prompt).filter(e => e !== '\n').filter(function(e){return e});
            break;
        }
        case AISystem.ChatGPT: {
            result = generatePrompt_ChatGPT(model, prompt);
            break;
        }
        case undefined: {
            console.log(chalk.yellow(`No target provided. Using 'chatgpt' by default`));
            result = generatePrompt_ChatGPT(model, prompt); 
            break;
        }
        default: {
            console.log(chalk.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
        }
    }
    return result;
}

export function generatePromptValidators(model: Ast.Model, prompt: Ast.Prompt) {
    const core = (prompt.core.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c)) as unknown) as Ast.Trait[];
    const preffix = ((prompt.prefix) ? (prompt.prefix.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c)) as unknown) as Ast.Trait[] : []);
    const suffix = ((prompt.suffix) ? (prompt.suffix.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c)) as unknown) as Ast.Trait[] : []);
    const snippets = core.concat(preffix).concat(suffix);
    let result = [{trait: '', condition: ''}];
    snippets.forEach(s => {
        // traits with value
        if (Ast.isTextTrait(s)) { // || Ast.isImageTrait(s)) {
            if (s.validator)
                result.push({ trait: s.value, condition: genValidatorPrompt(model, s.validator?.$refText)});
        }
    })
    return result.filter(t => t.condition); //snippets.flatMap(s => ({trait: s.value, condition: genValidatorPrompt(model, s.validator?.$refText)})).filter(function(e){return e});
}

function genValidatorPrompt(model: Ast.Model, prompt: string | undefined): string {
    if (prompt) {
        const asset = model.assets.filter(a => Ast.isPrompt(a)).filter(a => a.name == prompt)[0] as Ast.Prompt;
        return genAsset_ChatGPT(asset).join('.');
    }
    return '';
}

export function generatePrompt(model: Ast.Model, filePath: string, destination: string | undefined, aiSystem: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.txt`;

    if (!fs.existsSync(data.destination)) {
        fs.mkdirSync(data.destination, { recursive: true });
    }

    // TODO: should the third parameter be replaced by an actual prompt name
    // or indicator to collect all prompts?
    var result = generatePromptCode(model, aiSystem, undefined);

    if (result != null) {
        fs.writeFileSync(generatedFilePath, result.toString());
    }

    return generatedFilePath;
}

export function getPromptsList(model: Ast.Model) {
    return model.assets.map(asset => getAssetDescription(asset)).filter(e => e !== undefined);
}

function getAssetDescription(asset: Ast.Asset) {
    if (Ast.isPrompt(asset)) return { name: asset.name, description: asset.description};
    else return undefined;
}

function generatePrompt_MJ(model: Ast.Model, prompt: Ast.Prompt | undefined): string[] {
    // Generate a prompt for each asset
    // return model.assets.flatMap(asset => genAsset_MJ(asset)).filter(e => e !== undefined) as string[];
    // Generate the single requested prompt
    if (prompt)
       return genAsset_MJ(prompt).filter(e => e !== undefined) as string[];
    // Generate a prompt for each asset
    else {
       return model.assets.flatMap(asset => genAsset_MJ(asset)).filter(e => e !== undefined) as string[];
    }
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

function generatePrompt_SD(model: Ast.Model, prompt: Ast.Prompt | undefined): string[] {
    // Generate the single requested prompt
    if (prompt)
       return genAsset_SD(prompt).filter(e => e !== undefined) as string[];
    // Generate a prompt for each asset
    else {
       return model.assets.flatMap(asset => genAsset_SD(asset)).filter(e => e !== undefined) as string[];
    }
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

function generatePrompt_ChatGPT(model: Ast.Model, prompt: Ast.Prompt | undefined): string[] {
    // Generate the single requested prompt
    if (prompt) {
        return genAsset_ChatGPT(prompt);
    // Generate a prompt for each asset
    } else {
        const prompts = model.assets.flatMap(asset => genAsset_ChatGPT(asset)).filter(e => e !== undefined);
        return [prompts.filter(function(e){return e}).join('. ')];
    }
}

function genAsset_ChatGPT(asset: Ast.Asset): string[] {
    if (Ast.isPrompt(asset)) {
        const preffix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)) as string[] : []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)) as string[] : []);
        const core  = asset.core.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet));
        
        // Build the final prompt
        const prompt = preffix.concat(core, suffix);

        return [prompt.filter(function(e){return e}).join('. ')];

    } else if (Ast.isComposer(asset)) {
        return [];
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
    } else if (Ast.isLanguageRegisterTrait(snippet)) {
        return "Use a " + snippet.value + " register";
    } else if (Ast.isLiteraryStyleTrait(snippet)) {
        return "Write your answer as a " + snippet.value;
    } else if (Ast.isPointOfViewTrait(snippet)) {
        return "Write your answer in " + snippet.value;
    }
    // } else if (Ast.isParameterRef(snippet)) {
    //     return "" ;
    // } else if (Ast.isAssetReuse(snippet)) {
    //     return "";
    // } else if (Ast.isNegativeTrait(snippet)) {
    //     return "";
    // } else if (Ast.isCombinationTrait(snippet)) {
    //     return "";
    // } else if (Ast.isAudienceTrait(snippet)) {
    //     return "";
    // } else if (Ast.isMediumTrait(snippet)) {
    //     return "";
    // }
    return "";
}