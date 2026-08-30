import { writable } from 'svelte/store';
import { api } from './api';
import { defaultHomeContent, type HomeContent } from './home-content';

export const cmsContent = writable<HomeContent>(structuredClone(defaultHomeContent));
let request:Promise<void>|null=null;
export function loadCmsContent(force=false){
  if(request&&!force)return request;
  request=api<{content:HomeContent}>('/content/home').then(result=>cmsContent.set(result.content)).catch(()=>undefined);
  return request;
}
