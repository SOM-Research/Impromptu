import openai

class OpenAIService():
    
    # Invoke with...
    # 1) Your own OpenAI's API key
    # 2) A valid OpenAI's chat model:
    #       gpt-3.5-turbo-0301 - snapshot March 1st, 2023
    #       gpt-3.5-turbo-0613 - snapshot June 13th, 2023
    #       gpt-4-0314 - snapshot March 14th, 2023
    #       gpt-4-0613 - snapshot June 13th, 2023
    #       gpt-3.5-turbo
    #       gpt-3.5-turbo-16k
    #       gpt-4
    def __init__(self, openai_api_key: string, model: string):
        openai.api_key = openai_api_key
        self.model = model

class OpenAIChatGPTService(OpenAIService):

    prompts = {PROMPTS_ARRAY}
    
    def execute_prompts(self) -> list[str]:
        responses = []
        for prompt in self.prompts:
            completion = openai.ChatCompletion.create(
                model = self.model,
                messages = [{"role": "user", "content": prompt}])
            responses.append(completion.choices[0].message.content)
        return responses