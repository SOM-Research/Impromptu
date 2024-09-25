import { Reference } from "langium";
import { AssetReuse, BaseSnippet, CombinationTrait, Core, Parameters, InputRef, Parameter, ParamInvokation, Prompt, Snippet, TextLiteral, Suffix, Composer, NegativeTrait } from "../src/language-server/generated/ast";
import { test, expect, vi } from 'vitest'
import { genBaseSnippet_MJ, getAssetReuse, AISystem, genAsset_MJ, genAudienceTrait_MJ } from "../src/cli/generate-prompt";


//---------------------------------VARIABLES----------------------------------
/**
 * Example of mapping between `Input` and `Parameter`
 * "@elemento" -> "fuego"
 */


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
 *  Mocks the reference to an object Parameter
 */
const mock_Reference: Reference<Parameter> ={
  ref: mock_Parameter,
  $refText: "@elemento"
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
 * 
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
 */
const mock_snippet_inputref:Snippet={
  content: mock_InputRef,
  $type: 'Snippet'
}

/**
 * Mocks the `prefix`of a prompt. It contains
 * 
 * "@elemento"
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
 * Mocks a Parameters object with a Parameter
 */
const mock_parameters_full:Parameters={
  pars:[mock_Parameter]
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


//--------------------------------------TESTS--------------------------------------



test('reference_in_text_literal', async() => {
  // Check that the variables are not considered if they are in a TextLiteral element
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
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

  expect(genBaseSnippet_MJ(mock_CombTrait, map)).toContain("fuego"); // Check that the InputRef are changed
  expect(genBaseSnippet_MJ(mock_CombTrait, map)).toContain("@elemento"); // Check that the TextPlain still doesn't
  
})



test('reference_in_audience_trait', async() => {
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  expect(genBaseSnippet_MJ(mock_audience_trait, map)).not.toContain("fuego"); // Checks the map is NOT used
  expect(genBaseSnippet_MJ(mock_audience_trait,map)).toContain("@elemento"); // Checks the parameter is not changed
})
  
test('reference_in_audience_trait', async() => {
  expect(genBaseSnippet_MJ(mock_audience_trait, map)).not.toContain("fuego"); // Checks the map is NOT used
  expect(genAudienceTrait_MJ(mock_audience_trait)).toContain("@elemento"); // Checks the parameter is not changed
})


test('reference_in_negation_trait', async() => {
let map= new Map<string,string>;
map.set( "@elemento","fuego")
expect(genBaseSnippet_MJ(mock_negation_trait, map)).toBe("--no " + map.get("@elemento")) // Checks the syntaxes & refrence are correct
  
})



test('reference_in_prompt', async() => {
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  expect(genAsset_MJ(mock_prompt,map)[0]).toBe("fuego"); // reference in prefix
  expect(genAsset_MJ(mock_prompt,map)[1]).toBe("fuego"); // reference in core
  expect(genAsset_MJ(mock_prompt,map)[2]).toBe("fuego"); // reference in suffix
})

test('reference_in_composer', async() => {
  let map= new Map<string,string>;
  map.set( "@elemento","fuego")
  expect(genAsset_MJ(mock_composer,map)[0]).toBe("fuego"); // 1st element of the composer
  expect(genAsset_MJ(mock_composer,map)[1]).toBe("fuego"); // 2nd element of the composer
})

// Missing: reference in Chain

test('test_asset_reuse', async() => {

  expect(getAssetReuse(mock_AssetReuse_noParams, AISystem.Midjourney)).not.toBe(''); // Check that the TextPlain is called
  expect(mock_AssetReuse_noParams.asset.ref.name).toBe("child"); // Check it calls the correct asset
  expect(getAssetReuse(mock_AssetReuse_noParams, AISystem.Midjourney)).toContain(mock_core_content.content); 
  // Check that the content of the child asset is written
  
})

test('reference_in_asset_reuse', async() => {
  
  expect(mock_AssetReuse_parameters.asset.ref?.pars.pars[0].name).toBe("@elemento");
  // @elemento is detected as a variable in the og asset
  expect(mock_AssetReuse_parameters.pars.pars[0].content.content).toBe("fuego");
  // The reference to the asseset has "fuego" as the value of "@elemento"
  expect(getAssetReuse(mock_AssetReuse_parameters, AISystem.Midjourney)).toContain("fuego");
  // The assign of the varibales is done correctly
})

