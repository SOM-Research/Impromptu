import { EmptyFileSystem } from "langium";
import { createImpromptuServices } from "../src/language-server/impromptu-module";
import { AssetReuse, Model } from "../src/language-server/generated/ast";
import { parseHelper } from "langium/test";
import { test, expect } from 'vitest';
import {  AISystem, generatePromptCode } from "../src/cli/generate-prompt";
import { NodeFileSystem } from "langium/node";
import { extractAstNode } from "../src/cli/cli-util";


test('basic', async() => {
  // Check that the Assets of the models are considered correctly 

  const services = createImpromptuServices(EmptyFileSystem);
  const parse = parseHelper<Model>(services.Impromptu);
  
  const document = await parse(`
    language
    English
    code='en'
    region='EN'

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
    language
    English
    code='en'
    region='EN'

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


test('validation_checks_active', async() => {
  // Check that the validations erros are considered correctly

  const services = createImpromptuServices(EmptyFileSystem);
  const parse = parseHelper<Model>(services.Impromptu);
  
  const document = await parse(`
        language
        English
        code='en'
        region='EN'

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
  expect(validationErrors).toHaveLength(1) // Test that the prompt is incorrect indeed

  })


  test('script_mode_MD', async() => {
    // Test 
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    const fileName= '__test__/test/testPromptMode.prm';
    const model = await extractAstNode<Model>(fileName, services);
    const result = generatePromptCode(model,AISystem.Midjourney, undefined );
    expect(result?.join()).toContain("promptA"); // First asset is in the final prompt
    expect(result?.join()).toContain("promptC"); // Last asset is in the final prompt
  })

  test('prompt_mode_MD', async() => {
    // Test the prompt mode in Midjourney-> Only the first prompt has to be considered
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    const fileName= '__test__/test/testPromptMode.prm';
    const model = await extractAstNode<Model>(fileName, services);
    const prompt = model.assets[0];
    const result = generatePromptCode(model,AISystem.Midjourney, prompt );
    expect(result?.join()).toContain("promptA"); // First asset is in the final prompt
    expect(result?.join()).not.toContain("promptB"); // Second asset is NOT in the final prompt
  })
  test('prompt_mode_SD', async() => {
    // Test the prompt mode in Stable-Diffusion -> Only the first prompt has to be considered
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    const fileName= '__test__/test/testPromptMode.prm';
    const model = await extractAstNode<Model>(fileName, services);
    const prompt = model.assets[0];
    const result = generatePromptCode(model,AISystem.StableDiffusion, prompt );
    expect(result?.join()).toContain("promptA"); // First asset is in the final prompt
    expect(result?.join()).not.toContain("promptB"); // Second asset is NOT in the final prompt
  })
  
  test('prompt_mode_ChatGPT', async() => {
    // Test th prompt mode in ChatGPT -> Only the first prompt has to be considered
    const services = createImpromptuServices(NodeFileSystem).Impromptu;
    const fileName= '__test__/test/testPromptMode.prm';
    const model = await extractAstNode<Model>(fileName, services);
    const prompt = model.assets[0];
    const result = generatePromptCode(model,AISystem.ChatGPT, prompt );
    expect(result?.join()).toContain("promptA"); // First asset is in the final prompt
    expect(result?.join()).not.toContain("promptB"); // Second asset is NOT in the final prompt
  })

test('prompt_mode_variables', async() => {
  // Test the prompt mode with several varaibles
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/test/testPromptMode.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[1];
  const result = generatePromptCode(model,AISystem.Midjourney, prompt, ["fuego"] );
  expect(result?.join()).toContain("promptB"); // Second asset is in the final prompt
  expect(result?.join()).toContain("fuego"); // The parameter tranmitted has been used
  expect(result?.join()).not.toContain("promptA"); // First asset is NOT in the final prompt
});

test('prompt_mode_only_variables', async() => {
  // Test that with only variables, the prompt node reads only the last prompt
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/test/testPromptMode.prm';
  const model = await extractAstNode<Model>(fileName, services);

  const result = generatePromptCode(model,AISystem.Midjourney, undefined, ["fuego"] );
  expect(result?.join()).toContain("promptC"); // Last asset is in the final prompt
  expect(result?.join()).toContain("fuego"); // The parameter tranmitted has been used
  expect(result?.join()).not.toContain("promptB"); // Second asset is NOT in the final prompt
});

test('one_prompt_only_empty_varaibles', async() => {
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/test/testPromptMode.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[0]
  const result = generatePromptCode(model,AISystem.Midjourney,prompt, []);
  expect(result?.join()).toContain("promptA");
  expect(result?.join()).not.toContain("promptB");
})

test('test_heritage', async() => {
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/test/testHeritage.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[0]
  const result = generatePromptCode(model,AISystem.Midjourney,undefined);
  expect(result?.join(' ')).toContain("Draw a ,var 2"); // Test that the parameter has been used
})

test('test_heritage_in_prompt_mode', async() => {
  // Checks that using prompt mode the reuse of Asset still works, without writing the prompt of the declared Asset
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/test/exampleHeritage.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[-1]
  const result = generatePromptCode(model,AISystem.Midjourney,prompt);
  expect(result?.join(' ')).toContain("Draw a ,eagle"); // Checks that the prompt of Mixture() appears
  expect(result?.join(' ')).not.toContain("Mixture"); // Checks that the declaration of Mixture does not appear
})

test('test_heritage_in_prompt_mode', async() => {
  // Checks that in prompt mode the reuse of Asset still works without writing the prompt of the declared Asset
  // That means, the prompt of "Mixture(@animal1, @animal2)" does not appear on the final prompt
  const services = createImpromptuServices(NodeFileSystem).Impromptu;
  const fileName= '__test__/test/exampleHeritage.prm';
  const model = await extractAstNode<Model>(fileName, services);
  const prompt = model.assets[-1]
  const result = generatePromptCode(model,AISystem.Midjourney,prompt);
  expect(result?.join(' ')).toContain("Draw a ,eagle"); // Checks that the prompt of Mixture() appears
  expect(result?.join(' ')).not.toContain("Mixture"); // Checks that the declaration of Mixture does not appear
})

