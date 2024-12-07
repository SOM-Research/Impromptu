

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
        -  *asset_name* / *everyone*
            - *asset_name* (**AssetImport**[])
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

It automatically checks every file in the folder `__test__`, and every `.spec.ts` file. Those files may conatin compilation errors due to the incomplete mocks. Those errors won't affect the testing proccess, but may interrupt the compilation of the Impromptu service. For that reason, the folder `__test__` is excluded from the compiler in the `tsconfig.json` file.

Vitest does not allow to spy on child functions. Therefore, in order to test the performance of functions about the generation of the prompt, the developer must mock the objects created by Langium form the Impromptu syntax for the case they want to check.
