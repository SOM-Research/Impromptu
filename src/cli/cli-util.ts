import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { AstNode, LangiumDocument, LangiumServices } from 'langium';
import { URI } from 'vscode-uri';
import { Asset, Composer, ImportedAsset, isAssetReuse, isComposer, isImportedAsset, isModel, isPrompt, Model, Prompt, Snippet } from '../language-server/generated/ast';


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
        console.error(chalk.red('There are validation errors:'));
        var errors = []
        for (const validationError of validationErrors) {
            errors.push(`line ${validationError.range.start.line + 1}: ${validationError.message} [${document.textDocument.getText(validationError.range)}]`);
            console.error(chalk.red(
                errors.at(-1)
            ));
        }
        throw new Error(errors.join("\n"));
    }

    return document;
}

export async function extractAstNode<T extends AstNode>(fileName: string, services: LangiumServices, calls_buffer?:[string, string][]): Promise<T> {
    let libraries:string[]=[]
    let import_names: string[]=[]

    // let file = fileName.split('/').pop()?.split('.')[0] as string
    if (calls_buffer==undefined)  calls_buffer=[];
    let new_calls:[string,string][]=[]

        
    if (calls_buffer){
        const model = (await extractDocument(fileName, services)).parseResult?.value as T;
        if (isModel(model)){
            // get all the imports of the file
            model.assets.forEach( asset => {if(isImportedAsset(asset) && !calls_buffer?.find(element => element[0]==asset.library)){
                    libraries.push(asset.library);
                    import_names.push(asset.name);
                    new_calls.push([asset.library,asset.name]);
                }
            })

            // Load the libraries needed to obtain the imports

            for (let i=0; i < new_calls.length; i++){
                if (!calls_buffer.find(element=> libraries[i]==element[0] && import_names[i]==element[1] )) {
                    // Update the elements that have been called
                    calls_buffer.push(new_calls[i]);
                    const import_model = await extractAstNode<Model>(libraries[i].split(".").join("/")+".prm", services,calls_buffer);
                    let imported_assets: Asset[]=[]
                    import_model.assets.forEach(asset =>{
                        //filter to only get the wanted functions
                        if(import_names.find(element => element==asset.name)){
                            imported_assets.push(asset);
                        }
                    })
                model.assets=model.assets.concat(imported_assets);
                }else{
                }
            }
            return model
        } return (await extractDocument(fileName, services)).parseResult?.value as T;
    }
    else{
        return (await extractDocument(fileName, services)).parseResult?.value as T;
    }
 /*   
    if (isModel(model)){
        let libraries:string[]=[]
        let import_names: string[]=[]

        let file = fileName.split('/').pop()?.split('.')[0] as string
        if (calls_buffer==undefined)  calls_buffer=[];

        
        let new_calls:[string,string][]=[]
        if (!calls_buffer.find(element=> file==element[0] )) {
            model.assets.forEach( asset => {if(isImportedAsset(asset)){
                libraries.push(asset.library);
                import_names.push(asset.name);
                new_calls.push([asset.library,asset.name]);
            }else{
            }
            })
            }
        
        
        // Load the libraries needed
        console.log("calls_buffer: ",calls_buffer, "new_calls: ", new_calls)
        for (let i=0; i < new_calls.length; i++){
            if (!calls_buffer.find(element=> libraries[i]==element[0] && import_names[i]==element[1] )) {
                // Update the elements that have been called
                calls_buffer.push(new_calls[i]);
                
                console.log("calls_buffer: ",calls_buffer, "new_call: ", new_calls[i])
                const import_model = await extractAstNode<Model>("libraries/"+libraries[i]+".prm", services,calls_buffer);
                // Filter the imported assets we need

                let imported_assets: Asset[]=[]
                import_model.assets.forEach(asset =>{
                    if(import_names.find(element => element==asset.name)){
                        imported_assets.push(asset)
                        console.log("asset ", asset.name," from ", fileName , " added")
                    }
                })

                model.assets=model.assets.concat(imported_assets)
                
            }
        }
        console.log("Model: ", model.assets.length) 
        return model;
    }
    return model;*/
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

function check_loops_asset(asset:Asset, og_asset?:Asset){
    if (asset == og_asset){
        console.log(chalk.red("There is a recursive loop regarding the asset "+ og_asset.name));
        throw new Error("There is a recursive loop regarding the asset "+ og_asset.name);
    }else{
        if (!og_asset){
            og_asset = asset;
        }
        if (isPrompt(asset)){
            // Get all of snippets in a Prompt
            let elements=asset.core.snippets;
            if (asset.prefix){
                elements = elements.concat(asset.prefix.snippets);
            }
            if (asset.suffix){
                elements = elements.concat(asset.suffix.snippets);
            }
            check_loops_snippets(elements, og_asset);
        }else if(isComposer(asset)){
            // Get all of snippets in a Composer
            let elements = asset.contents.snippets;
            check_loops_snippets(elements, og_asset)
        }
        else if(isImportedAsset(asset)){
            // Get the asset ImportedAsset references
            check_loops_asset(get_imported_asset(asset), og_asset);
        }
    }
}

function check_loops_snippets(snippets:Snippet[], og_asset:Asset){
    snippets.forEach(snippet =>{
        if (isAssetReuse(snippet.content)){
            if (snippet.content.asset.ref)
                check_loops_asset(snippet.content.asset.ref, og_asset);
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
export function get_imported_asset(asset:ImportedAsset):Prompt | Composer{
    let model = asset.$container
    
    let imported_asset = model.assets.find(element => 
        asset.name == element.name && element.$container.$document?.uri.path.split('/').pop()== asset.library.split('.').pop()+'.prm' // TODO: More rigurous check
    )
    if (isPrompt(imported_asset) || isComposer(imported_asset)){ 
        return imported_asset
    }else{
        console.log(chalk.red(`Asset `+asset.name+` is not found`))
        throw new Error(`Asset `+asset.name+` is not found`)
    }
}
