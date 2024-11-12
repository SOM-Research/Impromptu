import { Reference } from "langium";
import { AssetReuse, BaseSnippet, CombinationTrait, Core, Parameters, InputRef, Parameter, ParamInvokation, Prompt, Snippet, TextLiteral, Suffix, Composer, NegativeTrait, ImportedAsset, AssetImport } from "../src/language-server/generated/ast";
import { test, expect, vi } from 'vitest'
import { genAssetReuse, AISystem, genImportedAsset } from "../src/cli/generate-prompt";
import { genBaseSnippet_MJ, genAsset_MJ } from "../src/cli/generate-prompt_MJ";
import * as utils from "../src/cli/cli-util"; // Imported as module so that we can spy on its functions

//---------------------------------VARIABLES----------------------------------

/**
 * Mock of `get_imported_asset()`, which obtains the prompt an 
 * ImportedAsset is referencing. In this case, always returns `mock_prompt`
 */
function get_imported_ast(asset) {
  return mock_prompt
}

let mock_prompt_solution = '@elemento, @elemento, @elemento'

let mock_composer_solution = '@elemento,@elemento'

//--------------------------MOCK ELEMENTS--------------------------------------

/**
 * empy `Snippet`. It works to mock a `Snippet`working as a container ONLY
 */
const mock_snippet_empty:Snippet={ 
}

/**
 * Used to check that in TextLiteral the variables are not changed.
 * Content:
 * "prueba de @elemento"
 */
const mock_textLiteral:TextLiteral = {
  $container: mock_snippet_empty,
  $type: 'TextLiteral',
  content: "prueba de @elemento" 
}

/**
 * Mocks the Parameter `@elemento`
 */
const mock_Parameter: Parameter={
  name:"@elemento"
}

/**
 * Mocks the Parameter `@elemento2`
 */
const mock_Parameter2: Parameter={
  name:"@elemento2"
}

/**
 *  Mocks the reference to an object Parameter
 */
const mock_Reference: Reference<Parameter> ={
  ref: mock_Parameter,
  $refText: "@elemento"
}

/**
 *  Mocks the reference to an object Parameter
 */
const mock_Reference2: Reference<Parameter> ={
  ref: mock_Parameter2,
  $refText: "@elemento2"
}

/**
 * Mocks an InputRef, which contains a Reference to a Parameter 
 */
const mock_InputRef:InputRef = {
  $container: mock_snippet_empty,
  $type: 'ParameterRef',
  param: mock_Reference
}

/**
 * Mocks an InputRef, which contains a Reference to a Parameter 
 */
const mock_InputRef2:InputRef = {
  $container: mock_snippet_empty,
  $type: 'ParameterRef',
  param: mock_Reference2
}


/**
 * Mocks a Snippet which `content` is an InputRef object
 */
const mock_snippet_parameter:Snippet={
  content:mock_InputRef
}

/**
 * Mocks a Snippet which `content` is an TextLiteral object
 */
const mock_snippet_text:Snippet={
  content:mock_textLiteral
}

/**
 * Mocks a Snippet which `content` is a CombinationTrait object
 */
const mock_CombTrait:CombinationTrait = {
  $container: mock_snippet_empty,
  $type: 'CombinationTrait',
  contents: [mock_snippet_parameter,mock_snippet_text]
}

/**
 * Mocks the value of a ParamInvokation (that is, the value that the parameter will get)
 */
const mock_values:TextLiteral={
  $type: 'TextLiteral',
  content:"fuego"
}

/**
 * Mock an Snippet with a text literal on it. Used as the referenced objet of a ParamInvokation
 */
const mock_snippet_values:Snippet={
  $type:'Snippet',
  content: mock_values
}

/**
 * Mocks an empty ParamInvokation object (needed when the Assest resued does not have parameters)
 */
const mock_parameterInv_empty:ParamInvokation = {
  $type:ParamInvokation,
  pars:[]
}

