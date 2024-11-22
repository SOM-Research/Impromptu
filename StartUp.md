## Installation
#### Requirements
As requirements to a proper setup of Impromptu in your systems, one needs to meet the follwing requirements:
- Have **internet conection** to be able to upload several packages
- Being able to **run the system as an Administrator**.

#### 1- Extract Impromptu's `.zip` folder in your PC

#### 2- Install `node` in your PC
-  Go to https://nodejs.org/en/download/prebuilt-installer, and install `Node v22.11.00` and choose the installer that correspond to your system. 
- Yo can check that can it was succesfully installed by open the med and write `node --version`. Maybe you should restart the computer before the system detetcs it installed.

#### 3- Install `vscode`

- Go to https://code.visualstudio.com/download, and dowload the version that is for your system.


- Open `vscode`.
- In, `vscode`, open the Impropmtu folder (Go to `File`->`Open Folder..`->Select the folder).
- Once in the Impromptu workspace, open a new Terminal (`Terminal`-> `New Terminal`)

#### 4- Change the Execution Policy of the system (Windows).
- Open PowerShell as Administrator (press `Ctrl+X`->`Terminal(Administrator)`)

- Change the `Execution Policy` to `Remote Signed`. This policy allows scripts created on your local computer to run, but requires that scripts downloaded from the internet be signed by a trusted publisher.:
```
Set-ExecutionPolicy RemoteSigned
```

- Check that the Execution Policy has been changed
```
ExecutionPolicy
```
For further details, visit [this post](https://medium.com/@devnurai/how-to-fix-the-npm-file-c-program-files-nodejs-npm-ps1-69515d0fb02b).

> Changing the Execution Policy may open vulnerability to your system. A more secure option is done by the command `Set-ExecutionPolicy RemoteSigned –Scope Process`, which only affects the current session.

#### 5- Install the expansions
- Install the Impromptu service by writing in the terminal `npm install`
    - At the moment, you also need to install `csv-parser`.


- Install Langium from the Extension marketplace (Go to `Extension` icon in the lateral scroll, and write `Langium` in the serch bar. Click on the result and install it).

- In order to make use of Impromptu as a expansion, one should also install. You can install the extension by (downloading the `.vsix` file and) running:
```code --install-extension impromptu-1.0.0.vsix```
Alternatively, if you open Visual Studio Code and search the extension file (`impromptu-1.0.0.vsix`), you can right-click on it and select `"Install VSIX Extension"` at the bottom of the list of options.


- Lastly, in order to make langium operative, the user needs to do an initial run of Impromptu by its `run` commands:
```
npm run langium:generate
npm run build
```


### Quick Start Guide

1. Extract Impromptu's `.zip` folder in your PC
2. Install `node` in your PC
3. Install `vscode`
4. Change the Execution Policy of the system (Windows).
5. Run `npm install`
6. Install `Langium` and `Impromptu` vscode's Extension
7. Run `npm run langium:generate` and `npm run build`


### DSL Syntaxis

A `.prm` file contains a **Language** (optional), and a set of **prompts**, **chain** and **composer** (Assets). It may also contain one or more **iports**
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