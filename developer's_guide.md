

## Writing the syntax

### AST Tree Scheme

Model
- *language*
- *assets* (**Asset**[])
    - **Composer**
        - *name*
        - *pars*(**Input**[])
            - **Input**
                - **Parameter**
                    - *name*
                    - *description*
                - **Multimodal**
                    - *name*
                    - *format*
                    - *description*
                    - *weight*(**Weight**)
        - *contents*(**Snippet**[])
    - **ExecutableAsset**
        - **Prompt**
            - *name*
            - *description*
            - *pars*(**Parameter**[])
                - **Input**
                - **Parameter**
                    - *name*
                    - *description*
                - **Multimodal**
                    -  *name*
                    - *format*
                    - *description*
                    - *weight*(**Weight**)
            - *output* (**Media**): `'text' | 'image' | 'audio' | 'video' | '3dobject'`
            - *prefix* (**Prefix**)
                - *name* = `'prefix'`
                - *snippets* (**Snippet**[])
            - *core* (**Core**)
                - *name* = `'core'`
                - *snippets* (**Snippet**[])
            - *suffix* (**Suffix**)
                - *name* = `'suffix'`
                - *snippets* (**Snippet**[])
            - **AssetLanguage**
                - *language*: \<string> 
            - **AssetSeparator**
                - *separator*: \<string>

        - **Chain**
- *imports* (**ImportedAsset**[]):
    - **ImportedAsset**
        -  *set_assets* / *everyone*
            - *set_assets* (**AssetImport**[])
                - **AssetImport**
                    - asset (<u>*Ref <b>Asset</b>*</u>)

            - *everyone* = `'*'`
            
        - *library*: QualifiedName
