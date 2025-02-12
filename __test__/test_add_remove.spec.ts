
import { beforeEach, test, expect } from 'vitest';
import { addLLM,getAI_Alias,removeImports,removeLLM, removeSwitch } from "../src/cli/files_management";

import fs, { readFileSync } from 'fs';
import { get_workspace } from "../src/cli/cli-util";
// import { fs, vol } from 'memfs';
/*
beforeEach(() => {
  // reset the state of in-memory fs
  vol.reset()
})
*/


const gen_folder='src/cli/gen';
/**
 * If the LLM exists, it returns how the functions and file end
 */
test('getAI', async() => {
  const a = getAI_Alias('ChatGPT')
  expect(a).toBe('_ChatGPT')
})

/**
 * If the LLM does not exist, it returns undefinded
 */
test('getAI_error', async() => {
  const a = getAI_Alias('error')
  expect(a).toBe(undefined)
})



test('Addition and removal of an LLM is done correctly', async() => {
  // Check that the Assets of the models are considered correctly 

  const workspace = get_workspace()

  addLLM("prueba","prueba","prueba")

  const mod_file = readFileSync(`./${gen_folder}/generate-prompt.ts`,'utf-8');
  const mod_json = readFileSync(`./${gen_folder}/llm_json.json`,'utf-8');
  const created_file = readFileSync(`./${gen_folder}/generate-prompt_prueba.ts`,'utf-8');
  
  expect(mod_file).toContain(`import { genAsset_prueba, generatePrompt_prueba } from`)
  expect(mod_json).toContain(`{"name":"prueba","alias":"prueba","command":"prueba"}`)
  expect(created_file).toContain(' ') // Check that the file is created
  
  removeLLM("prueba");
  
  const final_file = readFileSync(`./${gen_folder}/generate-prompt.ts`,'utf-8');
  const final_json = readFileSync(`./${gen_folder}/llm_json.json`,'utf-8');
  
  // Check that the file created is gone
  let exist = true
  try{
    const new_created_file = readFileSync(`./${gen_folder}/generate-prompt_prueba.ts`,'utf-8');
  }catch(e){
    exist = false
  }
  expect(exist).toBe(false); // `generate-prompt_prueba.ts` has gone
  expect(final_file).not.toContain(`import { genAsset_prueba, generatePrompt_prueba } from`);
  expect(final_json).not.toContain(`"name":"prueba"`);
  
})



// test `alias` is always lowe case


// test already existed LLM
test('Already existed LLM', async() => {
  // Check that the Assets of the models are considered correctly 
  let passed = false
  try {
    addLLM("Stable Diffusion","SD","stable-diffusion")
  }catch(e){
    passed = true
  }
  
  expect(passed).toBe(true)
})


test('Already existed LLM but different commmand', async() => {
  // Check that the Assets of the models are considered correctly 
  let passed = false
  try {
    addLLM("Stable Diffusion","SD","stabfusion")
  }catch(e){
    passed = false
  }
  const mod_json = readFileSync(`./${gen_folder}/llm_json.json`,'utf-8');
  
  expect(mod_json).not.toContain(`{"name":"Stable Diffusion","alias":"SD","command":"stabfusion"}`) // Test that it is not added 

})

test('Already existed LLM but different alias', async() => {
  // Check that the Assets of the models are considered correctly 
  let passed = false
  try {
    addLLM("Stable Diffusion","S","stable-diffusion")
  }catch(e){
    passed = false
  }

  const mod_json = readFileSync(`./${gen_folder}/llm_json.json`,'utf-8');
  
  expect(mod_json).not.toContain(`{"name":"Stable Diffusion","alias":"S","command":"stable-diffusion"}`) // Test that it is not added 

})

test('Different name with same command', async() => {
  // Check that the Assets of the models are considered correctly 
  let passed = false
  try {
    addLLM("Sta Diffusion","SD","stable-diffusion")
  }catch(e){
    passed = false
  }

  const mod_json = readFileSync(`./${gen_folder}/llm_json.json`,'utf-8');
  expect(mod_json).not.toContain(`{"name":"Sta Diffusion","alias":"S","command":"stable-diffusion"}`); // Test that it is not added 

})


// Test remove "case" coding

// If a case with case AISystem.ChatGPT but 

