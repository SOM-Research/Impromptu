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
exports.genBaseSnippet_ChatGPT = exports.genAsset_ChatGPT = exports.genBaseSnippet_SD = exports.genAsset_SD = exports.genAudienceTrait_MJ = exports.genBaseSnippet_MJ = exports.genAssetReuse = exports.genImportedAsset = exports.genAsset_MJ = exports.getPromptsList = exports.generatePrompt = exports.generatePromptTraitValidators = exports.generatePromptCode = exports.AISystem = void 0;
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
exports.AISystem = {
    ChatGPT: "chatgpt",
    StableDiffusion: "stable-diffusion",
    Midjourney: "midjourney"
};
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
function generatePromptCode(model, aiSystem, prompt, variables) {
    var result;
    switch (aiSystem) {
        case exports.AISystem.Midjourney: {
            result = generatePrompt_MJ(model, prompt, variables).filter(e => e !== '\n').filter(function (e) { return e; });
            break;
        }
        case exports.AISystem.StableDiffusion: {
            result = generatePrompt_SD(model, prompt, variables).filter(e => e !== '\n').filter(function (e) { return e; });
            break;
        }
        case exports.AISystem.ChatGPT: {
            result = generatePrompt_ChatGPT(model, prompt, variables);
            break;
        }
        case undefined: {
            console.log(chalk_1.default.yellow(`No target provided. Using 'chatgpt' by default`));
            result = generatePrompt_ChatGPT(model, prompt, variables);
            break;
        }
        default: {
            console.log(chalk_1.default.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
        }
    }
    return result;
}
exports.generatePromptCode = generatePromptCode;
function generatePromptTraitValidators(model, prompt) {
    const core = prompt.core.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c));
    const preffix = ((prompt.prefix) ? prompt.prefix.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c)) : []);
    const suffix = ((prompt.suffix) ? prompt.suffix.snippets.flatMap(s => s.content).filter(c => Ast.isTrait(c)) : []);
    const snippets = core.concat(preffix).concat(suffix);
    let result = [{ trait: '', condition: '' }];
    snippets.forEach(s => {
        // traits with value
        if (Ast.isTextTrait(s)) { // || Ast.isImageTrait(s)) {
            if (s.validator)
                if (!Ast.isSnippet(s.value))
                    result.push({ trait: s.value, condition: genBaseSnippet_ChatGPT(s) }); // s.validator}); //genTraitValidatorPrompt(model, s.validator?.$refText)});
                else {
                    result.push({ trait: '', condition: genBaseSnippet_ChatGPT(s) });
                }
        }
    });
    return result.filter(t => t.condition); //snippets.flatMap(s => ({trait: s.value, condition: genValidatorPrompt(model, s.validator?.$refText)})).filter(function(e){return e});
}
exports.generatePromptTraitValidators = generatePromptTraitValidators;
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
function generatePrompt(model, filePath, destination, aiSystem, variables, promptName) {
    const data = (0, cli_util_1.extractDestinationAndName)(filePath, destination);
    const generatedFilePath = `${path_1.default.join(data.destination, data.name)}.txt`;
    if (!fs_1.default.existsSync(data.destination)) {
        fs_1.default.mkdirSync(data.destination, { recursive: true });
    }
    if (promptName) {
        // Case a prompt were given
        const prompt = model.assets.find(element => element.name == promptName);
        if (Ast.isPrompt(prompt)) {
            var result = generatePromptCode(model, aiSystem, prompt, variables);
        }
        else {
            console.log(chalk_1.default.red(`An asset with that name does not exist`));
            throw new Error();
        }
    }
    else
        var result = generatePromptCode(model, aiSystem, undefined, variables);
    if (result != null) {
        fs_1.default.writeFileSync(generatedFilePath, result.join(' '));
    }
    return generatedFilePath;
}
exports.generatePrompt = generatePrompt;
function getPromptsList(model) {
    return model.assets.map(asset => genAssetDescription(asset)).filter(e => e !== undefined);
}
exports.getPromptsList = getPromptsList;
function genAssetDescription(asset) {
    if (Ast.isPrompt(asset))
        return { name: asset.name, description: asset.description };
    else
        return undefined;
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
function generatePrompt_MJ(model, prompt, variables) {
    // Generate the single requested prompt
    if (prompt) {
        const parameters = prompt.pars;
        if (!variables)
            variables = [];
        if ((variables === null || variables === void 0 ? void 0 : variables.length) && !parameters) { // No variables were announced
            return genAsset_MJ(prompt).filter(e => e !== undefined);
        }
        else if (parameters.pars.length == (variables === null || variables === void 0 ? void 0 : variables.length)) {
            var map = new Map();
            // Create Mapping
            for (let i = 0; i < variables.length; i++) {
                map.set(parameters.pars[i].name, variables[i]);
            }
            return genAsset_MJ(prompt, map).filter(e => e !== undefined);
        }
        else {
            console.log(chalk_1.default.red(`The number of values and variables of the prompt does not match.`));
            throw new Error(`The number of values and variables of the prompt does not match.`);
        }
    }
    else if (variables) {
        // There were given parameters but no prompt -> Last prompt
        const lastPrompt = model.assets[model.assets.length - 1];
        if (Ast.isPrompt(lastPrompt)) {
            console.log(chalk_1.default.yellow(`No prompt were given. Chosing the last one by default`));
            const paramaters = lastPrompt.pars;
            if (paramaters.pars.length == (variables === null || variables === void 0 ? void 0 : variables.length)) {
                var map = new Map();
                // Create Mapping
                for (let i = 0; i < variables.length; i++) {
                    map.set(paramaters.pars[i].name, variables[i]);
                }
                return genAsset_MJ(lastPrompt, map).filter(e => e !== undefined);
            }
            else {
                console.log(chalk_1.default.red(`The number of values and variables of the prompt does not match.`));
                throw new Error(`The number of values and variables of the prompt does not match.`);
            }
        }
        else
            return model.assets.flatMap(asset => { if (asset.$container == model) {
                return genAsset_MJ(asset);
            }
            else
                return undefined; }).filter(e => e !== undefined);
    }
    // Generate a prompt for each asset
    else {
        return model.assets.flatMap(asset => { if (asset.$container == model) {
            return genAsset_MJ(asset);
        }
        else
            return undefined; }).filter(e => e !== undefined);
    }
}
/**
 *  Generates the prompt in MidJourney related to an `Asset`, which more important elements are `prefix`, `core` and `suffix`
 *
 * @param asset Asset to be translated
 * @param variables map of the variables and their respective values (in case of being an AssetReuse call)
 * @returns string Array, where each element is the translation of each part of the Asset
 */
function genAsset_MJ(asset, variables) {
    if (Ast.isPrompt(asset)) {
        let separator = ', ';
        if (asset.separator !== undefined) {
            separator = asset.separator;
        }
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_MJ(snippet, variables)).filter(e => e !== undefined) : []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_MJ(snippet, variables)).filter(e => e !== undefined) : []);
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
        var core = asset.core.snippets.flatMap(snippet => genSnippet_MJ(snippet, variables)).filter(e => e !== undefined);
        let prompt = prefix.concat(text, core, suffix);
        return [prompt.filter(function (e) { return e; }).join(separator)];
    }
    else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_MJ(snippet, variables)).filter(e => e !== undefined);
    }
    else if (Ast.isChain(asset)) {
        return [];
    }
    else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, exports.AISystem.Midjourney, variables);
    }
    return [];
}
exports.genAsset_MJ = genAsset_MJ;
/**
 * Generate the prompt of an imported Asset
 *
 * @param asset the ImportedAsset
 * @param aiSystem AI used
 * @param variables Mapping used in the father's asset
 * @returns prompt realted to the imported asset (string[])
 */
