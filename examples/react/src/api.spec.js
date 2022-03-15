import API from "./api";
import { mock } from './mocks/mockData'

describe("API", () => {
  test("get all products", async () => {
    const respProducts = await API.getAllProducts();
    expect(respProducts).toEqual(mock.products);
  });

  test("get product ID 09", async () => {
    const respProduct = await API.getProduct("09");
    expect(respProduct).toEqual(mock.product);
  });
});
