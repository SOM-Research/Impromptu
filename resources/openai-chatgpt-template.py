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

    __prompt = '''{PROMPT}'''

    __validators = [{VALIDATORS}]

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
        self.__response = self.__query_model(self.prompt)
        self.__validation = self.__validate_response
    
    def __validate_response(self) -> list[(str, bool)]:
        result = []
        for validator in self.__validators:
            validation_prompt = f'Given the PROMPT below and the RESPONSE given by an AI assistant. \
                Does the RESPONSE comply with the following CONDITION? \
                Reply only with "True" if the CONDITION is fulfilled; \
                or "False" otherwise. \
                PROMPT: ```{self.prompt}``` \
                \
                RESPONSE: ```{self.response}``` \
                \
                CONDITION: {validator}'
            validation = self.__query_model(validation_prompt)
            result.append(validator, validation)
        return result
    
    def __query_model(self, prompt: str) -> str:
        completion = openai.ChatCompletion.create(
            model = self.model,
            messages = [{"role": "user", "content": prompt}])
        return completion.choices[0].message.content