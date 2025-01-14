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
exports.get_all_asset_reuse = exports.get_all_snippets = exports.getLanguage = exports.get_file_from = exports.get_line_node = exports.get_imported_asset = exports.extractDestinationAndName = exports.extractAstNode = exports.extractDocument = void 0;
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const vscode_uri_1 = require("vscode-uri");
const ast_1 = require("../language-server/generated/ast");
const globby_1 = __importDefault(require("globby"));
/**
 * Gets the `LangiumDocument` of the a certain file
 * @param fileName relative path of the file from `build_files`
 * @param services LangiumService
 * @returns LangiumDocument
 */
function extractDocument(fileName, services) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const extensions = services.LanguageMetaData.fileExtensions;
        if (!extensions.includes(path_1.default.extname('build_files/' + fileName))) {
            console.error(chalk_1.default.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
            process.exit(1);
        }
        let documents = [];
        const document = services.shared.workspace.LangiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path_1.default.resolve('build_files/' + fileName)));
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
/**
 * Build the Langium Document that allows to analyze the `.prm` file
 * @param fileName uri of the file, relative to the folder `build_files`
 * @param services LangiumService
 * @param calls_buffer Auxiliar variable with the Assets "visited"
 * @returns
 */
function extractAstNode(fileName, services, calls_buffer) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        let libraries = [];
        let import_names = [];
        if (calls_buffer == undefined)
            calls_buffer = [];
        let new_calls = [];
        // Checks all the imports. Needed for the CLI mode
        if (calls_buffer) {
            const model = (_a = (yield extractDocument(fileName, services)).parseResult) === null || _a === void 0 ? void 0 : _a.value;
            if ((0, ast_1.isModel)(model)) {
                // get all the imports of the file
                model.imports.forEach(import_line => {
                    import_line.set_assets.forEach(asset => {
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
                var exists_errors = false; //Mark there are errors or not
                for (let i = 0; i < new_calls.length; i++) {
                    try {
                        if (!calls_buffer.find(element => libraries[i] == element.$container.library && import_names[i] == element.name)) {
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
 * Returns the asset from the library which Impoorted Asset refereces
 * @param asset
 * @returns
 */
function get_imported_asset(asset) {
    if ((0, ast_1.isImportedAsset)(asset.$container)) {
        if (asset.asset.ref) {
            return asset.asset.ref;
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
    const mainlanguage = asset.$container.language;
    if (asset.$container && mainlanguage) {
        return mainlanguage.name;
    }
    else { // By default, language is English
        return "English";
    }
}
exports.getLanguage = getLanguage;
function get_all_snippets(asset) {
    if ((0, ast_1.isPrompt)(asset)) {
        return asset.core.snippets;
    }
    else if ((0, ast_1.isComposer)(asset)) {
        return asset.contents.snippets;
    }
    else {
        return [];
    }
}
exports.get_all_snippets = get_all_snippets;
function get_all_asset_reuse(asset) {
    try {
        let snippets = get_all_snippets(asset);
        const base_snippets = [];
        snippets.forEach(snippet => {
            base_snippets.push(snippet.content);
        });
        const assets = base_snippets.filter(element => { return (0, ast_1.isAssetReuse)(element); });
        return assets;
    }
    catch (e) {
        throw [];
    }
}
exports.get_all_asset_reuse = get_all_asset_reuse;
//# sourceMappingURL=cli-util.js.map