function genImportedAsset(asset, aiSystem, variables) {
    // get the prompt that is wanted to be imported: it should have the same name but different container from the desired "library" (contained in asset.library)
    let imported_asset = (0, cli_util_1.get_imported_asset)(asset);
    if (Ast.isAsset(imported_asset)) {
        let new_map;
        if (variables) {
            // In case parameters were given, we have to extend that map to the imported asset
            new_map = variables;
        }
        // If not variables are sent it is undefined and thus no map will be sent to the Asset
        let result;
        switch (aiSystem) {
            case exports.AISystem.Midjourney: {
                result = genAsset_MJ(imported_asset, new_map);
                break;
            }
            case exports.AISystem.StableDiffusion: {
                result = genAsset_SD(imported_asset, new_map);
                break;
            }
            case exports.AISystem.ChatGPT: {
                result = genAsset_ChatGPT(imported_asset, new_map);
                break;
            }
            default: {
                console.log(chalk_1.default.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
                throw new Error();
            }
        }
        return result;
    }
    else {
        console.log(chalk_1.default.red(`Import error. Does not exist an asset with the name "${asset.name}" in the library.`));
        throw new Error();
    }
}
exports.genImportedAsset = genImportedAsset;
/**
 * Get the snippets that are `medium`. In case of more than one, only the first one is returned
 * @param snippets array of Snippets
 * @returns value of the `medium` snippet
 */
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
/**
 * Generate the prompt associated to an `Snippet` in Midjourney. A Snippet consist of two elements.
 * The `content`, which is a `BaseSnippet` element, and the `weight related to that content`
 *
 * @param snippet `Snippet`
 * @param variables Map of the varaibles and their respective values transmitted through command line of referenced by a ParamInvokation
 * @returns string
 */
function genSnippet_MJ(snippet, variables) {
    const text = genBaseSnippet_MJ(snippet.content, variables);
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
/**
 * Get the `name` of all the `Snippet` in the container `pars`
 * @param pars
 * @param previousMap Map of the variables and their value, declared in a `Prompt` different of where these Snippet is located.
 * @returns
 */
function getParamNames(pars, aiSystem, previousMap) {
    let sol = [];
    for (let element in pars) {
        sol.push(getParamName(pars[element], aiSystem, previousMap));
    }
    return sol;
}
/**
 * Get the name of a `Snippet` (i.e. the reference of a parameter).
 * @param pars Parameters in ParamInvokation
 * @param previousMap Map of the variables and its value, declared in a foreigner `Prompt`.
 * @returns string[]
 */
function getParamName(element, aiSystem, previousMap) {
    if (Ast.isAssetReuse(element.content)) {
        return genAssetReuse(element.content, aiSystem, previousMap).toString();
    }
    else if (Ast.isTextLiteral(element.content)) {
        return element.content.content;
    }
    else if (Ast.isInputRef(element.content)) {
        if (previousMap) {
            return previousMap.get(element.content.param.$refText);
        }
        else
            return element.content.param.$refText;
    }
    else
        return '';
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
function genAssetReuse(assetReuse, aiSystem, previousMap) {
    var _a, _b, _c, _d;
    let snippetRef = assetReuse.asset.ref;
    // In case the Assets had variables we have to change them
    // Check the number of variables is correct
    if (Ast.isImportedAsset(snippetRef)) {
        let imported_asset = (0, cli_util_1.get_imported_asset)(snippetRef);
        if (Ast.isPrompt(imported_asset) || Ast.isComposer(imported_asset)) {
            if (imported_asset.pars.pars.length != ((_a = assetReuse.pars) === null || _a === void 0 ? void 0 : _a.pars.length)) {
                console.log(chalk_1.default.red("The imported asset " + snippetRef.name + " needs " + imported_asset.pars.pars.length + " variables."));
                throw Error("The imported asset " + snippetRef.name + " needs " + imported_asset.pars.pars.length + " variables.");
            }
        }
        else if (Ast.isChain(imported_asset)) {
            if (((_b = assetReuse.pars) === null || _b === void 0 ? void 0 : _b.pars) && ((_c = assetReuse.pars) === null || _c === void 0 ? void 0 : _c.pars.length) > 0) {
                console.log(chalk_1.default.red("A Chain cannot have parameters"));
                throw Error("A Chain cannot have parameters");
            }
        }
        else {
            console.log(chalk_1.default.red("You can't import an import"));
            throw Error("You can't import an import");
        }
    }
    if (Ast.isAsset(snippetRef)) {
        // Variables
        var map = new Map();
        if (assetReuse.pars) {
            // Mapping the value of the variables
            let values = getParamNames((_d = assetReuse.pars) === null || _d === void 0 ? void 0 : _d.pars, aiSystem, previousMap);
            // Create Mapping
            let variables;
            if (!Ast.isImportedAsset(snippetRef) && !Ast.isChain(snippetRef)) {
                variables = snippetRef.pars.pars;
            }
            else if (Ast.isImportedAsset(snippetRef)) {
                let imported_asset = (0, cli_util_1.get_imported_asset)(snippetRef);
                variables = imported_asset.pars.pars;
            }
            if (variables) {
                for (let variable in variables) {
                    map.set(variables[variable].name, values[variable]);
                }
            }
            var result;
            switch (aiSystem) {
                case exports.AISystem.Midjourney: {
                    result = genAsset_MJ(snippetRef, map).toString();
                    break;
                }
                case exports.AISystem.StableDiffusion: {
                    result = genAsset_SD(snippetRef, map).toString();
                    break;
                }
                case exports.AISystem.ChatGPT: {
                    result = genAsset_ChatGPT(snippetRef, map).toString();
                    break;
                }
                case undefined: {
                    console.log(chalk_1.default.red(`No target provided. Using 'chatgpt' by default`));
                    result = genAsset_ChatGPT(snippetRef, map).toString();
                    break;
                }
                default: {
                    console.log(chalk_1.default.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
                    result = "";
                }
            }
            return result;
        }
        else {
            return "";
        }
    }
    else {
        return '';
    }
}
exports.genAssetReuse = genAssetReuse;
/**
 * Generate the prompt of a `BaseSnippet` in MidJourney. A `BaseSnippet` can be a text literal (`TextLiteral`),
 * a parameter reference (`ParameterRef`), a reference to a previous `Asset` (`AssetReuse`), or a trait (`NegativeTrait`, `CombinationTrait`,etc).
 *
 * @param snippet BaseSnippet
 * @param variables Map of the variables and the values. Case that we are in a AssetReuse.
 *  The variable should only be changed when the Snipper is `AssetReuse`, `ParameterRef` and some `Trait`
 * @returns prompt
 */
function genBaseSnippet_MJ(snippet, variables) {
    if (Ast.isTextLiteral(snippet)) {
        return snippet.content;
    }
    else if (Ast.isParameterRef(snippet)) {
        if (!variables) {
            return snippet.param.$refText;
        }
        else {
            return variables.get(snippet.param.$refText);
        }
    }
    else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet, exports.AISystem.Midjourney, variables);
    }
    else if (Ast.isNegativeTrait(snippet)) {
        return genNegativeTrait_MJ(snippet, variables);
    }
    else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_MJ(snippet, variables);
    }
    else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_MJ(snippet);
    }
    else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_MJ(snippet);
    }
    return "";
}
exports.genBaseSnippet_MJ = genBaseSnippet_MJ;
/**
 * Get the prompt of a negative trait
 *
 * @param snippet `Snippet` to negate
 * @param variables Map of the variables and the values. Case that we are in a AssetReuse
 * @returns prompt
 */
