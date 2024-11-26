"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguage = exports.get_file_from = exports.get_line_node = exports.get_imported_asset = exports.check_loops = exports.extractDestinationAndName = exports.extractAstNode = exports.extractDocument = void 0;
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const vscode_uri_1 = require("vscode-uri");
const ast_1 = require("../language-server/generated/ast");
const globby_1 = __importDefault(require("globby"));
function extractDocument(fileName, services) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const extensions = services.LanguageMetaData.fileExtensions;
        if (!extensions.includes(path_1.default.extname('build_files/' + fileName))) {
            console.error(chalk_1.default.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
            process.exit(1);
        }
        let documents = [];
        const document = services.shared.workspace.LangiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path_1.default.resolve('build_files/' + fileName))); // Here is the problem
        const files = yield (0, globby_1.default)("**/*.prm"); // Get all .prm files
        files.forEach(file => documents.push(services.shared.workspace.LangiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path_1.default.resolve(file)))));
        yield services.shared.workspace.DocumentBuilder.build(documents, { validationChecks: 'all' }); // Build the document. We need to pass all the .prm files to check for importation errors
        const validationErrors = ((_a = document.diagnostics) !== null && _a !== void 0 ? _a : []).filter(e => e.severity === 1);
        if (validationErrors.length > 0) {
            console.error(chalk_1.default.red(`There are validation errors in ${fileName}:`));
            var errors = [];
            for (const validationError of validationErrors) {
                errors.push(`[${fileName}: ${validationError.range.start.line + 1}] Error : ${validationError.message} [${document.textDocument.getText(validationError.range)}]`);
                console.error(chalk_1.default.red(errors.at(-1)));
            }
            console.error(chalk_1.default.red("----------------------------------------------------------------------------"));
            throw new Error(errors.join("\n"));
        }
        return document;
    });
}
exports.extractDocument = extractDocument;
function extractAstNode(fileName, services, calls_buffer) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        let libraries = [];
        let import_names = [];
        // let file = fileName.split('/').pop()?.split('.')[0] as string
        if (calls_buffer == undefined)
            calls_buffer = [];
        let new_calls = [];
        if (calls_buffer) {
            const model = (_a = (yield extractDocument(fileName, services)).parseResult) === null || _a === void 0 ? void 0 : _a.value;
            if ((0, ast_1.isModel)(model)) {
                // get all the imports of the file
                model.imports.forEach(import_line => {
                    import_line.asset_name.forEach(asset => {
                        // Checks that it is imported from a different file
                        //if(! calls_buffer?.find(element => (element.$container as ImportedAsset).library==(asset.$container as ImportedAsset).library)){
                        libraries.push(asset.$container.library);
                        if (asset.name) {
                            import_names.push(asset.name);
                        }
                        new_calls.push(asset);
                        //}
                    });
                });
                // Also
                /// REHACER TODO: Buffer tiene que construirse de otra manera
                // Load the libraries needed to obtain the imports
                var exists_errors = false; //Mark there are errors or not
                for (let i = 0; i < new_calls.length; i++) {
                    try {
                        if (import_names[i] == '*') {
                            calls_buffer.push(new_calls[i]);
                            const import_model = yield extractAstNode(libraries[i].split(".").join("/") + ".prm", services, calls_buffer);
                            let imported_assets = [];
                            import_model.assets.forEach(asset => {
                                imported_assets.push(asset);
                            });
                            model.assets = model.assets.concat(imported_assets);
                        }
                        else if (!calls_buffer.find(element => libraries[i] == element.$container.library && import_names[i] == element.name)) {
                            // Update the elements that have been called
                            calls_buffer.push(new_calls[i]);
                            const import_model = yield extractAstNode(libraries[i].split(".").join("/") + ".prm", services, calls_buffer);
                            let imported_assets = [];
                            import_model.assets.forEach(asset => {
                                //filter to only get the wanted functions
                                if (import_names.find(element => element == asset.name)) {
                                    imported_assets.push(asset);
                                }
                            });
                            model.assets = model.assets.concat(imported_assets);
                        }
                        else {
                        }
                    }
                    catch (e) {
                        let line = get_line_node(new_calls[i]);
                        console.error(chalk_1.default.red(`[${fileName}: ${line}] Error in the imported file "${new_calls[i].$container.library}.prm".`));
                        console.error(chalk_1.default.red("----------------------------------------------------------------------------"));
                        exists_errors = true;
                    }
                }
                if (exists_errors)
                    throw new Error();
                return model;
            }
            return (_b = (yield extractDocument(fileName, services)).parseResult) === null || _b === void 0 ? void 0 : _b.value;
        }
        else {
            return (_c = (yield extractDocument(fileName, services)).parseResult) === null || _c === void 0 ? void 0 : _c.value;
        }
    });
}
exports.extractAstNode = extractAstNode;
/**
 * Obtain the path were the final with the generated prompt will be located, nad the name of it
 * @param filePath uri of the .prm file
 * @param destination  route given by the user. If `undefined`, it will be generated in build-files/generated
 * @returns { destination path , name }
 */
function extractDestinationAndName(filePath, destination) {
    filePath = path_1.default.basename(filePath, path_1.default.extname(filePath)).replace(/[.-]/g, '');
    return {
        destination: destination !== null && destination !== void 0 ? destination : path_1.default.join(path_1.default.dirname(filePath), 'build_files/generated'),
        name: path_1.default.basename(filePath)
    };
}
exports.extractDestinationAndName = extractDestinationAndName;
/**
 * Checks that the model does not have any recursive loops. It check both assets and imports.
 * Throw an error if a loop exists
 * @param model
 */
