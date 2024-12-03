# Impromptu
-----------
### Table of contents
**[Requirements & Installation](#requirements_&_installation)** 
**[Impromptu's Syntax](#requirements_&_installation)**
- [Language](#language)
- [Prompt](#prompt)
    - [Snippets](#snippets)
- [Composer](#composer)
- [Chain](#chain)
- [Imports](#imports)


**[Impromptu's Modes](#impromptus-modes)** 
- [CLI Mode](#cli-mode-and-prompt-customization)
- [Server Mode](#impromptu-as-server)
    - [PM2 Installation](#pm2-instalation)

**[License](#license**

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
- Have **internet conection** to be able to upload several packages
- Being able to **run the system as an Administrator**.


1. Extract Impromptu's `.zip` folder in your PC
2. Install `node` in your PC (recommended via **NVM**)
3. Install `vscode` and open `Impromptu` folder
4. Change the Execution Policy of the system (Windows).
5. Run `npm install` 
6. Install `Langium` and `Impromptu` vscode's Extension
7. Run `npm run langium:generate` and `npm run build`

For a further detail of those step check out the [detailed guide](StartUp.md). 


## Syntax
The core of Impromptu is its semantics that allow to wirte a propt as a programming fuction using variables and calls to another prompts.


A `.prm` file contains a **Language**, and a set of **prompts**, **chain** and **composer** (Assets). It may also contain one or more **imports**.
### `Language`

Every `.prm` starts by declaring the language of the prompt that will generate. The grammar of it is:
```
language = <language>
```

Until now, the two possible languages are Spanish and English (i.e `language=English`).
This **element is optional**. If it was not declared, **it is assumed that the language is English**.
> *In the future, it will be used to ensure the compatibility between an asset and its imports/references*.

### `Prompt`

`Prompt` is the basic function (asset) that generates a prompt. It is formed by several elements that allow to express the concepts that the generated prompt has to fulfill:

**name**: name that we give to the prompt. It has to be unique, and serves to reference the prompt in other places

**inputs**: Parameters and another inputs that are used to generate the prompt. There are two types of inputs:
- **parameter**: Transmit a `snippet` (explained in [the following subsection](#snippets)) inside the `prompt` as a variable. They should start by an `@` symbol.
- **metadata**: *to be developed*

The inputs can be **together with a description** of it, that helps to understand the usage and meaning of that varaible

**media**: Indicate the types of exit the prompt will generate when used in the LLM.

**prefix**, **core** & **suffix**: They are where what will truly generate the prompt is located. They are composed by a set of commands (called `snippets`) that induces that statemnt in the prompt. `snippets` will be explained in the next section. 

> The difference betweeen prefix, core and suffix is merely concptual. The snippets in the core are supposed to be related with the intructions of the prompt related to generate the answer, while in suffix and prefix appear instructions to guide the LLM to a correct answer.

**separator**: Tells how the different `snippets` are linked to each other. It was assigned a default separator for each LLM. For example, for ChatGPT, the default separator is `". "`.

**language**: A prompt can declare its language individually of the language of the `.prm` is in.

Its grammar is:

```
prompt <name> ([<inputs>]): <media>
[prefix = <snippets>]
core = <snippets>
[suffix = <snippets>]
[separator = <string>]
[language = <language>]

```


#### `Snippets`

The snippets are the core of Impromptu. They are the "parts" that represent the different ideas that the generated prompt is wanted to have. There are 4 types of snippets:

1. **Text plain.** Just write a text that you want to be in the prompt

2. **Input.** Obviously, the inputs transmitted to the prompt can be referenced and be used it. 

3. **Another asset**. You can use another asset from the same file (or that it were imported). For example, if you want to create a prompt to generate a poem about friendship, you may add a provious asset `generate_poem()` that generates a promptthat will create a poem.

4. **Traits**. The most useful type of snippet are the traits. They work as reference to assets, but about general topics that usually appear in a well-formed prompt. For example, if in the previous example we want to ensure that the generated poem in the previos example is for children, we should add `audience("children")`. The whole list of the implemented traits, plus their options are documented in [this document](traits_cheat_sheet.md).

Let see an example of how the snippets work. 
Imagine we want to generate prompts that allow us to generate pictures of fusion between animals. Specifically, we want to generate a gryphon (mythological beast half lion half eagle):
```
composer GenerateGryphoon(): image
  Mixture("eagle", "lion")

prompt Mixture(@animal1, @animal2): image
  core = audience( "children" ) weight high, 
         medium(drawing), 
         between(@animal1, @animal2), 
         no("violent"), no("scary")
```
The asset `Mixture()` contains the combination trait (`between()`) that express the idea of mixing two element, plus other revelant snippets that indicate properties that are wanted in the outcome.

On the other hand, the prompt generated by `GenerateGhyphoon()` contains all the snippets from `Mixture(@animal1, @animal2)`, considering `@animal1 = eagle` and `@animal2 = lion`.
In addition, the trtaits simplify the writing of ideas that may need one of more lines of txt to be expressed.


### `Composer`
A Composer is a structure that allows to merge several snippets together. The difference with a Prompt is that not media is declared because each part of the composer is considered as an independent prompt (*There is not any functional difference yet*).

```
composer <name> ([<inputs>]): 
<snippets>
[separator = <string>]
[language = <language>]

```

### `Chain`
*Not real utility right now*

### `Imports`

In addition to prompts, composer and chains, a `.prm`can also contain imports.
For example:

<i>ethic_questions.prm</i>
```
...
prompt job_statement(@ethical_concern,@job):  text
core = 
" a", @ethical_concern, "has to be a" , @job
separator=' '
language=English
...
```

```
language=English

import job_statement from libraries.ethic_questions

prompt NewMain(): image
core=job_statement("black person", "doctor")
language=English
```
Resulted prompt:
> <i> a  black person  has to be a  doctor </i>


Similary to programming language such as Java, the user can use other  elements **from a file located in `build_files`** by writing
```
import <name_1>,<name_2>,...,<name_n> from <file_location>
```
where `<name_i>` are the names of the asset imported, and `<file location>` is the relative path to the file from `build_files` (but without the `.prm` ending). For example, if the imported prompt is located in in the file `build_files/libraries/evaluation_questions.prm`, `<file location>` is `libraries.evaluation_questions`.
```
language=English

import job_statement,JSON_format from ethic_questions

prompt NewMain(): image
core=job_statement("black person", "doctor"),JSON_format()
language=English
```
In addition, the user also has the option to import all the assets from a given file by writing  `'*'` instaead of the name of all assets:

```
language=English

import * from ethic_questions

prompt NewMain(): image
core=job_statement("black person", "doctor"),JSON_format()
language=English
```


## Impromptu's Modes

There are three modes you can access the `.prm` written in Impromptu's DSL:
- **VS Extension**: The extension offers an editor for Impromptu prompts, with *syntax highlighting*, *syntax validation* and *autocomplete suggestions*. The extension enables users to generate prompts for specific AI systems and, on the other hand, to create code to invoke those AI platforms which have public APIs. Currently, supported target AI systems for generating prompts are [Midjourney](https://www.midjourney.com/), [Stable Diffusion web-ui](https://github.com/AUTOMATIC1111/stable-diffusion-webui) and OpenAI's [ChatGPT](https://openai.com/chatgpt/). Users can leverage Impromptu to generate API invoking code for Stable Diffusion and ChatGPT. These files (that can be created by the user) are located in the `build-files`, which is the wrokspace of the extension.
Even when the aim of the user is to make use of another mode, it is **highly recommended to activate the extension** so that the user makes use of the syntax valid and therefore the Imprompt files become easier to write correctely.
- **CLI mode**: Generate a prompt using a .prm file, by writing a CLI command in the VSCode UI. It generates a `.txt` file with the generated prompt. Further explained in [CLI mode and Prompt customization](#cli-mode-and-prompt-customization) section.
- **Server mode**: Open the Impromptu server and send it a request to get the generated prompt  as a HTTP response.

### CLI mode and Prompt customization

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
#### Prompt-mode

Moreover, you can generate a target-specific prompt from a single prompt of the file by adding the options `-p` and `-v` to the command (declaring the name of the prompt, and the value given to its parameters):

    ./bin/cli genprompt examples/example.prm -d <output-dir> -p <name-prompt> -v <var1> <var2> ... -t <target-ai-system>

For instance, the command


    ./bin/cli genprompt example.prm -p Mixture -v eagle lion -t midjourney


would the generate the previous prompt as well:

```
drawing of a combination of eagle and lion,
for children::2, --no violent, --no scary
```

In case that parameters but no prompt were declared in the command, the last asset in the file will be used. That means that in the previous example we may have omitted `-p Mixture` and we would have obtained the same result. 



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

By the command `node .bin/server_main.js`, one starts a node http server so that, given a text that follows the `.prm` file format, and it returns a generated prompt to the client.
 It is done by sending to the server a POST request to the server as `generateprompt` (http://127.0.0.1:3000/generateprompt). That text, together with the atributes (`aiSystem`, `prompt`),are transmitted to the server in the body of a POST call, where
    - `content`. Text acting as a `.prm`file.
    - `aiSystem`. LLM that where the prompt will be used. They are the same ones that are available in the CLI mode (`midjourney` for MD, `stable-diffusion` for SD and `chatgpt` for ChatGPT).
    - `prompt`. In case is transmitted, tells which prompt defined in `content` has to be created. If any, all the prompts will be generated.
The generated prompt is sent in the body of the response in the concept `result` if no errors were happen. In the other case, the erros are shared with the client in the body inside the concept `errors`.

This has the problem that the server has to be open from Impromptu workspace itself to work. Therefore, it is recommended to use a proccess manager such as **pm2** to configure the closing and opening of the server. 

### PM2 instalation

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

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The source code for the site is licensed under the MIT License, which you can find in the LICENSE.md file.

All graphical assets are licensed under the
[Creative Commons Attribution 3.0 Unported License](https://creativecommons.org/licenses/by/3.0/).