function genNegativeTrait_MJ(snippet, variables) {
    return "--no " + genSnippet_SD(snippet.content, variables).toString();
}
/**
 * Get the prompt for snippet of a mixture between two or more concepts
 *
 * @param snippet CombinationTrait Snippet
 * @param variables Map of the variables and the values. Case that we are in a AssetReuse
 * @returns prompt
 */
function genCombinationTrait_MJ(snippet, variables) {
    const contents = snippet.contents;
    const texts = contents.flatMap(subSnippet => genSnippet_SD(subSnippet)).filter(e => e !== undefined);
    var cleanText = texts.filter(function (e) { return e; }); // remove empty elements from array
    cleanText.forEach(element => {
        if (variables === null || variables === void 0 ? void 0 : variables.has(element)) {
            cleanText[cleanText.indexOf(element)] = variables.get(element);
        }
    });
    return "[" + cleanText.join(" : ") + " :" + 1 / cleanText.length + "]";
    //combineStrings(texts, " : ", " : ") + " :0.5]";
}
function genAudienceTrait_MJ(snippet) {
    const content = snippet.content;
    const text = genSnippet_SD(content);
    return "for " + text;
}
exports.genAudienceTrait_MJ = genAudienceTrait_MJ;
function genMediumTrait_MJ(snippet) {
    const text = snippet.value;
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
function generatePrompt_SD(model, prompt, variables) {
    // Generate the single requested prompt
    if (prompt) {
        const parameters = prompt.pars;
        if (!variables)
            variables = [];
        if (!variables && !parameters) { // No variables were announced
            return genAsset_SD(prompt).filter(e => e !== undefined);
        }
        else if (parameters.pars.length == (variables === null || variables === void 0 ? void 0 : variables.length)) {
            var map = new Map();
            // Create Mapping
            for (let i = 0; i < variables.length; i++) {
                map.set(parameters.pars[i].name, variables[i]);
            }
            return genAsset_SD(prompt, map).filter(e => e !== undefined);
        }
        else {
            console.log(chalk_1.default.red(`The number of values and variables of the prompt does not match.`));
            throw new Error();
        }
    }
    else if (variables) {
        const lastPrompt = model.assets[model.assets.length - 1];
        model.assets[0].name;
        if (Ast.isPrompt(lastPrompt)) {
            console.log(chalk_1.default.yellow(`No prompt were given. Chosing the last one by default`));
            const paramaters = lastPrompt.pars;
            if (paramaters.pars.length == (variables === null || variables === void 0 ? void 0 : variables.length)) {
                var map = new Map();
                // Create Mapping
                for (let i = 0; i < variables.length; i++) {
                    map.set(paramaters.pars[i].name, variables[i]);
                }
                return genAsset_SD(lastPrompt, map).filter(e => e !== undefined);
            }
            else {
                console.log(chalk_1.default.red(`The number of values and variables of the prompt does not match.`));
                throw new Error();
            }
        }
        else
            return model.assets.flatMap(asset => {
                if (asset.$container == model) {
                    return genAsset_SD(asset);
                }
                else
                    return undefined;
            }).filter(e => e !== undefined);
    }
    // Generate a prompt for each asset
    else {
        return model.assets.flatMap(asset => {
            if (asset.$container == model) {
                return genAsset_SD(asset);
            }
            else
                return undefined;
        }).filter(e => e !== undefined);
    }
}
/**
 * Generate the prompt of an Asset in Stable Diffusion
 *
 * @param asset
 * @param variables
 * @returns string[]. Each string belongs to the prompting of each element of the Asset (i.e, prefix, core, suffix in case it is a Prompt)
 */
function genAsset_SD(asset, variables) {
    if (Ast.isPrompt(asset)) {
        let separator = ', ';
        if (asset.separator !== undefined) {
            separator = asset.separator;
        }
        const prefix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_SD(snippet, variables)).filter(e => e !== undefined) : []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_SD(snippet, variables)).filter(e => e !== undefined) : []);
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
        const core = asset.core.snippets.flatMap(snippet => genSnippet_SD(snippet, variables)).filter(e => e !== undefined);
        let positive_prompt = prefix.concat(text, core, suffix).filter(function (e) { return e; }).join(separator);
        const negativeModifiers = extractNegativeModifiers(asset.core.snippets);
        const negativeText = negativeModifiers.flatMap(snippet => genSnippet_SD(snippet.content.content, variables)).filter(e => e !== undefined);
        let negative_prompt = negativeText.filter(function (e) { return e; }).join(separator);
        // Build the final prompt
        const positive = ["Positive prompt:\n"].concat(positive_prompt);
        const negative = ["Negative prompt:\n"].concat(negative_prompt);
        return positive.concat(['\n'], negative);
    }
    else if (Ast.isComposer(asset)) {
        return asset.contents.snippets.flatMap(snippet => genSnippet_SD(snippet, variables)).filter(e => e !== undefined);
        ;
    }
    else if (Ast.isChain(asset)) {
        return [];
    }
    else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, exports.AISystem.StableDiffusion, variables);
    }
    return [];
}
exports.genAsset_SD = genAsset_SD;
/**
 * For an array of snippets, extract the ones that (their content) are NegativeTrait
 * @param snippets
 * @returns
 */
