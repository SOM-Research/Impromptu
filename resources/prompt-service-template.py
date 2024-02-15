from openai import OpenAI
import json
from abc import abstractmethod
from enum import Enum

class PromptService:

    VALIDATOR_MODEL = 'gpt-4-vision-preview'

    __prompt = '''{PROMPT}'''

    __validators = {VALIDATORS}

    __media = '{MEDIA}'
    MediaKind = Enum('Media', 'text image') # | 'audio' | 'video' | '3dobject')

    @property
    def prompt(self):
        return self.__prompt
    
    @property
    def media(self):
        return self.__media
    
    @property
    def response(self):
        if (self.__response): return self.__response
        return ''
    
    @property
    def validation(self):
        if (self.__validation): return self.__validation
        return []

    def __init__(self, openai_api_key: str):
        self.__validator = OpenAI(api_key=openai_api_key)
    
    def execute_prompt(self):
        self.__response = self.query_model()
        self.__validation = self.__validate_response()
    
    @abstractmethod
    def query_model(self):
        pass

    def __validate_response(self):
        if (self.media == self.MediaKind.text.name):
            validation_prompt = f'Given the PROMPT below and the RESPONSE given by an AI assistant as a response to the PROMPT. \
                Does the RESPONSE comply with the following LIST OF CONDITIONS (which are provided in JSON format, with keys "trait" and "condition")? \
                \
                Reply with a text in valid JSON format, that is: the content is embedded within an open and a closing bracket. \
                Do not include in your answer the term "json". Do not include in your answer any carry return, nor any special character other than brackets and curly brackets. \
                Your answer must include, for each item in the LIST OF CONDITIONS: \
                1. A key "trait" with the trait of the corresponding LIST OF CONDITIONS item. \
                2. A key "valid" only with "True" if the corresponding condition of the LIST OF CONDITIONS item is fulfilled by the RESPONSE; or "False" otherwise. \
                \
                PROMPT: ```{self.prompt}``` \
                \
                RESPONSE: ```{self.response}``` \
                \
                LIST OF CONDITIONS: {self.__validators}'
            message_payload = [{
                "role": "user",
                "content": validation_prompt
            }]
        # yet, we only consider text and image media outputs
        else:
            validation_prompt = f'Given the PROMPT below and the image provided by an AI assistant as a response to the PROMPT. \
                Does the image comply with the following LIST OF CONDITIONS (which are provided in JSON format, with keys "trait" and "condition")? \
                \
                Reply with a text in valid JSON format, that is: the content is embedded within an open and a closing bracket. \
                Do not include in your answer the term "json". Do not include in your answer any carry return, nor any special character other than brackets and curly brackets. \
                Your answer must include, for each item in the LIST OF CONDITIONS: \
                1. A key "trait" with the trait of the corresponding LIST OF CONDITIONS item. \
                2. A key "valid" only with "True" if the corresponding condition of the LIST OF CONDITIONS item is fulfilled by the image; or "False" otherwise. \
                \
                PROMPT: ```{self.prompt}``` \
                \
                LIST OF CONDITIONS: {self.__validators}'
            message_payload = [{
                "role": "user",
                "content": [
                    { "type": "text", "text": validation_prompt },
                    { "type": "image_url", "image_url": { "url": self.response } }
                ]
            }]
        validation = self.__query_validation(message_payload)
        return validation
            
    def __query_validation(self, message_payload):
        completion = self.__validator.chat.completions.create(
            model = self.VALIDATOR_MODEL,
            # if no max_tokens provided, default seems to be 16
            # 16 is insufficient for generating a valid json response
            # TODO: decide!
            max_tokens = 30,
            n = 1,
            messages = message_payload)
        return json.dumps(completion.choices[0].message.content)


