/*import type { Parameters, Input } from './generated/ast.js';*/
import { AstNode, AstNodeDescription, AstNodeDescriptionProvider, DefaultScopeComputation, DefaultScopeProvider, getContainerOfType, getDocument, LangiumDocument, ReferenceInfo, Scope} from 'langium';
import { Asset, ImpromptuAstType, isAsset,isChain, Model} from './generated/ast.js';

import { LangiumServices} from "langium";
import { join } from 'path';
import { URI } from 'vscode-uri';


export class ScopeParamProvider extends DefaultScopeProvider {
    private astNodeDescriptionProvider: AstNodeDescriptionProvider;
    
    constructor(services: LangiumServices) {
        //get some helper services
        super(services)
        this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
    }

    override getScope(context: ReferenceInfo): Scope {
        //make sure which cross-reference you are handling right now
        switch(context.container.$type as keyof ImpromptuAstType ) {
        // The Parameters referenced are located in the first line of the same prompt
            case 'ParameterRef':
                if(context.property === 'param') {
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
                    
                }break;

            // The Snippets referenced are other snippets, in a different file
            case 'AssetImport':
                if( context.property === 'asset') {
                    return this.getExportedAssetsFromGlobalScope(context)
                }break;
            
            // The Snippets referenced are a Refenciable
            case 'AssetReuse':
                if( context.property === 'asset') {
                    return this.getImportedAssetsFromCurrentFile(context);
                }break;
            }
        return super.getScope(context);
    }
    
    private getExportedAssetsFromGlobalScope(context: ReferenceInfo): Scope {
        //get document for current reference
        const document = getDocument(context.container);
        document.uri
        //get model of document
        const model = document.parseResult.value as Model;
        //get URI of current document
        const currentUri = document.uri;

        let workspace_path = process.env.WORKSPACE
        if (!workspace_path){
            workspace_path= process.cwd()
        }

        //get folder of current document
        const currentDir = join(currentUri.with({path:workspace_path}).path,'build_files')
        const uris = new Set<string>();
        //for all file imports of the current file
        
        for (const asset_name of model.imports) {
            //resolve the file name relatively to the current file
            // Get the absolute path of the file
            const filePath = join(currentDir,asset_name.library.split('.').join('/')+'.prm');
            //create an URI withe absolute path
            const uri=URI.from({scheme:'file',path: filePath.split('\\').join('/')}) 
           
            // Exmple of uri.toString(): 'file:///c%3A/Users/......../Impromptu/build_files/examples/example.prm')
            uris.add(uri.toString());
        }
        //get all possible assets from these files
        //console.log("Document: ",document.uri)
        const astNodeDescriptions = this.indexManager.allElements(Asset,uris).toArray();
        //convert them to descriptions inside of a scope
        return this.createScope(astNodeDescriptions);
    }

    private getImportedAssetsFromCurrentFile(context: ReferenceInfo) {
        //get current document of reference
        const document = getDocument(context.container);
        //get current model
        const model = document.parseResult.value as Model;
         
        if(model){
            let allAssets = model.assets;
            //select the set of parameters

            const descriptions1 = allAssets.map(p => this.astNodeDescriptionProvider.createDescription(p, p.name));
            
            const descriptions2 = model.imports.flatMap(fi => fi.asset_name.map(pi => {

                if (pi.asset.ref) {
                    return this.descriptions.createDescription(pi.asset.ref, pi.asset.ref.name);
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
}

export class ImpromptuScopeComputation extends DefaultScopeComputation {
    override async computeExports(document: LangiumDocument<AstNode>): Promise<AstNodeDescription[]> {
        const model = document.parseResult.value as Model;
        return model.assets
            .map(a => this.descriptions.createDescription(a, a.name));
    }
}
