import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    {
        path: '/', label: 'Dashboard', icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
        )
    },
    {
        path: '/chat', label: 'Command Center', icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )
    },
    {
        path: '/sentiment', label: 'Sentiment Health', icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.28 3.6-1.28 5.14 0 1.55 1.28 1.55 3.36 0 4.64-1.54 1.28-3.65 1.28-5.14 0-1.49-1.28-1.55-3.36 0-4.64C20.5 12.72 22.5 12.72 24 14" /><path d="M1 14c1.49-1.28 3.6-1.28 5.14 0 1.55 1.28 1.55 3.36 0 4.64-1.55 1.28-3.6 1.28-5.14 0-1.49-1.28-1.55-3.36 0-4.64C2.5 12.72 4.6 12.72 6 14" /><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" /></svg>
        )
    },
    {
        path: '/predictor', label: 'Post Predictor', icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
        )
    },

];

export default function Sidebar({ isOpen, toggle }) {
    const location = useLocation();

    return (
        <div className={`fixed left-0 top-0 h-full bg-navy text-white transition-all duration-300 ease-in-out z-20 flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
            {/* Header / Logo */}
            <div className="h-16 relative flex items-center justify-center px-6 border-b border-navy-light">
                {isOpen ? (
                    <>
                        {/* Logo - Left Aligned */}
                        <div className="absolute left-6 transition-all duration-300">
                            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
                                <span className="text-xl font-bold">A</span>
                            </div>
                        </div>

                        {/* Title - Centered */}
                        <span className="text-lg font-bold tracking-tight">ARTH AI</span>
                    </>
                ) : (
                    <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center mx-auto">
                        <span className="text-xl font-bold">A</span>
                    </div>
                )}

                {isOpen && (
                    <button onClick={toggle} className="absolute right-6 text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
                    </button>
                )}
            </div>

            {!isOpen && (
                <button onClick={toggle} className="mt-4 mx-auto text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 17 5-5-5-5" /><path d="m6 17 5-5-5-5" /></svg>
                </button>
            )}

            {/* Navigation */}
            <nav className="mt-8 flex-1 px-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-brand text-white shadow-lg shadow-brand/20'
                                : 'text-gray-400 hover:text-white hover:bg-navy-light'
                                } ${!isOpen ? 'justify-center px-2' : ''}`}
                        >
                            <span className={`${isActive ? 'text-white' : 'text-current'}`}>{item.icon}</span>
                            {isOpen && <span className="font-medium">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Platform Stats (Mini) */}
            <div className={`p-4 border-t border-navy-light ${!isOpen ? 'hidden' : ''}`}>
                <div className="text-xs text-gray-500 font-semibold uppercase mb-4 tracking-wider">Connected Platforms</div>
                <div className="space-y-3">
                    {['Instagram', 'Facebook', 'Twitter', 'LinkedIn'].map(p => (
                        <div key={p} className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{p}</span>
                            <span className="w-2 h-2 rounded-full bg-success-400"></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
