/// <reference types="vite/client" />
import axios from "axios";

export class API {
	url: string;

	constructor(url?: string) {
		const resolved = url || import.meta.env.REACT_APP_API_BASE_URL || "";
		this.url = resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
	}

	withPath(path: string): string {
		return `${this.url}${path.startsWith("/") ? path : `/${path}`}`;
	}

	generateAuthToken(): string {
		return `Bearer ${new Date().toISOString()}`;
	}

	getAllProducts(): Promise<unknown[]> {
		return axios
			.get(this.withPath("/products"), {
				headers: {
					Authorization: this.generateAuthToken(),
				},
			})
			.then((r) => r.data as unknown[]);
	}

	async getProduct(id: string, params?: unknown): Promise<unknown> {
		try {
			return await axios
				.get(this.withPath(`/product/${id}`), {
					params,
					headers: {
						Authorization: this.generateAuthToken(),
					},
				})
				.then((r) => r.data);
		} catch (error) {
			const e = error as { errors?: unknown[] };
			if (e.errors && e.errors.length > 0) {
				return Promise.reject(new Error(String(e.errors)));
			}
			return Promise.reject(new Error(String(error)));
		}
	}

	postProduct(id: string, productData: unknown): Promise<unknown> {
		return axios
			.post(this.withPath(`/product/${id}`), productData, {
				headers: {
					Authorization: this.generateAuthToken(),
				},
			})
			.then((r) => r.data);
	}

	getUser(params?: unknown): Promise<unknown> {
		return axios
			.get(this.withPath("/user"), {
				params,
				headers: {
					Authorization: this.generateAuthToken(),
				},
			})
			.then((r) => r.data);
	}
}

// biome-ignore lint/style/noDefaultExport: module-level singleton is the intended API
export default new API(import.meta.env.REACT_APP_API_BASE_URL);
