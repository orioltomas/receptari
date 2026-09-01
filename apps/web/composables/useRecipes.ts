import type {
  CreateRecipeInput,
  ListRecipesQuery,
  Recipe,
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

  async function list(query: ListRecipesQuery = {}): Promise<RecipeSummary[]> {
    return await fetcher<RecipeSummary[]>(url('/api/recipes'), {
      query: query.q ? { q: query.q } : undefined,
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

  return { list, get, create, update, remove };
}

export function useRecipes() {
  const config = useRuntimeConfig();
  return createRecipesApi(config.public.apiUrl);
}
