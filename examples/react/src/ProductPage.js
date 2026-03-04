import React, { useEffect, useState } from "react";
import "spectre.css/dist/spectre.min.css";
import "spectre.css/dist/spectre-icons.min.css";
import "spectre.css/dist/spectre-exp.min.css";
import { useNavigate, useParams } from "react-router-dom";
import API from "./api.js";
import Heading from "./Heading.js";
import Layout from "./Layout.js";

function ProductPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [product, setProduct] = useState({ id });

	useEffect(() => {
		API.getProduct(id)
			.then((r) => {
				setLoading(false);
				setProduct(r);
			})
			.catch((e) => {
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
					class="loading loading-lg"
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
