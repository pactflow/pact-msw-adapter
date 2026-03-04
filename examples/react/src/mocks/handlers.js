// src/mocks/handlers.js
import { HttpResponse, http } from "msw";
import API from "../api.js";
import { mock } from "./mockData.js";

export const handlers = [
	http.get(`${API.url}/products`, () =>
		HttpResponse.json(mock.products, { headers: { "ignore-me": "please" } }),
	),
	http.get(`${API.url}/product/09`, () =>
		HttpResponse.json(mock.product, { headers: { "ignore-me": "please" } }),
	),
];
