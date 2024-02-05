import requests
import json

class StableDiffusionService():
    
    # Invoke with your own Stable Diffusion's API key
    def __init__(self, sd_api_key: string):
        self.sd_api_key = sd_api_key
        self.url = "https://stablediffusionapi.com/api/v3/text2img"
        self.headers = {'Content-Type': 'application/json'}

class StableDiffusionText2ImageService(StableDiffusionService):

    prompt = '''{PROMPT}'''
    
    def execute_prompt(self) -> str:
        payload = json.dumps({
            "key": self.sd_api_key,
            "prompt": self.prompt,
            "negative_prompt": None,
        })
        response = requests.request("POST", self.url, headers=self.headers, data=payload)
        return response.text