/**
 * Mocks a TretLiteral object 
 * 
 * content:
 * "prueba"
 */
const mock_core_content: TextLiteral={
  $type: 'TextLiteral',
  content: "prueba"
}
/**
 * Mocks a Snippet part of a `core` of a prompt
 */
const mock_core_content_snippet: Snippet ={
  content:mock_core_content
}
/**
 * Mocks a `core`
 */
const mock_core: Core = {
  snippets: [mock_core_content_snippet]

}
/**
 * Mocks an empty Parameters object
 */
const mock_parameters_empty:Parameters={
  pars:[]
}

/**
 * Mocks a prompt that does not have peramters
 * 
 * @content
 * prompt child()
 * 
 * 
 * core= "prueba"
 */
const mock_Asset:Prompt = {
  $type:'Prompt',
  name: "child",
  pars:mock_parameters_empty,
  core: mock_core,
}

/**
 * Mocks the Reference to an Asset
 */
const mock_ReferenceAsset: Reference<Prompt>={
  ref:mock_Asset,
  $refText:`prompt child()\n core ="prueba"`
}

/**
 * Mocks an Asset Resue that reuse an Asset with no parameters
 */
const mock_AssetReuse_noParams:AssetReuse = {
  $type:'AssetReuse',
  asset:mock_ReferenceAsset,
  pars:mock_parameterInv_empty
}


/**
 * Mocks a Snippet that contains an InputRef
 * its content is `@elemento1`
 */
const mock_snippet_inputref:Snippet={
  content: mock_InputRef,
  $type: 'Snippet'
}

/**
 * Mocks a Snippet that contains an InputRef
 * @content `@elemento2`
 */
const mock_snippet_inputref2:Snippet={
  content: mock_InputRef2,
  $type: 'Snippet'
}


/**
 * Mocks the `prefix`of a prompt. It contains
 * 
 * @content "@elemento"
 */
const mock_prefix:Prefix={
  snippets:[mock_snippet_inputref]
}
/**
 * Mocks the `core` of a prompt. It contains
 * 
 * "@elemento"
 */
const mock_core2:Core={
  snippets:[mock_snippet_inputref]
}
/**
 * Mocks the `suffix`of a prompt. It contains
 * 
 * "@elemento"
 */
const mock_suffix:Suffix={
  snippets:[mock_snippet_inputref]
}

/**
 * Mocks the `core` of a prompt. It contains
 * 
 * "@elemento2"
 */
const mock_core_alt:Core={
  snippets:[mock_snippet_inputref2]
}


/**
 * Mocks a Parameters object with a Parameter
 */
const mock_parameters_full:Parameters={
  pars:[mock_Parameter]
}

/**
 * Mocks a Parameters object with a Parameter
 */
const mock_parameters_full2:Parameters={
  pars:[mock_Parameter2]
}


/**
 * Mocks a prompt with a `prefix`, a `suffix` and a `core` that uses Parameters (declared in `pars`)
 */
const mock_prompt:Prompt={
  pars: mock_parameters_full,
  prefix:mock_prefix,
  core: mock_core2,
  suffix: mock_suffix,
  $type:Prompt
}

/**
 * Mocks a prompt with a `prefix`, a `suffix` and a `core` that uses Parameters (declared in `pars`)
 */
const mock_prompt2:Prompt={
  pars: mock_parameters_full2,

  core: mock_core_alt,
  $type:Prompt
}


/**
 * Mocks the Contents object of a Composer with several InputRef Snippets
 */
const mock_composer_contents: Contents={
  snippets: [mock_snippet_inputref,mock_snippet_inputref]
}

/**
 * Mocks a composer with several InputRef Snippets
 */
const mock_composer: Composer={
  $type: Composer,  
  contents: mock_composer_contents
}

/**
 * Reference to a Prompt with parameters
 */
const mock_ReferenceAsset_with_parameters: Reference<Prompt>={
  ref:mock_prompt,
  $refText:`child()\n core =prueba`
}

