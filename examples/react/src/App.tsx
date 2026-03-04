import { useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "spectre.css/dist/spectre.min.css";
import "spectre.css/dist/spectre-icons.min.css";
import "spectre.css/dist/spectre-exp.min.css";
import API from "./api.ts";
import Heading from "./Heading.tsx";
import Layout from "./Layout.tsx";
import type { Product } from "./mocks/mockData.ts";

interface ProductTableRowProps {
	product: Product;
}

function ProductTableRow({ product }: ProductTableRowProps) {
	return (
		<tr>
			<td>{product.name}</td>
			<td>{product.type}</td>
			<td>
				<Link
					className="btn btn-link"
					to={`/products/${product.id}`}
					state={{ product }}
				>
					See more!
				</Link>
			</td>
		</tr>
	);
}

interface ProductTableProps {
	products: Product[];
}

function ProductTable({ products }: ProductTableProps) {
	const rows = products.map((p) => <ProductTableRow key={p.id} product={p} />);
	return (
		<table className="table table-striped table-hover">
			<thead>
				<tr>
					<th>Name</th>
					<th>Type</th>
					<th />
				</tr>
			</thead>
			<tbody>{rows}</tbody>
		</table>
	);
}

function App() {
	const navigate = useNavigate();
	const searchInputId = useId();
	const [loading, setLoading] = useState(true);
	const [searchText, setSearchText] = useState("");
	const [products, setProducts] = useState<Product[]>([]);

	useEffect(() => {
		API.getAllProducts()
			.then((r) => {
				setLoading(false);
				setProducts(r as Product[]);
			})
			.catch((e: Error) => {
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
			<div className="form-group col-2">
				<label className="form-label" htmlFor="input-product-search">
					Search
				</label>
				<input
					id="input-product-search"
					className="form-input"
					type="text"
					value={searchText}
					onChange={(e) => setSearchText(e.target.value)}
				/>
			</div>
			<div>
				{loading ? (
					<div className="loading loading-lg centered" />
				) : (
					<ProductTable products={visibleProducts} />
				)}
			</div>
		</Layout>
	);
}

export default App;
