import PropTypes from "prop-types";

function Layout(props) {
	return (
		<div class="container">
			<div class="columns">
				<div class="column col-8 col-mx-auto">{props.children}</div>
			</div>
		</div>
	);
}

Layout.propTypes = {
	children: PropTypes.array.isRequired,
};

export default Layout;
