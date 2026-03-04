import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import ErrorPage from "./ErrorPage.tsx";
import ProductPage from "./ProductPage.tsx";

async function enableMocking() {
	if (!import.meta.env.DEV) return;
	const { worker } = await import("./mocks/browser.ts");
	return worker.start();
}

enableMocking().then(() => {
	const rootEl = document.getElementById("root");
	if (!rootEl) throw new Error("Root element not found");
	createRoot(rootEl).render(
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
