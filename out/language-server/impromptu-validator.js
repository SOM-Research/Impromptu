"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpromptuValidator = exports.registerValidationChecks = void 0;
const ast_1 = require("./generated/ast");
const fs_1 = __importDefault(require("fs"));
/**
 * Register custom validation checks.
 */
function registerValidationChecks(services) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.ImpromptuValidator;
    const checks = {
        Model: validator.checkModelWellFormedRules,
        Parameters: validator.checkUniqueParams,
        AssetReuse: validator.checkAssetReuse,
        Multimodal: validator.checkMultimodalInputNotText,
        ImportedAsset: validator.checkImportedAsset,
    };
    registry.register(checks, validator);
}
exports.registerValidationChecks = registerValidationChecks;
function check_loops_snippets(snippets, accept, og_asset) {
    snippets.forEach(snippet => {
        if ((0, ast_1.isAssetReuse)(snippet.content)) {
            if (snippet.content.asset.ref)
                check_loops_asset(snippet.content.asset.ref, accept, og_asset);
            if (snippet.content.pars)
                check_loops_snippets(snippet.content.pars.pars, accept, og_asset);
        }
    });
}
/**
 * Check whether there are infinite loops in the model due to the references or not. Recursive function
 * @param asset Asset where we are
 * @param og_asset Noted asset used to check if there is a loop
 */
function check_loops_asset(asset, accept, og_asset) {
    if (asset == og_asset) {
        accept('error', "There is a recursive loop", { node: asset, property: 'name' });
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
            check_loops_snippets(elements, accept, og_asset);
        }
        else if ((0, ast_1.isComposer)(asset)) {
            // Get all of snippets in a Composer
            let elements = asset.contents.snippets;
            check_loops_snippets(elements, accept, og_asset);
        }
        else if ((0, ast_1.isImportedAsset)(asset)) {
            // Get the asset ImportedAsset references
            //check_loops_asset(get_imported_asset(asset), og_asset);
        }
    }
}
/**
 * Implementation of custom validations.
 */
