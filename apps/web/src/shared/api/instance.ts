import { ofetch } from 'ofetch';
import { API_BASE_URL } from '../config/app';

export const api = ofetch.create({
  baseURL: API_BASE_URL, // import.meta.env.VITE_API_URL,
  // mode: 'cors'
});
