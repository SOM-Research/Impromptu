# Impromptu

A domain-specific language for prompt engineering

Impromptu is a prototype implementation of a model-driven engineering tool for prompt engineering. Its goal is enabling the definition of prompts for different types of generative AI systems and different tasks (text-to-text, text-to-image, multi-modal prompts). 

For example, you can write a generic prompt to generate an image as follows:

    prompt myImage(): image
        core = medium( photography ), "dogs", "alert" weight high, no( "cats" ), no ( "humans" )
        
Impromptu can generate platform-specific prompts for different platforms that take advantage of its advanced settings, e.g. defining the weight of specific concepts within the prompt. Different systems offer different settings and use a different syntax. With Impromptu, you only need to write them once. You can also import one prompt into another (write modular prompts!) as well as defining prompt chains or keeping track of different prompt versions.

This repository is the companion to the research paper providing a description of the Impromptu DSL:

> Robert Clarisó, Jordi Cabot (2023). "Model-driven prompt engineering". ACM/IEEE 26th International Conference on Model-Driven Engineering Languages and Systems (MODELS), IEEE, to appear.

## Requirements

Impromptu is implemented in TypeScript using the [Langium](https://langium.org) open-source language engineering toolkit. In order to run Impromptu you need [Node.js](https://nodejs.org/) and [Visual Studio Code](https://code.visualstudio.com/) in your system.

## Installing

Impromptu is offered as a Visual Studio Code extension. You can install the extension by downloading the `.vsix` file and running:

    code --install-extension impromptu-1.0.0.vsix
    
Alternatively, if you open Visual Studio Code and search the extension file, you can right-click on it 
and select `"Install VSIX Extension"` at the bottom of the list of options.

## Features 

The extension offers an editor for Impromptu prompts, with *syntax highlighting*, *syntax validation* and *autocomplete suggestions*. The extension enables users to generate prompts for specific AI systems and, on the other hand, to create code to invoke those AI platforms which have public APIs. Currently, supported target AI systems for generating prompts are [Midjourney](https://www.midjourney.com/), [Stable Diffusion web-ui](https://github.com/AUTOMATIC1111/stable-diffusion-webui) and OpenAI's [ChatGPT](https://openai.com/chatgpt/). Users can leverage Impromptu to generate API invoking code for Stable Diffusion and ChatGPT.
 
To use the editor, first install the Impromptu VS Code extension and then create a file in VS Code with extension `.prm`. The editor will not be available until you create a file with the proper extension.

### Prompt customization

The tool features a command-line interface to generate platform-specific prompts from a `.prm` file containing Impromptu assets. To invoke the command-line interface, simply run the following command: 

    ./bin/cli genprompt examples/example.prm -d <output-dir> -t <target-ai-system>

You can specify the output directory and the target AI system that will execute the prompt (currently, `midjourney`, `stable-diffusion` and `chatgpt`).

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

### Code generation for prompt execution and output validation

The editor menu displays two options: `"Generate Stable Diffusion Python code"` and `"Generate ChatGPT Python code"`. When clicking a menu item, you should select which prompt will be sent to the target AI system and validated. Then, a new panel appears with the corresponding Python code generated to invoke that AI platform with the selected prompt and its output validators. For instance, given the following Impromptu code:

```
language
    English
    code='en'
    region='EN'

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

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The source code for the site is licensed under the MIT License, which you can find in the LICENSE.md file.

All graphical assets are licensed under the
[Creative Commons Attribution 3.0 Unported License](https://creativecommons.org/licenses/by/3.0/).
