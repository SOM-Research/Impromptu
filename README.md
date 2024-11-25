# Impromptu

A domain-specific language for prompt engineering

Impromptu is a prototype implementation of a model-driven engineering tool for prompt engineering. Its goal is enabling the definition of prompts for different types of generative AI systems and different tasks (text-to-text, text-to-image, multi-modal prompts). 

For example, you can write a generic prompt to generate an image as follows:

    prompt myImage(): image
        core = medium( photography ), "dogs", "alert" weight high, no( "cats" ), no ( "humans" )
        
Impromptu can generate platform-specific prompts for different platforms that take advantage of its advanced settings, e.g., defining the weight of specific concepts within the prompt. Different systems offer different settings and use a different syntax. With Impromptu, you only need to write the prompts once. You can also import one prompt into another (write modular prompts!) as well as define prompt chains or keep track of different prompt versions.

This repository is the companion to the research paper providing a description of the Impromptu DSL:

> Robert Clarisó, Jordi Cabot (2023). "Model-driven prompt engineering". ACM/IEEE 26th International Conference on Model-Driven Engineering Languages and Systems (MODELS), IEEE, to appear.

## Requirements
 Impromptu is implemented in TypeScript using the [Langium](https://langium.org) open-source language engineering toolkit. For that reason, in addition to install the software it self, the user must install additional software.


#### Requirements
As requirements to a proper setup of Impromptu in your systems, one needs to meet the follwing requirements:
- Have **internet conection** to be able to upload several packages
- Being able to **run the system as an Administrator**.

1. Extract Impromptu's `.zip` folder in your PC
2. Install `node` in your PC
3. Install `vscode` and open `Impromptu` folder
4. Change the Execution Policy of the system (Windows).
5. Run `npm install` 
6. Install `Langium` and `Impromptu` vscode's Extension
7. Run `npm run langium:generate` and `npm run build`

For a further detail of those step check out the [detailed guide](StartUp.md). 


## Installing

1) Open Visual Studio Code, and open the **Impromptu** folder. 


2) Impromptu is offered as a Visual Studio Code extension. You can install the extension by downloading the `.vsix` file and running:
```
    code --install-extension impromptu-1.0.0.vsix
```  
Alternatively, if you open Visual Studio Code and search the extension file (`impromptu-1.0.0.vsix`), you can right-click on it and select `"Install VSIX Extension"` at the bottom of the list of options.

