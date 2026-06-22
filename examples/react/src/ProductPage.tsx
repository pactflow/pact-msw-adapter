import { useEffect, useState } from "react";
import "spectre.css/dist/spectre.min.css";
import "spectre.css/dist/spectre-icons.min.css";
import "spectre.css/dist/spectre-exp.min.css";
import { useNavigate, useParams } from "react-router-dom";
import API from "./api.ts";
import Heading from "./Heading.tsx";
import Layout from "./Layout.tsx";
import type { Product } from "./mocks/mockData.ts";

function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Partial<Product>>({ id });

  useEffect(() => {
    API.getProduct(id ?? "")
      .then((r) => {
        setLoading(false);
        setProduct(r as Product);
      })
      .catch((e: Error) => {
        navigate("/error", { state: { error: e.toString() } });
      });
  }, [id, navigate]);

  return (
    <Layout>
      <Heading text="Products" href="/" />
      {loading ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="loading loading-lg"
        />
      ) : (
        <div>
          <p>ID: {product.id}</p>
          <p>Name: {product.name}</p>
          <p>Type: {product.type}</p>
        </div>
      )}
    </Layout>
  );
}

export default ProductPage;
