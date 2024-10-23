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
exports.get_imported_asset = exports.check_loops = exports.extractDestinationAndName = exports.extractAstNode = exports.extractDocument = void 0;
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const vscode_uri_1 = require("vscode-uri");
const ast_1 = require("../language-server/generated/ast");
function extractDocument(fileName, services) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const extensions = services.LanguageMetaData.fileExtensions;
        if (!extensions.includes(path_1.default.extname(fileName))) {
            console.error(chalk_1.default.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
            process.exit(1);
        }
        if (!fs_1.default.existsSync(fileName)) {
            console.error(chalk_1.default.red(`File ${fileName} does not exist.`));
            process.exit(1);
        }
        const document = services.shared.workspace.LangiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path_1.default.resolve(fileName)));
        yield services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });
        const validationErrors = ((_a = document.diagnostics) !== null && _a !== void 0 ? _a : []).filter(e => e.severity === 1);
        if (validationErrors.length > 0) {
            console.error(chalk_1.default.red('There are validation errors:'));
            var errors = [];
            for (const validationError of validationErrors) {
                errors.push(`line ${validationError.range.start.line + 1}: ${validationError.message} [${document.textDocument.getText(validationError.range)}]`);
                console.error(chalk_1.default.red(errors.at(-1)));
            }
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
                model.assets.forEach(asset => {
                    if ((0, ast_1.isImportedAsset)(asset) && !(calls_buffer === null || calls_buffer === void 0 ? void 0 : calls_buffer.find(element => element[0] == asset.library))) {
                        libraries.push(asset.library);
                        import_names.push(asset.name);
                        new_calls.push([asset.library, asset.name]);
                    }
                });
                // Load the libraries needed to obtain the imports
                for (let i = 0; i < new_calls.length; i++) {
                    if (!calls_buffer.find(element => libraries[i] == element[0] && import_names[i] == element[1])) {
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
function extractDestinationAndName(filePath, destination) {
    filePath = path_1.default.basename(filePath, path_1.default.extname(filePath)).replace(/[.-]/g, '');
    return {
        destination: destination !== null && destination !== void 0 ? destination : path_1.default.join(path_1.default.dirname(filePath), 'generated'),
        name: path_1.default.basename(filePath)
    };
}
exports.extractDestinationAndName = extractDestinationAndName;
function check_loops(model) {
    model.assets.forEach(asset => {
        check_loops_asset(asset);
    });
}
exports.check_loops = check_loops;
function check_loops_asset(asset, og_asset) {
    if (asset == og_asset) {
        console.log(chalk_1.default.red("There is a recursive loop regarding the asset " + og_asset.name));
        throw new Error("There is a recursive loop regarding the asset " + og_asset.name);
    }
    else {
        if (!og_asset) {
            og_asset = asset;
        }
        if ((0, ast_1.isPrompt)(asset)) {
            // Get all of snippets in a Prompt
            let elements = asset.core.snippets;
            if (asset.prefix) {
                elements = elements.concat(asset.prefix.snippets);
            }
            if (asset.suffix) {
                elements = elements.concat(asset.suffix.snippets);
            }
            check_loops_snippets(elements, og_asset);
        }
        else if ((0, ast_1.isComposer)(asset)) {
            // Get all of snippets in a Composer
            let elements = asset.contents.snippets;
            check_loops_snippets(elements, og_asset);
        }
        else if ((0, ast_1.isImportedAsset)(asset)) {
            // Get the asset ImportedAsset references
            check_loops_asset(get_imported_asset(asset), og_asset);
        }
    }
}
function check_loops_snippets(snippets, og_asset) {
    snippets.forEach(snippet => {
        if ((0, ast_1.isAssetReuse)(snippet.content)) {
            if (snippet.content.asset.ref)
                check_loops_asset(snippet.content.asset.ref, og_asset);
            if (snippet.content.pars)
                check_loops_snippets(snippet.content.pars.pars, og_asset);
        }
    });
}
/**
 * Returns the asset from the library which Impoorted Asset refereces
 * @param asset
 * @returns
 */
function get_imported_asset(asset) {
    let model = asset.$container;
    let imported_asset = model.assets.find(element => { var _a; return asset.name == element.name && ((_a = element.$container.$document) === null || _a === void 0 ? void 0 : _a.uri.path.split('/').pop()) == asset.library.split('.').pop() + '.prm'; } // TODO: More rigurous check
    );
    if ((0, ast_1.isPrompt)(imported_asset) || (0, ast_1.isComposer)(imported_asset)) {
        return imported_asset;
    }
    else {
        console.log(chalk_1.default.red(`Asset ` + asset.name + ` is not found`));
        throw new Error(`Asset ` + asset.name + ` is not found`);
    }
}
exports.get_imported_asset = get_imported_asset;
//# sourceMappingURL=cli-util.js.map