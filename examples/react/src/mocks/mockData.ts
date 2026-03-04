export interface Product {
	id: string;
	type: string;
	name: string;
}

const products: Product[] = [
	{
		id: "09",
		type: "CREDIT_CARD",
		name: "Gem Visa",
	},
];

const product: Product = {
	id: "09",
	type: "CREDIT_CARD",
	name: "Gem Visa",
};

export const mock = { products, product };
