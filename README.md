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

At this stage, the features offered by Impromptu are limited. The extension offers an editor for impromptu prompts, with *syntax highlighting*, *syntax validation* and *autocomplete suggestions*. Moreover, there is a command-line interface to generate prompts for specific AI systems (right now, [Midjourney](https://www.midjourney.com/) and [Stable Diffusion web-ui](https://github.com/AUTOMATIC1111/stable-diffusion-webui)).
 
To use the editor, first install the Impromptu VS Code extension and then create a file in VS Code with extension `.prm`. The editor will not be available until you create a file with the proper extension.

To invoke the command-line interface, simply run the following command: 

    ./bin/cli genprompt examples/example.prm -d <output-dir> -t <target-ai-system>

You can specify the output directory and the target AI system that will execute the prompt (currently `midjourney`or `stable-diffusion`).

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The source code for the site is licensed under the MIT License, which you can find in the LICENSE.md file.

All graphical assets are licensed under the
[Creative Commons Attribution 3.0 Unported License](https://creativecommons.org/licenses/by/3.0/).
