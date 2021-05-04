import API from "../examples/react/src/api";
import "./setupMswFromPact";

describe("API - With MSW mock generated from pact", () => {
  test("get all products", async () => {
    const products = [
      {
        id: "09",
        type: "CREDIT_CARD",
        name: "Gem Visa",
      },
    ];
    const respProducts = await API.getAllProducts();
    expect(respProducts).toEqual(products);
  });

  test("get product ID 10", async () => {
    const product = {
      id: "10",
      type: "CREDIT_CARD",
      name: "28 Degrees",
    };
    const respProduct = await API.getProduct("10");
    expect(respProduct).toEqual(product);
  });
});
