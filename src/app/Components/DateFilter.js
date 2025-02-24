import React from "react";
import { ButtonGroup } from "react-bootstrap";

const DateFilter = ({ date_filter, active_date, handleDateFilterClicked }) => {
  return (
    <ButtonGroup style={{ width: "fit-content" }}>
      {date_filter.map((filter, index) => (
        <button
          className={date_filter[active_date] === filter 
            ? "date-filter-btn filter-active fw-bold" 
            : "date-filter-btn border-0 fw-light"}
          onClick={() => handleDateFilterClicked(filter)}
          key={index}
          style={{
            borderTopLeftRadius: index === 0 ? "0.5rem" : "0",
            borderBottomLeftRadius: index === 0 ? "0.5rem" : "0",
            borderTopRightRadius: index === (date_filter.length - 1) ? "0.5rem" : "0",
            borderBottomRightRadius: index === (date_filter.length - 1) ? "0.5rem" : "0"
          }}
        >
          {filter}
        </button>
      ))}
    </ButtonGroup>
  );
};

export default DateFilter;