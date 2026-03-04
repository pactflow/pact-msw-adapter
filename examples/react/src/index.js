import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.js";
import ErrorPage from "./ErrorPage.js";
import ProductPage from "./ProductPage.js";

async function enableMocking() {
	if (!import.meta.env.DEV) return;
	const { worker } = await import("./mocks/browser.js");
	return worker.start();
}

enableMocking().then(() => {
	createRoot(document.getElementById("root")).render(
		<Router>
			<div>
				<Routes>
					<Route path="/error" element={<ErrorPage />} />
					<Route path="/products/:id" element={<ProductPage />} />
					<Route path="/" element={<App />} />
				</Routes>
			</div>
		</Router>,
	);
});
