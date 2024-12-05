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
exports.genAssetReuse = exports.extractMedium = exports.genImportedAsset = exports.getPromptsList = exports.generatePrompt = exports.generatePromptTraitValidators = exports.generatePromptCode = exports.AISystem = void 0;
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
const generate_prompt_MJ_1 = require("./generate-prompt_MJ");
const generate_prompt_SD_1 = require("./generate-prompt_SD");
const generate_prompt_ChatGPT_1 = require("./generate-prompt_ChatGPT");
exports.AISystem = {
    ChatGPT: "chatgpt",
    StableDiffusion: "stable-diffusion",
    Midjourney: "midjourney"
};
/**
* Generate a prompt for each asset (Generate the single requested prompt).
* If prompt is not informed, the generator will consider all the prompts included in the model.
* It will generate the code for the single prompt otherwise.
*
*   @param model
*   @param prompt  Prompt object that it will be addressed
*   @param variables Variables transmitted by command line.
*   @param promptName Prompt transmitted by command line. If it is not declared, `variables` are used in the last prompt of the document
*/
function generatePromptCode(model, aiSystem, prompt, variables) {
    var result;
    switch (aiSystem) {
        case exports.AISystem.Midjourney: {
            result = (0, generate_prompt_MJ_1.generatePrompt_MJ)(model, prompt, variables).filter(e => e !== '\n').filter(function (e) { return e; });
            break;
        }
        case exports.AISystem.StableDiffusion: {
            result = (0, generate_prompt_SD_1.generatePrompt_SD)(model, prompt, variables).filter(e => e !== '\n').filter(function (e) { return e; });
            break;
        }
        case exports.AISystem.ChatGPT: {
            result = (0, generate_prompt_ChatGPT_1.generatePrompt_ChatGPT)(model, prompt, variables);
            break;
        }
        case undefined: {
            console.log(chalk_1.default.yellow(`No target provided. Using 'chatgpt' by default`));
            result = (0, generate_prompt_ChatGPT_1.generatePrompt_ChatGPT)(model, prompt, variables);
            break;
        }
        default: {
            console.error(chalk_1.default.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
        }
    }
    return result;
}
exports.generatePromptCode = generatePromptCode;
/**
 * Given a prompt, checks the valu of the attribute `validator`, in case it has it
 * @param prompt
 * @returns
 */
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
                    result.push({ trait: s.value, condition: (0, generate_prompt_ChatGPT_1.genBaseSnippet_ChatGPT)(s) }); // s.validator}); //genTraitValidatorPrompt(model, s.validator?.$refText)});
                else {
                    result.push({ trait: '', condition: (0, generate_prompt_ChatGPT_1.genBaseSnippet_ChatGPT)(s) });
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
            console.error(chalk_1.default.red(`An asset with that name does not exist`));
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
/**
 * Gets the assets of a model. Empty assets are removed.
 *
 */
function getPromptsList(model) {
    return model.assets.map(asset => genAssetDescription(asset)).filter(e => e !== undefined);
}
exports.getPromptsList = getPromptsList;
/**
 * Return the name and the description (serparated) of an asset
 *
 * @param asset
 * @returns `\{name:string, description:string|undefined}` or `undefined`
 */
function genAssetDescription(asset) {
    if (Ast.isPrompt(asset))
        return { name: asset.name, description: asset.description };
    else
        return undefined;
}
/**
 * Generate the prompt of an imported Asset. Needed to link the parameters with its respective inputs
 *
 * @param asset the ImportedAsset
 * @param aiSystem AI used
 * @param variables Mapping used in the father's asset
 * @returns prompt realted to the imported asset (string[])
 */
function genImportedAsset(asset, aiSystem, variables) {
    // '*'Case: all assets of the file will be imported
    // get the prompt that is wanted to be imported: it should have the same name but different container from the desired "library" (contained in asset.library)
    let imported_asset = (0, cli_util_1.get_imported_asset)(asset);
    if (Ast.isAsset(imported_asset)) {
        let new_map;
        // Language checking
        /* DEACTIVATED FROM NOW
        const asset_language = getLanguage(asset);
        const imported_language = getLanguage(imported_asset);
        if (asset_language !== imported_language){
            let file = get_file_from(asset);
            let line = get_line_node(asset);
            console.log(chalk.yellow(`[${file}: ${line}] Warning: The imported asset language and original language does not coincide.`))
        }*/
        if (variables) {
            // In case parameters were given, we have to extend that map to the imported asset
            new_map = variables;
        }
        // If not variables are sent it is undefined and thus no map will be sent to the Asset
        let result;
        switch (aiSystem) {
            case exports.AISystem.Midjourney: {
                try {
                    result = (0, generate_prompt_MJ_1.genAsset_MJ)(imported_asset, new_map);
                    // try-catch may not be needed
                }
                catch (e) {
                    let file = (0, cli_util_1.get_file_from)(asset);
                    let line = (0, cli_util_1.get_line_node)(asset);
                    console.error(chalk_1.default.red(`[${file}: ${line}] Error: Sudden error in imported function ${asset.name}.`));
                    throw new Error();
                }
                break;
            }
            case exports.AISystem.StableDiffusion: {
                try {
                    result = (0, generate_prompt_SD_1.genAsset_SD)(imported_asset, new_map);
                }
                catch (e) {
                    let file = (0, cli_util_1.get_file_from)(asset);
                    let line = (0, cli_util_1.get_line_node)(asset);
                    console.error(chalk_1.default.red(`[${file}: ${line}] Error: Sudden error in imported function ${asset.name}.`));
                    throw new Error();
                }
                break;
            }
            case exports.AISystem.ChatGPT: {
                try {
                    result = (0, generate_prompt_ChatGPT_1.genAsset_ChatGPT)(imported_asset, new_map);
                }
                catch (e) {
                    let file = (0, cli_util_1.get_file_from)(asset);
                    let line = (0, cli_util_1.get_line_node)(asset);
                    console.error(chalk_1.default.red(`[${file}: ${line}] Error: Sudden error in imported function ${asset.name}.`));
                    throw new Error();
                }
                break;
            }
            default: {
                // No case should get here
                console.error(chalk_1.default.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
                throw new Error();
            }
        }
        return result;
    }
    else {
        // Tgheorically alrerady checked
        let line = (0, cli_util_1.get_line_node)(asset);
        let file = (0, cli_util_1.get_file_from)(asset);
        console.error(chalk_1.default.red(`[${file}: ${line}] Error: Import error. Does not exist an asset with the name "${asset.name}" in the library.`));
        throw new Error(`[${file}: ${line}] Error: Import error. Does not exist an asset with the name "${asset.name}" in the library.`);
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
        let line = (0, cli_util_1.get_line_node)(snippets[0].$container);
        let file = (0, cli_util_1.get_file_from)(snippets[0].$container); //get_file_from(snippets[0].$container);
        console.log(chalk_1.default.yellow(`[${file}: ${line}] Warning: Multiple 'medium' specified in the prompt. Using the first one.`));
    }
    return medium[0].value;
}
exports.extractMedium = extractMedium;
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
    var _a, _b, _c, _d, _e;
    let snippetRef = assetReuse.asset.ref;
    // In case the Assets had variables we have to change them
    // Check the number of variables is correct
    if (Ast.isReferenciable(snippetRef)) {
        var map = new Map();
        if (Ast.isAssetImport(snippetRef)) {
            // If it is an import, the snippetRef is the reference of the referenciable object
            // Get the line where the referenced asset is located (to define the errors)
            let line = (0, cli_util_1.get_line_node)(assetReuse);
            let file = (0, cli_util_1.get_file_from)(snippetRef);
            let imported_asset = (0, cli_util_1.get_imported_asset)(snippetRef);
            if (Ast.isPrompt(imported_asset) || Ast.isComposer(imported_asset)) {
                if (imported_asset.pars.pars.length != ((_a = assetReuse.pars) === null || _a === void 0 ? void 0 : _a.pars.length)) {
                    console.log(chalk_1.default.red(`[${file}: ${line}] Error: The imported asset ${snippetRef.name} needs ${imported_asset.pars.pars.length} variables.`));
                    throw Error(`[${file}: ${line}] Error: The imported asset ${snippetRef.name} needs ${imported_asset.pars.pars.length} variables.`);
                }
            }
            else if (Ast.isChain(imported_asset)) {
                if (((_b = assetReuse.pars) === null || _b === void 0 ? void 0 : _b.pars) && ((_c = assetReuse.pars) === null || _c === void 0 ? void 0 : _c.pars.length) > 0) {
                    console.log(chalk_1.default.red(`[${file}: ${line}] Error: A Chain cannot have parameters`));
                    throw Error(`[${file}: ${line}] Error: A Chain cannot have parameters`);
                }
            }
            else {
                console.log(chalk_1.default.red(`[${file}: ${line}] Error: You can't import an import`));
                throw Error(`[${file}: ${line}] Error: You can't import an import`);
            }
            if (assetReuse.pars && !Ast.isChain(imported_asset)) { // Second condition need to avoid errors
                let variables = imported_asset.pars.pars;
                let values = getParamNames((_d = assetReuse.pars) === null || _d === void 0 ? void 0 : _d.pars, aiSystem, previousMap);
                if (variables) {
                    for (let variable in variables) {
                        map.set(variables[variable].name, values[variable]);
                    }
                }
            }
            snippetRef = imported_asset;
        }
        else if (Ast.isAsset(snippetRef)) {
            if (assetReuse.pars) {
                // Mapping the value of the variables
                let values = getParamNames((_e = assetReuse.pars) === null || _e === void 0 ? void 0 : _e.pars, aiSystem, previousMap);
                // Create Mapping
                let variables;
                if (!Ast.isImportedAsset(snippetRef) && !Ast.isChain(snippetRef)) {
                    variables = snippetRef.pars.pars;
                }
                if (variables) {
                    for (let variable in variables) {
                        map.set(variables[variable].name, values[variable]);
                    }
                }
            }
            else {
                console.error(chalk_1.default.red(`An AssetReuse should have the structure: <name>(<parameters>)`));
                return "";
            }
        }
        var result;
        switch (aiSystem) {
            case exports.AISystem.Midjourney: {
                result = (0, generate_prompt_MJ_1.genAsset_MJ)(snippetRef, map).toString();
                break;
            }
            case exports.AISystem.StableDiffusion: {
                result = (0, generate_prompt_SD_1.genAsset_SD)(snippetRef, map).toString();
                break;
            }
            case exports.AISystem.ChatGPT: {
                result = (0, generate_prompt_ChatGPT_1.genAsset_ChatGPT)(snippetRef, map).toString();
                break;
            }
            case undefined: {
                console.error(chalk_1.default.yellow(`No target provided. Using 'chatgpt' by default`));
                result = (0, generate_prompt_ChatGPT_1.genAsset_ChatGPT)(snippetRef, map).toString();
                break;
            }
            default: {
                console.error(chalk_1.default.red(`Wrong parameter: AI system ${aiSystem} not supported!`));
                result = "";
            }
        }
        return result;
    }
    else {
        throw new Error(`The snippet is not referencing an asset`);
        return '';
    }
}
exports.genAssetReuse = genAssetReuse;
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
//# sourceMappingURL=generate-prompt.js.map