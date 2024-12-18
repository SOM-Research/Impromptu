## How to generate a prompt:
The goal of Impromptu as a DSL is giving a way to split and structurize the process of generating prompts to a LLM.

The structure of the documents is:
- Language that idicates in which langugae the propt will be written. It is optional (by default is English).
- the set of **assets**: An asset is an structure that works as the fuction of a prgramming languge: the result of cumputing an asset by the DSL result in a generated prompt to use it in a LLM.
There are different types of assets. Each one have a different syntax:

    - **Composer**
    ```
    composer <name>(<parameters>): <media>
    <snippets>
    separator=<string>              <- optional
    ```
    - **Prompt** 
    ```
    prompt <name>(<parameters>): <media>
    prefix=<snippets>               <- optional
    core=<snippets>
    suffix=<snippets>               <- optional
    separator=<string>              <- optional
    ```


    - **Chain** (*to be developed*)
    ```
    chain <name>
    ```

> The difference between a Composer and a Prompt it is mostly coneptual. A well-written prompt should consist of the description of the task plus some refiements such as set a role or give an examples. These parts make more sense in the `suffix` or `prefix`.
On the other hand, a `Composer` is supposed to be used to concatenate several `Asset`



#### Parameters
Elements that are transmitted to the snippets of the asset. It can be a parameter (start wit `@`), or a multimodal (start with `$`).

#### Media
 Indicates how the answer of the LLM would be (irrelevant right now).
 `Media` possible values:

 `text` | `image` | `audio` | `video` | `3dobject`

#### Snippets
 A snippet is a subdivision of an asset and it can be
 - A **TextLiteral**: Text transmitted to the LLM as it is. Therefore, it is simply a string

 - A **Trait**: Keywords that helps to transmit a concept to the LLM. For example, The audience trait `audience()` transmits to the asset what the audicence target of the generated material is. One can see which traits are available in each LLM, and its poassible values in the follwing [document](traits_cheat_sheet.md).

 - A **Input**: It can also be a variable. A variable is a refrence to another snippet, typically a textLiteral

 - An **AssetReuse**: Similat to an imput,one can reutilize an asset in another asset as function, by declaring its name. By this method, one can create its custom traits.

#### Separator

Indicates which caracter is between an snippet and another. Each LLM has ha default saprator (for example, the dafault seprator for ChatGPT is `" ."`)

 ## Example

 Suppose that we want to generate a poem about friendship for children using a LLP. The prompt that we would use will be similar to this one:
 *Write an original poem about frendship. The content of this poem should be proper for children*

 Thus, three main ideas are transmitted to the LLM:
 1) Write a poem about friendship
 2) The poem has to be proper for children
 3) The poem should be original

 Therefore, we can create an asset that generates a prompt with those ideas, each one represented by a snippet. As a result, we can transmit the second idea as a *Trait* (*AudienceTrait*):
 ```
 prompt child_poem(): text 
 core = "Write a poem about friendship",
        audience("children"),
        "The poem should be original"
 ``` 

 We can go one more step, and generate the asset so that we can use it as well to generate poems with another topic and another possible audiences using parameters:

```
prompt write_poem(@topic,@target):text
core = "Write a poem about", @topic,
    audience(@target),
    "The poem should be original"
```

