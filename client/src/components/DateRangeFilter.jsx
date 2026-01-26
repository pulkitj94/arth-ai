import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

const DateRangeFilter = ({ onChange, selectedRange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setShowDatePicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const options = [
        { label: 'Last 7 Days', value: '7' },
        { label: 'Last 30 Days', value: '30' },
        { label: 'Last 90 Days', value: '90' },
        { label: 'All Time', value: 'all' },
        { label: 'Custom Duration', value: 'custom' }
    ];

    const handleSelect = (value) => {
        if (value === 'custom') {
            setShowDatePicker(true);
            return;
        }

        onChange({ range: value });
        setIsOpen(false);
        setShowDatePicker(false);
    };

    const handleDateChange = (dates) => {
        const [start, end] = dates;
        setStartDate(start);
        setEndDate(end);
    };

    const handleApply = () => {
        if (startDate && endDate) {
            onChange({ range: 'custom', startDate, endDate });
            setIsOpen(false);
            setShowDatePicker(false);
        }
    };

    const handleBack = () => {
        setShowDatePicker(false);
    };

    const getLabel = () => {
        if (selectedRange === 'custom' && startDate && endDate) {
            return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
        }
        const opt = options.find(o => o.value === selectedRange);
        return opt ? opt.label : 'Last 30 Days';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between min-w-[160px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
            >
                <span>{getLabel()}</span>
                <svg className="h-4 w-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className={`absolute right-0 mt-2 bg-white rounded-lg shadow-xl z-50 border border-gray-100 overflow-hidden animation-fade-in-up ${showDatePicker ? 'w-80' : 'w-56'}`}>
                    {!showDatePicker ? (
                        <div className="py-1">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className={`block w-full text-left px-4 py-2 text-sm ${selectedRange === opt.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={handleBack}
                                    className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Duration</h3>
                                <div className="w-6"></div> {/* Spacer */}
                            </div>

                            <div className="flex justify-center mb-4">
                                <DatePicker
                                    selected={startDate}
                                    onChange={handleDateChange}
                                    startDate={startDate}
                                    endDate={endDate}
                                    selectsRange
                                    inline
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={!startDate || !endDate}
                                    className={`px-3 py-1.5 text-xs font-medium rounded text-white ${startDate && endDate ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-300 cursor-not-allowed'}`}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
