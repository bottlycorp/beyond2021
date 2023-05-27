export type Configuration = {
  /**
   * OpenAI API key
   * @see https://platform.openai.com/account/api-keys
   */
  OPENAI_API_KEY: string;
  /**
   * Optional, only needed for users with multiple organizations (default: null)
   */
  OPENAI_ORGANIZATION_ID?: string;
  /**
   * Google Search API key
   * @see https://developers.google.com/custom-search/v1/introduction
   */
  GOOGLE_SEARCH_API_KEY: string;
  /**
   * Google Search Engine ID
   * @see https://programmablesearchengine.google.com/controlpanel/all
   */
  GOOGLE_SEARCH_ENGINE_ID: string;
}

export type SearchResults = {
  items: {
    snippet: string;
    link: string;
  }[];
}

export type SearchResult = {
  snippet: string;
  link: string;
}

export type SearchResponse = {
  content: string;
  url?: string | null;
}