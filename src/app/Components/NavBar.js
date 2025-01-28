import { useEffect, useState } from "react";
import Nav from "react-bootstrap/Nav";
import "./NavBar.css";

function NavBar({ activeTab = '' }) {
  const [filters, setFilters] = useState([
    "Recently played",
    "Songs",
    "Artists",
    "Albums",
  ]);

  return (
    <Nav
      className="justify-content-center fs-4 navbar-blur w-50 mx-auto pt-3"
      variant="pills"
      activeKey={`/${activeTab}`}
    >
      {filters &&
        filters.map((item, index) => {
          return index === 0 ? (
            <Nav.Item className="px-3" key={index}>
              <Nav.Link href="/">{item}</Nav.Link>
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