function extractNegativeModifiers(snippets) {
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
function genSnippet_SD(snippet, variables) {
    const text = genBaseSnippet_SD(snippet.content, variables);
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
function genBaseSnippet_SD(snippet, variables) {
    if (Ast.isTextLiteral(snippet)) {
        return snippet.content;
    }
    else if (Ast.isParameterRef(snippet)) {
        if (!variables) {
            return snippet.param.$refText;
        }
        else {
            return variables.get(snippet.param.$refText);
        }
    }
    else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet, exports.AISystem.StableDiffusion, variables);
    }
    else if (Ast.isNegativeTrait(snippet)) {
        return ""; // the Negative Traits in SD are in the Negative Prompt part, as an ordary Trait
    }
    else if (Ast.isCombinationTrait(snippet)) {
        return genCombinationTrait_SD(snippet, variables);
    }
    else if (Ast.isAudienceTrait(snippet)) {
        return genAudienceTrait_SD(snippet);
    }
    else if (Ast.isMediumTrait(snippet)) {
        return genMediumTrait_SD(snippet);
    }
    else if (Ast.isCameraAngleTrait(snippet)) {
        return genCameraAngleTrait_SD(snippet);
    }
    else if (Ast.isProximityTrait(snippet)) {
        return genProximityTrait_SD(snippet);
    }
    else if (Ast.isLightingTrait(snippet)) {
        return genLightingTrait_SD(snippet);
    }
    return "";
}
exports.genBaseSnippet_SD = genBaseSnippet_SD;
/* Not neccesary. Maybe reactivate?
function genNegativeTrait_SD(snippet: Ast.NegativeTrait): string  {
    return genSnippet_SD(snippet.content).toString();
} */
function genCombinationTrait_SD(snippet, variables) {
    const contents = snippet.contents;
    const texts = contents.flatMap(subSnippet => genSnippet_SD(subSnippet, variables)).filter(e => e !== undefined);
    const cleanTexts = texts.filter(function (e) { return e; }); // remove empty elements from array
    return "a combination of " + cleanTexts.slice(0, -1).join(',') + ' and ' + cleanTexts.slice(-1);
    //combineStrings(texts, ", ", " and ");
}
function genAudienceTrait_SD(snippet) {
    const content = snippet.content;
    const text = genSnippet_SD(content);
    return "for " + text;
}
function genCameraAngleTrait_SD(snippet) {
    const text = snippet.value;
    return "from a " + text;
}
function genProximityTrait_SD(snippet) {
    const text = snippet.value;
    return text + " picture";
}
function genLightingTrait_SD(snippet) {
    const text = snippet.value;
    return text + " lighting";
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
/** Generate a prompt for each asset (Generate the single requested prompt).
 *
 *   @param model
 *   @param prompt
 *   @param variables Variables transmitted by command line.
 *   @param promptName Prompt transmitted by command line. If it is not declared, `variables` are used in the last prompt of the document
 *   @returns string[]. The solutions of different assets are divided by dots
 */
function generatePrompt_ChatGPT(model, prompt, variables, promptName) {
    // Generate the single requested prompt
    if (prompt) {
        const parameters = prompt.pars;
        if (!variables)
            variables = [];
        if (!variables && !parameters) { // No variables were announced
            return genAsset_MJ(prompt).filter(e => e !== undefined);
        }
        else if (parameters.pars.length == (variables === null || variables === void 0 ? void 0 : variables.length)) {
            var map = new Map();
            // Create Mapping
            for (let i = 0; i < variables.length; i++) {
                map.set(parameters.pars[i].name, variables[i]);
            }
            return genAsset_ChatGPT(prompt, map).filter(e => e !== undefined);
        }
        else {
            console.log(chalk_1.default.red(`The number of values and variables of the prompt does not match.`));
            throw new Error();
        }
    }
    else if (variables) {
        const lastPrompt = model.assets[model.assets.length - 1];
        if (Ast.isPrompt(lastPrompt)) {
            console.log(chalk_1.default.yellow(`No prompt were given. Chosing the last one by default`));
            const paramaters = lastPrompt.pars;
            if (paramaters.pars.length == (variables === null || variables === void 0 ? void 0 : variables.length)) {
                var map = new Map();
                // Create Mapping
                for (let i = 0; i < variables.length; i++) {
                    map.set(paramaters.pars[i].name, variables[i]);
                }
                return genAsset_ChatGPT(lastPrompt, map).filter(e => e !== undefined);
            }
            else {
                console.log(chalk_1.default.red(`The number of values and variables of the prompt does not match.`));
                throw new Error();
            }
        }
        else
            return model.assets.flatMap(asset => {
                if (asset.$container == model) {
                    return genAsset_ChatGPT(asset);
                }
                else
                    return undefined;
            }).filter(e => e !== undefined);
    }
    // Generate a prompt for each asset
    else {
        return model.assets.flatMap(asset => {
            if (asset.$container == model) {
                return genAsset_ChatGPT(asset);
            }
            else
                return undefined;
        }).filter(e => e !== undefined);
    }
}
/**
 * Generate the prompt for ChatGPT related to an Asset
 * @param asset Asset
 * @param variables Mapping of values-parameter transmited to the asset. In case no Map were sent, the Parameters names remains unchanged in the generated prompt.
 * @returns
 */
function genAsset_ChatGPT(asset, variables) {
    if (Ast.isPrompt(asset)) {
        let separator = '. ';
        if (asset.separator !== undefined) {
            separator = asset.separator;
        }
        const preffix = (asset.prefix != null ? asset.prefix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet, variables)) : []);
        const suffix = (asset.suffix != null ? asset.suffix.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet, variables)) : []);
        const core = asset.core.snippets.flatMap(snippet => genSnippet_ChatGPT(snippet, variables));
        // Build the final prompt
        const prompt = preffix.concat(core, suffix);
        return [prompt.filter(function (e) { return e; }).join(separator)];
    }
    else if (Ast.isComposer(asset)) {
        console.log(chalk_1.default.yellow("Composers are not implemented in ChatGPT yet"));
        return [];
    }
    else if (Ast.isChain(asset)) {
        console.log(chalk_1.default.yellow("Composers are not implemented in ChatGPT yet"));
        return [];
    }
    else if (Ast.isImportedAsset(asset)) {
        return genImportedAsset(asset, exports.AISystem.ChatGPT, variables);
    }
    return [];
}
exports.genAsset_ChatGPT = genAsset_ChatGPT;
/**
 * Generate the prompt of a Snippet in ChatGPT.
 * @param snippet
 * @param variables
 * @returns
 */
