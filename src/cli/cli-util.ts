import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { AstNode, LangiumDocument, LangiumServices } from 'langium';
import { URI } from 'vscode-uri';
import { Asset, AssetImport, Composer, ImportedAsset, isAsset, isAssetImport, isAssetReuse, isChain, isComposer, isImportedAsset, isModel, isPrompt, Model, Prompt, Snippet } from '../language-server/generated/ast';


export async function extractDocument(fileName: string, services: LangiumServices): Promise<LangiumDocument> {
    const extensions = services.LanguageMetaData.fileExtensions;
    if (!extensions.includes(path.extname(fileName))) {
        console.error(chalk.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
        process.exit(1);
    }

    if (!fs.existsSync(fileName)) {
        console.error(chalk.red(`File ${fileName} does not exist.`));
        process.exit(1);
    }

    const document = services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(fileName)));
    await services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });

    const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
    if (validationErrors.length > 0) {
        console.error(chalk.red(`There are validation errors in ${fileName}:`));
        var errors = []
        for (const validationError of validationErrors) {
            errors.push(`[${fileName}: ${validationError.range.start.line + 1}] Error : ${validationError.message} [${document.textDocument.getText(validationError.range)}]`);
            console.error(chalk.red(
                errors.at(-1)
            ));
        }
        console.error(chalk.red("----------------------------------------------------------------------------"))
        throw new Error(errors.join("\n"));
    }

    return document;
}

export async function extractAstNode<T extends AstNode>(fileName: string, services: LangiumServices, calls_buffer?:AssetImport[]): Promise<T> {
    let libraries:string[]=[]
    let import_names: string[]=[]

    // let file = fileName.split('/').pop()?.split('.')[0] as string
    if (calls_buffer==undefined)  calls_buffer=[];
    let new_calls:AssetImport[]=[]

        
    if (calls_buffer){
        const model = (await extractDocument(fileName, services)).parseResult?.value as T;
        if (isModel(model)){
            // get all the imports of the file
            model.imports.forEach( import_line => {
                import_line.asset_name.forEach( asset =>{
                    // Checks that it is imported from a different file
                    //if(! calls_buffer?.find(element => (element.$container as ImportedAsset).library==(asset.$container as ImportedAsset).library)){
                        libraries.push((asset.$container as ImportedAsset).library);
                        import_names.push(asset.name);
                        new_calls.push(asset);
                    //}
                })   
            })
            // Also
/// REHACER TODO: Buffer tiene que construirse de otra manera
            // Load the libraries needed to obtain the imports
            var exists_errors=false; //Mark there are errors or not
            for (let i=0; i < new_calls.length; i++){
                try{
                    if(import_names[i]=='*'){
                        calls_buffer.push(new_calls[i]);
                        const import_model = await extractAstNode<Model>(libraries[i].split(".").join("/")+".prm", services,calls_buffer);
                        let imported_assets: Asset[]=[];
                        import_model.assets.forEach(asset =>{
                                imported_assets.push(asset);
                        });
                        model.assets=model.assets.concat(imported_assets);
                    }
                    else if (!calls_buffer.find(element=> libraries[i]==(element.$container as ImportedAsset).library && import_names[i]==element.name )) {
                        // Update the elements that have been called
                        calls_buffer.push(new_calls[i]);
                        
                        const import_model = await extractAstNode<Model>(libraries[i].split(".").join("/")+".prm", services,calls_buffer);
                        let imported_assets: Asset[]=[];
                        import_model.assets.forEach(asset =>{
                            //filter to only get the wanted functions
                            if(import_names.find(element => element==asset.name)){
                                imported_assets.push(asset);
                            }
                        });
                        model.assets=model.assets.concat(imported_assets);
                    }else{
                    }
                }
                catch (e){
                    let line = get_line_node(new_calls[i]);
                    console.error(chalk.red(`[${fileName}: ${line}] Error in the imported file "${(new_calls[i].$container as ImportedAsset).library}.prm".`));
                    console.error(chalk.red("----------------------------------------------------------------------------"))
                    exists_errors = true
                }
            }
            if(exists_errors) throw new Error();
            return model
        } return (await extractDocument(fileName, services)).parseResult?.value as T;
    }
    else{
        return (await extractDocument(fileName, services)).parseResult?.value as T;
    }

}


