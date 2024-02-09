class OpenAIService(PromptService):

    # Invoke with...
    # 1) Your own OpenAI's API key
    # 2) A valid OpenAI's chat model, e.g.:
    #       gpt-3.5-turbo-1106  # snapshot November 6th, 2023
    #       gpt-3.5-turbo
    #       gpt-3.5-turbo-16k
    #       gpt-4-0613          # snapshot June 13th, 2023
    #       gpt-4
    def __init__(self, openai_api_key: str, text_model: str):
        self.__client = OpenAI(api_key=openai_api_key)
        self.__model = text_model
        self.__image_model = 'dall-e-3'
        super().__init__(openai_api_key)

    def query_model(self):
        if (self.media == self.MediaKind.text.name): return self.__query_text()
        # yet, we only consider text and image media outputs
        else: return self.__query_image()
    
    def __query_text(self):
        completion = self.__client.chat.completions.create(
            model = self.__model,
            max_tokens=10,
            messages =[{
                "role": "user",
                "content": self.prompt,
                }])
        return completion.choices[0].message.content
    
    def __query_image(self):
        response = self.__client.images.generate(
            model = self.__image_model,
            prompt = self.prompt,
            #size="1024x1024",
            #quality="standard",
            #n=1,
        )
        return response.data[0].url