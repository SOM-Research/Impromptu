import openai
import requests
import json

class StableDiffusionService():

    API_URL = 'https://stablediffusionapi.com/api/v3/text2img'
    API_HEADERS = {'Content-Type': 'application/json'}
    VALIDATOR_MODEL = 'gpt-4'
    
    # Invoke with your own Stable Diffusion's API key
    def __init__(self, sd_api_key: string):
        self.sd_api_key = sd_api_key

class StableDiffusionText2ImageService(StableDiffusionService):

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
        self.__response = self.__query_model
        self.__validation = self.__validate_response

    def __query_model(self) -> str:
        payload = json.dumps({
            "key": self.sd_api_key,
            "prompt": self.prompt,
            "negative_prompt": None,
        })
        result = requests.request("POST", self.API_URL, headers=self.API_HEADERS, data=payload)
        return result.text
        
    def __validate_response(self):
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
        validation = self.__query_validation(validation_prompt)
        return validation
    
    def __query_validation(self, validation_prompt):
        completion = openai.ChatCompletion.create(
            model = self.VALIDATOR_MODEL,
            response_format = { "type": "json_object" },
            messages = [{
                "role": "user",
                "content": validation_prompt
                }])
        return json.dumps(completion.choices[0].message.content)