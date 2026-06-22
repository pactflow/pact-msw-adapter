import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="container">
      <div className="columns">
        <div className="column col-8 col-mx-auto">{children}</div>
      </div>
    </div>
  );
}

export default Layout;
