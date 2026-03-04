// src/mocks/handlers.ts
import { HttpResponse, http } from "msw";
import API from "../api.ts";
import { mock } from "./mockData.ts";

export const handlers = [
	http.get(`${API.url}/products`, () =>
		HttpResponse.json(mock.products, { headers: { "ignore-me": "please" } }),
	),
	http.get(`${API.url}/product/09`, () =>
		HttpResponse.json(mock.product, { headers: { "ignore-me": "please" } }),
	),
];
