import React from "react";
import "spectre.css/dist/spectre.min.css";
import "spectre.css/dist/spectre-icons.min.css";
import "spectre.css/dist/spectre-exp.min.css";
import { useLocation } from "react-router-dom";
import Heading from "./Heading.js";
import Layout from "./Layout.js";

function ErrorPage() {
	const location = useLocation();
	return (
		<Layout>
			<Heading text="Sad times :(" href="/" />
			<div class="columns">
				<img
					class="column col-6"
					style={{
						height: "100%",
					}}
					src="./sad_panda.gif"
					alt="sad_panda"
				/>
				<pre
					class="code column col-6"
					style={{
						wordWrap: "break-word",
					}}
				>
					<code>{location.state?.error ?? ""}</code>
				</pre>
			</div>
		</Layout>
	);
}

export default ErrorPage;
