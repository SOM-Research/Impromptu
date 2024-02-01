"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePrompt = exports.generatePromptCode = void 0;
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
//import AbstractFormatter from 'langium';
//import { CompositeGeneratorNode, NL, toString } from 'langium';
const path_1 = __importDefault(require("path"));
const Ast = __importStar(require("../language-server/generated/ast"));
/* import  { Model, Asset, Snippet, CombinationTrait, NegativeTrait, AudienceTrait, MediumTrait,
         isPrompt, isChain,
         isComposer, isTextLiteral, isParameterRef, isAssetReuse, isNegativeTrait,
         isCombinationTrait, isAudienceTrait, isMediumTrait } from '../language-server/generated/ast';
         */
const cli_util_1 = require("./cli-util");
function generatePromptCode(model, aiSystem) {
    var result;
    switch (aiSystem) {
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
            console.log(chalk_1.default.yellow(`No target provided. Using 'midjourney' by default`));
            result = generatePrompt_MJ(model);
            break;
        }
        default: {
            console.log(chalk_1.default.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
        }
    }
    return result;
}
exports.generatePromptCode = generatePromptCode;
function generatePrompt(model, filePath, destination, aiSystem) {
    const data = (0, cli_util_1.extractDestinationAndName)(filePath, destination);
    const generatedFilePath = `${path_1.default.join(data.destination, data.name)}.txt`;
    if (!fs_1.default.existsSync(data.destination)) {
        fs_1.default.mkdirSync(data.destination, { recursive: true });
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
        fs_1.default.writeFileSync(generatedFilePath, result.toString());
    }
    return generatedFilePath;
}
exports.generatePrompt = generatePrompt;
function generatePrompt_MJ(model) {
    // Generate a prompt for each asset
    return model.assets.flatMap(asset => genAsset_MJ(asset)).filter(e => e !== undefined);
}
function genAsset_MJ(asset) {
    if (Ast.isPrompt(asset)) {
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_MJ(snippet)).filter(e => e !== undefined) : []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_MJ(snippet)).filter(e => e !== undefined) : []);
        // Prompt structure: [medium] of [subject] [modifiers]
        // Extract the medium, if there is any, and put it in the front
        const medium = extractMedium(asset.core.snippets);
        var text = [];
        if (asset.core.snippets.length > 1) {
            text = (medium == undefined ? [] : [medium, " of "]);
        }
        else {
            text = (medium == undefined ? [] : [medium]);
        }
        var core = asset.core.snippets.flatMap(snippet => genSnippet_MJ(snippet)).filter(e => e !== undefined);
        return prefix.concat(text, core, suffix);
    }
    else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_MJ(snippet)).filter(e => e !== undefined);
    }
    else if (Ast.isChain(asset)) {
        return [];
    }
    return [];
}
function extractMedium(snippets) {
    const mediumOnly = snippets.filter(s => Ast.isMediumTrait(s.content));
    const medium = mediumOnly;
    if (mediumOnly.length == 0) {
        return undefined;
    }
    else if (mediumOnly.length > 1) {
        console.log(chalk_1.default.yellow(`Multiple 'medium' specified in the prompt. Using the first one.`));
    }
    return medium[0].value;
}
function genSnippet_MJ(snippet) {
    const text = genBaseSnippet_MJ(snippet.content);
    if (snippet.weight != null) {
        switch (snippet.weight.relevance) {
            case 'min': {
                return text + "::0.2";
            }
            case 'low': {
                return text + "::0.5";
            }
            case 'medium': {
                return text;
            }
            case 'high': {
                return text + "::2";
            }
            case 'max': {
                return text + "::3";
            }
            default: {
                return "";
            }
        }
    }
    else {
        return text;
    }
}
function genBaseSnippet_MJ(snippet) {
    if (Ast.isTextLiteral(snippet)) {
        return snippet.content;
    }
    else if (Ast.isParameterRef(snippet)) {
        return snippet.param.$refText;
    }
    else if (Ast.isAssetReuse(snippet)) {
        return "";
    }
    else if (Ast.isNegativeTrait(snippet)) {
        return genNegativeTrait_MJ(snippet);
    }
    else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_MJ(snippet);
    }
    else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_MJ(snippet);
    }
    else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_MJ(snippet);
    }
    return "";
}
function genNegativeTrait_MJ(snippet) {
    return "--no " + genSnippet_SD(snippet.content).toString();
}
function genCombinationTrait_MJ(snippet) {
    const contents = snippet.contents;
    const texts = contents.flatMap(subSnippet => genSnippet_SD(subSnippet)).filter(e => e !== undefined);
    const cleanText = texts.filter(function (e) { return e; }); // remove empty elements from array
    return "[" + cleanText.join(" : ") + " :0.5]";
    //combineStrings(texts, " : ", " : ") + " :0.5]";
}
function genAudienceTrait_MJ(snippet) {
    const content = snippet.content;
    const text = genSnippet_SD(content);
    return "for " + text;
}
function genMediumTrait_MJ(snippet) {
    const text = snippet.value;
    return text;
}
function generatePrompt_SD(model) {
    // Generate a prompt for each asset
    return model.assets.flatMap(asset => genAsset_SD(asset)).filter(e => e !== undefined);
}
function genAsset_SD(asset) {
    if (Ast.isPrompt(asset)) {
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_SD(snippet)).filter(e => e !== undefined) : []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_SD(snippet)).filter(e => e !== undefined) : []);
        // Prompt structure: 
        // Positive prompt: [medium] of [subject] [modifiers]
        // Negative prompt: [negative modifiers]
        // - Extract the medium, if there is any, and put it in the front
        // - Extract the negative modifiers, if there are any, and process them separately
        const medium = extractMedium(asset.core.snippets);
        var text = [];
        if (asset.core.snippets.length > 1) {
            text = (medium == undefined ? [] : [medium, " of "]);
        }
        else {
            text = (medium == undefined ? [] : [medium]);
        }
        const core = asset.core.snippets.flatMap(snippet => genSnippet_SD(snippet)).filter(e => e !== undefined);
        const negativeModifiers = extractNegativeModifiers(asset.core.snippets);
        const negativeText = negativeModifiers.flatMap(snippet => genSnippet_SD(snippet.content.content)).filter(e => e !== undefined);
        // Build the final prompt
        const positive = ["Positive prompt:\n"].concat(prefix, text, core, suffix);
        const negative = ["Negative prompt:\n"].concat(negativeText);
        return positive.concat(['\n'], negative);
    }
    else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_SD(snippet)).filter(e => e !== undefined);
        ;
    }
    else if (Ast.isChain(asset)) {
        return [];
    }
    return [];
}
function extractNegativeModifiers(snippets) {
    const negative = snippets.filter(s => Ast.isNegativeTrait(s.content));
    return negative;
}
function genSnippet_SD(snippet) {
    const text = genBaseSnippet_SD(snippet.content);
    if (snippet.weight != null) {
        switch (snippet.weight.relevance) {
            case 'min': {
                return "[[" + text + "]]";
            }
            case 'low': {
                return "[" + text + "]";
            }
            case 'medium': {
                return text;
            }
            case 'high': {
                return "(" + text + ")";
            }
            case 'max': {
                return "((" + text + "))";
            }
            default: {
                return "";
            }
        }
    }
    else {
        return text;
    }
}
function genBaseSnippet_SD(snippet) {
    if (Ast.isTextLiteral(snippet)) {
        return snippet.content;
    }
    else if (Ast.isParameterRef(snippet)) {
        return snippet.param.$refText;
    }
    else if (Ast.isAssetReuse(snippet)) {
        return "";
    }
    else if (Ast.isNegativeTrait(snippet)) {
        return "";
    }
    else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_SD(snippet);
    }
    else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_SD(snippet);
    }
    else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_SD(snippet);
    }
    return "";
}
/* function genNegativeTrait_SD(snippet: Ast.NegativeTrait): string  {
    return genSnippet_SD(snippet.content).toString();
} */
function genCombinationTrait_SD(snippet) {
    const contents = snippet.contents;
    const texts = contents.flatMap(subSnippet => genSnippet_SD(subSnippet)).filter(e => e !== undefined);
    const cleanTexts = texts.filter(function (e) { return e; }); // remove empty elements from array
    return "a combination of " + cleanTexts.slice(0, -1).join(',') + ' and ' + cleanTexts.slice(-1);
    //combineStrings(texts, ", ", " and ");
}
function genAudienceTrait_SD(snippet) {
    const content = snippet.content;
    const text = genSnippet_SD(content);
    return "for " + text;
}
function genMediumTrait_SD(snippet) {
    const text = snippet.value;
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
function generatePrompt_ChatGPT(model) {
    // Generate a prompt for each asset
    const prompt = model.assets.flatMap(asset => genAsset_ChatGPT(asset)).filter(e => e !== undefined);
    return [prompt.filter(function (e) { return e; }).join('. ')];
}
function genAsset_ChatGPT(asset) {
    if (Ast.isPrompt(asset)) {
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)).filter(e => e !== undefined) : []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)).filter(e => e !== undefined) : []);
        const core = asset.core.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)).filter(e => e !== undefined);
        //const negativeModifiers = extractNegativeModifiers(asset.core.snippets);
        //const negativeText = negativeModifiers.flatMap(snippet => genSnippet_ChatGPT(((snippet.content as unknown) as Ast.NegativeTrait).content)).filter(e => e !== undefined) as string[];
        // Build the final prompt
        const prompt = prefix.concat(core, suffix);
        //const positive = ["Positive prompt:"].concat(prefix, core, suffix);
        //const negative = ["Negative prompt:"].concat(negativeText);
        //return positive.concat(['\n'], negative);
        return prompt;
    }
    else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet)).filter(e => e !== undefined);
        ;
    }
    else if (Ast.isChain(asset)) {
        return [];
    }
    return [];
}
function genSnippet_ChatGPT(snippet) {
    return genBaseSnippet_ChatGPT(snippet.content);
}
function genBaseSnippet_ChatGPT(snippet) {
    if (Ast.isTextLiteral(snippet)) {
        return snippet.content;
    }
    else if (Ast.isParameterRef(snippet)) {
        return snippet.param.$refText;
    }
    else if (Ast.isAssetReuse(snippet)) {
        return "";
    }
    else if (Ast.isNegativeTrait(snippet)) {
        return "";
    }
    else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_SD(snippet);
    }
    else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_SD(snippet);
    }
    else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_SD(snippet);
    }
    return "";
}
//# sourceMappingURL=generate-prompt.js.map