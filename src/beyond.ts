import { Configuration as OpenAIConfiguration, OpenAIApi } from "openai";
import { Configuration, SearchResponse, SearchResult } from "./beyond.types";

const GOOGLE_REQUEST = "https://www.googleapis.com/customsearch/v1?key={apiKey}&cx={searchEngineId}&q={query}&num={num}";

export class DataBeyond {

  private config: Configuration;

  private openai: OpenAIApi;

  constructor(config: Configuration) {
    this.config = config;

    if (!this.config.OPENAI_API_KEY || !this.config.GOOGLE_SEARCH_API_KEY || !this.config.GOOGLE_SEARCH_ENGINE_ID) {
      throw new Error("Missing configuration");
    }

    this.openai = new OpenAIApi(new OpenAIConfiguration({
      apiKey: this.config.OPENAI_API_KEY,
      organization: this.config.OPENAI_ORGANIZATION_ID
    }));
  }

  private async find(query: string, limit = 1): Promise<Response> {
    const data = await fetch(GOOGLE_REQUEST
      .replace("{apiKey}", this.config.GOOGLE_SEARCH_API_KEY)
      .replace("{searchEngineId}", this.config.GOOGLE_SEARCH_ENGINE_ID)
      .replace("{query}", encodeURIComponent(query))
      .replace("{num}", limit.toString()));

    if (data.status !== 429) return data;

    console.error("This key is rate limited by Google, trying another key...");
    let response: Response;

    if (this.config.MULTIPLE_SEARCH_API_KEYS && this.config.MULTIPLE_SEARCH_API_KEYS.length > 0) {
      let keyIndex = 0;
      while (keyIndex < this.config.MULTIPLE_SEARCH_API_KEYS.length) {
        try {
          response = await fetch(GOOGLE_REQUEST
            .replace("{apiKey}", this.config.MULTIPLE_SEARCH_API_KEYS[keyIndex])
            .replace("{searchEngineId}", this.config.GOOGLE_SEARCH_ENGINE_ID)
            .replace("{query}", encodeURIComponent(query))
            .replace("{num}", limit.toString()));

          if (response.status === 429) {
            console.error("This key is also rate limited by Google, trying another key...");
            keyIndex += 1;
          } else {
            console.log("Successfully found a key that is not rate limited by Google.");
            return response;
          }
        } catch {
          keyIndex += 1;
        }
      }
    }

    return data;
  }

  public async search(query: string, limit = 1): Promise<SearchResponse> {
    let context = "";
    try {
      const response = await this.find(query, limit);
      if (response.status !== 200) return { content: "This request failed, please try again later.", url: null };

      const data = await response.json();
      const items: SearchResult[] = data.items;

      if (!items || items.length === 0) return { content: "No results found.", url: null };

      context = items.map(item => item.snippet).join("\n");

      const result = await this.openai.createChatCompletion({
        messages: [
          { content: context, role: "assistant" },
          { content: `With the information in the assistant's last message, answer this in the same language: ${query}`, role: "user" }
        ],
        model: "gpt-3.5-turbo"
      });

      if (!result || !result.data || !result.data.choices) return { content: "No response from OpenAI", url: null };

      const responseText = result.data.choices[0].message?.content;
      if (!responseText) return { content: "No response from OpenAI", url: null };

      return {
        content: responseText,
        url: items[0].link,
        urls: items.map(item => item.link)
      };
    } catch (error: any) {
      return { content: "An error occurred while searching Google.", url: null };
    }
  }

}