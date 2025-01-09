
const imp_mod = require('../out/language-server/impromptu-module')
const cli_util = require("../out/cli/cli-util")
const gen_prompt = require('../out/cli/generate-prompt')
const ast_func = require('../out/language-server/generated/ast')
const file_management = require('../out/cli/files_management')
const fs = require('fs')
const node = require('langium/node')

const package = require('../package.json')

var express = require('express'); 
var bodyParser = require('body-parser'); 
const chalk = require('chalk')
const { addAI } = require('../out/cli')

var app = express(); 

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false })); 

/**
 * Return the version of Impromptu
 */
// call it using http://127.0.0.1:3000/version. 
app.post("/version", async (req, res) => { 
	res= package.version
});

/**
 * Call to generate a prompt using Impromptu.
 * The body of the request is a JSON containing:
 * 
 *  -	`content`: The content of a `.prm` file (following the proper syntax) used to generate the prompt. 
 * 	-	`prompt`: If given, says the name of the prompt inside `content` that is used to generate the prompt
 * 	-	`target`: LLM system where the prompt will be used (AISystem)
 */
// call it using http://127.0.0.1:3000/generateprompt. 
app.post("/generateprompt", async (req, res) => { 

	var services = imp_mod.createImpromptuServices(node.NodeFileSystem).Impromptu;

	var content = req.body.content;
	var aiSystem = req.body.target;
	
	var prompt_name = req.body.prompt;

	if (content) {
		const fileName = 'temp.prm';
		fs.writeFileSync('build_files/'+fileName,content);

		var validPrompt= true;
		try{
			const model = await cli_util.extractAstNode(fileName, services);

			// Search for the prompt wanted to be run
			var prompt 
			var validPrompt= true;
			if(prompt_name){
				validPrompt= false;
				if (model.assets.find(element => element.name == prompt_name)){
					validPrompt= true;
					prompt= model.assets.find(element => element.name == prompt_name);
				}
			}
			
			if(validPrompt){  
				
				// Retrieve array form post body 
				var result_prompt = gen_prompt.generatePromptCode(model, aiSystem, prompt);
				console.log(chalk.green(`Prompt generated successfully.`));
				
			}
			else console.log(`Incorrect command. Prompt ${prompt_name} does not exist in that document.`)

			//console.log(chalk.green(`Prompt generated successfully: ${generatedFilePath}`));
			await fs.promises.unlink('build_files/temp.prm')
			
			// Return json response 
			res.json({ result: result_prompt }); 
		}
		catch (e){
			if (e instanceof Error)
				res.json({ error: e.message });
		}
		
	}else{
		res.json({ error: "No content provided"})
	}

	//console.log(chalk.red(`Incorrect command. Prompt ${opts.prompt} does not exist in that document.`));
	
}); 


/**
 * Call to make the changes so that one may consider a new LLM. 
 * The body of the request is a JSON containing the different atributes needed for a LLM:
 * 	-	`llm`: Name of the LLM
 * 	- 	`alias`: The termination that the functions and files related to the LLM will be named (OPTIONAL)
 * 	-	`promptName`: How the LLM will be refered in the prompt line (OPTIONAL).
 */
// call it using http://127.0.0.1:3000/addLLM. 
app.post("/addLLM", async (req, res) => { 
	if (req.body.llm){
		try{
		// Get the value of `alias` and `promptName` in case they were not sent
		const llm_alias = req.body.alias? req.body.alias : req.body.llm;
		const llm_prompt = req.body.promptName? req.body.promptName : req.body.llm.toLowerCase();
		file_management.addLLM(req.body.llm, llm_alias,llm_prompt)
		res.json({ result: `AI System "${req.body.llm}" added correctly`})		
		}catch(e){
			res.json({ error: "LLM already added."})
		}
	}else{
		res.json({ error: "No LLM provided"})
	}
});

/**
 * Call to delete an LLM. The body of the request is a JSON cotaining
 * 	-	`llm`: Name of the LLM
 */
// call it using http://127.0.0.1:3000/removeLLM. 
app.post("/removeLLM", async (req, res) => { 
	
	if (req.body.llm){
		const llm_alias= file_management.getAI_Alias(req.body.llm);
		if(llm_alias!=undefined){
			file_management.removeLLM(req.body.llm);
			res.json({ result: `AI System "${req.body.llm}" removed correctly`});
		}else{
			res.json({ result: `It does not exist any AI system is saved by the name of "${req.body.llm}".`});
		}
	}else{
		res.json({ error: "No LLM provided"});
	}
});

// Server listening to PORT 3000 
var server=app.listen(3000); 
