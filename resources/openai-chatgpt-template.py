import openai

class OpenAIService():
    
    # Invoke with...
    # 1) Your own OpenAI's API key
    # 2) A valid OpenAI's chat model, e.g.:
    #       gpt-3.5-turbo-1106  # snapshot November 6th, 2023
    #       gpt-3.5-turbo
    #       gpt-3.5-turbo-16k
    #       gpt-4-0613          # snapshot June 13th, 2023
    #       gpt-4
    def __init__(self, openai_api_key: string, model: string):
        openai.api_key = openai_api_key
        self.model = model

class OpenAIChatGPTService(OpenAIService):

    prompt = '''{PROMPT}'''
    
    def execute_prompt(self) -> str:
        completion = openai.ChatCompletion.create(
            model = self.model,
            messages = [{"role": "user", "content": self.prompt}])
        return completion.choices[0].message.content