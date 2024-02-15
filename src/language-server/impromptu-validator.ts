import { ValidationAcceptor, ValidationChecks } from 'langium';
import { ImpromptuAstType, Multimodal, Model, Parameters, Prompt, isPrompt, isByExpressionOutputTesting } from './generated/ast';
import type { ImpromptuServices } from './impromptu-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: ImpromptuServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.ImpromptuValidator;
    const checks: ValidationChecks<ImpromptuAstType> = {
        Model: validator.checkModelWellFormedRules,
        Parameters: validator.checkUniqueParams,
        Multimodal: validator.checkMultimodalInputNotText
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class ImpromptuValidator {

    /* checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    } */

    checkMultimodalInputNotText(input: Multimodal, accept: ValidationAcceptor) : void {
        if (input.format == 'text') {
            accept('error',`Textual inputs should be defined as parameters, not multi-modal inputs. \nUse '@par' instead of '$par:text'.`, { node: input, property: 'format'});
        } 
    }

    checkModelWellFormedRules(model: Model, accept: ValidationAcceptor): void {
        this.checkUniqueAssets(model, accept);
        this.checkByExpressionValidators(model, accept);
        this.checkNoCyclesInVersions(model, accept);
        this.checkNoCyclesInRefines(model, accept);
    }

    checkUniqueAssets(model: Model, accept: ValidationAcceptor): void {
        // create a set of visited assets
        // and report an error when we see one we've already seen
        const reported = new Set();
        model.assets.forEach(a => {
            if (reported.has(a.name)) {
                accept('error', `Asset has non-unique name '${a.name}'.`,  {node: a, property: 'name'});
            }
            reported.add(a.name);
        });
    }

    checkUniqueParams(parset: Parameters, accept: ValidationAcceptor): void {
        // create a set of visited parameters
        // and report an error when we see one we've already seen
        const reported = new Set();
        parset.pars.forEach(p => {
            if (reported.has(p.name)) {
                accept('error', `Input has non-unique name '${p.name}'.`,  {node: p, property: 'name'});
            }
            reported.add(p.name);
        });
    }

    checkNoCyclesInVersions(model: Model, accept: ValidationAcceptor): void {
        model.assets.forEach(a => {
            if (a.priorVersion != undefined) {
                let node = model.assets.filter(p => p.name == a.priorVersion?.$refText)[0];
                let b = false;
                while (node != undefined && !b) {
                    if (node.name == a.name) {
                        accept('error', `Cannot be cycles in prior version relationship.`,  {node: a, property: 'priorVersion'});
                        break;
                    }
                    if (node.priorVersion != undefined)
                        node = model.assets.filter(a => a.name == node.priorVersion?.$refText)[0];
                    else
                        b = true;
                }
            }
        });
    }

    checkNoCyclesInRefines(model: Model, accept: ValidationAcceptor): void {
        model.assets.forEach(a => {
            if (a.refines != undefined) {
                let node = model.assets.filter(p => p.name == a.refines?.$refText)[0];
                let b = false;
                while (node != undefined && !b) {
                    if (node.name == a.name) {
                        accept('error', `Cannot be cycles in refinement relationship.`,  {node: a, property: 'refines'});
                        break;
                    }
                    if (node.refines != undefined)
                        node = model.assets.filter(a => a.name == node.refines?.$refText)[0];
                    else
                        b = true;
                }
            }
        });
    }

    checkByExpressionValidators(model: Model, accept: ValidationAcceptor): void {
        model.assets.forEach(a => {
            if (isByExpressionOutputTesting(a)) {
                const validator = (model.assets.filter(p => isPrompt(p) && p.name == a.validator.$refText)[0] as unknown) as Prompt;
                // verify that the output media is text
                if (validator && validator.output != 'text')
                    accept('error', `The output media of validator must be of type text.`,  {node: validator, property: 'output'});
                // verify that a validator does not have a validator
                if (validator && isByExpressionOutputTesting(validator))
                    accept('error', `A validator cannot have an output validation itself.`,  {node: validator, property: 'validator'});
            }
        });
    }

//     isDescendant(model: Model, asset: Asset, accept: ValidationAcceptor) {
//         var node = model.assets.filter(a => a.name == asset.priorVersion.$refText)[0];
//         accept('error', `Asset name == '${asset.name}'; prior version name == '${node.name}'.`,  {node: asset, property: 'priorVersion'});
//         while (node != null) {
//             if (node.name == asset.name) {
//                 return true;
//             }
//             node = model.assets.filter(a => a.name == node.priorVersion.$refText)[0];
//         }
//         return false;
//    }

}
