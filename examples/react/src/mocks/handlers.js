// src/mocks/handlers.js
import { HttpResponse, http } from 'msw'
import { mock } from './mockData'
import API from "../api";

export const handlers = [
  http.get(API.url + "/products", () => {
    return HttpResponse.json(mock.products, { headers: { 'ignore-me': 'please' } })
  }),
  http.get(API.url + "/product/09", () => {
    return HttpResponse.json(mock.product, { headers: { 'ignore-me': 'please' } })
  })
]