const content=`
let imported_asset = get_imported_asset(asset)

      if (Ast.isAsset(imported_asset)){
          let new_map
  
          if (variables){
              // In case parameters were given, we have to extend that map to the imported asset
              new_map = variables;
          }
          // If not variables are sent it is undefined and thus no map will be sent to the Asset
  
          let result;
          switch(aiSystem) { 
                case AISystem.ChatGT: {
                  try{
                      result = genAsset_ChatGPT(imported_asset,new_map);
                  }catch(e){
                      let file = get_file_from(asset);
                      let line = get_line_node(asset);
                      console.error(chalk.red(\`[\${file}: \${line}] Error: Sudden error in imported function \${asset.name}.\`));
                      throw new Error();
                  }
                  break;
              }case AISystem.ChatGPT: {
                  try{
                      result = genAsset_ChatGPT(imported_asset,new_map);
                  }catch(e){
                      let file = get_file_from(asset);
                      let line = get_line_node(asset);
                      console.error(chalk.red(\`[\${file}: \${line}] Error: Sudden error in imported function \${asset.name}.\`));
                      throw new Error();
                  }
                  break;
              }case AISystem.ChatGPT: {
                  try{
                      result = genAsset_ChatGPT(imported_asset,new_map);
                  }
                  break;
              }case AISystem.StableDiffusion: {   
                  try{
                      result = genAsset_SD(imported_asset,new_map);
                  }catch(e){
                      let file = get_file_from(asset);
                      let line = get_line_node(asset);
                      console.error(chalk.red(\`[\${file}: \${line}] Error: Sudden error in imported function \${asset.name}.\`));
                      throw new Error();
                  }
                  break;
              }case undefined: {
                  try{
                      result = genAsset_default(imported_asset,new_map);
                  }catch(e){
                      let file = get_file_from(asset);
                      let line = get_line_node(asset);
                      console.error(chalk.red(\`[\${file}: \${line}] Error: Sudden error in imported function \${asset.name}.\`));
                      throw new Error();
                  }
                  break;
              }
              default: {
                  let file = get_file_from(asset);
                  let line = get_line_node(asset);
                  console.error(chalk.red(\`[\${file}: \${line}] Error: Sudden error in imported function \${asset.name}.\`));
                  throw new Error();
              }
  
          }
          return result;
      }`

test('No additional text are deleted when `generate-prompt` is modified', async() => {
  // Check that the Assets of the models are considered correctly 
  const final_content = removeSwitch('ChatGPT','ChatGPT', content) // using ChatGPT as example
  
  expect(final_content).toContain(
    // Check that another elements continue to be there
      `case AISystem.StableDiffusion: {   
                  try{
                      result = genAsset_SD(imported_asset,new_map);
                  }catch(e){
                      let file = get_file_from(asset);
                      let line = get_line_node(asset);
                      console.error(chalk.red(\`[\${file}: \${line}] Error: Sudden error in imported function \${asset.name}.\`));
                      throw new Error();
                  }
                  break;
              }`)
})

test('Check that similar elements to the target are not eliminated', async() => {
  // Check that the Assets of the models are considered correctly 
  const final_content = removeSwitch('ChatGPT','ChatGPT', content) // using ChatGPT as example

  // Check that similar elements to the target are not eliminated
  expect(final_content).toContain(
    `case AISystem.ChatGT: {
                  try{
                      result = genAsset_ChatGPT(imported_asset,new_map);
                  }catch(e){
                      let file = get_file_from(asset);
                      let line = get_line_node(asset);
                      console.error(chalk.red(\`[\${file}: \${line}] Error: Sudden error in imported function \${asset.name}.\`));
                      throw new Error();
                  }
                  break;
              }`)
})

test('Check that elements with different morphology but same core are deleted', async() => {
  // Check that the Assets of the models are considered correctly 
  const final_content = removeSwitch('ChatGPT','ChatGPT', content) // using ChatGPT as example

  // Check that elements with different morphology but same core are deleted
  expect(final_content).not.toContain(
    `case AISystem.ChatGPT: {
              try{
                  result = genAsset_ChatGPT(imported_asset,new_map);
              }
              break;
          }`)
})

test('Check that the target element was deleted', async() => {
  // Check that the Assets of the models are considered correctly 
  const final_content = removeSwitch('ChatGPT','ChatGPT', content) // using ChatGPT as example
  
  // Check that the target element was deleted
  expect(final_content).not.toContain(
      `case AISystem.ChatGPT: {
                  try{
                      result = genAsset_ChatGPT(imported_asset,new_map);
                  }catch(e){
                      let file = get_file_from(asset);
                      let line = get_line_node(asset);
                      console.error(chalk.red(\`[\${file}: \${line}] Error: Sudden error in imported function \${asset.name}.\`));
                      throw new Error();
                  }
                  break;
              }`)
})

// Test add imports 