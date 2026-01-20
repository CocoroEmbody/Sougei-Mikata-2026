import type { UserRequest, ResourceAssignment } from '../types';

const STORAGE_KEY_REQUESTS = 'route_optimizer_requests';
const STORAGE_KEY_RESOURCES = 'route_optimizer_resources';

export function saveRequests(requests: UserRequest[]): void {
  localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
}

export function loadRequests(): UserRequest[] {
  const data = localStorage.getItem(STORAGE_KEY_REQUESTS);
  return data ? JSON.parse(data) : [];
}

export function saveResources(assignments: ResourceAssignment[]): void {
  localStorage.setItem(STORAGE_KEY_RESOURCES, JSON.stringify(assignments));
}

export function loadResources(): ResourceAssignment[] {
  const data = localStorage.getItem(STORAGE_KEY_RESOURCES);
  return data ? JSON.parse(data) : [];
}
