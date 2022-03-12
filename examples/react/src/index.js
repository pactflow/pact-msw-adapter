import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import "./index.css";
import App from "./App";
import ProductPage from "./ProductPage";
import ErrorPage from "./ErrorPage";

if (process.env.NODE_ENV === 'development') {
  const { worker } = require('./mocks/browser')
  worker.start()
}

const routing = (
  <Router>
    <div>
      <Switch>
        <Route path='/error'>
          <ErrorPage />
        </Route>
        <Route path='/products/:id'>
          <ProductPage />
        </Route>
        <Route path='/'>
          <App />
        </Route>
      </Switch>
    </div>
  </Router>
);

ReactDOM.render(routing, document.getElementById("root"));
