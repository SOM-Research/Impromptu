import openai

class OpenAIService():
    
    VALIDATOR_MODEL = 'gpt-4'

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

    __prompt = '''{PROMPT}'''

    __validators = {VALIDATORS}

    @property
    def prompt(self):
        return self.__prompt
    
    @property
    def response(self):
        if (self.__response): return self.__response
        return ''
    
    @property
    def validation(self):
        if (self.__validation): return self.__validation
        return []
    
    def execute_prompt(self):
        self.__response = self.__query_model(self.prompt, self.model)
        self.__validation = self.__validate_response
    
    def __validate_response(self) -> list[(str, bool)]:
        validation_prompt = f'Given the PROMPT below and the RESPONSE given by an AI assistant. \
            Does the RESPONSE comply with the following LIST OF CONDITIONS (in JSON format, with keys "trait" and "condition")? \
            \
            Reply in JSON format. Your answer must include, for each item in the LIST OF CONDITIONS: \
            1. A key "trait" with the trait of the corresponding CONDITION item. \
            2. A key "valid" only with "True" if the corresponding condition of the CONDITION item is fulfilled by the RESPONSE; or "False" otherwise. \
            \
            PROMPT: ```{self.prompt}``` \
            \
            RESPONSE: ```{self.response}``` \
            \
            LIST OF CONDITIONS: {self.__validators}'
        validation = self.__query_model(validation_prompt, self.VALIDATOR_MODEL)
        return validation
    
    def __query_model(self, prompt: str, model: str) -> str:
        completion = openai.ChatCompletion.create(
            model = model,
            response_format = { "type": "json_object" },
            messages = [{
                "role": "user",
                "content": prompt
                }])
        return completion.choices[0].message.content