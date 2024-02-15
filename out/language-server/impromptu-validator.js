"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpromptuValidator = exports.registerValidationChecks = void 0;
const ast_1 = require("./generated/ast");
/**
 * Register custom validation checks.
 */
function registerValidationChecks(services) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.ImpromptuValidator;
    const checks = {
        Model: validator.checkModelWellFormedRules,
        Parameters: validator.checkUniqueParams,
        Multimodal: validator.checkMultimodalInputNotText
    };
    registry.register(checks, validator);
}
exports.registerValidationChecks = registerValidationChecks;
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
}
exports.ImpromptuValidator = ImpromptuValidator;
//# sourceMappingURL=impromptu-validator.js.map