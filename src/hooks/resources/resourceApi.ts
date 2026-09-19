/**
 * Resource REST calls, typed from `ResourceController` in `talimBE-V2`. Every
 * request goes through the one typed client, which attaches the bearer token,
 * refreshes it once on 401 and raises `ApiError`.
 *
 * Unlike the older helpers in `api.service.ts`, a failed read here throws
 * instead of returning an empty list, so the page can show an error state
 * rather than "No resources yet".
 */
import { api } from "@/lib/apiClient";
import type { CreateResourcePayload, Resource, UpdateResourcePayload } from "./types";

/**
 * The resources a teacher uploaded (by User id or Teacher profile id).
 *
 * @param uploaderId - The teacher's user id.
 * @returns The resources, newest as the server orders them.
 * @throws ApiError when the request fails.
 */
export async function listResourcesByUploader(uploaderId: string): Promise<Resource[]> {
  const body = await api.get<Resource[]>(`/resources/user/${uploaderId}`);
  return Array.isArray(body) ? body : [];
}

/**
 * Uploads (creates) a resource.
 *
 * @param payload - Exactly what `CreateResourceDto` declares.
 * @returns The created resource.
 * @throws ApiError with code `VALIDATION_FAILED` for a bad payload, `FORBIDDEN` when the teacher does not teach the course.
 */
export async function createResource(payload: CreateResourcePayload): Promise<Resource> {
  return api.post<Resource>("/resources", payload);
}

/**
 * Changes a resource.
 *
 * @param id - The resource id.
 * @param payload - The fields to change (`UpdateResourceDto`).
 * @returns The updated resource.
 * @throws ApiError with code `FORBIDDEN` when the teacher neither uploaded it nor teaches its course.
 */
export async function updateResource(id: string, payload: UpdateResourcePayload): Promise<Resource> {
  return api.put<Resource>(`/resources/${id}`, payload);
}

/**
 * Deletes a resource.
 *
 * @param id - The resource id.
 * @returns The deleted resource, as the API echoes it.
 * @throws ApiError with code `FORBIDDEN` when the teacher neither uploaded it nor teaches its course.
 */
export async function removeResource(id: string): Promise<Resource> {
  return api.delete<Resource>(`/resources/${id}`);
}
