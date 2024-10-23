/*import type { Parameters, Input } from './generated/ast.js';*/
import { AstNodeDescriptionProvider, DefaultScopeProvider, getContainerOfType,  ReferenceInfo, Scope} from 'langium';
import { isAsset,isAssetReuse,isChain,isImportedAsset,isModel, isParameterRef } from './generated/ast.js';

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
            if(!(isChain(prompt)||isImportedAsset(prompt))){
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

