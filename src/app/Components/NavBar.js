import { useEffect, useState } from "react";
import Nav from "react-bootstrap/Nav";
import "./NavBar.css";

function NavBar({ activeTab = '' }) {
  const [filters, setFilters] = useState([
    "Overview",
    "Songs",
    "Artists",
    "Albums",
  ]);

  return (
    <Nav
      className="justify-content-center fs-4 navbar-blur m-auto"
      variant="pills"
      activeKey={`/${activeTab}`}
      style={{ 
        width: "fit-content"
      }}
    >
      {filters &&
        filters.map((item, index) => {
          return index === 0 ? (
            <Nav.Item className="pe-3" key={index}>
              <Nav.Link href="/">{item}</Nav.Link>
            </Nav.Item>
          ) : index === filters.length - 1 ? (
            <Nav.Item className="ps-3" key={index}>
              <Nav.Link href={`/${item.toLowerCase()}`}>{item}</Nav.Link>
            </Nav.Item>
          ) : (
            <Nav.Item className="px-3" key={index}>
              <Nav.Link href={`/${item.toLowerCase()}`}>{item}</Nav.Link>
            </Nav.Item>
          );
        })}
    </Nav>
  );
}

export default NavBar;