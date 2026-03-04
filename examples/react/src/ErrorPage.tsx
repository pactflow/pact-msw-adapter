import "spectre.css/dist/spectre.min.css";
import "spectre.css/dist/spectre-icons.min.css";
import "spectre.css/dist/spectre-exp.min.css";
import { useLocation } from "react-router-dom";
import Heading from "./Heading.tsx";
import Layout from "./Layout.tsx";

function ErrorPage() {
	const location = useLocation();
	return (
		<Layout>
			<Heading text="Sad times :(" href="/" />
			<div className="columns">
				<img
					className="column col-6"
					style={{
						height: "100%",
					}}
					src="./sad_panda.gif"
					alt="sad_panda"
				/>
				<pre
					className="code column col-6"
					style={{
						wordWrap: "break-word",
					}}
				>
					<code>{(location.state as { error?: string } | null)?.error ?? ""}</code>
				</pre>
			</div>
		</Layout>
	);
}

export default ErrorPage;