/**
 * Mocks a ParamInvokator with a non-empty array of Snippets
 */
const mock_parameterInv_with_parameters:ParamInvokation = {
  $type:ParamInvokation,
  pars:[mock_snippet_values]
}

/**
 * Reference to a Prompt with parameters
 */
const mock_ReferenceAsset_with_parameters2: Reference<Prompt>={
  ref:mock_prompt2,
  $refText:`child()\n core =prueba`
}


/**
 * Mocks an AssetReuse that the Asset reused has parameters
 */
const mock_AssetReuse_parameters:AssetReuse = {
  $type:'AssetReuse',
  asset:mock_ReferenceAsset_with_parameters,
  pars:mock_parameterInv_with_parameters
}

const mock_audience_trait:BaseSnippet={
  $container: mock_snippet_empty,
  $type:'AudienceTrait',
  content:mock_snippet_parameter
}
const mock_negation_trait:NegativeTrait={
  $container: mock_snippet_empty,
  $type:'NegativeTrait',
  content:mock_snippet_values
}

const mock_snippet_asset_reuse: Snippet ={
  content: mock_AssetReuse_parameters
}

const mock_AssetReuse_as_parameter: ParamInvokation ={
  $type:ParamInvokation,
  pars:[mock_snippet_asset_reuse]
}



/**
 * Mocks an AssetReuse that the Asset reused has parameters
 */
const mock_AssetReuse_big:AssetReuse = {
  $type:'AssetReuse',
  asset:mock_ReferenceAsset_with_parameters2,
  pars:mock_AssetReuse_as_parameter
}

/**
 * Mocks an AssetImport
 */
const mock_asset_import:AssetImport = {
  $type: 'AssetImport',
  name: "Imported",
  library: "asset"
}


/**
 * Mocks an ImportedAsset, whch contains an AssetImport
 */
const mock_imported_asset:ImportedAsset = {
  $type: 'ImportedAsset',
  asset_name: [mock_asset_import],
  library: "asset"
}


const mock_imported_asset_ref:Reference<ImportedAsset> ={
  ref: mock_asset_import,
  $refText:"import Imported from asset"
}

/**
 * Mocks an AssetReuase referencing an Imported Asset
 */
const mock_assetReuse_imported_asset:AssetReuse = {
  $type: 'AssetReuse',
  asset: mock_imported_asset_ref,
  pars:mock_parameterInv_with_parameters

}


//--------------------------------------TESTS--------------------------------------


test('check_imported_asset', async() => {
  const spy = vi.spyOn( utils,'get_imported_asset');
  spy.mockReturnValue(mock_prompt);
  expect(genImportedAsset(mock_imported_asset, "midjourney").join()).toBe(mock_prompt_solution);
})

test('check_imported_asset_in_asset_reuse+parameters', async() => {
  // Checks that an Asset Reuse references an imported asset correctly, and the pass of parameters
  const spy = vi.spyOn( utils,'get_imported_asset');
  spy.mockReturnValue(mock_prompt);
  expect(genAssetReuse(mock_assetReuse_imported_asset, AISystem.Midjourney)).toBe('fuego, fuego, fuego') // Do the same with the rest AISystems
})

test('check_imported_asset_composer', async() => {
  // Checks that an Asset Reuse references an imported asset correctly, and the pass of parameters
  const spy = vi.spyOn( utils,'get_imported_asset');
  spy.mockReturnValue(mock_composer);
  expect(genImportedAsset(mock_imported_asset, "midjourney").join()).toBe(mock_composer_solution);
})


test('reference_in_text_literal', async() => {
  // Check that the variables are not considered if they are in a TextLiteral element
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  // mock_textLiteral= "pruebad de @elemento"
  expect(genBaseSnippet_MJ(mock_textLiteral, map)).toContain("@elemento");
  expect(genBaseSnippet_MJ(mock_textLiteral, map)).not.toContain("fuego");
  // Checks the map is NOT used
  })


