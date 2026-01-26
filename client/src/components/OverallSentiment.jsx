import React from 'react';
import GaugeChart from 'react-gauge-chart';

const OverallSentiment = ({ score = 0 }) => {
    // Normalize score to 0-1 for the gauge
    const percent = score / 100;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h3 className="text-lg font-bold text-navy">Sentiment Health</h3>
                    <p className="text-sm text-gray-500">Cumulative Brand Score</p>
                </div>
                <button className="text-gray-400 hover:text-navy">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-full max-w-[300px] -mb-4">
                    <GaugeChart
                        id="overall-sentiment-gauge"
                        nrOfLevels={3}
                        colors={["#EF4444", "#F59E0B", "#10B981"]}
                        arcWidth={0.3}
                        percent={percent}
                        hideText={true}
                    />
                </div>
                <div className="text-center pb-4">
                    <span className="text-5xl font-bold text-navy">
                        {score}%
                    </span>
                </div>

                <div className="mt-2 text-center">
                    <p className="text-xl font-bold text-gray-700">
                        Your brand health is <span className={score >= 70 ? "text-green-600 font-extrabold" : score >= 40 ? "text-yellow-600 font-extrabold" : "text-red-600 font-extrabold"}>
                            {score >= 70 ? "Strong" : score >= 40 ? "Moderate" : "Critical"}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OverallSentiment;
