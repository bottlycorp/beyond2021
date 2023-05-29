export type Configuration = {
  /**
   * OpenAI API key
   * @see https://platform.openai.com/account/api-keys
   */
  OPENAI_API_KEY: string;
  /**
   * Optional, only needed for users with multiple organizations (default: null)
   * @see https://platform.openai.com/account/org-settings
   */
  OPENAI_ORGANIZATION_ID?: string;
  /**
   * Google Search API key
   * You can send 100 requests per day for free. (per key)
   * @see https://developers.google.com/custom-search/v1/overview#pricing
   * @see https://developers.google.com/custom-search/v1/introduction
   */
  GOOGLE_SEARCH_API_KEY: string;
  /**
   * Since we can only make 100 requests per day (per key) without charge, we define several keys here to randomly
   * select each request in order to shift this limit further and further out.
   * If a key is rate limited, the next key will be used. If all keys are rate limited, the request will fail.
   * @see https://developers.google.com/custom-search/v1/overview#pricing
   */
  MULTIPLE_SEARCH_API_KEYS?: string[];
  /**
   * Google Search Engine ID
   * @see https://programmablesearchengine.google.com/controlpanel/all
   */
  GOOGLE_SEARCH_ENGINE_ID: string;
  /**
   * Loggers
  */
  LOGGER?: {
    /**
     * Log requests to console (default: false)
     * @default false
      */
    LOG_REQUESTS?: boolean;
    /**
     * Log responses to console (default: false)
     * @default false
      */
    LOG_RESPONSES?: boolean;
    /**
     * Log errors to console (default: true)
      * @default false
    */
    LOG_ERRORS?: boolean;
  };
}

export type SearchResponse = {
  content: string;
  url?: string | null;
  urls?: string[] | null;
}

export type SearchResult = {
  title: string;
  link: string;
  snippet: string;
}

/**
 * @see https://docs.openai.com/api-reference/engines/create
 */
export type SafeSearch = "safeUndefined" | "active" | "off";