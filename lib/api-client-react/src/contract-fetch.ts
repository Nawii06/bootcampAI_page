import type { z } from "zod";
import type { CustomFetchOptions } from "./custom-fetch";
import { customFetch } from "./custom-fetch";

export async function contractFetch<Schema extends z.ZodTypeAny>(
  schema: Schema,
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<z.infer<Schema>> {
  const data = await customFetch<unknown>(input, {
    responseType: "json",
    ...options,
  });
  return schema.parse(data);
}
