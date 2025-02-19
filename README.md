# Impromptu
-----------
### Table of contents
**[Requirements & Installation](#requirements_&_installation)** 
**[Usage of Impromptu](#usage-of-impromptu)**

**[CLI Mode and Prompt customization](#cli-mode-and-prompt-customization)**
- [Prompt mode](#prompt-mode)
- [Adding Extra LLMs](#adding-extra-llms)

**[VSCode extension](#vscode-extension)**
- [Code generation](#code-generation-for-prompt-execution-and-output-validation)

**[Impromptu as a server](#impromptu-as-server)**
- [PM2 Installation](#pm2-installation)
- [Launching the server](#launching-the-server)

**[Publications](#publications)**
**[License](#license)**

-----------------
**Impromptu** is a prototype implementation of a model-driven engineering tool for prompt engineering based on DSL framework development [Langium](https://langium.org/). Its goal is enabling the definition of prompts for different types of generative AI systems and different tasks (text-to-text, text-to-image, multi-modal prompts). 

For example, using its domain-specific language (DSL) for prompt engineering, you can write a generic prompt to generate an image as follows:

    prompt myImage(): image
        core = medium( photography ), "dogs", "alert" weight high, no( "cats" ), no ( "humans" )
        
Impromptu can generate platform-specific prompts for different platforms that take advantage of its advanced settings, e.g., defining the weight of specific concepts within the prompt. Different systems offer different settings and use a different syntax. With Impromptu, you only need to write the prompts once. You can also import one prompt into another (write modular prompts!) as well as define prompt chains or keep track of different prompt versions.

This repository is the companion to the research paper providing a description of the Impromptu DSL:

> Robert Clarisó, Jordi Cabot (2023). "Model-driven prompt engineering". ACM/IEEE 26th International Conference on Model-Driven Engineering Languages and Systems (MODELS), IEEE, to appear.


## Requirements & Installation
As requirements to a proper setup of Impromptu in your systems, one needs to meet the following requirements:
- Have **internet conection** to be able to upload several packages that ara necesary for Impromptu
- Being able to **run the system as an Administrator**.

The steps needed to being able to use Improptu in your device are:
1. Extract Impromptu's `.zip` folder in your PC
2. Install `node` in your PC (recommended via **NVM**)
3. Install `vscode` and open `Impromptu` folder
4. Change the Execution Policy of the system (Windows).
5. Run `npm install` 
6. Install `Langium` and `Impromptu` vscode's Extension
7. Run `npm run langium:generate` and `npm run build`

For a further sight of those steps, check out the [detailed guide](StartUp.md). 


## Usage of Impromptu
Impromptu allows the user to generate prompts by taking as reference a coding-like file that contains the contents, context and intentions the prompt should have.

For example, for writing a prompt that generates a drawing a chimera for a school class, one creates a `.prm` file with the content:
```
language=English
prompt main(): image
core = 
  medium( drawing ),
  between("eagle", "lion"),
  audience("children" ) weight high,
  no("violent" ), no("scary")

```

and run it with Impromptu to generate the wanted prompt.

This functionality gets more useful when the goal of the user id to generate a huge quantity of prompts with smamm differences between them.

For more documentation about how to properly write a `.prm` file, see [Syntaxt.md](.Syntaxt.md).

Additionally, it also has several minor functionalities that allows to customize the generated prompts and/or make it them more complex. However, those functionalities involve more delicated task such as modifying files (read [Adding extra LLMs](#adding-extra-llms) for further details).




## CLI mode and Prompt customization

The tool features a command-line interface to generate platform-specific prompts from a `.prm` file containing Impromptu assets. To invoke the command-line interface, simply run the following command (sataying at the `Impromptu` folder): 

    node ./bin/cli genprompt <.prm-file-path> -d <output-dir> -t <target-aisystem>

> `<.prm-file-path>` is the **relative path of the file from the folder `build_files`**. for example,`examples/example.prm` would run the file located in `build_files/examples/example.prm`.

You can **specify the output directory** in `<.prm-file-path>`. If that parameter is not given, a `.txt` file (with the same name) with **the result will be created in the folder `build_files\generated`**. 

 The target LLM whre the generated prompt will be used can be selected in `<target-aisystem>`. Currently, the LLM systems available are:
- **Midjourney**; writing `midjourney`
- **StableDiffusion**; writing `stable-diffusion`
- **ChatGPT**; writing `chatgpt`.

For instance, provided that the following assets are in a file named `example.prm`:

```
composer GenerateGryphoon(): image
  Mixture("eagle", "lion")

prompt Mixture(@animal1, @animal2): image
  core = audience( "children" ) weight high, 
         medium(drawing), 
         between(@animal1, @animal2), 
         no("violent"), no("scary")
```

the following command:

    ./bin/cli genprompt example.prm -t midjourney

would generate a prompt for `Midjourney`:

```
drawing of a combination of eagle and lion,
for children::2, --no violent, --no scary
```
### Prompt-mode

Moreover, you can generate a target-specific prompt from a single prompt of the file by adding the options `-p` and `-v` to the command (declaring **the name of the prompt**, and the **value given to its parameters**, respectively):

    ./bin/cli genprompt examples/example.prm -d <output-dir> -p <name-prompt> -v <var1> <var2> ... -t <target-ai-system>

For instance, the command


    ./bin/cli genprompt example.prm -p Mixture -v eagle lion -t midjourney


would the generate the previous prompt as well:

```
drawing of a combination of eagle and lion,
for children::2, --no violent, --no scary
```

In case that parameters but no prompt were declared in the command, the last asset of the file will be used. That means that in the previous example we may have omitted `-p Mixture` and we would have obtained the same result. 

## Adding extra LLMs

Impromptu allows the user to **customize the behavior** of the generator making prompts **to a specific LLM**.
The CLI command `node .bin/cli addAI <name> (-f <alias>) (-pn promptName)`. This command would create a file `generate-prompt_<alias>.ts` that would dictate the behavior of the traits and the different assets. **This is internal coding, and thus, it is done in <i>typescript</i>**. The created file copies how a default LLM behaves, so one only needs to modify the functions that acts differentely. In the same way, it also exists a command to **delete added LLMs**: `node .bin/cli removeAI <name>`.

This commands create/remove a new file that will allow to change the behaviour of Impromptu while generating a prompt to that specific LLM. However, the customization of this behavior is done by modifing (thus, coding) the `.ts` file created

## VSCode Extension
### Code generation for prompt execution and output validation

The editor menu displays two options: `"Generate Stable Diffusion Python code"` and `"Generate ChatGPT Python code"`. When clicking a menu item, you should select which prompt will be sent to the target AI system and validated. Then, a new panel appears with the corresponding Python code generated to invoke that AI platform with the selected prompt and its output validators. For instance, given the following Impromptu code:

```
language=English

prompt
    ValidatorByExpression
    'This prompt is intended for validation using a prompt'
    () : text
    core='Is the content implying hope and happiness?'
    language=English

prompt
    PromptToValidate
    'This prompt is an example to be validated'
    () : text
    core='Provide a text that describes a new year beginning tomorrow','It is expected to be full of hope and happiness',language-register(ironic)[reinforced]
    suffix=literary-style(song)[reinforced]
    language=English
    validator=[ValidatorByExpression]
```

When clicking to generate its API invoking code, the editor will ask you to select between `ValidatorByExpression` and `PromptToValidate`. After selecting `PromptToValidate`, Impromptu will open a new panel with Python code like:

```
import ...

class PromptService:
    __prompt = '''Provide a text that describes a new year beginning tomorrow. It is expected to be full of hope and happiness. The answer is written using a ironic register. The answer is written as a song'''
    __validators = [{"trait":"ironic","condition":"The answer is written using a ironic register"},{"trait":"song","condition":"The answer is written as a song"}]
    ...
```



To add API invoking code for the new platform, include the new menu items and commands in `package.json` (note that a new icon should be added to the `icons` folder):

```
"commands": [
    ...
    {
        "command": "impromptu.generateDESTINATIONPLATFORM",
        "title": "Generate DESTINATION PLATFORM code",
        "shortTitle": "Generate DP code",
        "category": "Impromptu",
        "icon": {
            "light": "icons/DP-logo.png",
            "dark": "icons/DP-logo.png"
        }
    },
    ...
],
"menus": {
    "editor/title": [
        ...
        {
            "when": "resourceLangId == impromptu",
            "command": "impromptu.generateDESTINATIONPLATFORM",
            "group": "navigation"
        },
        ...
    ]
}
```

Then, create an invoking code template file and add it to the `resources` folder (you can find there templates for Stable Diffusion and ChatGPT as reference). Finally, just add it to the set of template files in the `impromptu-code-generator.ts` constructor (use the enum label as a key for the new set item):

```
constructor(context: ExtensionContext) {
    ...
    var fullFilePath = context.asAbsolutePath(path.join('resources', 'DESTINATION-PLATFORM-template.EXT'));
    var template = fs.readFileSync(fullFilePath, "utf8");
    this.templates.set(AISystem.DESTINATIONPLATFORM, template);
    ...
}
```

## Impromptu as server

By the command `node .bin/server_main.js`, one starts a node http server so that, given a text that follows the `.prm` file format, and it returns a generated prompt to the client, in the same it would be done in the prompt line.
 It is done by sending to the server a POST request to the server as `generateprompt` (http://127.0.0.1:3000/generateprompt). That text, together with the atributes (`aiSystem`, `prompt`),are transmitted to the server in the body of a POST call, where
    - `content`. Text acting as a `.prm`file.
    - `aiSystem`. LLM that where the prompt will be used. They are the same ones that are available in the CLI mode (`midjourney` for MD, `stable-diffusion` for SD and `chatgpt` for ChatGPT).
    - `prompt`. In case is transmitted, tells which prompt defined in `content` has to be created. If any, all the prompts will be generated.
The generated prompt is sent in the body of the response in the concept `result` if no errors were happen. In the other case, the errors are shared with the client in the body inside the concept `errors`.

In the same way, the client can send request equivalent to the other prompt commands, such as adding/removing a LLM (`/addLLM`, and `/removeLLM`), or asking for the Impromptu's version (`/version`). Each different request has a **different body structure and a different reponse syntax**.

| request | url's request | request's body | response |
| ----- |:----------:| :----------------:|:-------:|
| `generateprompt` |http://127.0.0.1:3000/generateprompt| {`content`, `aiSystem`, `prompt` (opt)}|{`response`} or {`error`}|
| `addLLM` |http://127.0.0.1:3000/addLLM| {`llm`, `alias` (opt),`promptName` (opt)}|{`response`} or {`error`}|
| `removeLLM` |http://127.0.0.1:3000/removeLLM| {`llm`}|{`response`} or {`error`}|
| `version` |http://127.0.0.1:3000/version| {`version`}|`version`|


This has the problem that the server has to be open from Impromptu workspace itself to work. Therefore, it is recommended to use a proccess manager such as **pm2** to configure the closing and opening of the server without considering the workspace. 

### PM2 installation

Use **npm** to install pm2:
``` 
npm install -g pm2
```

One can check that the installation was succesful by checking the version:
```
pm2 -v
```

In order to get access eficiently to all your proccess from your project file, PM2 employs an ecosystem configuration file. You can generate these file by the command:

```
pm2 init simple
```
This command would create the file `ecosystem.config.js` in the workplace, where you can write the configuration of the servers the application would need.


### Launching the server

The server entrance is located in the folder `bin/server_main.js` of Impromptu. Therefore, in order to start Impromptu's server, it is important to **change the current directory**, since some validations depend on it. That means that you have to write where the script of the server is inside that directory (`bin/server_main.js` in Impromptu's case), and you can write a name to identify the service.

For example, if we add Impromptu inside the `opt` folder of our project, where we have created the file `ecosystem.config.js`, we should add in it:


```
module.exports = {
    "apps": [
        {
           "name": "impromptu",
           "cwd": "/opt/Impromptu",
           "script": "bin/server_main.js",
           "env": {
              "NODE_ENV": "production"
           }
        }
    ...
    ]
}
```


In case of working without any server manager, the server must be open from the main folder of Impromptu.

## Publications

This repository is the companion to the following research paper:

> Robert Clarisó and Jordi Cabot, "Model-Driven Prompt Engineering," 2023 ACM/IEEE 26th International Conference on Model Driven Engineering Languages and Systems (MODELS), Västerås, Sweden, 2023, pp. 47-54. ([link](https://doi.org/10.1109/MODELS58315.2023.00020))

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The source code for the site is licensed under the MIT License, which you can find in the LICENSE.md file.

All graphical assets are licensed under the
[Creative Commons Attribution 3.0 Unported License](https://creativecommons.org/licenses/by/3.0/).
