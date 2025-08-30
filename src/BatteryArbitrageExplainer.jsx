import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BatteryArbitrageExplainer = () => {
  const [hourlyData, setHourlyData] = useState([]);
  const [chargingHours, setChargingHours] = useState([]);
  const [dischargingHours, setDischargingHours] = useState([]);
  const [netRevenue, setNetRevenue] = useState(0);

  const BATTERY_CAPACITY = 4; // MWh
  const BATTERY_POWER = 1; // MW
  const CHARGING_EFFICIENCY = 0.8;

  useEffect(() => {
    generatePrices();
  }, []);

  const generatePrices = () => {
    const newPrices = Array(24).fill(0).map((_, i) => {
      let price;
      if ((i >= 1 && i <= 5) || (i >= 9 && i <= 16)) {
        price = Math.floor(Math.random() * 30) + 20; // 20-50
      } else if ((i >= 7 && i <= 8) || (i >= 18 && i <= 21)) {
        price = Math.floor(Math.random() * 50) + 70; // 70-120
      } else {
        price = Math.floor(Math.random() * 40) + 40; // 40-80
      }
      return { hour: i, price };
    });

    const sortedPrices = [...newPrices].sort((a, b) => a.price - b.price);
    const lowestPrices = sortedPrices.slice(0, 5);
    const highestPrices = sortedPrices.slice(-4);

    const chargingHrs = lowestPrices.map(h => h.hour);
    const dischargingHrs = highestPrices.map(h => h.hour);

    setChargingHours(chargingHrs);
    setDischargingHours(dischargingHrs);

    let currentSoC = 0;
    const data = newPrices.map(({ hour, price }) => {
      let chargeDischargePower = 0;
      if (chargingHrs.includes(hour)) {
        chargeDischargePower = -BATTERY_POWER; // Full 1 MW charging (negative)
        currentSoC = Math.min(BATTERY_CAPACITY, currentSoC + BATTERY_POWER * CHARGING_EFFICIENCY);
      } else if (dischargingHrs.includes(hour)) {
        const maxDischarge = Math.min(BATTERY_POWER, currentSoC);
        chargeDischargePower = maxDischarge; // Discharging (positive)
        currentSoC = Math.max(0, currentSoC - maxDischarge);
      }
      return {
        hour,
        price,
        soc: (currentSoC / BATTERY_CAPACITY) * 100,
        chargeDischargePower
      };
    });

    setHourlyData(data);

    const totalChargingCost = chargingHrs.reduce((sum, hour) => sum + newPrices[hour].price * BATTERY_POWER, 0);
    const totalDischargingRevenue = dischargingHrs.reduce((sum, hour) => sum + newPrices[hour].price * BATTERY_POWER * CHARGING_EFFICIENCY, 0);
    setNetRevenue((totalDischargingRevenue - totalChargingCost).toFixed(2));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Battery Arbitrage Bidding Explainer</h2>
      
      <div className="flex justify-between items-center mb-6">
        <p className="text-lg">Simulate battery arbitrage in day-ahead markets</p>
        <button 
          onClick={generatePrices} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Generate New Prices
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="h-80">
          <h3 className="text-lg font-semibold mb-2">Price & State of Charge</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyData}>
              <XAxis 
                dataKey="hour" 
                label={{ value: 'Hour', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                yAxisId="left" 
                label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 100]}
                label={{ value: 'SoC (%)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip />
              <Legend />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="price" 
                stroke="#8884d8" 
                name="Hourly Price" 
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="soc" 
                stroke="#82ca9d" 
                name="State of Charge %" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="h-80">
          <h3 className="text-lg font-semibold mb-2">Charge/Discharge Schedule</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <XAxis 
                dataKey="hour" 
                label={{ value: 'Hour', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Charge/Discharge (MW)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="chargeDischargePower" 
                fill="#ffc658" 
                name="Charge/Discharge (MW)" 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <p><strong>Charging Hours:</strong> {chargingHours.join(', ') || 'N/A'}</p>
          <p><strong>Discharging Hours:</strong> {dischargingHours.join(', ') || 'N/A'}</p>
          <p><strong>Net Revenue:</strong> ${netRevenue}</p>
          <p><strong>Final State of Charge:</strong> {hourlyData[23]?.soc?.toFixed(1) || 0}%</p>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">System Specifications</h3>
          <p><strong>Battery Capacity:</strong> 4 MWh</p>
          <p><strong>Power Rating:</strong> 1 MW</p>
          <p><strong>Charging Efficiency:</strong> 80%</p>
          <p><strong>Price Pattern:</strong> Low prices in hours 1-5 & 9-16, high prices in hours 7-8 & 18-21</p>
        </div>
      </div>
    </div>
  );
};

export default BatteryArbitrageExplainer;