class ImpromptuValidator {
    /* checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    } */
    checkMultimodalInputNotText(input, accept) {
        if (input.format == 'text') {
            accept('error', `Textual inputs should be defined as parameters, not multi-modal inputs. \nUse '@par' instead of '$par:text'.`, { node: input, property: 'format' });
        }
    }
    checkModelWellFormedRules(model, accept) {
        this.checkUniqueAssets(model, accept);
        this.checkByExpressionValidators(model, accept);
        this.checkNoCyclesInVersions(model, accept);
        this.checkNoCyclesInRefines(model, accept);
        this.checkNoRecursivity(model, accept);
    }
    checkUniqueAssets(model, accept) {
        // create a set of visited assets
        // and report an error when we see one we've already seen
        const reported = new Set();
        model.assets.forEach(a => {
            if (reported.has(a.name)) {
                accept('error', `Asset has non-unique name '${a.name}'.`, { node: a, property: 'name' });
            }
            reported.add(a.name);
        });
    }
    checkUniqueParams(parset, accept) {
        // create a set of visited parameters
        // and report an error when we see one we've already seen
        const reported = new Set();
        parset.pars.forEach(p => {
            if (reported.has(p.name)) {
                accept('error', `Input has non-unique name '${p.name}'.`, { node: p, property: 'name' });
            }
            reported.add(p.name);
        });
    }
    checkNoCyclesInVersions(model, accept) {
        model.assets.forEach(a => {
            if (a.priorVersion != undefined) {
                let node = model.assets.filter(p => { var _a; return p.name == ((_a = a.priorVersion) === null || _a === void 0 ? void 0 : _a.$refText); })[0];
                while (node != undefined) {
                    if (node.name == a.name) {
                        accept('error', `Cannot be cycles in prior version relationship.`, { node: a, property: 'priorVersion' });
                        break;
                    }
                    if (node.priorVersion != undefined)
                        node = model.assets.filter(a => { var _a; return a.name == ((_a = node.priorVersion) === null || _a === void 0 ? void 0 : _a.$refText); })[0];
                    else
                        break;
                }
            }
        });
    }
    checkNoRecursivity(model, accept) {
        model.assets.forEach(asset => {
            check_loops_asset(asset, accept);
        });
    }
    checkNoCyclesInRefines(model, accept) {
        model.assets.forEach(a => {
            if (a.refines != undefined) {
                let node = model.assets.filter(p => { var _a; return p.name == ((_a = a.refines) === null || _a === void 0 ? void 0 : _a.$refText); })[0];
                while (node != undefined) {
                    if (node.name == a.name) {
                        accept('error', `Cannot be cycles in refinement relationship.`, { node: a, property: 'refines' });
                        break;
                    }
                    if (node.refines != undefined)
                        node = model.assets.filter(a => { var _a; return a.name == ((_a = node.refines) === null || _a === void 0 ? void 0 : _a.$refText); })[0];
                    else
                        break;
                }
            }
        });
    }
    checkByExpressionValidators(model, accept) {
        model.assets.forEach(a => {
            if ((0, ast_1.isByExpressionOutputTesting)(a)) {
                const validator = model.assets.filter(p => (0, ast_1.isPrompt)(p) && p.name == a.validator.$refText)[0];
                // verify that the output media is text
                if (validator && validator.output != 'text')
                    accept('error', `The output media of validator must be of type text.`, { node: validator, property: 'output' });
                // verify that a validator does not have a validator
                if (validator && (0, ast_1.isByExpressionOutputTesting)(validator))
                    accept('error', `A validator cannot have an output validation itself.`, { node: validator, property: 'validator' });
            }
        });
    }
    /**
     * Validations done to the `AssetReuse` objects:
     *
     * 1- The number of parameters in `pars` match with the number of parameters of the `Asset`
     * referenced
     *
     * @param assetReuse
     * @param accept
     */
    checkAssetReuse(assetReuse, accept) {
        const values = assetReuse.pars;
        const ogAsset = assetReuse.asset.ref;
        if (!((0, ast_1.isChain)(ogAsset) || (0, ast_1.isImportedAsset)(ogAsset))) {
            if ((ogAsset === null || ogAsset === void 0 ? void 0 : ogAsset.pars.pars.length) != (values === null || values === void 0 ? void 0 : values.pars.length)) {
                accept('error', `The number of variables does not match with the number of variables of the referenced Asset`, { node: assetReuse });
            }
        }
        else if ((0, ast_1.isChain)(ogAsset)) {
            if (values) {
                accept('error', `The Asset referenced is a Chain. A Chain does not have nay parameters.`, { node: assetReuse });
            }
        }
    }
    checkImportedAsset(imported_asset, accept) {
        // let rel_url:string[]=[];
        const library = imported_asset.library.split(".").join("/");
        let workspace_path = process.cwd();
        let uri_array = workspace_path.split("\\");
        let last = uri_array.pop();
        while (last != "Impromptu") {
            if (uri_array) {
                last = uri_array.pop();
            }
            else {
                "TODO";
            }
        }
        uri_array.push(last);
        workspace_path = uri_array.join("\\");
        //const uri= uri_array?.join("/")
        if (fs_1.default.existsSync(workspace_path + '../' + library)) {
            accept('error', `The file ` + library + ` exists, but the file format ".prm" has to be erased.`, { node: imported_asset });
        }
        else if (!fs_1.default.existsSync(workspace_path + '/' + library + '.prm')) {
            accept('error', `The library ` + library + ` does not exist.`, { node: imported_asset });
        }
        //TODO: Check that imported_asset.name exists in the file ---> a supported file contains an index with all the functions??)
        else {
            let buffer = fs_1.default.readFileSync(workspace_path + '/' + library + '.prm');
            let assetRegex = new RegExp(`.*\\s${imported_asset.name}\\s*\\(.*`);
            if (!assetRegex.test(buffer.toString())) {
                accept('error', `The prompt ` + imported_asset.name + ` is not included in ` + library, { node: imported_asset });
            }
        }
    }
}
exports.ImpromptuValidator = ImpromptuValidator;
//# sourceMappingURL=impromptu-validator.js.map