interface FilePathData {
    destination: string,
    name: string
}

export function extractDestinationAndName(filePath: string, destination: string | undefined): FilePathData {
    filePath = path.basename(filePath, path.extname(filePath)).replace(/[.-]/g, '');
    return {
        destination: destination ?? path.join(path.dirname(filePath), 'generated'),
        name: path.basename(filePath)
    };
}


export function check_loops(model:Model){
    model.assets.forEach(asset =>{
        check_loops_asset(asset)
    });
}

function check_loops_asset(asset:Asset, og_asset?:Asset[]){
    
    if (og_asset?.includes(asset)){
        let line = get_line_node(asset);
        let fileName = get_file_from(asset)
        console.error(chalk.red(`[${fileName}: ${line}] Error: There is a recursive loop regarding the asset ${asset.name}`));
        throw new Error("There is a recursive loop regarding the asset "+ asset.name);
    }else{
        if (!og_asset){
            og_asset = [];
        }
        if (isPrompt(asset)){
            // Get all of snippets in a Prompt
            if (asset.core.snippets != undefined){
                let elements=asset.core.snippets;
                if (asset.prefix){
                    elements = elements.concat(asset.prefix.snippets);
                }
                if (asset.suffix){
                    elements = elements.concat(asset.suffix.snippets);
                }
                og_asset.push(asset)
                check_loops_snippets(elements, og_asset );
            }
        }else if(isComposer(asset)){
            // Get all of snippets in a Composer
            let elements = asset.contents.snippets;
            og_asset.push(asset)
            check_loops_snippets(elements, og_asset)
        }
    }
}

function check_loops_snippets(snippets:Snippet[], og_asset:Asset[]){
    snippets.forEach(snippet =>{
        if (isAssetReuse(snippet.content)){
            if (snippet.content.asset.ref)
                if (isAsset(snippet.content.asset.ref)){
                    check_loops_asset(snippet.content.asset.ref, og_asset);
                } else if(isAssetImport(snippet.content.asset.ref)){
                    check_loops_asset(get_imported_asset(snippet.content.asset.ref), og_asset);
                }
                
            if (snippet.content.pars)
                check_loops_snippets(snippet.content.pars.pars, og_asset);
        }
    })
}


/**
 * Returns the asset from the library which Impoorted Asset refereces
 * @param asset 
 * @returns 
 */
export function get_imported_asset(asset: AssetImport):Prompt | Composer{
    if (isImportedAsset(asset.$container)){
        let model = asset.$container.$container
        
        let imported_asset = model.assets.find(element =>{
            let re = new RegExp(String.raw`${asset.name}`, "g"); 
            return re.test(element.name) && element.$container.$document?.uri.path.split('/').pop()== (asset.$container as ImportedAsset).library.split('.').pop()+'.prm' // TODO: More rigurous check
            })
        if (isPrompt(imported_asset) || isComposer(imported_asset)){ 
            return imported_asset
        }else{
            let file = get_file_from(asset);
            let line = get_line_node(asset);
            console.error(chalk.red(chalk.red(`[${file}: ${line}] Error: Asset ${asset.name} is not found`)));
            throw new Error(chalk.red(`[${file}: ${line}] Error: Asset ${asset.name} is not found`))
        
        }
    } 
    let file = get_file_from(asset);
    let line = get_line_node(asset);
    throw new Error(chalk.red(`[${file}: ${line}] Error: Asset ${asset.name} is not found`))
}




/**
 * Given an element of an AST, return the line where it is located, as a string
 * @param node object
 * @returns string (unknow if fails)
 */
export function get_line_node(node:AstNode):string{
    let line
    if (node.$cstNode?.range.start.line){
        line = (node.$cstNode?.range.start.line +1).toString();
    }else line = "unknown";
    return line
}


/**
 * Given an asset of an AST, return the file where is located
 * @param node object
 * @returns string if exits
 */
export function get_file_from(node:AstNode):string|undefined{
    return node.$cstNode?.root.element.$document?.uri.path //.split('/').pop()
}

export function getLanguage(asset:Asset){
    if (!isChain(asset)){
        if (asset.language){
            return asset.language
        }
    }
    if (asset.$container && (asset.$container as Model).language!= undefined){
        return (asset.$container as Model).language.name
    }else{ // By default, language is English
        return "English"
    }
}