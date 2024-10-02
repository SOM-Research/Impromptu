/*import type { Parameters, Input } from './generated/ast.js';*/
import {  AstNodeDescription,  DefaultScopeComputation, LangiumDocument, streamAllContents} from 'langium';
import { isAsset,isInput } from './generated/ast.js';

import { LangiumServices} from "langium";


export class ImpromptuScopeComputation extends DefaultScopeComputation {

    constructor(services: LangiumServices) {
        super(services);
    }

    override async computeExports(document: LangiumDocument): Promise<AstNodeDescription[]> {
        const exportedVariables: AstNodeDescription[] = [];
        for (const childNode of streamAllContents(document.parseResult.value)) {
            // If it is an Input
            if (isInput(childNode)) {
                const fullyQualifiedName = childNode.name;
                // "Subir" el scope de Input para que se "vean" por cualquier elemento de Prompt 
                exportedVariables.push(this.descriptions.createDescription(childNode, fullyQualifiedName, document));
            }

            // If is an AssetReuse
            else if (isAsset(childNode)){
                const fullyQualifiedName = childNode.name;
                exportedVariables.push(this.descriptions.createDescription(childNode, fullyQualifiedName, document));
            }
        }
        return exportedVariables;
    }
}
