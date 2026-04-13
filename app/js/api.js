/**
 * GAELEBOT API HANDLER
 * Google Solar API and Geocoding
 */

async function geocodeAddress(address, city, zip, apiKey) {
  if (!apiKey) throw new Error('API Key missing');
  const query = encodeURIComponent(`${address}, ${zip} ${city}, Belgique`);
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${apiKey}`);
  const data = await response.json();
  if (data.status !== 'OK' || !data.results.length) return null;
  return data.results[0].geometry.location;
}

async function analyzeSolarRoof(lat, lng, apiKey) {
  if (!apiKey) throw new Error('API Key missing');
  const response = await fetch(`https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=MEDIUM&key=${apiKey}`);
  if (!response.ok) return null;
  return await response.json();
}

function calculateScore(solar) {
  if (!solar) return 0;
  const sp = solar.solarPotential || {};
  let score = 0;
  const area = sp.wholeRoofStats?.areaMeters2 || 0;
  if (area >= 50) score += 3; else if (area >= 30) score += 2; else if (area >= 20) score += 1;
  
  const sunshine = sp.maxSunshineHoursPerYear || 0;
  if (sunshine >= 1200) score += 3; else if (sunshine >= 900) score += 2; else if (sunshine >= 600) score += 1;
  
  const panels = sp.maxArrayPanelsCount || 0;
  if (panels >= 16) score += 2; else if (panels >= 8) score += 1;
  
  const imgDate = solar.imageryDate;
  if (imgDate) {
    const age = new Date().getFullYear() - imgDate.year;
    if (age <= 1) score += 2; else if (age <= 2) score += 1;
  }
  return Math.min(10, score);
}

function getOrientation(solar) {
  const segments = solar?.solarPotential?.roofSegmentStats || [];
  if (!segments.length) return 'Inconnue';
  const best = segments.reduce((a, b) => 
    (b.stats?.sunshineQuantiles?.slice(-1)[0] || 0) > (a.stats?.sunshineQuantiles?.slice(-1)[0] || 0) ? b : a, 
    segments[0]
  );
  const azimuth = best.azimuthDegrees || 180;
  if (azimuth >= 135 && azimuth <= 225) return 'Sud';
  if (azimuth >= 90 && azimuth < 135) return 'Sud-Est';
  if (azimuth > 225 && azimuth <= 270) return 'Sud-Ouest';
  if (azimuth < 90) return 'Est';
  return 'Ouest';
}

function getImageFiability(solar) {
  const img = solar?.imageryDate;
  if (!img) return '🔴';
  const age = (new Date().getFullYear() - img.year) * 12 + (new Date().getMonth() - (img.month || 1));
  if (age <= 12) return '🟢';
  if (age <= 24) return '🟡';
  return '🔴';
}

function hasSolarPanels(solar) {
  return !!(solar?.detectedArrays?.length);
}
