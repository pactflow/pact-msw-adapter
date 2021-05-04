import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import "./consumer/index.css";
import App from "./consumer/App";
import ProductPage from "./consumer/ProductPage";
import ErrorPage from "./consumer/ErrorPage";

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
