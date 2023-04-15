# Impromptu

A domain-specific language for prompt engineering

Impromptu is a prototype implementation of a model-driven engineering tool for prompt engineering. Its goal is enabling the definition of prompts for different types of generative AI systems and different tasks (text-to-text, text-to-image, multi-modal prompts). 

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

    ./bin/cli gentprompt examples/ex1.prm -d <output-dir> -t <target-ai-system>

You can specify the output directory and the target AI system that will execute the prompt (currently `midjourney`or `stable-diffusion`).
