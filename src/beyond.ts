import { compile } from "html-to-text";
import { encode } from "gpt-3-encoder";
import { Configuration as OpenAIConfiguration, OpenAIApi } from "openai";
import { Configuration, SafeSearch, SearchResponse, SearchResult, SearchResults } from "./beyond.types";

const GOOGLE_REQUEST = "https://www.googleapis.com/customsearch/v1?key={1}&cx={2}&q={3}&safe={4}";

const convert = compile({
  preserveNewlines: false,
  wordwrap: false,
  baseElements: { selectors: ["main"] },
  selectors: [{ selector: "a", options: { ignoreHref: true } }]
});

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

  public search = async(prompt: string, safeSearch: SafeSearch = "active"): Promise<SearchResponse> => {
    const googleResponse = await fetch(GOOGLE_REQUEST
      .replace("{1}", this.config.GOOGLE_SEARCH_API_KEY)
      .replace("{2}", this.config.GOOGLE_SEARCH_ENGINE_ID)
      .replace("{3}", prompt)
      .replace("{4}", safeSearch));

    const [context, urlReference] = (await this.getTextOfSearchResults(await googleResponse.json()));

    const res = await this.openai.createChatCompletion({
      messages: [
        { role: "assistant", content: context },
        { role: "user", content: `With the information in the assistant's last message, answer this in the same language: ${prompt}` }
      ],
      model: "gpt-3.5-turbo",
      max_tokens: 100
    });

    if (!res.data) return { content: "No response from OpenAI" };
    const response = res.data.choices[0].message?.content;
    if (!response) return { content: "No response from OpenAI" };

    if (safeSearch !== "off") {
      const moderation = await this.openai.createModeration({
        input: urlReference + "\n" + response,
        model: "text-moderation-latest"
      });

      if (!moderation.data) return { content: "No response from OpenAI" };
      const flagged = moderation.data.results[0].flagged;
      if (flagged) return { content: "This response was flagged as inappropriate" };
    }

    return { content: response, url: urlReference };
  };

  private getTextOfSearchResults = async(results: SearchResults): Promise<[string, string]> => {
    let urlReference = "";

    if (!results.items || results.items.length === 0) return ["", urlReference];

    let context = results.items.reduce(
      (allPages: string, currentPage: SearchResult) => `${allPages} ${currentPage.snippet.replaceAll("...", " ")}`, ""
    );

    for (let i = 0; i < results.items.length && i < 5; i++) {
      const urlToCheck = results.items[i].link;
      const response = await fetch(urlToCheck);
      const fullText = convert(await response.text()).replaceAll("\n", " ").trim();

      context = fullText + context;
      urlReference = urlToCheck;
      break;
    }

    const maxPromptTokenLength = 3000;
    const encoded = encode(context);

    if (encoded.length > maxPromptTokenLength) context = context.slice(0, maxPromptTokenLength);
    return [context, urlReference];
  };

}