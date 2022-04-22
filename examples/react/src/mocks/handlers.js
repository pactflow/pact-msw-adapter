// src/mocks/handlers.js
import { rest } from 'msw'
import { mock } from './mockData'
import API from "../api";

export const handlers = [
    rest.get(API.url + "/products", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(mock.products), ctx.set('ignore-me', 'please'));
      }),
      rest.get(API.url + "/product/09", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(mock.product), ctx.set('ignore-me', 'please'));
      })
]