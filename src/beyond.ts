import { Configuration as OpenAIConfiguration, OpenAIApi } from "openai";
import { Configuration } from "./beyond.types";

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

  public search = (): string[] => {
    return ["Hello", "World"];
  };

}