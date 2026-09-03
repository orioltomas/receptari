import type {
  CreateRecipeInput,
  ListRecipesQuery,
  Recipe,
  RecipeListResponse,
  RecipeSummary,
  UpdateRecipeInput,
} from '@receptari/shared';

export function buildApiUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | undefined>,
): string {
  const base = baseUrl.replace(/\/$/, '');
  const qs = query
    ? '?' +
      Object.entries(query)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return `${base}${path}${qs}`;
}

export function createRecipesApi(baseUrl: string, fetcher: typeof $fetch = $fetch) {
  function url(path: string, query?: Record<string, string | undefined>): string {
    return buildApiUrl(baseUrl, path, query);
  }

  /**
   * Every filter, the sort and the paging are the API's job — nothing here is
   * computed client-side. Returns a page plus the unpaged total.
   */
  async function list(query: Partial<ListRecipesQuery> = {}): Promise<RecipeListResponse> {
    const queryParams: Record<string, string> = {};
    if (query.q) queryParams.q = query.q;
    if (query.category) queryParams.category = query.category;
    if (query.season) queryParams.season = query.season;
    if (query.difficulty) queryParams.difficulty = query.difficulty;
    if (query.time) queryParams.time = query.time;
    if (query.sort) queryParams.sort = query.sort;
    if (query.limit != null) queryParams.limit = String(query.limit);
    if (query.offset != null) queryParams.offset = String(query.offset);

    return await fetcher<RecipeListResponse>(url('/api/recipes'), {
      query: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
  }

  async function get(id: string): Promise<Recipe> {
    return await fetcher<Recipe>(url(`/api/recipes/${id}`));
  }

  async function create(input: CreateRecipeInput): Promise<Recipe> {
    return await fetcher<Recipe>(url('/api/recipes'), { method: 'POST', body: input });
  }

  async function update(id: string, input: UpdateRecipeInput): Promise<Recipe> {
    return await fetcher<Recipe>(url(`/api/recipes/${id}`), { method: 'PATCH', body: input });
  }

  async function remove(id: string): Promise<void> {
    await fetcher(url(`/api/recipes/${id}`), { method: 'DELETE' });
  }

  /** Convenience for a plain text search that only cares about the page. */
  async function search(q: string): Promise<RecipeSummary[]> {
    const { items } = await list({ q });
    return items;
  }

  return { list, get, create, update, remove, search };
}

export function useRecipes() {
  const config = useRuntimeConfig();
  return createRecipesApi(config.public.apiUrl);
}
