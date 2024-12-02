import chalk from 'chalk';
import path from 'path';
import { AstNode, LangiumDocument, LangiumServices } from 'langium';
import { URI } from 'vscode-uri';
import { Asset, AssetImport, ImportedAsset, isChain, isImportedAsset, isModel, Model } from '../language-server/generated/ast';
import globby from 'globby';


export async function extractDocument(fileName: string, services: LangiumServices): Promise<LangiumDocument> {
    const extensions = services.LanguageMetaData.fileExtensions;
   
    if (!extensions.includes(path.extname('build_files/'+fileName))) {
        console.error(chalk.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
        process.exit(1);
    }
    let documents:LangiumDocument<AstNode>[] = []
    const document = services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve('build_files/'+fileName))); // Here is the problem
    const files = await globby("**/*.prm");   // Get all .prm files
    files.forEach(file => 
        documents.push(services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(file))))
    )
    await services.shared.workspace.DocumentBuilder.build(documents, { validationChecks: 'all' }); // Build the document. We need to pass all the .prm files to check for importation errors

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

/**
 * Build the Langium Document that allows to analyze the `.prm` file
 * @param fileName uri of the file, relative to the folder `build_files`
 * @param services LangiumService
 * @param calls_buffer Auxiliar variable with the Assets "visited"
 * @returns 
 */
export async function extractAstNode<T extends AstNode>(fileName: string, services: LangiumServices, calls_buffer?:AssetImport[]): Promise<T> {
    let libraries:string[]=[]
    let import_names: string[]=[]

    // let file = fileName.split('/').pop()?.split('.')[0] as string
    if (calls_buffer==undefined)  calls_buffer=[];
    let new_calls:AssetImport[]=[]

    // Checks all the imports. Needed for the CLI mode
    if (calls_buffer){
        const model = (await extractDocument(fileName, services)).parseResult?.value as T;
        
        if (isModel(model)){
            // get all the imports of the file
            model.imports.forEach( import_line => {
                import_line.asset_name.forEach( asset =>{
                    // Checks that it is imported from a different file
                    //if(! calls_buffer?.find(element => (element.$container as ImportedAsset).library==(asset.$container as ImportedAsset).library)){
                        libraries.push((asset.$container as ImportedAsset).library);
                        if (asset.name){
                            import_names.push(asset.name);
                        }
                        new_calls.push(asset);
                    //}
                })   
            })
            
            

            var exists_errors=false; //Mark there are errors or not
            for (let i=0; i < new_calls.length; i++){
                try{
                    if (!calls_buffer.find(element=> libraries[i]==(element.$container as ImportedAsset).library && import_names[i]==element.name )) {
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

/**
 * Obtain the path were the final with the generated prompt will be located, nad the name of it
 * @param filePath uri of the .prm file
 * @param destination  route given by the user. If `undefined`, it will be generated in build-files/generated 
 * @returns { destination path , name }
 */
export function extractDestinationAndName(filePath: string, destination: string | undefined): FilePathData {
    filePath = path.basename(filePath, path.extname(filePath)).replace(/[.-]/g, '');
    return {
        destination: destination ?? path.join(path.dirname(filePath), 'build_files/generated'),
        name: path.basename(filePath)
    };
}


/**
 * Returns the asset from the library which Impoorted Asset refereces
 * @param asset 
 * @returns 
 */
export function get_imported_asset(asset: AssetImport):Asset{
    if (isImportedAsset(asset.$container)){
        if (asset.asset.ref){
            return asset.asset.ref
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