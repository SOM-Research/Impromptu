
const imp_mod = require('../out/language-server/impromptu-module')
const cli_util = require("../out/cli/cli-util")
const gen_prompt = require('../out/cli/generate-prompt')
const fs = require('fs')
const node = require('langium/node')

var express = require('express'); 
var bodyParser = require('body-parser'); 

var app = express(); 

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false })); 

app.post("/generateprompt", async (req, res) => { 

	var services = imp_mod.createImpromptuServices(node.NodeFileSystem).Impromptu;

	var content = req.body.content;
	var aiSystem = req.body.target;


	const fileName = 'temp.prm';
	fs.writeFileSync(fileName,content);


	var model = await cli_util.extractAstNode(fileName, services);
	// Retrieve array form post body 

	var result = gen_prompt.generatePromptCode(model, aiSystem, undefined);
	
	fs.unlinkSync('temp.prm')
	// Return json response 
	res.json({ result: result }); 
	
}); 


// Server listening to PORT 3000 
var server=app.listen(3000); 
