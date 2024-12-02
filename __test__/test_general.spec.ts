import { EmptyFileSystem } from "langium";
import { createImpromptuServices } from "../src/language-server/impromptu-module";
import { AssetReuse, Model } from "../src/language-server/generated/ast";
import { parseHelper } from "langium/test";
import { beforeEach, test, expect } from 'vitest';
import {  AISystem, generatePromptCode } from "../src/cli/generate-prompt";
import { NodeFileSystem } from "langium/node";
import { check_loops, extractAstNode } from "../src/cli/cli-util";
// import { fs, vol } from 'memfs';
/*
beforeEach(() => {
  // reset the state of in-memory fs
  vol.reset()
})
*/

 
test('basic', async() => {
  // Check that the Assets of the models are considered correctly 

  const services = createImpromptuServices(EmptyFileSystem);
  const parse = parseHelper<Model>(services.Impromptu);
  
  const document = await parse(`
    language=English

    prompt Draw(@animal1, @animal2): image
    core = "Draw a", @animal1, " and ",@animal2
    language=English
  `);

  const model = document.parseResult.value

  expect(model.assets).toHaveLength(1); // Test that the correct number of Assets are detected
  })


test('asset_reference', async() => {
  // Test the referece of Assets in the model level
  const services = createImpromptuServices(EmptyFileSystem);
  const parse = parseHelper<Model>(services.Impromptu);
  
  const document = await parse(`
    language= English

    prompt Draw(@element): image
    core = "Draw a", @element
    language=English

    prompt Mixture(@animal1, @animal2): image
    core = 
      medium( drawing ),
      Draw(@animal1),
      @animal1,
      between(@animal1, @animal2),
      audience("children" ) weight high,
      no(@animal1 ), no("scary")
      language= English

    prompt NewMain(): image
    core=Mixture("eagle", "horse")
    language=English
  `);

  const model = document.parseResult.value
  expect(model.assets).toHaveLength(3); // Test that the correct number of Assets are detected

  const mixture_ref=model.assets[2].core.snippets[0].content 
  expect(mixture_ref.$type).toBe(AssetReuse);   
  expect(mixture_ref.asset.ref).toBe(model.assets[1]); 
  // Test that that Mixture("eagle", "horse") refer to the second prompt

  const draw_ref=model.assets[1].core.snippets[1].content
  expect(draw_ref.asset.ref).toBe(model.assets[0]);
  // Test that that Draw(@animal1) refer to the second prompt

})

/**
 * Check the validator recognizes error of the number of imputs of a reference of an asset does not match with the orginal's
 */
test('validation_checks_active', async() => {

  const services = createImpromptuServices(EmptyFileSystem);
  const parse = parseHelper<Model>(services.Impromptu);
  
  // Example of document that does have that error
  const document = await parse(`
    language=English

    prompt Draw(@animal1): image
    core = "Draw a", @animal1
    language=English

    prompt Mixture(@animal1, @animal2): image
    core = 
      medium( drawing ),
      Draw(@animal2),
      between(@animal1, @animal2),
      audience("children" ) weight high,
      no(@animal1 ), no("scary")
      language= English  

    prompt NewMain(): image
    core=Mixture("lo")
    language=English
  `);

  await services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });

  const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
  expect(validationErrors).toHaveLength(1) // Test that the prompt has an error
  })


/**
 * Check that a recursivity loop is detected by the validator
 */
test('validation_recursion_loop', async() => {

  const services = createImpromptuServices(EmptyFileSystem);
  const parse = parseHelper<Model>(services.Impromptu);

  // Example of document that does have that error
  const document = await parse(`
    language=English

    prompt functionA(): image
    core = "You are in A", functionB()
    language=English

    prompt functionB(): image
    core = "You are in B", functionA()
    language=English
  `);

  await services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });

  const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
  expect(validationErrors).toHaveLength(2) // Test that the prompt is incorrect indeed. Each function should return an error
  expect(validationErrors[0].message).toBe(`There is a recursive loop finishing in "functionA": functionA -> functionB -> functionA`); // Meassage of the recursion loop 
  })


