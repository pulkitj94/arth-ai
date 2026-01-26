import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export function FilterProvider({ children }) {
    const [currentFilter, setCurrentFilter] = useState({ range: 'all', startDate: null, endDate: null });

    return (
        <FilterContext.Provider value={{ currentFilter, setCurrentFilter }}>
            {children}
        </FilterContext.Provider>
    );
}

export function useFilter() {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilter must be used within a FilterProvider');
    }
    return context;
}
