
const imp_mod = require('../out/language-server/impromptu-module')
const cli_util = require("../out/cli/cli-util")
const gen_prompt = require('../out/cli/generate-prompt')
const ast_func = require('../out/language-server/generated/ast')
const fs = require('fs')
const node = require('langium/node')

var express = require('express'); 
var bodyParser = require('body-parser'); 
const chalk = require('chalk')

var app = express(); 

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false })); 


// call it using http://127.0.0.1:3000/generateprompt. 
app.post("/generateprompt", async (req, res) => { 

	console.log("hello")
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
			await fs.promises.unlink('generated/temp.prm')
			
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


// Server listening to PORT 3000 
var server=app.listen(3000); 
