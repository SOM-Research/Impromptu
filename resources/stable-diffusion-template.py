import requests

class StableDiffusionService(PromptService):

    API_URL = 'https://stablediffusionapi.com/api/v3/text2img'
    API_HEADERS = {'Content-Type': 'application/json'}
    
    # Invoke with your own Stable Diffusion's API key
    def __init__(self, sd_api_key: str):
        self.__sd_api_key = sd_api_key

    def query_model(self) -> str:
        payload = json.dumps({
            "key": self.__sd_api_key,
            "prompt": self.prompt,
            "negative_prompt": None,
        })
        result = requests.request("POST", self.API_URL, headers=self.API_HEADERS, data=payload)
        return result.text.output