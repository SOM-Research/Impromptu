/*import type { Parameters, Input } from './generated/ast.js';*/
import {  AstNode,  AstNodeDescription,  DefaultScopeComputation,  DefaultScopeProvider, LangiumDocument, ScopeOptions, stream, Stream, streamAllContents} from 'langium';
import { isAsset, isAssetReuse, isChain, isInput, isModel, isParameterRef } from './generated/ast.js';

import { ReferenceInfo, Scope,  LangiumServices, AstNodeDescriptionProvider } from "langium";
import { Position } from 'vscode';


export class ScopeParamProvider extends DefaultScopeProvider {
    private astNodeDescriptionProvider: AstNodeDescriptionProvider;
    
    constructor(services: LangiumServices) {
        //get some helper services
        super(services)
        this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
    }

    override getScope(context: ReferenceInfo): Scope {
        //make sure which cross-reference you are handling right now
        if(isParameterRef(context.container) && context.property === 'param') {
            //Handing the reference of a 'param'
            
            //get the prompt it belongs
            const prompt = getContainerOfType(context.container, isAsset)
            var parset
            if(!isChain(prompt)){
                parset = prompt?.pars
            }
            else{
                parset = undefined
            }
            //select the set of parameters

            if(parset){
                const descriptions = parset.pars.map(p => this.astNodeDescriptionProvider.createDescription(p, p.name));
                return this.createScope(descriptions)
            } 
            // If not, it means that any parameter have been declared in the prompt
            else{
                return super.getScope(context);
            }
        }

        else if(isAssetReuse(context.container) && context.property === 'asset') {
            //Handing the reference of a 'param'
            
            const model = getContainerOfType(context.container, isModel)
            if(model){
                var allAssets = model.assets
            //select the set of parameters

            if(allAssets){
                const descriptions = allAssets.map(p => this.astNodeDescriptionProvider.createDescription(p, p.name));
                return this.createScope(descriptions)
            } 
            }
            
            // If not, it means that any parameter have been declared in the prompt
            else{
                return super.getScope(context);
            }
        }       
        
        return super.getScope(context);
    }


    
}


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

/*-------------------AstUtilsFunctions----------------*/
/**
 * Walk along the hierarchy of containers from the given AST node to the root and return the first
 * node that matches the type predicate. If the start node itself matches, it is returned.
 * If no container matches, `undefined` is returned.
 */
function getContainerOfType<T extends AstNode>(node: AstNode | undefined, typePredicate: (n: AstNode) => n is T): T | undefined {
    let item = node;
    while (item) {
        if (typePredicate(item)) {
            return item;
        }
        item = item.$container;
    }
    return undefined;
}

export interface AstStreamOptions {
    /**
     * Optional target range that the nodes in the stream need to intersect
     */
    range?: Range
}
export interface Range {
    /**
     * The range's start position.
     */
    start: Position;
    /**
     * The range's end position.
     */
    end: Position;
}


export class MapScope implements Scope {
    readonly elements: Map<string, AstNodeDescription>;
    readonly outerScope?: Scope;
    readonly caseInsensitive: boolean;

    constructor(elements: Iterable<AstNodeDescription>, outerScope?: Scope, options?: ScopeOptions) {
        this.elements = new Map();
        this.caseInsensitive = options?.caseInsensitive ?? false;
        for (const element of elements) {
            const name = this.caseInsensitive
                ? element.name.toLowerCase()
                : element.name;
            this.elements.set(name, element);
        }
        this.outerScope = outerScope;
    }

    getElement(name: string): AstNodeDescription | undefined {
        const localName = this.caseInsensitive ? name.toLowerCase() : name;
        const local = this.elements.get(localName);
        if (local) {
            return local;
        }
        if (this.outerScope) {
            return this.outerScope.getElement(name);
        }
        return undefined;
    }

    getAllElements(): Stream<AstNodeDescription> {
        let elementStream = stream(this.elements.values());
        if (this.outerScope) {
            elementStream = elementStream.concat(this.outerScope.getAllElements());
        }
        return elementStream;
    }

}