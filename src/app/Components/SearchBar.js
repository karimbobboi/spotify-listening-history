import React from "react";
import styles from "/src/app/page.module.css";
import { useEffect, useState, useCallback } from "react";

const SearchBar = ({searchTerm, setSearchTerm}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Update parent's searchTerm with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, setSearchTerm]);

  const handleSearchOnBlur = () => {
    if (localSearchTerm.length === 0) {
      setIsSearchOpen(false);
    }
  };

  const handleSearchBtnClicked = () => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      setLocalSearchTerm("");
      setSearchTerm("");
    }
  };

  const handleCancelClicked = () => {
    setLocalSearchTerm("");
    setSearchTerm("");
    setIsSearchOpen(false);
  };

  return (
    <div className={`search-container pe-3 ps-3 rounded ${isSearchOpen ? "expanded" : ""}`}
      style={{ 
        fontSize: "0.9rem",
        width: isSearchOpen ? "17rem" : "3rem",
        backgroundColor: isSearchOpen ? "rgba(0, 0, 0, 0.3)" : "transparent",
        transition: "all 0.2s ease-in-out"
      }}
    >
      <button 
        className="search-icon border-0 bg-transparent" 
        onClick={handleSearchBtnClicked}
      >
        <i className="bi bi-search text-light"></i>
      </button>
      {isSearchOpen && (
        <>
          <input autoFocus
            type="text"
            className="search-input form-control bg-transparent border-0 py-1 pe-0 w-100 text-light"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            onBlur={handleSearchOnBlur}
            style={{
              outline: "none",
              boxShadow: "none",
            }}
          />
          <button 
            className="border-0 bg-transparent text-light py-0 ps-2" 
            onClick={handleCancelClicked}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </>
      )}
    </div>
  );
};

export default SearchBar;