import { Configuration as OpenAIConfiguration, OpenAIApi } from "openai";
import { Configuration, SafeSearch, SearchResponse, SearchResult } from "./beyond.types";
import { BColors } from "bettercolors";

const GOOGLE_REQUEST = "https://www.googleapis.com/customsearch/v1?key={apiKey}&cx={searchEngineId}&q={query}&num={num}&safe={safeSearch}";

export class DataBeyond {

  private config: Configuration;

  private openai: OpenAIApi;

  private logger: BColors;

  constructor(config: Configuration) {
    this.config = config;
    this.logger = new BColors({ date: { format: "DD/MM/YYYY HH:mm:ss", surrounded: "[]" } });

    if (!this.config.OPENAI_API_KEY || !this.config.GOOGLE_SEARCH_API_KEY || !this.config.GOOGLE_SEARCH_ENGINE_ID) {
      throw new Error("Missing configuration");
    }

    this.openai = new OpenAIApi(new OpenAIConfiguration({
      apiKey: this.config.OPENAI_API_KEY,
      organization: this.config.OPENAI_ORGANIZATION_ID
    }));
  }

  private async find(query: string, limit = 1, safeSearch: SafeSearch = "off"): Promise<Response> {
    const keys = [this.config.GOOGLE_SEARCH_API_KEY, ...(this.config.MULTIPLE_SEARCH_API_KEYS || [])];
    for (const key of keys) {
      const request = GOOGLE_REQUEST
        .replace("{apiKey}", key)
        .replace("{searchEngineId}", this.config.GOOGLE_SEARCH_ENGINE_ID)
        .replace("{query}", encodeURIComponent(query))
        .replace("{num}", limit.toString())
        .replace("{safeSearch}", safeSearch);

      if (this.config.LOGGER?.LOG_REQUESTS) this.logger.debug(`Requesting ${request}`);
      const data = await fetch(request);
      if (this.config.LOGGER?.LOG_RESPONSES) this.logger.warning(`Response ${data.status} ${data.statusText}`);
      if (data.status !== 429) return data;
      if (this.config.LOGGER?.LOG_ERRORS) this.logger.error(`This key (${key}) is rate limited by Google, trying another key...`);
    }

    throw new Error("All keys are rate limited by Google");
  }

  public async search(query: string, limit = 1, safeSearch: SafeSearch = "off"): Promise<SearchResponse> {
    let context = "";
    try {
      const response = await this.find(query, limit, safeSearch);
      if (response.status !== 200) {
        if (this.config.LOGGER?.LOG_ERRORS) this.logger.error(`This request failed: ${query}`);
        return { content: "This request failed, please try again later.", url: null };
      }

      const data = await response.json();
      const items: SearchResult[] = data.items;

      if (!items || items.length === 0) {
        if (this.config.LOGGER?.LOG_ERRORS) this.logger.error(`The search returned no results: ${query}`);
        return { content: "The search returned no results.", url: null };
      }

      context = items.map(item => item.snippet).join("\n");

      const result = await this.openai.createChatCompletion({
        messages: [
          { content: context, role: "assistant" },
          { content: `With the information in the assistant's last message, answer this in the same language: ${query}`, role: "user" }
        ],
        model: "gpt-3.5-turbo"
      });

      if (!result || !result.data || !result.data.choices) {
        if (this.config.LOGGER?.LOG_ERRORS) this.logger.error(`An error occurred while requesting OpenAI: ${context}`);
        return { content: "No response from OpenAI", url: null };
      }

      const responseText = result.data.choices[0].message?.content;
      if (!responseText) return { content: "No response from OpenAI", url: null };

      if (safeSearch !== "off") {
        const moderation = await this.openai.createModeration({
          input: responseText + "\n" + items[0].link + "\n" + items.map(item => item.link).join("\n"),
          model: "text-moderation-latest"
        });

        if (!moderation || !moderation.data || !moderation.data.results || !moderation.data.results[0]) {
          if (this.config.LOGGER?.LOG_ERRORS) this.logger.error(`An error occurred while moderating the response from OpenAI: ${responseText}`);
          return {
            content: "An error occurred while moderating the response from OpenAI, by safety reasons it cannot be shown.",
            url: null
          };
        }

        if (moderation.data.results[0].flagged) {
          if (this.config.LOGGER?.LOG_ERRORS) this.logger.error(`The response from OpenAI was flagged as unsafe: ${responseText}`);
          return {
            content: "The response from OpenAI was flagged as unsafe, by safety reasons it cannot be shown.",
            url: null
          };
        } else {
          if (this.config.LOGGER?.LOG_RESPONSES) this.logger.info(`Response from OpenAI: ${responseText}`);
          return {
            content: responseText,
            url: items[0].link,
            urls: items.map(item => item.link)
          };
        }
      }

      if (this.config.LOGGER?.LOG_RESPONSES) this.logger.info(`Response from OpenAI: ${responseText}`);
      return {
        content: responseText,
        url: items[0].link,
        urls: items.map(item => item.link)
      };
    } catch (error: any) {
      if (this.config.LOGGER?.LOG_ERRORS) this.logger.error(error);
      return { content: "An error occurred while searching Google.", url: null };
    }
  }

}