3) Make use of Impromptu by one of its possible modes/features:
    - **VS Extension**: The extension offers an editor for Impromptu prompts, with *syntax highlighting*, *syntax validation* and *autocomplete suggestions*. The extension enables users to generate prompts for specific AI systems and, on the other hand, to create code to invoke those AI platforms which have public APIs. Currently, supported target AI systems for generating prompts are [Midjourney](https://www.midjourney.com/), [Stable Diffusion web-ui](https://github.com/AUTOMATIC1111/stable-diffusion-webui) and OpenAI's [ChatGPT](https://openai.com/chatgpt/). Users can leverage Impromptu to generate API invoking code for Stable Diffusion and ChatGPT. These files (that can be created by the user) are located in the `build-files`, which is the wrokspace of the extension.
    Even when the aim of the user is to make use of another mode, it is **highly recommended to activate the extension** so that the user makes use of the syntax valid and therefore the Imprompt files become easier to write correctely.

    - **CLI mode**: Generate a prompt using a .prm file, by writing a CLI command in the VSCode UI. It generates a `.txt` file with the generated prompt. Further explained in [CLI mode and Prompt customization](#cli-mode-and-prompt-customization) section.
    - **Server mode**: Open the Impromptu server and send it a request to get the generated prompt  as a HTTP response.



## User's Manual

In this section will be explained the Sytanxis of Impromptu's DSl plus the different modes on have to use Impromptu



### Sytaxis
The core of Impromptu is its semantics that allow to wirte a propt as a programming fuction using variables and calls to another prompts.


A `.prm` file contains a **Language**, and a set of **prompts**, **chain** and **composer** (Assets). It may also contain one or more **imports**.
#### Language

Every `.prm` starts by declaring the language of the prompt that will generate. The grammar of it is:
```
language = <language>
```

Until now, the two possible languages are Spanish and English (i.e `language=English`).
This **element is optional**. If it was not declared, **it is assumed that the language is English**.
> *In the future, it will be used to ensure the compatibility between an asset and its imports/references*.

#### Prompt

`Prompt` is the basic function that generates a prompt. Its grammar is:

```
prompt <name> ([<inputs>]): <media>
[prefix = <snippets>]
core = <snippets>
[suffix = <snippets>]
[separator = <string>]
[language = <language>]

```
**name**: name that we give to the prompt. It has to be unique, and serves to reference the prompt in other places

**inputs**: Parameters and another inputs that are used to generate the prompt. There are two types of inputs:
- **parameter**: Transmit a `snippet` (explained HERE) inside the `prompt` as a variable. They should start by an `@` symbol.
- **metadata**: *to be developed*

**media**: Indicate the types of exit the prompt will generate when used in the LLM.

**prefix**, **core** & **suffix**: They are where what will truly generate the prompt is located. They are composed by a set of commands (called `snippets`) that induces that statemnt in the prompt. `snippets` will be explained in the next section. 

> The difference betweeen prefix, core and suffix is merely concptual. The snippets in the core are supposed to be related with the intructions of the prompt related to generate the answer, while in suffix and prefix appear instructions to guide the LLM to a correct answer.

**separator**: Tells how the different `snippets` are linked to each other. It was assigned a default separator for each LLM. For example, for ChatGPT, the default separator is `". "`.

**language**: A prompt can declare its language indivially of the language of the `.prm` is in.



#### Snippets

The snippets are the core of Impromptu. They are the "parts" that represent the different ideas that the generated prompt is wanted to have. There are 4 types of snippets:

1. **Text plain.** Just write a text that you want to be in the prompt

2. **Input.** Obviously, the inputs transmitted to the prompt can be referenced and be used it.

3. **Another asset**. You can use another asset from the same file (or that it were imported). For example, if you want to create a prompt to generate a poem about friendship, you may add a provious asset `generate_poem()` that generates a promptthat will create a poem.

4. **Traits**. The most useful type of snippet are the traits. They work as reference to assets, but about general topics that usually appear in a well-formed prompt. For example, if in the previous example we want to ensure that the generated poem in the previos example is for children, we should add `audience("children")`. The whole list of the implemented traits, plus their options are documented in [this document](traits_cheat_sheet.md).


### Composer
A Composer is a structure that allows to merge several snippets together. The difference with a Prompt is that not media is declared because each part of the composer is considered as an independent prompt (*There is not any functional difference yet*).

```
composer <name> ([<inputs>]): 
<snippets>
[separator = <string>]
[language = <language>]

```

### Chain
*Not real utility right now*

### Imports

In addition to prompts, composer and chains, a `.prm`can also contain imports. Similary to programming language such as java, the user can use other  elements **from a file located in `build_files`** by writing
```
import <name_1>,<name_2>,...,<name_n> from <file_location>
```
where `<name_i>` are the names of the asset imported, and `<file location>` is the relative path to the file from `build_files` (but without the `.prm` ending). For example, if the imported prompt is located in in the file `build_files/libraries/evaluation_questions.prm`, `<file location>` is `libraries.evaluation_questions`.





### `.prm` files syntax

The content of a `.prm` file consist on a list of *assets*, either reusable prompts or facilities to concatenate prompt ouputs (called *composers*). In order to correctely define a prompt, one has to name it, declare the parameters that it requires (it any), and the type of output produced by the prompt (i.e. an image or a text).
Then it must define the contents of the prompt as a sequence of *snippets*. There are four types of snippets.
-   <b>Plain text</b>. The prompt will containt the exact text that it was written. In this case, the snippet would be in qoutes.
-   <b>A variable </b>. As in a conventional programming language, Improptu accepts the use of variables. Its value is bound to the parameters transmitted from another asset (by an AssetReuse) or a CLI command in prompt-mode. 
The parameter variables start by a '`@`' symbol, and '`#`' if it is a file
-   <b>Traits</b>: Specify a certain concept in the prompt, which may different depending on the type of output to be produced. Some of them accept other snippets as variables, such as the Negation Trait(`no(<snippet>)`), which forbids the apperance of its content on the final result. Other more specific traits that only accept certain keywords as parameters. For instance, `language-register(<LanguageRegister>)` is a text-specific trait that defines the the register that has to be used on the result, and `<LanguageRegister>` can only take one of a set of predefined values such as `'casual'` or `'formal'`. See the [Traits' cheat sheet](traits_cheat_sheet.md) for more information.

-   <b>Reference to another asset</b>. A snippet can include another asset (prompt) declared in the same file, invoking it using new parameters. For example, in the following file
```
composer GenerateGryphoon(): image
  Mixture("eagle", "lion")

prompt Mixture(@animal1, @animal2): image
  core = audience( "children" ) weight high, 
         medium(drawing), 
         between(@animal1, @animal2), 
         no("violent"), no("scary")
```



the prompt generated by `GenerateGhyphoon()` contains all the snippets from `Mixture(@animal1, @animal2)`, considering `@animal1 = eagle` and `@animal2 = lion`.

<b>Snippet separator</b>

In addition of the prompt content, one can state how the different snippets will be separated in the prompt created. For example, if one want that in the previous prompt each snippet is separated by a comma, they should add:
```
composer GenerateGryphoon(): image
  Mixture("eagle", "lion")

prompt Mixture(@animal1, @animal2): image
  core = audience( "children" ) weight high, 
         medium(drawing), 
         between(@animal1, @animal2), 
         no("violent"), no("scary")
         separator= ', '
```
It is important to remark that the sperataor is only applied <b>between</b> the snippet. Thus, <b>the last snippet will not end with the separator</b>.

<b>Language declaration</b>

Each AI system has its predefined separator ("." in case of ChatGPT), in case it isn't declared. In the same manner, one has to declare **language** of the prompt. It is located at the end of the prompt, and, in addition, the langugae has to be defined at the beginning of the file:

```
language
    English
    code='en'
    region='EN'
    
composer GenerateGryphoon(): image
  Mixture("eagle", "lion")

prompt Mixture(@animal1, @animal2): image
  core = audience( "children" ) weight high, 
         medium(drawing), 
         between(@animal1, @animal2), 
         no("violent"), no("scary")
         separator= ', '
         language = English 
```

### Imported assets
A special type of asset are the <b>imports</b>. An import allows to use an asset from another file as if it were in the same file, which means that it can be referenced in an AssetReuse, or as a parameter. It is important to remark that the route, which it is used to define from where the imported asset is, **always will be defined as a relative route from `build_files` folder**, changing slashes to dots. For example, if one wants to import the prompt `job_statement` from the file `build_files\libraries\ethic_questions.prm`, they have to write in the destination file
```
import job_statement from libraries.ethic_questions
```
no matter where it is located.

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

One can even import more than one Asset at once:
```
language=English

import job_statement,JSON_format from ethic_questions

prompt NewMain(): image
core=job_statement("black person", "doctor"),JSON_format()
language=English
```



### CLI mode and Prompt customization

The tool features a command-line interface to generate platform-specific prompts from a `.prm` file containing Impromptu assets. To invoke the command-line interface, simply run the following command (sataying at the `Impromptu` folder): 

    ./bin/cli genprompt <.prm-file-path> -d <output-dir> -t <target-aisystem>

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

#### Types of errors and their syntax

There are two types of possible errors that it may occurr: validation errors or compilation errors.
- <b>Validation errors</b>. These errors are related to errors of the impromptu syntaxt in the langium document. Therefore, they are detected before creating the AST.
- <b>Compilation errors</b>. There are another errors that are only detected when the prompt is being generated.

The errors have the following syntax:
```
[<file>: <line>] Error: <description>
```
In case the error occurs in a imported file, that file and all their parents have errors. <b> The first one which sends the error is the child</b>:
```
There are validation errors:
[libraries/tests/import_testB.prm: 9] Error : Expecting: one of these possible Token sequences:
  1. [@]
  2. [$]
but found: ':' [:]
[libraries/tests/import_testB.prm: 9] Error : Expecting token of type `)` but found `:`. [:]
[libraries/tests/import_testA.prm: 6] Error : error in imported asset B.
[examples/examples_import/error_in_import.prm: 7] Error : error in imported asset main.
```


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

## Generating prompts for additional AI systems

In order to support platform-specific prompts for further generative AI services, just extend the file `generate-prompt.ts` by adding the new AI system in the enumeration and implementing the generating code within the `generatePromptCode` function:

```
export const AISystem = {
    ChatGPT: "chatgpt",
    StableDiffusion: "stable-diffusion",
    Midjourney: "midjourney",
    DESTINATIONPLATFORM: "DESTINATIONPLATFORM"
}

// If prompt is not informed, the generator will consider all the prompts included in the model;
// will generate the code for a single prompt, otherwise.
export function generatePromptCode(model: Ast.Model, aiSystem: string | undefined, prompt: Ast.Prompt | undefined): string[] | undefined {
    var result;
    switch(aiSystem) {
        ...
        case AISystem.DESTINATIONPLATFORM: {
            result = generatePrompt_DESTINATIONPLATFORM(model, prompt);
            break;
        }
        ...
    }
    ...
}
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


## Testing

Impromptu's unit testing is performed using [Vitest](https://vitest.dev/guide/).  It requires the package versions `Vite>=5.0.0` and `Node>=18.0.0`. Its performance is similar to [Jest](), but for TypeScript Frameworks instead o JavaScript.

In order to be able to run it, first you have to install it in 

```
npm install -D vitest
```

The command to run it is

```
npm run test
```

It automatically checks every file in the folder `__test__`, and every `.spec.ts` file. Those files may conatin compilation errors due to the incomplete mocks. Those errors won't affect the testing proccess, but may interrupt the compilation of the Impromptu service. For that reason, the folder `__test__` is excluded from the compiler in the `tsconfig.json` file.

Vitest does not allow to spy on child functions. Therefore, in order to test the performance of functions about the generation of the prompt, the developer must mock the objects created by Langium form the Impromptu syntax for the case they want to check.


## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The source code for the site is licensed under the MIT License, which you can find in the LICENSE.md file.

All graphical assets are licensed under the
[Creative Commons Attribution 3.0 Unported License](https://creativecommons.org/licenses/by/3.0/).