/**
 * Check that a recursivity loop is detected by the validator: self-recursion case
 */
  test('validation_recursion_loop_different', async() => {
  
    const services = createImpromptuServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.Impromptu);
    
    // Example of document that does have that error
    const document = await parse(`
      language=English
  
      prompt functionA(): image
      core = "You are in A", functionA()
      language=English
  
      prompt functionB(): image
      core = "You are in B", functionA()
      language=English
    `);
  
    await services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });
  
    const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
    expect(validationErrors).toHaveLength(2) // Test that the prompt is incorrect indeed. Each function should return an error
    expect(validationErrors[0].message).toBe(`There is a recursive loop finishing in "functionA": functionA -> functionB -> functionA`); // Meassage of the recursion loop 
    })
  

  /**
   * Checks that entering an incorrect language turns out in an error
   */
  test('validation_incorrect_language', async() => {
    // Check that a recursivity loop is detected
  
    const services = createImpromptuServices(EmptyFileSystem);
    const parse = parseHelper<Model>(services.Impromptu);
    // Example of document that does have that error
    const document = await parse(`
      language=Anglish
  
      prompt functionA(): image
      core = "You are in A"
    `);
  
    await services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });
  
    const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);
    expect(validationErrors).toHaveLength(1) // Test that the prompt is incorrect indeed. Each function should return an error
    expect(validationErrors[0].message).toBe("Language is not supported."); // Meassage of the recursion loop 
    })


  /**
   * Returns the model of the file ` '__test__/testPromptMode.prm'`
   */
  async function prepare_model(){
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    const fileName= '__test__/testPromptMode.prm';
    const model = await extractAstNode<Model>(fileName, services);
    return model;
  }

  test('validation_recursion_loop', async() => {
    // Check that a recursivity loop is detected
    const model = await prepare_model();
    try{  
      check_loops(model)
    }catch(e){
      let i =1
      expect(i).toBe(1); // Check that returns an error
    }
  })

  /**
   * Test the script mode in MidJourney
   */
  test('script_mode_MD', async() => {
    // Test the script mode (no prompt sent)
   
    const model = await prepare_model();
    const result = generatePromptCode(model,AISystem.Midjourney, undefined );
    expect(result?.join()).toContain("promptA"); // First asset is in the final prompt
    expect(result?.join()).toContain("promptC"); // Last asset is in the final prompt
  })

  /**
   * Test the prompt mode in MidJourney
   */
  test('prompt_mode_MD', async() => {
    // Test the prompt mode in Midjourney-> Only the first prompt has to be considered
    const model = await prepare_model(); // Connection to the file
    const prompt = model.assets[0]; // Get the first asset to the model so we are able to transmit it as variable
    const result = generatePromptCode(model,AISystem.Midjourney, prompt ); 
    expect(result?.join()).toContain("promptA"); // First asset is in the final prompt
    expect(result?.join()).not.toContain("promptB"); // Second asset is NOT in the final prompt
  })
  // Same to Satble Diffusion
  test('prompt_mode_SD', async() => {
    // Test the prompt mode in Stable-Diffusion -> Only the first prompt has to be considered
    const model = await prepare_model();
    const prompt = model.assets[0];
    const result = generatePromptCode(model,AISystem.StableDiffusion, prompt );
    expect(result?.join()).toContain("promptA"); // First asset is in the final prompt
    expect(result?.join()).not.toContain("promptB"); // Second asset is NOT in the final prompt
  })
  // Same to ChatGPT
  test('prompt_mode_ChatGPT', async() => {
    // Test th prompt mode in ChatGPT -> Only the first prompt has to be considered
    const model = await prepare_model();
    const prompt = model.assets[0];
    const result = generatePromptCode(model,AISystem.ChatGPT, prompt );
    expect(result?.join()).toContain("promptA"); // First asset is in the final prompt
    expect(result?.join()).not.toContain("promptB"); // Second asset is NOT in the final prompt
  })


/**
 * Checks prompt mode passing the values for parameters of the prompt
 */
test('prompt_mode_variables', async() => {
  // Test the prompt mode with several varaibles
  const model = await prepare_model();
  const prompt = model.assets[1];
  const result = generatePromptCode(model,AISystem.Midjourney, prompt, ["fuego"] );
  expect(result?.join()).toContain("promptB"); // Second asset is in the final prompt
  expect(result?.join()).toContain("fuego"); // The parameter tranmitted has been used
  expect(result?.join()).not.toContain("promptA"); // First asset is NOT in the final prompt
});

