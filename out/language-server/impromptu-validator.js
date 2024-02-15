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
        Model: (validator.checkUniqueAssets, validator.checkByExpressionValidatorsOutputMedia),
        Parameters: validator.checkUniqueParams,
        Multimodal: validator.checkMultimodalInputNotText,
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
    checkByExpressionValidatorsOutputMedia(model, accept) {
        model.assets.forEach(a => {
            if ((0, ast_1.isByExpressionOutputTesting)(a)) {
                const validator = model.assets.filter(p => (0, ast_1.isPrompt)(p) && p.name == a.validator.$refText)[0];
                //accept('error', `Validator name == ${validator.name}; output == '${validator.output}' `, {node: validator, property: 'name'});
                if (validator && validator.output != 'text')
                    accept('error', `The output media of validator '${validator.name}' must be of type text.`, { node: validator, property: 'output' });
            }
        });
    }
}
exports.ImpromptuValidator = ImpromptuValidator;
//# sourceMappingURL=impromptu-validator.js.map