import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "spectre.css/dist/spectre.min.css";
import "spectre.css/dist/spectre-icons.min.css";
import "spectre.css/dist/spectre-exp.min.css";
import PropTypes from "prop-types";
import API from "./api.js";
import Heading from "./Heading.js";
import Layout from "./Layout.js";

const productPropTypes = {
	product: PropTypes.shape({
		id: PropTypes.string.isRequired,
		name: PropTypes.string.isRequired,
		type: PropTypes.string.isRequired,
	}).isRequired,
};

function ProductTableRow(props) {
	return (
		<tr>
			<td>{props.product.name}</td>
			<td>{props.product.type}</td>
			<td>
				<Link
					class="btn btn-link"
					to={`/products/${props.product.id}`}
					state={{ product: props.product }}
				>
					See more!
				</Link>
			</td>
		</tr>
	);
}
ProductTableRow.propTypes = productPropTypes;

function ProductTable(props) {
	const products = props.products.map((p) => (
		<ProductTableRow key={p.id} product={p} />
	));
	return (
		<table class="table table-striped table-hover">
			<thead>
				<tr>
					<th>Name</th>
					<th>Type</th>
					<th />
				</tr>
			</thead>
			<tbody>{products}</tbody>
		</table>
	);
}

ProductTable.propTypes = {
	products: PropTypes.arrayOf(productPropTypes.product),
};

function App() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [searchText, setSearchText] = useState("");
	const [products, setProducts] = useState([]);

	useEffect(() => {
		API.getAllProducts()
			.then((r) => {
				setLoading(false);
				setProducts(r);
			})
			.catch((e) => {
				navigate("/error", { state: { error: e.toString() } });
			});
	}, [navigate]);

	const visibleProducts = searchText
		? products.filter(
				(p) =>
					p.id.toLowerCase().includes(searchText.toLowerCase()) ||
					p.name.toLowerCase().includes(searchText.toLowerCase()) ||
					p.type.toLowerCase().includes(searchText.toLowerCase()),
			)
		: products;

	return (
		<Layout>
			<Heading text="Products" href="/" />
			<div class="form-group col-2">
				<label class="form-label" for="input-product-search">
					Search
				</label>
				<input
					id="input-product-search"
					class="form-input"
					type="text"
					value={searchText}
					onChange={(e) => setSearchText(e.target.value)}
				/>
			</div>
			<div>
				{loading ? (
					<div class="loading loading-lg centered" />
				) : (
					<ProductTable products={visibleProducts} />
				)}
			</div>
		</Layout>
	);
}

export default App;
