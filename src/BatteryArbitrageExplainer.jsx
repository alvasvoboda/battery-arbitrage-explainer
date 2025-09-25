import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BatteryArbitrageExplainer = () => {
  const [hourlyData, setHourlyData] = useState([]);
  const [chargingHours, setChargingHours] = useState([]);
  const [dischargingHours, setDischargingHours] = useState([]);
  const [netRevenue, setNetRevenue] = useState(0);
  const [csvData, setCsvData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [chargingEfficiency, setChargingEfficiency] = useState(85);
  const [chargingCosts, setChargingCosts] = useState([]);
  const [dischargingRevenues, setDischargingRevenues] = useState([]);
  const [totalChargingCost, setTotalChargingCost] = useState(0);
  const [totalDischargingRevenue, setTotalDischargingRevenue] = useState(0);

  const BATTERY_CAPACITY = 4; // MWh
  const BATTERY_POWER = 1; // MW

  useEffect(() => {
    generatePrices();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        parseCsvData(text);
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const parseCsvData = (csvText) => {
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Look for common column names for hour and price
      const hourIndex = headers.findIndex(h => 
        h.includes('hour') || h.includes('time') || h.includes('period')
      );
      const priceIndex = headers.findIndex(h => 
        h.includes('price') || h.includes('cost') || h.includes('rate') || h.includes('$/mwh')
      );
      
      if (hourIndex === -1 || priceIndex === -1) {
        alert('CSV must contain columns for hour/time and price. Common names: hour, time, period, price, cost, rate, $/MWh');
        return;
      }
      
      const prices = [];
      for (let i = 1; i < lines.length && i <= 24; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= Math.max(hourIndex, priceIndex) + 1) {
          const hour = parseInt(values[hourIndex]);
          const price = parseFloat(values[priceIndex]);
          
          if (!isNaN(hour) && !isNaN(price) && hour >= 0 && hour <= 23) {
            prices.push({ hour, price });
          }
        }
      }
      
      if (prices.length < 24) {
        alert(`CSV should contain 24 hours of data. Found ${prices.length} valid entries.`);
        return;
      }
      
      // Sort by hour to ensure proper order
      prices.sort((a, b) => a.hour - b.hour);
      
      // Fill in any missing hours with interpolated values
      const completePrices = Array(24).fill(0).map((_, hour) => {
        const found = prices.find(p => p.hour === hour);
        return found || { hour, price: 50 }; // Default price if missing
      });
      
      setCsvData(completePrices);
      calculateArbitrage(completePrices);
    } catch (error) {
      alert('Error parsing CSV file. Please check the format.');
      console.error('CSV parsing error:', error);
    }
  };

  const useCsvData = () => {
    if (csvData) {
      calculateArbitrage(csvData);
    }
  };

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

    setCsvData(null);
    setFileName('');
    calculateArbitrage(newPrices);
  };

  const calculateArbitrage = (priceData) => {
    const sortedPrices = [...priceData].sort((a, b) => a.price - b.price);
    
    // Start with 5 cheapest hours for charging and 4 most expensive for discharging
    let chargingHours = sortedPrices.slice(0, 5);
    let dischargingHours = sortedPrices.slice(-4);
    
    console.log('All prices sorted:', sortedPrices.map(h => `Hour ${h.hour}: $${h.price.toFixed(2)}`));
    console.log('Initial charging hours (5 cheapest):', chargingHours.map(h => `Hour ${h.hour}: $${h.price.toFixed(2)}`));
    console.log('Initial discharging hours (4 most expensive):', dischargingHours.map(h => `Hour ${h.hour}: $${h.price.toFixed(2)}`));
    
    // Remove unprofitable pairs
    while (chargingHours.length > 0 && dischargingHours.length > 0) {
      // Find highest cost among charging hours
      const maxChargingPrice = Math.max(...chargingHours.map(h => h.price));
      const highestChargingHour = chargingHours.find(h => h.price === maxChargingPrice);
      
      // Find lowest value among discharging hours
      const minDischargingPrice = Math.min(...dischargingHours.map(h => h.price));
      const lowestDischargingHour = dischargingHours.find(h => h.price === minDischargingPrice);
      
      // Check if this pair is profitable
      const chargingCost = maxChargingPrice;
      const dischargingValue = minDischargingPrice * (chargingEfficiency / 100);
      
      console.log(`Comparing: Charge Hour ${highestChargingHour.hour} ($${chargingCost.toFixed(2)}) vs Discharge Hour ${lowestDischargingHour.hour} ($${dischargingValue.toFixed(2)})`);
      
      if (chargingCost > dischargingValue) {
        console.log(`Removing unprofitable pair: Hour ${highestChargingHour.hour} and Hour ${lowestDischargingHour.hour}`);
        // Remove the unprofitable pair
        chargingHours = chargingHours.filter(h => h.hour !== highestChargingHour.hour);
        dischargingHours = dischargingHours.filter(h => h.hour !== lowestDischargingHour.hour);
      } else {
        console.log('All remaining pairs are profitable');
        // All remaining pairs are profitable
        break;
      }
    }
    
    console.log('Final charging hours:', chargingHours.map(h => `Hour ${h.hour}: $${h.price}`));
    console.log('Final discharging hours:', dischargingHours.map(h => `Hour ${h.hour}: $${h.price}`));
    
    const chargingHrs = chargingHours.map(h => h.hour);
    const dischargingHrs = dischargingHours.map(h => h.hour);
    
    setChargingHours(chargingHrs);
    setDischargingHours(dischargingHrs);

    let currentSoC = 0;
    const data = priceData.map(({ hour, price }) => {
      let chargeDischargePower = 0;
      if (chargingHrs.includes(hour)) {
        chargeDischargePower = -BATTERY_POWER; // Full 1 MW charging (negative)
        currentSoC = Math.min(BATTERY_CAPACITY, currentSoC + BATTERY_POWER * (chargingEfficiency / 100));
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

    // Calculate detailed costs and revenues
    const chargingCostDetails = chargingHrs.map(hour => ({
      hour,
      price: priceData[hour].price,
      cost: priceData[hour].price * BATTERY_POWER
    }));
    
    const dischargingRevenueDetails = dischargingHrs.map(hour => ({
      hour,
      price: priceData[hour].price,
      revenue: priceData[hour].price * BATTERY_POWER
    }));
    
    const totalChargingCostCalc = chargingCostDetails.reduce((sum, item) => sum + item.cost, 0);
    const totalDischargingRevenueCalc = dischargingRevenueDetails.reduce((sum, item) => sum + item.revenue, 0);
    
    setChargingCosts(chargingCostDetails);
    setDischargingRevenues(dischargingRevenueDetails);
    setTotalChargingCost(totalChargingCostCalc);
    setTotalDischargingRevenue(totalDischargingRevenueCalc);
    setNetRevenue((totalDischargingRevenueCalc - totalChargingCostCalc).toFixed(2));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Battery Arbitrage Bidding Explainer</h2>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <p className="text-lg">Simulate battery arbitrage in day-ahead markets</p>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Charging Efficiency (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={chargingEfficiency}
              onChange={(e) => setChargingEfficiency(Number(e.target.value))}
              className="px-3 py-1 border rounded w-20"
            />
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="text-sm"
              id="csv-upload"
            />
            {fileName && (
              <div className="flex gap-2">
                <span className="text-sm text-gray-600">{fileName}</span>
                <button 
                  onClick={useCsvData}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Use CSV Data
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={generatePrices} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Generate Random Prices
          </button>
        </div>
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
          <div className="mb-4">
            <p><strong>Charging Hours:</strong> {chargingHours.join(', ') || 'N/A'}</p>
            <p><strong>Discharging Hours:</strong> {dischargingHours.join(', ') || 'N/A'}</p>
            <p><strong>Total Charging Cost:</strong> ${totalChargingCost.toFixed(2)}</p>
            <p><strong>Total Discharge Revenue:</strong> ${totalDischargingRevenue.toFixed(2)}</p>
            <p><strong>Net Revenue:</strong> ${netRevenue}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-semibold mb-1">Charging Costs by Hour:</h4>
            {chargingCosts.map(item => (
              <p key={item.hour} className="text-sm">
                Hour {item.hour}: ${item.price}/MWh × 1MW = ${item.cost.toFixed(2)}
              </p>
            ))}
          </div>
          
          <div className="mb-4">
            <h4 className="font-semibold mb-1">Discharge Revenues by Hour:</h4>
            {dischargingRevenues.map(item => (
              <p key={item.hour} className="text-sm">
                Hour {item.hour}: ${item.price}/MWh × {(chargingEfficiency/100).toFixed(2)}MW = ${item.revenue.toFixed(2)}
              </p>
            ))}
          </div>
          
          <p><strong>Final State of Charge:</strong> {hourlyData[23]?.soc?.toFixed(1) || 0}%</p>
          {csvData && <p><strong>Data Source:</strong> {fileName}</p>}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">System Specifications</h3>
          <p><strong>Battery Capacity:</strong> 4 MWh</p>
          <p><strong>Power Rating:</strong> 1 MW</p>
          <p><strong>Charging Efficiency:</strong> {chargingEfficiency}%</p>
          <p><strong>CSV Format:</strong> Columns for hour/time (0-23) and price ($/MWh)</p>
        </div>
      </div>
    </div>
  );
};

export default BatteryArbitrageExplainer;