function check_loops(model) {
    model.assets.forEach(asset => {
        check_loops_asset(asset);
    });
}
exports.check_loops = check_loops;
function check_loops_asset(asset, og_asset) {
    // In case we alredy be in the same asset in the buffer, we have a loop 
    if (og_asset === null || og_asset === void 0 ? void 0 : og_asset.includes(asset)) {
        let line = get_line_node(asset);
        let fileName = get_file_from(asset);
        console.error(chalk_1.default.red(`[${fileName}: ${line}] Error: There is a recursive loop regarding the asset ${asset.name}`));
        throw new Error("There is a recursive loop regarding the asset " + asset.name);
    }
    else {
        if (!og_asset) {
            og_asset = [];
        }
        if ((0, ast_1.isPrompt)(asset)) {
            // Get all of snippets in a Prompt
            if (asset.core.snippets != undefined) {
                let elements = asset.core.snippets;
                if (asset.prefix) {
                    elements = elements.concat(asset.prefix.snippets);
                }
                if (asset.suffix) {
                    elements = elements.concat(asset.suffix.snippets);
                }
                og_asset.push(asset);
                check_loops_snippets(elements, og_asset);
            }
        }
        else if ((0, ast_1.isComposer)(asset)) {
            // Get all of snippets in a Composer
            let elements = asset.contents.snippets;
            og_asset.push(asset);
            check_loops_snippets(elements, og_asset);
        }
    }
}
/**
 * Resolves a recursion loop in a set of snippets.
 * @param snippets array of Snippets to analyze
 * @param og_asset Buffer of the aasets that were already paased
 * @returns ´og_asset´
 */
function check_loops_snippets(snippets, og_asset) {
    snippets.forEach(snippet => {
        if ((0, ast_1.isAssetReuse)(snippet.content)) {
            // An AssetReuse references an Asset, or an Asset import
            if (snippet.content.asset.ref)
                if ((0, ast_1.isAsset)(snippet.content.asset.ref)) {
                    check_loops_asset(snippet.content.asset.ref, og_asset);
                }
                else if ((0, ast_1.isAssetImport)(snippet.content.asset.ref)) {
                    check_loops_asset(get_imported_asset(snippet.content.asset.ref), og_asset);
                }
            // The parameters of an AssetReuse are references to another snippet
            if (snippet.content.pars)
                og_asset = check_loops_snippets(snippet.content.pars.pars, og_asset);
            // When the asset has beeen studied, the last element is remove so that the assest tracked in the first snippet not interfere with the next one 
            og_asset.pop();
        }
    });
    return og_asset;
}
/**
 * Returns the asset from the library which Impoorted Asset refereces
 * @param asset
 * @returns
 */
function get_imported_asset(asset) {
    if ((0, ast_1.isImportedAsset)(asset.$container)) {
        let model = asset.$container.$container;
        let imported_asset = model.assets.find(element => {
            var _a;
            let re = new RegExp(String.raw `${asset.name}`, "g");
            return re.test(element.name) && ((_a = element.$container.$document) === null || _a === void 0 ? void 0 : _a.uri.path.split('/').pop()) == asset.$container.library.split('.').pop() + '.prm'; // TODO: More rigurous check
        });
        if ((0, ast_1.isPrompt)(imported_asset) || (0, ast_1.isComposer)(imported_asset)) {
            return imported_asset;
        }
        else {
            let file = get_file_from(asset);
            let line = get_line_node(asset);
            console.error(chalk_1.default.red(chalk_1.default.red(`[${file}: ${line}] Error: Asset ${asset.name} is not found`)));
            throw new Error(chalk_1.default.red(`[${file}: ${line}] Error: Asset ${asset.name} is not found`));
        }
    }
    let file = get_file_from(asset);
    let line = get_line_node(asset);
    throw new Error(chalk_1.default.red(`[${file}: ${line}] Error: Asset ${asset.name} is not found`));
}
exports.get_imported_asset = get_imported_asset;
/**
 * Given an element of an AST, return the line where it is located, as a string
 * @param node object
 * @returns string (unknow if fails)
 */
function get_line_node(node) {
    var _a, _b;
    let line;
    if ((_a = node.$cstNode) === null || _a === void 0 ? void 0 : _a.range.start.line) {
        line = (((_b = node.$cstNode) === null || _b === void 0 ? void 0 : _b.range.start.line) + 1).toString();
    }
    else
        line = "unknown";
    return line;
}
exports.get_line_node = get_line_node;
/**
 * Given an asset of an AST, return the file where is located
 * @param node object
 * @returns string if exits
 */
function get_file_from(node) {
    var _a, _b;
    return (_b = (_a = node.$cstNode) === null || _a === void 0 ? void 0 : _a.root.element.$document) === null || _b === void 0 ? void 0 : _b.uri.path; //.split('/').pop()
}
exports.get_file_from = get_file_from;
function getLanguage(asset) {
    if (!(0, ast_1.isChain)(asset)) {
        if (asset.language) {
            return asset.language;
        }
    }
    if (asset.$container && asset.$container.language != undefined) {
        return asset.$container.language.name;
    }
    else { // By default, language is English
        return "English";
    }
}
exports.getLanguage = getLanguage;
//# sourceMappingURL=cli-util.js.map