-------
**Snippet**
- *content* (**BaseSinppet**)
    - **TextLiteral**
        - *content*
    - **InputRef**
        - **ParameterRef**
            - *param* (<u>*Ref <b>Parameter</b>*</u>)
        - **MultimodalRef**
            - *param* (<u>*Ref <b>Multimodal</b>*</u>)
    - **AssetReuse**
        - *asset* (<u>*Ref <b>Referenciable</b>*</u>)
        - *pars* (**ParamInvokation**)
            - *pars* (**Snippet**[])
    - **Trait** (*See more info in the [traits' cheat sheet](traits_cheat_sheet.md)*)
        - **TextTrait**
            - **LiteraryStyleTrait**
            - LanguageRegisterTrait
            - PointOfViewTrait
        - **ImageTrait**
            - MediumTrait
            ...
            - EffectsTrait
        - MediumIndependentTrait
            - RelativeTrait
            ...
            - ComparisonTrait

- *weight*(**Weight**)
    - *relevance* (**Relevance**) = `'min' | 'low' | 'medium' | 'high' | 'max'`

Scheme:

<img src="pictures/impromptu.drawio.png"></img>
You can se close the scheme in the [pictures/impromptu.drawio.png](pictures/impromptu.drawio.png) file.

## Writing the logic
### Types of errors and their syntax

There are two types of possible errors that it may occurr: validation errors or compilation errors.
- <b>Validation errors</b>. These errors are related to errors of the Impromptu syntax in the Langium document. Therefore, they are detected before creating the AST.
- <b>Compilation errors</b>. There are another errors that are only detected when the prompt is being generated.

The errors have the following syntax:
```
[<file>: <line>] Error: <description>
```
In case the error occurs in a imported file, that file and all their parents have errors. <b> The first one which sends the error is the child</b>:
```
There are validation errors:
[libraries/tests/import_testB.prm: 9] Error : Expecting: one of these possible Token sequences:
  1. [@]
  2. [$]
but found: ':' [:]
[libraries/tests/import_testB.prm: 9] Error : Expecting token of type `)` but found `:`. [:]
[libraries/tests/import_testA.prm: 6] Error : error in imported asset B.
[examples/examples_import/error_in_import.prm: 7] Error : error in imported asset main.
```
### Generating prompts for additional AI systems

In order to support platform-specific prompts for further generative AI services, just extend the file `generate-prompt.ts` by adding the new AI system in the enumeration and implementing the generating code within the `generatePromptCode` function:

```
export const AISystem = {
    ChatGPT: "chatgpt",
    StableDiffusion: "stable-diffusion",
    Midjourney: "midjourney",
    DESTINATIONPLATFORM: "DESTINATIONPLATFORM"
}

// If prompt is not informed, the generator will consider all the prompts included in the model;
// will generate the code for a single prompt, otherwise.
export function generatePromptCode(model: Ast.Model, aiSystem: string | undefined, prompt: Ast.Prompt | undefined): string[] | undefined {
    var result;
    switch(aiSystem) {
        ...
        case AISystem.DESTINATIONPLATFORM: {
            result = generatePrompt_DESTINATIONPLATFORM(model, prompt);
            break;
        }
        ...
    }
    ...
}
```
## Folder System
The main folders important to the developtment of the aplication are:

- `__test__`, where are located the unitary tests. For more information, see the [Testing](#testing) section.
- `.vscode` Here are the json files that defines how the vscode expansion would behave.
- `bin`. Here are located the two "entrances" to the Impromptu server
- `src`. In this folder is located the core of the application

## `/bin`

Originally, this folder only contained the file `/bin/cli`, which starts the Impromptu service. Lately, `/bin/server_main.js` was added. When run, the file starts a node http server with the functionalities of Impromptu, which means that Impromptu can be used from other places and languages by running this file.
Thus, the file contains a series of responses to POST calls:
- `generateprompt`: It receives 
    - `content`
    - `aiSystem`
    - `prompt`

And returns the redacted prompt of content for the LLM declared (only the asset prompt if declared).

### `src/cli`

In this folder are the **management of the calls to Impromptu**, specifically the ones made by CLI option. 
- `index.ts`. It is the main file. It manages the CLI calls.

- `cli-utils.ts`. In this file there are multiple functions that offers multiple utilities for functions of the other files:

    - extractDocument
    - extractAstNode
    - extractDestinationAndName
    - `get_imported_asset` (Deprecated).
    - `get_line_node` Gets the line of an asset (UIsed to communicate errors)
    - `get_file_from` (FilePathData interface) Gets the file of a certain asset (maybe deprecated)
    - `getLanguage` Get the Language of the document



- `generate-prompt.ts`. In this file is located the code that gets the prompt based on the file `.prm` given. The prompt is generated . It returns a `.txt` file with the generated prompt. It is connected with the files that generate the prompt for each LLM (such as `generate-prompt_ChatGPT.ts`). In case no LLM was declared, the prompt will be generated using the default protocol (`generate-prompt_default.ts`)


### `/src/language-server`

In this folder are the files related to the **syntax, scope and grammar** of Impromptu.
 main.ts  is where the Langium Service is initialized. 

- `impromptu.langium` contains the syntax of Impromptu. See Impromptu Syntax for more details.


- `impromptu-scope.ts`. Here are located the modification to Langium's default scope () that Impromptu has. See [the section about Scoping](#imports-scoping-srclanguage-serverimpromptu-scopets) for further details.
- `impromptu-validation.ts`. Here are located the modification to Langium's default validation that Impromptu has.


- `impromptu-module.ts`. Manages the coordination of the adove objects creted in the files adove. It is important to remark that if a new modification is added to those files, the type `ImpromptuModule` and the object `ImpromptuModule` from this file has to be changed as well.




#### Vscode extension files
In this folder are located as well the files for running the vscode mode. These files are `extension.ts` and `impromptu-code-generator.ts`.
The first one contains the functions related to the setup of the vscode extension while the second one contains the function that selects the .prm file and generates the python code.





## Typescript

In this section it will be explained how one can interact with the different elements of the AST of a .prm in typescript, in order to create and edit the `generate-prompt_` files:

1. One can access the elements of an asset object (asn Ast.node) as if they were their attributes. For example, if `p` is an Ast.Prompt which references the prompt `prompt prueba(...`, `p.name` would be `"prueba"`.
2. As in java objects, this can be chained alonside multiple asset.
3. The most complex parts, such as the mapping of the inputs and their parameter values (including the case of an AssetReuse with the Asset is linked)
4. If an asset can be different types of assets (for example, an Asset can be a Prompt, a Composer, etc), one can use the functions of type `is<asset_name>(<AstNode>)` to do a conditional, or the atribute `$type` of the AstNodes to make a switch structure. Nevertheless, the first method is recommended over the second since `$type` is suppose to work as a private variable.

## Imports' Scoping (`src/language-server/impromptu-scope.ts`)

Here it is explained how the scoping of the imports was made:

In order to archieve a correct scoping of items imported from another file, there are needed three steps:

- **Link the reference of the import with the import itself**. This is done similarly to the parameter reference: you have to declare the map of the name and the object manually, since the doufault scope of the AssetReuse does not see Assets.

- **Reference the import with the original item in another file**. For do this correctly, and only look inside the imported file, one need to manage URIs, and add to the scope the item of those files. This is done using the `vscode\uri` package.


- Compute the exports so that the items can be refeerenciable outside of their own file properly. This is donde by forcing to **create the description of the assets during the scope computation phase**.

#### '*' import implementation

 Since in this case the asset are not refered in the ImportedAsset, **the scope has to be made directely between the AssetReuse and the Asset from the other file**, which imply that the elements we need are different from the previous case:

- Instead of the AsseReuse been linked to the assetImport which is linked to original Asset in the other file, is the AsseReuse which is connected with the original Asset. It is possible since the descriptions of the Asset are loaded in the scope computatrion phase
- This means that this is part of the AssetReuse Scope, where there are the description to the Inputs (ParameterRef) and Referenciables(other Assets+ImportedAssets)
-  We do not need extra scope computations, since we make use of the  description created to the simple case.

A similar implementation cab be found in the [file-based scoping example of the Langium Documentation](https://langium.org/docs/recipes/scoping/file-based/).

## Add a new LLM

The CLI commands `node ./bin/cli addAI <name> -f <alias> -pm <prompt_name>` and `node ./bin/cli removeAI <name>` creates and remove a new file that customize the behaviour of Impromptu while generating a prompt to that specific LLM.

This file is generated by creating a copy of the file `gen/generatic-prompt_base.ts`, which **is hidden by default**. In order to visualize it in the vscode editor, the user must first change the `-vscode/settings.json` file and change `"__test__: true"` to `"__test__: false"`. In addition of generating/removing the new file, the `gen/generate-prompt.ts` file is modified so that it adapts to the new configuration.-

## Testing

Impromptu's unit testing is performed using [Vitest](https://vitest.dev/guide/).  It requires the package versions `Vite>=5.0.0` and `Node>=18.0.0`. Its performance is similar to [Jest](), but for TypeScript Frameworks instead o JavaScript.

In order to be able to run it, first you have to install it in 

```
npm install -D vitest
```

The command to run it is

```
npm run test
```

It automatically checks every file in the folder `__test__`, and every `.spec.ts` file. This file is **initally hidden for the user**, so in order to visualize it in the vscode editor, the user must first change the `-vscode/settings.json` file and change `"__test__: true"` to `"__test__: false"`.

Another important remark the developet has to take into account is that files may contain compilation errors due to the incomplete mocks. Those errors won't affect the testing proccess, but may interrupt the compilation of the Impromptu service. For that reason, the folder `__test__` is excluded from the compiler in the `tsconfig.json` file.

Vitest does not allow to spy on child functions. Therefore, in order to test the performance of functions about the generation of the prompt, the developer must mock the objects created by Langium form the Impromptu syntax for the case they want to check.
