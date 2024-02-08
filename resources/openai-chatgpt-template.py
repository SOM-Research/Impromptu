class OpenAIService(PromptService):

    # Invoke with...
    # 1) Your own OpenAI's API key
    # 2) A valid OpenAI's chat model, e.g.:
    #       gpt-3.5-turbo-1106  # snapshot November 6th, 2023
    #       gpt-3.5-turbo
    #       gpt-3.5-turbo-16k
    #       gpt-4-0613          # snapshot June 13th, 2023
    #       gpt-4
    def __init__(self, openai_api_key: str, model: str):
        self.__client = OpenAI(api_key=openai_api_key)
        self.__model = model
        super().__init__(openai_api_key)

    def query_model(self):
        completion = self.__client.chat.completions.create(
            model = self.__model,
            max_tokens=10,
            messages =[{
                "role": "user",
                "content": self.prompt,
                }])
        return completion.choices[0].message.content