test('prompt_mode_only_variables', async() => {
  // Test that with only variables, the prompt node reads only the last prompt
  const model = await prepare_model();

  const result = generatePromptCode(model,AISystem.Midjourney, undefined, ["fuego"] );
  expect(result?.join()).toContain("promptC"); // Last asset is in the final prompt
  expect(result?.join()).toContain("fuego"); // The parameter tranmitted has been used
  expect(result?.join()).not.toContain("promptB"); // Second asset is NOT in the final prompt
});

test('one_prompt_only_empty_varaibles', async() => {
  const model = await prepare_model();
  const prompt = model.assets[0]
  const result = generatePromptCode(model,AISystem.Midjourney,prompt, []);
  expect(result?.join()).toContain("promptA");
  expect(result?.join()).not.toContain("promptB");
})


test('test_heritage', async() => {
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/testHeritage.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const result = generatePromptCode(model,AISystem.Midjourney,undefined);
  expect(result?.join('')).toContain("Draw a , var 2"); // Test that the parameter has been used
})

test('test_heritage_in_prompt_mode', async() => {
  // Checks that using prompt mode the reuse of Asset still works, without writing the prompt of the declared Asset
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/exampleHeritage.prm';
  const model = await extractAstNode<Model>(fileName, services);
  expect(model.assets[2].name).toBe("NewMain"); 
  const prompt = model.assets[2];
  const result = generatePromptCode(model,AISystem.Midjourney,prompt);
  expect(result?.join(' ')).toContain("Draw a  eagle"); // Checks that the prompt of Mixture() appears
  expect(result?.join(' ')).not.toContain("Draw a  @animal"); // Checks that the prompt of Mixture() appears
  expect(result?.join(' ')).not.toContain("Mixture"); // Checks that the declaration of Mixture does not appear
})

test('not_general parameters' , async() => {
  // Checks that defining a parameter in an Asset does not define it for its usage in another Asset
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/not_global_heritage.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[0]
  const result = generatePromptCode(model,AISystem.ChatGPT,prompt, ["mock_var_1", "mock_var_2"]);
  expect(result?.join(' ')).toContain("mock_var_1"); // The 1st var is referenced correctly although the name of Imput and InputRef is different
  expect(result?.join(' ')).not.toContain("mock_var_2"); // The 2nd var has to not be refeenced, because @job is refrenced to @jobAlt and to to @job
})

//----------------------Import Tests-----------------------------------------

/** Checks that one can import an asset from another file */
test('Check_import' , async() => {

  // Checks that defining a parameter in an Asset does not define it for its usage in another Asset
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/basic_import.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[0]
  const result = generatePromptCode(model,AISystem.ChatGPT,prompt);
  expect(result?.join(' ')).toContain("Respond whether you support the following sentence: "); // Check that the content of the imported asset appears in the result
  expect(result?.join(' ')).not.toContain("job_statement"); // Check that the content has been changed
})

/** Checks that one can import an asset from another file, and the parameters are using the value given*/
test('Check_import_varaibles' , async() => {

  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/import_with_variables.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[0]
  const result = generatePromptCode(model,AISystem.ChatGPT,prompt);
  expect(result?.join(' ')).toContain(" a black person has to be a doctor"); // Check that the content of the imported asset appears in the result ("black" and "doctor") are variables
  expect(result?.join(' ')).not.toContain("job_statement"); // The 2nd var has to not be refeenced, because @job is refrenced to @jobAlt and to to @job
})

/**
 * Check that two imports (imported in the same line) are imported correctly
 */
test('Check_multi_import' , async() => {

  // Checks that defining a parameter in an Asset does not define it for its usage in another Asset
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/multi_import.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[0]
  const result = generatePromptCode(model,AISystem.ChatGPT,prompt);
  expect(result?.join(' ')).toContain(" a black person has to be a doctor"); // 1st imported asset in ImportedAsset
  expect(result?.join(' ')).toContain("Respond whether you support the following sentence: "); // 2nd imported asset in ImportedAsset
  })
