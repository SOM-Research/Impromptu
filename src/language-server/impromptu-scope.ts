/*import type { Parameters, Input } from './generated/ast.js';*/
import { AstNode, AstNodeDescription, AstNodeDescriptionProvider, DefaultScopeComputation, DefaultScopeProvider, getContainerOfType, LangiumDocument, ReferenceInfo, Scope} from 'langium';
import { AssetImport, isAsset,isAssetReuse,isChain,isModel, isParameterRef, Model } from './generated/ast.js';

import { LangiumServices} from "langium";


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
            if(!(isChain(prompt))){
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
                let allAssets = model.assets;
                //select the set of parameters

                const descriptions1 = allAssets.map(p => this.astNodeDescriptionProvider.createDescription(p, p.name));
                
                const descriptions2 = model.imports.flatMap(fi => fi.asset_name.map(pi => {
                    //if the import is name, return the import
                    if (pi.name) {
                        return this.descriptions.createDescription(pi, pi.name);
                    }
                    //otherwise return nothing
                    return undefined;
                }).filter(d => d != undefined)).map(d => d!);
            
                return this.createScope(descriptions1.concat(descriptions2))
            
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
    override async computeExports(document: LangiumDocument<AstNode>): Promise<AstNodeDescription[]> {
        const model = document.parseResult.value as Model;
        
        let allImports: AssetImport[] = []
        model.imports.forEach(import_line =>{ 
            allImports.concat(import_line.asset_name)}
        );
        return allImports.map(p => this.descriptions.createDescription(p, p.name));
    }
}