function genSnippet_ChatGPT(snippet, variables) {
    if (snippet.weight) {
        console.log(chalk_1.default.yellow("Weight of the snippet is not implemented in the ChatGPT mode, so it will be ignored."));
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
function genBaseSnippet_ChatGPT(snippet, variables) {
    if (Ast.isTextLiteral(snippet)) {
        return snippet.content;
    }
    else if (Ast.isLanguageRegisterTrait(snippet)) {
        return "The answer is written using a " + snippet.value + " register";
    }
    else if (Ast.isLiteraryStyleTrait(snippet)) {
        return "The answer is written as a " + snippet.value;
    }
    else if (Ast.isPointOfViewTrait(snippet)) {
        return "The answer is written in " + snippet.value;
    }
    else if (Ast.isParameterRef(snippet)) {
        if (!variables) {
            return snippet.param.$refText;
        }
        else {
            return variables.get(snippet.param.$refText);
        }
    }
    else if (Ast.isAssetReuse(snippet)) {
        return genAssetReuse(snippet, exports.AISystem.ChatGPT, variables);
    }
    else if (Ast.isNegativeTrait(snippet)) {
        return "Avoid " + genSnippet_ChatGPT(snippet.content, variables);
    }
    else if (Ast.isComparisonTrait(snippet)) {
        return genSnippet_ChatGPT(snippet.content1, variables) + " is more " + genSnippet_ChatGPT(snippet.comparison, variables) + " than " + genSnippet_ChatGPT(snippet.content2, variables);
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
exports.genBaseSnippet_ChatGPT = genBaseSnippet_ChatGPT;
//# sourceMappingURL=generate-prompt.js.map