test('reference_in_input_ref', async() => {
  // Check that the varibales in an ImputRef are replaced 
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  expect(genBaseSnippet_MJ(mock_InputRef, map)).toBe("fuego");
  // Checks the map is used
  })

  
test('reference_in_combination_trait', async() => {
  let map= new Map<string,string>;
  map.set( "@elemento","fuego") 
  // genBaseSnippet_MJ(mock_CombTrait, map) = [@elemento : "prueba de @elemento" :0.5]
  expect(genBaseSnippet_MJ(mock_CombTrait, map)).toContain("fuego"); // Check that the InputRef are changed
  expect(genBaseSnippet_MJ(mock_CombTrait, map)).toContain("@elemento"); // Check that the TextPlain still doesn't
})



test('reference_in_audience_trait', async() => {
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  expect(genBaseSnippet_MJ(mock_audience_trait, map)).not.toContain("fuego"); // Checks the map is NOT used
  expect(genBaseSnippet_MJ(mock_audience_trait,map)).toContain("@elemento"); // Checks the parameter is not changed
})
  
test('reference_in_negation_trait', async() => {
let map= new Map<string,string>;
map.set( "@elemento","fuego")
expect(genBaseSnippet_MJ(mock_negation_trait, map)).toBe("--no " + map.get("@elemento")) // Checks the syntaxes & refrence are correct
})

test('reference_in_prompt', async() => {
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  expect(genAsset_MJ(mock_prompt,map)[0]).toContain("fuego"); // reference in prefix, core, and suffix
  // TODO: See how to check them individually
})

test('reference_in_composer', async() => {
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  expect(genAsset_MJ(mock_composer,map)[0]).toBe("fuego"); // 1st element of the composer
  expect(genAsset_MJ(mock_composer,map)[1]).toBe("fuego"); // 2nd element of the composer
})

// Missing: reference in Chain

test('test_asset_reuse', async() => {

  expect(genAssetReuse(mock_AssetReuse_noParams, AISystem.Midjourney)).not.toBe(''); // Check that the TextPlain is called
  expect(mock_AssetReuse_noParams.asset.ref.name).toBe("child"); // Check it calls the correct asset
  expect(genAssetReuse(mock_AssetReuse_noParams, AISystem.Midjourney)).toContain(mock_core_content.content); 
  // Check that the content of the child asset is written
  
})

test('reference_in_asset_reuse', async() => {
  
  expect(mock_AssetReuse_parameters.asset.ref?.pars.pars[0].name).toBe("@elemento");
  // @elemento is detected as a variable in the og asset
  expect(mock_AssetReuse_parameters.pars.pars[0].content.content).toBe("fuego");
  // The reference to the asseset has "fuego" as the value of "@elemento"
  expect(genAssetReuse(mock_AssetReuse_parameters, AISystem.Midjourney)).toContain("fuego");
  // The assign of the varibales is done correctly
})

test('asset_reuse_in_asset_reuse' , async() => {
  // Case were the variable/s of an AssetReuse is another AssetResuse with some parameters.
  // See that the mapping of those parameters has be done correctly
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  map.set( "@elemento2","agua")
  expect(mock_AssetReuse_big.asset.ref?.pars.pars[0].name).toBe("@elemento2");  // The local parameter in the main asset reuse is @elemento2, which globally is assigned to "agua"
  expect(genAssetReuse(mock_AssetReuse_big, AISystem.ChatGPT, map)).toContain("fuego") // The asset resued used as variable reutns "fuego"
})

test('custom_separator', async() => {
  mock_prompt
  mock_prompt.separator = "..."
  expect(genAsset_MJ(mock_prompt)[0]).toContain("@elemento...@elemento") // The separator is used correctly
  expect(genAsset_MJ(mock_prompt)[0].endsWith("...")).toBe(false) // The separator is not implemented at the end
})


